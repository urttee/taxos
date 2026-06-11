import { queryDb, Transaction } from "./db";

import { CATEGORIES, DEFAULT_CATEGORIES } from "./constants";

export async function addTransaction(
  date: string,
  description: string,
  amount: number,
  type: "income" | "expense",
  category: string,
  source: "whatsapp" | "manual" | "ocr",
  ocrMetadata: any = null
): Promise<number> {
  // Validate type
  if (type !== "income" && type !== "expense") {
    throw new Error("Transaction type must be 'income' or 'expense'.");
  }

  // Validate category or set default
  const validCategories = CATEGORIES[type];
  let finalCategory = category;
  if (!validCategories.includes(category)) {
    finalCategory = DEFAULT_CATEGORIES[type];
  }

  // Standardize date format YYYY-MM-DD
  let formattedDate = date;
  try {
    const d = new Date(date.slice(0, 10));
    if (isNaN(d.getTime())) {
      formattedDate = new Date().toISOString().slice(0, 10);
    } else {
      formattedDate = d.toISOString().slice(0, 10);
    }
  } catch {
    formattedDate = new Date().toISOString().slice(0, 10);
  }

  const ocrMetaStr = ocrMetadata ? JSON.stringify(ocrMetadata) : null;

  const res = await queryDb(
    `INSERT INTO transactions (date, description, amount, type, category, source, ocr_metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7);`,
    [formattedDate, description, amount, type, finalCategory, source, ocrMetaStr]
  );

  // For PostgreSQL/Supabase, the query might return row containing id, or for SQLite it returns lastInsertRowid
  if (res && res.length > 0) {
    return res[0].id || res[0].lastInsertRowid || 0;
  }
  return 0;
}

export async function deleteTransaction(txId: number): Promise<boolean> {
  const res = await queryDb("DELETE FROM transactions WHERE id = $1;", [txId]);
  return res.length > 0 && res[0].changes > 0;
}

export async function getTransactions(filters: {
  type?: string | null;
  category?: string | null;
  start_date?: string | null;
  end_date?: string | null;
} = {}): Promise<Transaction[]> {
  let query = "SELECT id, date, description, amount, type, category, source, ocr_metadata, created_at FROM transactions";
  const params: any[] = [];
  const whereClauses: string[] = [];
  let paramIndex = 1;

  if (filters.type) {
    whereClauses.push(`type = $${paramIndex++}`);
    params.push(filters.type);
  }
  if (filters.category) {
    whereClauses.push(`category = $${paramIndex++}`);
    params.push(filters.category);
  }
  if (filters.start_date) {
    whereClauses.push(`date >= $${paramIndex++}`);
    params.push(filters.start_date);
  }
  if (filters.end_date) {
    whereClauses.push(`date <= $${paramIndex++}`);
    params.push(filters.end_date);
  }

  if (whereClauses.length > 0) {
    query += " WHERE " + whereClauses.join(" AND ");
  }

  query += " ORDER BY date DESC, id DESC";

  const rows = await queryDb(query, params);

  return rows.map((r: any) => {
    let ocrMeta = null;
    if (r.ocr_metadata) {
      try {
        ocrMeta = JSON.parse(r.ocr_metadata);
      } catch {
        ocrMeta = null;
      }
    }
    return {
      id: r.id,
      date: r.date,
      description: r.description,
      amount: parseFloat(r.amount),
      type: r.type,
      category: r.category,
      source: r.source,
      ocr_metadata: ocrMeta,
      created_at: r.created_at
    };
  });
}

export interface FinancialSummary {
  year: number;
  total_income: number;
  total_expense: number;
  net_profit: number;
  monthly_chart: Record<string, { income: number; expense: number }>;
  expense_breakdown: Record<string, number>;
  income_breakdown: Record<string, number>;
  transaction_count: number;
}

