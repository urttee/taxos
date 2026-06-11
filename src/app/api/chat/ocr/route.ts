import { NextResponse } from "next/server";
import { simulateOcrReceipt } from "@/lib/ai";
import { addTransaction } from "@/lib/bookkeeping";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { receipt_type } = body;

    if (!receipt_type) {
      return NextResponse.json({ error: "receipt_type is required" }, { status: 400 });
    }

    const ocrResult = simulateOcrReceipt(receipt_type);
    const todayStr = new Date().toISOString().slice(0, 10);

    const newId = await addTransaction(
      todayStr,
      ocrResult.description,
      ocrResult.amount,
      ocrResult.type,
      ocrResult.category,
      "ocr",
      ocrResult.ocr_metadata
    );

    const formatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
    const amountFmt = formatter.format(ocrResult.amount);
    
    const merchant = ocrResult.ocr_metadata.merchant || ocrResult.ocr_metadata.source || "Tidak Diketahui";
    const items = ocrResult.ocr_metadata.items ? ocrResult.ocr_metadata.items.join(", ") : ocrResult.description;

    const responseText =
      `📸 **Nota Terbaca Otomatis! (OCR)**\n\n` +
      `• **Sumber**: ${merchant}\n` +
      `• **Barang/Detail**: ${items}\n` +
      `• **Kategori**: ${ocrResult.category}\n` +
      `• **Total Nominal**: **${amountFmt}**\n\n` +
      `Transaksi telah otomatis dibukukan.`;

    return NextResponse.json({
      status: "success",
      is_transaction: true,
      response: responseText,
      transaction_id: newId,
      transaction: ocrResult
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
