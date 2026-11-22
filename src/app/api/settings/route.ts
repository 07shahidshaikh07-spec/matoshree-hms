import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertPermission, StaffRoleType } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const [setting, doctors, users] = await Promise.all([
      prisma.clinicSetting.findUnique({ where: { id: "default" } }),
      prisma.doctorProfile.findMany({ include: { user: { select: { email: true, mobileNumber: true } } } }),
      prisma.user.findMany({
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          email: true,
          mobileNumber: true,
          role: true,
          isActive: true
        }
      })
    ]);

    return NextResponse.json({
      data: {
        clinicSetting: setting,
        doctors,
        users
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = (req.headers.get("x-user-role") || "DOCTOR") as StaffRoleType;
    assertPermission(role, "SETTINGS_MANAGE");

    const body = await req.json();

    // 1. Update Clinic Settings
    if (body.action === "UPDATE_CLINIC_INFO") {
      const { clinicName, location, addressLine, contactPhone, email, website } = body;
      const updated = await prisma.clinicSetting.upsert({
        where: { id: "default" },
        update: {
          ...(clinicName ? { clinicName: clinicName.trim() } : {}),
          ...(location ? { location: location.trim() } : {}),
          ...(addressLine ? { addressLine: addressLine.trim() } : {}),
          ...(contactPhone ? { contactPhone: contactPhone.trim() } : {}),
          ...(email ? { email: email.trim() } : {}),
          ...(website !== undefined ? { website: website ? website.trim() : null } : {})
        },
        create: {
          id: "default",
          clinicName: clinicName || "Matoshree Clinic",
          location: location || "Latur, Maharashtra, India",
          addressLine: addressLine || "Station Road, Latur, Maharashtra 413512",
          contactPhone: contactPhone || "+91 2382 250000",
          email: email || "contact@matoshreeclinic.in",
          website: website || null
        }
      });
      return NextResponse.json({ data: updated });
    }

    // 2. Update Doctor Profile & Fees
    if (body.action === "UPDATE_DOCTOR_FEE") {
      const { doctorId, consultationFee, followupFee, roomNumber, qualification, specialty } = body;
      if (!doctorId) return NextResponse.json({ error: "Doctor ID is required" }, { status: 400 });

      const updated = await prisma.doctorProfile.update({
        where: { id: doctorId },
        data: {
          ...(consultationFee !== undefined ? { consultationFee: Number(consultationFee) } : {}),
          ...(followupFee !== undefined ? { followupFee: Number(followupFee) } : {}),
          ...(roomNumber !== undefined ? { roomNumber: roomNumber.trim() } : {}),
          ...(qualification !== undefined ? { qualification: qualification.trim() } : {}),
          ...(specialty !== undefined ? { specialty: specialty.trim() } : {})
        }
      });
      return NextResponse.json({ data: updated });
    }

    // 3. Update User Password
    if (body.action === "CHANGE_PASSWORD") {
      const { userId, newPassword } = body;
      if (!userId || !newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: "User ID and password (min 6 chars) required" }, { status: 400 });
      }

      const passwordHash = hashPassword(newPassword);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      });
      return NextResponse.json({ message: "Password updated successfully" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 400 });
  }
}
