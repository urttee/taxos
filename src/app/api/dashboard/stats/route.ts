import { NextResponse } from "next/server";
import { getBusinessName, getBusinessType, calculateTaxObligations, getTaxDeadlines } from "@/lib/tax";
import { getFinancialSummary, getBusinessHealthScore } from "@/lib/bookkeeping";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    const bizName = await getBusinessName();
    const bizType = await getBusinessType();

    const financials = await getFinancialSummary(year);
    const health = getBusinessHealthScore(financials);
    const tax = await calculateTaxObligations(year);
    const deadlines = getTaxDeadlines();

    return NextResponse.json({
      business_name: bizName,
      business_type: bizType,
      year,
      financials,
      health,
      tax,
      deadlines
    });
  } catch (e: any) {
    console.error("Error in dashboard stats API:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
