import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from "@/services/clinicCoreService";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/apiHelpers";

// Must never be cached: the dashboard has to reflect new patients / bookings immediately.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const data = await getDashboardData(user);
    return NextResponse.json({ data });
  } catch (err: any) {
    return apiError(err, 500);
  }
}
