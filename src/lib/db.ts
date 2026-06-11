import Database from "better-sqlite3";
import { Client } from "pg";
import path from "path";
import fs from "fs";

const IS_PROD = process.env.NODE_ENV === "production" || !!process.env.DATABASE_URL;

// Path for local SQLite
const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "taxos.db");

// Default regulations JSON path
const REG_JSON_PATH = path.join(process.cwd(), "data", "regulations.json");

export interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  source: "whatsapp" | "manual" | "ocr";
  ocr_metadata?: any;
  created_at?: string;
}

export interface Regulation {
  id: number;
  article: string;
  title: string;
  content: string;
  source_doc: string;
  explanation?: string;
}

// Global connection pools to reuse in serverless environment
let sqliteDb: any = null;

function getSqliteDb() {
  if (!sqliteDb) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    sqliteDb = new Database(DB_PATH);
    sqliteDb.pragma("foreign_keys = ON");
  }
  return sqliteDb;
}

async function getPgClient(): Promise<Client> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL env variable is required in production mode.");
  }
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Common setting for Supabase/Heroku
  });
  await client.connect();
  return client;
}

// ----------------- DATABASE INITIALIZATION -----------------
export async function initDb() {
  if (!IS_PROD) {
    // 1. Initialize SQLite
    const db = getSqliteDb();
    
    // Transactions Table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
        category TEXT NOT NULL,
        source TEXT CHECK(source IN ('whatsapp', 'manual', 'ocr')) NOT NULL,
        ocr_metadata TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      );
    `).run();

    // Settings Table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `).run();

    // Regulations Table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS regulations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        source_doc TEXT NOT NULL,
        explanation TEXT
      );
    `).run();

    // FTS5 Virtual Table & Triggers for Search
    try {
      db.prepare(`
        CREATE VIRTUAL TABLE IF NOT EXISTS regulations_fts USING fts5(
          article,
          title,
          content,
          source_doc,
          explanation,
          content='regulations',
          content_rowid='id'
        );
      `).run();

      db.prepare(`
        CREATE TRIGGER IF NOT EXISTS tbl_ai AFTER INSERT ON regulations BEGIN
          INSERT INTO regulations_fts(rowid, article, title, content, source_doc, explanation)
          VALUES (new.id, new.article, new.title, new.content, new.source_doc, new.explanation);
        END;
      `).run();

      db.prepare(`
        CREATE TRIGGER IF NOT EXISTS tbl_ad AFTER DELETE ON regulations BEGIN
          INSERT INTO regulations_fts(regulations_fts, rowid, article, title, content, source_doc, explanation)
          VALUES('delete', old.id, old.article, old.title, old.content, old.source_doc, old.explanation);
        END;
      `).run();

      db.prepare(`
        CREATE TRIGGER IF NOT EXISTS tbl_au AFTER UPDATE ON regulations BEGIN
          INSERT INTO regulations_fts(regulations_fts, rowid, article, title, content, source_doc, explanation)
          VALUES('delete', old.id, old.article, old.title, old.content, old.source_doc, old.explanation);
          INSERT INTO regulations_fts(rowid, article, title, content, source_doc, explanation)
          VALUES (new.id, new.article, new.title, new.content, new.source_doc, new.explanation);
        END;
      `).run();
    } catch (e: any) {
      console.warn("FTS5 table initialization skipped or failed:", e.message);
    }

    // Default Settings
    const countRes = db.prepare("SELECT COUNT(*) as count FROM settings;").get() as any;
    if (countRes.count === 0) {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?);").run("business_name", "Warung Makan Berkah");
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?);").run("business_type", "Orang Pribadi");
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?);").run("annual_tax_year", "2026");
    }

    // Populate Regulations
    await populateRegulationsLocal();
  } else {
    // 2. Initialize PostgreSQL (Supabase)
    const client = await getPgClient();
    try {
      // Create tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          date TEXT NOT NULL,
          description TEXT NOT NULL,
          amount DOUBLE PRECISION NOT NULL,
          type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
          category TEXT NOT NULL,
          source TEXT CHECK(source IN ('whatsapp', 'manual', 'ocr')) NOT NULL,
          ocr_metadata TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS regulations (
          id SERIAL PRIMARY KEY,
          article TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          source_doc TEXT NOT NULL,
          explanation TEXT
        );
      `);

      // Default Settings
      const res = await client.query("SELECT COUNT(*) as count FROM settings;");
      if (parseInt(res.rows[0].count, 10) === 0) {
        await client.query("INSERT INTO settings (key, value) VALUES ($1, $2);", ["business_name", "Warung Makan Berkah"]);
        await client.query("INSERT INTO settings (key, value) VALUES ($1, $2);", ["business_type", "Orang Pribadi"]);
        await client.query("INSERT INTO settings (key, value) VALUES ($1, $2);", ["annual_tax_year", "2026"]);
      }

      await populateRegulationsPg(client);
    } finally {
      await client.end();
    }
  }
}

