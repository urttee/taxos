// TaxOS Indonesia — Shared TypeScript Types (v2.0 — Corporate + UMKM)

// ============================================================
// EXISTING TYPES (preserved from v1.0)
// ============================================================

export interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  source: 'whatsapp' | 'manual' | 'ocr';
  ocr_metadata?: Record<string, unknown> | null;
  client_id?: number;
  created_at?: string;
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

export interface HealthScore {
  score: number;
  level: string;
  description: string;
  color: string;
  reasons: string[];
}

export interface TaxMonth {
  month_code: string;
  month_name: string;
  turnover: number;
  cumulative_turnover: number;
  taxable_turnover: number;
  tax_due: number;
  tax_paid: number;
  status: string;
}

export interface TaxObligation {
  year: number;
  business_type: string;
  total_turnover: number;
  total_tax_due: number;
  total_tax_paid: number;
  remaining_tax_due: number;
  months: TaxMonth[];
}

export interface TaxDeadline {
  title: string;
  date: string;
  description: string;
  urgency: string;
}

export interface TaxSimResult {
  business_type: string;
  monthly_turnover: number;
  annual_turnover: number;
  total_tax_annual: number;
  effective_rate_percent: number;
  months: { month_name: string; turnover: number; cumulative_turnover: number; taxable_turnover: number; tax_due: number; status: string }[];
  summary: string;
}

export interface Regulation {
  id: number;
  article: string;
  title: string;
  content: string;
  source_doc: string;
  explanation?: string;
  rank?: number;
}

export interface ChatResult {
  is_transaction: boolean;
  is_tax_query: boolean;
  response: string;
  transaction?: ParsedTransaction;
  transaction_id?: number;
  references?: Regulation[];
}

export interface ParsedTransaction {
  is_transaction: boolean;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
}

export interface DashboardStats {
  business_name: string;
  business_type: string;
  year: number;
  financials: FinancialSummary;
  health: HealthScore;
  tax: TaxObligation;
  deadlines: TaxDeadline[];
}

// ============================================================
// MULTI-CLIENT MANAGEMENT
// ============================================================

/** Rezim perpajakan yang berlaku untuk entitas */
export type TaxRegime = 'pph_final_05' | 'pph_badan_umum' | 'pph_op_umum';

/** Jenis entitas bisnis */
export type EntityType = 'Orang Pribadi' | 'CV' | 'PT' | 'PT PMA' | 'Firma' | 'Koperasi';

export interface Client {
  id: number;
  name: string;
  npwp?: string;
  entity_type: EntityType;
  tax_regime: TaxRegime;
  annual_revenue: number;
  industry?: string;
  address?: string;
  pic_name?: string;
  pic_phone?: string;
  is_pkp: boolean;         // Pengusaha Kena Pajak (wajib PPN)
  pkp_date?: string;       // Tanggal pengukuhan PKP
  is_active: boolean;
  created_at?: string;
}

export interface ClientSummary extends Client {
  tax_status: 'lunas' | 'belum_lunas' | 'perlu_perhatian';
  total_tax_due: number;
  total_tax_paid: number;
}

// ============================================================
// CORPORATE TAX (PPh Badan — Tarif Umum 22%)
// ============================================================

export interface CorporateTaxResult {
  fiscal_year: number;
  entity_type: EntityType;
  gross_revenue: number;
  commercial_profit: number;      // Laba Komersial (dari laporan keuangan)
  fiscal_corrections_positive: number;
  fiscal_corrections_negative: number;
  taxable_income: number;         // Penghasilan Kena Pajak (PKP)
  // Fasilitas Pasal 31E
  has_31e_facility: boolean;      // true jika omzet ≤ 50 Miliar
  facilitated_portion: number;    // Bagian PKP yang dapat fasilitas (11%)
  non_facilitated_portion: number; // Bagian PKP tanpa fasilitas (22%)
  tax_on_facilitated: number;     // PPh atas bagian fasilitas
  tax_on_non_facilitated: number; // PPh atas bagian non-fasilitas
  total_pph_badan: number;        // Total PPh Badan terutang
  tax_credits: number;            // Kredit pajak (PPh 22, 23, 25 yang sudah dibayar)
  pph_29_payable: number;         // PPh 29 (kurang bayar akhir tahun)
  effective_rate_percent: number;
  breakdown: string;
}

