import { NextResponse } from "next/server";
import { getTransactions, addTransaction } from "@/lib/bookkeeping";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");

    const txs = await getTransactions({ type, category, start_date, end_date });
    return NextResponse.json(txs);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, description, amount, type, category, source, ocr_metadata } = body;

    if (!date || !description || amount === undefined || !type || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newId = await addTransaction(
      date,
      description,
      parseFloat(amount),
      type,
      category,
      source || "manual",
      ocr_metadata
    );

    return NextResponse.json({ status: "success", transaction_id: newId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
