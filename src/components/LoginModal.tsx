"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Lock, ShieldCheck, Stethoscope, UserCog, X } from "lucide-react";

interface LoginModalProps {
  /** Called with the signed-in user after the server has set the session cookie */
  onLoggedIn: (user: any) => void;
  /** When omitted this is the full-screen sign-in (nobody is signed in yet) */
  onClose?: () => void;
  currentUser?: any;
}

interface Account {
  id: string;
  fullName: string;
  role: string;
  subtitle: string | null;
}

const LAST_ACCOUNT_KEY = "matoshree_last_account";

function initials(name: string) {
  const parts = name.replace(/^dr\.?\s*/i, "").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "MC";
}

function roleLabel(role: string) {
  return role === "RECEPTIONIST" ? "Reception" : role === "ADMINISTRATOR" ? "Administrator" : "Doctor";
}

function SignInPanel({ onLoggedIn, onClose, currentUser }: LoginModalProps) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [selected, setSelected] = useState<Account | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Load the staff list (names + roles only) and pre-select the last account used on this device
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/accounts", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        const list: Account[] = json.accounts || [];
        setAccounts(list);
        let lastId: string | null = null;
        try {
          lastId = localStorage.getItem(LAST_ACCOUNT_KEY);
        } catch {
          /* storage unavailable */
        }
        const last = list.find((a) => a.id === lastId);
        if (last) setSelected(last);
      } catch {
        if (!cancelled) {
          setAccounts([]);
          setErrorMsg("Could not load staff accounts. Check your internet connection and refresh.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selected) passwordRef.current?.focus();
  }, [selected]);

  const choose = (a: Account) => {
    setSelected(a);
    setPassword("");
    setErrorMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected.id, password })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Login failed");
      try {
        localStorage.setItem(LAST_ACCOUNT_KEY, selected.id);
      } catch {
        /* ignore */
      }
      onLoggedIn(json.user);
    } catch (err: any) {
      setErrorMsg(err.message);
      setPassword("");
      passwordRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {selected ? `Welcome, ${selected.fullName.replace(/^Dr\.?\s*/i, "Dr. ")}` : currentUser ? "Switch account" : "Sign in"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {selected ? "Enter your password to continue" : "Choose your account to continue"}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {!selected ? (
        <div className="mt-5 space-y-2.5">
          {accounts === null && (
            <div className="py-8 flex justify-center">
              <div className="w-7 h-7 border-4 border-[#258B7C] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          {accounts?.map((a) => {
            const isDoctor = a.role === "DOCTOR";
            const isCurrent = currentUser?.id === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => choose(a)}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 hover:border-[#258B7C] hover:bg-[#E6F7F4]/50 hover:shadow-sm transition flex items-center gap-3.5 group"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    isDoctor ? "bg-[#E6F7F4] text-[#258B7C]" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {initials(a.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-slate-900 truncate">{a.fullName}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    <span className="sm:hidden font-semibold">{roleLabel(a.role)}{a.subtitle ? " • " : ""}</span>
                    {a.subtitle}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span
                    className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isDoctor
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {isDoctor ? <Stethoscope className="w-3 h-3" /> : <UserCog className="w-3 h-3" />}
                    {roleLabel(a.role)}
                  </span>
                  {isCurrent && <span className="text-[10px] font-semibold text-[#258B7C]">Signed in</span>}
                </div>
              </button>
            );
          })}
          {accounts && accounts.length === 0 && !errorMsg && (
            <p className="text-xs text-slate-500 text-center py-6">No staff accounts found.</p>
          )}
        </div>
      ) : (
        <form onSubmit={handleLogin} className="mt-5 space-y-4">
          <div className="p-3 rounded-2xl bg-[#F7F9FA] border border-slate-200 flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                selected.role === "DOCTOR" ? "bg-[#E6F7F4] text-[#258B7C]" : "bg-amber-50 text-amber-700"
              }`}
            >
              {initials(selected.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-slate-900 truncate">{selected.fullName}</p>
              <p className="text-[11px] text-slate-500 truncate">{selected.subtitle || roleLabel(selected.role)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setErrorMsg(null);
              }}
              className="text-[11px] font-semibold text-[#258B7C] hover:underline flex items-center gap-1 flex-shrink-0"
            >
              <ArrowLeft className="w-3 h-3" />
              Change
            </button>
          </div>

          <div>
            <label htmlFor="mc-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="mc-password"
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full text-sm pl-10 pr-11 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C] focus:ring-2 focus:ring-[#258B7C]/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-[#258B7C] hover:bg-[#1C6B5F] text-white font-bold rounded-xl text-sm shadow-sm transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      )}

      <p className="mt-5 text-[11px] text-slate-400 flex items-center gap-1.5 justify-center">
        <ShieldCheck className="w-3.5 h-3.5" />
        Each doctor can only see their own patients
      </p>
    </div>
  );
}

export function LoginModal(props: LoginModalProps) {
  // Switch-account overlay (someone is already signed in)
  if (props.onClose) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
          <SignInPanel {...props} />
        </div>
      </div>
    );
  }

  // Full-screen sign-in
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F7F9FA]">
      {/* Brand panel */}
      <div className="lg:w-[46%] bg-gradient-to-br from-[#258B7C] via-[#1F7A6D] to-[#145148] text-white p-5 sm:p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10"></div>
        <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-white/5"></div>

        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center font-extrabold text-lg">
            MC
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">Matoshree Clinic</p>
            <p className="text-xs text-white/75">Latur, Maharashtra</p>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Simple, reliable
            <br />
            clinic records.
          </h1>
          <p className="mt-3 text-sm text-white/80 max-w-sm">
            OPD queue, appointments, prescriptions and billing for Dr. Vinod Korale &amp; Dr. Vaishali Korale.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-white/90">
            {["Live OPD queue & token numbers", "Appointment slips with WhatsApp (मराठी)", "Private patient records for each doctor"].map(
              (t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">✓</span>
                  {t}
                </li>
              )
            )}
          </ul>
        </div>

        <p className="relative hidden lg:block text-[11px] text-white/60">© Matoshree Clinic • Staff access only</p>
      </div>

      {/* Sign-in card */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8">
          <SignInPanel {...props} />
        </div>
      </div>
    </div>
  );
}
