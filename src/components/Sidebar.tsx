"use client";

import React from "react";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Calendar,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  UserCheck,
  ChevronRight,
  X
} from "lucide-react";

export type NavModule =
  | "dashboard"
  | "patients"
  | "opd"
  | "appointments"
  | "billing"
  | "reports"
  | "settings";

interface SidebarProps {
  activeModule: NavModule;
  onSelectModule: (module: NavModule) => void;
  currentUser: {
    fullName: string;
    role: string;
    email: string;
  };
  onSwitchUserClick: () => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  activeModule,
  onSelectModule,
  currentUser,
  onSwitchUserClick,
  onLogout,
  isOpen = false,
  onClose
}: SidebarProps) {
  const allNavItems: Array<{ id: NavModule; label: string; icon: React.ReactNode; allowedRoles?: string[] }> = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "patients", label: "Patients", icon: <Users className="w-5 h-5" /> },
    { id: "opd", label: "OPD & Appointments", icon: <Stethoscope className="w-5 h-5" /> },
    { id: "billing", label: "Billing", icon: <Receipt className="w-5 h-5" /> },
    { id: "reports", label: "Reports", icon: <BarChart3 className="w-5 h-5" />, allowedRoles: ["DOCTOR", "ADMINISTRATOR"] },
    { id: "settings", label: "Settings", icon: <Settings className="w-5 h-5" />, allowedRoles: ["DOCTOR", "ADMINISTRATOR"] }
  ];

  const navItems = allNavItems.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(currentUser?.role)
  );

  return (
    <>
      {/* Tablet/Mobile Backdrop Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Main Sidebar (Drawer on Tablet/Mobile, Static on Desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#258B7C] text-white flex flex-col justify-between h-screen shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:w-64 lg:translate-x-0 lg:shadow-lg lg:z-30 flex-shrink-0 select-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-[#258B7C] flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0">
                  MC
                </div>
                <div className="overflow-hidden">
                  <h1 className="font-bold text-base tracking-tight leading-tight truncate">
                    Matoshree Clinic
                  </h1>
                  <p className="text-xs text-white/80 font-medium truncate">Latur, Maharashtra</p>
                </div>
              </div>
              {/* Tablet/Mobile Close Button */}
              <button
                onClick={onClose}
                type="button"
                className="lg:hidden p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                aria-label="Close Navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Active Window Badge */}
            <div className="mt-3">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-xs border ${
                  currentUser?.role === "RECEPTIONIST"
                    ? "bg-amber-400/20 border-amber-300/40 text-amber-100"
                    : "bg-white/20 border-white/30 text-white"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    currentUser?.role === "RECEPTIONIST" ? "bg-amber-300" : "bg-emerald-300"
                  }`}
                ></span>
                <span>{currentUser?.role === "RECEPTIONIST" ? "Reception Window" : "Doctor Window"}</span>
              </div>
            </div>
          </div>

          {/* Navigation Items (The 7 strictly requested modules) */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectModule(item.id);
                    onClose?.();
                  }}
                  type="button"
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-white text-[#258B7C] shadow-sm"
                      : "text-white/90 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? "text-[#258B7C]" : "text-white/80"}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-[#258B7C]" />}
                </button>
              );
            })}
          </nav>
        </div>

      {/* User Profile & Role Section */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <div
          onClick={onSwitchUserClick}
          className="bg-white/10 hover:bg-white/15 cursor-pointer rounded-xl p-2.5 flex items-center justify-between transition group"
          title="Click to switch role or view account"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold truncate text-white">{currentUser.fullName}</p>
              <span className="inline-block px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold tracking-wide uppercase text-white/95">
                {currentUser.role === "RECEPTIONIST" ? "Reception Window" : "Doctor Window"}
              </span>
            </div>
          </div>
          <UserCheck className="w-4 h-4 text-white/70 group-hover:text-white flex-shrink-0" />
        </div>

        <button
          onClick={onLogout}
          type="button"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out / Switch</span>
        </button>
      </div>
    </aside>
    </>
  );
}
