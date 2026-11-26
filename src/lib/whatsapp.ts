// ============================================================================
// WhatsApp sharing helpers — appointment details in Marathi
// ============================================================================

const MR_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
const MR_MONTHS = [
  "जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून",
  "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"
];
const MR_WEEKDAYS = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];

export function toMarathiDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => MR_DIGITS[Number(d)]);
}

/** "2026-11-26" -> "२६ नोव्हेंबर २०२६, गुरुवार" */
export function marathiDate(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || "");
  if (!m) return dateStr || "";
  const [, y, mo, d] = m;
  // Weekday of a calendar date does not depend on timezone, so compute it in UTC.
  const weekday = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getUTCDay();
  return `${toMarathiDigits(Number(d))} ${MR_MONTHS[Number(mo) - 1]} ${toMarathiDigits(y)}, ${MR_WEEKDAYS[weekday]}`;
}

/** "10:30 AM" -> "सकाळी १०:३० वाजता" */
export function marathiTime(slot: string): string {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec((slot || "").trim());
  if (!m) return slot || "";
  const hour12 = Number(m[1]);
  const minutes = m[2];
  const isPm = m[3].toUpperCase() === "PM";
  const hour24 = (hour12 % 12) + (isPm ? 12 : 0);
  let part = "सकाळी";
  if (hour24 >= 12 && hour24 < 16) part = "दुपारी";
  else if (hour24 >= 16 && hour24 < 20) part = "सायंकाळी";
  else if (hour24 >= 20 || hour24 < 4) part = "रात्री";
  return `${part} ${toMarathiDigits(hour12)}:${toMarathiDigits(minutes)} वाजता`;
}

export interface AppointmentShareInput {
  clinicName?: string | null;
  addressLine?: string | null;
  contactPhone?: string | null;
  patientName: string;
  appointmentNumber: string;
  tokenNumber?: number | null;
  doctorName: string;
  /** YYYY-MM-DD (IST) */
  dateStr: string;
  slotTime: string;
  reason?: string | null;
}

export function buildAppointmentMarathiMessage(a: AppointmentShareInput): string {
  const clinic =
    !a.clinicName || /matoshree/i.test(a.clinicName) ? "मातोश्री क्लिनिक" : a.clinicName;
  const lines = [
    `🏥 *${clinic} — अपॉइंटमेंट निश्चित झाली*`,
    "",
    `रुग्णाचे नाव: *${a.patientName}*`,
    `अपॉइंटमेंट क्र.: *${a.appointmentNumber}*`
  ];
  if (a.tokenNumber) lines.push(`टोकन क्र.: *${toMarathiDigits(a.tokenNumber)}*`);
  lines.push(
    `डॉक्टर: *${a.doctorName}*`,
    `दिनांक: *${marathiDate(a.dateStr)}*`,
    `वेळ: *${marathiTime(a.slotTime)}*`
  );
  if (a.reason) lines.push(`कारण: ${a.reason}`);
  if (a.addressLine) lines.push(`📍 पत्ता: ${a.addressLine}`);
  if (a.contactPhone) lines.push(`📞 संपर्क: ${a.contactPhone}`);
  lines.push("", "कृपया आपल्या वेळेच्या १० मिनिटे आधी क्लिनिकमध्ये यावे.", "धन्यवाद 🙏");
  return lines.join("\n");
}

/** wa.me link. With a 10-digit Indian mobile it opens that patient's chat, otherwise a contact picker. */
export function whatsappUrl(message: string, mobile?: string | null): string {
  const digits = (mobile || "").replace(/\D/g, "");
  const target = digits.length === 10 ? `91${digits}` : digits.length === 12 && digits.startsWith("91") ? digits : "";
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}