export interface PPh25Installment {
  fiscal_year: number;
  month: number;
  month_name: string;
  installment_amount: number;     // Angsuran PPh 25 per bulan
  basis: string;                  // Dasar perhitungan
  due_date: string;
  status: 'lunas' | 'belum_bayar' | 'terlambat';
}

// ============================================================
// PPN (Pajak Pertambahan Nilai) — 12%
// ============================================================

export interface FakturPajak {
  id: number;
  nomor_faktur?: string;
  tanggal: string;
  tipe: 'keluaran' | 'masukan';
  lawan_transaksi: string;
  npwp_lawan?: string;
  dpp: number;                    // Dasar Pengenaan Pajak
  ppn: number;                    // PPN (12% × DPP)
  ppnbm: number;
  status: 'normal' | 'batal' | 'retur' | 'pengganti';
  keterangan?: string;
  client_id?: number;
  created_at?: string;
}

export interface PPNMonthly {
  month: number;
  month_name: string;
  year: number;
  ppn_keluaran: number;           // Total PPN dari penjualan
  ppn_masukan: number;            // Total PPN dari pembelian
  ppn_kurang_bayar: number;       // Keluaran - Masukan (jika positif)
  ppn_lebih_bayar: number;        // Masukan - Keluaran (jika positif)
  status: 'kurang_bayar' | 'lebih_bayar' | 'nihil';
  jumlah_faktur_keluaran: number;
  jumlah_faktur_masukan: number;
}

export interface SPTMasaPPN {
  masa_pajak: string;             // '2026-01'
  year: number;
  month: number;
  total_dpp_keluaran: number;
  total_ppn_keluaran: number;
  total_dpp_masukan: number;
  total_ppn_masukan: number;
  ppn_kurang_lebih_bayar: number;
  status: 'kurang_bayar' | 'lebih_bayar' | 'nihil';
  faktur_keluaran: FakturPajak[];
  faktur_masukan: FakturPajak[];
}

// ============================================================
// PPh 21 — Pajak Penghasilan Karyawan (TER — PMK 168/2023)
// ============================================================

/** Kategori PTKP (Penghasilan Tidak Kena Pajak) */
export type PTKPCategory =
  | 'TK/0' | 'TK/1' | 'TK/2' | 'TK/3'   // Tidak Kawin
  | 'K/0'  | 'K/1'  | 'K/2'  | 'K/3'     // Kawin
  | 'K/I/0' | 'K/I/1' | 'K/I/2' | 'K/I/3'; // Kawin + Penghasilan Digabung

/** Kategori TER (Tarif Efektif Rata-Rata) */
export type TERCategory = 'A' | 'B' | 'C';

export interface Employee {
  id: number;
  name: string;
  npwp?: string;
  nik?: string;
  ptkp_category: PTKPCategory;
  ter_category: TERCategory;
  gross_salary: number;           // Gaji pokok bulanan
  allowances: number;             // Tunjangan
  overtime: number;               // Lembur
  bonus: number;                  // Bonus (non-reguler)
  deductions: number;             // Potongan (BPJS dll)
  client_id?: number;
}

export interface PPh21MonthlyCalc {
  employee_id: number;
  employee_name: string;
  month: number;
  month_name: string;
  year: number;
  gross_income: number;           // Penghasilan bruto bulanan
  ter_category: TERCategory;
  ter_rate_percent: number;       // Tarif TER yang berlaku
  pph21_monthly: number;          // PPh 21 terutang bulan ini
  net_income: number;             // Take-home pay
}

export interface PPh21AnnualReconciliation {
  employee_id: number;
  employee_name: string;
  year: number;
  total_gross_annual: number;
  ptkp_amount: number;            // Penghasilan Tidak Kena Pajak setahun
  taxable_income: number;         // Penghasilan Kena Pajak
  pph21_annual_pasal17: number;   // PPh 21 terutang setahun (tarif progresif Pasal 17)
  total_ter_paid: number;         // Total PPh 21 TER yang sudah dipotong selama setahun
  pph21_kurang_lebih_bayar: number; // Selisih (Desember adjustment)
}

// ============================================================
// PPh 23 & PPh 4(2) — Pajak Pemotongan Jasa/Sewa
// ============================================================

