"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Receipt,
  Download,
  Printer,
  X,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Building,
  CreditCard,
  QrCode,
  Calendar,
  Lock
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { phase5Api } from "@/lib/api/phase5";
import { PaymentReceipt } from "@/lib/types";

export default function PatientReceiptsPage() {
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      const res = await phase5Api.getMyReceipts();
      setReceipts(res || []);
    } catch (err) {
      console.error("Failed to load patient receipts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <Link
            href="/patient/bills"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Invoices & Bills</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Tax Compliant Receipts
            </span>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Receipt className="w-7 h-7 text-emerald-600" />
              Digital Payment Receipts
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Authoritative payment confirmation receipts with verifiable digital signature hashes.
            </p>
          </div>
          <button
            onClick={loadReceipts}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-all shadow-xs self-start cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
        </div>

        {/* Receipts List */}
        <div className="space-y-4">
          {receipts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-2 shadow-xs">
              <Receipt className="w-12 h-12 mx-auto text-slate-300" />
              <div className="text-sm font-semibold text-slate-700">No payment receipts found.</div>
              <div className="text-xs text-slate-400">Receipts are emitted automatically upon successful invoice payment verification.</div>
            </div>
          ) : (
            receipts.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-700 text-sm">{r.receipt_number}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      SETTLED
                    </span>
                  </div>
                  <div className="text-xs text-slate-800 font-medium">
                    {r.hospital_name || "Healthcare Facility"} • Invoice #{r.invoice_number || r.invoice_id}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-3">
                    <span>Mode: {r.payment_mode}</span>
                    <span>Date: {new Date(r.issued_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">
                      ₹{Number(r.amount_paid).toFixed(2)}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Ref: {r.transaction_reference ? r.transaction_reference.slice(0, 16) : "PAID"}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedReceipt(r)}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    View Receipt
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* RECEIPT MODAL */}
        {selectedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 space-y-6 text-slate-800 relative overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-base">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>Official Healthcare Payment Receipt</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedReceipt.hospital_name || "Healthcare Facility"}</p>
                </div>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Receipt Details Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt Number:</span>
                  <span className="font-mono font-bold text-emerald-700">{selectedReceipt.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Number:</span>
                  <span className="font-mono text-slate-700 font-medium">{selectedReceipt.invoice_number || selectedReceipt.invoice_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-medium text-slate-900">{selectedReceipt.patient_name || "Patient"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">One Health ID (OH-ID):</span>
                  <span className="font-mono text-emerald-700 font-semibold">{selectedReceipt.onehealth_id || selectedReceipt.patient_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="text-slate-900 font-medium">{selectedReceipt.payment_mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction Reference:</span>
                  <span className="font-mono text-slate-600">{selectedReceipt.transaction_reference || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Settlement Timestamp:</span>
                  <span className="text-slate-700">{new Date(selectedReceipt.issued_at).toLocaleString()}</span>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>Amount Settled:</span>
                  <span className="text-emerald-700 text-lg">
                    ₹{Number(selectedReceipt.amount_paid).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Digital Signature */}
              {selectedReceipt.digital_signature_hash && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-[10px] space-y-0.5">
                    <div className="text-slate-700 font-semibold">Cryptographic Digital Signature Hash (SHA-256)</div>
                    <div className="font-mono text-slate-500 break-all">{selectedReceipt.digital_signature_hash}</div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
