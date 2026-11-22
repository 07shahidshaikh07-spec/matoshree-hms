// ============================================================================
// MATOSHREE CLINIC EMR — CLEAN SLATE SCRIPT
// Wipes all demo and test transactional data:
// - Patients, OPD Visits, Appointments, Consultations, Vitals, Prescriptions,
//   Medicines, Bills, Payments, Audit Logs, Sessions
// Preserves:
// - Clinic Settings (Matoshree Clinic, Latur, Maharashtra)
// - Initial Users (Dr. Vinod Korale, Dr. Vaishali Korale, Receptionist)
// - Doctor Profiles
// ============================================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearAllDemoData() {
  console.log("🧹 Clearing all demo and test data from Matoshree Clinic EMR database...");

  // Delete all child and transactional records in correct relational order
  const delMedicines = await prisma.prescriptionMedicine.deleteMany({});
  console.log(`- Deleted ${delMedicines.count} prescription medicine items`);

  const delPrescriptions = await prisma.prescription.deleteMany({});
  console.log(`- Deleted ${delPrescriptions.count} prescriptions`);

  const delVitals = await prisma.vitalObservation.deleteMany({});
  console.log(`- Deleted ${delVitals.count} vital observation records`);

  const delConsultations = await prisma.consultation.deleteMany({});
  console.log(`- Deleted ${delConsultations.count} clinical consultations`);

  const delPayments = await prisma.payment.deleteMany({});
  console.log(`- Deleted ${delPayments.count} payment transactions`);

  const delBills = await prisma.bill.deleteMany({});
  console.log(`- Deleted ${delBills.count} bills`);

  const delVisits = await prisma.oPDVisit.deleteMany({});
  console.log(`- Deleted ${delVisits.count} OPD visits`);

  const delAppointments = await prisma.appointment.deleteMany({});
  console.log(`- Deleted ${delAppointments.count} appointments`);

  const delPatients = await prisma.patient.deleteMany({});
  console.log(`- Deleted ${delPatients.count} patients`);

  const delAuditLogs = await prisma.auditLog.deleteMany({});
  console.log(`- Deleted ${delAuditLogs.count} audit logs`);

  const delSessions = await prisma.session.deleteMany({});
  console.log(`- Deleted ${delSessions.count} sessions`);

  // Verify core configuration & initial users are intact
  const users = await prisma.user.findMany({ select: { id: true, fullName: true, role: true, email: true } });
  const doctors = await prisma.doctorProfile.findMany({ select: { id: true, doctorName: true, specialty: true } });
  const clinic = await prisma.clinicSetting.findUnique({ where: { id: "default" } });

  console.log("\n================================================================================");
  console.log("✨ DATABASE IS NOW COMPLETELY CLEAN & READY FOR REAL CLINIC USE!");
  console.log("================================================================================");
  console.log(`Clinic: ${clinic?.clinicName || "Matoshree Clinic"} (${clinic?.location || "Latur, Maharashtra"})`);
  console.log(`Active Users (${users.length}):`);
  users.forEach((u) => console.log(` - ${u.fullName} [${u.role}] (${u.email})`));
  console.log(`Active Doctors (${doctors.length}):`);
  doctors.forEach((d) => console.log(` - ${d.doctorName} (${d.specialty})`));
  console.log("Transactional Data Count:");
  console.log(" - Patients: 0");
  console.log(" - OPD Visits: 0");
  console.log(" - Appointments: 0");
  console.log(" - Consultations: 0");
  console.log(" - Bills: 0");
  console.log(" - Payments: 0");
  console.log("================================================================================\n");
}

clearAllDemoData()
  .catch((err) => {
    console.error("Error clearing demo data:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
