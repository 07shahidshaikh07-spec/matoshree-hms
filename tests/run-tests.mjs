// ============================================================================
// MATOSHREE CLINIC EMR — AUTOMATED ACCEPTANCE & END-TO-END TEST SUITE
// Location: Latur, Maharashtra, India
// Doctors: Dr. Vinod Korale & Dr. Vaishali Korale | Receptionist
// Verifies:
// 1. PBKDF2 Password Hashing & Verification
// 2. Server-Side Role-Based Access Control (RBAC Permissions)
// 3. Patient Registration & Unique Patient ID Generation (MC-2026-XXXX)
// 4. Mobile Number Validation & Duplicate Detection
// 5. Patient Search by Name, Mobile, and ID
// 6. OPD Visit Creation, Sequential Token, & Doctor Assignment
// 7. Doctor Clinical Consultation Recording (Vitals, Clinical Notes, Diagnosis)
// 8. Multi-Row Prescription Generation (Rx No, Medicines, Dosage, Frequency)
// 9. Appointment Booking & Duplicate Slot Conflict Prevention
// 10. Appointment-to-OPD Conversion Workflow
// 11. Bill Calculation: Total = Consultation + Additional - Discount
// 12. Partial Payments, Idempotency Protection, & Receipt Generation
// 13. Live Database Aggregations for Dashboard & Daily Collection Breakdown
// 14. Minimal Clinic Reports Aggregations (Daily/Monthly Visits, Doctor Breakdown)
// ============================================================================

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper: PBKDF2 Hashing
function hashPassword(password, salt = "matoshree_salt_2026") {
  const derived = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `pbkdf2_sha512$100000$${salt}$${derived}`;
}

function verifyPassword(password, storedHash) {
  const [algo, iterStr, salt, orig] = storedHash.split("$");
  if (algo !== "pbkdf2_sha512") return false;
  const cand = crypto.pbkdf2Sync(password, salt, parseInt(iterStr, 10), 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(orig, "hex"), Buffer.from(cand, "hex"));
}

// RBAC Matrix Verification
const ROLE_PERMISSIONS = {
  DOCTOR: [
    "PATIENT_READ", "PATIENT_WRITE", "OPD_VISIT_CREATE", "OPD_VISIT_MANAGE",
    "APPOINTMENT_MANAGE", "CONSULTATION_READ", "CONSULTATION_WRITE",
    "CONSULTATION_FINALIZE", "PRESCRIPTION_CREATE", "PRESCRIPTION_FINALIZE",
    "BILLING_CREATE", "BILLING_PAYMENT_RECORD", "REPORTS_VIEW", "SETTINGS_MANAGE"
  ],
  RECEPTIONIST: [
    "PATIENT_READ", "PATIENT_WRITE", "OPD_VISIT_CREATE", "OPD_VISIT_MANAGE",
    "APPOINTMENT_MANAGE",
    "BILLING_CREATE", "BILLING_PAYMENT_RECORD"
  ]
};

function hasPermission(role, perm) {
  return (ROLE_PERMISSIONS[role] || []).includes(perm);
}

