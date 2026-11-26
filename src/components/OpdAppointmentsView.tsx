"use client";

import React, { useState, useEffect } from "react";
import { formatISTDate, istDateString } from "@/lib/timezone";
import { PatientSelector } from "./PatientSelector";
import type { AppointmentSlipData } from "./AppointmentSlip";
import {
  Stethoscope,
  Calendar as CalendarIcon,
  PlusCircle,
  Hourglass,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Filter,
  UserCheck,
  Search,
  AlertCircle,
  QrCode,
  ExternalLink,
  Copy,
  Check,
  Printer
} from "lucide-react";

interface OpdAppointmentsViewProps {
  visits: any[];
  appointments: any[];
  patients: any[];
  doctors: any[];
  onRefresh: () => void;
  onOpenConsultation: (visit: any) => void;
  onOpenPatientProfile: (patientId: string) => void;
  onConvertAppointment: (appointmentId: string) => void;
  onAppointmentBooked?: (slip: AppointmentSlipData) => void;
  clinicSetting?: any;
  currentUserRole?: string;
  initialTab?: "opd" | "appointments";
  initialPatient?: any | null;
  initialPatientForAppointment?: any | null;
  initialBookingType?: "opd" | "appointment";
  autoOpenBookingModal?: boolean;
  onClearInitialPatient?: () => void;
}

