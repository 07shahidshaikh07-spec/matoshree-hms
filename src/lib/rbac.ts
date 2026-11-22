// ============================================================================
// MATOSHREE CLINIC EMR — SERVER-SIDE ROLE-BASED ACCESS CONTROL (RBAC)
// Roles: DOCTOR (Dr. Vinod Korale & Dr. Vaishali Korale), RECEPTIONIST, ADMINISTRATOR
// Location: Latur, Maharashtra
// ============================================================================

export type StaffRoleType = "DOCTOR" | "RECEPTIONIST" | "ADMINISTRATOR";

export type ModuleKey =
  | "dashboard"
  | "patients"
  | "opd"
  | "appointments"
  | "billing"
  | "reports"
  | "settings";

export type PermissionAction =
  | "PATIENT_READ"
  | "PATIENT_WRITE"
  | "OPD_VISIT_CREATE"
  | "OPD_VISIT_MANAGE"
  | "APPOINTMENT_MANAGE"
  | "CONSULTATION_READ"
  | "CONSULTATION_WRITE"     // Strictly DOCTOR only
  | "CONSULTATION_FINALIZE"  // Strictly DOCTOR only
  | "PRESCRIPTION_CREATE"    // Strictly DOCTOR only
  | "PRESCRIPTION_FINALIZE"  // Strictly DOCTOR only
  | "BILLING_CREATE"
  | "BILLING_PAYMENT_RECORD"
  | "REPORTS_VIEW"
  | "SETTINGS_MANAGE";       // DOCTOR & ADMINISTRATOR

export const ROLE_MODULE_ACCESS: Record<StaffRoleType, ModuleKey[]> = {
  ADMINISTRATOR: [
    "dashboard",
    "patients",
    "opd",
    "appointments",
    "billing",
    "reports",
    "settings"
  ],
  DOCTOR: [
    "dashboard",
    "patients",
    "opd",
    "appointments",
    "billing",
    "reports",
    "settings"
  ],
  RECEPTIONIST: [
    "dashboard",
    "patients",
    "opd",
    "appointments",
    "billing"
  ]
};

export const ROLE_PERMISSIONS: Record<StaffRoleType, PermissionAction[]> = {
  ADMINISTRATOR: [
    "PATIENT_READ",
    "PATIENT_WRITE",
    "OPD_VISIT_CREATE",
    "OPD_VISIT_MANAGE",
    "APPOINTMENT_MANAGE",
    "CONSULTATION_READ",
    "CONSULTATION_WRITE",
    "CONSULTATION_FINALIZE",
    "PRESCRIPTION_CREATE",
    "PRESCRIPTION_FINALIZE",
    "BILLING_CREATE",
    "BILLING_PAYMENT_RECORD",
    "REPORTS_VIEW",
    "SETTINGS_MANAGE"
  ],
  DOCTOR: [
    "PATIENT_READ",
    "PATIENT_WRITE",
    "OPD_VISIT_CREATE",
    "OPD_VISIT_MANAGE",
    "APPOINTMENT_MANAGE",
    "CONSULTATION_READ",
    "CONSULTATION_WRITE",
    "CONSULTATION_FINALIZE",
    "PRESCRIPTION_CREATE",
    "PRESCRIPTION_FINALIZE",
    "BILLING_CREATE",
    "BILLING_PAYMENT_RECORD",
    "REPORTS_VIEW",
    "SETTINGS_MANAGE"
  ],
  RECEPTIONIST: [
    "PATIENT_READ",
    "PATIENT_WRITE",
    "OPD_VISIT_CREATE",
    "OPD_VISIT_MANAGE",
    "APPOINTMENT_MANAGE",
    "BILLING_CREATE",
    "BILLING_PAYMENT_RECORD"
  ]
};

export function hasPermission(role: StaffRoleType, permission: PermissionAction): boolean {
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(permission);
}

export function canAccessModule(role: StaffRoleType, moduleKey: ModuleKey): boolean {
  const allowed = ROLE_MODULE_ACCESS[role] || [];
  return allowed.includes(moduleKey);
}

export function assertPermission(role: StaffRoleType, permission: PermissionAction): void {
  if (!hasPermission(role, permission)) {
    const err = new Error(`Access Denied: Role '${role}' is not authorized to perform '${permission}'.`);
    (err as any).statusCode = 403;
    throw err;
  }
}