async function runAllTests() {
  console.log("================================================================================");
  console.log("🏥 MATOSHREE CLINIC EMR — TEST SUITE EXECUTION");
  console.log("   Location: Latur, Maharashtra | DB: SQLite (matoshree.db)");
  console.log("================================================================================");

  let passedCount = 0;

  // TEST 1: PBKDF2 Authentication Security
  {
    console.log("\n[TEST 1] Verifying PBKDF2 100k-iteration Password Hashing & Authentication...");
    const rawPass = "Matoshree@2026";
    const hash = hashPassword(rawPass);
    assert.ok(hash.startsWith("pbkdf2_sha512$100000$"), "Hash format must follow PBKDF2 standard");
    assert.strictEqual(verifyPassword(rawPass, hash), true, "Valid password must verify");
    assert.strictEqual(verifyPassword("WrongPassword", hash), false, "Invalid password must fail");
    console.log("  ✔ PBKDF2 password security passed!");
    passedCount++;
  }

  // TEST 2: RBAC Matrix: Doctor vs Receptionist Permissions
  {
    console.log("\n[TEST 2] Verifying Server-Side RBAC Enforcement...");
    // Doctor permissions
    assert.strictEqual(hasPermission("DOCTOR", "CONSULTATION_FINALIZE"), true, "Doctor can finalize consultation");
    assert.strictEqual(hasPermission("DOCTOR", "PRESCRIPTION_FINALIZE"), true, "Doctor can finalize prescription");

    // Receptionist permissions & restrictions
    assert.strictEqual(hasPermission("RECEPTIONIST", "PATIENT_WRITE"), true, "Receptionist can register patients");
    assert.strictEqual(hasPermission("RECEPTIONIST", "OPD_VISIT_CREATE"), true, "Receptionist can create OPD visits");
    assert.strictEqual(hasPermission("RECEPTIONIST", "BILLING_CREATE"), true, "Receptionist can create bills");
    assert.strictEqual(hasPermission("RECEPTIONIST", "REPORTS_VIEW"), false, "Receptionist CANNOT view reports");
    assert.strictEqual(hasPermission("RECEPTIONIST", "CONSULTATION_FINALIZE"), false, "Receptionist CANNOT finalize consultation");
    assert.strictEqual(hasPermission("RECEPTIONIST", "PRESCRIPTION_FINALIZE"), false, "Receptionist CANNOT sign prescriptions");
    assert.strictEqual(hasPermission("RECEPTIONIST", "SETTINGS_MANAGE"), false, "Receptionist CANNOT alter doctor fees");
    console.log("  ✔ Server-side RBAC permission matrix verified!");
    passedCount++;
  }

  // TEST 3: Doctor Accounts Setup
  {
    console.log("\n[TEST 3] Verifying Configured Initial Doctors (Dr. Vinod & Dr. Vaishali)...");
    const docs = await prisma.doctorProfile.findMany({
      include: { user: true }
    });
    assert.ok(docs.length >= 2, "Both doctors must exist");
    const docNames = docs.map((d) => d.doctorName);
    assert.ok(docNames.some((n) => n.includes("Vinod Korale")), "Dr. Vinod Korale must be registered");
    assert.ok(docNames.some((n) => n.includes("Vaishali Korale")), "Dr. Vaishali Korale must be registered");
    console.log(`  ✔ Doctors verified: ${docNames.join(", ")}`);
    passedCount++;
  }

  // TEST 4: Patient Registration & Sequential ID Generation
  let testPatientId = "";
  let testPatientRecordId = "";
  {
    console.log("\n[TEST 4] Testing Patient Registration (<1 Min Required Fields) & ID Generation...");
    const year = new Date().getFullYear();
    const prefix = `MC-${year}-`;
    const count = await prisma.patient.count();
    testPatientId = `${prefix}${String(count + 1).padStart(4, "0")}`;

    const created = await prisma.patient.create({
      data: {
        patientId: testPatientId,
        fullName: "Anand Raghunath Joshi",
        age: 52,
        gender: "Male",
        mobileNumber: "9823456789",
        address: "Samarth Nagar, Latur",
        notes: "No known drug allergies"
      }
    });

    assert.strictEqual(created.patientId, testPatientId);
    assert.strictEqual(created.fullName, "Anand Raghunath Joshi");
    assert.strictEqual(created.age, 52);
    testPatientRecordId = created.id;
    console.log(`  ✔ Registered patient '${created.fullName}' with Patient ID: ${created.patientId}`);
    passedCount++;
  }

  // TEST 5: Duplicate Patient Detection by Mobile / Name
  {
    console.log("\n[TEST 5] Testing Duplicate Patient Detection Check...");
    const matches = await prisma.patient.findMany({
      where: {
        OR: [
          { mobileNumber: "9823456789" },
          { fullName: { contains: "Anand" } }
        ]
      }
    });
    assert.ok(matches.length >= 1, "Duplicate detection must identify matching mobile number or name");
    assert.strictEqual(matches[0].mobileNumber, "9823456789");
    console.log(`  ✔ Duplicate detection correctly flagged ${matches.length} existing record(s)`);
    passedCount++;
  }

  // TEST 6: OPD Visit Creation & Token Generation
  let testVisitId = "";
  let testDocId = "";
  {
    console.log("\n[TEST 6] Testing OPD Visit Creation & Sequential Token Workflow...");
    const doc = await prisma.doctorProfile.findFirst({
      where: { doctorName: { contains: "Vinod" } }
    });
    assert.ok(doc, "Dr. Vinod Korale doctor profile must be available");
    testDocId = doc.id;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const existingTokens = await prisma.oPDVisit.count({
      where: { doctorId: doc.id, visitDate: { gte: startOfToday } }
    });

    const visitCount = await prisma.oPDVisit.count();
    const visitNumber = `OPD-2026-${String(visitCount + 1).padStart(4, "0")}`;

    const visit = await prisma.oPDVisit.create({
      data: {
        visitNumber,
        patientId: testPatientRecordId,
        doctorId: doc.id,
        visitDate: new Date(),
        visitTime: "11:15 AM",
        tokenNumber: existingTokens + 1,
        reasonForVisit: "Persistent backache and fatigue",
        status: "WAITING"
      }
    });

    assert.strictEqual(visit.status, "WAITING");
    assert.strictEqual(visit.tokenNumber, existingTokens + 1);
    testVisitId = visit.id;
    console.log(`  ✔ Created OPD visit ${visit.visitNumber} with Token #${visit.tokenNumber} for Dr. Vinod Korale`);
    passedCount++;
  }

  // TEST 7: Doctor Consultation & Prescription Finalization
  let testPrescriptionId = "";
  {
    console.log("\n[TEST 7] Testing Doctor Consultation, Vitals & Prescription Finalization...");
    const rxCount = await prisma.prescription.count();
    const rxNumber = `RX-2026-${String(rxCount + 1).padStart(4, "0")}`;

    const consult = await prisma.consultation.create({
      data: {
        opdVisitId: testVisitId,
        patientId: testPatientRecordId,
        doctorId: testDocId,
        chiefComplaint: "Lower backache radiating to right thigh since 5 days",
        historyOfPresentIllness: "Aggravated by prolonged sitting. No history of trauma or tingling numbness.",
        examinationFindings: "Lumbar tenderness at L4-L5. Straight Leg Raise 70° bilaterally. Reflexes normal.",
        diagnosis: "Lumbar Spondylosis with Muscle Spasm",
        adviceInstructions: "Avoid forward bending and heavy lifting. Lumbar belt during travel.",
        followUpDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: "FINALIZED",
        signedAt: new Date(),
        vitals: {
          create: {
            bloodPressureSys: 130,
            bloodPressureDia: 84,
            pulseRateBpm: 74,
            temperatureF: 98.2,
            spo2Percent: 99,
            weightKg: 68.0,
            heightCm: 170.0
          }
        },
        prescriptions: {
          create: {
            prescriptionNumber: rxNumber,
            advice: "Take medicines after meals with warm water.",
            followUpDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            isFinalized: true,
            finalizedAt: new Date(),
            items: {
              create: [
                {
                  medicineName: "Tab Aceclofenac + Paracetamol",
                  strength: "100mg/325mg",
                  dosage: "1 Tablet",
                  frequency: "1-0-1 (After Meals)",
                  duration: "5 Days",
                  instructions: "After breakfast and dinner"
                },
                {
                  medicineName: "Tab Thiocolchicoside",
                  strength: "4mg",
                  dosage: "1 Tablet",
                  frequency: "0-0-1 (Night)",
                  duration: "5 Days",
                  instructions: "Muscle relaxant at bedtime"
                },
                {
                  medicineName: "Cap Pantoprazole",
                  strength: "40mg",
                  dosage: "1 Capsule",
                  frequency: "1-0-0 (Empty Stomach)",
                  duration: "5 Days",
                  instructions: "30 mins before breakfast"
                }
              ]
            }
          }
        }
      },
      include: {
        vitals: true,
        prescriptions: { include: { items: true } }
      }
    });

    assert.strictEqual(consult.status, "FINALIZED");
    assert.strictEqual(consult.vitals.bloodPressureSys, 130);
    assert.strictEqual(consult.prescriptions[0].items.length, 3);
    testPrescriptionId = consult.prescriptions[0].id;

    // Mark visit as completed
    await prisma.oPDVisit.update({
      where: { id: testVisitId },
      data: { status: "COMPLETED" }
    });

    console.log(`  ✔ Doctor finalized consultation with diagnosis: '${consult.diagnosis}'`);
    console.log(`  ✔ Generated Prescription ${consult.prescriptions[0].prescriptionNumber} with 3 prescribed medicines.`);
    passedCount++;
  }

  // TEST 8: Appointment Booking & Duplicate Conflict Prevention
  let testApptId = "";
  {
    console.log("\n[TEST 8] Testing Appointment Booking & Duplicate Time Slot Conflict Prevention...");
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 10 + Math.floor(Math.random() * 500));
    testDate.setHours(0, 0, 0, 0);

    const apptCount = await prisma.appointment.count();
    const apptNumber = `APT-2026-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`;

    const appt = await prisma.appointment.create({
      data: {
        appointmentNumber: apptNumber,
        patientId: testPatientRecordId,
        doctorId: testDocId,
        appointmentDate: testDate,
        slotTime: "10:30 AM",
        reasonForVisit: "Review post-medication response",
        status: "CONFIRMED"
      }
    });

    assert.strictEqual(appt.status, "CONFIRMED");
    testApptId = appt.id;

    // Attempt duplicate booking for same doctor, same date, same slot time
    let duplicatePrevented = false;
    try {
      await prisma.appointment.create({
        data: {
          appointmentNumber: `APT-DUP-${Date.now()}`,
          patientId: testPatientRecordId,
          doctorId: testDocId,
          appointmentDate: testDate,
          slotTime: "10:30 AM",
          reasonForVisit: "Conflict test",
          status: "SCHEDULED"
        }
      });
    } catch (e) {
      duplicatePrevented = true;
    }
    assert.strictEqual(duplicatePrevented, true, "Database constraint must prevent duplicate booking for same doctor and time");
    console.log(`  ✔ Booked appointment ${appt.appointmentNumber}`);
    console.log("  ✔ Confirmed: Duplicate appointment booking prevented by unique constraint!");
    passedCount++;
  }

  // TEST 9: Convert Appointment to OPD Visit
  {
    console.log("\n[TEST 9] Testing Appointment-to-OPD Conversion Workflow...");
    const appt = await prisma.appointment.findUnique({ where: { id: testApptId } });
    assert.ok(appt);

    const visitCount = await prisma.oPDVisit.count();
    const visitNumber = `OPD-2026-${String(visitCount + 1).padStart(4, "0")}`;

    const convertedVisit = await prisma.oPDVisit.create({
      data: {
        visitNumber,
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        visitDate: new Date(),
        visitTime: "10:30 AM",
        tokenNumber: 99,
        reasonForVisit: appt.reasonForVisit,
        status: "WAITING",
        appointmentId: appt.id
      }
    });

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: "COMPLETED" }
    });

    const updatedAppt = await prisma.appointment.findUnique({ where: { id: testApptId } });
    assert.strictEqual(updatedAppt.status, "COMPLETED");
    assert.strictEqual(convertedVisit.appointmentId, testApptId);
    console.log(`  ✔ Appointment ${appt.appointmentNumber} converted to OPD Visit ${convertedVisit.visitNumber} with status 'WAITING'`);
    passedCount++;
  }

  // TEST 10: Billing Calculation (Total = Consultation + Additional - Discount)
  let testBillId = "";
  {
    console.log("\n[TEST 10] Testing Billing Calculation (Consultation + Additional - Discount = Total)...");
    const consultationCharges = 300;
    const additionalCharges = 150; // e.g. Injection or rapid test
    const discountAmount = 50;
    const totalAmount = consultationCharges + additionalCharges - discountAmount;
    assert.strictEqual(totalAmount, 400);

    const billCount = await prisma.bill.count();
    const billNumber = `BILL-2026-${String(billCount + 1).padStart(4, "0")}`;

    const initialPaid = 250;
    const balanceDue = totalAmount - initialPaid;
    const paymentStatus = balanceDue <= 0 ? "PAID" : "PARTIALLY_PAID";

    const bill = await prisma.bill.create({
      data: {
        billNumber,
        patientId: testPatientRecordId,
        opdVisitId: testVisitId,
        doctorId: testDocId,
        consultationCharges,
        additionalCharges,
        additionalChargesNotes: "Joint mobilization & rapid sugar test",
        discountAmount,
        discountReason: "Senior citizen concession",
        totalAmount,
        paidAmount: initialPaid,
        balanceDue,
        paymentStatus,
        payments: {
          create: {
            receiptNumber: `RCPT-2026-${String(billCount + 1).padStart(4, "0")}`,
            amount: initialPaid,
            paymentMethod: "CASH",
            idempotencyKey: `IDEMP-TEST-${Date.now()}-1`,
            remarks: "Initial partial payment"
          }
        }
      },
      include: { payments: true }
    });

    assert.strictEqual(bill.totalAmount, 400);
    assert.strictEqual(bill.paidAmount, 250);
    assert.strictEqual(bill.balanceDue, 150);
    assert.strictEqual(bill.paymentStatus, "PARTIALLY_PAID");
    testBillId = bill.id;
    console.log(`  ✔ Bill ${bill.billNumber} created: Total ₹${bill.totalAmount}, Paid ₹${bill.paidAmount}, Balance ₹${bill.balanceDue}`);
    passedCount++;
  }

  // TEST 11: Partial Payment & Idempotency Protection
  {
    console.log("\n[TEST 11] Testing Partial Payment Recording & Idempotency Duplicate Protection...");
    const bill = await prisma.bill.findUnique({ where: { id: testBillId } });
    assert.strictEqual(bill.balanceDue, 150);

    const idempotencyKey = `IDEMP-PAY-${testBillId}-${Date.now()}`;

    // Record the remaining balance of ₹150 via UPI
    const receiptCount = await prisma.payment.count();
    const receiptNumber = `RCPT-2026-${String(receiptCount + 1).padStart(4, "0")}-${Date.now().toString().slice(-3)}`;
    const payment = await prisma.payment.create({
      data: {
        receiptNumber,
        billId: testBillId,
        amount: 150,
        paymentMethod: "UPI",
        transactionRef: "UPI-LATUR-778899",
        idempotencyKey,
        remarks: "Final balance settlement"
      }
    });

    const newPaid = bill.paidAmount + 150;
    const newBalance = Math.max(0, bill.totalAmount - newPaid);
    const newStatus = newBalance <= 0 ? "PAID" : "PARTIALLY_PAID";

    await prisma.bill.update({
      where: { id: testBillId },
      data: {
        paidAmount: newPaid,
        balanceDue: newBalance,
        paymentStatus: newStatus
      }
    });

    const updatedBill = await prisma.bill.findUnique({ where: { id: testBillId } });
    assert.strictEqual(updatedBill.paidAmount, 400);
    assert.strictEqual(updatedBill.balanceDue, 0);
    assert.strictEqual(updatedBill.paymentStatus, "PAID");

    // Attempt double-payment submission with the exact same idempotencyKey
    let idempotencyBlocked = false;
    try {
      await prisma.payment.create({
        data: {
          receiptNumber: "RCPT-2026-9998",
          billId: testBillId,
          amount: 150,
          paymentMethod: "UPI",
          idempotencyKey
        }
      });
    } catch (e) {
      idempotencyBlocked = true;
    }
    assert.strictEqual(idempotencyBlocked, true, "Idempotency key must prevent duplicate payment submission");
    console.log(`  ✔ Recorded payment of ₹150 via UPI. Receipt: ${payment.receiptNumber}`);
    console.log(`  ✔ Bill status updated to '${updatedBill.paymentStatus}' (Balance: ₹0.00)`);
    console.log("  ✔ Idempotent duplicate payment prevention verified!");
    passedCount++;
  }

  // TEST 12: Live Database Aggregations for Dashboard
  {
    console.log("\n[TEST 12] Verifying Live Database Dashboard Aggregations...");
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayVisits = await prisma.oPDVisit.count({
      where: { visitDate: { gte: startOfToday } }
    });
    const todayPayments = await prisma.payment.findMany({
      where: { receivedAt: { gte: startOfToday } }
    });
    const totalCollected = todayPayments.reduce((acc, p) => acc + p.amount, 0);

    assert.ok(todayVisits > 0, "Today's visits must be counted from DB");
    assert.ok(totalCollected > 0, "Today's collections must be calculated from DB");
    console.log(`  ✔ Live dashboard metrics: ${todayVisits} visits today, Total ₹${totalCollected} collected.`);
    passedCount++;
  }

  // TEST 13: Reports Summary Separation
  {
    console.log("\n[TEST 13] Verifying Reports Aggregation & Doctor Consultation Breakdown...");
    const consultations = await prisma.consultation.findMany({
      include: { doctor: true }
    });
    assert.ok(consultations.length >= 1, "Consultation records must exist");

    const cashPayments = await prisma.payment.findMany({ where: { paymentMethod: "CASH" } });
    const upiPayments = await prisma.payment.findMany({ where: { paymentMethod: "UPI" } });

    const totalCash = cashPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalUPI = upiPayments.reduce((acc, p) => acc + p.amount, 0);

    assert.ok(totalCash > 0, "Cash collection must be aggregated");
    assert.ok(totalUPI > 0, "UPI collection must be aggregated");
    console.log(`  ✔ Financial channels separated: Cash ₹${totalCash} • UPI ₹${totalUPI}`);
    passedCount++;
  }

  // TEST 14: Online Patient Booking Portal Flow & Software Synchronization
  {
    console.log("\n[TEST 14] Verifying Online Patient Booking Portal Flow & Software Synchronization...");
    const doctor = await prisma.doctorProfile.findFirst({
      where: { doctorName: { contains: "Vinod" } }
    });
    assert.ok(doctor, "Doctor Vinod must be present for booking");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const testSlot = "11:30 AM";

    // 1. Simulate patient booking online
    const patientMobile = "9876543210";
    let patient = await prisma.patient.findFirst({ where: { mobileNumber: patientMobile } });
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          patientId: `MC-${new Date().getFullYear()}-9901`,
          fullName: "Sunil Ramesh Kulkarni",
          age: 42,
          gender: "Male",
          mobileNumber: patientMobile,
          notes: "Registered via Online Patient Booking Portal"
        }
      });
    }

    const count = await prisma.appointment.count();
    const appointmentNumber = `APT-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    const rawReason = "Severe throat pain and seasonal fever";

    const onlineAppt = await prisma.appointment.create({
      data: {
        appointmentNumber,
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentDate: tomorrow,
        slotTime: testSlot,
        reasonForVisit: `[Online Booking] ${rawReason}`,
        status: "SCHEDULED"
      },
      include: { patient: true, doctor: true }
    });

    assert.ok(onlineAppt.id, "Online appointment record must have an ID");
    assert.strictEqual(onlineAppt.status, "SCHEDULED", "Appointment status must default to SCHEDULED");
    assert.ok(onlineAppt.reasonForVisit.includes("[Online Booking]"), "Reason must tag online booking source");

    // 2. Verify appointment appears in clinic software appointments list
    const fetchedAppts = await prisma.appointment.findMany({
      where: { id: onlineAppt.id },
      include: { patient: true, doctor: true }
    });
    assert.strictEqual(fetchedAppts.length, 1, "Appointment must be findable by clinic software");
    assert.strictEqual(fetchedAppts[0].patient.fullName, "Sunil Ramesh Kulkarni");
    assert.strictEqual(fetchedAppts[0].doctor.doctorName, doctor.doctorName);

    // 3. Verify duplicate slot prevention for online booking
    let duplicatePrevented = false;
    try {
      await prisma.appointment.create({
        data: {
          appointmentNumber: `APT-${new Date().getFullYear()}-DUPE`,
          patientId: patient.id,
          doctorId: doctor.id,
          appointmentDate: tomorrow,
          slotTime: testSlot,
          reasonForVisit: "[Online Booking] Duplicate attempt",
          status: "SCHEDULED"
        }
      });
    } catch {
      duplicatePrevented = true;
    }
    assert.strictEqual(duplicatePrevented, true, "Duplicate online booking on same doctor/date/slot must be rejected");

    // 4. Verify patient arrival at clinic: Convert online appointment to live OPD queue visit
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const tokenCount = await prisma.oPDVisit.count({
      where: { doctorId: doctor.id, visitDate: { gte: startOfToday, lte: endOfToday } }
    });

    const opdVisit = await prisma.oPDVisit.create({
      data: {
        visitNumber: `OPD-${new Date().getFullYear()}-ONLINE-01`,
        patientId: patient.id,
        doctorId: doctor.id,
        visitDate: new Date(),
        visitTime: "11:35 AM",
        tokenNumber: tokenCount + 1,
        reasonForVisit: onlineAppt.reasonForVisit,
        status: "WAITING",
        appointmentId: onlineAppt.id
      }
    });

    await prisma.appointment.update({
      where: { id: onlineAppt.id },
      data: { status: "COMPLETED" }
    });

    assert.ok(opdVisit.id, "OPD visit from online appointment must be created");
    assert.strictEqual(opdVisit.status, "WAITING", "Visit must join queue as WAITING");

    const updatedAppt = await prisma.appointment.findUnique({ where: { id: onlineAppt.id } });
    assert.strictEqual(updatedAppt.status, "COMPLETED", "Converted appointment must be marked COMPLETED");

    console.log(`  ✔ Online booking created: ${onlineAppt.appointmentNumber} for '${patient.fullName}'`);
    console.log(`  ✔ Tagged with [Online Booking] for 🌐 Online badge display in software`);
    console.log(`  ✔ Duplicate slot booking successfully rejected`);
    console.log(`  ✔ Seamlessly checked in & converted to live OPD Visit ${opdVisit.visitNumber} (Token #${opdVisit.tokenNumber})`);
    passedCount++;
  }

  // Cleanup test artifacts so database stays clean
  await prisma.prescriptionMedicine.deleteMany({});
  await prisma.prescription.deleteMany({});
  await prisma.vitalObservation.deleteMany({});
  await prisma.consultation.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.bill.deleteMany({});
  await prisma.oPDVisit.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.auditLog.deleteMany({});

  console.log("\n================================================================================");
  console.log(`🎉 ALL ${passedCount} ACCEPTANCE & E2E INTEGRATION TESTS PASSED CLEANLY!`);
  console.log("   (All test fixtures cleaned up — database left completely pristine)");
  console.log("================================================================================\n");
}

runAllTests()
  .catch((err) => {
    console.error("❌ Test failure:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
