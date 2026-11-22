import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { OPDVisitCreateSchema } from "@/lib/validation";
import { assertPermission, StaffRoleType } from "@/lib/rbac";
import { generateNextOpdVisitNumber } from "@/services/clinicCoreService";

export async function GET(req: NextRequest) {
  try {
    const role = (req.headers.get("x-user-role") || "RECEPTIONIST") as StaffRoleType;
    assertPermission(role, "PATIENT_READ");

    const doctorId = req.nextUrl.searchParams.get("doctorId");
    const status = req.nextUrl.searchParams.get("status");
    const dateParam = req.nextUrl.searchParams.get("date");

    const dateFilter = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(dateFilter);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateFilter);
    endOfDay.setHours(23, 59, 59, 999);

    const visits = await prisma.oPDVisit.findMany({
      where: {
        visitDate: { gte: startOfDay, lte: endOfDay },
        ...(doctorId ? { doctorId } : {}),
        ...(status ? { status } : {})
      },
      include: {
        patient: true,
        doctor: true,
        consultation: {
          select: {
            id: true,
            status: true,
            diagnosis: true,
            signedAt: true,
            prescriptions: { select: { id: true, prescriptionNumber: true } }
          }
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            paidAmount: true,
            balanceDue: true,
            paymentStatus: true
          }
        }
      },
      orderBy: { tokenNumber: "asc" }
    });

    return NextResponse.json({ data: visits });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = (req.headers.get("x-user-role") || "RECEPTIONIST") as StaffRoleType;
    const actorUserId = req.headers.get("x-user-id") || undefined;
    assertPermission(role, "OPD_VISIT_CREATE");

    const body = await req.json();
    const parsed = OPDVisitCreateSchema.parse(body);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Calculate daily token for this doctor
    const existingCount = await prisma.oPDVisit.count({
      where: {
        doctorId: parsed.doctorId,
        visitDate: { gte: startOfToday, lte: endOfToday }
      }
    });

    const tokenNumber = existingCount + 1;
    const visitNumber = await generateNextOpdVisitNumber();

    const nowTimeStr = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(new Date());

    const created = await prisma.oPDVisit.create({
      data: {
        visitNumber,
        patientId: parsed.patientId,
        doctorId: parsed.doctorId,
        visitDate: new Date(),
        visitTime: nowTimeStr,
        tokenNumber,
        reasonForVisit: parsed.reasonForVisit ?? "General OPD Consultation",
        status: "WAITING"
      },
      include: {
        patient: true,
        doctor: true
      }
    });

    if (actorUserId) {
      await prisma.auditLog.create({
        data: {
          actorUserId,
          actorRole: role,
          action: "OPD_VISIT_CREATE",
          entityType: "OPDVisit",
          entityId: created.id,
          summary: `Created OPD visit ${created.visitNumber} (Token #${tokenNumber}) for ${created.patient.fullName}`
        }
      });
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const role = (req.headers.get("x-user-role") || "RECEPTIONIST") as StaffRoleType;
    assertPermission(role, "OPD_VISIT_MANAGE");

    const body = await req.json();
    const { id, status } = body;
    if (!id || !status) {
      return NextResponse.json({ error: "Visit ID and status are required" }, { status: 400 });
    }

    const updated = await prisma.oPDVisit.update({
      where: { id },
      data: { status },
      include: { patient: true, doctor: true }
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 400 });
  }
}
