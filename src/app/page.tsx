"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar, NavModule } from "../components/Sidebar";
import { DashboardView } from "../components/DashboardView";
import { PatientsView } from "../components/PatientsView";
import { OpdAppointmentsView } from "../components/OpdAppointmentsView";
import { ConsultationWorkspace } from "../components/ConsultationWorkspace";
import { BillingView } from "../components/BillingView";
import { ReportsView } from "../components/ReportsView";
import { SettingsView } from "../components/SettingsView";
import { LoginModal } from "../components/LoginModal";
import {
  PrintablePrescriptionModal,
  PrintableReceiptModal
} from "../components/PrintableDocuments";
import { PrintableAppointmentSlipModal, AppointmentSlipData } from "../components/AppointmentSlip";
import { UserCheck, Menu } from "lucide-react";

// How often open screens silently re-read the clinic data (ms)
const AUTO_REFRESH_MS = 15000;

export default function AppHome() {
  const [activeModule, setActiveModule] = useState<NavModule>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Signed-in staff member (null until the server confirms the session cookie)
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [doctors, setDoctors] = useState<any[]>([]);
  const [clinicSetting, setClinicSetting] = useState<any | null>(null);

  // Application Data States
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Active Consultation Workspace State (if opening a specific visit)
  const [activeConsultationVisit, setActiveConsultationVisit] = useState<any | null>(null);

  // Modals State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [prescriptionPrintData, setPrescriptionPrintData] = useState<any | null>(null);
  const [receiptPrintData, setReceiptPrintData] = useState<any | null>(null);
  const [appointmentSlip, setAppointmentSlip] = useState<AppointmentSlipData | null>(null);

  // Patient Preselection for Appointment or OPD
  const [preselectedPatientForAppt, setPreselectedPatientForAppt] = useState<any | null>(null);
  const [preselectedBookingType, setPreselectedBookingType] = useState<"opd" | "appointment">("opd");
  const [autoOpenBookingModal, setAutoOpenBookingModal] = useState(false);
  const [opdAppointmentsTab, setOpdAppointmentsTab] = useState<"opd" | "appointments">("opd");

  // A doctor can only book / bill under their own name; front desk can pick either doctor.
  const visibleDoctors =
    currentUser?.role === "DOCTOR" && currentUser?.doctorProfile?.id
      ? doctors.filter((d) => d.id === currentUser.doctorProfile.id)
      : doctors;

  const refreshing = useRef(false);

  // 1. Ask the server who is signed in (the session lives in an httpOnly cookie)
  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setCurrentUser(json.user || null);
      } else {
        setCurrentUser(null);
      }
    } catch (e) {
      console.error("Session check failed:", e);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  const loadClinicMeta = useCallback(async () => {
    try {
      const resSettings = await fetch("/api/settings", { cache: "no-store" }).catch(() => null);
      if (resSettings && resSettings.ok) {
        const jsonSettings = await resSettings.json().catch(() => null);
        if (jsonSettings?.data) {
          setClinicSetting(jsonSettings.data.clinicSetting);
          setDoctors(jsonSettings.data.doctors || []);
        }
      }
    } catch (e) {
      console.error("Meta load error:", e);
    }
  }, []);

  const clearClinicData = useCallback(() => {
    setDashboardData(null);
    setPatients([]);
    setVisits([]);
    setAppointments([]);
    setBills([]);
    setActiveConsultationVisit(null);
    setPrescriptionPrintData(null);
    setReceiptPrintData(null);
    setAppointmentSlip(null);
  }, []);

  // 2. Fetch core clinic data. silent=true is used by the background auto-refresh (no spinner).
  const refreshAllData = useCallback(async (silent = false) => {
    if (refreshing.current) return;
    refreshing.current = true;
    if (!silent) setLoading(true);
    try {
      const [dashRes, patRes, opdRes, apptRes, billRes] = await Promise.all([
        fetch("/api/dashboard", { cache: "no-store" }).catch(() => null),
        fetch("/api/patients", { cache: "no-store" }).catch(() => null),
        fetch("/api/opd", { cache: "no-store" }).catch(() => null),
        fetch("/api/appointments", { cache: "no-store" }).catch(() => null),
        fetch("/api/billing", { cache: "no-store" }).catch(() => null)
      ]);

      // Session expired (or the account was disabled) -> back to the sign-in screen
      if ([dashRes, patRes, opdRes, apptRes, billRes].some((r) => r && r.status === 401)) {
        setCurrentUser(null);
        clearClinicData();
        return;
      }

      const [dashJson, patJson, opdJson, apptJson, billJson] = await Promise.all([
        dashRes && dashRes.ok ? dashRes.json().catch(() => null) : null,
        patRes && patRes.ok ? patRes.json().catch(() => null) : null,
        opdRes && opdRes.ok ? opdRes.json().catch(() => null) : null,
        apptRes && apptRes.ok ? apptRes.json().catch(() => null) : null,
        billRes && billRes.ok ? billRes.json().catch(() => null) : null
      ]);

      if (dashJson?.data) setDashboardData(dashJson.data);
      if (patJson?.data) setPatients(patJson.data);
      if (opdJson?.data) setVisits(opdJson.data);
      if (apptJson?.data) setAppointments(apptJson.data);
      if (billJson?.data?.bills) setBills(billJson.data.bills);
      setLastSynced(new Date());
    } catch (e) {
      console.error("Data refresh error:", e);
    } finally {
      refreshing.current = false;
      if (!silent) setLoading(false);
    }
  }, [clearClinicData]);

  // On first load: who am I?
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Once signed in (or after switching accounts) load the clinic + that user's own data
  const userId = currentUser?.id;
  useEffect(() => {
    if (!userId) return;
    clearClinicData();
    loadClinicMeta();
    refreshAllData();
  }, [userId, loadClinicMeta, refreshAllData, clearClinicData]);

  // Live updates: re-read data every few seconds and whenever the tab becomes visible again,
  // so new patients / bookings made at the other desk show up without pressing refresh.
  useEffect(() => {
    if (!userId) return;
    const tick = () => {
      if (document.visibilityState === "visible") refreshAllData(true);
    };
    const timer = window.setInterval(tick, AUTO_REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [userId, refreshAllData]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      /* cookie is cleared server-side when reachable; the screen locks regardless */
    }
    clearClinicData();
    setCurrentUser(null);
    setShowLoginModal(false);
  };

  // Guard Receptionist from accessing Reports, Settings, or Doctor's Consultation Workspace
  useEffect(() => {
    if (currentUser?.role === "RECEPTIONIST") {
      if (activeModule === "reports" || activeModule === "settings") {
        setActiveModule("dashboard");
      }
      if (activeConsultationVisit) {
        setActiveConsultationVisit(null);
      }
    }
  }, [currentUser, activeModule, activeConsultationVisit]);

  // Quick Action Handler from Dashboard
  const handleDashboardQuickAction = (action: string) => {
    if (action === "register_patient") {
      setActiveModule("patients");
    } else if (action === "new_opd_visit") {
      setPreselectedPatientForAppt(null);
      setPreselectedBookingType("opd");
      setOpdAppointmentsTab("opd");
      setAutoOpenBookingModal(true);
      setActiveModule("opd");
    } else if (action === "new_appointment") {
      setPreselectedPatientForAppt(null);
      setPreselectedBookingType("appointment");
      setOpdAppointmentsTab("appointments");
      setAutoOpenBookingModal(true);
      setActiveModule("opd");
    } else if (action === "create_bill") {
      setActiveModule("billing");
    }
  };

  // Convert Appointment to OPD Visit
  const handleConvertAppointmentToOpd = async (appointmentId: string) => {
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CONVERT_TO_OPD", appointmentId })
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        await refreshAllData();
        setOpdAppointmentsTab("opd");
        setActiveModule("opd");
      } else {
        alert(json.error || "Failed to convert appointment to OPD visit");
      }
    } catch (e) {
      console.error(e);
      alert("Could not reach the server. Please check your internet connection and try again.");
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#F7F9FA] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#258B7C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F7F9FA]">
        <LoginModal onLoggedIn={(u) => setCurrentUser(u)} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F7F9FA] text-[#1A202C]">
      {/* 7-Module Sidebar Navigation (Responsive Drawer for Tablet/Mobile) */}
      <Sidebar
        activeModule={activeModule}
        onSelectModule={(m) => {
          setActiveConsultationVisit(null);
          setActiveModule(m);
        }}
        currentUser={currentUser}
        onSwitchUserClick={() => setShowLoginModal(true)}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Workspace Top Bar with Window Indicator & Tablet Nav Toggle */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Tablet/Mobile Hamburger Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              type="button"
              className="lg:hidden p-2 -ml-1 text-slate-700 hover:text-[#258B7C] hover:bg-[#E6F7F4] rounded-xl transition border border-slate-200 shadow-2xs"
              aria-label="Open navigation menu"
              title="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Tablet Brand Logo (when sidebar is collapsed on tablet) */}
            <div className="lg:hidden flex items-center gap-2 mr-1">
              <div className="w-7 h-7 rounded-lg bg-[#258B7C] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                MC
              </div>
            </div>

            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Active Window:</span>
            {currentUser?.role === "RECEPTIONIST" ? (
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 bg-amber-50 border border-amber-300 text-amber-900 rounded-full text-[11px] sm:text-xs font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Reception Window</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 bg-[#E6F7F4] border border-[#70CFBA]/50 text-[#1d6f63] rounded-full text-[11px] sm:text-xs font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#258B7C] animate-pulse"></span>
                <span>Doctor Window</span>
              </div>
            )}
            <span className="text-xs font-medium text-slate-600 hidden md:inline truncate max-w-[180px]">
              • {currentUser?.fullName}
            </span>
            {lastSynced && (
              <span className="text-[10px] text-slate-400 hidden lg:inline" title="Data refreshes automatically">
                ● Live
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLoginModal(true)}
              type="button"
              className="text-xs font-semibold text-[#258B7C] hover:text-[#1d6f63] bg-[#E6F7F4] hover:bg-[#d4f2ec] px-3 sm:px-3.5 py-1.5 rounded-xl border border-[#70CFBA]/40 transition flex items-center gap-1.5 shadow-2xs"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Switch Window</span>
              <span className="sm:hidden">Switch</span>
            </button>
          </div>
        </header>

        {/* If Active in Consultation Workspace */}
        {activeConsultationVisit ? (
          <ConsultationWorkspace
            visit={activeConsultationVisit}
            onBack={() => setActiveConsultationVisit(null)}
            onRefresh={() => {
              refreshAllData(true);
              setActiveConsultationVisit(null);
            }}
            onPrintPrescription={(p) => setPrescriptionPrintData(p)}
            currentUserRole={currentUser?.role || "DOCTOR"}
            currentUserId={currentUser?.id || ""}
          />
        ) : (
          <>
            {activeModule === "dashboard" && (
              <DashboardView
                data={dashboardData}
                loading={loading}
                onQuickAction={handleDashboardQuickAction}
                onOpenConsultation={(v) => {
                  if (currentUser?.role === "DOCTOR") setActiveConsultationVisit(v);
                }}
                onOpenPatientProfile={(pId) => {
                  setActiveModule("patients");
                }}
                onConvertAppointment={handleConvertAppointmentToOpd}
                currentUserRole={currentUser?.role}
              />
            )}

            {activeModule === "patients" && (
              <PatientsView
                patients={patients}
                onRefresh={() => refreshAllData(true)}
                currentUserRole={currentUser?.role}
                onOpenConsultation={(v) => {
                  if (currentUser?.role === "DOCTOR") setActiveConsultationVisit(v);
                }}
                onNewOpdVisitForPatient={(p) => {
                  setPreselectedPatientForAppt(p);
                  setPreselectedBookingType("opd");
                  setOpdAppointmentsTab("opd");
                  setAutoOpenBookingModal(true);
                  setActiveModule("opd");
                }}
                onBookAppointmentForPatient={(p) => {
                  setPreselectedPatientForAppt(p);
                  setPreselectedBookingType("appointment");
                  setOpdAppointmentsTab("appointments");
                  setAutoOpenBookingModal(true);
                  setActiveModule("opd");
                }}
                onPrintPrescription={(p) => setPrescriptionPrintData(p)}
                onPrintReceipt={(r) => setReceiptPrintData(r)}
              />
            )}

            {(activeModule === "opd" || (activeModule as string) === "appointments") && (
              <OpdAppointmentsView
                visits={visits}
                appointments={appointments}
                patients={patients}
                doctors={visibleDoctors}
                onRefresh={() => refreshAllData(true)}
                onOpenConsultation={(v) => {
                  if (currentUser?.role === "DOCTOR") setActiveConsultationVisit(v);
                }}
                onOpenPatientProfile={(pId) => {
                  setActiveModule("patients");
                }}
                onConvertAppointment={handleConvertAppointmentToOpd}
                onAppointmentBooked={(slip) => setAppointmentSlip(slip)}
                clinicSetting={clinicSetting}
                currentUserRole={currentUser?.role}
                initialTab={opdAppointmentsTab}
                initialPatient={preselectedPatientForAppt}
                initialBookingType={preselectedBookingType}
                autoOpenBookingModal={autoOpenBookingModal}
                onClearInitialPatient={() => {
                  setPreselectedPatientForAppt(null);
                  setAutoOpenBookingModal(false);
                }}
              />
            )}

            {activeModule === "billing" && (
              <BillingView
                bills={bills}
                patients={patients}
                doctors={visibleDoctors}
                onRefresh={() => refreshAllData(true)}
                onPrintReceipt={(r) => setReceiptPrintData(r)}
                onOpenPatientProfile={(pId) => {
                  setActiveModule("patients");
                }}
                currentUserRole={currentUser?.role}
              />
            )}

            {activeModule === "reports" && <ReportsView />}

            {activeModule === "settings" && <SettingsView />}
          </>
        )}
      </main>

      {/* MODAL: SWITCH STAFF ACCOUNT (password required) */}
      {showLoginModal && (
        <LoginModal
          currentUser={currentUser}
          onLoggedIn={(u) => {
            setCurrentUser(u);
            setShowLoginModal(false);
          }}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {/* MODAL: APPOINTMENT SLIP (token + print + Marathi WhatsApp) */}
      {appointmentSlip && (
        <PrintableAppointmentSlipModal
          clinicInfo={clinicSetting}
          slip={appointmentSlip}
          onClose={() => setAppointmentSlip(null)}
        />
      )}

      {/* MODAL: PRINTABLE CLINICAL PRESCRIPTION */}
      {prescriptionPrintData && (
        <PrintablePrescriptionModal
          clinicInfo={clinicSetting}
          doctorName={prescriptionPrintData.doctorName}
          doctorSpecialty={prescriptionPrintData.doctorSpecialty}
          doctorReg={prescriptionPrintData.doctorReg}
          patient={prescriptionPrintData.patient}
          consultation={prescriptionPrintData.consultation}
          prescriptionNumber={prescriptionPrintData.prescriptionNumber}
          medicines={prescriptionPrintData.medicines}
          onClose={() => setPrescriptionPrintData(null)}
        />
      )}

      {/* MODAL: PRINTABLE PAYMENT RECEIPT */}
      {receiptPrintData && (
        <PrintableReceiptModal
          clinicInfo={clinicSetting}
          receiptNumber={receiptPrintData.receiptNumber}
          billNumber={receiptPrintData.billNumber}
          paymentDate={receiptPrintData.paymentDate}
          patient={receiptPrintData.patient}
          doctorName={receiptPrintData.doctorName}
          consultationCharges={receiptPrintData.consultationCharges}
          additionalCharges={receiptPrintData.additionalCharges}
          additionalChargesNotes={receiptPrintData.additionalChargesNotes}
          discountAmount={receiptPrintData.discountAmount}
          totalAmount={receiptPrintData.totalAmount}
          paidAmount={receiptPrintData.paidAmount}
          balanceDue={receiptPrintData.balanceDue}
          currentPayment={receiptPrintData.currentPayment}
          onClose={() => setReceiptPrintData(null)}
        />
      )}
    </div>
  );
}
