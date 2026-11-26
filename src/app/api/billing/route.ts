import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BillCreateSchema, PaymentRecordSchema } from "@/lib/validation";
import { assertPermission } from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/apiHelpers";
import {
  assertBillAccess,
  assertDoctorChoice,
  assertPatientAccess,
  assertVisitAccess,
  billWhereFor,
  scopedDoctorId
} from "@/lib/access";
import { generateNextBillNumber, generateNextReceiptNumber, recordBillPayment } from "@/services/clinicCoreService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user.role, "PATIENT_READ");
    const billScope = billWhereFor(user);

    const patientId = req.nextUrl.searchParams.get("patientId");
    const status = req.nextUrl.searchParams.get("status");

    const bills = await prisma.bill.findMany({
      where: {
        AND: [
          billScope,
          ...(patientId ? [{ patientId }] : []),
          ...(status ? [{ paymentStatus: status }] : [])
        ]
      },
      include: {
        patient: true,
        doctor: true,
        opdVisit: { select: { visitNumber: true, visitDate: true } },
        payments: { orderBy: { receivedAt: "desc" } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    const recentPayments = await prisma.payment.findMany({
      where: { bill: billScope },
      include: {
        bill: {
          include: {
            patient: true,
            doctor: true
          }
        }
      },
      orderBy: { receivedAt: "desc" },
      take: 50
    });

    const summary = bills.reduce(
      (acc, b) => {
        acc.totalBilled += b.totalAmount;
        acc.totalCollected += b.paidAmount;
        acc.totalPending += b.balanceDue;
        return acc;
      },
      { totalBilled: 0, totalCollected: 0, totalPending: 0 }
    );

    return NextResponse.json({
      data: {
        bills,
        recentPayments,
        summary
      }
    });
  } catch (err: any) {
    return apiError(err, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const role = user.role;
    const actorUserId = user.id;
    const body = await req.json();

    // 1. Record an additional payment against an existing bill
    if (body.action === "RECORD_PAYMENT") {
      const parsed = PaymentRecordSchema.parse(body);
      await assertBillAccess(user, parsed.billId);
      const payment = await recordBillPayment({
        actorUserId,
        actorRole: role,
        ...parsed,
        transactionRef: parsed.transactionRef ?? undefined,
        remarks: parsed.remarks ?? undefined
      });
      return NextResponse.json({ data: payment }, { status: 201 });
    }

    // 2. Create a new Bill
    assertPermission(role, "BILLING_CREATE");
    const parsed = BillCreateSchema.parse(body);

    // Doctors can only bill their own patients, always under their own name.
    const ownDoctorId = scopedDoctorId(user);
    const billDoctorId = parsed.doctorId || ownDoctorId || null;
    if (billDoctorId) assertDoctorChoice(user, billDoctorId);
    await assertPatientAccess(user, parsed.patientId);
    if (parsed.opdVisitId) await assertVisitAccess(user, parsed.opdVisitId);

    const subtotal = parsed.consultationCharges + parsed.additionalCharges;
    const totalAmount = Math.max(0, subtotal - parsed.discountAmount);
    const amountPaid = Math.min(totalAmount, parsed.amountPaid || 0);
    const balanceDue = Math.max(0, totalAmount - amountPaid);
    const paymentStatus = balanceDue === 0 ? "PAID" : amountPaid > 0 ? "PARTIALLY_PAID" : "PENDING";

    const billNumber = await generateNextBillNumber();

    const bill = await prisma.$transaction(async (tx) => {
      const createdBill = await tx.bill.create({
        data: {
          billNumber,
          patientId: parsed.patientId,
          opdVisitId: parsed.opdVisitId ?? null,
          doctorId: billDoctorId,
          consultationCharges: parsed.consultationCharges,
          additionalCharges: parsed.additionalCharges,
          additionalChargesNotes: parsed.additionalChargesNotes ?? null,
          discountAmount: parsed.discountAmount,
          discountReason: parsed.discountReason ?? null,
          totalAmount,
          paidAmount: amountPaid,
          balanceDue,
          paymentStatus,
          notes: parsed.notes ?? null
        },
        include: { patient: true, doctor: true }
      });

      // If initial payment was made during bill creation, record the payment immediately
      if (amountPaid > 0) {
        const receiptNumber = await generateNextReceiptNumber();
        const idempotencyKey = `INITIAL-${createdBill.id}-${Date.now()}`;

        await tx.payment.create({
          data: {
            receiptNumber,
            billId: createdBill.id,
            amount: amountPaid,
            paymentMethod: parsed.paymentMethod || "CASH",
            transactionRef: parsed.transactionRef ?? null,
            idempotencyKey,
            receivedById: actorUserId ?? null,
            remarks: "Initial payment at bill creation"
          }
        });
      }

      if (actorUserId) {
        await tx.auditLog.create({
          data: {
            actorUserId,
            actorRole: role,
            action: "BILL_CREATE",
            entityType: "Bill",
            entityId: createdBill.id,
            summary: `Created Bill ${billNumber} for ₹${totalAmount} (Paid: ₹${amountPaid}, Bal: ₹${balanceDue})`
          }
        });
      }

      return createdBill;
    });

    const fullBill = await prisma.bill.findUnique({
      where: { id: bill.id },
      include: { patient: true, doctor: true, payments: true }
    });

    return NextResponse.json({ data: fullBill }, { status: 201 });
  } catch (err: any) {
    return apiError(err);
  }
}
