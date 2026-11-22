"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  ChevronDown,
  UserPlus,
  Check,
  X,
  AlertTriangle,
  Phone,
  User,
  AlertCircle
} from "lucide-react";

interface PatientSelectorProps {
  patients: any[];
  selectedPatient: any | null;
  onSelectPatient: (patient: any | null) => void;
  onRefreshPatients: () => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
}

export function PatientSelector({
  patients,
  selectedPatient,
  onSelectPatient,
  onRefreshPatients,
  label = "Select Patient",
  required = true,
  placeholder = "Type patient name, mobile, or ID to search..."
}: PatientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showQuickRegister, setShowQuickRegister] = useState(false);

  // Quick Registration Form State
  const [regFullName, setRegFullName] = useState("");
  const [regAge, setRegAge] = useState("");
  const [regGender, setRegGender] = useState("Male");
  const [regMobile, setRegMobile] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regError, setRegError] = useState<string | null>(null);
  const [submittingReg, setSubmittingReg] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter patients based on search term
  const filteredPatients = patients.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.patientId.toLowerCase().includes(q) ||
      p.mobileNumber.includes(q)
    );
  });

  // Open Quick Register Modal pre-filling search term if text or digits
  const handleOpenRegister = () => {
    setIsOpen(false);
    setRegError(null);
    setDuplicateWarning(null);

    const trimmed = searchTerm.trim();
    if (/^\d{3,10}$/.test(trimmed)) {
      setRegMobile(trimmed);
      setRegFullName("");
    } else if (trimmed.length > 1) {
      setRegFullName(trimmed);
      setRegMobile("");
    } else {
      setRegFullName("");
      setRegMobile("");
    }

    setRegAge("");
    setRegGender("Male");
    setRegAddress("");
    setShowQuickRegister(true);
  };

  // Submit Quick Patient Registration
  const handleQuickRegisterSubmit = async (overrideDuplicates = false) => {
    setRegError(null);
    setSubmittingReg(true);

    try {
      const payload = {
        fullName: regFullName.trim(),
        age: parseInt(regAge, 10),
        gender: regGender,
        mobileNumber: regMobile.trim(),
        address: regAddress.trim() || null,
        notes: null,
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

      // Success: refresh patient list, auto-select this patient, close modal
      onRefreshPatients();
      if (json.data) {
        onSelectPatient(json.data);
      }
      setShowQuickRegister(false);
      setDuplicateWarning(null);
      setSearchTerm("");
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setSubmittingReg(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-1.5 text-xs">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="block font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {!selectedPatient && (
          <button
            type="button"
            onClick={handleOpenRegister}
            className="flex items-center gap-1 text-[11px] font-bold text-[#258B7C] hover:text-[#1C6B5F] hover:underline"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Register Patient</span>
          </button>
        )}
      </div>

      {/* Selected Patient Card */}
      {selectedPatient ? (
        <div className="p-3 bg-[#E6F7F4] border border-[#70CFBA]/60 rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#258B7C] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              {selectedPatient.fullName?.charAt(0) || "P"}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-slate-900">{selectedPatient.fullName}</p>
                <span className="text-[10px] bg-white text-[#258B7C] font-semibold px-1.5 py-0.2 rounded border border-[#70CFBA]/40">
                  {selectedPatient.patientId}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                {selectedPatient.age} Yrs / {selectedPatient.gender} • Mobile: {selectedPatient.mobileNumber}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onSelectPatient(null);
              setSearchTerm("");
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            type="button"
            className="px-2.5 py-1 text-xs font-semibold text-[#258B7C] bg-white hover:bg-slate-50 border border-[#70CFBA]/50 rounded-lg transition"
          >
            Change
          </button>
        </div>
      ) : (
        /* Search Box with Small Dropdown Icon */
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C] font-medium text-slate-800 bg-white"
            />
            {/* Small Dropdown Toggle Icon on the right */}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              title="Click to view all patients or register new"
              className="absolute right-2 p-1.5 rounded-lg text-slate-400 hover:text-[#258B7C] hover:bg-slate-100 transition"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-[#258B7C]" : ""
                }`}
              />
            </button>
          </div>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 animate-in fade-in-50 duration-150">
              {/* Option 1: Prominent Register Patient Button at top of dropdown */}
              <div className="p-2 bg-[#F7F9FA]">
                <button
                  type="button"
                  onClick={handleOpenRegister}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-white hover:bg-[#E6F7F4] text-[#258B7C] border border-[#70CFBA]/40 font-bold transition group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#E6F7F4] group-hover:bg-[#258B7C] group-hover:text-white text-[#258B7C] flex items-center justify-center transition">
                      <UserPlus className="w-3.5 h-3.5" />
                    </div>
                    <span>+ Register New Patient</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal group-hover:text-[#258B7C]">
                    &lt; 1 min
                  </span>
                </button>
              </div>

              {/* Status Header */}
              <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span>
                  {searchTerm.trim()
                    ? `Search results (${filteredPatients.length})`
                    : `Registered Patients (${patients.length})`}
                </span>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="text-slate-400 hover:text-slate-600 text-[10px]"
                  >
                    Clear search
                  </button>
                )}
              </div>

              {/* Patient List */}
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        onSelectPatient(p);
                        setIsOpen(false);
                        setSearchTerm("");
                      }}
                      className="p-2.5 hover:bg-[#E6F7F4]/40 cursor-pointer flex items-center justify-between transition group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-[#E6F7F4] text-slate-700 group-hover:text-[#258B7C] font-bold flex items-center justify-center text-xs flex-shrink-0 transition">
                          {p.fullName?.charAt(0) || "P"}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 group-hover:text-[#258B7C] transition truncate">
                              {p.fullName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                              {p.patientId}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {p.age} Yrs / {p.gender} • Mobile: {p.mobileNumber}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-[#258B7C] opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
                        Select <Check className="w-3 h-3" />
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center space-y-2">
                    <p className="text-slate-500 text-xs">
                      No patient found matching &ldquo;{searchTerm}&rdquo;
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenRegister}
                      className="px-3 py-1.5 bg-[#258B7C] hover:bg-[#1C6B5F] text-white text-xs font-semibold rounded-lg shadow-sm transition"
                    >
                      Register &ldquo;{searchTerm}&rdquo; as New Patient
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* QUICK PATIENT REGISTRATION MODAL */}
      {showQuickRegister && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in-50 zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E6F7F4] text-[#258B7C] flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Register New Patient</h3>
                  <p className="text-[11px] text-slate-500">Quick Matoshree Clinic Registration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickRegister(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {regError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            {/* Duplicate Warning Dialog */}
            {duplicateWarning && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                  <span>Existing Patient Found!</span>
                </div>
                <p className="text-[11px] text-amber-700">
                  A patient with mobile <strong>{duplicateWarning.matchedBy?.mobileNumber}</strong> or similar name already exists:
                </p>
                <div className="max-h-24 overflow-y-auto divide-y divide-amber-200/50 bg-white/70 rounded-lg p-1.5 text-[11px]">
                  {duplicateWarning.duplicates?.map((dup: any) => (
                    <div
                      key={dup.id}
                      onClick={() => {
                        onSelectPatient(dup);
                        setShowQuickRegister(false);
                      }}
                      className="p-1 hover:bg-amber-100/60 cursor-pointer flex justify-between"
                    >
                      <span className="font-bold text-slate-800">{dup.fullName}</span>
                      <span className="text-[#258B7C] font-semibold">Select Existing</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleQuickRegisterSubmit(true)}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-[10px]"
                  >
                    Register Anyway (Separate Patient)
                  </button>
                </div>
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleQuickRegisterSubmit(false);
              }}
              className="mt-4 space-y-3"
            >
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Patient Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Anand Raghunath Joshi"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#258B7C] focus:bg-white text-xs font-semibold"
                />
              </div>

              {/* Age & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Age (Years) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="125"
                    required
                    value={regAge}
                    onChange={(e) => setRegAge(e.target.value)}
                    placeholder="e.g. 42"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#258B7C] focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Gender <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#258B7C] focus:bg-white text-xs font-semibold"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mobile Number (10 Digits) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  pattern="[6-9][0-9]{9}"
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 9890123456"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#258B7C] focus:bg-white text-xs font-mono"
                />
              </div>

              {/* Address (Optional) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Address / Village
                </label>
                <input
                  type="text"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="e.g. Ausa Road, Latur"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#258B7C] focus:bg-white text-xs"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickRegister(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReg}
                  className="px-5 py-2 bg-[#258B7C] hover:bg-[#1C6B5F] text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submittingReg ? "Registering..." : "Register & Select Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
