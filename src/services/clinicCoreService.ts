// ============================================================================
// MATOSHREE CLINIC EMR — CLINIC CORE DOMAIN SERVICE
// Implements business rules for:
// - Unique Patient ID generation (e.g. MC-2026-0001)
// - Duplicate patient detection (by mobile or name)
// - OPD Queue tokens & Visit Numbers (e.g. OPD-2026-0001)
// - Clinical Consultation & Prescription signing
// - Idempotent Billing & Payment ledger
// - Real-time Dashboard & Reports aggregations
// ============================================================================

import { prisma } from "@/lib/db";
import { assertPermission, StaffRoleType } from "@/lib/rbac";
import type { AuthUser } from "@/lib/session";
import { istDayRange } from "@/lib/timezone";
import {
  appointmentWhereFor,
  billWhereFor,
  patientWhereFor,
  scopedDoctorId,
  visitWhereFor
} from "@/lib/access";

/**
 * Generates sequential unique Patient ID (e.g. MC-2026-0001).
 * Never uses mobile number as the primary identifier.
 */
export async function generateNextPatientId(year = new Date().getFullYear()): Promise<string> {
  const prefix = `MC-${year}-`;
  const latest = await prisma.patient.findFirst({
    where: { patientId: { startsWith: prefix } },
    orderBy: { patientId: "desc" }
  });
  if (!latest) return `${prefix}0001`;
  const lastSeq = parseInt(latest.patientId.replace(prefix, ""), 10) || 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
}

/**
 * Checks for potential duplicate patient records by mobile number or matching full name.
 */
export async function findPotentialDuplicatePatients(fullName: string, mobileNumber: string) {
  const cleanName = fullName.trim().toLowerCase();
  const cleanMobile = mobileNumber.trim();

  const matches = await prisma.patient.findMany({
    where: {
      OR: [
        { mobileNumber: cleanMobile },
        { fullName: { contains: cleanName } }
      ]
    },
    select: {
      id: true,
      patientId: true,
      fullName: true,
      age: true,
      gender: true,
      mobileNumber: true,
      address: true,
      createdAt: true
    },
    take: 10
  });

  return matches;
}

/**
 * Generates next sequential OPD Visit number (e.g. OPD-2026-0001).
 */
export async function generateNextOpdVisitNumber(year = new Date().getFullYear()): Promise<string> {
  const prefix = `OPD-${year}-`;
  const latest = await prisma.oPDVisit.findFirst({
    where: { visitNumber: { startsWith: prefix } },
    orderBy: { visitNumber: "desc" }
  });
  if (!latest) return `${prefix}0001`;
  const lastSeq = parseInt(latest.visitNumber.replace(prefix, ""), 10) || 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
}

/**
 * Generates next sequential Appointment number (e.g. APT-2026-0001).
 * Based on the highest existing number (not a row count) so it never repeats after deletions.
 */
export async function generateNextAppointmentNumber(year = new Date().getFullYear()): Promise<string> {
  const prefix = `APT-${year}-`;
  const latest = await prisma.appointment.findFirst({
    where: { appointmentNumber: { startsWith: prefix } },
    orderBy: { appointmentNumber: "desc" }
  });
  if (!latest) return `${prefix}0001`;
  const lastSeq = parseInt(latest.appointmentNumber.replace(prefix, ""), 10) || 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
}

/**
 * Next token for a doctor on an IST calendar day (1, 2, 3 ...), counting every appointment
 * that day (including cancelled ones) so a token is never handed out twice.
 */
export async function nextAppointmentToken(doctorId: string, dateStr: string): Promise<number> {
  const { start, end } = istDayRange(dateStr);
  const agg = await prisma.appointment.aggregate({
    where: { doctorId, appointmentDate: { gte: start, lt: end } },
    _max: { tokenNumber: true },
    _count: { _all: true }
  });
  return Math.max(agg._max.tokenNumber ?? 0, agg._count._all) + 1;
}

/** Next OPD queue token for a doctor today (highest existing + 1). */
export async function nextOpdToken(doctorId: string, tx: Pick<typeof prisma, "oPDVisit"> = prisma): Promise<number> {
  const { start, end } = istDayRange();
  const agg = await tx.oPDVisit.aggregate({
    where: { doctorId, visitDate: { gte: start, lt: end } },
    _max: { tokenNumber: true }
  });
  return (agg._max.tokenNumber ?? 0) + 1;
}

/**
 * Generates next sequential Prescription number (e.g. RX-2026-0001).
 */
