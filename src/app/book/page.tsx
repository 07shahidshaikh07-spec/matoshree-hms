"use client";

import React, { useState, useEffect } from "react";
import { buildAppointmentMarathiMessage, whatsappUrl } from "@/lib/whatsapp";
import { istDateString } from "@/lib/timezone";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  CheckCircle2,
  Stethoscope,
  Building,
  AlertCircle,
  Share2,
  Printer,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  MapPin
} from "lucide-react";

interface Doctor {
  id: string;
  doctorName: string;
  qualification: string;
  specialty: string;
  consultationFee: number;
  roomNumber: string | null;
}

interface SlotAvailability {
  slot: string;
  isAvailable: boolean;
}

export default function PublicBookingPage() {
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [clinic, setClinic] = useState<any>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slotsAvailability, setSlotsAvailability] = useState<SlotAvailability[]>([]);

  // Booking Form State
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [reasonForVisit, setReasonForVisit] = useState("");

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmationData, setConfirmationData] = useState<any | null>(null);

  // Generate 7 upcoming date options for quick click
  const upcomingDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = istDateString(d);
    const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short" });
    const formatted = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return { dateStr, dayName, formatted };
  });

  // 1. Load initial clinic meta and doctors
  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await fetch("/api/public/book");
        const json = await res.json();
        if (json.success) {
          setClinic(json.clinic);
          setDoctors(json.doctors || []);
          if (json.doctors?.length > 0) {
            setSelectedDoctorId(json.doctors[0].id);
          }
          const todayStr = istDateString();
          setSelectedDate(todayStr);
        }
      } catch (err) {
        console.error("Failed to load doctors:", err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadMeta();
  }, []);

  // 2. Fetch live slot availability whenever selected doctor or date changes
  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) return;

    async function fetchSlots() {
      setLoadingSlots(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/public/book?doctorId=${selectedDoctorId}&date=${selectedDate}`);
        const json = await res.json();
        if (json.success) {
          setSlotsAvailability(json.slotsAvailability || []);
          // If current selected slot is now booked, reset selection
          setSelectedSlot((curr) => (json.bookedSlots?.includes(curr) ? "" : curr));
        }
      } catch (err) {
        console.error("Failed to fetch slots:", err);
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [selectedDoctorId, selectedDate]);

  // 3. Handle submission
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedDoctorId) {
      setErrorMsg("Please select a doctor.");
      return;
    }
    if (!selectedDate) {
      setErrorMsg("Please choose a date.");
      return;
    }
    if (!selectedSlot) {
      setErrorMsg("Please select a consultation time slot.");
      return;
    }
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg("Please enter patient's full name (at least 2 characters).");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobileNumber.trim())) {
      setErrorMsg("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setErrorMsg("Please enter a valid age.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        doctorId: selectedDoctorId,
        appointmentDate: selectedDate,
        slotTime: selectedSlot,
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        age: ageNum,
        gender,
        reasonForVisit: reasonForVisit.trim() || "General Consultation"
      };

      const res = await fetch("/api/public/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to book appointment. Please try again.");
      }

      setConfirmationData(json.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  // Split slots into Morning & Evening
  const morningSlots = slotsAvailability.filter((s) => s.slot.includes("AM") || s.slot.startsWith("12:"));
  const eveningSlots = slotsAvailability.filter((s) => !morningSlots.includes(s));

  // WhatsApp share text (Marathi)
  const getWhatsAppShareUrl = () => {
    if (!confirmationData) return "";
    const text = buildAppointmentMarathiMessage({
      clinicName: confirmationData.clinic?.clinicName,
      addressLine: confirmationData.clinic?.addressLine,
      contactPhone: confirmationData.clinic?.contactPhone,
      patientName: confirmationData.patient.fullName,
      appointmentNumber: confirmationData.appointmentNumber,
      tokenNumber: confirmationData.tokenNumber,
      doctorName: confirmationData.doctor.doctorName,
      dateStr: confirmationData.appointmentDate,
      slotTime: confirmationData.slotTime,
      reason: confirmationData.reasonForVisit
    });
    return whatsappUrl(text);
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#F7F9FA] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#258B7C] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Loading Matoshree Clinic Appointment Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FA] text-[#1A202C]">
      {/* Top Clinic Branding Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#258B7C] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              MC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base text-slate-900 tracking-tight leading-none">
                  {clinic?.clinicName || "Matoshree Clinic"}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-[#E6F7F4] text-[#258B7C] rounded-full border border-[#70CFBA]/40">
                  Online Booking
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-[#258B7C]" />
                <span>{clinic?.location || "Latur, Maharashtra"}</span>
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Phone className="w-3.5 h-3.5 text-[#258B7C]" />
            <span className="font-medium">{clinic?.contactPhone || "+91 2382 250000"}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {confirmationData ? (
          /* ==================================================================== */
          /* CONFIRMATION / APPOINTMENT SLIP */
          /* ==================================================================== */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6 animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Success Header */}
            <div className="text-center pb-6 border-b border-slate-100">
              <div className="w-16 h-16 rounded-full bg-[#E6F7F4] text-[#258B7C] flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Appointment Confirmed!</h2>
              <p className="text-xs text-slate-500 mt-1">
                Your appointment has been registered and scheduled in the clinic software
              </p>
            </div>

            {/* Printable Slip Card */}
            <div
              id="printable-appointment-slip"
              className="bg-[#F7F9FA] rounded-2xl p-6 border-2 border-dashed border-[#70CFBA] space-y-4"
            >
              <div className="text-center pb-2 border-b border-slate-200">
                <p className="text-lg font-extrabold text-[#258B7C] tracking-tight">
                  {confirmationData.clinic?.clinicName || "Matoshree Clinic"}
                </p>
                <p className="text-[11px] text-slate-500">Appointment Slip</p>
              </div>
              {confirmationData.tokenNumber ? (
                <div className="flex items-center justify-between bg-[#E6F7F4] border border-[#70CFBA]/60 rounded-xl px-4 py-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#1d6f63]">
                    Token Number (टोकन क्र.)
                  </span>
                  <span className="text-3xl font-extrabold text-[#258B7C] leading-none">
                    {confirmationData.tokenNumber}
                  </span>
                </div>
              ) : null}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Appointment No.
                  </span>
                  <p className="text-xl font-mono font-extrabold text-[#258B7C]">
                    {confirmationData.appointmentNumber}
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Patient ID
                  </span>
                  <p className="text-sm font-mono font-bold text-slate-800">
                    {confirmationData.patient.patientId}
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Patient Name</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {confirmationData.patient.fullName}
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    {confirmationData.patient.age} Yrs • {confirmationData.patient.gender} • {confirmationData.patient.mobileNumber}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Consulting Doctor</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {confirmationData.doctor.doctorName}
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    {confirmationData.doctor.specialty} ({confirmationData.doctor.qualification})
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Scheduled Date</span>
                  <p className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-[#258B7C]" />
                    <span>{confirmationData.appointmentDate}</span>
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Time Slot</span>
                  <p className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#258B7C]" />
                    <span>{confirmationData.slotTime}</span>
                  </p>
                </div>

                {confirmationData.reasonForVisit && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-200/60">
                    <span className="text-slate-400 font-medium">Reason for Visit:</span>
                    <span className="ml-1 font-semibold text-slate-700">
                      {confirmationData.reasonForVisit}
                    </span>
                  </div>
                )}
              </div>

              {/* Clinic Location Footer */}
              <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span>📍 {confirmationData.clinic.addressLine}</span>
                <span>📞 {confirmationData.clinic.contactPhone}</span>
              </div>
            </div>

            {/* Helpful Notice */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <p>
                Please arrive at the clinic reception <strong>10 minutes before</strong> your scheduled time slot.
                Show this appointment number and token at the front desk.
                <br />
                कृपया आपल्या वेळेच्या १० मिनिटे आधी क्लिनिकमध्ये यावे आणि अपॉइंटमेंट क्रमांक रिसेप्शनवर दाखवावा.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <a
                href={getWhatsAppShareUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Share2 className="w-4 h-4" />
                <span>WhatsApp वर शेअर करा (मराठी)</span>
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save Slip</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmationData(null);
                  setSelectedSlot("");
                  setFullName("");
                  setMobileNumber("");
                  setAge("");
                  setReasonForVisit("");
                }}
                className="w-full sm:w-auto px-4 py-3 text-slate-500 hover:text-slate-800 text-xs font-semibold"
              >
                Book Another
              </button>
            </div>
          </div>
        ) : (
          /* ==================================================================== */
          /* BOOKING FORM */
          /* ==================================================================== */
          <form onSubmit={handleBookingSubmit} className="space-y-6">
            {/* Hero Card */}
            <div className="bg-gradient-to-r from-[#258B7C] to-[#1C6B5F] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  Quick Patient Booking
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Book Your Doctor Consultation
                </h2>
                <p className="text-xs sm:text-sm text-white/90 max-w-xl">
                  Choose your consulting doctor and preferred time slot. Your appointment will be scheduled in the clinic software automatically.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-3 animate-shake">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {/* STEP 1: SELECT DOCTOR */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-[#E6F7F4] text-[#258B7C] flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h3 className="font-bold text-sm text-slate-900">Select Consulting Doctor</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {doctors.map((doc) => {
                  const isSelected = selectedDoctorId === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoctorId(doc.id)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3.5 ${
                        isSelected
                          ? "bg-[#E6F7F4]/50 border-[#258B7C] shadow-sm"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0 transition ${
                          isSelected ? "bg-[#258B7C] text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm text-slate-900">{doc.doctorName}</p>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-[#258B7C]"></span>
                          )}
                        </div>
                        <p className="text-xs text-[#258B7C] font-semibold mt-0.5">{doc.specialty}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{doc.qualification}</p>
                        {doc.roomNumber && (
                          <span className="inline-block mt-2 text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            {doc.roomNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: SELECT DATE */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#E6F7F4] text-[#258B7C] flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">Choose Appointment Date</h3>
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  min={istDateString()}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs p-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#258B7C]"
                />
              </div>

              {/* Quick 7-Day Chips */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 pt-1">
                {upcomingDates.map((item) => {
                  const isSelected = selectedDate === item.dateStr;
                  return (
                    <button
                      key={item.dateStr}
                      type="button"
                      onClick={() => setSelectedDate(item.dateStr)}
                      className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center justify-center ${
                        isSelected
                          ? "bg-[#258B7C] border-[#258B7C] text-white shadow-sm"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className={`text-[10px] font-semibold uppercase ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                        {item.dayName}
                      </span>
                      <span className="text-xs font-bold mt-0.5">{item.formatted}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 3: SELECT TIME SLOT */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#E6F7F4] text-[#258B7C] flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">Select Available Time Slot</h3>
                </div>
                {loadingSlots && (
                  <span className="text-[11px] text-[#258B7C] font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#258B7C] animate-ping"></span>
                    Checking availability...
                  </span>
                )}
              </div>

              {/* Morning Slots */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#258B7C]" />
                  <span>Morning Consultation (09:30 AM – 01:00 PM)</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {morningSlots.map((item) => {
                    const isSelected = selectedSlot === item.slot;
                    const isAvailable = item.isAvailable;

                    return (
                      <button
                        key={item.slot}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedSlot(item.slot)}
                        className={`p-2.5 rounded-xl text-xs font-semibold border transition text-center ${
                          !isAvailable
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through opacity-60"
                            : isSelected
                            ? "bg-[#258B7C] text-white border-[#258B7C] shadow-sm"
                            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        {item.slot}
                        {!isAvailable && <span className="block text-[9px] font-normal no-underline">Booked</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Evening Slots */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#258B7C]" />
                  <span>Evening Consultation (05:00 PM – 08:00 PM)</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {eveningSlots.map((item) => {
                    const isSelected = selectedSlot === item.slot;
                    const isAvailable = item.isAvailable;

                    return (
                      <button
                        key={item.slot}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedSlot(item.slot)}
                        className={`p-2.5 rounded-xl text-xs font-semibold border transition text-center ${
                          !isAvailable
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through opacity-60"
                            : isSelected
                            ? "bg-[#258B7C] text-white border-[#258B7C] shadow-sm"
                            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        {item.slot}
                        {!isAvailable && <span className="block text-[9px] font-normal no-underline">Booked</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* STEP 4: PATIENT DETAILS */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-[#E6F7F4] text-[#258B7C] flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <h3 className="font-bold text-sm text-slate-900">Patient Information</h3>
              </div>

              <div className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Tukaram Patil"
                      className="w-full text-xs pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number (10 Digits) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 9822112233"
                      className="w-full text-xs pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    If you are an existing patient, this mobile number will automatically connect to your clinic record.
                  </p>
                </div>

                {/* Age & Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Age (Years) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={120}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 45"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Reason for Visit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason for Consultation <span className="text-[10px] text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={reasonForVisit}
                    onChange={(e) => setReasonForVisit(e.target.value)}
                    placeholder="e.g. Fever & cold, routine BP checkup, joint pain"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                  />
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !selectedSlot}
                className="w-full py-4 rounded-2xl bg-[#258B7C] hover:bg-[#1C6B5F] text-white font-bold text-sm shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Securing Your Slot in Clinic Software...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm &amp; Book Appointment</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2">
                No advance payment required. Consultation fee is payable at the clinic desk during your visit.
              </p>
            </div>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-8 border-t border-slate-200 text-center text-xs text-slate-400 space-y-1">
        <p className="font-semibold text-slate-600">Matoshree Clinic • Latur, Maharashtra</p>
        <p>Doctors: Dr. Vinod Korale &amp; Dr. Vaishali Korale</p>
      </footer>
    </div>
  );
}
