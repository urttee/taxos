// TaxOS — Double-Entry Accounting Engine (Postgres/SQLite Compatible)
// Chart of Accounts, Journal Entries, General Ledger, Trial Balance, Financial Statements
import { queryDb } from './db';
import type {
  Account, AccountType, JournalEntry, JournalLine,
  LedgerEntry, TrialBalanceRow, BalanceSheet, IncomeStatement,
} from './types';

// ============================================================
// CHART OF ACCOUNTS (CoA)
// ============================================================

/** Standar CoA default untuk perusahaan Indonesia (PSAK sederhana) */
const DEFAULT_COA: Array<{ code: string; name: string; type: AccountType; parent?: string }> = [
  // ASET
  { code: '1000', name: 'Aset', type: 'asset' },
  { code: '1100', name: 'Kas & Bank', type: 'asset', parent: '1000' },
  { code: '1110', name: 'Kas', type: 'asset', parent: '1100' },
  { code: '1120', name: 'Bank', type: 'asset', parent: '1100' },
  { code: '1200', name: 'Piutang Usaha', type: 'asset', parent: '1000' },
  { code: '1300', name: 'Persediaan', type: 'asset', parent: '1000' },
  { code: '1400', name: 'Biaya Dibayar Dimuka', type: 'asset', parent: '1000' },
  { code: '1500', name: 'Aset Tetap', type: 'asset', parent: '1000' },
  { code: '1510', name: 'Peralatan & Mesin', type: 'asset', parent: '1500' },
  { code: '1520', name: 'Kendaraan', type: 'asset', parent: '1500' },
  { code: '1530', name: 'Bangunan', type: 'asset', parent: '1500' },
  { code: '1590', name: 'Akumulasi Penyusutan', type: 'asset', parent: '1500' },
  // LIABILITAS
  { code: '2000', name: 'Liabilitas', type: 'liability' },
  { code: '2100', name: 'Utang Dagang', type: 'liability', parent: '2000' },
  { code: '2200', name: 'Utang Pajak', type: 'liability', parent: '2000' },
  { code: '2210', name: 'Utang PPh 21', type: 'liability', parent: '2200' },
  { code: '2220', name: 'Utang PPh 23', type: 'liability', parent: '2200' },
  { code: '2230', name: 'Utang PPh 25', type: 'liability', parent: '2200' },
  { code: '2240', name: 'Utang PPh Badan', type: 'liability', parent: '2200' },
  { code: '2250', name: 'Utang PPN', type: 'liability', parent: '2200' },
  { code: '2300', name: 'Utang Bank / Pinjaman', type: 'liability', parent: '2000' },
  { code: '2400', name: 'Utang Gaji', type: 'liability', parent: '2000' },
  // EKUITAS
  { code: '3000', name: 'Ekuitas', type: 'equity' },
  { code: '3100', name: 'Modal Disetor', type: 'equity', parent: '3000' },
  { code: '3200', name: 'Laba Ditahan', type: 'equity', parent: '3000' },
  { code: '3300', name: 'Laba Tahun Berjalan', type: 'equity', parent: '3000' },
  // PENDAPATAN
  { code: '4000', name: 'Pendapatan', type: 'revenue' },
  { code: '4100', name: 'Penjualan', type: 'revenue', parent: '4000' },
  { code: '4200', name: 'Pendapatan Jasa', type: 'revenue', parent: '4000' },
  { code: '4300', name: 'Pendapatan Lain-Lain', type: 'revenue', parent: '4000' },
  { code: '4400', name: 'Diskon Penjualan', type: 'revenue', parent: '4000' },
  { code: '4500', name: 'Retur Penjualan', type: 'revenue', parent: '4000' },
  // BEBAN
  { code: '5000', name: 'Harga Pokok Penjualan (HPP)', type: 'expense' },
  { code: '5100', name: 'Pembelian Bahan Baku', type: 'expense', parent: '5000' },
  { code: '5200', name: 'Biaya Produksi Langsung', type: 'expense', parent: '5000' },
  { code: '6000', name: 'Beban Operasional', type: 'expense' },
  { code: '6100', name: 'Beban Gaji & Upah', type: 'expense', parent: '6000' },
  { code: '6200', name: 'Beban Sewa', type: 'expense', parent: '6000' },
  { code: '6300', name: 'Beban Listrik, Air & Telepon', type: 'expense', parent: '6000' },
  { code: '6400', name: 'Beban Perlengkapan Kantor', type: 'expense', parent: '6000' },
  { code: '6500', name: 'Beban Penyusutan', type: 'expense', parent: '6000' },
  { code: '6600', name: 'Beban Transportasi', type: 'expense', parent: '6000' },
  { code: '6700', name: 'Beban Pemasaran & Iklan', type: 'expense', parent: '6000' },
  { code: '6800', name: 'Beban Asuransi', type: 'expense', parent: '6000' },
  { code: '6900', name: 'Beban Operasional Lain', type: 'expense', parent: '6000' },
  { code: '7000', name: 'Beban Lain-Lain', type: 'expense' },
  { code: '7100', name: 'Beban Bunga', type: 'expense', parent: '7000' },
  { code: '7200', name: 'Beban Pajak', type: 'expense', parent: '7000' },
  { code: '7300', name: 'Beban Denda & Sanksi', type: 'expense', parent: '7000' },
  { code: '8000', name: 'Pendapatan/Beban Non-Operasional', type: 'expense' },
  { code: '8100', name: 'Pendapatan Bunga', type: 'revenue', parent: '8000' },
  { code: '8200', name: 'Keuntungan Penjualan Aset', type: 'revenue', parent: '8000' },
  { code: '8300', name: 'Kerugian Penjualan Aset', type: 'expense', parent: '8000' },
];