export async function generateNextPrescriptionNumber(year = new Date().getFullYear()): Promise<string> {
  const prefix = `RX-${year}-`;
  const latest = await prisma.prescription.findFirst({
    where: { prescriptionNumber: { startsWith: prefix } },
    orderBy: { prescriptionNumber: "desc" }
  });
  if (!latest) return `${prefix}0001`;
  const lastSeq = parseInt(latest.prescriptionNumber.replace(prefix, ""), 10) || 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
}

/**
 * Generates next sequential Bill number (e.g. BILL-2026-0001).
 */
export async function generateNextBillNumber(year = new Date().getFullYear()): Promise<string> {
  const prefix = `BILL-${year}-`;
  const latest = await prisma.bill.findFirst({
    where: { billNumber: { startsWith: prefix } },
    orderBy: { billNumber: "desc" }
  });
  if (!latest) return `${prefix}0001`;
  const lastSeq = parseInt(latest.billNumber.replace(prefix, ""), 10) || 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
}

/**
 * Generates next sequential Receipt number (e.g. RCPT-2026-0001).
 */
export async function generateNextReceiptNumber(year = new Date().getFullYear()): Promise<string> {
  const prefix = `RCPT-${year}-`;
  const latest = await prisma.payment.findFirst({
    where: { receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: "desc" }
  });
  if (!latest) return `${prefix}0001`;
  const lastSeq = parseInt(latest.receiptNumber.replace(prefix, ""), 10) || 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
}

/**
 * Records a payment against a bill with idempotency protection and recalculates balances.
 * Total = Consultation Charges + Additional Charges - Discount
 * Balance = Total - Amount Paid
 */
export async function recordBillPayment(params: {
  actorUserId?: string;
  actorRole: StaffRoleType;
  billId: string;
  amount: number;
  paymentMethod: "CASH" | "UPI" | "OTHER";
  transactionRef?: string;
  idempotencyKey: string;
  remarks?: string;
}) {
  assertPermission(params.actorRole, "BILLING_PAYMENT_RECORD");

  return prisma.$transaction(async (tx) => {
    // Check idempotency duplicate
    const duplicate = await tx.payment.findUnique({
      where: { idempotencyKey: params.idempotencyKey }
    });
    if (duplicate) {
      throw new Error(
        `Duplicate payment prevented: Transaction with key '${params.idempotencyKey}' was already recorded as Receipt ${duplicate.receiptNumber}.`
      );
    }

    const bill = await tx.bill.findUnique({
      where: { id: params.billId },
      include: { patient: true }
    });
    if (!bill) throw new Error("Bill not found.");

    const currentBalance = bill.balanceDue;
    if (params.amount > currentBalance) {
      throw new Error(
        `Payment amount (₹${params.amount}) exceeds outstanding balance due (₹${currentBalance}).`
      );
    }

    const receiptNumber = await generateNextReceiptNumber();

    const payment = await tx.payment.create({
      data: {
        receiptNumber,
        billId: params.billId,
        amount: params.amount,
        paymentMethod: params.paymentMethod,
        transactionRef: params.transactionRef,
        idempotencyKey: params.idempotencyKey,
        receivedById: params.actorUserId ?? null,
        remarks: params.remarks
      }
    });

    const newPaid = bill.paidAmount + params.amount;
    const newBalance = Math.max(0, bill.totalAmount - newPaid);
    const newStatus = newBalance <= 0 ? "PAID" : "PARTIALLY_PAID";

    await tx.bill.update({
      where: { id: bill.id },
      data: {
        paidAmount: newPaid,
        balanceDue: newBalance,
        paymentStatus: newStatus
      }
    });

    if (params.actorUserId) {
      await tx.auditLog.create({
        data: {
          actorUserId: params.actorUserId,
          actorRole: params.actorRole,
          action: "PAYMENT_RECORD",
          entityType: "Payment",
          entityId: payment.id,
          summary: `Recorded payment ${receiptNumber} of ₹${params.amount} via ${params.paymentMethod} for Bill ${bill.billNumber}`
        }
      });
    }

    return payment;
  });
}

/**
 * Converts a scheduled appointment into an OPD visit and updates appointment status.
 */
