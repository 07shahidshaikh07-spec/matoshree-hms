"use client";

import React, { useState, useEffect } from "react";
import { formatINR } from "@/lib/timezone";
import {
  Settings,
  Building,
  UserCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Save,
  Stethoscope
} from "lucide-react";

export function SettingsView() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Clinic Info Form
  const [clinicName, setClinicName] = useState("");
  const [location, setLocation] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [email, setEmail] = useState("");
  const [savingClinic, setSavingClinic] = useState(false);

  // Doctor Fees
  const [doctorFees, setDoctorFees] = useState<Record<string, { consultationFee: number; followupFee: number; roomNumber: string }>>({});
  const [savingDoc, setSavingDoc] = useState<string | null>(null);

  // Password Change
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (json.data) {
          setData(json.data);
          const c = json.data.clinicSetting;
          if (c) {
            setClinicName(c.clinicName || "Matoshree Clinic");
            setLocation(c.location || "Latur, Maharashtra, India");
            setAddressLine(c.addressLine || "Station Road, Latur, Maharashtra 413512");
            setContactPhone(c.contactPhone || "+91 2382 250000");
            setEmail(c.email || "contact@matoshreeclinic.in");
          }
          const feesMap: any = {};
          json.data.doctors?.forEach((d: any) => {
            feesMap[d.id] = {
              consultationFee: d.consultationFee,
              followupFee: d.followupFee,
              roomNumber: d.roomNumber || ""
            };
          });
          setDoctorFees(feesMap);
          if (json.data.users?.length > 0) {
            setSelectedUserId(json.data.users[0].id);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSaveClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingClinic(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_CLINIC_INFO",
          clinicName,
          location,
          addressLine,
          contactPhone,
          email
        })
      });
      if (res.ok) {
        setMsg({ type: "success", text: "Clinic details updated successfully!" });
      } else {
        throw new Error("Failed to update clinic info");
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSavingClinic(false);
    }
  };

  const handleSaveDoctor = async (doctorId: string) => {
    setSavingDoc(doctorId);
    setMsg(null);
    try {
      const target = doctorFees[doctorId];
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_DOCTOR_FEE",
          doctorId,
          consultationFee: target.consultationFee,
          followupFee: target.followupFee,
          roomNumber: target.roomNumber
        })
      });
      if (res.ok) {
        setMsg({ type: "success", text: "Doctor consultation charges updated!" });
      } else {
        throw new Error("Failed to update doctor charges");
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSavingDoc(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setMsg({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    setSavingPass(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHANGE_PASSWORD",
          userId: selectedUserId,
          newPassword
        })
      });
      if (res.ok) {
        setMsg({ type: "success", text: "Password updated successfully with PBKDF2 hashing!" });
        setNewPassword("");
      } else {
        throw new Error("Failed to change password");
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSavingPass(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 text-xs">Loading settings...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinic Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure clinic profile, doctor consultation fees, and user password security
        </p>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            msg.type === "success"
              ? "bg-[#E6F7F4] text-[#258B7C] border border-[#70CFBA]/40"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {msg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Section 1: Clinic Profile */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Building className="w-4 h-4 text-[#258B7C]" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            Matoshree Clinic Information
          </h3>
        </div>

        <form onSubmit={handleSaveClinic} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Clinic Name</label>
            <input
              type="text"
              required
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C] font-semibold text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Location</label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Address Line</label>
            <input
              type="text"
              required
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Clinic Contact Phone</label>
            <input
              type="text"
              required
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Clinic Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
            />
          </div>

          <div className="flex items-end justify-end">
            <button
              type="submit"
              disabled={savingClinic}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#258B7C] hover:bg-[#1C6B5F] text-white font-semibold rounded-xl text-xs shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingClinic ? "Saving..." : "Save Clinic Info"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Doctor Profiles & Individual Consultation Charges */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Stethoscope className="w-4 h-4 text-[#258B7C]" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            Doctor Profiles &amp; Individual Consultation Charges
          </h3>
        </div>

        <div className="space-y-4">
          {data?.doctors?.map((doc: any) => {
            const fees = doctorFees[doc.id] || { consultationFee: 300, followupFee: 200, roomNumber: "" };
            return (
              <div
                key={doc.id}
                className="p-4 rounded-xl border border-slate-200/80 bg-[#F7F9FA] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{doc.doctorName}</h4>
                  <p className="text-slate-500 text-[11px]">
                    {doc.specialty} • {doc.qualification || "MBBS"} • Reg: {doc.registrationNumber || "MMC"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Consult Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={fees.consultationFee}
                      onChange={(e) =>
                        setDoctorFees({
                          ...doctorFees,
                          [doc.id]: { ...fees, consultationFee: Number(e.target.value) }
                        })
                      }
                      className="w-24 p-1.5 bg-white border border-slate-200 rounded-lg font-bold text-[#258B7C] text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Follow-up Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={fees.followupFee}
                      onChange={(e) =>
                        setDoctorFees({
                          ...doctorFees,
                          [doc.id]: { ...fees, followupFee: Number(e.target.value) }
                        })
                      }
                      className="w-24 p-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Room</label>
                    <input
                      type="text"
                      value={fees.roomNumber}
                      onChange={(e) =>
                        setDoctorFees({
                          ...doctorFees,
                          [doc.id]: { ...fees, roomNumber: e.target.value }
                        })
                      }
                      placeholder="Room 1"
                      className="w-24 p-1.5 bg-white border border-slate-200 rounded-lg text-center"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => handleSaveDoctor(doc.id)}
                      type="button"
                      disabled={savingDoc === doc.id}
                      className="px-3 py-1.5 bg-[#258B7C] hover:bg-[#1C6B5F] text-white font-semibold rounded-lg text-xs shadow-sm transition disabled:opacity-50"
                    >
                      {savingDoc === doc.id ? "Saving..." : "Update Fee"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: User Accounts & Password Security */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <KeyRound className="w-4 h-4 text-[#258B7C]" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            User Security &amp; Password Management
          </h3>
        </div>

        <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-end">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Staff Account</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C] font-semibold"
            >
              {data?.users?.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Secure Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={savingPass}
              className="w-full px-4 py-2.5 bg-[#258B7C] hover:bg-[#1C6B5F] text-white font-semibold rounded-xl text-xs shadow-sm transition disabled:opacity-50"
            >
              {savingPass ? "Hashing..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
