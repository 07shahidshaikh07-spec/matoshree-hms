# Matoshree Clinic EMR — Simple, Modern Clinic Management System

**Clinic:** Matoshree Clinic  
**Location:** Latur, Maharashtra, India  
**Doctors:** Dr. Vinod Korale & Dr. Vaishali Korale  
**Time Zone:** `Asia/Kolkata` (IST, UTC+05:30)

---

## 1. Overview & Transformation

Matoshree Clinic EMR is a purpose-built, lightweight, modern, and reliable Electronic Medical Records (EMR) system tailored specifically for **Matoshree Clinic, Latur, Maharashtra**.

It transforms the complex, specialized hospital management system into a clean, practical General Practice clinic tool designed for **Dr. Vinod Korale**, **Dr. Vaishali Korale**, and front-desk receptionists without requiring technical training.

### Key Highlights
- **7-Module Streamlined Sidebar:** Dashboard, Patients, OPD / Visits, Appointments, Billing, Reports, Settings.
- **Teal & Light Mint Visual Identity:** Modern, clean design inspired by clinic reference standards (Primary Teal `#258B7C`, Mint `#70CFBA`, Background `#F7F9FA`).
- **<1 Minute Patient Registration:** Minimal required fields (Name, Age, Gender, Mobile Number) with automatic unique Patient ID generation (`MC-2026-XXXX`) and instant duplicate detection.
- **Fast OPD Workflow:** 5-step visit queue, live token tracking, and direct consultation launching.
- **Doctor Consultation / EMR Workspace:** Clinical notes, history, findings, provisional & final diagnoses, optional vitals, and dynamic multi-row medicine prescription builder.
- **Printable Documents:** High-resolution clinical prescriptions and itemized payment receipts with 1-click Print and PDF export.
- **Idempotent Billing & Partial Payments:** Consultation fees, additional charges, and discounts with live ledger calculations and duplicate-payment prevention.
- **Zero-Config Portability:** Built on SQLite (`matoshree.db`) with Prisma ORM for reliable, file-backed local persistence without external database server dependencies.

---

## 2. Initial Configured Users & Roles

The system comes pre-configured with exactly three initial users:

| Staff Member | Role | Email | Default Password | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Dr. Vinod Korale** | `DOCTOR` | `dr.vinod@matoshreeclinic.in` | `Matoshree@2026` | Consultations, Vitals, Diagnoses, Prescription Signing, OPD Queue, Billing Access, Reports |
| **Dr. Vaishali Korale** | `DOCTOR` | `dr.vaishali@matoshreeclinic.in` | `Matoshree@2026` | Consultations, Vitals, Diagnoses, Prescription Signing, OPD Queue, Billing Access, Reports |
| **Clinic Receptionist** | `RECEPTIONIST` | `reception@matoshreeclinic.in` | `Matoshree@2026` | Patient Registration, OPD Visit Creation, Appointments, Bills & Payments, Print Receipts |

> [!NOTE]
> Receptionists are restricted from editing or finalizing clinical diagnoses and signing doctor prescriptions via server-side RBAC validation.

---

## 3. Technology Stack

- **Framework:** Next.js 14 (App Router)
- **UI Library:** React 18, Tailwind CSS, Lucide Icons
- **Language:** TypeScript 5
- **Database & ORM:** SQLite with Prisma ORM 5
- **Security:** PBKDF2-HMAC-SHA512 password hashing (100,000 iterations) & Server-Side RBAC
- **Validation:** Zod Schema Validation

---

## 4. Setup, Seeding & Execution Guide

Open PowerShell in the project directory:

### 1. Install Dependencies
```powershell
npm install
```

### 2. Push Database Schema & Generate Prisma Client
```powershell
npx prisma db push
```

### 3. Seed Database with Clinic Data & Initial Users
```powershell
npm run db:seed
```

### 4. Run Automated Test Suite (13 Tests)
```powershell
npm test
```

### 5. Start Development Server
```powershell
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Production Build & Start
```powershell
npm run build
npm start
```

---

## 5. Verification Checklist

- [x] All Asha Hospital specialist modules (IVF, OT, ICU, Beds, Admissions, Lab inventory) safely removed
- [x] Teal-green sidebar with 7 clean modules
- [x] Live aggregated dashboard cards (actual SQLite DB figures)
- [x] Fast patient registration with duplicate mobile/name warning
- [x] Doctor consultation workspace with dynamic prescriptions
- [x] 1-click appointment-to-OPD conversion
- [x] Bill generation, partial payments, and printable receipts
- [x] Clean TypeScript build and 13 passing E2E acceptance tests
