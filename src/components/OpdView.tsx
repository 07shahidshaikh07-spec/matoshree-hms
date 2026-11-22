"use client";

import React, { useState } from "react";
import { formatISTDate } from "@/lib/timezone";
import { PatientSelector } from "./PatientSelector";
import {
  Stethoscope,
  PlusCircle,
  Search,
  Hourglass,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Filter,
  UserCheck,
  Clock,
  UserPlus
} from "lucide-react";

interface OpdViewProps {
  visits: any[];
  patients: any[];
  doctors: any[];
  onRefresh: () => void;
  onOpenConsultation: (visit: any) => void;
  onOpenPatientProfile: (patientId: string) => void;
  currentUserRole: string;
}

export function OpdView({
  visits,
  patients,
  doctors,
  onRefresh,
  onOpenConsultation,
  onOpenPatientProfile,
  currentUserRole
}: OpdViewProps) {
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);

  // New Visit Form State
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctors[0]?.id || "");
  const [reasonForVisit, setReasonForVisit] = useState("General OPD Consultation");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter Visits
  const filteredVisits = visits.filter((v) => {
    if (selectedDoctorFilter !== "ALL" && v.doctorId !== selectedDoctorFilter) return false;
    if (selectedStatusFilter !== "ALL" && v.status !== selectedStatusFilter) return false;
    return true;
  });

  // Filter Patients for Modal Search
  const patientSearchResults = patients.filter((p) => {
    if (!patientSearch.trim()) return false;
    const q = patientSearch.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.patientId.toLowerCase().includes(q) ||
      p.mobileNumber.includes(q)
    );
  });

  // Handle New OPD Visit Submission
  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setErrorMsg("Please select an existing patient.");
      return;
    }
    if (!selectedDoctorId) {
      setErrorMsg("Please select a consulting doctor.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/opd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          doctorId: selectedDoctorId,
          reasonForVisit
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create OPD visit");

      setShowNewVisitModal(false);
      setSelectedPatient(null);
      setPatientSearch("");
      setReasonForVisit("General OPD Consultation");
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Status Update (Waiting -> In Consultation -> Completed)
  const handleUpdateStatus = async (visitId: string, status: string) => {
    try {
      await fetch("/api/opd", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: visitId, status })
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">OPD / Daily Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage live patient waiting tokens, doctor assignments, and active consultations
          </p>
        </div>

        <button
          onClick={() => {
            setShowNewVisitModal(true);
            setSelectedPatient(null);
            setPatientSearch("");
            setErrorMsg(null);
            if (doctors.length > 0 && !selectedDoctorId) {
              setSelectedDoctorId(doctors[0].id);
            }
          }}
          type="button"
          className="flex items-center gap-2 bg-[#258B7C] hover:bg-[#1C6B5F] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New OPD Visit</span>
        </button>
      </div>

      {/* Filter Strip */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Doctor Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Doctor:</span>
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.doctorName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="WAITING">Waiting (Queue)</option>
              <option value="IN_CONSULTATION">In Consultation</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <span className="text-slate-400 font-medium">
          Showing {filteredVisits.length} visits today
        </span>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {filteredVisits.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No OPD visits match the selected criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9FA] text-slate-500 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Token #</th>
                  <th className="py-3 px-4">Visit Number</th>
                  <th className="py-3 px-4">Patient Name &amp; ID</th>
                  <th className="py-3 px-4">Assigned Doctor</th>
                  <th className="py-3 px-4">Visit Time</th>
                  <th className="py-3 px-4">Reason for Visit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisits.map((v) => {
                  const isWaiting = v.status === "WAITING";
                  const isInConsult = v.status === "IN_CONSULTATION";
                  const isCompleted = v.status === "COMPLETED";

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <span className="w-7 h-7 rounded-lg bg-[#E6F7F4] text-[#258B7C] font-bold flex items-center justify-center text-xs">
                          {v.tokenNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                        {v.visitNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onOpenPatientProfile(v.patientId)}
                          type="button"
                          className="font-bold text-slate-900 hover:text-[#258B7C] text-left block"
                        >
                          {v.patient.fullName}
                        </button>
                        <span className="text-[11px] text-slate-400">
                          {v.patient.patientId} • {v.patient.age}Y/{v.patient.gender} • {v.patient.mobileNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {v.doctor.doctorName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {v.visitTime}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                        {v.reasonForVisit || "General Consultation"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isWaiting
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : isInConsult
                              ? "bg-sky-50 text-sky-700 border border-sky-200"
                              : isCompleted
                              ? "bg-[#E6F7F4] text-[#258B7C] border border-[#70CFBA]/40"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isWaiting && <Hourglass className="w-2.5 h-2.5" />}
                          {isCompleted && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {v.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isWaiting && (
                            <button
                              onClick={() => handleUpdateStatus(v.id, "IN_CONSULTATION")}
                              type="button"
                              className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-semibold transition"
                            >
                              Call In
                            </button>
                          )}
                          <button
                            onClick={() => onOpenConsultation(v)}
                            type="button"
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition shadow-sm ${
                              isCompleted
                                ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                : "bg-[#258B7C] hover:bg-[#1C6B5F] text-white"
                            }`}
                          >
                            {isCompleted ? "View EMR" : "Consult"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL: NEW OPD VISIT (Simple 5-step quick flow) */}
      {showNewVisitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-[#258B7C]" />
                <h3 className="font-bold text-base text-slate-900">New OPD Visit</h3>
              </div>
              <button
                onClick={() => setShowNewVisitModal(false)}
                type="button"
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateVisit} className="mt-4 space-y-4">
              {/* Step 1: Search & Select Patient with Dropdown & Quick Register */}
              <PatientSelector
                patients={patients}
                selectedPatient={selectedPatient}
                onSelectPatient={(p) => setSelectedPatient(p)}
                onRefreshPatients={onRefresh}
                label="1. Search & Select Patient"
                required={true}
                placeholder="Type patient name, mobile, or ID to search..."
              />

              {/* Step 2: Select Consulting Doctor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. Consulting Doctor <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {doctors.map((doc) => {
                    const isSelected = selectedDoctorId === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDoctorId(doc.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? "bg-[#E6F7F4] border-[#258B7C] text-[#258B7C] font-bold"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <p className="text-xs">{doc.doctorName}</p>
                        <p className="text-[10px] font-normal text-slate-500">{doc.specialty}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Date & Time (Auto-filled) */}
              <div className="bg-[#F7F9FA] p-3 rounded-xl border border-slate-200 flex justify-between text-xs text-slate-600">
                <span>Date: <strong>{formatISTDate(new Date())}</strong></span>
                <span>Time: <strong>Current Live Clock</strong></span>
                <span>Initial Status: <strong className="text-amber-700">Waiting</strong></span>
              </div>

              {/* Step 4: Reason for Visit */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  4. Reason for Visit / Complaints
                </label>
                <input
                  type="text"
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                  placeholder="e.g. Fever, Cough, Routine Checkup, Follow-up"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowNewVisitModal(false)}
                  type="button"
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedPatient}
                  className="px-4 py-2 bg-[#258B7C] hover:bg-[#1C6B5F] text-white text-xs font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Queueing..." : "Save OPD Visit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
