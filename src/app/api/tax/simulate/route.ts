import { NextResponse } from "next/server";
import { simulateTax } from "@/lib/tax";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { monthly_turnover, business_type } = body;

    if (monthly_turnover === undefined) {
      return NextResponse.json({ error: "monthly_turnover is required" }, { status: 400 });
    }

    const result = simulateTax(parseFloat(monthly_turnover), business_type || "Orang Pribadi");
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
