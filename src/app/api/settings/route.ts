import { NextResponse } from "next/server";
import { getBusinessName, getBusinessType, setBusinessSettings } from "@/lib/tax";

export async function GET() {
  try {
    const business_name = await getBusinessName();
    const business_type = await getBusinessType();
    return NextResponse.json({ business_name, business_type });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { business_name, business_type } = body;

    if (!business_name || !business_type) {
      return NextResponse.json({ error: "business_name and business_type are required" }, { status: 400 });
    }

    await setBusinessSettings(business_name, business_type);
    return NextResponse.json({ status: "success", message: "Profil bisnis berhasil diperbarui" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
