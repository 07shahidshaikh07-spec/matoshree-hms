"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, NavModule } from "@/components/Sidebar";
import { DashboardView } from "@/components/DashboardView";
import { PatientsView } from "@/components/PatientsView";
import { OpdAppointmentsView } from "@/components/OpdAppointmentsView";
import { ConsultationWorkspace } from "@/components/ConsultationWorkspace";
import { BillingView } from "@/components/BillingView";
import { ReportsView } from "@/components/ReportsView";
import { SettingsView } from "@/components/SettingsView";
import { LoginModal } from "@/components/LoginModal";
import {
  PrintablePrescriptionModal,
  PrintableReceiptModal
} from "@/components/PrintableDocuments";
import { UserCheck, Menu } from "lucide-react";

export default function AppHome() {
  const [activeModule, setActiveModule] = useState<NavModule>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initial Mock Active User (will be loaded/switched)
  const [currentUser, setCurrentUser] = useState<any>({
    id: "default-doc-1",
    fullName: "Dr. Vinod Korale",
    email: "dr.vinod@matoshreeclinic.in",
    role: "DOCTOR"
  });

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [clinicSetting, setClinicSetting] = useState<any | null>(null);

  // Application Data States
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Consultation Workspace State (if opening a specific visit)
  const [activeConsultationVisit, setActiveConsultationVisit] = useState<any | null>(null);

  // Modals State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [prescriptionPrintData, setPrescriptionPrintData] = useState<any | null>(null);
  const [receiptPrintData, setReceiptPrintData] = useState<any | null>(null);

  // Patient Preselection for Appointment or OPD
  const [preselectedPatientForAppt, setPreselectedPatientForAppt] = useState<any | null>(null);
  const [preselectedBookingType, setPreselectedBookingType] = useState<"opd" | "appointment">("opd");
  const [autoOpenBookingModal, setAutoOpenBookingModal] = useState(false);
  const [opdAppointmentsTab, setOpdAppointmentsTab] = useState<"opd" | "appointments">("opd");

  // 1. Initial Load of Clinic Users & Settings
  const loadInitialMeta = async () => {
    try {
      // Check if user was previously saved in localStorage
      let savedUser: any = null;
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("matoshree_current_user");
        if (stored) {
          try {
            savedUser = JSON.parse(stored);
          } catch (e) {
            console.error(e);
          }
        }
      }

      const resUsers = await fetch("/api/auth");
      const jsonUsers = await resUsers.json();
      if (jsonUsers.users && jsonUsers.users.length > 0) {
        setAllUsers(jsonUsers.users);
        if (savedUser && savedUser.id) {
          const matched = jsonUsers.users.find((u: any) => u.id === savedUser.id);
          if (matched) {
            setCurrentUser(matched);
          }
        } else {
          // Find Dr. Vinod Korale as initial user if not set
          const docVinod = jsonUsers.users.find((u: any) => u.fullName.includes("Vinod"));
          if (docVinod) {
            setCurrentUser(docVinod);
          } else {
            setCurrentUser(jsonUsers.users[0]);
          }
        }
      }

      const resSettings = await fetch("/api/settings");
      const jsonSettings = await resSettings.json();
      if (jsonSettings.data) {
        setClinicSetting(jsonSettings.data.clinicSetting);
        setDoctors(jsonSettings.data.doctors || []);
      }
    } catch (e) {
      console.error("Meta load error:", e);
    }
  };

  // 2. Fetch Core Clinic Data
  const refreshAllData = async () => {
    setLoading(true);
    try {
      const [dashRes, patRes, opdRes, apptRes, billRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/patients"),
        fetch("/api/opd"),
        fetch("/api/appointments"),
        fetch("/api/billing")
      ]);

      const [dashJson, patJson, opdJson, apptJson, billJson] = await Promise.all([
        dashRes.json(),
        patRes.json(),
        opdRes.json(),
        apptRes.json(),
        billRes.json()
      ]);

      if (dashJson.data) setDashboardData(dashJson.data);
      if (patJson.data) setPatients(patJson.data);
      if (opdJson.data) setVisits(opdJson.data);
      if (apptJson.data) setAppointments(apptJson.data);
      if (billJson.data?.bills) setBills(billJson.data.bills);
    } catch (e) {
      console.error("Data refresh error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialMeta();
    refreshAllData();
  }, []);

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
      const json = await res.json();
      if (res.ok) {
        await refreshAllData();
        setActiveModule("opd");
      } else {
        alert(json.error || "Failed to convert appointment to OPD visit");
      }
    } catch (e) {
      console.error(e);
    }
  };

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
        onLogout={() => setShowLoginModal(true)}
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
              refreshAllData();
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
                onRefresh={refreshAllData}
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
                doctors={doctors}
                onRefresh={refreshAllData}
                onOpenConsultation={(v) => {
                  if (currentUser?.role === "DOCTOR") setActiveConsultationVisit(v);
                }}
                onOpenPatientProfile={(pId) => {
                  setActiveModule("patients");
                }}
                onConvertAppointment={handleConvertAppointmentToOpd}
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
                doctors={doctors}
                onRefresh={refreshAllData}
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

      {/* MODAL: SWITCH STAFF ACCOUNT / LOGIN */}
      {showLoginModal && (
        <LoginModal
          users={allUsers}
          currentUser={currentUser}
          onSelectUser={(u) => {
            setCurrentUser(u);
            if (typeof window !== "undefined") {
              localStorage.setItem("matoshree_current_user", JSON.stringify(u));
            }
          }}
          onClose={() => setShowLoginModal(false)}
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
