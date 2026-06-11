import { queryDb } from "./db";

import { MONTH_NAMES_ID } from "./constants";

export async function getBusinessType(): Promise<string> {
  const rows = await queryDb("SELECT value FROM settings WHERE key = 'business_type';");
  return rows.length > 0 ? rows[0].value : "Orang Pribadi";
}

export async function getBusinessName(): Promise<string> {
  const rows = await queryDb("SELECT value FROM settings WHERE key = 'business_name';");
  return rows.length > 0 ? rows[0].value : "Warung Makan Berkah";
}

export async function setBusinessSettings(name: string, bizType: string): Promise<void> {
  if (bizType !== "Orang Pribadi" && bizType !== "Badan Usaha") {
    throw new Error("Business type must be 'Orang Pribadi' or 'Badan Usaha'");
  }
  await queryDb("INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2);", ["business_name", name]);
  await queryDb("INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2);", ["business_type", bizType]);
}

export interface TaxMonthDetails {
  month_code: string;
  month_name: string;
  turnover: number;
  cumulative_turnover: number;
  taxable_turnover: number;
  tax_due: number;
  tax_paid: number;
  status: "Bebas Pajak" | "Lunas" | "Belum Lunas";
}

export interface TaxObligations {
  year: number;
  business_type: string;
  total_turnover: number;
  total_tax_due: number;
  total_tax_paid: number;
  remaining_tax_due: number;
  months: TaxMonthDetails[];
}

export async function calculateTaxObligations(year: number = 2026): Promise<TaxObligations> {
  const bizType = await getBusinessType();

  // Get monthly turnover
  // SQLite strftime('%m', date) vs Postgres/Supabase extracting month
  // To write a query compatible with both, we can query raw dates and aggregate in JS, 
  // or use safe queries. Since date is stored as TEXT "YYYY-MM-DD" in both SQLite and Postgres in our schema,
  // we can use SUBSTR(date, 6, 2) which is standard in both SQLite and PostgreSQL!
  const turnoverRows = await queryDb(
    `SELECT 
      SUBSTR(date, 6, 2) as month,
      SUM(amount) as turnover
     FROM transactions
     WHERE SUBSTR(date, 1, 4) = $1 AND type = 'income'
     GROUP BY month
     ORDER BY month ASC;`,
    [year.toString()]
  );

  // Get monthly tax payments
  const paymentsRows = await queryDb(
    `SELECT 
      SUBSTR(date, 6, 2) as month,
      SUM(amount) as tax_paid
     FROM transactions
     WHERE SUBSTR(date, 1, 4) = $1 AND type = 'expense' AND category = 'Pajak'
     GROUP BY month;`,
    [year.toString()]
  );

  const paymentsMap: Record<string, number> = {};
  for (const r of paymentsRows) {
    paymentsMap[r.month] = parseFloat(r.tax_paid) || 0.0;
  }

  const turnoverMap: Record<string, number> = {};
  for (let i = 1; i <= 12; i++) {
    turnoverMap[`${i}`.padStart(2, "0")] = 0.0;
  }
  for (const r of turnoverRows) {
    turnoverMap[r.month] = parseFloat(r.turnover) || 0.0;
  }

  let cumulativeTurnover = 0.0;
  const threshold = 500000000.0; // Rp 500 Million
  const monthlyDetails: TaxMonthDetails[] = [];

  let totalTaxDue = 0.0;
  let totalTaxPaid = 0.0;

  const sortedMonths = Object.keys(turnoverMap).sort();

  for (const mCode of sortedMonths) {
    const mName = MONTH_NAMES_ID[mCode];
    const monthlyOmset = turnoverMap[mCode];
    const prevCumulative = cumulativeTurnover;
    cumulativeTurnover += monthlyOmset;

    let taxableTurnover = 0.0;
    let taxDue = 0.0;

    if (bizType === "Orang Pribadi") {
      if (cumulativeTurnover <= threshold) {
        taxableTurnover = 0.0;
        taxDue = 0.0;
      } else if (prevCumulative >= threshold) {
        taxableTurnover = monthlyOmset;
        taxDue = taxableTurnover * 0.005;
      } else {
        // Crossed threshold this month
        taxableTurnover = cumulativeTurnover - threshold;
        taxDue = taxableTurnover * 0.005;
      }
    } else {
      // Badan Usaha: No threshold
      taxableTurnover = monthlyOmset;
      taxDue = taxableTurnover * 0.005;
    }

    const paidAmount = paymentsMap[mCode] || 0.0;
    let status: "Bebas Pajak" | "Lunas" | "Belum Lunas" = "Belum Lunas";

    if (taxDue === 0) {
      status = "Bebas Pajak";
    } else if (paidAmount >= taxDue) {
      status = "Lunas";
    } else {
      status = "Belum Lunas";
    }

    totalTaxDue += taxDue;
    totalTaxPaid += paidAmount;

    monthlyDetails.push({
      month_code: mCode,
      month_name: mName,
      turnover: monthlyOmset,
      cumulative_turnover: cumulativeTurnover,
      taxable_turnover: taxableTurnover,
      tax_due: taxDue,
      tax_paid: paidAmount,
      status
    });
  }

  return {
    year,
    business_type: bizType,
    total_turnover: cumulativeTurnover,
    total_tax_due: totalTaxDue,
    total_tax_paid: totalTaxPaid,
    remaining_tax_due: Math.max(0.0, totalTaxDue - totalTaxPaid),
    months: monthlyDetails
  };
}