export function OpdAppointmentsView({
  visits,
  appointments,
  patients,
  doctors,
  onRefresh,
  onOpenConsultation,
  onOpenPatientProfile,
  onConvertAppointment,
  onAppointmentBooked,
  currentUserRole = "DOCTOR",
  initialTab = "opd",
  initialPatient = null,
  initialPatientForAppointment = null,
  initialBookingType = "opd",
  autoOpenBookingModal = false,
  onClearInitialPatient
}: OpdAppointmentsViewProps) {
  // Active Tab: "opd" (Live OPD Queue) or "appointments" (Scheduled Appointments)
  const [activeTab, setActiveTab] = useState<"opd" | "appointments">(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // --------------------------------------------------------------------------
  // UNIFIED CREATION MODAL STATE (OPD VISIT OR ADVANCE APPOINTMENT)
  // --------------------------------------------------------------------------
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [modalType, setModalType] = useState<"opd" | "appointment">(initialBookingType || "opd");

  // Shared Form Fields
  const [selectedPatient, setSelectedPatient] = useState<any | null>(
    initialPatient || initialPatientForAppointment || null
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || "");
  const [reasonForVisit, setReasonForVisit] = useState("");

  // Appointment-Specific Fields
  const [apptDate, setApptDate] = useState(istDateString());
  const [apptSlotTime, setApptSlotTime] = useState("10:00 AM");

  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Time Slots for Appointments
  const timeSlots = [
    "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "01:00 PM", "05:00 PM", "05:30 PM",
    "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM"
  ];

  // Public Booking Portal Share Modal
  const [showSharePortalModal, setShowSharePortalModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [bookingUrl, setBookingUrl] = useState("/book");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBookingUrl(`${window.location.origin}/book`);
    }
  }, []);

  // --------------------------------------------------------------------------
  // FILTERS
  // --------------------------------------------------------------------------
  const [opdDoctorFilter, setOpdDoctorFilter] = useState("ALL");
  const [opdStatusFilter, setOpdStatusFilter] = useState("ALL");

  const [apptDoctorFilter, setApptDoctorFilter] = useState("ALL");
  const [apptStatusFilter, setApptStatusFilter] = useState("ALL");
  const [apptDateFilter, setApptDateFilter] = useState("");

  // Automatically open modal when incoming patient arrives or triggered
  useEffect(() => {
    const incomingPatient = initialPatient || initialPatientForAppointment;
    if (incomingPatient) {
      setSelectedPatient(incomingPatient);
      setModalType(initialBookingType || "opd");
      setActiveTab(initialBookingType === "appointment" ? "appointments" : "opd");
      setModalError(null);
      setShowBookingModal(true);
    } else if (autoOpenBookingModal) {
      setSelectedPatient(null);
      setModalType(initialBookingType || "opd");
      setActiveTab(initialBookingType === "appointment" ? "appointments" : "opd");
      setModalError(null);
      setShowBookingModal(true);
    }
  }, [initialPatient, initialPatientForAppointment, initialBookingType, autoOpenBookingModal]);

  // Keep default doctor updated if doctors list loads asynchronously
  useEffect(() => {
    if (doctors.length > 0 && !doctors.some((d) => d.id === selectedDoctorId)) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId]);

  // --------------------------------------------------------------------------
  // FILTERED LISTS
  // --------------------------------------------------------------------------
  const filteredVisits = visits.filter((v) => {
    if (opdDoctorFilter !== "ALL" && v.doctorId !== opdDoctorFilter) return false;
    if (opdStatusFilter !== "ALL" && v.status !== opdStatusFilter) return false;
    return true;
  });

  const filteredAppointments = appointments.filter((a) => {
    if (apptDoctorFilter !== "ALL" && a.doctorId !== apptDoctorFilter) return false;
    if (apptStatusFilter !== "ALL" && a.status !== apptStatusFilter) return false;
    if (apptDateFilter) {
      try {
        const d = a.appointmentDate ? new Date(a.appointmentDate) : null;
        if (!d || isNaN(d.getTime())) return false;
        const aDate = istDateString(d);
        if (aDate !== apptDateFilter) return false;
      } catch {
        return false;
      }
    }
    return true;
  });

  // Summary Counts
  const waitingVisitsCount = visits.filter((v) => v.status === "WAITING").length;
  const inConsultVisitsCount = visits.filter((v) => v.status === "IN_CONSULTATION").length;
  const completedVisitsCount = visits.filter((v) => v.status === "COMPLETED").length;
  const scheduledApptsCount = appointments.filter(
    (a) => a.status === "SCHEDULED" || a.status === "CONFIRMED"
  ).length;

  // --------------------------------------------------------------------------
  // HANDLERS: MODAL & BOOKING (UNIFIED FOR OPD & APPOINTMENTS)
  // --------------------------------------------------------------------------
  const handleCloseModal = () => {
    setShowBookingModal(false);
    setSelectedPatient(null);
    setReasonForVisit("");
    setModalError(null);
    if (onClearInitialPatient) onClearInitialPatient();
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setModalError("Please search and select a patient.");
      return;
    }
    if (!selectedDoctorId) {
      setModalError("Please select a consulting doctor.");
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      if (modalType === "opd") {
        // Create Live Walk-in OPD Visit
        const res = await fetch("/api/opd", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: selectedPatient.id,
            doctorId: selectedDoctorId,
            reasonForVisit: reasonForVisit.trim() || null
          })
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to create OPD visit");

        handleCloseModal();
        setActiveTab("opd");
        onRefresh();
      } else {
        // Book Advance Appointment
        const res = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: selectedPatient.id,
            doctorId: selectedDoctorId,
            appointmentDate: apptDate,
            slotTime: apptSlotTime,
            reasonForVisit: reasonForVisit.trim() || null
          })
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to book appointment");

        handleCloseModal();
        setActiveTab("appointments");
        onRefresh();
        // Show the printable slip (token number + Marathi WhatsApp share) straight away
        if (json.data && onAppointmentBooked) onAppointmentBooked(buildSlip(json.data, apptDate));
      }
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const buildSlip = (a: any, dateStr?: string): AppointmentSlipData => ({
    appointmentNumber: a.appointmentNumber,
    tokenNumber: a.tokenNumber ?? null,
    dateStr: dateStr || istDateString(a.appointmentDate),
    slotTime: a.slotTime,
    reasonForVisit: a.reasonForVisit,
    patient: {
      patientId: a.patient.patientId,
      fullName: a.patient.fullName,
      age: a.patient.age,
      gender: a.patient.gender,
      mobileNumber: a.patient.mobileNumber
    },
    doctor: {
      doctorName: a.doctor.doctorName,
      specialty: a.doctor.specialty,
      qualification: a.doctor.qualification,
      roomNumber: a.doctor.roomNumber
    }
  });

  const handleUpdateVisitStatus = async (id: string, status: string) => {
    try {
      await fetch("/api/opd", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAppointmentStatus = async (id: string, status: string) => {
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              OPD &amp; Appointments
            </h1>
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
            Manage live clinic visits, patient consultation queue, and advance scheduled appointments
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setShowSharePortalModal(true)}
            type="button"
            title="Share online booking link or print QR poster for clinic reception"
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <QrCode className="w-4 h-4 text-emerald-700" />
            <span>Patient Booking Portal / QR</span>
          </button>

          <button
            onClick={() => {
              setSelectedPatient(null);
              setReasonForVisit("");
              setModalType("opd");
              setModalError(null);
              setShowBookingModal(true);
            }}
            type="button"
            className="flex items-center gap-1.5 bg-[#258B7C] hover:bg-[#1C6B5F] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New OPD Visit</span>
          </button>

          <button
            onClick={() => {
              setSelectedPatient(null);
              setReasonForVisit("");
              setModalType("appointment");
              setModalError(null);
              setShowBookingModal(true);
            }}
            type="button"
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-[#258B7C] border border-[#258B7C] px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          {/* Tab 1: Live OPD Queue */}
          <button
            type="button"
            onClick={() => setActiveTab("opd")}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition ${
              activeTab === "opd"
                ? "border-[#258B7C] text-[#258B7C]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Today&apos;s OPD Queue (Live)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "opd"
                  ? "bg-[#E6F7F4] text-[#258B7C]"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {visits.length}
            </span>
          </button>

          {/* Tab 2: Scheduled Appointments */}
          <button
            type="button"
            onClick={() => setActiveTab("appointments")}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition ${
              activeTab === "appointments"
                ? "border-[#258B7C] text-[#258B7C]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Scheduled Appointments</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "appointments"
                  ? "bg-[#E6F7F4] text-[#258B7C]"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {scheduledApptsCount}
            </span>
          </button>
        </div>

        {/* Live Status Summary Pill */}
        <div className="hidden md:flex items-center gap-3 text-xs">
          {activeTab === "opd" ? (
            <>
              <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Waiting: {waitingVisitsCount}
              </span>
              <span className="flex items-center gap-1.5 text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg font-semibold">
                In Consult: {inConsultVisitsCount}
              </span>
              <span className="flex items-center gap-1.5 text-[#258B7C] bg-[#E6F7F4] px-2.5 py-1 rounded-lg font-semibold">
                Completed: {completedVisitsCount}
              </span>
            </>
          ) : (
            <span className="text-slate-500 font-medium">
              Total Scheduled: {appointments.length}
            </span>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: TODAY'S OPD QUEUE (LIVE VISITS) */}
      {/* ==================================================================== */}
      {activeTab === "opd" && (
        <div className="space-y-4">
          {/* OPD Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-semibold">Doctor:</span>
                <select
                  value={opdDoctorFilter}
                  onChange={(e) => setOpdDoctorFilter(e.target.value)}
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
                  value={opdStatusFilter}
                  onChange={(e) => setOpdStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="WAITING">Waiting</option>
                  <option value="IN_CONSULTATION">In Consultation</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <span className="text-slate-400 font-medium">
              Showing {filteredVisits.length} visits
            </span>
          </div>

          {/* OPD Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {filteredVisits.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-700 text-sm">No OPD Visits Found</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Click &ldquo;New OPD Visit&rdquo; above to register a patient for consultation today.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F9FA] text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4 w-16">Token</th>
                      <th className="py-3.5 px-4">Visit #</th>
                      <th className="py-3.5 px-4">Patient</th>
                      <th className="py-3.5 px-4">Doctor</th>
                      <th className="py-3.5 px-4">Time</th>
                      <th className="py-3.5 px-4">Reason for Visit</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVisits.map((v) => {
                      const isWaiting = v.status === "WAITING";
                      const isInConsult = v.status === "IN_CONSULTATION";
                      const isCompleted = v.status === "COMPLETED";

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/60 transition">
                          {/* Token Number */}
                          <td className="py-3.5 px-4">
                            <span className="w-7 h-7 rounded-lg bg-[#E6F7F4] text-[#258B7C] font-bold flex items-center justify-center text-xs">
                              {v.tokenNumber}
                            </span>
                          </td>

                          {/* Visit ID */}
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                            {v.visitNumber}
                          </td>

                          {/* Patient */}
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

                          {/* Doctor */}
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {v.doctor.doctorName}
                          </td>

                          {/* Time */}
                          <td className="py-3.5 px-4 text-slate-600 font-medium">
                            {v.visitTime}
                          </td>

                          {/* Reason */}
                          <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                            {v.reasonForVisit || "General Consultation"}
                          </td>

                          {/* Status Badge */}
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

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isWaiting && (
                                <button
                                  onClick={() => handleUpdateVisitStatus(v.id, "IN_CONSULTATION")}
                                  type="button"
                                  className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-semibold transition"
                                >
                                  Call In
                                </button>
                              )}
                              {currentUserRole === "DOCTOR" && (
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
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: SCHEDULED APPOINTMENTS */}
      {/* ==================================================================== */}
      {activeTab === "appointments" && (
        <div className="space-y-4">
          {/* Appointment Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-semibold">Doctor:</span>
                <select
                  value={apptDoctorFilter}
                  onChange={(e) => setApptDoctorFilter(e.target.value)}
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
                  value={apptStatusFilter}
                  onChange={(e) => setApptStatusFilter(e.target.value)}
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

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-semibold">Date:</span>
                <input
                  type="date"
                  value={apptDateFilter}
                  onChange={(e) => setApptDateFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-medium text-slate-800 focus:outline-none"
                />
                {apptDateFilter && (
                  <button
                    onClick={() => setApptDateFilter("")}
                    type="button"
                    className="text-slate-400 hover:text-slate-600 text-[10px]"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <span className="text-slate-400 font-medium">
              Showing {filteredAppointments.length} appointments
            </span>
          </div>

          {/* Appointments Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {filteredAppointments.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-700 text-sm">No Appointments Found</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Click &ldquo;Book Appointment&rdquo; above to schedule a patient consultation.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F9FA] text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Token</th>
                      <th className="py-3.5 px-4">Apt #</th>
                      <th className="py-3.5 px-4">Patient</th>
                      <th className="py-3.5 px-4">Doctor</th>
                      <th className="py-3.5 px-4">Date &amp; Time</th>
                      <th className="py-3.5 px-4">Reason</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAppointments.map((a) => {
                      const isConvertible =
                        a.status === "SCHEDULED" || a.status === "CONFIRMED";

                      return (
                        <tr key={a.id} className="hover:bg-slate-50/60 transition">
                          {/* Appointment Token */}
                          <td className="py-3.5 px-4">
                            {a.tokenNumber ? (
                              <span className="w-7 h-7 rounded-lg bg-[#E6F7F4] text-[#258B7C] font-bold flex items-center justify-center text-xs">
                                {a.tokenNumber}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Appointment Number */}
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                            <div>{a.appointmentNumber}</div>
                            {a.reasonForVisit?.includes("[Online Booking]") && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-[#E6F7F4] text-[#258B7C] rounded-md border border-[#70CFBA]/40 mt-1">
                                🌐 Online
                              </span>
                            )}
                          </td>

                          {/* Patient Details */}
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => onOpenPatientProfile(a.patientId)}
                              type="button"
                              className="font-bold text-slate-900 hover:text-[#258B7C] text-left block"
                            >
                              {a.patient.fullName}
                            </button>
                            <span className="text-[11px] text-slate-400">
                              {a.patient.patientId} • {a.patient.mobileNumber}
                            </span>
                          </td>

                          {/* Doctor */}
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {a.doctor.doctorName}
                          </td>

                          {/* Date & Time Slot */}
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-800">
                              {formatISTDate(a.appointmentDate)}
                            </p>
                            <span className="text-[11px] text-[#258B7C] font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {a.slotTime}
                            </span>
                          </td>

                          {/* Reason */}
                          <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                            {a.reasonForVisit?.replace("[Online Booking]", "").trim() || "Routine Follow-up"}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                a.status === "CONFIRMED"
                                  ? "bg-[#E6F7F4] text-[#258B7C] border border-[#70CFBA]/40"
                                  : a.status === "SCHEDULED"
                                  ? "bg-sky-50 text-sky-700 border border-sky-200"
                                  : a.status === "COMPLETED"
                                  ? "bg-slate-100 text-slate-700"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {a.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {onAppointmentBooked && (
                                <button
                                  onClick={() => onAppointmentBooked(buildSlip(a))}
                                  type="button"
                                  title="Print appointment slip / share on WhatsApp"
                                  className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>Slip</span>
                                </button>
                              )}
                              {isConvertible && !a.opdVisit && (
                                <button
                                  onClick={() => onConvertAppointment(a.id)}
                                  type="button"
                                  title="Convert to live OPD visit and add to queue"
                                  className="flex items-center gap-1 px-2.5 py-1 bg-[#258B7C] hover:bg-[#1C6B5F] text-white rounded-lg text-xs font-semibold shadow-xs transition"
                                >
                                  <span>Convert to OPD</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}

                              {/* Status Dropdown */}
                              <select
                                value={a.status}
                                onChange={(e) =>
                                  handleUpdateAppointmentStatus(a.id, e.target.value)
                                }
                                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700 focus:outline-none"
                              >
                                <option value="SCHEDULED">Scheduled</option>
                                <option value="CONFIRMED">Confirmed</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                                <option value="NO_SHOW">No Show</option>
                              </select>
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
        </div>
      )}

      {/* ==================================================================== */}
      {/* UNIFIED MODAL: NEW OPD VISIT (WALK-IN) OR BOOK ADVANCE APPOINTMENT */}
      {/* ==================================================================== */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 animate-in fade-in-50 zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E6F7F4] text-[#258B7C] flex items-center justify-center font-bold">
                  {modalType === "opd" ? (
                    <Stethoscope className="w-5 h-5" />
                  ) : (
                    <CalendarIcon className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {modalType === "opd" ? "New OPD Visit" : "Book Patient Appointment"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {modalType === "opd"
                      ? "Generate live walk-in consultation token for today"
                      : "Schedule advance clinic appointment slot"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                type="button"
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1 rounded-lg hover:bg-slate-100"
              >
                &times;
              </button>
            </div>

            {/* Seamless In-Modal Segmented Toggle: Switch between OPD & Appointment anytime */}
            <div className="mt-4 grid grid-cols-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setModalType("opd");
                  setModalError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
                  modalType === "opd"
                    ? "bg-white text-[#258B7C] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>New OPD Visit (Today)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalType("appointment");
                  setModalError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
                  modalType === "appointment"
                    ? "bg-white text-[#258B7C] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Book Appointment</span>
              </button>
            </div>

            {/* Error Notification */}
            {modalError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitBooking} className="mt-4 space-y-3.5 text-xs">
              {/* Select Patient (Shared & preserved when toggling between OPD & Appointment) */}
              <PatientSelector
                patients={patients}
                selectedPatient={selectedPatient}
                onSelectPatient={(p) => setSelectedPatient(p)}
                onRefreshPatients={onRefresh}
                label="Select Patient"
                required={true}
                placeholder="Type patient name, mobile, or ID to search..."
              />

              {/* Consulting Doctor Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Consulting Doctor <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {doctors.map((doc) => {
                    const isSelected = selectedDoctorId === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDoctorId(doc.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? "bg-[#E6F7F4] border-[#258B7C] text-[#258B7C] font-bold"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <p className="text-xs">{doc.doctorName}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{doc.specialty}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Type-Specific Fields */}
              {modalType === "opd" ? (
                /* OPD Walk-in Info Banner */
                <div className="p-3 bg-[#E6F7F4]/50 border border-[#70CFBA]/40 rounded-xl text-xs text-slate-700 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#1C6B5F]">Queue Date &amp; Time:</span>
                    <span className="ml-1 text-slate-900 font-bold">Today (Immediate Walk-in)</span>
                  </div>
                  <span className="px-2 py-0.5 bg-[#258B7C] text-white font-bold rounded-md text-[10px]">
                    Live Queue
                  </span>
                </div>
              ) : (
                /* Appointment Date & Time Slot */
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Appointment Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={apptDate}
                      onChange={(e) => setApptDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Time Slot <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={apptSlotTime}
                      onChange={(e) => setApptSlotTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C] font-medium"
                    >
                      {timeSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Reason for Visit */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Visit
                </label>
                <input
                  type="text"
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                  placeholder={
                    modalType === "opd"
                      ? "e.g. Fever, Cough, Regular BP checkup"
                      : "e.g. Follow-up consultation, Report review"
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedPatient}
                  className="px-5 py-2.5 bg-[#258B7C] hover:bg-[#1C6B5F] text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting
                    ? modalType === "opd"
                      ? "Generating Token..."
                      : "Booking..."
                    : modalType === "opd"
                    ? "Generate OPD Token"
                    : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: PATIENT BOOKING PORTAL LINK & RECEPTION QR POSTER */}
      {/* ==================================================================== */}
      {showSharePortalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 animate-in fade-in-50 zoom-in-95 duration-150 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E6F7F4] text-[#258B7C] flex items-center justify-center font-bold">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Patient Booking Portal</h3>
                  <p className="text-[11px] text-slate-500">Matoshree Clinic Online Appointment Link &amp; QR</p>
                </div>
              </div>
              <button
                onClick={() => setShowSharePortalModal(false)}
                type="button"
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1 rounded-lg hover:bg-slate-100"
              >
                &times;
              </button>
            </div>

            {/* Direct Link Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Patient Booking Website Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={bookingUrl}
                  className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700 select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(bookingUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-3.5 py-2.5 bg-[#258B7C] hover:bg-[#1C6B5F] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* QR Card Preview for Reception Desk */}
            <div className="p-4 bg-[#F7F9FA] rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="inline-block p-4 bg-white rounded-2xl shadow-xs border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(bookingUrl)}`}
                  alt="Booking QR Code"
                  className="w-36 h-36 mx-auto"
                />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-900">Scan to Book Doctor Consultation</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Matoshree Clinic • Dr. Vinod Korale &amp; Dr. Vaishali Korale</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <a
                href="/book"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Patient Portal</span>
              </a>
              <button
                type="button"
                onClick={() => setShowSharePortalModal(false)}
                className="px-5 py-2 bg-[#258B7C] hover:bg-[#1C6B5F] text-white rounded-xl text-xs font-bold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