/** Jenis transaksi PPh 23 */
export type PPh23TransactionType =
  | 'dividen' | 'bunga' | 'royalti'     // Tarif 15%
  | 'jasa_teknik' | 'jasa_manajemen' | 'jasa_konsultan' | 'jasa_lainnya'; // Tarif 2%

/** Jenis transaksi PPh 4(2) */
export type PPh4Ayat2TransactionType =
  | 'sewa_tanah_bangunan'    // 10%
  | 'konstruksi_pelaksana_kecil' | 'konstruksi_pelaksana_menengah' | 'konstruksi_pelaksana_besar' // 1.75% / 2.65% / 4%
  | 'konstruksi_perencanaan' | 'konstruksi_pengawasan' // 3.5% / 6%
  | 'pengalihan_hak_tanah'   // 2.5%
  | 'dividen_op';            // 10%

export interface BuktiPotong {
  id: number;
  jenis: 'PPh21' | 'PPh23' | 'PPh4(2)';
  masa_pajak: string;            // '2026-01'
  nama_dipotong: string;
  npwp_dipotong?: string;
  jenis_penghasilan: string;
  dpp: number;
  tarif: number;                 // Persentase tarif (misal: 2, 15, 10)
  pph_dipotong: number;
  client_id?: number;
  created_at?: string;
}

// ============================================================
// DOUBLE-ENTRY ACCOUNTING
// ============================================================

/** Tipe akun dalam Chart of Accounts */
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  id: number;
  code: string;                  // '1100', '4100', etc.
  name: string;
  type: AccountType;
  parent_code?: string;
  is_active: boolean;
  client_id?: number;
}

export interface JournalEntry {
  id: number;
  date: string;
  description: string;
  reference?: string;            // Nomor bukti/invoice
  lines: JournalLine[];
  client_id?: number;
  created_at?: string;
}

export interface JournalLine {
  id: number;
  journal_id: number;
  account_code: string;
  account_name?: string;         // Joined from accounts table
  debit: number;
  credit: number;
  description?: string;
}

export interface LedgerEntry {
  date: string;
  journal_id: number;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  balance: number;               // Running balance
}

export interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  account_type: AccountType;
  total_debit: number;
  total_credit: number;
  balance: number;               // Debit - Credit (positif = debit saldo)
}

export interface BalanceSheet {
  date: string;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  assets: TrialBalanceRow[];
  liabilities: TrialBalanceRow[];
  equity: TrialBalanceRow[];
}

export interface IncomeStatement {
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_cogs: number;            // Harga Pokok Penjualan
  gross_profit: number;
  total_operating_expense: number;
  operating_profit: number;
  total_other_income_expense: number;
  net_profit_before_tax: number;
  tax_expense: number;
  net_profit_after_tax: number;
  revenue_items: TrialBalanceRow[];
  expense_items: TrialBalanceRow[];
}

// ============================================================
// KOREKSI FISKAL
// ============================================================

export type FiscalCorrectionType = 'positive_permanent' | 'positive_temporary' | 'negative';

export interface FiscalCorrection {
  id: number;
  fiscal_year: number;
  description: string;
  correction_type: FiscalCorrectionType;
  amount: number;
  regulation_ref?: string;        // Referensi pasal/PMK
  client_id?: number;
}

export interface FiscalReconciliation {
  fiscal_year: number;
  commercial_profit: number;
  corrections: FiscalCorrection[];
  total_positive_corrections: number;
  total_negative_corrections: number;
  taxable_income: number;
}

// ============================================================
// CRM RISK & SP2DK PREDICTOR
// ============================================================

export interface RiskIndicator {
  name: string;
  label: string;
  value: number;
  benchmark: number;
  score: number;                 // 0-100 per indicator
  status: 'aman' | 'waspada' | 'bahaya';
  explanation: string;
  recommendation: string;
}

export interface CRMRiskScore {
  overall_score: number;         // 0-100
  risk_level: 'rendah' | 'sedang' | 'tinggi' | 'kritis';
  probability_sp2dk: number;     // Persentase estimasi probabilitas
  color: string;
  indicators: RiskIndicator[];
  summary: string;
  fiscal_impact_estimate: number; // Estimasi potensi koreksi pajak (Rp)
}

// ============================================================
// CRYPTO TAX (PMK 50/2025)
// ============================================================

