"use client";

import React, { useState } from "react";
import { formatINR, formatISTDateTime, formatISTDate } from "@/lib/timezone";
import { PatientSelector } from "@/components/PatientSelector";
import {
  Receipt,
  PlusCircle,
  IndianRupee,
  Search,
  CheckCircle2,
  AlertCircle,
  Printer,
  CreditCard,
  Clock,
  ArrowRight
} from "lucide-react";

interface BillingViewProps {
  bills: any[];
  patients: any[];
  doctors: any[];
  onRefresh: () => void;
  onPrintReceipt: (receiptData: any) => void;
  onOpenPatientProfile: (patientId: string) => void;
  currentUserRole?: string;
}

export function BillingView({
  bills,
  patients,
  doctors,
  onRefresh,
  onPrintReceipt,
  onOpenPatientProfile,
  currentUserRole = "RECEPTIONIST"
}: BillingViewProps) {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<any | null>(null);

  // New Bill Form State
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || "");
  const [consultationCharges, setConsultationCharges] = useState(300);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [amountPaid, setAmountPaid] = useState(300);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "OTHER">("CASH");
  const [transactionRef, setTransactionRef] = useState("");
  const [billNotes, setBillNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Partial Payment Form State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<"CASH" | "UPI" | "OTHER">("CASH");
  const [payRef, setPayRef] = useState("");
  const [payRemarks, setPayRemarks] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [submittingPay, setSubmittingPay] = useState(false);

  // Filtered Bills
  const filteredBills = bills.filter((b) => {
    if (selectedStatusFilter !== "ALL" && b.paymentStatus !== selectedStatusFilter) return false;
    return true;
  });

  // Calculate Running Totals for New Bill
  const subtotal = Number(consultationCharges || 0) + Number(additionalCharges || 0);
  const totalBillAmount = Math.max(0, subtotal - Number(discountAmount || 0));
  const currentPaid = Math.min(totalBillAmount, Number(amountPaid || 0));
  const currentBalance = Math.max(0, totalBillAmount - currentPaid);

  // When Doctor is selected, auto-populate consultation fee
  const handleDoctorChange = (docId: string) => {
    setSelectedDoctorId(docId);
    const doc = doctors.find((d) => d.id === docId);
    if (doc) {
      setConsultationCharges(doc.consultationFee);
      setAmountPaid(doc.consultationFee);
    }
  };

  // Patient Search Results
  const patientSearchResults = patients.filter((p) => {
    if (!patientSearch.trim()) return false;
    const q = patientSearch.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.patientId.toLowerCase().includes(q) ||
      p.mobileNumber.includes(q)
    );
  });

  // Handle Bill Creation Submit
  const handleCreateBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setErrorMsg("Please select a patient.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        patientId: selectedPatient.id,
        doctorId: selectedDoctorId || null,
        consultationCharges: Number(consultationCharges || 0),
        additionalCharges: Number(additionalCharges || 0),
        additionalChargesNotes: additionalNotes.trim() || null,
        discountAmount: Number(discountAmount || 0),
        discountReason: discountReason.trim() || null,
        amountPaid: currentPaid,
        paymentMethod,
        transactionRef: transactionRef.trim() || null,
        notes: billNotes.trim() || null
      };

      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create bill");

      setShowCreateModal(false);
      onRefresh();

      // Trigger printable receipt if payment was recorded
      if (json.data && json.data.payments?.length > 0) {
        onPrintReceipt({
          receiptNumber: json.data.payments[0].receiptNumber,
          billNumber: json.data.billNumber,
          paymentDate: json.data.payments[0].receivedAt,
          patient: json.data.patient,
          doctorName: json.data.doctor?.doctorName,
          consultationCharges: json.data.consultationCharges,
          additionalCharges: json.data.additionalCharges,
          additionalChargesNotes: json.data.additionalChargesNotes,
          discountAmount: json.data.discountAmount,
          totalAmount: json.data.totalAmount,
          paidAmount: json.data.paidAmount,
          balanceDue: json.data.balanceDue,
          currentPayment: json.data.payments[0]
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Recording an Additional Payment
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPayment) return;
    if (payAmount <= 0) {
      setPayError("Payment amount must be greater than zero.");
      return;
    }
    if (payAmount > selectedBillForPayment.balanceDue) {
      setPayError(`Payment cannot exceed outstanding balance of ₹${selectedBillForPayment.balanceDue}`);
      return;
    }

    setSubmittingPay(true);
    setPayError(null);

    const idempotencyKey = `PAY-${selectedBillForPayment.id}-${Date.now()}`;

    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_PAYMENT",
          billId: selectedBillForPayment.id,
          amount: Number(payAmount),
          paymentMethod: payMethod,
          transactionRef: payRef.trim() || null,
          idempotencyKey,
          remarks: payRemarks.trim() || null
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record payment");

      setShowPaymentModal(false);
      onRefresh();

      // Show receipt for this new payment
      if (json.data) {
        onPrintReceipt({
          receiptNumber: json.data.receiptNumber,
          billNumber: selectedBillForPayment.billNumber,
          paymentDate: json.data.receivedAt,
          patient: selectedBillForPayment.patient,
          doctorName: selectedBillForPayment.doctor?.doctorName,
          consultationCharges: selectedBillForPayment.consultationCharges,
          additionalCharges: selectedBillForPayment.additionalCharges,
          additionalChargesNotes: selectedBillForPayment.additionalChargesNotes,
          discountAmount: selectedBillForPayment.discountAmount,
          totalAmount: selectedBillForPayment.totalAmount,
          paidAmount: selectedBillForPayment.paidAmount + Number(payAmount),
          balanceDue: Math.max(0, selectedBillForPayment.balanceDue - Number(payAmount)),
          currentPayment: json.data
        });
      }
    } catch (err: any) {
      setPayError(err.message);
    } finally {
      setSubmittingPay(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing &amp; Payments</h1>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                currentUserRole === "RECEPTIONIST"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-teal-50 border-teal-200 text-teal-800"
              }`}
            >
              {currentUserRole === "RECEPTIONIST" ? "Reception Window" : "Doctor Window"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent, lightweight clinic billing, cash/UPI receipts, and partial payment tracking
          </p>
        </div>

        <button
          onClick={() => {
            setShowCreateModal(true);
            setSelectedPatient(null);
            setPatientSearch("");
            setErrorMsg(null);
            if (doctors.length > 0) {
              handleDoctorChange(doctors[0].id);
            }
          }}
          type="button"
          className="flex items-center gap-2 bg-[#258B7C] hover:bg-[#1C6B5F] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Bill</span>
        </button>
      </div>

      {/* Filter Strip */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Payment Status:</span>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Bills</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PENDING">Pending (Unpaid)</option>
          </select>
        </div>

        <span className="text-slate-400 font-medium">Total: {filteredBills.length} bills</span>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {filteredBills.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No bills found. Click &quot;Create Bill&quot; to issue a consultation invoice.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9FA] text-slate-500 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Bill #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Patient Details</th>
                  <th className="py-3 px-4">Consulting Doctor</th>
                  <th className="py-3 px-4 text-right">Total (₹)</th>
                  <th className="py-3 px-4 text-right">Paid (₹)</th>
                  <th className="py-3 px-4 text-right">Balance Due (₹)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map((b) => {
                  const isPaid = b.paymentStatus === "PAID";
                  const isPartial = b.paymentStatus === "PARTIALLY_PAID";
                  const isPending = b.paymentStatus === "PENDING";

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {b.billNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatISTDate(b.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onOpenPatientProfile(b.patientId)}
                          type="button"
                          className="font-bold text-slate-900 hover:text-[#258B7C] text-left block"
                        >
                          {b.patient.fullName}
                        </button>
                        <span className="text-[11px] text-slate-400">
                          {b.patient.patientId} • {b.patient.mobileNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {b.doctor?.doctorName || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatINR(b.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-700">
                        {formatINR(b.paidAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-amber-600">
                        {b.balanceDue > 0 ? formatINR(b.balanceDue) : "₹0.00"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? "bg-[#E6F7F4] text-[#258B7C] border border-[#70CFBA]/40"
                              : isPartial
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {isPaid && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {b.paymentStatus.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {b.balanceDue > 0 && (
                            <button
                              onClick={() => {
                                setSelectedBillForPayment(b);
                                setPayAmount(b.balanceDue);
                                setPayError(null);
                                setShowPaymentModal(true);
                              }}
                              type="button"
                              className="px-2.5 py-1 bg-[#258B7C] hover:bg-[#1C6B5F] text-white rounded-lg text-xs font-semibold shadow-sm transition"
                            >
                              Pay Due
                            </button>
                          )}
                          {b.payments && b.payments.length > 0 && (
                            <button
                              onClick={() =>
                                onPrintReceipt({
                                  receiptNumber: b.payments[0].receiptNumber,
                                  billNumber: b.billNumber,
                                  paymentDate: b.payments[0].receivedAt,
                                  patient: b.patient,
                                  doctorName: b.doctor?.doctorName,
                                  consultationCharges: b.consultationCharges,
                                  additionalCharges: b.additionalCharges,
                                  additionalChargesNotes: b.additionalChargesNotes,
                                  discountAmount: b.discountAmount,
                                  totalAmount: b.totalAmount,
                                  paidAmount: b.paidAmount,
                                  balanceDue: b.balanceDue,
                                  currentPayment: b.payments[0]
                                })
                              }
                              type="button"
                              className="flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-[#258B7C] font-semibold text-xs transition"
                              title="Print latest receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Receipt</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL 1: CREATE BILL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#258B7C]" />
                <h3 className="font-bold text-base text-slate-900">Create Patient Consultation Bill</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                type="button"
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateBillSubmit} className="mt-4 space-y-3.5 text-xs">
              {/* Patient Selection with Dropdown & Quick Register */}
              <PatientSelector
                patients={patients}
                selectedPatient={selectedPatient}
                onSelectPatient={(p) => setSelectedPatient(p)}
                onRefreshPatients={onRefresh}
                label="Patient"
                required={true}
                placeholder="Type patient name, mobile, or ID to search..."
              />

              {/* Consulting Doctor */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Doctor</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => handleDoctorChange(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.doctorName} (Fee: ₹{d.consultationFee})
                    </option>
                  ))}
                </select>
              </div>

              {/* Consultation Charges & Additional Charges */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Consultation Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={consultationCharges}
                    onChange={(e) => setConsultationCharges(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Additional Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={additionalCharges}
                    onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                    placeholder="e.g. 50"
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                  />
                </div>
              </div>

              {additionalCharges > 0 && (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Additional Charges Note</label>
                  <input
                    type="text"
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="e.g. Dressing, Nebulization, Rapid test"
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
              )}

              {/* Discount Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Discount Reason</label>
                  <input
                    type="text"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="e.g. Concession, Followup waive"
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {/* Calculation Summary Box */}
              <div className="bg-[#E6F7F4] p-3 rounded-xl border border-[#70CFBA]/40 space-y-1">
                <div className="flex justify-between font-bold text-slate-900 text-sm">
                  <span>Total Calculated Bill:</span>
                  <span className="text-[#258B7C]">{formatINR(totalBillAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Formula: {consultationCharges} + {additionalCharges} - {discountAmount}</span>
                  <span className={currentBalance > 0 ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>
                    Balance Due: {formatINR(currentBalance)}
                  </span>
                </div>
              </div>

              {/* Amount Paid & Payment Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount Paid Now (₹)</label>
                  <input
                    type="number"
                    min="0"
                    max={totalBillAmount}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C] font-bold text-[#258B7C]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C] font-semibold"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="OTHER">Other / Card</option>
                  </select>
                </div>
              </div>

              {paymentMethod === "UPI" && (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">UPI Transaction Reference</label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. UPI Ref / UTR / Order ID"
                    className="w-full p-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowCreateModal(false)}
                  type="button"
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedPatient}
                  className="px-4 py-2 bg-[#258B7C] hover:bg-[#1C6B5F] text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Generating..." : "Save Bill & Print Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD PARTIAL PAYMENT ON EXISTING BILL */}
      {showPaymentModal && selectedBillForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Record Payment for {selectedBillForPayment.billNumber}</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                type="button"
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            {payError && (
              <div className="mt-2.5 p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                {payError}
              </div>
            )}

            <div className="bg-[#F7F9FA] p-2.5 rounded-xl my-3 space-y-1">
              <p className="font-bold text-slate-800">{selectedBillForPayment.patient.fullName}</p>
              <div className="flex justify-between text-slate-600">
                <span>Total Bill: {formatINR(selectedBillForPayment.totalAmount)}</span>
                <span className="font-bold text-amber-700">
                  Balance Due: {formatINR(selectedBillForPayment.balanceDue)}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedBillForPayment.balanceDue}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-xl font-bold text-[#258B7C] focus:outline-none focus:border-[#258B7C]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {payMethod === "UPI" && (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">UPI Ref</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="e.g. GPay UTR"
                    className="w-full p-1.5 border border-slate-200 rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Remarks</label>
                <input
                  type="text"
                  value={payRemarks}
                  onChange={(e) => setPayRemarks(e.target.value)}
                  placeholder="e.g. Second installment"
                  className="w-full p-1.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  type="button"
                  className="px-3 py-1.5 text-slate-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPay}
                  className="px-4 py-1.5 bg-[#258B7C] hover:bg-[#1C6B5F] text-white font-semibold rounded-xl"
                >
                  {submittingPay ? "Recording..." : "Save & Print Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
