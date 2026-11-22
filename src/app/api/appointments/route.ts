import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AppointmentBookingSchema } from "@/lib/validation";
import { assertPermission, StaffRoleType } from "@/lib/rbac";
import { convertAppointmentToOpdVisit } from "@/services/clinicCoreService";

export async function GET(req: NextRequest) {
  try {
    const role = (req.headers.get("x-user-role") || "RECEPTIONIST") as StaffRoleType;
    assertPermission(role, "PATIENT_READ");

    const doctorId = req.nextUrl.searchParams.get("doctorId");
    const status = req.nextUrl.searchParams.get("status");
    const dateParam = req.nextUrl.searchParams.get("date");

    const appointments = await prisma.appointment.findMany({
      where: {
        ...(doctorId ? { doctorId } : {}),
        ...(status ? { status } : {}),
        ...(dateParam
          ? {
              appointmentDate: {
                gte: new Date(new Date(dateParam).setHours(0, 0, 0, 0)),
                lte: new Date(new Date(dateParam).setHours(23, 59, 59, 999))
              }
            }
          : {})
      },
      include: {
        patient: true,
        doctor: true,
        opdVisit: { select: { id: true, visitNumber: true, status: true } }
      },
      orderBy: [{ appointmentDate: "asc" }, { slotTime: "asc" }]
    });

    return NextResponse.json({ data: appointments });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = (req.headers.get("x-user-role") || "RECEPTIONIST") as StaffRoleType;
    const actorUserId = req.headers.get("x-user-id") || undefined;
    assertPermission(role, "APPOINTMENT_MANAGE");

    const body = await req.json();

    // Action: Convert appointment to OPD Visit
    if (body.action === "CONVERT_TO_OPD") {
      if (!body.appointmentId) {
        return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 });
      }
      const visit = await convertAppointmentToOpdVisit(body.appointmentId, actorUserId, role);
      return NextResponse.json({ data: visit }, { status: 201 });
    }

    // Standard Appointment Booking
    const parsed = AppointmentBookingSchema.parse(body);
    const apptDate = new Date(parsed.appointmentDate);
    apptDate.setHours(0, 0, 0, 0);

    // Prevent accidental duplicate bookings for the same doctor and slot time on that day
    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId: parsed.doctorId,
        appointmentDate: apptDate,
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

    const count = await prisma.appointment.count();
    const appointmentNumber = `APT-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const appointment = await prisma.appointment.create({
      data: {
        appointmentNumber,
        patientId: parsed.patientId,
        doctorId: parsed.doctorId,
        appointmentDate: apptDate,
        slotTime: parsed.slotTime,
        reasonForVisit: parsed.reasonForVisit ?? "Consultation",
        status: "SCHEDULED"
      },
      include: { patient: true, doctor: true }
    });

    if (actorUserId) {
      await prisma.auditLog.create({
        data: {
          actorUserId,
          actorRole: role,
          action: "APPOINTMENT_BOOK",
          entityType: "Appointment",
          entityId: appointment.id,
          summary: `Booked appointment ${appointmentNumber} for ${appointment.patient.fullName} on ${parsed.appointmentDate} at ${parsed.slotTime}`
        }
      });
    }

    return NextResponse.json({ data: appointment }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const role = (req.headers.get("x-user-role") || "RECEPTIONIST") as StaffRoleType;
    assertPermission(role, "APPOINTMENT_MANAGE");

    const body = await req.json();
    const { id, status, appointmentDate, slotTime } = body;
    if (!id) return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 });

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(appointmentDate ? { appointmentDate: new Date(appointmentDate) } : {}),
        ...(slotTime ? { slotTime } : {})
      },
      include: { patient: true, doctor: true }
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 400 });
  }
}
