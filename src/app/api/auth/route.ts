import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { apiError } from "@/lib/apiHelpers";
import { createSessionToken, getAuthUser, SESSION_COOKIE, sessionMaxAgeSeconds } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge
  };
}

// GET: who is signed in right now? (never lists other staff accounts)
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const full = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        email: true,
        mobileNumber: true,
        role: true,
        doctorProfile: {
          select: {
            id: true,
            doctorName: true,
            qualification: true,
            specialty: true,
            consultationFee: true,
            followupFee: true,
            roomNumber: true
          }
        }
      }
    });
    return NextResponse.json({ user: full });
  } catch (err: any) {
    return apiError(err, 500);
  }
}

// POST: sign in with email + password, sets the signed session cookie
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
      include: { doctorProfile: true }
    });

    // Same message for unknown e-mail and wrong password (no account enumeration)
    if (!user || !user.isActive || !verifyPassword(String(password), user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const res = NextResponse.json({
      user: {
        id: user.id,
        employeeCode: user.employeeCode,
        fullName: user.fullName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        doctorProfile: user.doctorProfile
      }
    });
    res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions(sessionMaxAgeSeconds()));
    return res;
  } catch (err: any) {
    return apiError(err, 500);
  }
}

// DELETE: sign out
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return res;
}