export interface CryptoTransaction {
  id: number;
  date: string;
  exchange: string;              // 'indodax', 'tokocrypto', 'binance', 'bybit', dll
  pair: string;                  // 'BTC/IDR', 'ETH/USDT'
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  total_value: number;
  exchange_type: 'domestic_ojk' | 'foreign' | 'defi';
  pph22_rate: number;            // 0.0021 (0.21%) atau 0.01 (1%)
  pph22_amount: number;
  client_id?: number;
}

export interface CryptoTaxSummary {
  period: string;                // '2026-01' atau '2026'
  total_sell_value: number;
  total_pph22_domestic: number;  // 0.21%
  total_pph22_foreign: number;   // 1.00%
  total_pph22_due: number;
  transactions_count: number;
}

// ============================================================
// CONSTANTS
// ============================================================

export const CATEGORIES: Record<string, string[]> = {
  income: ['Penjualan', 'Pemasukan Lain'],
  expense: ['Bahan Baku', 'Operasional', 'Gaji', 'Pajak', 'Pengeluaran Lain'],
};

export const DEFAULT_CATEGORIES: Record<string, string> = {
  income: 'Penjualan',
  expense: 'Pengeluaran Lain',
};

export const MONTH_NAMES_ID: Record<string, string> = {
  '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
  '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
  '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember',
};

/** Nilai PTKP (Penghasilan Tidak Kena Pajak) per tahun — UU HPP */
export const PTKP_VALUES: Record<PTKPCategory, number> = {
  'TK/0': 54_000_000,
  'TK/1': 58_500_000,
  'TK/2': 63_000_000,
  'TK/3': 67_500_000,
  'K/0':  58_500_000,
  'K/1':  63_000_000,
  'K/2':  67_500_000,
  'K/3':  72_000_000,
  'K/I/0': 112_500_000,
  'K/I/1': 117_000_000,
  'K/I/2': 121_500_000,
  'K/I/3': 126_000_000,
};

/** Tarif progresif PPh Pasal 17 ayat 1 huruf a — UU HPP */
export const PPH_PASAL17_BRACKETS: Array<{ upper: number; rate: number }> = [
  { upper: 60_000_000,       rate: 0.05 },
  { upper: 250_000_000,      rate: 0.15 },
  { upper: 500_000_000,      rate: 0.25 },
  { upper: 5_000_000_000,    rate: 0.30 },
  { upper: Infinity,         rate: 0.35 },
];

/** Tarif PPh 23 per jenis penghasilan */
export const PPH23_RATES: Record<PPh23TransactionType, number> = {
  dividen: 0.15,
  bunga: 0.15,
  royalti: 0.15,
  jasa_teknik: 0.02,
  jasa_manajemen: 0.02,
  jasa_konsultan: 0.02,
  jasa_lainnya: 0.02,
};

/** Tarif PPh 4 ayat 2 per jenis transaksi */
export const PPH4AYAT2_RATES: Record<PPh4Ayat2TransactionType, number> = {
  sewa_tanah_bangunan: 0.10,
  konstruksi_pelaksana_kecil: 0.0175,
  konstruksi_pelaksana_menengah: 0.0265,
  konstruksi_pelaksana_besar: 0.04,
  konstruksi_perencanaan: 0.035,
  konstruksi_pengawasan: 0.06,
  pengalihan_hak_tanah: 0.025,
  dividen_op: 0.10,
};

/** Tarif PPN berlaku */
export const PPN_RATE = 0.12; // 12% per 1 Januari 2025 (UU HPP)

/** Tarif PPh Badan */
export const PPH_BADAN_RATE = 0.22; // 22%
export const PPH_BADAN_FACILITATED_RATE = 0.11; // 22% × 50% fasilitas Pasal 31E
export const PASAL_31E_REVENUE_LIMIT = 50_000_000_000; // Rp 50 Miliar
export const PASAL_31E_FACILITATED_PORTION = 4_800_000_000; // Rp 4,8 Miliar

/** Threshold PPh Final UMKM */
export const UMKM_REVENUE_LIMIT = 4_800_000_000; // Rp 4,8 Miliar
export const UMKM_WPOP_THRESHOLD = 500_000_000; // Rp 500 Juta (bebas pajak WPOP)

/** Crypto Tax Rates (PMK 50/2025) */
export const CRYPTO_TAX_RATE_DOMESTIC = 0.0021; // 0.21%
export const CRYPTO_TAX_RATE_FOREIGN = 0.01;    // 1.00%
