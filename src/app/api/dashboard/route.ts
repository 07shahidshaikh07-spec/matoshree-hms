import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from "@/services/clinicCoreService";

export async function GET(req: NextRequest) {
  try {
    const data = await getDashboardData();
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
