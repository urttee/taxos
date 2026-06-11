import { NextResponse } from "next/server";
import { deleteTransaction } from "@/lib/bookkeeping";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const txId = parseInt(resolvedParams.id, 10);
    if (isNaN(txId)) {
      return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 });
    }

    const deleted = await deleteTransaction(txId);
    if (!deleted) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ status: "success", message: "Transaksi berhasil dihapus" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
