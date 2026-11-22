-- ============================================================================
-- ASHA HOSPITAL HMS — INITIAL POSTGRESQL DATABASE MIGRATION
-- Migration: 20261028000000_init_asha_hms
-- ============================================================================

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMINISTRATOR', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'BILLING_STAFF', 'LABORATORY_STAFF', 'PHARMACIST');
CREATE TYPE "Sex" AS ENUM ('FEMALE', 'MALE', 'OTHER');
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'WAITING', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ConsultationStatus" AS ENUM ('DRAFT', 'SIGNED', 'AMENDED');
CREATE TYPE "AdmissionStatus" AS ENUM ('PLANNED', 'ACTIVE', 'DISCHARGED', 'CANCELLED');
CREATE TYPE "BedStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'CLEANING');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOIDED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'ADVANCE_ADJUSTMENT');
CREATE TYPE "InvestigationOrderStatus" AS ENUM ('ORDERED', 'SAMPLE_COLLECTED', 'RESULT_ENTERED', 'VERIFIED', 'CANCELLED');

-- CreateTable: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Session
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HospitalSetting
CREATE TABLE "HospitalSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "hospitalName" TEXT NOT NULL DEFAULT 'Asha Hospital',
    "tagline" TEXT NOT NULL DEFAULT 'Maternity, Laparoscopy and IVF Center',
    "addressLine" TEXT NOT NULL DEFAULT 'Barshi Road, Latur, Maharashtra 413512, India',
    "contactPhone" TEXT NOT NULL DEFAULT '+91-2382-245678',
    "instagramHandle" TEXT NOT NULL DEFAULT '@ashahospital_latur',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "enableLaboratory" BOOLEAN NOT NULL DEFAULT true,
    "enablePharmacy" BOOLEAN NOT NULL DEFAULT true,
    "isDemoMode" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HospitalSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Patient
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "uhid" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "estimatedAgeYears" INTEGER,
    "sex" "Sex" NOT NULL,
    "bloodGroup" TEXT,
    "maritalStatus" TEXT,
    "mobileNumber" TEXT NOT NULL,
    "alternateMobile" TEXT,
    "addressLine" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Latur',
    "district" TEXT NOT NULL DEFAULT 'Latur',
    "state" TEXT NOT NULL DEFAULT 'Maharashtra',
    "pincode" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyRelation" TEXT,
    "medicalAlerts" TEXT,
    "medicalHistory" TEXT,
    "referringDoctor" TEXT,
    "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PatientAllergy
CREATE TABLE "PatientAllergy" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "reaction" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatientAllergy_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PatientDocument
CREATE TABLE "PatientDocument" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatientDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DoctorProfile
CREATE TABLE "DoctorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "consultationFee" DECIMAL(10,2) NOT NULL,
    "followupFee" DECIMAL(10,2) NOT NULL,
    "roomNumber" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DoctorSchedule
CREATE TABLE "DoctorSchedule" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDurationMin" INTEGER NOT NULL DEFAULT 15,
    "maxTokens" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "DoctorSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Appointment
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "slotTime" TEXT NOT NULL,
    "tokenNumber" INTEGER NOT NULL,
    "visitType" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'WAITING',
    "reasonForVisit" TEXT,
    "cancelReason" TEXT,
    "reminderQueued" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Encounter
CREATE TABLE "Encounter" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "encounterDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "presentingComplaints" TEXT NOT NULL,
    "clinicalNotes" TEXT NOT NULL,
    "provisionalDiagnosis" TEXT,
    "finalDiagnosis" TEXT,
    "followUpInstructions" TEXT,
    "followUpDate" TIMESTAMP(3),
    "status" "ConsultationStatus" NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMP(3),
    "amendmentReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable: VitalObservation
CREATE TABLE "VitalObservation" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "bloodPressureSys" INTEGER,
    "bloodPressureDia" INTEGER,
    "pulseRateBpm" INTEGER,
    "temperatureC" DECIMAL(4,1),
    "spo2Percent" INTEGER,
    "weightKg" DECIMAL(5,2),
    "heightCm" DECIMAL(5,2),
    "fetalHeartRate" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VitalObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Diagnosis
CREATE TABLE "Diagnosis" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "icdCode" TEXT,
    "description" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Prescription
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "prescriptionNumber" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "generalAdvice" TEXT,
    "dietaryInstructions" TEXT,
    "followUpDate" TIMESTAMP(3),
    "isSigned" BOOLEAN NOT NULL DEFAULT false,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PrescriptionItem
CREATE TABLE "PrescriptionItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "route" TEXT NOT NULL DEFAULT 'Oral',
    "instructions" TEXT,
    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PregnancyEpisode
CREATE TABLE "PregnancyEpisode" (
    "id" TEXT NOT NULL,
    "episodeNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "gravida" INTEGER NOT NULL DEFAULT 1,
    "para" INTEGER NOT NULL DEFAULT 0,
    "living" INTEGER NOT NULL DEFAULT 0,
    "abortion" INTEGER NOT NULL DEFAULT 0,
    "lmpDate" TIMESTAMP(3),
    "confirmedEddDate" TIMESTAMP(3) NOT NULL,
    "datingMethod" TEXT NOT NULL DEFAULT 'LMP + Dating Ultrasound Confirmed',
    "bloodGroupRh" TEXT,
    "highRiskFactors" TEXT,
    "obstetricHistoryNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE_ANC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PregnancyEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AntenatalVisit
CREATE TABLE "AntenatalVisit" (
    "id" TEXT NOT NULL,
    "pregnancyEpisodeId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gestationalAgeWeeks" INTEGER NOT NULL,
    "gestationalAgeDays" INTEGER NOT NULL DEFAULT 0,
    "weightKg" DECIMAL(5,2),
    "bpSystolic" INTEGER,
    "bpDiastolic" INTEGER,
    "fundalHeightCm" DECIMAL(4,1),
    "fetalPresentation" TEXT,
    "fetalHeartRateBpm" INTEGER,
    "fetalMovement" TEXT,
    "edema" TEXT,
    "urineAlbumin" TEXT,
    "hemoglobinGdl" DECIMAL(4,1),
    "ultrasoundSummary" TEXT,
    "clinicianNotes" TEXT NOT NULL,
    "supplementsAdvised" TEXT,
    "nextVisitDate" TIMESTAMP(3),
    "recordedByDoctorName" TEXT NOT NULL,
    CONSTRAINT "AntenatalVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DeliveryRecord
CREATE TABLE "DeliveryRecord" (
    "id" TEXT NOT NULL,
    "pregnancyEpisodeId" TEXT NOT NULL,
    "admissionId" TEXT,
    "deliveryDateTime" TIMESTAMP(3) NOT NULL,
    "deliveryMode" TEXT NOT NULL,
    "indication" TEXT,
    "anesthesiaType" TEXT,
    "placentaDelivery" TEXT NOT NULL DEFAULT 'Complete',
    "estimatedBloodLossMl" INTEGER,
    "maternalOutcome" TEXT NOT NULL,
    "attendingObstetrician" TEXT NOT NULL,
    "attendingPediatrician" TEXT,
    "deliveryNotes" TEXT,
    "postnatalFollowUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeliveryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable: NewbornRecord
CREATE TABLE "NewbornRecord" (
    "id" TEXT NOT NULL,
    "babyUhid" TEXT NOT NULL,
    "deliveryRecordId" TEXT NOT NULL,
    "motherPatientId" TEXT NOT NULL,
    "birthOrder" INTEGER NOT NULL DEFAULT 1,
    "sex" "Sex" NOT NULL,
    "birthDateTime" TIMESTAMP(3) NOT NULL,
    "birthWeightGrams" INTEGER NOT NULL,
    "lengthCm" DECIMAL(4,1),
    "headCircumferenceCm" DECIMAL(4,1),
    "apgar1Min" INTEGER,
    "apgar5Min" INTEGER,
    "criedImmediately" BOOLEAN NOT NULL DEFAULT true,
    "resuscitationNeeded" BOOLEAN NOT NULL DEFAULT false,
    "vitaminKGiven" BOOLEAN NOT NULL DEFAULT true,
    "bcgHepBVaccineNote" TEXT,
    "neonatalStatus" TEXT NOT NULL DEFAULT 'Rooming-in with Mother',
    "pediatricianNotes" TEXT,
    CONSTRAINT "NewbornRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FertilityEpisode
CREATE TABLE "FertilityEpisode" (
    "id" TEXT NOT NULL,
    "fertilityCode" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "partnerFullName" TEXT NOT NULL,
    "partnerAgeYears" INTEGER,
    "partnerMobile" TEXT,
    "partnerBloodGroup" TEXT,
    "coupleConsentRecorded" BOOLEAN NOT NULL DEFAULT false,
    "consentDocumentRef" TEXT,
    "infertilityType" TEXT NOT NULL,
    "durationOfInfertility" TEXT NOT NULL,
    "femaleHistorySummary" TEXT,
    "maleHistorySummary" TEXT,
    "priorTreatmentsSummary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FertilityEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FertilityAssessment
CREATE TABLE "FertilityAssessment" (
    "id" TEXT NOT NULL,
    "fertilityEpisodeId" TEXT NOT NULL,
    "assessmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cycleDay" INTEGER,
    "amhLevelNgMl" DECIMAL(5,2),
    "tshLevelMiuL" DECIMAL(5,2),
    "prolactinNgMl" DECIMAL(5,2),
    "endometrialThicknessMm" DECIMAL(4,1),
    "antralFollicleCount" TEXT,
    "hsgOrLaparoscopyNote" TEXT,
    "clinicianAssessment" TEXT NOT NULL,
    "recordedByDoctor" TEXT NOT NULL,
    CONSTRAINT "FertilityAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FertilityCycle
CREATE TABLE "FertilityCycle" (
    "id" TEXT NOT NULL,
    "fertilityEpisodeId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "cycleType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "plannedProtocolNote" TEXT NOT NULL,
    "currentStage" TEXT NOT NULL,
    "outcomeStatus" TEXT,
    "outcomeNotes" TEXT,
    "linkedPackageCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FertilityCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FertilityProcedure
CREATE TABLE "FertilityProcedure" (
    "id" TEXT NOT NULL,
    "fertilityCycleId" TEXT NOT NULL,
    "procedureType" TEXT NOT NULL,
    "scheduledDateTime" TIMESTAMP(3) NOT NULL,
    "performedByDoctor" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "clinicalDocumentation" TEXT,
    "followUpMilestone" TEXT,
    CONSTRAINT "FertilityProcedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Ward
CREATE TABLE "Ward" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "dailyRate" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Ward_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Bed
CREATE TABLE "Bed" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "bedType" TEXT NOT NULL,
    "status" "BedStatus" NOT NULL DEFAULT 'AVAILABLE',
    CONSTRAINT "Bed_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Admission
CREATE TABLE "Admission" (
    "id" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admittingDoctorName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "plannedAdmissionDate" TIMESTAMP(3),
    "admittedAt" TIMESTAMP(3),
    "dischargedAt" TIMESTAMP(3),
    "reasonForAdmission" TEXT NOT NULL,
    "provisionalDiagnosis" TEXT NOT NULL,
    "finalDiagnosis" TEXT,
    "dischargeSummaryNote" TEXT,
    "dischargeCondition" TEXT,
    "dischargeMedications" TEXT,
    "followUpPlan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Admission_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BedAssignment
CREATE TABLE "BedAssignment" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "transferNote" TEXT,
    CONSTRAINT "BedAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: NursingObservation
CREATE TABLE "NursingObservation" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bpSystolic" INTEGER,
    "bpDiastolic" INTEGER,
    "pulseBpm" INTEGER,
    "temperatureC" DECIMAL(4,1),
    "spo2Percent" INTEGER,
    "intakeOutputNote" TEXT,
    "nursingNote" TEXT NOT NULL,
    CONSTRAINT "NursingObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MedicationAdministration
CREATE TABLE "MedicationAdministration" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "administeredById" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "administeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prescribedByDoc" TEXT NOT NULL,
    "remarks" TEXT,
    CONSTRAINT "MedicationAdministration_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SurgeryRecord
CREATE TABLE "SurgeryRecord" (
    "id" TEXT NOT NULL,
    "surgeryNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admissionId" TEXT,
    "primarySurgeonId" TEXT NOT NULL,
    "procedureName" TEXT NOT NULL,
    "otTheatre" TEXT NOT NULL DEFAULT 'Main Modular OT-1',
    "scheduledDateTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "anesthetistName" TEXT,
    "anesthesiaType" TEXT,
    "preOpChecklistDone" BOOLEAN NOT NULL DEFAULT false,
    "preOpNotes" TEXT,
    "operationNotes" TEXT,
    "postOpOrders" TEXT,
    "specimensSentToLab" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SurgeryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ServiceCatalogue
CREATE TABLE "ServiceCatalogue" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "defaultRate" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceCatalogue_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Invoice
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admissionId" TEXT,
    "billingCategory" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "subtotalAmount" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "discountApprovedBy" TEXT,
    "netPayableAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balanceDueAmount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InvoiceItem
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "serviceCode" TEXT,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,
    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Payment
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "isAdvanceDeposit" BOOLEAN NOT NULL DEFAULT false,
    "transactionRef" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Refund
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "refundNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "refundMethod" TEXT NOT NULL,
    "authorizedById" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InvestigationCatalogue
CREATE TABLE "InvestigationCatalogue" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "sampleType" TEXT NOT NULL,
    "referenceRange" TEXT,
    "unit" TEXT,
    "defaultPrice" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "InvestigationCatalogue_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InvestigationOrder
CREATE TABLE "InvestigationOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "orderedByDoctor" TEXT NOT NULL,
    "testCode" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "status" "InvestigationOrderStatus" NOT NULL DEFAULT 'ORDERED',
    "sampleCollectedAt" TIMESTAMP(3),
    "sampleCollectedBy" TEXT,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvestigationOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InvestigationResult
CREATE TABLE "InvestigationResult" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "resultValue" TEXT NOT NULL,
    "unit" TEXT,
    "referenceRange" TEXT,
    "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
    "interpretation" TEXT,
    "attachmentPath" TEXT,
    "enteredByStaff" TEXT NOT NULL,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "releasedToPatient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvestigationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MedicineCatalogue
CREATE TABLE "MedicineCatalogue" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'Strip',
    "reorderLevel" INTEGER NOT NULL DEFAULT 25,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "MedicineCatalogue_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MedicineBatch
CREATE TABLE "MedicineBatch" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "quantityAvailable" INTEGER NOT NULL,
    "unitCostPrice" DECIMAL(10,2) NOT NULL,
    "mrpUnitPrice" DECIMAL(10,2) NOT NULL,
    "supplierName" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MedicineBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable: StockMovement
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "referenceNote" TEXT NOT NULL,
    "recordedByStaff" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PharmacyDispense
CREATE TABLE "PharmacyDispense" (
    "id" TEXT NOT NULL,
    "dispenseNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "batchId" TEXT NOT NULL,
    "quantityDispensed" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "dispensedById" TEXT NOT NULL,
    "dispensedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PharmacyDispense_pkey" PRIMARY KEY ("id")
);

-- Unique Indexes & Performance Indexes
CREATE UNIQUE INDEX "User_employeeCode_key" ON "User"("employeeCode");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

CREATE UNIQUE INDEX "Patient_uhid_key" ON "Patient"("uhid");
CREATE INDEX "Patient_fullName_idx" ON "Patient"("fullName");
CREATE INDEX "Patient_mobileNumber_idx" ON "Patient"("mobileNumber");
CREATE INDEX "Patient_registrationDate_idx" ON "Patient"("registrationDate");

CREATE INDEX "PatientAllergy_patientId_idx" ON "PatientAllergy"("patientId");
CREATE INDEX "PatientDocument_patientId_category_idx" ON "PatientDocument"("patientId", "category");

CREATE UNIQUE INDEX "DoctorProfile_userId_key" ON "DoctorProfile"("userId");
CREATE UNIQUE INDEX "DoctorProfile_registrationNumber_key" ON "DoctorProfile"("registrationNumber");
CREATE UNIQUE INDEX "DoctorSchedule_doctorId_dayOfWeek_startTime_key" ON "DoctorSchedule"("doctorId", "dayOfWeek", "startTime");

CREATE UNIQUE INDEX "Appointment_doctorId_appointmentDate_tokenNumber_key" ON "Appointment"("doctorId", "appointmentDate", "tokenNumber");
CREATE INDEX "Appointment_appointmentDate_status_idx" ON "Appointment"("appointmentDate", "status");
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

CREATE UNIQUE INDEX "Encounter_appointmentId_key" ON "Encounter"("appointmentId");
CREATE INDEX "Encounter_patientId_encounterDate_idx" ON "Encounter"("patientId", "encounterDate");

CREATE UNIQUE INDEX "Prescription_prescriptionNumber_key" ON "Prescription"("prescriptionNumber");
CREATE UNIQUE INDEX "PregnancyEpisode_episodeNumber_key" ON "PregnancyEpisode"("episodeNumber");
CREATE INDEX "PregnancyEpisode_patientId_status_idx" ON "PregnancyEpisode"("patientId", "status");
CREATE UNIQUE INDEX "NewbornRecord_babyUhid_key" ON "NewbornRecord"("babyUhid");
CREATE UNIQUE INDEX "FertilityEpisode_fertilityCode_key" ON "FertilityEpisode"("fertilityCode");

CREATE UNIQUE INDEX "Ward_code_key" ON "Ward"("code");
CREATE UNIQUE INDEX "Bed_bedNumber_key" ON "Bed"("bedNumber");
CREATE UNIQUE INDEX "Admission_admissionNumber_key" ON "Admission"("admissionNumber");
CREATE INDEX "Admission_status_admittedAt_idx" ON "Admission"("status", "admittedAt");
CREATE INDEX "BedAssignment_bedId_isCurrent_idx" ON "BedAssignment"("bedId", "isCurrent");
CREATE UNIQUE INDEX "SurgeryRecord_surgeryNumber_key" ON "SurgeryRecord"("surgeryNumber");

CREATE UNIQUE INDEX "ServiceCatalogue_code_key" ON "ServiceCatalogue"("code");
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_patientId_status_idx" ON "Invoice"("patientId", "status");
CREATE INDEX "Invoice_issuedAt_idx" ON "Invoice"("issuedAt");
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX "Payment_receivedAt_idx" ON "Payment"("receivedAt");
CREATE UNIQUE INDEX "Refund_refundNumber_key" ON "Refund"("refundNumber");

CREATE UNIQUE INDEX "InvestigationCatalogue_code_key" ON "InvestigationCatalogue"("code");
CREATE UNIQUE INDEX "InvestigationOrder_orderNumber_key" ON "InvestigationOrder"("orderNumber");
CREATE UNIQUE INDEX "InvestigationResult_orderId_key" ON "InvestigationResult"("orderId");
CREATE UNIQUE INDEX "MedicineCatalogue_code_key" ON "MedicineCatalogue"("code");
CREATE UNIQUE INDEX "MedicineBatch_medicineId_batchNumber_key" ON "MedicineBatch"("medicineId", "batchNumber");
CREATE INDEX "MedicineBatch_expiryDate_idx" ON "MedicineBatch"("expiryDate");
CREATE UNIQUE INDEX "PharmacyDispense_dispenseNumber_key" ON "PharmacyDispense"("dispenseNumber");

-- AddForeignKey Constraints
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoctorSchedule" ADD CONSTRAINT "DoctorSchedule_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VitalObservation" ADD CONSTRAINT "VitalObservation_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VitalObservation" ADD CONSTRAINT "VitalObservation_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PregnancyEpisode" ADD CONSTRAINT "PregnancyEpisode_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AntenatalVisit" ADD CONSTRAINT "AntenatalVisit_pregnancyEpisodeId_fkey" FOREIGN KEY ("pregnancyEpisodeId") REFERENCES "PregnancyEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryRecord" ADD CONSTRAINT "DeliveryRecord_pregnancyEpisodeId_fkey" FOREIGN KEY ("pregnancyEpisodeId") REFERENCES "PregnancyEpisode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NewbornRecord" ADD CONSTRAINT "NewbornRecord_deliveryRecordId_fkey" FOREIGN KEY ("deliveryRecordId") REFERENCES "DeliveryRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FertilityEpisode" ADD CONSTRAINT "FertilityEpisode_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FertilityAssessment" ADD CONSTRAINT "FertilityAssessment_fertilityEpisodeId_fkey" FOREIGN KEY ("fertilityEpisodeId") REFERENCES "FertilityEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FertilityCycle" ADD CONSTRAINT "FertilityCycle_fertilityEpisodeId_fkey" FOREIGN KEY ("fertilityEpisodeId") REFERENCES "FertilityEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FertilityProcedure" ADD CONSTRAINT "FertilityProcedure_fertilityCycleId_fkey" FOREIGN KEY ("fertilityCycleId") REFERENCES "FertilityCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BedAssignment" ADD CONSTRAINT "BedAssignment_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BedAssignment" ADD CONSTRAINT "BedAssignment_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "Bed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NursingObservation" ADD CONSTRAINT "NursingObservation_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NursingObservation" ADD CONSTRAINT "NursingObservation_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_administeredById_fkey" FOREIGN KEY ("administeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SurgeryRecord" ADD CONSTRAINT "SurgeryRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SurgeryRecord" ADD CONSTRAINT "SurgeryRecord_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SurgeryRecord" ADD CONSTRAINT "SurgeryRecord_primarySurgeonId_fkey" FOREIGN KEY ("primarySurgeonId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_authorizedById_fkey" FOREIGN KEY ("authorizedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvestigationOrder" ADD CONSTRAINT "InvestigationOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvestigationOrder" ADD CONSTRAINT "InvestigationOrder_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvestigationResult" ADD CONSTRAINT "InvestigationResult_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "InvestigationOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvestigationResult" ADD CONSTRAINT "InvestigationResult_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicineBatch" ADD CONSTRAINT "MedicineBatch_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "MedicineCatalogue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MedicineBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyDispense" ADD CONSTRAINT "PharmacyDispense_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyDispense" ADD CONSTRAINT "PharmacyDispense_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PharmacyDispense" ADD CONSTRAINT "PharmacyDispense_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MedicineBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyDispense" ADD CONSTRAINT "PharmacyDispense_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