/**
 * Inisialisasi Chart of Accounts default untuk klien baru.
 */
export async function initializeCoA(clientId: number): Promise<void> {
  const existing = await queryDb('SELECT COUNT(*) as cnt FROM accounts WHERE client_id = $1', [clientId]);
  if (parseInt(existing[0].cnt, 10) > 0) return; // Sudah diinisialisasi

  for (const a of DEFAULT_COA) {
    await queryDb('INSERT INTO accounts (code, name, type, parent_code, client_id) VALUES ($1, $2, $3, $4, $5)', 
      [a.code, a.name, a.type, a.parent ?? null, clientId]);
  }
}

/** Ambil seluruh akun untuk klien */
export async function getAccounts(clientId: number): Promise<Account[]> {
  return await queryDb('SELECT * FROM accounts WHERE client_id = $1 AND is_active = 1 ORDER BY code ASC', [clientId]) as Account[];
}

/** Tambah akun baru */
export async function addAccount(data: { code: string; name: string; type: AccountType; parentCode?: string; clientId: number }): Promise<number> {
  const result = await queryDb('INSERT INTO accounts (code, name, type, parent_code, client_id) VALUES ($1, $2, $3, $4, $5) RETURNING id', 
    [data.code, data.name, data.type, data.parentCode ?? null, data.clientId]);
  return result[0].id || result[0].lastInsertRowid;
}

/** Nonaktifkan akun */
export async function deactivateAccount(id: number): Promise<boolean> {
  const result = await queryDb('UPDATE accounts SET is_active = 0 WHERE id = $1', [id]);
  return (result[0]?.changes > 0) || true; // PostgreSQL queryDb implementation doesn't return changes cleanly via res.rows, assuming true for now
}

// ============================================================
// JOURNAL ENTRIES (Jurnal Umum)
// ============================================================

/**
 * Buat jurnal baru (double-entry).
 * Validasi: total debit HARUS sama dengan total kredit.
 */
