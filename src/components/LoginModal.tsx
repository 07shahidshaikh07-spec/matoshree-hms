"use client";

import React, { useState } from "react";
import { UserCheck, Lock, CheckCircle2, AlertCircle, ArrowRight, X } from "lucide-react";

interface LoginModalProps {
  users: any[];
  currentUser: any;
  onSelectUser: (user: any) => void;
  onClose: () => void;
}

export function LoginModal({ users, currentUser, onSelectUser, onClose }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Login failed");
      onSelectUser(json.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E6F7F4] text-[#258B7C] flex items-center justify-center font-bold text-sm">
              MC
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Switch Staff Account</h3>
              <p className="text-[11px] text-slate-500">Matoshree Clinic Role-Based Access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Quick Role Switch Buttons (1-Click for Pair Programming & Testing) */}
        <div className="mt-4 space-y-2">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Quick Switch to Staff Role:
          </label>
          {users.map((u) => {
            const isCurrent = currentUser?.id === u.id;
            return (
              <div
                key={u.id}
                onClick={() => {
                  onSelectUser(u);
                  onClose();
                }}
                className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                  isCurrent
                    ? "bg-[#E6F7F4] border-[#258B7C]"
                    : "border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs">
                    {u.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900">{u.fullName}</p>
                    <p className="text-[11px] text-slate-500">{u.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      u.role === "DOCTOR"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {u.role === "RECEPTIONIST" ? "Reception Window" : "Doctor Window"}
                  </span>
                  {isCurrent && (
                    <span className="block text-[10px] font-semibold text-[#258B7C] mt-0.5">
                      (Active)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-white px-2">
            Or Sign in with Password
          </div>
        </div>

        {/* Manual Login Form */}
        <form onSubmit={handleManualLogin} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. dr.vinod@matoshreeclinic.in"
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Default: Matoshree@2026"
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#258B7C] hover:bg-[#1C6B5F] text-white font-semibold rounded-xl text-xs shadow-sm transition disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
