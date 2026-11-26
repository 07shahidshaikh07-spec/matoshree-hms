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

// ----------------------------------------------------------------------------
// IST CALENDAR-DAY HELPERS
// The clinic's "day" always means an Asia/Kolkata calendar day, regardless of the
// timezone the server (Render = UTC unless TZ is set) or the browser runs in.
// Appointment dates are stored as the instant of IST midnight of the chosen date.
// ----------------------------------------------------------------------------

/** "YYYY-MM-DD" of the given instant, as seen on a wall clock in IST. */
export function istDateString(input: Date | string | number = new Date()): string {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

export function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(`${value}T00:00:00+05:30`).getTime());
}

/** Instant of 00:00 IST on the given YYYY-MM-DD date. */
export function istDayStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+05:30`);
}

/** [start, end) instants covering one IST calendar day (defaults to today). */
export function istDayRange(dateStr?: string): { start: Date; end: Date } {
  const start = istDayStart(dateStr && isValidDateString(dateStr) ? dateStr : istDateString());
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
