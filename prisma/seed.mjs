// ============================================================================
// MATOSHREE CLINIC EMR — INITIAL SEED SCRIPT (Pure Node.js / ESM)
// Doctors: Dr. Vinod Korale & Dr. Vaishali Korale | Receptionist
// Location: Latur, Maharashtra, India
// Run via: node prisma/seed.mjs
// ============================================================================

import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password, salt = "matoshree_salt_2026") {
  const derived = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `pbkdf2_sha512$100000$${salt}$${derived}`;
}

async function main() {
  console.log("🌱 Setting up Matoshree Clinic configuration and staff accounts...");

  // 1. Clinic Settings
  await prisma.clinicSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      clinicName: "Matoshree Clinic",
      location: "Latur, Maharashtra, India",
      addressLine: "Station Road, Latur, Maharashtra 413512",
      contactPhone: "+91 2382 250000",
      email: "contact@matoshreeclinic.in",
      timezone: "Asia/Kolkata",
      taxEnabled: false,
      taxPercentage: 0.0
    }
  });

  // 2. Initial Users
  const defaultPasswordHash = hashPassword("Matoshree@2026");

  // User 1: Dr. Vinod Korale (Doctor)
  const userDrVinod = await prisma.user.upsert({
    where: { email: "dr.vinod@matoshreeclinic.in" },
    update: {},
    create: {
      employeeCode: "DOC-MTO-001",
      fullName: "Dr. Vinod Korale",
      email: "dr.vinod@matoshreeclinic.in",
      mobileNumber: "9822000001",
      passwordHash: defaultPasswordHash,
      role: "DOCTOR"
    }
  });

  await prisma.doctorProfile.upsert({
    where: { userId: userDrVinod.id },
    update: {},
    create: {
      userId: userDrVinod.id,
      doctorName: "Dr. Vinod Korale",
      qualification: "MBBS, MD (Medicine)",
      registrationNumber: "MMC-2010-054321",
      specialty: "General Medicine & Physician",
      consultationFee: 300.0,
      followupFee: 200.0,
      roomNumber: "Consulting Room 1"
    }
  });

  // User 2: Dr. Vaishali Korale (Doctor)
  const userDrVaishali = await prisma.user.upsert({
    where: { email: "dr.vaishali@matoshreeclinic.in" },
    update: {},
    create: {
      employeeCode: "DOC-MTO-002",
      fullName: "Dr. Vaishali Korale",
      email: "dr.vaishali@matoshreeclinic.in",
      mobileNumber: "9822000002",
      passwordHash: defaultPasswordHash,
      role: "DOCTOR"
    }
  });

  await prisma.doctorProfile.upsert({
    where: { userId: userDrVaishali.id },
    update: {},
    create: {
      userId: userDrVaishali.id,
      doctorName: "Dr. Vaishali Korale",
      qualification: "MBBS, DNB (Family Medicine)",
      registrationNumber: "MMC-2012-098765",
      specialty: "General Practice & Family Physician",
      consultationFee: 300.0,
      followupFee: 200.0,
      roomNumber: "Consulting Room 2"
    }
  });

  // User 3: Receptionist (Reception role)
  await prisma.user.upsert({
    where: { email: "reception@matoshreeclinic.in" },
    update: {},
    create: {
      employeeCode: "REC-MTO-001",
      fullName: "Clinic Receptionist",
      email: "reception@matoshreeclinic.in",
      mobileNumber: "9822000003",
      passwordHash: defaultPasswordHash,
      role: "RECEPTIONIST"
    }
  });

  console.log("✅ Matoshree Clinic configuration and staff accounts are ready!");
  console.log("   Initial Users:");
  console.log("   1. Dr. Vinod Korale: dr.vinod@matoshreeclinic.in (DOCTOR)");
  console.log("   2. Dr. Vaishali Korale: dr.vaishali@matoshreeclinic.in (DOCTOR)");
  console.log("   3. Receptionist: reception@matoshreeclinic.in (RECEPTIONIST)");
  console.log("   Database contains NO demo patients, visits, or bills (clean state).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
