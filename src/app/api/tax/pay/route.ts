import { NextResponse } from "next/server";
import { addTransaction } from "@/lib/bookkeeping";
import { MONTH_NAMES_ID } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { month_code, amount } = body;

    if (!month_code || amount === undefined) {
      return NextResponse.json({ error: "month_code and amount are required" }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const paymentDate = `${year}-${month_code}-15`;
    const mName = MONTH_NAMES_ID[month_code] || `Bulan ${month_code}`;

    const newId = await addTransaction(
      paymentDate,
      `Penyetoran PPh Final PP 55 - Bulan ${mName}`,
      parseFloat(amount),
      "expense",
      "Pajak",
      "manual"
    );

    const formatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
    const amountFmt = formatter.format(amount);

    return NextResponse.json({
      status: "success",
      transaction_id: newId,
      message: `Pajak bulan ${mName} sebesar ${amountFmt} berhasil disetor.`
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
