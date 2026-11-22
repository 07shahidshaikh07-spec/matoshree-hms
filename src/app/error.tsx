"use client";

import React, { useEffect } from "react";
import { RefreshCw, AlertTriangle, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for diagnostic tracking
    console.error("Matoshree HMS Client Error Boundary caught:", error);

    // Auto-reload on ChunkLoadError (caused by new deployments replacing old chunks)
    const isChunkError =
      error.message?.includes("Loading chunk") ||
      error.message?.includes("Failed to fetch dynamically imported module") ||
      error.name === "ChunkLoadError" ||
      error.message?.includes("undefined is not an object (evaluating 'window.__next_p')");

    if (isChunkError && typeof window !== "undefined") {
      const lastReload = sessionStorage.getItem("matoshree_chunk_reload_time");
      const now = Date.now();
      // Guard against infinite reload loops (only reload if not reloaded in the last 15 seconds)
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem("matoshree_chunk_reload_time", now.toString());
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Matoshree Clinic EMR
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            A temporary connection or cache update occurred. Your data is safe in the database.
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-600 text-left truncate">
          {error.message || "Client application state encountered an update."}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              } else {
                reset();
              }
            }}
            type="button"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#258B7C] hover:bg-[#1d6f63] text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Application</span>
          </button>

          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/";
              }
            }}
            type="button"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          Matoshree Clinic • Dr. Vinod Korale &amp; Dr. Vaishali Korale, Latur
        </p>
      </div>
    </div>
  );
}
