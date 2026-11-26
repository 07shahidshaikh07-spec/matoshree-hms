import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { OPDVisitCreateSchema } from "@/lib/validation";
import { assertPermission } from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/apiHelpers";
import { assertDoctorChoice, assertPatientAccess, assertVisitAccess, scopedDoctorId } from "@/lib/access";
import { istDayRange, isValidDateString } from "@/lib/timezone";
import { generateNextOpdVisitNumber, nextOpdToken } from "@/services/clinicCoreService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user.role, "PATIENT_READ");

    const requestedDoctorId = req.nextUrl.searchParams.get("doctorId");
    const status = req.nextUrl.searchParams.get("status");
    const dateParam = req.nextUrl.searchParams.get("date");

    // Doctors are always pinned to their own queue, whatever the query string says.
    const doctorId = scopedDoctorId(user) ?? requestedDoctorId;
    const { start, end } = istDayRange(dateParam && isValidDateString(dateParam) ? dateParam : undefined);

    const visits = await prisma.oPDVisit.findMany({
      where: {
        visitDate: { gte: start, lt: end },
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
    return apiError(err, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user.role, "OPD_VISIT_CREATE");

    const body = await req.json();
    const parsed = OPDVisitCreateSchema.parse(body);

    assertDoctorChoice(user, parsed.doctorId);
    await assertPatientAccess(user, parsed.patientId);

    const nowTimeStr = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(new Date());

    // Retry on the rare race where two desks take the same token/visit number at once.
    let created: any = null;
    for (let attempt = 0; attempt < 3 && !created; attempt++) {
      try {
        const tokenNumber = await nextOpdToken(parsed.doctorId);
        const visitNumber = await generateNextOpdVisitNumber();
        created = await prisma.oPDVisit.create({
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
          include: { patient: true, doctor: true }
        });
      } catch (e: any) {
        if (e?.code !== "P2002" || attempt === 2) throw e;
      }
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.role,
        action: "OPD_VISIT_CREATE",
        entityType: "OPDVisit",
        entityId: created.id,
        summary: `Created OPD visit ${created.visitNumber} (Token #${created.tokenNumber}) for ${created.patient.fullName}`
      }
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    return apiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user.role, "OPD_VISIT_MANAGE");

    const body = await req.json();
    const { id, status } = body;
    if (!id || !status) {
      return NextResponse.json({ error: "Visit ID and status are required" }, { status: 400 });
    }
    if (!["WAITING", "IN_CONSULTATION", "COMPLETED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Invalid visit status" }, { status: 400 });
    }
    await assertVisitAccess(user, id);

    const updated = await prisma.oPDVisit.update({
      where: { id },
      data: { status },
      include: { patient: true, doctor: true }
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    return apiError(err);
  }
}
