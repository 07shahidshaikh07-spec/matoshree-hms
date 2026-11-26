"use client";

import React from "react";
import { formatISTDate, istDayStart } from "@/lib/timezone";
import { buildAppointmentMarathiMessage, whatsappUrl } from "@/lib/whatsapp";
import { MatoshreePrintableHeader } from "./PrintableDocuments";
import { Printer, CheckCircle2, Share2 } from "lucide-react";

export interface AppointmentSlipData {
  appointmentNumber: string;
  tokenNumber?: number | null;
  /** YYYY-MM-DD (IST calendar date) */
  dateStr: string;
  slotTime: string;
  reasonForVisit?: string | null;
  patient: {
    patientId: string;
    fullName: string;
    age?: number | null;
    gender?: string | null;
    mobileNumber: string;
  };
  doctor: {
    doctorName: string;
    specialty?: string | null;
    qualification?: string | null;
    roomNumber?: string | null;
  };
}

export function PrintableAppointmentSlipModal({
  clinicInfo,
  slip,
  onClose
}: {
  clinicInfo?: any;
  slip: AppointmentSlipData;
  onClose: () => void;
}) {
  const reason = (slip.reasonForVisit || "").replace("[Online Booking]", "").trim();
  const message = buildAppointmentMarathiMessage({
    clinicName: clinicInfo?.clinicName,
    addressLine: clinicInfo?.addressLine,
    contactPhone: clinicInfo?.contactPhone,
    patientName: slip.patient.fullName,
    appointmentNumber: slip.appointmentNumber,
    tokenNumber: slip.tokenNumber,
    doctorName: slip.doctor.doctorName,
    dateStr: slip.dateStr,
    slotTime: slip.slotTime,
    reason
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CheckCircle2 className="w-5 h-5 text-[#258B7C]" />
            <span>Appointment Booked ({slip.appointmentNumber})</span>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          >
            Close
          </button>
        </div>

        <div id="printable-appointment-slip" className="p-2 text-xs bg-white">
          <MatoshreePrintableHeader
            documentTitle="APPOINTMENT SLIP"
            subtitle={`Appt No: ${slip.appointmentNumber}`}
            clinicInfo={clinicInfo}
          />

          {slip.tokenNumber ? (
            <div className="flex items-center justify-between bg-[#E6F7F4] border border-[#70CFBA]/60 rounded-xl px-4 py-3 my-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1d6f63]">
                Token Number (टोकन क्र.)
              </span>
              <span className="text-3xl font-extrabold text-[#258B7C] leading-none">{slip.tokenNumber}</span>
            </div>
          ) : null}

          <div className="bg-[#F7F9FA] rounded-lg p-3 my-3 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Patient Name</span>
              <span className="font-bold text-slate-800">{slip.patient.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Patient ID</span>
              <span className="font-semibold text-slate-700">{slip.patient.patientId}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Age / Gender</span>
              <span className="text-slate-700">
                {slip.patient.age ?? "—"} Yrs / {slip.patient.gender || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Mobile</span>
              <span className="text-slate-700">{slip.patient.mobileNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Consulting Doctor</span>
              <span className="font-bold text-slate-800">{slip.doctor.doctorName}</span>
              {slip.doctor.specialty && <span className="block text-slate-500">{slip.doctor.specialty}</span>}
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Date &amp; Time</span>
              <span className="font-bold text-slate-800">{formatISTDate(istDayStart(slip.dateStr))}</span>
              <span className="block font-semibold text-[#258B7C]">{slip.slotTime}</span>
            </div>
            {slip.doctor.roomNumber && (
              <div className="col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Room</span>
                <span className="text-slate-700">{slip.doctor.roomNumber}</span>
              </div>
            )}
            {reason && (
              <div className="col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Reason for Visit</span>
                <span className="text-slate-700">{reason}</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-600 border-t border-slate-200 pt-3">
            Please arrive 10 minutes before your slot and show this slip at the reception desk.
            <br />
            कृपया आपल्या वेळेच्या १० मिनिटे आधी क्लिनिकमध्ये यावे आणि ही चिठ्ठी रिसेप्शनवर दाखवावी.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 mt-2 border-t border-slate-100 print:hidden">
          <a
            href={whatsappUrl(message, slip.patient.mobileNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp (मराठी)</span>
          </a>
          <button
            onClick={() => window.print()}
            type="button"
            className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#258B7C] hover:bg-[#1C6B5F] text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Slip</span>
          </button>
        </div>
      </div>
    </div>
  );
}