export async function convertAppointmentToOpdVisit(appointmentId: string, user: AuthUser) {
  assertPermission(user.role, "OPD_VISIT_CREATE");
  const ownDoctorId = scopedDoctorId(user);

  return prisma.$transaction(async (tx) => {
    const appt = await tx.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true, patient: true, opdVisit: { select: { visitNumber: true } } }
    });
    if (!appt || (ownDoctorId && appt.doctorId !== ownDoctorId)) {
      throw Object.assign(new Error("Appointment not found."), { statusCode: 404 });
    }

    if (appt.opdVisit) {
      throw new Error(`This appointment was already converted to OPD visit ${appt.opdVisit.visitNumber}.`);
    }
    if (appt.status === "COMPLETED") {
      throw new Error("This appointment has already been completed.");
    }
    if (appt.status === "CANCELLED" || appt.status === "NO_SHOW") {
      throw new Error("Cannot convert a cancelled / no-show appointment to an OPD visit.");
    }

    const nextToken = await nextOpdToken(appt.doctorId, tx);

    const visitNumber = await generateNextOpdVisitNumber();
    const nowTimeStr = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(new Date());

    const visit = await tx.oPDVisit.create({
      data: {
        visitNumber,
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        visitDate: new Date(),
        visitTime: nowTimeStr,
        tokenNumber: nextToken,
        reasonForVisit: appt.reasonForVisit ?? "Appointment Consultation",
        status: "WAITING",
        appointmentId: appt.id
      }
    });

    await tx.appointment.update({
      where: { id: appt.id },
      data: { status: "COMPLETED" }
    });

    return visit;
  });
}

/**
 * Aggregated dashboard figures for the signed-in user. Doctors only ever receive their own
 * patients, visits, appointments and bills; front desk receives the whole clinic.
 * "Today" is always the IST calendar day.
 */
export async function getDashboardData(user: AuthUser) {
  const { start: startOfToday, end: endOfToday } = istDayRange();
  const visitScope = visitWhereFor(user);
  const apptScope = appointmentWhereFor(user);
  const billScope = billWhereFor(user);
  const patientScope = patientWhereFor(user);

  const [todayVisits, todayAppointments, upcomingAppointments, todayPayments, pendingBills, newPatientsToday] =
    await Promise.all([
      prisma.oPDVisit.findMany({
        where: { ...visitScope, visitDate: { gte: startOfToday, lt: endOfToday } },
        include: {
          patient: true,
          doctor: true,
          consultation: { select: { id: true, status: true, signedAt: true } },
          bill: { select: { id: true, billNumber: true, totalAmount: true, paidAmount: true, balanceDue: true, paymentStatus: true } }
        },
        orderBy: { tokenNumber: "asc" }
      }),
      prisma.appointment.findMany({
        where: { ...apptScope, appointmentDate: { gte: startOfToday, lt: endOfToday } },
        include: { patient: true, doctor: true, opdVisit: { select: { id: true, visitNumber: true, status: true } } },
        orderBy: [{ tokenNumber: "asc" }, { createdAt: "asc" }]
      }),
      prisma.appointment.findMany({
        where: {
          ...apptScope,
          appointmentDate: { gte: startOfToday },
          status: { in: ["SCHEDULED", "CONFIRMED"] }
        },
        include: { patient: true, doctor: true },
        orderBy: [{ appointmentDate: "asc" }, { slotTime: "asc" }],
        take: 10
      }),
      prisma.payment.findMany({
        where: { receivedAt: { gte: startOfToday, lt: endOfToday }, bill: billScope }
      }),
      prisma.bill.findMany({
        where: { ...billScope, balanceDue: { gt: 0 } },
        select: { balanceDue: true }
      }),
      prisma.patient.findMany({
        where: { AND: [{ createdAt: { gte: startOfToday, lt: endOfToday } }, ...(patientScope ? [patientScope] : [])] },
        select: { id: true, patientId: true, fullName: true, age: true, gender: true, mobileNumber: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20
      })
    ]);

  const totalCollectedToday = todayPayments.reduce((acc, p) => acc + p.amount, 0);
  const cashCollection = todayPayments.filter((p) => p.paymentMethod === "CASH").reduce((acc, p) => acc + p.amount, 0);
  const upiCollection = todayPayments.filter((p) => p.paymentMethod === "UPI").reduce((acc, p) => acc + p.amount, 0);
  const otherCollection = todayPayments.filter((p) => p.paymentMethod === "OTHER").reduce((acc, p) => acc + p.amount, 0);
  const totalPendingAmount = pendingBills.reduce((acc, b) => acc + b.balanceDue, 0);

  // Unique patients today: seen in OPD, booked for today, or newly registered today
  const patientIdsToday = new Set<string>();
  todayVisits.forEach((v) => patientIdsToday.add(v.patientId));
  todayAppointments.forEach((a) => patientIdsToday.add(a.patientId));
  newPatientsToday.forEach((p) => patientIdsToday.add(p.id));

  return {
    summaryCards: {
      todayPatientsCount: patientIdsToday.size,
      todayAppointmentsCount: todayAppointments.length,
      newPatientsCount: newPatientsToday.length,
      pendingPaymentsAmount: totalPendingAmount,
      todayCollectionTotal: totalCollectedToday,
      cashCollection,
      upiCollection,
      otherCollection
    },
    todayVisits,
    todayAppointments,
    upcomingAppointments,
    newPatientsToday
  };
}
