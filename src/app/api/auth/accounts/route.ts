import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Public list for the sign-in screen: display name + role only.
// No e-mail, phone or employee code is returned (sign-in itself still needs the password).
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        role: true,
        doctorProfile: { select: { specialty: true, qualification: true } }
      },
      orderBy: [{ role: "asc" }, { fullName: "asc" }]
    });
    return NextResponse.json({
      accounts: users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        role: u.role,
        subtitle: u.doctorProfile?.specialty || null
      }))
    });
  } catch (err: any) {
    return apiError(err, 500);
  }
}
