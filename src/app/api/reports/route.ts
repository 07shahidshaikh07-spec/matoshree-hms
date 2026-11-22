import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertPermission, StaffRoleType } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const role = (req.headers.get("x-user-role") || "RECEPTIONIST") as StaffRoleType;
    assertPermission(role, "REPORTS_VIEW");

    // Fetch visits, consultations, bills, payments
    const [visits, consultations, bills, payments, doctors] = await Promise.all([
      prisma.oPDVisit.findMany({
        include: { doctor: true, patient: true },
        orderBy: { visitDate: "desc" }
      }),
      prisma.consultation.findMany({
        include: { doctor: true, patient: true },
        orderBy: { consultationDate: "desc" }
      }),
      prisma.bill.findMany({
        include: { patient: true, doctor: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.payment.findMany({
        include: {
          bill: { include: { patient: true, doctor: true } }
        },
        orderBy: { receivedAt: "desc" }
      }),
      prisma.doctorProfile.findMany()
    ]);

    // 1. Daily patient visits (grouped by YYYY-MM-DD)
    const dailyVisitsMap: Record<string, number> = {};
    visits.forEach((v) => {
      const d = v.visitDate.toISOString().split("T")[0];
      dailyVisitsMap[d] = (dailyVisitsMap[d] || 0) + 1;
    });

    // 2. Monthly patient visits (grouped by YYYY-MM)
    const monthlyVisitsMap: Record<string, number> = {};
    visits.forEach((v) => {
      const m = v.visitDate.toISOString().substring(0, 7);
      monthlyVisitsMap[m] = (monthlyVisitsMap[m] || 0) + 1;
    });

    // 3. Doctor-wise consultations
    const doctorConsultationsMap: Record<string, { doctorName: string; count: number }> = {};
    doctors.forEach((d) => {
      doctorConsultationsMap[d.id] = { doctorName: d.doctorName, count: 0 };
    });
    consultations.forEach((c) => {
      if (doctorConsultationsMap[c.doctorId]) {
        doctorConsultationsMap[c.doctorId].count += 1;
      }
    });

    // 4. Daily collections
    const dailyCollectionsMap: Record<string, { total: number; cash: number; upi: number; other: number }> = {};
    payments.forEach((p) => {
      const d = p.receivedAt.toISOString().split("T")[0];
      if (!dailyCollectionsMap[d]) {
        dailyCollectionsMap[d] = { total: 0, cash: 0, upi: 0, other: 0 };
      }
      dailyCollectionsMap[d].total += p.amount;
      if (p.paymentMethod === "CASH") dailyCollectionsMap[d].cash += p.amount;
      else if (p.paymentMethod === "UPI") dailyCollectionsMap[d].upi += p.amount;
      else dailyCollectionsMap[d].other += p.amount;
    });

    // 5. Monthly collections
    const monthlyCollectionsMap: Record<string, number> = {};
    payments.forEach((p) => {
      const m = p.receivedAt.toISOString().substring(0, 7);
      monthlyCollectionsMap[m] = (monthlyCollectionsMap[m] || 0) + p.amount;
    });

    // 6. Pending payments list
    const pendingBills = bills
      .filter((b) => b.balanceDue > 0)
      .map((b) => ({
        billId: b.id,
        billNumber: b.billNumber,
        patientName: b.patient.fullName,
        patientId: b.patient.patientId,
        mobileNumber: b.patient.mobileNumber,
        doctorName: b.doctor?.doctorName || "—",
        totalAmount: b.totalAmount,
        paidAmount: b.paidAmount,
        balanceDue: b.balanceDue,
        billDate: b.createdAt
      }));

    return NextResponse.json({
      data: {
        dailyVisits: Object.entries(dailyVisitsMap).map(([date, count]) => ({ date, count })),
        monthlyVisits: Object.entries(monthlyVisitsMap).map(([month, count]) => ({ month, count })),
        doctorConsultations: Object.values(doctorConsultationsMap),
        dailyCollections: Object.entries(dailyCollectionsMap).map(([date, stats]) => ({ date, ...stats })),
        monthlyCollections: Object.entries(monthlyCollectionsMap).map(([month, total]) => ({ month, total })),
        pendingBills
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}
