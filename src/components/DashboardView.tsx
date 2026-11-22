"use client";

import React from "react";
import { formatINR, formatISTTime, formatISTDate } from "@/lib/timezone";
import {
  Users,
  Calendar,
  AlertCircle,
  IndianRupee,
  UserPlus,
  Stethoscope,
  PlusCircle,
  Receipt,
  Clock,
  ArrowRight,
  CheckCircle2,
  Hourglass
} from "lucide-react";

interface DashboardViewProps {
  data: {
    summaryCards: {
      todayPatientsCount: number;
      todayAppointmentsCount: number;
      pendingPaymentsAmount: number;
      todayCollectionTotal: number;
      cashCollection: number;
      upiCollection: number;
      otherCollection: number;
    };
    todayVisits: any[];
    upcomingAppointments: any[];
  } | null;
  loading: boolean;
  onQuickAction: (action: "register_patient" | "new_opd_visit" | "new_appointment" | "create_bill") => void;
  onOpenConsultation: (visit: any) => void;
  onOpenPatientProfile: (patientId: string) => void;
  onConvertAppointment: (appointmentId: string) => void;
  currentUserRole: string;
}

export function DashboardView({
  data,
  loading,
  onQuickAction,
  onOpenConsultation,
  onOpenPatientProfile,
  onConvertAppointment,
  currentUserRole
}: DashboardViewProps) {
  if (loading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#258B7C] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Loading Matoshree Clinic live dashboard...</p>
        </div>
      </div>
    );
  }

  const { summaryCards, todayVisits, upcomingAppointments } = data;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinic Daily Dashboard</h1>
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
            Real-time daily operations, OPD queue, appointments &amp; collections for Matoshree Clinic, Latur
          </p>
        </div>

        {/* Quick Actions (Prominent Buttons) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onQuickAction("register_patient")}
            type="button"
            className="flex items-center gap-1.5 bg-[#258B7C] hover:bg-[#1C6B5F] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Patient</span>
          </button>
          <button
            onClick={() => onQuickAction("new_opd_visit")}
            type="button"
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-[#258B7C] border border-[#258B7C] px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Stethoscope className="w-4 h-4" />
            <span>New OPD Visit</span>
          </button>
          <button
            onClick={() => onQuickAction("new_appointment")}
            type="button"
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Calendar className="w-4 h-4" />
            <span>New Appointment</span>
          </button>
          <button
            onClick={() => onQuickAction("create_bill")}
            type="button"
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Receipt className="w-4 h-4" />
            <span>Create Bill</span>
          </button>
        </div>
      </div>

      {/* Top Summary Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Patients */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Patients</span>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{summaryCards.todayPatientsCount}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">OPD visits &amp; appointments</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#E6F7F4] text-[#258B7C] flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Today's Appointments */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Appointments</span>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{summaryCards.todayAppointmentsCount}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Booked slots for today</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Pending Payments */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Payments</span>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{formatINR(summaryCards.pendingPaymentsAmount)}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Total uncollected balance</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Today's Collection */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Collection</span>
            <h3 className="text-2xl font-bold text-[#258B7C] mt-1">{formatINR(summaryCards.todayCollectionTotal)}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cash: {formatINR(summaryCards.cashCollection)} • UPI: {formatINR(summaryCards.upiCollection)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#E6F7F4] text-[#258B7C] flex items-center justify-center flex-shrink-0">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Section A & B */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section A: Today's OPD Visits (2 Columns on large) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-[#258B7C]" />
              <h2 className="font-bold text-sm text-slate-800">Today&apos;s OPD Visits &amp; Queue</h2>
              <span className="bg-[#E6F7F4] text-[#258B7C] text-[11px] font-bold px-2 py-0.5 rounded-full">
                {todayVisits.length}
              </span>
            </div>
            <button
              onClick={() => onQuickAction("new_opd_visit")}
              type="button"
              className="text-xs font-semibold text-[#258B7C] hover:underline"
            >
              + Add Visit
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            {todayVisits.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No OPD visits registered yet today. Click &quot;New OPD Visit&quot; to queue a patient.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F9FA] text-slate-500 font-semibold border-b border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-3.5">Token</th>
                    <th className="py-2.5 px-3.5">Patient Details</th>
                    <th className="py-2.5 px-3.5">Assigned Doctor</th>
                    <th className="py-2.5 px-3.5">Visit Time</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayVisits.map((visit) => {
                    const isWaiting = visit.status === "WAITING";
                    const isInConsult = visit.status === "IN_CONSULTATION";
                    const isCompleted = visit.status === "COMPLETED";

                    return (
                      <tr key={visit.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-3.5 font-bold text-slate-700">
                          #{visit.tokenNumber}
                        </td>
                        <td className="py-3 px-3.5">
                          <button
                            onClick={() => onOpenPatientProfile(visit.patientId)}
                            className="font-bold text-slate-900 hover:text-[#258B7C] text-left block"
                          >
                            {visit.patient.fullName}
                          </button>
                          <span className="text-[11px] text-slate-400">
                            {visit.patient.patientId} • {visit.patient.age}Y/{visit.patient.gender}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-700 font-medium">
                          {visit.doctor.doctorName}
                        </td>
                        <td className="py-3 px-3.5 text-slate-500">
                          {visit.visitTime}
                        </td>
                        <td className="py-3 px-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                            {visit.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          {currentUserRole === "DOCTOR" ? (
                            <button
                              onClick={() => onOpenConsultation(visit)}
                              type="button"
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                isCompleted
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                  : "bg-[#258B7C] hover:bg-[#1C6B5F] text-white shadow-sm"
                              }`}
                            >
                              {isCompleted ? "View Rx / EMR" : "Consult"}
                            </button>
                          ) : (
                            <button
                              onClick={() => onOpenPatientProfile(visit.patientId)}
                              type="button"
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            >
                              Profile
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Section B & D: Right Column */}
        <div className="space-y-6">
          {/* Section B: Upcoming Appointments */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-600" />
                <h2 className="font-bold text-sm text-slate-800">Upcoming Appointments</h2>
              </div>
              <button
                onClick={() => onQuickAction("new_appointment")}
                type="button"
                className="text-xs font-semibold text-[#258B7C] hover:underline"
              >
                + Book
              </button>
            </div>

            <div className="p-3">
              {upcomingAppointments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No upcoming appointments scheduled.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-[#F7F9FA] flex items-center justify-between transition"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {appt.patient.fullName}
                          </p>
                          {appt.reasonForVisit?.includes("[Online Booking]") && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#E6F7F4] text-[#258B7C] rounded border border-[#70CFBA]/40 flex-shrink-0">
                              🌐 Online
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {appt.doctor.doctorName} • <span className="font-semibold text-slate-700">{appt.slotTime}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">{formatISTDate(appt.appointmentDate)}</p>
                      </div>
                      <button
                        onClick={() => onConvertAppointment(appt.id)}
                        type="button"
                        title="Convert appointment to OPD visit"
                        className="flex-shrink-0 bg-white hover:bg-slate-100 text-[#258B7C] border border-[#258B7C] px-2.5 py-1 rounded-lg text-[11px] font-semibold transition"
                      >
                        Check-in (OPD)
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section D: Daily Collection Breakdown Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#258B7C]" />
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Daily Collection Summary
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Live DB Ledger</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600">Cash Collection:</span>
                <span className="font-bold text-slate-900">{formatINR(summaryCards.cashCollection)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600">UPI Collection:</span>
                <span className="font-bold text-slate-900">{formatINR(summaryCards.upiCollection)}</span>
              </div>
              {summaryCards.otherCollection > 0 && (
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-600">Other Modes:</span>
                  <span className="font-bold text-slate-900">{formatINR(summaryCards.otherCollection)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1.5 bg-[#E6F7F4] rounded-lg px-2.5 font-bold text-slate-900">
                <span>Total Collected Today:</span>
                <span className="text-[#258B7C] text-sm">{formatINR(summaryCards.todayCollectionTotal)}</span>
              </div>
              <div className="flex justify-between items-center py-1 text-amber-700 font-semibold px-2">
                <span>Total Pending Balance:</span>
                <span>{formatINR(summaryCards.pendingPaymentsAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
