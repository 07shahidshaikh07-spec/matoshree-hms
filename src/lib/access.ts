// ============================================================================
// PATIENT DATA PRIVACY — per-doctor record scoping
// A DOCTOR only ever sees patients/visits/appointments/consultations/bills that
// belong to them. RECEPTIONIST and ADMINISTRATOR run the front desk for both
// doctors and therefore see everything.
// ============================================================================

import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { AuthUser } from "./session";

export function isDoctorScoped(user: AuthUser): boolean {
  return user.role === "DOCTOR";
}

/** Doctor profile id used to filter records. Throws for a DOCTOR with no profile. */
export function scopedDoctorId(user: AuthUser): string | null {
  if (!isDoctorScoped(user)) return null;
  if (!user.doctorId) {
    const err = new Error("This doctor account has no doctor profile. Please contact the administrator.");
    (err as any).statusCode = 403;
    throw err;
  }
  return user.doctorId;
}

/** Prisma filter limiting patients to those the user may see (undefined = all). */
export function patientWhereFor(user: AuthUser): Prisma.PatientWhereInput | undefined {
  const doctorId = scopedDoctorId(user);
  if (!doctorId) return undefined;
  return {
    OR: [
      { registeredById: user.id },
      { opdVisits: { some: { doctorId } } },
      { appointments: { some: { doctorId } } },
      { consultations: { some: { doctorId } } },
      { bills: { some: { doctorId } } }
    ]
  };
}

export function visitWhereFor(user: AuthUser): Prisma.OPDVisitWhereInput {
  const doctorId = scopedDoctorId(user);
  return doctorId ? { doctorId } : {};
}

export function appointmentWhereFor(user: AuthUser): Prisma.AppointmentWhereInput {
  const doctorId = scopedDoctorId(user);
  return doctorId ? { doctorId } : {};
}

export function consultationWhereFor(user: AuthUser): Prisma.ConsultationWhereInput {
  const doctorId = scopedDoctorId(user);
  return doctorId ? { doctorId } : {};
}

export function billWhereFor(user: AuthUser): Prisma.BillWhereInput {
  const doctorId = scopedDoctorId(user);
  return doctorId ? { OR: [{ doctorId }, { opdVisit: { doctorId } }] } : {};
}

function forbidden(message: string): never {
  const err = new Error(message);
  (err as any).statusCode = 403;
  throw err;
}

/** Throws 403 unless the doctor is allowed to touch this patient. */
export async function assertPatientAccess(user: AuthUser, patientId: string): Promise<void> {
  const where = patientWhereFor(user);
  if (!where) return;
  const found = await prisma.patient.findFirst({ where: { AND: [{ id: patientId }, where] }, select: { id: true } });
  if (!found) forbidden("Access denied: this patient is not assigned to you.");
}

/** A doctor may only create records for themselves; front desk may pick any doctor. */
export function assertDoctorChoice(user: AuthUser, doctorId: string): void {
  const own = scopedDoctorId(user);
  if (own && own !== doctorId) forbidden("Access denied: you can only create records for your own patients.");
}

export async function assertVisitAccess(user: AuthUser, visitId: string): Promise<void> {
  const own = scopedDoctorId(user);
  if (!own) return;
  const v = await prisma.oPDVisit.findUnique({ where: { id: visitId }, select: { doctorId: true } });
  if (!v || v.doctorId !== own) forbidden("Access denied: this OPD visit belongs to another doctor.");
}

export async function assertAppointmentAccess(user: AuthUser, appointmentId: string): Promise<void> {
  const own = scopedDoctorId(user);
  if (!own) return;
  const a = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { doctorId: true } });
  if (!a || a.doctorId !== own) forbidden("Access denied: this appointment belongs to another doctor.");
}

export async function assertBillAccess(user: AuthUser, billId: string): Promise<void> {
  const where = billWhereFor(user);
  if (Object.keys(where).length === 0) return;
  const found = await prisma.bill.findFirst({ where: { AND: [{ id: billId }, where] }, select: { id: true } });
  if (!found) forbidden("Access denied: this bill belongs to another doctor's patient.");
}
