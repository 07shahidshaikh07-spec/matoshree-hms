"use client";

import React, { useState } from "react";
import { formatISTDate, formatINR } from "@/lib/timezone";
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Calendar,
  AlertTriangle,
  FileText,
  Clock,
  Printer,
  ChevronRight,
  ArrowLeft,
  Edit,
  CheckCircle2,
  Stethoscope,
  Receipt
} from "lucide-react";

interface PatientsViewProps {
  patients: any[];
  onRefresh: () => void;
  onOpenConsultation: (visit: any) => void;
  onNewOpdVisitForPatient: (patient: any) => void;
  onBookAppointmentForPatient: (patient: any) => void;
  onPrintPrescription: (prescData: any) => void;
  onPrintReceipt: (receiptData: any) => void;
  currentUserRole?: string;
}

export function PatientsView({
  patients,
  onRefresh,
  onOpenConsultation,
  onNewOpdVisitForPatient,
  onBookAppointmentForPatient,
  onPrintPrescription,
  onPrintReceipt,
  currentUserRole = "DOCTOR"
}: PatientsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientDetails, setPatientDetails] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regForm, setRegForm] = useState({
    fullName: "",
    age: "",
    gender: "Male",
    mobileNumber: "",
    address: "",
    notes: ""
  });
  const [regError, setRegError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);
  const [submittingReg, setSubmittingReg] = useState(false);
  const [newlyRegisteredPatient, setNewlyRegisteredPatient] = useState<any | null>(null);

  // Edit Patient Modal State
  const [editingPatient, setEditingPatient] = useState<any | null>(null);

  // Filter patients by search query (Name, Mobile, Patient ID)
  const filteredPatients = (patients || []).filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (p?.fullName || "").toLowerCase().includes(q) ||
      (p?.patientId || "").toLowerCase().includes(q) ||
      (p?.mobileNumber || "").includes(q)
    );
  });

  // Load single patient profile with complete history
  const handleOpenProfile = async (id: string) => {
    setSelectedPatientId(id);
    setLoadingProfile(true);
    try {
      const res = await fetch(`/api/patients?id=${id}`);
      const json = await res.json();
      if (json.data) {
        setPatientDetails(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Submit Registration (<1 minute form)
  const handleRegisterSubmit = async (overrideDuplicates = false) => {
    setRegError(null);
    setSubmittingReg(true);

    try {
      const payload = {
        fullName: regForm.fullName.trim(),
        age: parseInt(regForm.age, 10),
        gender: regForm.gender,
        mobileNumber: regForm.mobileNumber.trim(),
        address: regForm.address ? regForm.address.trim() : null,
        notes: regForm.notes ? regForm.notes.trim() : null,
        overrideDuplicateWarning: overrideDuplicates
      };

      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (res.status === 409 && json.warning === "POTENTIAL_DUPLICATE_DETECTED") {
        setDuplicateWarning(json);
        setSubmittingReg(false);
        return;
      }

      if (!res.ok) {
        throw new Error(json.error || "Failed to register patient");
      }

      // Success
      setShowRegisterModal(false);
      setDuplicateWarning(null);
      setRegForm({
        fullName: "",
        age: "",
        gender: "Male",
        mobileNumber: "",
        address: "",
        notes: ""
      });
      onRefresh();
      // Prompt user with choice between OPD Walk-in Visit or Advance Appointment
      if (json.data) {
        setNewlyRegisteredPatient(json.data);
      }
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setSubmittingReg(false);
    }
  };

  // Edit Patient Details Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    try {
      const res = await fetch("/api/patients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPatient)
      });
      if (res.ok) {
        setEditingPatient(null);
        onRefresh();
        if (selectedPatientId) {
          handleOpenProfile(selectedPatientId);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-6">
      {/* If a patient profile is opened, show Profile View */}
      {selectedPatientId ? (
        <div className="space-y-6">
          {/* Back button and profile actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedPatientId(null);
                setPatientDetails(null);
              }}
              type="button"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Patient List</span>
            </button>

            {patientDetails && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingPatient(patientDetails)}
                  type="button"
                  className="flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
                <button
                  onClick={() => onNewOpdVisitForPatient(patientDetails)}
                  type="button"
                  className="flex items-center gap-1.5 bg-[#258B7C] hover:bg-[#1C6B5F] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>New OPD Visit</span>
                </button>
                <button
                  onClick={() => onBookAppointmentForPatient(patientDetails)}
                  type="button"
                  className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-[#258B7C] border border-[#258B7C] px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book Appt</span>
                </button>
              </div>
            )}
          </div>

          {loadingProfile || !patientDetails ? (
            <div className="p-12 text-center text-slate-500">Loading complete patient medical record...</div>
          ) : (
            <div className="space-y-6">
              {/* Patient Header Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#E6F7F4] text-[#258B7C] flex items-center justify-center font-bold text-2xl flex-shrink-0">
                    {patientDetails.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-slate-900">{patientDetails.fullName}</h2>
                      <span className="bg-[#E6F7F4] text-[#258B7C] border border-[#70CFBA]/40 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        {patientDetails.patientId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-4">
                      <span>
                        Age/Gender: <strong>{patientDetails.age} Yrs / {patientDetails.gender}</strong>
                      </span>
                      <span>
                        Mobile: <strong>{patientDetails.mobileNumber}</strong>
                      </span>
                      <span>
                        Registered: <strong>{formatISTDate(patientDetails.createdAt)}</strong>
                      </span>
                    </p>
                    {patientDetails.address && (
                      <p className="text-xs text-slate-500 mt-0.5">Address: {patientDetails.address}</p>
                    )}
                    {patientDetails.notes && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-0.5 mt-1 inline-block">
                        Clinical Alert: {patientDetails.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Patient Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                  <button
                    type="button"
                    onClick={() => onNewOpdVisitForPatient(patientDetails)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#258B7C] hover:bg-[#1C6B5F] text-white rounded-xl text-xs font-semibold shadow-sm transition"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>New OPD Visit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onBookAppointmentForPatient(patientDetails)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#E6F7F4] text-[#258B7C] border border-[#258B7C] rounded-xl text-xs font-semibold shadow-sm transition"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Book Appointment</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPatient(patientDetails)}
                    className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition"
                    title="Edit Patient Details"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Patient Comprehensive Records Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. OPD Visits History (Latest First) */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-[#258B7C]" />
                      <h3 className="font-bold text-sm text-slate-800">OPD Visits &amp; Queue History</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {patientDetails.opdVisits?.length || 0} visits
                    </span>
                  </div>

                  {patientDetails.opdVisits?.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No previous OPD visits recorded.</p>
                  ) : (
                    <div className="space-y-3">
                      {patientDetails.opdVisits.map((v: any) => (
                        <div
                          key={v.id}
                          className="p-3 rounded-xl border border-slate-100 bg-[#F7F9FA] flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-800">{v.visitNumber}</span>
                              <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.2 rounded font-semibold text-slate-600">
                                {v.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">
                              Doctor: <strong>{v.doctor?.doctorName}</strong> • {v.reasonForVisit || "General Visit"}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{formatISTDate(v.visitDate)} at {v.visitTime}</p>
                          </div>
                          {currentUserRole === "DOCTOR" && (
                            <button
                              onClick={() => onOpenConsultation(v)}
                              type="button"
                              className="text-xs font-semibold text-[#258B7C] hover:underline"
                            >
                              Open Consultation →
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Prescriptions & Medicines History */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#258B7C]" />
                      <h3 className="font-bold text-sm text-slate-800">Prescriptions &amp; Medicines</h3>
                    </div>
                  </div>

                  {patientDetails.consultations?.filter((c: any) => c.prescriptions?.length > 0).length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No finalized prescriptions on record.</p>
                  ) : (
                    <div className="space-y-3">
                      {patientDetails.consultations
                        ?.filter((c: any) => c.prescriptions?.length > 0)
                        .map((c: any) => (
                          <div
                            key={c.id}
                            className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-2 shadow-sm"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-[#258B7C]">
                                  {c.prescriptions[0]?.prescriptionNumber}
                                </span>
                                <span className="text-slate-500 ml-2">
                                  ({formatISTDate(c.consultationDate)})
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  onPrintPrescription({
                                    doctorName: c.doctor?.doctorName || "Dr. Vinod Korale",
                                    doctorSpecialty: c.doctor?.specialty,
                                    doctorReg: c.doctor?.registrationNumber,
                                    patient: patientDetails,
                                    consultation: c,
                                    prescriptionNumber: c.prescriptions[0]?.prescriptionNumber,
                                    medicines: c.prescriptions[0]?.items || []
                                  })
                                }
                                type="button"
                                className="flex items-center gap-1 text-[11px] font-semibold text-[#258B7C] hover:underline"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print / PDF</span>
                              </button>
                            </div>
                            <p className="text-xs font-semibold text-slate-800">Diagnosis: {c.diagnosis}</p>
                            <div className="bg-[#F7F9FA] p-2 rounded-lg text-xs space-y-1">
                              {c.prescriptions[0]?.items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-slate-700">
                                  <span>
                                    <strong>{item.medicineName}</strong> {item.strength && `(${item.strength})`} - {item.dosage}
                                  </span>
                                  <span className="text-[#258B7C] font-semibold">{item.frequency} for {item.duration}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* 3. Consultation Notes & Clinical Findings (Strictly Doctor Role Only) */}
                {currentUserRole === "DOCTOR" && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-sm text-slate-800">Doctor Clinical Notes &amp; Diagnoses</h3>
                      </div>
                      <span className="text-xs text-slate-400">{patientDetails.consultations?.length || 0} consultations</span>
                    </div>

                    {patientDetails.consultations?.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No consultation notes recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {patientDetails.consultations.map((c: any) => (
                          <div key={c.id} className="p-3.5 rounded-xl border border-slate-100 bg-[#F7F9FA] space-y-1 text-xs">
                            <div className="flex justify-between items-center text-slate-500 text-[11px] pb-1 border-b border-slate-200">
                              <span>Dr. {c.doctor?.doctorName}</span>
                              <span>{formatISTDate(c.consultationDate)}</span>
                            </div>
                            <p className="text-slate-800">
                              <strong>Chief Complaint:</strong> {c.chiefComplaint}
                            </p>
                            <p className="text-slate-800">
                              <strong>Diagnosis:</strong> <span className="text-[#258B7C] font-bold">{c.diagnosis}</span>
                            </p>
                            {c.vitals && (
                              <p className="text-slate-600 text-[11px]">
                                BP: {c.vitals.bloodPressureSys}/{c.vitals.bloodPressureDia} mmHg • Pulse: {c.vitals.pulseRateBpm} bpm • Temp: {c.vitals.temperatureF}°F
                              </p>
                            )}
                            {c.adviceInstructions && (
                              <p className="text-slate-600 text-[11px] italic">Advice: {c.adviceInstructions}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Bills & Payment History */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-bold text-sm text-slate-800">Billing &amp; Payments Ledger</h3>
                    </div>
                    <span className="text-xs text-slate-400">{patientDetails.bills?.length || 0} bills</span>
                  </div>

                  {patientDetails.bills?.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No bills generated for this patient.</p>
                  ) : (
                    <div className="space-y-3">
                      {patientDetails.bills.map((b: any) => (
                        <div key={b.id} className="p-3 rounded-xl border border-slate-100 bg-[#F7F9FA] space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">{b.billNumber}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                b.paymentStatus === "PAID"
                                  ? "bg-[#E6F7F4] text-[#258B7C]"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {b.paymentStatus}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Total: {formatINR(b.totalAmount)}</span>
                            <span>Paid: {formatINR(b.paidAmount)}</span>
                            <span className={b.balanceDue > 0 ? "font-bold text-amber-600" : "text-slate-600"}>
                              Balance: {formatINR(b.balanceDue)}
                            </span>
                          </div>
                          {b.payments?.length > 0 && (
                            <div className="pt-1 border-t border-slate-200/60 flex justify-between items-center text-[11px]">
                              <span className="text-slate-500">
                                Receipt #{b.payments[0]?.receiptNumber} ({b.payments[0]?.paymentMethod})
                              </span>
                              <button
                                onClick={() =>
                                  onPrintReceipt({
                                    receiptNumber: b.payments[0]?.receiptNumber,
                                    billNumber: b.billNumber,
                                    paymentDate: b.payments[0]?.receivedAt,
                                    patient: patientDetails,
                                    doctorName: b.doctor?.doctorName,
                                    consultationCharges: b.consultationCharges,
                                    additionalCharges: b.additionalCharges,
                                    additionalChargesNotes: b.additionalChargesNotes,
                                    discountAmount: b.discountAmount,
                                    totalAmount: b.totalAmount,
                                    paidAmount: b.paidAmount,
                                    balanceDue: b.balanceDue,
                                    currentPayment: b.payments[0]
                                  })
                                }
                                type="button"
                                className="text-[#258B7C] font-semibold hover:underline flex items-center gap-1"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Receipt</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Patient List Main View */
        <div className="space-y-6">
          {/* Header & Registration Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Directory</h1>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                    currentUserRole === "RECEPTIONIST"
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-teal-50 border-teal-200 text-teal-800"
                  }`}
                >
                  {currentUserRole === "RECEPTIONIST" ? "Reception Window" : "Doctor Window"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Search, register, and review complete patient histories for Matoshree Clinic
              </p>
            </div>
            <button
              onClick={() => {
                setShowRegisterModal(true);
                setDuplicateWarning(null);
                setRegError(null);
              }}
              type="button"
              className="flex items-center gap-2 bg-[#258B7C] hover:bg-[#1C6B5F] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register New Patient</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patients by Name, Mobile Number (10 digits), or Patient ID (e.g. MC-2026-0001)..."
              className="w-full text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                type="button"
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Patients Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {filteredPatients.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No matching patients found. Click &quot;Register New Patient&quot; to create a new profile.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F9FA] text-slate-500 font-semibold border-b border-slate-200/80">
                    <tr>
                      <th className="py-3 px-4">Patient ID</th>
                      <th className="py-3 px-4">Patient Name</th>
                      <th className="py-3 px-4">Age / Gender</th>
                      <th className="py-3 px-4">Mobile Number</th>
                      <th className="py-3 px-4">Last Visit</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-bold text-[#258B7C]">{p.patientId}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleOpenProfile(p.id)}
                            type="button"
                            className="font-bold text-slate-900 hover:text-[#258B7C] text-left block"
                          >
                            {p.fullName}
                          </button>
                          {p.address && <span className="text-[11px] text-slate-400 truncate block">{p.address}</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {p.age} Yrs / {p.gender}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{p.mobileNumber}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {p.lastVisitDate ? formatISTDate(p.lastVisitDate) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenProfile(p.id)}
                              type="button"
                              className="text-xs font-semibold text-slate-700 hover:text-[#258B7C] px-2.5 py-1 rounded-lg border border-slate-200 hover:border-[#258B7C] transition"
                            >
                              Profile
                            </button>
                            <button
                              onClick={() => onNewOpdVisitForPatient(p)}
                              type="button"
                              title="Start today's walk-in OPD visit"
                              className="text-xs font-semibold bg-[#258B7C] hover:bg-[#1C6B5F] text-white px-2.5 py-1 rounded-lg shadow-sm transition"
                            >
                              OPD Visit
                            </button>
                            <button
                              onClick={() => onBookAppointmentForPatient(p)}
                              type="button"
                              title="Book advance appointment"
                              className="text-xs font-semibold text-[#258B7C] hover:bg-[#E6F7F4] border border-[#258B7C] px-2.5 py-1 rounded-lg transition"
                            >
                              Book
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: RAPID PATIENT REGISTRATION (<1 MINUTE) */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#258B7C]" />
                <h3 className="font-bold text-base text-slate-900">Register New Patient</h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                type="button"
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {regError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            {/* DUPLICATE WARNING MODAL OVERLAY */}
            {duplicateWarning && (
              <div className="mt-4 p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Existing Patient Match Found</span>
                </div>
                <p className="text-[11px] text-amber-900">
                  {duplicateWarning.message}
                </p>
                <div className="bg-white p-2 rounded-lg border border-amber-200 text-xs space-y-1">
                  {duplicateWarning.duplicates?.map((dup: any) => (
                    <div key={dup.id} className="flex justify-between items-center text-slate-700">
                      <span>
                        <strong>{dup.fullName}</strong> ({dup.patientId}) - {dup.mobileNumber}
                      </span>
                      <button
                        onClick={() => {
                          setShowRegisterModal(false);
                          handleOpenProfile(dup.id);
                        }}
                        type="button"
                        className="text-[#258B7C] font-semibold text-[11px] hover:underline"
                      >
                        Open Profile
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setDuplicateWarning(null)}
                    type="button"
                    className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs"
                  >
                    Cancel / Edit
                  </button>
                  <button
                    onClick={() => handleRegisterSubmit(true)}
                    type="button"
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Proceed Anyway
                  </button>
                </div>
              </div>
            )}

            {!duplicateWarning && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRegisterSubmit(false);
                }}
                className="mt-4 space-y-3"
              >
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.fullName}
                    onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                    placeholder="e.g. Ramesh Tukaram Patil"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                  />
                </div>

                {/* Age & Gender in 1 row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Age (Years) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="125"
                      value={regForm.age}
                      onChange={(e) => setRegForm({ ...regForm, age: e.target.value })}
                      placeholder="e.g. 45"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={regForm.gender}
                      onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number (10 digits) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={regForm.mobileNumber}
                    onChange={(e) => setRegForm({ ...regForm, mobileNumber: e.target.value.replace(/\D/g, "") })}
                    placeholder="e.g. 9822000000"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                  />
                </div>

                {/* Optional Address */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Address / Area <span className="text-[10px] text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={regForm.address}
                    onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                    placeholder="e.g. Shivaji Nagar, Latur"
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                  />
                </div>

                {/* Optional Clinical Notes */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Additional Notes <span className="text-[10px] text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={regForm.notes}
                    onChange={(e) => setRegForm({ ...regForm, notes: e.target.value })}
                    placeholder="e.g. Diabetic, Drug allergy, etc."
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setShowRegisterModal(false)}
                    type="button"
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReg}
                    className="px-4 py-2 bg-[#258B7C] hover:bg-[#1C6B5F] text-white text-xs font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                  >
                    {submittingReg ? "Registering..." : "Save Patient"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PATIENT DETAILS */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Edit Patient Details</h3>
              <button
                onClick={() => setEditingPatient(null)}
                type="button"
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingPatient.fullName}
                  onChange={(e) => setEditingPatient({ ...editingPatient, fullName: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    required
                    value={editingPatient.age}
                    onChange={(e) => setEditingPatient({ ...editingPatient, age: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={editingPatient.gender}
                    onChange={(e) => setEditingPatient({ ...editingPatient, gender: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={editingPatient.mobileNumber}
                  onChange={(e) => setEditingPatient({ ...editingPatient, mobileNumber: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Address</label>
                <input
                  type="text"
                  value={editingPatient.address || ""}
                  onChange={(e) => setEditingPatient({ ...editingPatient, address: e.target.value })}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Clinical Notes</label>
                <input
                  type="text"
                  value={editingPatient.notes || ""}
                  onChange={(e) => setEditingPatient({ ...editingPatient, notes: e.target.value })}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setEditingPatient(null)}
                  type="button"
                  className="px-3.5 py-1.5 text-xs text-slate-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#258B7C] text-white text-xs font-semibold rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: POST-REGISTRATION NEXT ACTION CHOICE */}
      {newlyRegisteredPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="text-center pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-[#E6F7F4] text-[#258B7C] flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Patient Registered Successfully!</h3>
              <p className="text-xs text-slate-500 mt-1">Select the next action for this patient</p>

              {/* Patient Badge */}
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <span className="font-bold text-slate-900">{newlyRegisteredPatient.fullName}</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-[#258B7C] font-semibold">{newlyRegisteredPatient.patientId}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">
                  {newlyRegisteredPatient.age} Yrs / {newlyRegisteredPatient.gender}
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              {/* Option 1: New OPD Visit (Today's Walk-in) */}
              <button
                type="button"
                onClick={() => {
                  const p = newlyRegisteredPatient;
                  setNewlyRegisteredPatient(null);
                  onNewOpdVisitForPatient(p);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border-2 border-[#258B7C] bg-[#E6F7F4]/40 hover:bg-[#E6F7F4] transition text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#258B7C] text-white flex items-center justify-center font-bold flex-shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1C6B5F] group-hover:text-[#258B7C]">
                      New OPD Visit (Today&apos;s Walk-in)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Create visit token &amp; send to doctor&apos;s queue right now
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#258B7C]" />
              </button>

              {/* Option 2: Book Advance Appointment */}
              <button
                type="button"
                onClick={() => {
                  const p = newlyRegisteredPatient;
                  setNewlyRegisteredPatient(null);
                  onBookAppointmentForPatient(p);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-[#258B7C] hover:bg-slate-50 transition text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-[#E6F7F4] text-slate-700 group-hover:text-[#258B7C] flex items-center justify-center font-bold flex-shrink-0 transition">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-[#258B7C]">
                      Book Advance Appointment
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Schedule future consultation date and time slot
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#258B7C]" />
              </button>

              {/* Option 3: View Patient Profile */}
              <button
                type="button"
                onClick={() => {
                  const p = newlyRegisteredPatient;
                  setNewlyRegisteredPatient(null);
                  handleOpenProfile(p.id);
                }}
                className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-semibold text-center hover:bg-slate-100 rounded-xl transition"
              >
                Just View Patient Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
