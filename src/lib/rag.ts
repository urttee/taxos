import { queryDb, Regulation } from "./db";

export async function searchRegulations(query: string, limit: number = 3): Promise<Regulation[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const IS_PROD = process.env.NODE_ENV === "production" || !!process.env.DATABASE_URL;
  const results: Regulation[] = [];

  if (!IS_PROD) {
    // SQLite search with FTS5
    // Split query into alphanumeric terms for matching
    const terms = cleanQuery
      .split(/\s+/)
      .filter((word) => /^[a-zA-Z0-9]+$/.test(word))
      .map((word) => `"${word}"`);

    const cleanedQuery = terms.join(" OR ");

    if (cleanedQuery) {
      try {
        const rows = await queryDb(
          `SELECT rowid as id, article, title, content, source_doc, explanation
           FROM regulations_fts
           WHERE regulations_fts MATCH $1
           ORDER BY bm25(regulations_fts)
           LIMIT $2;`,
          [cleanedQuery, limit]
        );
        return rows.map((r) => ({
          id: r.id,
          article: r.article,
          title: r.title,
          content: r.content,
          source_doc: r.source_doc,
          explanation: r.explanation || ""
        }));
      } catch (e: any) {
        console.warn("FTS5 SQLite search failed, falling back to LIKE:", e.message);
      }
    }
  }

  // Fallback / Production Postgres (Supabase) search
  const searchPattern = `%${cleanQuery}%`;
  const rows = await queryDb(
    `SELECT id, article, title, content, source_doc, explanation
     FROM regulations
     WHERE article ILIKE $1 OR title ILIKE $2 OR content ILIKE $3 OR explanation ILIKE $4
     LIMIT $5;`,
    [searchPattern, searchPattern, searchPattern, searchPattern, limit]
  );

  return rows.map((r) => ({
    id: r.id,
    article: r.article,
    title: r.title,
    content: r.content,
    source_doc: r.source_doc,
    explanation: r.explanation || ""
  }));
}

export async function getAllRegulations(): Promise<Regulation[]> {
  const rows = await queryDb("SELECT id, article, title, content, source_doc, explanation FROM regulations;");
  return rows.map((r) => ({
    id: r.id,
    article: r.article,
    title: r.title,
    content: r.content,
    source_doc: r.source_doc,
    explanation: r.explanation || ""
  }));
}
