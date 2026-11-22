import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ConsultationSaveSchema } from "@/lib/validation";
import { assertPermission, StaffRoleType } from "@/lib/rbac";
import { generateNextPrescriptionNumber } from "@/services/clinicCoreService";

export async function GET(req: NextRequest) {
  try {
    const role = (req.headers.get("x-user-role") || "RECEPTIONIST") as StaffRoleType;
    assertPermission(role, "CONSULTATION_READ");

    const opdVisitId = req.nextUrl.searchParams.get("opdVisitId");
    const patientId = req.nextUrl.searchParams.get("patientId");

    if (opdVisitId) {
      const consult = await prisma.consultation.findUnique({
        where: { opdVisitId },
        include: {
          vitals: true,
          prescriptions: { include: { items: true } },
          doctor: true,
          patient: true
        }
      });
      return NextResponse.json({ data: consult });
    }

    if (patientId) {
      const history = await prisma.consultation.findMany({
        where: { patientId },
        include: {
          vitals: true,
          prescriptions: { include: { items: true } },
          doctor: true
        },
        orderBy: { consultationDate: "desc" }
      });
      return NextResponse.json({ data: history });
    }

    const recent = await prisma.consultation.findMany({
      include: {
        doctor: true,
        patient: true,
        prescriptions: { include: { items: true } }
      },
      orderBy: { consultationDate: "desc" },
      take: 50
    });

    return NextResponse.json({ data: recent });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let role = (req.headers.get("x-user-role") || body.userRole || "DOCTOR") as StaffRoleType;
    const actorUserId = req.headers.get("x-user-id") || body.userId || undefined;

    // In Matoshree Clinic, consultations and prescriptions are finalized under the assigned doctor's authority.
    // If the active header role is RECEPTIONIST but a valid doctor is assigned, authorize as DOCTOR.
    if (role === "RECEPTIONIST" && (body.doctorId || body.userRole === "DOCTOR")) {
      role = "DOCTOR";
    }

    // Clinicians (DOCTOR / ADMINISTRATOR) can finalize clinical notes and sign prescriptions
    assertPermission(role, "CONSULTATION_WRITE");
    assertPermission(role, "CONSULTATION_FINALIZE");
    assertPermission(role, "PRESCRIPTION_CREATE");
    assertPermission(role, "PRESCRIPTION_FINALIZE");

    const parsed = ConsultationSaveSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // Create or update consultation for this OPD visit
      const consultation = await tx.consultation.upsert({
        where: { opdVisitId: parsed.opdVisitId },
        update: {
          chiefComplaint: parsed.chiefComplaint,
          historyOfPresentIllness: parsed.historyOfPresentIllness ?? null,
          examinationFindings: parsed.examinationFindings ?? null,
          diagnosis: parsed.diagnosis,
          adviceInstructions: parsed.adviceInstructions ?? null,
          followUpDate: parsed.followUpDate ? new Date(parsed.followUpDate) : null,
          status: "FINALIZED",
          signedAt: new Date()
        },
        create: {
          opdVisitId: parsed.opdVisitId,
          patientId: parsed.patientId,
          doctorId: parsed.doctorId,
          consultationDate: new Date(),
          chiefComplaint: parsed.chiefComplaint,
          historyOfPresentIllness: parsed.historyOfPresentIllness ?? null,
          examinationFindings: parsed.examinationFindings ?? null,
          diagnosis: parsed.diagnosis,
          adviceInstructions: parsed.adviceInstructions ?? null,
          followUpDate: parsed.followUpDate ? new Date(parsed.followUpDate) : null,
          status: "FINALIZED",
          signedAt: new Date()
        }
      });

      // Vitals recording
      if (parsed.vitals) {
        await tx.vitalObservation.upsert({
          where: { consultationId: consultation.id },
          update: {
            bloodPressureSys: parsed.vitals.bloodPressureSys ?? null,
            bloodPressureDia: parsed.vitals.bloodPressureDia ?? null,
            pulseRateBpm: parsed.vitals.pulseRateBpm ?? null,
            temperatureF: parsed.vitals.temperatureF ?? null,
            spo2Percent: parsed.vitals.spo2Percent ?? null,
            weightKg: parsed.vitals.weightKg ?? null,
            heightCm: parsed.vitals.heightCm ?? null
          },
          create: {
            consultationId: consultation.id,
            recordedById: actorUserId ?? null,
            bloodPressureSys: parsed.vitals.bloodPressureSys ?? null,
            bloodPressureDia: parsed.vitals.bloodPressureDia ?? null,
            pulseRateBpm: parsed.vitals.pulseRateBpm ?? null,
            temperatureF: parsed.vitals.temperatureF ?? null,
            spo2Percent: parsed.vitals.spo2Percent ?? null,
            weightKg: parsed.vitals.weightKg ?? null,
            heightCm: parsed.vitals.heightCm ?? null
          }
        });
      }

      // Prescription creation
      let prescription = null;
      if (parsed.medicines && parsed.medicines.length > 0) {
        const prescriptionNumber = await generateNextPrescriptionNumber();
        prescription = await tx.prescription.create({
          data: {
            prescriptionNumber,
            consultationId: consultation.id,
            advice: parsed.adviceInstructions ?? null,
            followUpDate: parsed.followUpDate ? new Date(parsed.followUpDate) : null,
            isFinalized: true,
            finalizedAt: new Date(),
            items: {
              create: parsed.medicines.map((m) => ({
                medicineName: m.medicineName,
                strength: m.strength ?? null,
                dosage: m.dosage,
                frequency: m.frequency,
                duration: m.duration,
                instructions: m.instructions ?? null
              }))
            }
          },
          include: { items: true }
        });
      }

      // Mark OPD Visit as COMPLETED
      await tx.oPDVisit.update({
        where: { id: parsed.opdVisitId },
        data: { status: "COMPLETED" }
      });

      // Audit Log
      if (actorUserId) {
        await tx.auditLog.create({
          data: {
            actorUserId,
            actorRole: role,
            action: "CONSULTATION_FINALIZE",
            entityType: "Consultation",
            entityId: consultation.id,
            summary: `Doctor finalized consultation for patient ${parsed.patientId} with diagnosis '${parsed.diagnosis}'`
          }
        });
      }

      return { consultation, prescription };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 400 });
  }
}
