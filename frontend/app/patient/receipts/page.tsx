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
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <Link
            href="/patient/bills"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Invoices & Bills</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Tax Compliant Receipts
            </span>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Receipt className="w-7 h-7 text-emerald-400" />
              Digital Payment Receipts
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Authoritative payment confirmation receipts with verifiable digital signature hashes.
            </p>
          </div>
          <button
            onClick={loadReceipts}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 transition-all self-start"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>

        {/* Receipts List */}
        <div className="space-y-4">
          {receipts.length === 0 ? (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 space-y-2">
              <Receipt className="w-12 h-12 mx-auto text-zinc-600" />
              <div className="text-sm font-medium text-zinc-400">No payment receipts found.</div>
              <div className="text-xs">Receipts are emitted automatically upon successful invoice payment verification.</div>
            </div>
          ) : (
            receipts.map((r) => (
              <div
                key={r.id}
                className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400 text-sm">{r.receipt_number}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      SETTLED
                    </span>
                  </div>
                  <div className="text-xs text-zinc-300 font-medium">
                    {r.hospital_name || "Healthcare Facility"} • Invoice #{r.invoice_number || r.invoice_id}
                  </div>
                  <div className="text-[11px] text-zinc-500 flex items-center gap-3">
                    <span>Mode: {r.payment_mode}</span>
                    <span>Date: {new Date(r.issued_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-800">
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      ₹{Number(r.amount_paid).toFixed(2)}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500">
                      Ref: {r.transaction_reference ? r.transaction_reference.slice(0, 16) : "PAID"}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedReceipt(r)}
                    className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 rounded-xl text-xs font-semibold transition-all flex items-center gap-2"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg p-6 space-y-6 text-zinc-200 relative overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                    <ShieldCheck className="w-5 h-5" />
                    <span>Official Healthcare Payment Receipt</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{selectedReceipt.hospital_name || "Healthcare Facility"}</p>
                </div>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1.5 hover:bg-zinc-800 text-zinc-400 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Receipt Details Card */}
              <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Receipt Number:</span>
                  <span className="font-mono font-bold text-emerald-400">{selectedReceipt.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Invoice Number:</span>
                  <span className="font-mono text-zinc-200">{selectedReceipt.invoice_number || selectedReceipt.invoice_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Patient:</span>
                  <span className="font-medium text-white">{selectedReceipt.patient_name || "Patient"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">One Health ID (OH-ID):</span>
                  <span className="font-mono text-emerald-400">{selectedReceipt.onehealth_id || selectedReceipt.patient_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Payment Mode:</span>
                  <span className="text-white font-medium">{selectedReceipt.payment_mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Transaction Reference:</span>
                  <span className="font-mono text-zinc-400">{selectedReceipt.transaction_reference || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Settlement Timestamp:</span>
                  <span>{new Date(selectedReceipt.issued_at).toLocaleString()}</span>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex justify-between items-center text-sm font-bold text-white">
                  <span>Amount Settled:</span>
                  <span className="text-emerald-400 text-lg">
                    ₹{Number(selectedReceipt.amount_paid).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Digital Signature */}
              {selectedReceipt.digital_signature_hash && (
                <div className="p-3 bg-zinc-900/30 rounded-xl border border-zinc-800/60 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-[10px] space-y-0.5">
                    <div className="text-zinc-400 font-semibold">Cryptographic Digital Signature Hash (SHA-256)</div>
                    <div className="font-mono text-zinc-500 break-all">{selectedReceipt.digital_signature_hash}</div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold rounded-xl text-xs transition-all"
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
