import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PatientRegistrationSchema } from "@/lib/validation";
import { assertPermission, StaffRoleType } from "@/lib/rbac";
import { findPotentialDuplicatePatients, generateNextPatientId } from "@/services/clinicCoreService";

export async function GET(req: NextRequest) {
  try {
    const role = (req.headers.get("x-user-role") || "RECEPTIONIST") as StaffRoleType;
    assertPermission(role, "PATIENT_READ");

    const patientId = req.nextUrl.searchParams.get("id");

    // Single Patient Profile (organized in one place with complete history)
    if (patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          opdVisits: {
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
            include: { doctor: true },
            orderBy: { appointmentDate: "desc" }
          },
          consultations: {
            include: {
              doctor: true,
              vitals: true,
              prescriptions: { include: { items: true } }
            },
            orderBy: { consultationDate: "desc" }
          },
          bills: {
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

    // Patient List / Search
    const q = req.nextUrl.searchParams.get("q")?.trim() || "";
    const patients = await prisma.patient.findMany({
      where: q
        ? {
            OR: [
              { patientId: { contains: q } },
              { fullName: { contains: q } },
              { mobileNumber: { contains: q } }
            ]
          }
        : undefined,
      include: {
        opdVisits: {
          orderBy: { visitDate: "desc" },
          take: 1,
          select: { visitDate: true, visitNumber: true, status: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
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
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = (req.headers.get("x-user-role") || "RECEPTIONIST") as StaffRoleType;
    const actorUserId = req.headers.get("x-user-id") || undefined;
    assertPermission(role, "PATIENT_WRITE");

    const body = await req.json();
    const parsed = PatientRegistrationSchema.parse(body);

    // Check for potential duplicate patients
    if (!parsed.overrideDuplicateWarning) {
      const duplicates = await findPotentialDuplicatePatients(parsed.fullName, parsed.mobileNumber);
      if (duplicates.length > 0) {
        return NextResponse.json(
          {
            warning: "POTENTIAL_DUPLICATE_DETECTED",
            message: "A patient with matching mobile number or name already exists. Please review before proceeding.",
            duplicates
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
        notes: parsed.notes ?? null
      }
    });

    if (actorUserId) {
      await prisma.auditLog.create({
        data: {
          actorUserId,
          actorRole: role,
          action: "PATIENT_REGISTER",
          entityType: "Patient",
          entityId: created.id,
          summary: `Registered patient ${created.fullName} (${created.patientId})`
        }
      });
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const role = (req.headers.get("x-user-role") || "RECEPTIONIST") as StaffRoleType;
    assertPermission(role, "PATIENT_WRITE");

    const body = await req.json();
    const { id, fullName, age, gender, mobileNumber, address, notes } = body;
    if (!id) return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        ...(fullName ? { fullName: fullName.trim() } : {}),
        ...(age !== undefined ? { age: Number(age) } : {}),
        ...(gender ? { gender } : {}),
        ...(mobileNumber ? { mobileNumber: mobileNumber.trim() } : {}),
        ...(address !== undefined ? { address: address ? address.trim() : null } : {}),
        ...(notes !== undefined ? { notes: notes ? notes.trim() : null } : {})
      }
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 400 });
  }
}
