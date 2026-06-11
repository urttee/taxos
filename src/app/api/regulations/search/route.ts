import { NextResponse } from "next/server";
import { searchRegulations } from "@/lib/rag";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q) {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    }

    const results = await searchRegulations(q);
    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
