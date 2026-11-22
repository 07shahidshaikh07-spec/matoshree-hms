"use client";

import React, { useState, useEffect } from "react";
import { formatINR, formatISTDate } from "@/lib/timezone";
import {
  BarChart3,
  Calendar,
  IndianRupee,
  Download,
  Printer,
  Users,
  Stethoscope,
  AlertCircle
} from "lucide-react";

export function ReportsView() {
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch("/api/reports");
        const json = await res.json();
        if (json.data) {
          setReportData(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  const exportCSV = () => {
    if (!reportData?.pendingBills) return;
    const headers = ["Bill Number", "Patient ID", "Patient Name", "Mobile Number", "Doctor", "Total Amount", "Paid Amount", "Balance Due"];
    const rows = reportData.pendingBills.map((b: any) => [
      b.billNumber,
      b.patientId,
      `"${b.patientName}"`,
      b.mobileNumber,
      `"${b.doctorName}"`,
      b.totalAmount,
      b.paidAmount,
      b.balanceDue
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `matoshree_pending_bills_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-slate-500 text-xs">Loading Matoshree Clinic reports...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinic Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daily patient counts, doctor-wise consultations, cash/UPI collections, and pending dues
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            type="button"
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-4 h-4 text-[#258B7C]" />
            <span>Export Pending Dues (CSV)</span>
          </button>
          <button
            onClick={() => window.print()}
            type="button"
            className="flex items-center gap-1.5 bg-[#258B7C] hover:bg-[#1C6B5F] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Grid 1: Daily/Monthly Visits & Doctor-wise Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Doctor-wise Consultations */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Stethoscope className="w-4 h-4 text-[#258B7C]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Doctor-wise Consultations
            </h3>
          </div>
          <div className="space-y-2 text-xs">
            {reportData?.doctorConsultations?.map((doc: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-[#F7F9FA]">
                <span className="font-bold text-slate-800">{doc.doctorName}</span>
                <span className="bg-[#E6F7F4] text-[#258B7C] px-2.5 py-0.5 rounded-full font-bold">
                  {doc.count} consultations
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Patient Visits */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Users className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Daily Patient Visits
            </h3>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
            {reportData?.dailyVisits?.length === 0 ? (
              <p className="text-slate-400 text-center py-2">No visits on record.</p>
            ) : (
              reportData?.dailyVisits?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between p-2 border-b border-slate-50 text-slate-700">
                  <span>{item.date}</span>
                  <span className="font-bold text-slate-900">{item.count} patients</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Monthly Patient Visits */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Monthly Patient Visits
            </h3>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
            {reportData?.monthlyVisits?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between p-2 border-b border-slate-50 text-slate-700">
                <span className="font-medium">{item.month}</span>
                <span className="font-bold text-slate-900">{item.count} patients</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid 2: Daily Collections by Method & Monthly Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Collections Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <IndianRupee className="w-4 h-4 text-[#258B7C]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Daily Collections (Cash vs UPI)
            </h3>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto text-xs">
            {reportData?.dailyCollections?.map((col: any, idx: number) => (
              <div key={idx} className="p-2.5 rounded-xl bg-[#F7F9FA] flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800 block">{col.date}</span>
                  <span className="text-[11px] text-slate-500">
                    Cash: {formatINR(col.cash)} • UPI: {formatINR(col.upi)}
                  </span>
                </div>
                <span className="font-bold text-[#258B7C] text-sm">{formatINR(col.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Collections Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Monthly Revenue Collections
            </h3>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto text-xs">
            {reportData?.monthlyCollections?.map((m: any, idx: number) => (
              <div key={idx} className="p-2.5 rounded-xl bg-[#F7F9FA] flex justify-between items-center">
                <span className="font-bold text-slate-800">{m.month}</span>
                <span className="font-bold text-emerald-700 text-sm">{formatINR(m.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid 3: Pending Payments Detailed Aging Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Outstanding Balances / Pending Payments
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {reportData?.pendingBills?.length || 0} unpaid bills
          </span>
        </div>

        <div className="overflow-x-auto">
          {reportData?.pendingBills?.length === 0 ? (
            <p className="p-8 text-center text-slate-400 text-xs">No pending dues across all clinic records!</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9FA] text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">Bill #</th>
                  <th className="py-2.5 px-3.5">Patient Name</th>
                  <th className="py-2.5 px-3.5">Patient ID</th>
                  <th className="py-2.5 px-3.5">Mobile</th>
                  <th className="py-2.5 px-3.5">Doctor</th>
                  <th className="py-2.5 px-3.5 text-right">Total (₹)</th>
                  <th className="py-2.5 px-3.5 text-right">Paid (₹)</th>
                  <th className="py-2.5 px-3.5 text-right">Balance Due (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.pendingBills.map((b: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-700">{b.billNumber}</td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-900">{b.patientName}</td>
                    <td className="py-2.5 px-3.5 text-slate-500">{b.patientId}</td>
                    <td className="py-2.5 px-3.5 text-slate-700">{b.mobileNumber}</td>
                    <td className="py-2.5 px-3.5 text-slate-700">{b.doctorName}</td>
                    <td className="py-2.5 px-3.5 text-right font-medium">{formatINR(b.totalAmount)}</td>
                    <td className="py-2.5 px-3.5 text-right text-emerald-700">{formatINR(b.paidAmount)}</td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-amber-600">{formatINR(b.balanceDue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