async function populateRegulationsLocal() {
  if (!fs.existsSync(REG_JSON_PATH)) return;
  const db = getSqliteDb();
  try {
    const data = JSON.parse(fs.readFileSync(REG_JSON_PATH, "utf-8"));
    db.prepare("DELETE FROM regulations;").run();
    try {
      db.prepare("DELETE FROM sqlite_sequence WHERE name='regulations';").run();
    } catch {}

    const insert = db.prepare(`
      INSERT INTO regulations (article, title, content, source_doc, explanation)
      VALUES (?, ?, ?, ?, ?);
    `);

    const transaction = db.transaction((regs: any[]) => {
      for (const reg of regs) {
        insert.run(reg.article, reg.title, reg.content, reg.source_doc, reg.explanation || "");
      }
    });

    transaction(data);
    try {
      db.prepare("INSERT INTO regulations_fts(regulations_fts) VALUES('rebuild');").run();
    } catch {}
    console.log(`Populated ${data.length} regulations locally.`);
  } catch (e: any) {
    console.error("Error populating regulations locally:", e.message);
  }
}

async function populateRegulationsPg(client: Client) {
  if (!fs.existsSync(REG_JSON_PATH)) return;
  try {
    const data = JSON.parse(fs.readFileSync(REG_JSON_PATH, "utf-8"));
    await client.query("DELETE FROM regulations;");
    
    for (const reg of data) {
      await client.query(
        `INSERT INTO regulations (article, title, content, source_doc, explanation)
         VALUES ($1, $2, $3, $4, $5);`,
        [reg.article, reg.title, reg.content, reg.source_doc, reg.explanation || ""]
      );
    }
    console.log(`Populated ${data.length} regulations in PostgreSQL.`);
  } catch (e: any) {
    console.error("Error populating regulations in PG:", e.message);
  }
}

let isInitialized = false;
async function ensureDbInit() {
  if (!isInitialized) {
    isInitialized = true;
    try {
      await initDb();
    } catch (e: any) {
      isInitialized = false;
      console.error("Database initialization failed:", e.message);
      throw e;
    }
  }
}

// ----------------- QUERY WRAPPERS -----------------
export async function queryDb(sql: string, params: any[] = []): Promise<any[]> {
  await ensureDbInit();
  
  if (!IS_PROD) {
    const db = getSqliteDb();
    // Convert PostgreSQL parameters ($1, $2) to SQLite (?)
    const sqliteSql = sql.replace(/\$\d+/g, "?");
    try {
      if (sqliteSql.trim().toLowerCase().startsWith("select")) {
        return db.prepare(sqliteSql).all(...params);
      } else {
        const info = db.prepare(sqliteSql).run(...params);
        return [{ lastInsertRowid: info.lastInsertRowid, changes: info.changes }];
      }
    } catch (e: any) {
      console.error("SQLite query error:", sqliteSql, params, e.message);
      throw e;
    }
  } else {
    const client = await getPgClient();
    try {
      const res = await client.query(sql, params);
      return res.rows;
    } catch (e: any) {
      console.error("Postgres query error:", sql, params, e.message);
      throw e;
    } finally {
      await client.end();
    }
  }
}

