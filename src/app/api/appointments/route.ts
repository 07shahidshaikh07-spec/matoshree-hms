import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AppointmentBookingSchema } from "@/lib/validation";
import { assertPermission } from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/apiHelpers";
import {
  assertAppointmentAccess,
  assertDoctorChoice,
  assertPatientAccess,
  scopedDoctorId
} from "@/lib/access";
import { istDayRange, istDayStart, isValidDateString } from "@/lib/timezone";
import {
  convertAppointmentToOpdVisit,
  generateNextAppointmentNumber,
  nextAppointmentToken
} from "@/services/clinicCoreService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user.role, "PATIENT_READ");

    const requestedDoctorId = req.nextUrl.searchParams.get("doctorId");
    const status = req.nextUrl.searchParams.get("status");
    const dateParam = req.nextUrl.searchParams.get("date");

    const doctorId = scopedDoctorId(user) ?? requestedDoctorId;

    // Default window: last 30 days and everything upcoming, so the list stays fast.
    let dateFilter: { gte: Date; lt?: Date };
    if (dateParam && isValidDateString(dateParam)) {
      const { start, end } = istDayRange(dateParam);
      dateFilter = { gte: start, lt: end };
    } else {
      dateFilter = { gte: new Date(istDayRange().start.getTime() - 30 * 24 * 60 * 60 * 1000) };
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: dateFilter,
        ...(doctorId ? { doctorId } : {}),
        ...(status ? { status } : {})
      },
      include: {
        patient: true,
        doctor: true,
        opdVisit: { select: { id: true, visitNumber: true, status: true, tokenNumber: true } }
      },
      orderBy: [{ appointmentDate: "asc" }, { slotTime: "asc" }],
      take: 500
    });

    return NextResponse.json({ data: appointments });
  } catch (err: any) {
    return apiError(err, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user.role, "APPOINTMENT_MANAGE");

    const body = await req.json();

    // Action: Convert appointment to OPD Visit
    if (body.action === "CONVERT_TO_OPD") {
      if (!body.appointmentId) {
        return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 });
      }
      const visit = await convertAppointmentToOpdVisit(body.appointmentId, user);
      return NextResponse.json({ data: visit }, { status: 201 });
    }

    // Standard Appointment Booking
    const parsed = AppointmentBookingSchema.parse(body);
    if (!isValidDateString(parsed.appointmentDate)) {
      return NextResponse.json({ error: "Please choose a valid appointment date." }, { status: 400 });
    }
    assertDoctorChoice(user, parsed.doctorId);
    await assertPatientAccess(user, parsed.patientId);

    const apptDate = istDayStart(parsed.appointmentDate);
    const { start, end } = istDayRange(parsed.appointmentDate);

    // Prevent accidental duplicate bookings for the same doctor and slot time on that day
    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId: parsed.doctorId,
        appointmentDate: { gte: start, lt: end },
        slotTime: parsed.slotTime,
        status: { notIn: ["CANCELLED", "NO_SHOW"] }
      }
    });

    if (existing) {
      return NextResponse.json(
        {
          error: `Doctor is already booked for ${parsed.slotTime} on ${parsed.appointmentDate}. Please choose another time slot.`
        },
        { status: 409 }
      );
    }

    let appointment: any = null;
    for (let attempt = 0; attempt < 3 && !appointment; attempt++) {
      try {
        const appointmentNumber = await generateNextAppointmentNumber();
        const tokenNumber = await nextAppointmentToken(parsed.doctorId, parsed.appointmentDate);

        appointment = await prisma.$transaction(async (tx) => {
          // A cancelled / no-show booking still holds the unique (doctor, date, slot) key.
          // Release it so the slot can be rebooked.
          const stale = await tx.appointment.findMany({
            where: {
              doctorId: parsed.doctorId,
              appointmentDate: { gte: start, lt: end },
              slotTime: parsed.slotTime,
              status: { in: ["CANCELLED", "NO_SHOW"] }
            },
            select: { id: true, appointmentNumber: true, slotTime: true }
          });
          for (const s of stale) {
            await tx.appointment.update({
              where: { id: s.id },
              data: { slotTime: `${s.slotTime} (released ${s.appointmentNumber})` }
            });
          }

          return tx.appointment.create({
            data: {
              appointmentNumber,
              tokenNumber,
              patientId: parsed.patientId,
              doctorId: parsed.doctorId,
              appointmentDate: apptDate,
              slotTime: parsed.slotTime,
              reasonForVisit: parsed.reasonForVisit ?? "Consultation",
              status: "SCHEDULED"
            },
            include: { patient: true, doctor: true }
          });
        });
      } catch (e: any) {
        // Unique clash on appointment number (two desks at once) -> retry; slot clash -> report.
        const target = JSON.stringify(e?.meta?.target ?? "");
        if (e?.code === "P2002" && /appointmentNumber/i.test(target) && attempt < 2) continue;
        if (e?.code === "P2002") {
          return NextResponse.json(
            { error: `That slot (${parsed.slotTime}) was just booked by someone else. Please choose another time.` },
            { status: 409 }
          );
        }
        throw e;
      }
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.role,
        action: "APPOINTMENT_BOOK",
        entityType: "Appointment",
        entityId: appointment.id,
        summary: `Booked appointment ${appointment.appointmentNumber} (Token #${appointment.tokenNumber}) for ${appointment.patient.fullName} on ${parsed.appointmentDate} at ${parsed.slotTime}`
      }
    });

    return NextResponse.json({ data: appointment }, { status: 201 });
  } catch (err: any) {
    return apiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    assertPermission(user.role, "APPOINTMENT_MANAGE");

    const body = await req.json();
    const { id, status, appointmentDate, slotTime } = body;
    if (!id) return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 });
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid appointment status" }, { status: 400 });
    }
    if (appointmentDate && !isValidDateString(appointmentDate)) {
      return NextResponse.json({ error: "Please choose a valid appointment date." }, { status: 400 });
    }
    await assertAppointmentAccess(user, id);

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(appointmentDate ? { appointmentDate: istDayStart(appointmentDate) } : {}),
        ...(slotTime ? { slotTime } : {})
      },
      include: { patient: true, doctor: true }
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    return apiError(err);
  }
}
