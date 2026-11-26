import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import {
  generateNextAppointmentNumber,
  generateNextPatientId,
  nextAppointmentToken
} from "@/services/clinicCoreService";
import { istDateString, istDayRange, istDayStart, isValidDateString } from "@/lib/timezone";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Validation schema for public patient booking
const PublicBookingSchema = z.object({
  doctorId: z.string().min(1, "Doctor selection is required"),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  slotTime: z.string().min(1, "Time slot is required"),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  mobileNumber: z.string().trim().regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
  age: z.coerce.number().int().min(1, "Age must be at least 1").max(120, "Please enter a valid age"),
  gender: z.enum(["Male", "Female", "Other"]),
  reasonForVisit: z.string().trim().max(250).optional()
});

const ALL_TIME_SLOTS = [
  // Morning slots
  "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM",
  // Evening slots
  "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM",
  "07:00 PM", "07:30 PM", "08:00 PM"
];

// GET: Fetch clinic info, doctors list, and live slot availability
export async function GET(req: NextRequest) {
  try {
    const doctorId = req.nextUrl.searchParams.get("doctorId");
    const dateParam = req.nextUrl.searchParams.get("date");

    const [clinic, doctors] = await Promise.all([
      prisma.clinicSetting.findUnique({ where: { id: "default" } }),
      prisma.doctorProfile.findMany({
        where: { isAvailable: true },
        select: {
          id: true,
          doctorName: true,
          qualification: true,
          specialty: true,
          consultationFee: true,
          roomNumber: true
        }
      })
    ]);

    let bookedSlots: string[] = [];

    if (doctorId && dateParam && isValidDateString(dateParam)) {
      const { start, end } = istDayRange(dateParam);

      const existingAppts = await prisma.appointment.findMany({
        where: {
          doctorId,
          appointmentDate: { gte: start, lt: end },
          status: { notIn: ["CANCELLED", "NO_SHOW"] }
        },
        select: { slotTime: true }
      });

      bookedSlots = existingAppts.map((a) => a.slotTime);
    }

    const slotsAvailability = ALL_TIME_SLOTS.map((slot) => ({
      slot,
      isAvailable: !bookedSlots.includes(slot)
    }));

    return NextResponse.json({
      success: true,
      clinic: {
        clinicName: clinic?.clinicName || "Matoshree Clinic",
        location: clinic?.location || "Latur, Maharashtra, India",
        addressLine: clinic?.addressLine || "Station Road, Latur, Maharashtra 413512",
        contactPhone: clinic?.contactPhone || "+91 2382 250000",
        email: clinic?.email || "contact@matoshreeclinic.in"
      },
      doctors,
      bookedSlots,
      slotsAvailability,
      allSlots: ALL_TIME_SLOTS
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Public appointment booking by a patient
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = PublicBookingSchema.parse(body);

    if (!isValidDateString(parsed.appointmentDate)) {
      return NextResponse.json({ error: "Please choose a valid appointment date." }, { status: 400 });
    }
    if (parsed.appointmentDate < istDateString()) {
      return NextResponse.json({ error: "Appointment date cannot be in the past." }, { status: 400 });
    }
    const apptDate = istDayStart(parsed.appointmentDate);
    const { start: dayStart, end: dayEnd } = istDayRange(parsed.appointmentDate);

    // 1. Verify doctor exists
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: parsed.doctorId }
    });
    if (!doctor) {
      return NextResponse.json({ error: "Selected doctor was not found." }, { status: 404 });
    }

    // 2. Prevent double-booking for the same doctor and slot on that date
    const existingSlot = await prisma.appointment.findFirst({
      where: {
        doctorId: parsed.doctorId,
        appointmentDate: { gte: dayStart, lt: dayEnd },
        slotTime: parsed.slotTime,
        status: { notIn: ["CANCELLED", "NO_SHOW"] }
      }
    });

    if (existingSlot) {
      return NextResponse.json(
        {
          error: `Slot ${parsed.slotTime} for ${doctor.doctorName} on ${parsed.appointmentDate} is already booked. Please choose another time slot.`
        },
        { status: 409 }
      );
    }

    // 3. Smart Patient Resolution: Match existing patient by mobile or register new
    let patient = await prisma.patient.findFirst({
      where: { mobileNumber: parsed.mobileNumber }
    });

    if (!patient) {
      const nextId = await generateNextPatientId();
      patient = await prisma.patient.create({
        data: {
          patientId: nextId,
          fullName: parsed.fullName,
          age: parsed.age,
          gender: parsed.gender,
          mobileNumber: parsed.mobileNumber,
          notes: "Registered via Online Patient Booking Portal"
        }
      });
    }

    // 4. Appointment number + token, saved with the appointment
    const rawReason = parsed.reasonForVisit?.trim() || "General Consultation";
    const formattedReason = `[Online Booking] ${rawReason}`;

    let appointment: any = null;
    for (let attempt = 0; attempt < 3 && !appointment; attempt++) {
      try {
        const appointmentNumber = await generateNextAppointmentNumber();
        const tokenNumber = await nextAppointmentToken(doctor.id, parsed.appointmentDate);

        appointment = await prisma.$transaction(async (tx) => {
          // Release the unique slot key held by an earlier cancelled / no-show booking
          const stale = await tx.appointment.findMany({
            where: {
              doctorId: doctor.id,
              appointmentDate: { gte: dayStart, lt: dayEnd },
              slotTime: parsed.slotTime,
              status: { in: ["CANCELLED", "NO_SHOW"] }
            },
            select: { id: true, appointmentNumber: true, slotTime: true }
          });
          for (const st of stale) {
            await tx.appointment.update({
              where: { id: st.id },
              data: { slotTime: `${st.slotTime} (released ${st.appointmentNumber})` }
            });
          }

          return tx.appointment.create({
            data: {
              appointmentNumber,
              tokenNumber,
              patientId: patient!.id,
              doctorId: doctor.id,
              appointmentDate: apptDate,
              slotTime: parsed.slotTime,
              reasonForVisit: formattedReason,
              status: "SCHEDULED"
            },
            include: { patient: true, doctor: true }
          });
        });
      } catch (e: any) {
        const target = JSON.stringify(e?.meta?.target ?? "");
        if (e?.code === "P2002" && /appointmentNumber/i.test(target) && attempt < 2) continue;
        if (e?.code === "P2002") {
          return NextResponse.json(
            { error: `Slot ${parsed.slotTime} was just booked by someone else. Please choose another time slot.` },
            { status: 409 }
          );
        }
        throw e;
      }
    }

    // 5. Fetch clinic details for confirmation slip
    const clinic = await prisma.clinicSetting.findUnique({ where: { id: "default" } });

    return NextResponse.json(
      {
        success: true,
        message: "Appointment booked successfully!",
        data: {
          appointmentId: appointment.id,
          appointmentNumber: appointment.appointmentNumber,
          tokenNumber: appointment.tokenNumber,
          appointmentDate: parsed.appointmentDate,
          slotTime: appointment.slotTime,
          reasonForVisit: rawReason,
          status: appointment.status,
          createdAt: appointment.createdAt,
          patient: {
            id: patient.id,
            patientId: patient.patientId,
            // Echo what the visitor typed, never stored details of an existing patient
            // matched by mobile number (this endpoint is public).
            fullName: parsed.fullName,
            mobileNumber: parsed.mobileNumber,
            age: parsed.age,
            gender: parsed.gender
          },
          doctor: {
            id: doctor.id,
            doctorName: doctor.doctorName,
            qualification: doctor.qualification,
            specialty: doctor.specialty,
            roomNumber: doctor.roomNumber,
            consultationFee: doctor.consultationFee
          },
          clinic: {
            clinicName: clinic?.clinicName || "Matoshree Clinic",
            location: clinic?.location || "Latur, Maharashtra",
            addressLine: clinic?.addressLine || "Station Road, Latur, Maharashtra 413512",
            contactPhone: clinic?.contactPhone || "+91 2382 250000"
          }
        }
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.name === "ZodError") {
      const firstIssue = err.issues?.[0]?.message || "Invalid input data";
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Failed to book appointment" }, { status: 500 });
  }
}
