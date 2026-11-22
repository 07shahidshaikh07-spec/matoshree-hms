// ============================================================================
// MATOSHREE CLINIC EMR — ASIA/KOLKATA (IST) & INR FORMATTING UTILITIES
// Clinic Location: Latur, Maharashtra, India (UTC+05:30)
// ============================================================================

export const CLINIC_TIMEZONE = "Asia/Kolkata";

export function formatISTDateTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "—";
  const d = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: CLINIC_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(d);
}

export function formatISTDate(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "—";
  const d = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: CLINIC_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(d);
}

export function formatISTTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "—";
  const d = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: CLINIC_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(d);
}

export function formatINR(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(isNaN(num as number) || num === null || num === undefined ? 0 : (num as number));
}
