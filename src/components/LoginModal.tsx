"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";

interface LoginModalProps {
  /** Called with the signed-in user after the server has set the session cookie */
  onLoggedIn: (user: any) => void;
  /** When omitted the screen cannot be dismissed (nobody is signed in) */
  onClose?: () => void;
  currentUser?: any;
}

const LAST_EMAIL_KEY = "matoshree_last_email";

export function LoginModal({ onLoggedIn, onClose, currentUser }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Remember the last e-mail (never the password) to save typing
  useEffect(() => {
    try {
      const last = localStorage.getItem(LAST_EMAIL_KEY);
      if (last) setEmail(last);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Login failed");
      try {
        localStorage.setItem(LAST_EMAIL_KEY, email.trim().toLowerCase());
      } catch {
        /* ignore */
      }
      onLoggedIn(json.user);
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
              <h3 className="font-bold text-sm text-slate-900">
                {currentUser ? "Switch Staff Account" : "Staff Sign In"}
              </h3>
              <p className="text-[11px] text-slate-500">Matoshree Clinic • each doctor sees only their own patients</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} type="button" className="text-slate-400 hover:text-slate-600 p-1" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              autoFocus
              autoComplete="username"
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#258B7C] hover:bg-[#1C6B5F] text-white font-semibold rounded-xl text-xs shadow-sm transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
