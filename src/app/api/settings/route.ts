import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertPermission, hasPermission } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";
import { getAuthUser, requireUser } from "@/lib/session";
import { apiError } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET stays reachable without a session (Render health check + clinic header), but staff
// e-mails / phone numbers / account list are only returned to users allowed to manage settings.
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const canManage = !!user && hasPermission(user.role, "SETTINGS_MANAGE");

    const [setting, doctors, users] = await Promise.all([
      prisma.clinicSetting.findUnique({ where: { id: "default" } }),
      prisma.doctorProfile.findMany({
        include: canManage ? { user: { select: { email: true, mobileNumber: true } } } : undefined
      }),
      canManage
        ? prisma.user.findMany({
            where: user!.role === "ADMINISTRATOR" ? undefined : { id: user!.id },
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
        : Promise.resolve([])
    ]);

    return NextResponse.json({
      data: {
        clinicSetting: setting,
        doctors,
        users
      }
    });
  } catch (err: any) {
    return apiError(err, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireUser(req);
    assertPermission(authUser.role, "SETTINGS_MANAGE");

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
      // One doctor must not be able to take over the other doctor's (or the receptionist's) account.
      if (authUser.role !== "ADMINISTRATOR" && userId !== authUser.id) {
        return NextResponse.json({ error: "You can only change your own password." }, { status: 403 });
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
    return apiError(err);
  }
}
