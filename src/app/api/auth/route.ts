import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
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
      },
      orderBy: { role: "asc" }
    });

    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { doctorProfile: true }
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid email or inactive staff account" }, { status: 401 });
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const safeUser = {
      id: user.id,
      employeeCode: user.employeeCode,
      fullName: user.fullName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      role: user.role,
      doctorProfile: user.doctorProfile
    };

    return NextResponse.json({ user: safeUser });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
