"use client";

import React, { useState, useEffect } from "react";
import { formatISTDate } from "@/lib/timezone";
import { PatientSelector } from "@/components/PatientSelector";
import {
  Calendar as CalendarIcon,
  PlusCircle,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Filter,
  AlertCircle
} from "lucide-react";

interface AppointmentsViewProps {
  appointments: any[];
  patients: any[];
  doctors: any[];
  onRefresh: () => void;
  onConvertAppointment: (appointmentId: string) => void;
  onOpenPatientProfile: (patientId: string) => void;
  initialPatient?: any | null;
}

export function AppointmentsView({
  appointments,
  patients,
  doctors,
  onRefresh,
  onConvertAppointment,
  onOpenPatientProfile,
  initialPatient
}: AppointmentsViewProps) {
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any | null>(initialPatient || null);
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || "");
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [slotTime, setSlotTime] = useState("10:00 AM");
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Automatically open appointment modal when arriving with an initial/newly registered patient
  useEffect(() => {
    if (initialPatient) {
      setSelectedPatient(initialPatient);
      setShowModal(true);
    }
  }, [initialPatient]);

  // Available Time Slots
  const timeSlots = [
    "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "01:00 PM", "05:00 PM", "05:30 PM",
    "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM"
  ];

  // Filtered Appointments
  const filtered = appointments.filter((a) => {
    if (selectedDoctorFilter !== "ALL" && a.doctorId !== selectedDoctorFilter) return false;
    if (selectedStatusFilter !== "ALL" && a.status !== selectedStatusFilter) return false;
    return true;
  });

  // Patient Search Results for Modal
  const searchResults = patients.filter((p) => {
    if (!patientSearch.trim()) return false;
    const q = patientSearch.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.patientId.toLowerCase().includes(q) ||
      p.mobileNumber.includes(q)
    );
  });

  // Handle Booking Submit
  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setErrorMsg("Please select a patient.");
      return;
    }
    if (!selectedDoctorId) {
      setErrorMsg("Please select a doctor.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          doctorId: selectedDoctorId,
          appointmentDate,
          slotTime,
          reasonForVisit: reasonForVisit.trim() || null
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to book appointment");

      setShowModal(false);
      setSelectedPatient(null);
      setPatientSearch("");
      setReasonForVisit("");
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Status Update
  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Schedule future visits, prevent double-bookings, and convert appointments to OPD with 1 click
          </p>
        </div>

        <button
          onClick={() => {
            setShowModal(true);
            setErrorMsg(null);
            if (doctors.length > 0 && !selectedDoctorId) {
              setSelectedDoctorId(doctors[0].id);
            }
          }}
          type="button"
          className="flex items-center gap-2 bg-[#258B7C] hover:bg-[#1C6B5F] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
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

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No Show</option>
            </select>
          </div>
        </div>

        <span className="text-slate-400 font-medium">Total: {filtered.length} appointments</span>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No appointments scheduled. Click &quot;New Appointment&quot; to book a patient slot.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9FA] text-slate-500 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Appt #</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Date &amp; Slot</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((appt) => {
                  const isScheduled = appt.status === "SCHEDULED";
                  const isConfirmed = appt.status === "CONFIRMED";
                  const isCompleted = appt.status === "COMPLETED";
                  const isCancelled = appt.status === "CANCELLED";

                  return (
                    <tr key={appt.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {appt.appointmentNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onOpenPatientProfile(appt.patientId)}
                          type="button"
                          className="font-bold text-slate-900 hover:text-[#258B7C] text-left block"
                        >
                          {appt.patient.fullName}
                        </button>
                        <span className="text-[11px] text-slate-400">
                          {appt.patient.patientId} • {appt.patient.mobileNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {appt.doctor.doctorName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {formatISTDate(appt.appointmentDate)}
                        </span>
                        <span className="text-[11px] text-[#258B7C] font-bold">{appt.slotTime}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {appt.reasonForVisit || "Routine Consultation"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isScheduled
                              ? "bg-slate-100 text-slate-700"
                              : isConfirmed
                              ? "bg-sky-50 text-sky-700 border border-sky-200"
                              : isCompleted
                              ? "bg-[#E6F7F4] text-[#258B7C] border border-[#70CFBA]/40"
                              : isCancelled
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {appt.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(isScheduled || isConfirmed) && (
                            <>
                              <button
                                onClick={() => onConvertAppointment(appt.id)}
                                type="button"
                                className="px-2.5 py-1 bg-[#258B7C] hover:bg-[#1C6B5F] text-white rounded-lg text-xs font-semibold shadow-sm transition"
                                title="Convert to live OPD visit right now"
                              >
                                Check-in (OPD)
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(appt.id, "CANCELLED")}
                                type="button"
                                className="px-2 py-1 text-slate-400 hover:text-rose-600 text-xs font-medium"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {isCompleted && (
                            <span className="text-[11px] text-slate-400 italic">Checked In</span>
                          )}
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

      {/* MODAL: BOOK APPOINTMENT */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#258B7C]" />
                <h3 className="font-bold text-base text-slate-900">Book Patient Appointment</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                type="button"
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleBook} className="mt-4 space-y-3.5 text-xs">
              {/* Enhanced Select Patient with Dropdown & Quick Register */}
              <PatientSelector
                patients={patients}
                selectedPatient={selectedPatient}
                onSelectPatient={(p) => setSelectedPatient(p)}
                onRefreshPatients={onRefresh}
                label="Select Patient"
                required={true}
                placeholder="Type patient name, mobile, or ID to search..."
              />

              {/* Select Doctor */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Doctor <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C] font-medium"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.doctorName} ({d.specialty})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Slot Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Time Slot <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={slotTime}
                    onChange={(e) => setSlotTime(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                  >
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Visit</label>
                <input
                  type="text"
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                  placeholder="e.g. Follow-up consultation, Report review"
                  className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowModal(false)}
                  type="button"
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedPatient}
                  className="px-4 py-2 bg-[#258B7C] hover:bg-[#1C6B5F] text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Booking..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
