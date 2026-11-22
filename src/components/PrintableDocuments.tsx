"use client";

import React from "react";
import { formatISTDateTime, formatISTDate, formatINR } from "@/lib/timezone";
import { Printer, Download, CheckCircle2 } from "lucide-react";

export interface PrintableHeaderProps {
  documentTitle: string;
  subtitle?: string;
  clinicInfo?: {
    clinicName?: string;
    location?: string;
    addressLine?: string;
    contactPhone?: string;
    email?: string;
  };
}

export function MatoshreePrintableHeader({ documentTitle, subtitle, clinicInfo }: PrintableHeaderProps) {
  const clinicName = clinicInfo?.clinicName || "MATOSHREE CLINIC";
  const address = clinicInfo?.addressLine || "Station Road, Latur, Maharashtra 413512";
  const phone = clinicInfo?.contactPhone || "+91 2382 250000";
  const email = clinicInfo?.email || "contact@matoshreeclinic.in";

  return (
    <div className="border-b-2 border-[#258B7C] pb-4 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#258B7C] text-white flex items-center justify-center font-bold text-xl tracking-wider shadow-sm flex-shrink-0">
          MC
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#258B7C] tracking-tight">{clinicName}</h1>
          <p className="text-xs font-semibold text-slate-700">
            Dr. Vinod Korale &amp; Dr. Vaishali Korale • General Practice &amp; Family Care
          </p>
          <p className="text-[11px] text-slate-500">
            {address} | Ph: {phone} | {email}
          </p>
        </div>
      </div>
      <div className="text-right">
        <span className="inline-block bg-[#E6F7F4] text-[#258B7C] border border-[#70CFBA]/50 px-3 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider">
          {documentTitle}
        </span>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        <p className="text-[10px] text-slate-400 mt-0.5">Printed: {formatISTDateTime(new Date())}</p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// PRINTABLE PRESCRIPTION COMPONENT
// ----------------------------------------------------------------------------
export interface PrescriptionPrintProps {
  clinicInfo?: any;
  doctorName: string;
  doctorSpecialty?: string;
  doctorReg?: string;
  patient: {
    patientId: string;
    fullName: string;
    age: number;
    gender: string;
    mobileNumber: string;
    address?: string | null;
  };
  consultation: {
    consultationDate: Date | string;
    chiefComplaint?: string;
    diagnosis: string;
    adviceInstructions?: string | null;
    followUpDate?: Date | string | null;
    vitals?: {
      bloodPressureSys?: number | null;
      bloodPressureDia?: number | null;
      pulseRateBpm?: number | null;
      temperatureF?: number | null;
      spo2Percent?: number | null;
      weightKg?: number | null;
      heightCm?: number | null;
    } | null;
  };
  prescriptionNumber: string;
  medicines: Array<{
    medicineName: string;
    strength?: string | null;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string | null;
  }>;
  onClose?: () => void;
}

export function PrintablePrescriptionModal({
  clinicInfo,
  doctorName,
  doctorSpecialty,
  doctorReg,
  patient,
  consultation,
  prescriptionNumber,
  medicines,
  onClose
}: PrescriptionPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 border border-slate-200 my-8">
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CheckCircle2 className="w-5 h-5 text-[#258B7C]" />
            <span>Official Prescription ({prescriptionNumber})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-1.5 bg-[#258B7C] hover:bg-[#1C6B5F] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            {onClose && (
              <button
                onClick={onClose}
                type="button"
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium transition"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Printable Prescription Body */}
        <div id="printable-prescription-content" className="p-2">
          <MatoshreePrintableHeader
            documentTitle="CLINICAL PRESCRIPTION"
            subtitle={`Rx No: ${prescriptionNumber}`}
            clinicInfo={clinicInfo}
          />

          {/* Doctor Info */}
          <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100 text-slate-700">
            <div>
              <span className="font-bold text-[#258B7C] text-sm">{doctorName}</span>
              {doctorSpecialty && <span className="ml-2 text-slate-600">• {doctorSpecialty}</span>}
            </div>
            <div>
              {doctorReg && <span>Reg No: {doctorReg} | </span>}
              <span>Date: {formatISTDate(consultation.consultationDate)}</span>
            </div>
          </div>

          {/* Patient Details Strip */}
          <div className="bg-[#F7F9FA] border border-slate-200 rounded-lg p-3 my-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Patient Name</span>
              <span className="font-bold text-slate-800">{patient.fullName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Patient ID</span>
              <span className="font-semibold text-slate-700">{patient.patientId}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Age / Gender</span>
              <span className="font-semibold text-slate-700">
                {patient.age} Yrs / {patient.gender}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Mobile</span>
              <span className="font-semibold text-slate-700">{patient.mobileNumber}</span>
            </div>
          </div>

          {/* Vitals Strip (if recorded) */}
          {consultation.vitals && (
            <div className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 my-2 text-xs flex flex-wrap gap-4 text-slate-700">
              {consultation.vitals.bloodPressureSys && (
                <div>
                  <span className="text-slate-400 font-medium">BP: </span>
                  <span className="font-bold text-slate-800">
                    {consultation.vitals.bloodPressureSys}/{consultation.vitals.bloodPressureDia || "—"} mmHg
                  </span>
                </div>
              )}
              {consultation.vitals.pulseRateBpm && (
                <div>
                  <span className="text-slate-400 font-medium">Pulse: </span>
                  <span className="font-bold text-slate-800">{consultation.vitals.pulseRateBpm} bpm</span>
                </div>
              )}
              {consultation.vitals.temperatureF && (
                <div>
                  <span className="text-slate-400 font-medium">Temp: </span>
                  <span className="font-bold text-slate-800">{consultation.vitals.temperatureF} °F</span>
                </div>
              )}
              {consultation.vitals.spo2Percent && (
                <div>
                  <span className="text-slate-400 font-medium">SpO2: </span>
                  <span className="font-bold text-slate-800">{consultation.vitals.spo2Percent}%</span>
                </div>
              )}
              {consultation.vitals.weightKg && (
                <div>
                  <span className="text-slate-400 font-medium">Weight: </span>
                  <span className="font-bold text-slate-800">{consultation.vitals.weightKg} kg</span>
                </div>
              )}
            </div>
          )}

          {/* Diagnosis & Chief Complaint */}
          <div className="my-3 text-xs space-y-1.5 border-b border-slate-100 pb-3">
            {consultation.chiefComplaint && (
              <p>
                <span className="font-bold text-slate-700">Chief Complaint: </span>
                <span className="text-slate-800">{consultation.chiefComplaint}</span>
              </p>
            )}
            <p>
              <span className="font-bold text-[#258B7C]">Diagnosis: </span>
              <span className="font-semibold text-slate-900 bg-[#E6F7F4] px-2 py-0.5 rounded">
                {consultation.diagnosis}
              </span>
            </p>
          </div>

          {/* Rx Medicines Table */}
          <div className="my-4">
            <div className="flex items-center gap-2 mb-2 font-bold text-sm text-[#258B7C]">
              <span>℞ Prescribed Medicines</span>
            </div>
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-[#F7F9FA] text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10">#</th>
                  <th className="py-2.5 px-3">Medicine Name &amp; Strength</th>
                  <th className="py-2.5 px-3">Timing &amp; Frequency (वेळ व प्रमाण)</th>
                  <th className="py-2.5 px-3 w-28">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicines.map((med, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 text-xs">
                        {med.medicineName}
                      </span>
                      {med.strength && (
                        <span className="ml-1.5 font-medium text-slate-600">({med.strength})</span>
                      )}
                      {med.instructions && (
                        <div className="text-[10px] text-slate-500 italic mt-0.5">
                          {med.instructions}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#258B7C]">{med.frequency}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{med.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Advice & Instructions */}
          {consultation.adviceInstructions && (
            <div className="my-3 text-xs bg-[#F7F9FA] p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700 block mb-1">Doctor&apos;s Advice &amp; Instructions:</span>
              <p className="text-slate-800 whitespace-pre-wrap">{consultation.adviceInstructions}</p>
            </div>
          )}

          {/* Follow-up & Footer Signature */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex items-end justify-between text-xs">
            <div>
              {consultation.followUpDate ? (
                <div className="bg-[#E6F7F4] text-[#258B7C] border border-[#70CFBA]/40 px-3 py-1.5 rounded-lg inline-block">
                  <span className="font-bold">Next Follow-Up Date: </span>
                  <span>{formatISTDate(consultation.followUpDate)}</span>
                </div>
              ) : (
                <span className="text-slate-500 italic">Follow-up as required / SOS</span>
              )}
            </div>

            <div className="text-center w-48">
              <div className="border-b border-slate-400 h-10 mb-1"></div>
              <p className="font-bold text-slate-800">{doctorName}</p>
              <p className="text-[11px] text-slate-500">Authorized Clinician Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// PRINTABLE BILL RECEIPT COMPONENT
// ----------------------------------------------------------------------------
export interface ReceiptPrintProps {
  clinicInfo?: any;
  receiptNumber: string;
  billNumber: string;
  paymentDate: Date | string;
  patient: {
    patientId: string;
    fullName: string;
    age: number;
    gender: string;
    mobileNumber: string;
  };
  doctorName?: string | null;
  consultationCharges: number;
  additionalCharges: number;
  additionalChargesNotes?: string | null;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currentPayment: {
    amount: number;
    paymentMethod: string;
    transactionRef?: string | null;
  };
  onClose?: () => void;
}

export function PrintableReceiptModal({
  clinicInfo,
  receiptNumber,
  billNumber,
  paymentDate,
  patient,
  doctorName,
  consultationCharges,
  additionalCharges,
  additionalChargesNotes,
  discountAmount,
  totalAmount,
  paidAmount,
  balanceDue,
  currentPayment,
  onClose
}: ReceiptPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 my-8">
        {/* Modal Action Bar */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CheckCircle2 className="w-5 h-5 text-[#258B7C]" />
            <span>Payment Receipt ({receiptNumber})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-1.5 bg-[#258B7C] hover:bg-[#1C6B5F] text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </button>
            {onClose && (
              <button
                onClick={onClose}
                type="button"
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium transition"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Printable Body */}
        <div id="printable-receipt-content" className="p-2 text-xs">
          <MatoshreePrintableHeader
            documentTitle="PAYMENT RECEIPT"
            subtitle={`Receipt No: ${receiptNumber}`}
            clinicInfo={clinicInfo}
          />

          <div className="flex justify-between text-slate-600 py-1 border-b border-slate-100 text-[11px]">
            <span>Bill No: <strong className="text-slate-800">{billNumber}</strong></span>
            <span>Date &amp; Time: <strong className="text-slate-800">{formatISTDateTime(paymentDate)}</strong></span>
          </div>

          {/* Patient Details */}
          <div className="bg-[#F7F9FA] rounded-lg p-3 my-3 border border-slate-200 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Patient Name</span>
              <span className="font-bold text-slate-800">{patient.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Patient ID</span>
              <span className="font-semibold text-slate-700">{patient.patientId}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Age / Gender</span>
              <span className="text-slate-700">{patient.age} Yrs / {patient.gender}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Consulting Doctor</span>
              <span className="font-semibold text-slate-800">{doctorName || "Dr. Vinod Korale"}</span>
            </div>
          </div>

          {/* Itemized Charges */}
          <div className="border border-slate-200 rounded-lg overflow-hidden my-3">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9FA] text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2 px-3 text-slate-800">Doctor Consultation Charges</td>
                  <td className="py-2 px-3 text-right font-medium">{formatINR(consultationCharges)}</td>
                </tr>
                {additionalCharges > 0 && (
                  <tr>
                    <td className="py-2 px-3 text-slate-800">
                      Additional Charges {additionalChargesNotes && <span className="text-slate-500">({additionalChargesNotes})</span>}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">{formatINR(additionalCharges)}</td>
                  </tr>
                )}
                {discountAmount > 0 && (
                  <tr className="text-emerald-700">
                    <td className="py-2 px-3">Discount Applied</td>
                    <td className="py-2 px-3 text-right font-medium">- {formatINR(discountAmount)}</td>
                  </tr>
                )}
                <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                  <td className="py-2.5 px-3">Total Amount</td>
                  <td className="py-2.5 px-3 text-right text-sm">{formatINR(totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Details */}
          <div className="bg-[#E6F7F4] border border-[#70CFBA]/40 rounded-lg p-3 my-3 text-xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-800 font-bold text-sm">
              <span>Amount Paid This Receipt:</span>
              <span className="text-[#258B7C]">{formatINR(currentPayment.amount)}</span>
            </div>
            <div className="flex justify-between text-slate-600 text-[11px]">
              <span>Payment Mode: <strong>{currentPayment.paymentMethod}</strong></span>
              {currentPayment.transactionRef && (
                <span>Ref: <strong>{currentPayment.transactionRef}</strong></span>
              )}
            </div>
            <div className="flex justify-between text-slate-700 pt-1 border-t border-[#70CFBA]/20">
              <span>Total Paid to Date: {formatINR(paidAmount)}</span>
              <span className={balanceDue > 0 ? "font-bold text-amber-700" : "font-bold text-emerald-700"}>
                Balance Due: {formatINR(balanceDue)}
              </span>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end text-[11px] text-slate-500">
            <div>
              <p>Thank you for choosing Matoshree Clinic.</p>
              <p className="text-[10px] text-slate-400">Computer-generated receipt • No physical signature required</p>
            </div>
            <div className="text-center w-36">
              <div className="border-b border-slate-300 h-8 mb-1"></div>
              <p className="font-semibold text-slate-700">Receptionist / Cashier</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
