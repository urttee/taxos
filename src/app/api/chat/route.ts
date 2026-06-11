import { NextResponse } from "next/server";
import { processChatMessage } from "@/lib/ai";
import { addTransaction } from "@/lib/bookkeeping";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const result = await processChatMessage(message);

    // If chat message successfully recorded a transaction, save it
    if (result.is_transaction && result.transaction) {
      const tx = result.transaction;
      const txDate = tx.date || new Date().toISOString().slice(0, 10);

      const newId = await addTransaction(
        txDate,
        tx.description,
        tx.amount,
        tx.type,
        tx.category,
        "whatsapp"
      );
      result.transaction_id = newId;
    }

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("Error in chat API:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