export function getTaxDeadlines(): any[] {
  const now = new Date();
  const currentYear = now.getFullYear();

  return [
    {
      title: "Penyetoran PPh Final PP 55 Bulanan",
      date: "Tanggal 15 setiap bulan berikutnya",
      description: "Batas waktu penyetoran pajak PPh Final 0,5% atas omzet bulan berjalan. Harus disetor menggunakan kode e-Billing (KJS: 411128-420).",
      urgency: "Bulanan"
    },
    {
      title: "Pelaporan SPT Tahunan Wajib Pajak Orang Pribadi",
      date: `31 Maret ${currentYear + 1}`,
      description: "Batas akhir pelaporan seluruh penghasilan dan penyetoran pajak terutang untuk Wajib Pajak Orang Pribadi tahun pajak berjalan.",
      urgency: "Tahunan"
    },
    {
      title: "Pelaporan SPT Tahunan Wajib Pajak Badan (CV/PT)",
      date: `30 April ${currentYear + 1}`,
      description: "Batas akhir pelaporan SPT Tahunan dan laporan keuangan bagi Wajib Pajak Badan (CV, PT, Koperasi).",
      urgency: "Tahunan"
    }
  ];
}

export function simulateTax(monthlyTurnover: number, businessType: string = "Orang Pribadi"): any {
  const threshold = 500000000.0;
  let cumulative = 0.0;
  const months = [];
  let totalTax = 0.0;

  for (let i = 1; i <= 12; i++) {
    const mCode = `${i}`.padStart(2, "0");
    const mName = MONTH_NAMES_ID[mCode];
    const prevCumulative = cumulative;
    cumulative += monthlyTurnover;

    let taxable = 0.0;
    if (businessType === "Orang Pribadi") {
      if (cumulative <= threshold) {
        taxable = 0.0;
      } else if (prevCumulative >= threshold) {
        taxable = monthlyTurnover;
      } else {
        taxable = cumulative - threshold;
      }
    } else {
      taxable = monthlyTurnover;
    }

    const tax = taxable * 0.005;
    totalTax += tax;

    months.push({
      month_name: mName,
      turnover: monthlyTurnover,
      cumulative_turnover: cumulative,
      taxable_turnover: taxable,
      tax_due: tax,
      status: tax === 0 ? "Bebas Pajak" : "Terutang"
    });
  }

  const annualTurnover = monthlyTurnover * 12;
  const effectiveRate = annualTurnover > 0 ? (totalTax / annualTurnover) * 100 : 0;

  const formatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
  const monthlyFmt = formatter.format(monthlyTurnover);
  const totalTaxFmt = formatter.format(totalTax);

  return {
    business_type: businessType,
    monthly_turnover: monthlyTurnover,
    annual_turnover: annualTurnover,
    total_tax_annual: totalTax,
    effective_rate_percent: parseFloat(effectiveRate.toFixed(3)),
    months,
    summary: `Dengan omset bulanan ${monthlyFmt}, estimasi pajak PPh Final setahun adalah ${totalTaxFmt} (tarif efektif ${effectiveRate.toFixed(2)}%).`
  };
}