export async function getFinancialSummary(year: number = 2026): Promise<FinancialSummary> {
  // 1. Total Income & Expense
  const totalRes = await queryDb(
    `SELECT 
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
     FROM transactions
     WHERE SUBSTR(date, 1, 4) = $1;`,
    [year.toString()]
  );
  const totalIncome = parseFloat(totalRes[0]?.total_income) || 0.0;
  const totalExpense = parseFloat(totalRes[0]?.total_expense) || 0.0;
  const netProfit = totalIncome - totalExpense;

  // 2. Monthly breakdown
  const monthlyRows = await queryDb(
    `SELECT 
      SUBSTR(date, 6, 2) as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as monthly_income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as monthly_expense
     FROM transactions
     WHERE SUBSTR(date, 1, 4) = $1
     GROUP BY month
     ORDER BY month ASC;`,
    [year.toString()]
  );

  const monthlyChart: Record<string, { income: number; expense: number }> = {};
  for (let i = 1; i <= 12; i++) {
    monthlyChart[`${i}`.padStart(2, "0")] = { income: 0.0, expense: 0.0 };
  }
  for (const r of monthlyRows) {
    if (r.month) {
      monthlyChart[r.month] = {
        income: parseFloat(r.monthly_income) || 0.0,
        expense: parseFloat(r.monthly_expense) || 0.0
      };
    }
  }

  // 3. Expense breakdown
  const expenseRows = await queryDb(
    `SELECT category, SUM(amount) as total
     FROM transactions
     WHERE SUBSTR(date, 1, 4) = $1 AND type = 'expense'
     GROUP BY category;`,
    [year.toString()]
  );
  const expenseBreakdown: Record<string, number> = {};
  for (const cat of CATEGORIES.expense) {
    expenseBreakdown[cat] = 0.0;
  }
  for (const r of expenseRows) {
    expenseBreakdown[r.category] = parseFloat(r.total) || 0.0;
  }

  // 4. Income breakdown
  const incomeRows = await queryDb(
    `SELECT category, SUM(amount) as total
     FROM transactions
     WHERE SUBSTR(date, 1, 4) = $1 AND type = 'income'
     GROUP BY category;`,
    [year.toString()]
  );
  const incomeBreakdown: Record<string, number> = {};
  for (const cat of CATEGORIES.income) {
    incomeBreakdown[cat] = 0.0;
  }
  for (const r of incomeRows) {
    incomeBreakdown[r.category] = parseFloat(r.total) || 0.0;
  }

  // 5. Transaction count
  const countRes = await queryDb(
    "SELECT COUNT(*) as cnt FROM transactions WHERE SUBSTR(date, 1, 4) = $1;",
    [year.toString()]
  );
  const transactionCount = parseInt(countRes[0]?.cnt, 10) || 0;

  return {
    year,
    total_income: totalIncome,
    total_expense: totalExpense,
    net_profit: netProfit,
    monthly_chart: monthlyChart,
    expense_breakdown: expenseBreakdown,
    income_breakdown: incomeBreakdown,
    transaction_count: transactionCount
  };
}

export interface HealthScoreResult {
  score: number;
  level: "Belum Cukup Data" | "Sangat Sehat" | "Cukup Sehat" | "Kurang Sehat";
  description: string;
  reasons: string[];
  color: string;
}

export function getBusinessHealthScore(summary: FinancialSummary): HealthScoreResult {
  const income = summary.total_income;
  const expense = summary.total_expense;
  const profit = summary.net_profit;

  if (income === 0) {
    return {
      score: 0,
      level: "Belum Cukup Data",
      description: "Belum ada pencatatan omset untuk menghitung skor kesehatan bisnis.",
      color: "#94a3b8",
      reasons: ["Belum ada data transaksi pemasukan untuk dianalisis."]
    };
  }

  const profitMargin = (profit / income) * 100;
  const expenseRatio = (expense / income) * 100;

  let score = 0;
  const reasons: string[] = [];

  // 1. Profit Margin Score (Max 40 points)
  if (profitMargin > 25) {
    score += 40;
    reasons.push("Margin keuntungan sangat sehat (> 25%).");
  } else if (profitMargin > 10) {
    score += 25;
    reasons.push("Margin keuntungan cukup baik (10% - 25%).");
  } else if (profitMargin > 0) {
    score += 10;
    reasons.push("Margin keuntungan tipis (0% - 10%).");
  } else {
    score += 0;
    reasons.push("Bisnis mengalami kerugian operasional.");
  }

  // 2. Expense Efficiency Score (Max 30 points)
  if (expenseRatio < 60) {
    score += 30;
    reasons.push("Struktur pengeluaran sangat efisien (< 60% dari omset).");
  } else if (expenseRatio < 85) {
    score += 20;
    reasons.push("Pengeluaran operasional terkontrol dengan baik.");
  } else {
    score += 5;
    reasons.push("Biaya operasional terlalu tinggi (> 85% dari omset), waspadai pemborosan.");
  }

  // 3. Cashflow Stability / Data Recording (Max 30 points)
  const activeMonths = Object.values(summary.monthly_chart).filter((m) => m.income > 0 || m.expense > 0).length;
  if (activeMonths >= 6) {
    score += 30;
    reasons.push("Pencatatan keuangan konsisten sepanjang waktu.");
  } else if (activeMonths >= 2) {
    score += 20;
    reasons.push("Pembukuan mulai berjalan rutin beberapa bulan terakhir.");
  } else {
    score += 10;
    reasons.push("Data transaksi masih sangat awal.");
  }

  let level: "Sangat Sehat" | "Cukup Sehat" | "Kurang Sehat" = "Kurang Sehat";
  let color = "#ef4444";
  let desc = "";

  if (score >= 80) {
    level = "Sangat Sehat";
    color = "#10b981"; // Emerald Green
    desc = "Bisnis Anda berada dalam performa prima. Efisiensi biaya tinggi dan margin laba kuat.";
  } else if (score >= 50) {
    level = "Cukup Sehat";
    color = "#f59e0b"; // Amber
    desc = "Bisnis berjalan stabil, namun terdapat ruang optimasi biaya operasional atau peningkatan omset.";
  } else {
    level = "Kurang Sehat";
    color = "#ef4444"; // Red
    desc = "Perlu perhatian segera. Evaluasi kembali struktur pengeluaran Anda dan tingkatkan efisiensi modal kerja.";
  }

  return {
    score,
    level,
    description: desc,
    reasons,
    color
  };
}