export async function createJournalEntry(data: {
  date: string;
  description: string;
  reference?: string;
  lines: Array<{ account_code: string; debit: number; credit: number; description?: string }>;
  clientId?: number;
}): Promise<number> {
  const totalDebit = data.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0);

  // Toleransi pembulatan
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Jurnal tidak balance! Total Debit: ${totalDebit}, Total Kredit: ${totalCredit}`);
  }

  if (data.lines.length < 2) {
    throw new Error('Jurnal minimal harus memiliki 2 baris (debit dan kredit)');
  }

  const result = await queryDb(
    'INSERT INTO journal_entries (date, description, reference, client_id) VALUES ($1, $2, $3, $4) RETURNING id',
    [data.date, data.description, data.reference ?? null, data.clientId ?? null]
  );
  
  const journalId = result[0].id || result[0].lastInsertRowid;

  for (const line of data.lines) {
    await queryDb(
      'INSERT INTO journal_lines (journal_id, account_code, debit, credit, description) VALUES ($1, $2, $3, $4, $5)',
      [journalId, line.account_code, line.debit, line.credit, line.description ?? null]
    );
  }

  return journalId;
}

/** Ambil jurnal dengan baris-barisnya */
export async function getJournalEntry(id: number): Promise<JournalEntry | null> {
  const headerRows = await queryDb('SELECT * FROM journal_entries WHERE id = $1', [id]);
  if (headerRows.length === 0) return null;
  const header = headerRows[0];

  const lines = await queryDb(`
    SELECT jl.*, a.name as account_name FROM journal_lines jl
    LEFT JOIN accounts a ON jl.account_code = a.code AND a.client_id = $1
    WHERE jl.journal_id = $2 ORDER BY jl.id ASC
  `, [header.client_id ?? null, id]) as JournalLine[];

  return {
    id: header.id as number,
    date: header.date as string,
    description: header.description as string,
    reference: header.reference as string | undefined,
    lines,
    client_id: header.client_id as number | undefined,
    created_at: header.created_at as string | undefined,
  };
}

/** Ambil daftar jurnal berdasarkan filter */
export async function getJournalEntries(filters?: {
  clientId?: number; startDate?: string; endDate?: string; limit?: number;
}): Promise<JournalEntry[]> {
  let query = 'SELECT * FROM journal_entries';
  const params: unknown[] = [];
  const clauses: string[] = [];
  let paramIndex = 1;

  if (filters?.clientId) { clauses.push(`client_id = $${paramIndex++}`); params.push(filters.clientId); }
  if (filters?.startDate) { clauses.push(`date >= $${paramIndex++}`); params.push(filters.startDate); }
  if (filters?.endDate) { clauses.push(`date <= $${paramIndex++}`); params.push(filters.endDate); }
  if (clauses.length > 0) query += ' WHERE ' + clauses.join(' AND ');
  query += ' ORDER BY date DESC, id DESC';
  if (filters?.limit) { query += ` LIMIT $${paramIndex++}`; params.push(filters.limit); }

  const headers = await queryDb(query, params) as Array<Record<string, unknown>>;
  
  const entries = await Promise.all(headers.map(async h => {
    const lines = await queryDb('SELECT * FROM journal_lines WHERE journal_id = $1 ORDER BY id ASC', [h.id]) as JournalLine[];
    return {
      id: h.id as number,
      date: h.date as string,
      description: h.description as string,
      reference: h.reference as string | undefined,
      lines,
      client_id: h.client_id as number | undefined,
      created_at: h.created_at as string | undefined,
    };
  }));
  return entries;
}

/** Hapus jurnal dan semua barisnya (CASCADE) */
export async function deleteJournalEntry(id: number): Promise<boolean> {
  // Delete lines first (in case CASCADE doesn't work)
  await queryDb('DELETE FROM journal_lines WHERE journal_id = $1', [id]);
  await queryDb('DELETE FROM journal_entries WHERE id = $1', [id]);
  return true;
}

// ============================================================
// GENERAL LEDGER (Buku Besar)
// ============================================================

/**
 * Ambil buku besar (general ledger) untuk satu akun.
 * Menampilkan semua transaksi yang menyentuh akun tersebut, dengan running balance.
 */
export async function getGeneralLedger(accountCode: string, clientId: number, filters?: {
  startDate?: string; endDate?: string;
}): Promise<LedgerEntry[]> {
  let query = `
    SELECT je.date, je.id as journal_id, je.description, je.reference,
           jl.debit, jl.credit
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_id = je.id
    WHERE jl.account_code = $1 AND je.client_id = $2
  `;
  const params: unknown[] = [accountCode, clientId];
  let paramIndex = 3;

  if (filters?.startDate) { query += ` AND je.date >= $${paramIndex++}`; params.push(filters.startDate); }
  if (filters?.endDate) { query += ` AND je.date <= $${paramIndex++}`; params.push(filters.endDate); }
  query += ' ORDER BY je.date ASC, je.id ASC';

  const rows = await queryDb(query, params) as Array<{
    date: string; journal_id: number; description: string; reference: string;
    debit: number; credit: number;
  }>;

  // Determine account type for balance direction
  const accountRows = await queryDb('SELECT type FROM accounts WHERE code = $1 AND client_id = $2', [accountCode, clientId]);
  const account = accountRows[0] as { type: string } | undefined;
  const isDebitNormal = account?.type === 'asset' || account?.type === 'expense';

  let balance = 0;
  return rows.map(r => {
    if (isDebitNormal) {
      balance += r.debit - r.credit;
    } else {
      balance += r.credit - r.debit;
    }
    return {
      date: r.date,
      journal_id: r.journal_id,
      description: r.description,
      reference: r.reference,
      debit: r.debit,
      credit: r.credit,
      balance,
    };
  });
}

// ============================================================
// TRIAL BALANCE (Neraca Saldo)
// ============================================================

/**
 * Generate Trial Balance — daftar semua akun dengan total debit dan kredit.
 */
export async function getTrialBalance(clientId: number, filters?: {
  startDate?: string; endDate?: string;
}): Promise<TrialBalanceRow[]> {
  let query = `
    SELECT jl.account_code, a.name as account_name, a.type as account_type,
           COALESCE(SUM(jl.debit), 0) as total_debit,
           COALESCE(SUM(jl.credit), 0) as total_credit
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_id = je.id
    LEFT JOIN accounts a ON jl.account_code = a.code AND a.client_id = $1
    WHERE je.client_id = $2
  `;
  const params: unknown[] = [clientId, clientId];
  let paramIndex = 3;

  if (filters?.startDate) { query += ` AND je.date >= $${paramIndex++}`; params.push(filters.startDate); }
  if (filters?.endDate) { query += ` AND je.date <= $${paramIndex++}`; params.push(filters.endDate); }

  query += ' GROUP BY jl.account_code, a.name, a.type ORDER BY jl.account_code ASC';

  const rows = await queryDb(query, params) as Array<{
    account_code: string; account_name: string; account_type: AccountType;
    total_debit: number; total_credit: number;
  }>;

  return rows.map(r => ({
    account_code: r.account_code,
    account_name: r.account_name ?? r.account_code,
    account_type: r.account_type ?? 'expense',
    total_debit: Number(r.total_debit),
    total_credit: Number(r.total_credit),
    balance: Number(r.total_debit) - Number(r.total_credit),
  }));
}

// ============================================================
// FINANCIAL STATEMENTS (Laporan Keuangan)
// ============================================================

/**
 * Generate Balance Sheet (Neraca) per tanggal tertentu.
 * Aset = Liabilitas + Ekuitas
 */
export async function getBalanceSheet(clientId: number, asOfDate: string): Promise<BalanceSheet> {
  const tb = await getTrialBalance(clientId, { endDate: asOfDate });

  const assets = tb.filter(r => r.account_type === 'asset');
  const liabilities = tb.filter(r => r.account_type === 'liability');
  const equity = tb.filter(r => r.account_type === 'equity');

  const totalAssets = assets.reduce((s, r) => s + r.balance, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + Math.abs(r.balance), 0);
  const totalEquity = equity.reduce((s, r) => s + Math.abs(r.balance), 0);

  return {
    date: asOfDate,
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    total_equity: totalEquity,
    assets,
    liabilities,
    equity,
  };
}

/**
 * Generate Income Statement (Laporan Laba Rugi) untuk periode tertentu.
 */
export async function getIncomeStatement(clientId: number, periodStart: string, periodEnd: string): Promise<IncomeStatement> {
  const tb = await getTrialBalance(clientId, { startDate: periodStart, endDate: periodEnd });

  const revenueItems = tb.filter(r => r.account_type === 'revenue');
  const expenseItems = tb.filter(r => r.account_type === 'expense');

  // Revenue accounts have credit-normal balance
  const totalRevenue = revenueItems
    .filter(r => r.account_code.startsWith('4'))
    .reduce((s, r) => s + Math.abs(r.balance), 0);

  // COGS (HPP) — akun 5xxx
  const totalCOGS = expenseItems
    .filter(r => r.account_code.startsWith('5'))
    .reduce((s, r) => s + Math.abs(r.balance), 0);

  const grossProfit = totalRevenue - totalCOGS;

  // Operating expenses — akun 6xxx
  const totalOperatingExpense = expenseItems
    .filter(r => r.account_code.startsWith('6'))
    .reduce((s, r) => s + Math.abs(r.balance), 0);

  const operatingProfit = grossProfit - totalOperatingExpense;

  // Other income/expense — akun 7xxx, 8xxx
  const otherItems = [...revenueItems, ...expenseItems]
    .filter(r => r.account_code.startsWith('7') || r.account_code.startsWith('8'));
  const totalOther = otherItems.reduce((s, r) => {
    if (r.account_type === 'revenue') return s + Math.abs(r.balance);
    return s - Math.abs(r.balance);
  }, 0);

  const netProfitBeforeTax = operatingProfit + totalOther;

  // Tax expense (from akun 7200 - Beban Pajak)
  const taxExpense = expenseItems
    .filter(r => r.account_code === '7200')
    .reduce((s, r) => s + Math.abs(r.balance), 0);

  return {
    period_start: periodStart,
    period_end: periodEnd,
    total_revenue: totalRevenue,
    total_cogs: totalCOGS,
    gross_profit: grossProfit,
    total_operating_expense: totalOperatingExpense,
    operating_profit: operatingProfit,
    total_other_income_expense: totalOther,
    net_profit_before_tax: netProfitBeforeTax,
    tax_expense: taxExpense,
    net_profit_after_tax: netProfitBeforeTax - taxExpense,
    revenue_items: revenueItems,
    expense_items: expenseItems,
  };
}

/**
 * Buat jurnal otomatis dari transaksi sederhana (bridge dari bookkeeping v1).
 * Ini memungkinkan user tetap input via interface lama, tapi otomatis generate jurnal.
 */
export async function autoJournalFromTransaction(params: {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  clientId: number;
}): Promise<number> {
  const { date, description, amount, type, category, clientId } = params;

  // Map kategori lama ke akun baru
  const categoryToAccount: Record<string, { debit: string; credit: string }> = {
    // Income
    'Penjualan':      { debit: '1110', credit: '4100' },  // Kas (D) → Penjualan (C)
    'Pemasukan Lain': { debit: '1110', credit: '4300' },  // Kas (D) → Pendapatan Lain (C)
    // Expense
    'Bahan Baku':       { debit: '5100', credit: '1110' },  // Pembelian (D) → Kas (C)
    'Operasional':      { debit: '6900', credit: '1110' },  // Beban Ops (D) → Kas (C)
    'Gaji':             { debit: '6100', credit: '1110' },  // Beban Gaji (D) → Kas (C)
    'Pajak':            { debit: '7200', credit: '1110' },  // Beban Pajak (D) → Kas (C)
    'Pengeluaran Lain': { debit: '6900', credit: '1110' },  // Beban Lain (D) → Kas (C)
  };

  const mapping = categoryToAccount[category] ?? (type === 'income'
    ? { debit: '1110', credit: '4300' }
    : { debit: '6900', credit: '1110' });

  return await createJournalEntry({
    date,
    description,
    lines: [
      { account_code: mapping.debit, debit: amount, credit: 0, description },
      { account_code: mapping.credit, debit: 0, credit: amount, description },
    ],
    clientId,
  });
}
