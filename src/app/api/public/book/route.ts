import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { generateNextPatientId } from "@/services/clinicCoreService";

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

    if (doctorId && dateParam) {
      const apptDate = new Date(dateParam);
      apptDate.setHours(0, 0, 0, 0);

      const existingAppts = await prisma.appointment.findMany({
        where: {
          doctorId,
          appointmentDate: apptDate,
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

    const apptDate = new Date(parsed.appointmentDate);
    apptDate.setHours(0, 0, 0, 0);

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
        appointmentDate: apptDate,
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

    // 4. Generate sequential Appointment Number
    const count = await prisma.appointment.count();
    const appointmentNumber = `APT-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const rawReason = parsed.reasonForVisit?.trim() || "General Consultation";
    const formattedReason = `[Online Booking] ${rawReason}`;

    const appointment = await prisma.appointment.create({
      data: {
        appointmentNumber,
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentDate: apptDate,
        slotTime: parsed.slotTime,
        reasonForVisit: formattedReason,
        status: "SCHEDULED"
      },
      include: {
        patient: true,
        doctor: true
      }
    });

    // 5. Fetch clinic details for confirmation slip
    const clinic = await prisma.clinicSetting.findUnique({ where: { id: "default" } });

    return NextResponse.json(
      {
        success: true,
        message: "Appointment booked successfully!",
        data: {
          appointmentId: appointment.id,
          appointmentNumber: appointment.appointmentNumber,
          appointmentDate: parsed.appointmentDate,
          slotTime: appointment.slotTime,
          reasonForVisit: rawReason,
          status: appointment.status,
          createdAt: appointment.createdAt,
          patient: {
            id: patient.id,
            patientId: patient.patientId,
            fullName: patient.fullName,
            mobileNumber: patient.mobileNumber,
            age: patient.age,
            gender: patient.gender
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
