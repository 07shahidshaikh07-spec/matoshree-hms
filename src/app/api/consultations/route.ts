import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ConsultationSaveSchema } from "@/lib/validation";
import { assertPermission } from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/apiHelpers";
import { assertPatientAccess, consultationWhereFor, scopedDoctorId } from "@/lib/access";
import { generateNextPrescriptionNumber } from "@/services/clinicCoreService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user.role, "CONSULTATION_READ");
    const scope = consultationWhereFor(user);

    const opdVisitId = req.nextUrl.searchParams.get("opdVisitId");
    const patientId = req.nextUrl.searchParams.get("patientId");

    if (opdVisitId) {
      const consult = await prisma.consultation.findFirst({
        where: { opdVisitId, ...scope },
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
      await assertPatientAccess(user, patientId);
      const history = await prisma.consultation.findMany({
        where: { patientId, ...scope },
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
      where: scope,
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
    return apiError(err, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const role = user.role;
    const actorUserId = user.id;

    // Only clinicians (DOCTOR / ADMINISTRATOR) can finalize clinical notes and sign prescriptions
    assertPermission(role, "CONSULTATION_WRITE");
    assertPermission(role, "CONSULTATION_FINALIZE");
    assertPermission(role, "PRESCRIPTION_CREATE");
    assertPermission(role, "PRESCRIPTION_FINALIZE");

    const input = ConsultationSaveSchema.parse(body);

    // The visit is the source of truth for patient + doctor; never trust ids sent by the browser.
    const visit = await prisma.oPDVisit.findUnique({
      where: { id: input.opdVisitId },
      select: { id: true, patientId: true, doctorId: true }
    });
    if (!visit) {
      return NextResponse.json({ error: "OPD visit not found." }, { status: 404 });
    }
    const ownDoctorId = scopedDoctorId(user);
    if (ownDoctorId && visit.doctorId !== ownDoctorId) {
      return NextResponse.json({ error: "Access denied: this patient is assigned to another doctor." }, { status: 403 });
    }
    const parsed = { ...input, patientId: visit.patientId, doctorId: visit.doctorId };

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
    return apiError(err);
  }
}
