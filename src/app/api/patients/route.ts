import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PatientRegistrationSchema } from "@/lib/validation";
import { assertPermission } from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/apiHelpers";
import {
  appointmentWhereFor,
  assertPatientAccess,
  billWhereFor,
  consultationWhereFor,
  patientWhereFor,
  visitWhereFor
} from "@/lib/access";
import { findPotentialDuplicatePatients, generateNextPatientId } from "@/services/clinicCoreService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user.role, "PATIENT_READ");

    const patientId = req.nextUrl.searchParams.get("id");

    // Single Patient Profile (history is limited to the signed-in doctor's own records)
    if (patientId) {
      await assertPatientAccess(user, patientId);

      const visitScope = visitWhereFor(user);
      const apptScope = appointmentWhereFor(user);
      const consultScope = consultationWhereFor(user);
      const billScope = billWhereFor(user);

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          opdVisits: {
            where: visitScope,
            include: {
              doctor: true,
              consultation: {
                include: {
                  vitals: true,
                  prescriptions: { include: { items: true } }
                }
              },
              bill: { include: { payments: true } }
            },
            orderBy: { visitDate: "desc" }
          },
          appointments: {
            where: apptScope,
            include: { doctor: true },
            orderBy: { appointmentDate: "desc" }
          },
          consultations: {
            where: consultScope,
            include: {
              doctor: true,
              vitals: true,
              prescriptions: { include: { items: true } }
            },
            orderBy: { consultationDate: "desc" }
          },
          bills: {
            where: billScope,
            include: { payments: true, doctor: true },
            orderBy: { createdAt: "desc" }
          }
        }
      });

      if (!patient) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      }

      return NextResponse.json({ data: patient });
    }

    // Patient List / Search (doctors only receive their own patients)
    const q = req.nextUrl.searchParams.get("q")?.trim() || "";
    const scope = patientWhereFor(user);
    const search = q
      ? {
          OR: [
            { patientId: { contains: q } },
            { fullName: { contains: q } },
            { mobileNumber: { contains: q } }
          ]
        }
      : undefined;
    const filters = [search, scope].filter(Boolean) as any[];

    const patients = await prisma.patient.findMany({
      where: filters.length ? { AND: filters } : undefined,
      include: {
        opdVisits: {
          where: visitWhereFor(user),
          orderBy: { visitDate: "desc" },
          take: 1,
          select: { visitDate: true, visitNumber: true, status: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 500
    });

    const formatted = patients.map((p) => ({
      id: p.id,
      patientId: p.patientId,
      fullName: p.fullName,
      age: p.age,
      gender: p.gender,
      mobileNumber: p.mobileNumber,
      address: p.address,
      notes: p.notes,
      lastVisitDate: p.opdVisits[0]?.visitDate || null,
      createdAt: p.createdAt
    }));

    return NextResponse.json({ data: formatted });
  } catch (err: any) {
    return apiError(err, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user.role, "PATIENT_WRITE");

    const body = await req.json();
    const parsed = PatientRegistrationSchema.parse(body);

    // Check for potential duplicate patients
    if (!parsed.overrideDuplicateWarning) {
      const duplicates = await findPotentialDuplicatePatients(parsed.fullName, parsed.mobileNumber);
      if (duplicates.length > 0) {
        // A doctor must not learn details of another doctor's patients through this warning.
        const scope = patientWhereFor(user);
        let visible = duplicates;
        let hiddenCount = 0;
        if (scope) {
          const allowed = await prisma.patient.findMany({
            where: { AND: [{ id: { in: duplicates.map((d) => d.id) } }, scope] },
            select: { id: true }
          });
          const allowedIds = new Set(allowed.map((a) => a.id));
          visible = duplicates.filter((d) => allowedIds.has(d.id));
          hiddenCount = duplicates.length - visible.length;
        }
        return NextResponse.json(
          {
            warning: "POTENTIAL_DUPLICATE_DETECTED",
            message:
              hiddenCount > 0 && visible.length === 0
                ? "A patient with a matching mobile number or name is already registered at the clinic. Please ask reception to check before registering again."
                : "A patient with matching mobile number or name already exists. Please review before proceeding.",
            duplicates: visible,
            hiddenCount
          },
          { status: 409 }
        );
      }
    }

    const patientId = await generateNextPatientId();
    const created = await prisma.patient.create({
      data: {
        patientId,
        fullName: parsed.fullName,
        age: parsed.age,
        gender: parsed.gender,
        mobileNumber: parsed.mobileNumber,
        address: parsed.address ?? null,
        notes: parsed.notes ?? null,
        registeredById: user.id
      }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.role,
        action: "PATIENT_REGISTER",
        entityType: "Patient",
        entityId: created.id,
        summary: `Registered patient ${created.fullName} (${created.patientId})`
      }
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    return apiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user.role, "PATIENT_WRITE");

    const body = await req.json();
    const { id, fullName, age, gender, mobileNumber, address, notes } = body;
    if (!id) return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
    await assertPatientAccess(user, id);

    if (mobileNumber && !/^[6-9]\d{9}$/.test(String(mobileNumber).trim())) {
      return NextResponse.json({ error: "Please enter a valid 10-digit Indian mobile number" }, { status: 400 });
    }

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        ...(fullName ? { fullName: String(fullName).trim() } : {}),
        ...(age !== undefined ? { age: Number(age) } : {}),
        ...(gender ? { gender } : {}),
        ...(mobileNumber ? { mobileNumber: String(mobileNumber).trim() } : {}),
        ...(address !== undefined ? { address: address ? String(address).trim() : null } : {}),
        ...(notes !== undefined ? { notes: notes ? String(notes).trim() : null } : {})
      }
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    return apiError(err);
  }
}
