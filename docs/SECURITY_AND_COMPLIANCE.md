# Security, Privacy & Compliance Guidelines

## 1. Built-In Technical Controls
- **Server-Side RBAC Enforcement:** Every API route validates the signed-in staff member's role via `assertPermission(role, action)` on the server (`src/lib/rbac.ts`), ensuring receptionists cannot edit doctor clinical notes or sign prescriptions.
- **Clinical Integrity:** Consultations and prescriptions can only be finalized and signed by authenticated users with the `DOCTOR` role (`Dr. Vinod Korale` & `Dr. Vaishali Korale`).
- **Financial Ledger Integrity:** Invoices and payments cannot be deleted. Payment recording requires an `idempotencyKey` to prevent accidental double-entry, and partial payments recalculate balance due automatically.
- **Password & Session Security:** Passwords use `PBKDF2-HMAC-SHA512` with 100,000 iterations and per-user salts (`src/lib/auth.ts`).
- **Data Privacy:** Sensitive patient contact details and medical histories are restricted to authenticated clinic staff.

## 2. Regulatory Compliance for Clinic in Latur, Maharashtra
1. **Digital Personal Data Protection Act, 2023 (DPDP Act, India):**
   - Retain patient records securely with role-based access.
   - Obtain patient consent prior to digital record creation.
2. **Clinical Establishments Standards:**
   - Maintain accurate daily OPD registers, consultation records, and prescription copies for general practice.
