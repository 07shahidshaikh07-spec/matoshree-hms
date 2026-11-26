// ============================================================================
// MATOSHREE CLINIC EMR — INPUT VALIDATION SCHEMAS (ZOD)
// Location: Latur, Maharashtra
// Enforces clean data entry with zero unnecessary fields for GP practice.
// ============================================================================

import { z } from "zod";
import { VITAL_LIMITS, VitalKey, vitalRangeMessage } from "./vitals";

/** Optional vital sign: blank/missing -> null, otherwise must be a number inside the clinical range. */
function vitalField(key: VitalKey) {
  const limit = VITAL_LIMITS[key] as { min: number; max: number; int: boolean };
  const msg = vitalRangeMessage(key);
  let num = z.number({ invalid_type_error: `${VITAL_LIMITS[key].label} must be a number` });
  if (limit.int) num = num.int(`${VITAL_LIMITS[key].label} must be a whole number`);
  return z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : typeof v === "string" ? Number(v) : v),
    num.min(limit.min, msg).max(limit.max, msg).nullable().optional()
  );
}

export const PatientRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, "Patient full name is required (at least 2 characters)").max(120),
  age: z.coerce.number().int().min(0, "Age must be at least 0").max(125, "Age must be valid"),
  gender: z.enum(["Male", "Female", "Other"], {
    errorMap: () => ({ message: "Select gender: Male, Female, or Other" })
  }),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
  address: z.string().trim().max(250).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  overrideDuplicateWarning: z.boolean().default(false)
});

export const OPDVisitCreateSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Consulting doctor is required"),
  reasonForVisit: z.string().trim().max(300).optional().nullable()
});

export const AppointmentBookingSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Consulting doctor is required"),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Appointment date is required (YYYY-MM-DD)"),
  slotTime: z.string().min(2, "Slot time is required (e.g. 10:30 AM)"),
  reasonForVisit: z.string().trim().max(300).optional().nullable()
});

export const ConsultationSaveSchema = z.object({
  opdVisitId: z.string().min(1, "OPD Visit ID is required"),
  patientId: z.string().min(1, "Patient ID is required"),
  doctorId: z.string().min(1, "Doctor ID is required"),
  chiefComplaint: z.string().trim().optional().nullable().transform((v) => v || "General Consultation"),
  historyOfPresentIllness: z.string().trim().optional().nullable(),
  examinationFindings: z.string().trim().optional().nullable(),
  diagnosis: z.string().trim().optional().nullable().transform((v) => v || "Clinical Evaluation"),
  adviceInstructions: z.string().trim().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  userRole: z.string().optional(),
  userId: z.string().optional(),
  vitals: z
    .object({
      bloodPressureSys: vitalField("bloodPressureSys"),
      bloodPressureDia: vitalField("bloodPressureDia"),
      pulseRateBpm: vitalField("pulseRateBpm"),
      temperatureF: vitalField("temperatureF"),
      spo2Percent: vitalField("spo2Percent"),
      weightKg: vitalField("weightKg"),
      heightCm: vitalField("heightCm")
    })
    .optional()
    .nullable(),
  medicines: z
    .array(
      z.object({
        medicineName: z.string().trim().min(1, "Medicine name is required"),
        strength: z.string().trim().optional().nullable(),
        dosage: z.string().trim().optional().nullable().transform((v) => v || "1"),
        frequency: z.string().trim().min(1, "Frequency is required (e.g. 1-0-1)"),
        duration: z.string().trim().min(1, "Duration is required (e.g. 5 Days)"),
        instructions: z.string().trim().optional().nullable()
      })
    )
    .default([])
});

export const BillCreateSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  opdVisitId: z.string().optional().nullable(),
  doctorId: z.string().optional().nullable(),
  consultationCharges: z.coerce.number().min(0, "Consultation charges cannot be negative"),
  additionalCharges: z.coerce.number().min(0).default(0),
  additionalChargesNotes: z.string().trim().optional().nullable(),
  discountAmount: z.coerce.number().min(0).default(0),
  discountReason: z.string().trim().optional().nullable(),
  amountPaid: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(["CASH", "UPI", "OTHER"]).default("CASH"),
  transactionRef: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable()
});

export const PaymentRecordSchema = z.object({
  billId: z.string().min(1, "Bill ID is required"),
  amount: z.coerce.number().positive("Payment amount must be greater than zero"),
  paymentMethod: z.enum(["CASH", "UPI", "OTHER"]),
  transactionRef: z.string().trim().optional().nullable(),
  idempotencyKey: z.string().min(6, "Idempotency key is required to prevent double payment"),
  remarks: z.string().trim().optional().nullable()
});

export const ClinicSettingsUpdateSchema = z.object({
  clinicName: z.string().trim().min(2),
  location: z.string().trim().min(2),
  addressLine: z.string().trim().min(2),
  contactPhone: z.string().trim().min(5),
  email: z.string().trim().email(),
  website: z.string().trim().optional().nullable(),
  logoUrl: z.string().trim().optional().nullable(),
  taxEnabled: z.boolean().default(false),
  taxPercentage: z.coerce.number().min(0).max(100).default(0)
});
