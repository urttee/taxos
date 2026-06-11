import { NextResponse } from "next/server";
import { getAllRegulations } from "@/lib/rag";

export async function GET() {
  try {
    const regs = await getAllRegulations();
    return NextResponse.json(regs);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
