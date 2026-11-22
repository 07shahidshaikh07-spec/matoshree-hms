"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root Layout Global Error caught:", error);
    if (typeof window !== "undefined") {
      const isChunkError =
        error.message?.includes("Loading chunk") ||
        error.message?.includes("Failed to fetch") ||
        error.name === "ChunkLoadError";

      if (isChunkError) {
        const lastReload = sessionStorage.getItem("matoshree_root_chunk_reload");
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
          sessionStorage.setItem("matoshree_root_chunk_reload", now.toString());
          window.location.reload();
        }
      }
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#F7F9FA] text-[#1A202C] min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-[#258B7C] flex items-center justify-center mx-auto font-bold text-base">
            MC
          </div>
          <h2 className="text-lg font-bold text-slate-900">Matoshree Clinic EMR</h2>
          <p className="text-xs text-slate-500">
            A version update or session refresh is available.
          </p>
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              } else {
                reset();
              }
            }}
            type="button"
            className="w-full py-2.5 bg-[#258B7C] hover:bg-[#1d6f63] text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Refresh &amp; Continue
          </button>
        </div>
      </body>
    </html>
  );
}
