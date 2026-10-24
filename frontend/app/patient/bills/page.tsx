"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard, Hospital, Receipt, Download, Printer, X,
  ArrowLeft, RefreshCw, AlertCircle, CheckCircle2,
  Clock, Filter, ShieldCheck, ChevronRight
} from "lucide-react";
import { api, PatientBill, PatientVisitedHospital } from "@/lib/api";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function PatientBillsPage() {
  const [bills, setBills] = useState<PatientBill[]>([]);
  const [hospitals, setHospitals] = useState<PatientVisitedHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "PENDING">("ALL");
  const [hospitalFilter, setHospitalFilter] = useState<string>("ALL");

  // Modal
  const [selectedBill, setSelectedBill] = useState<PatientBill | null>(null);
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [billsRes, hospsRes] = await Promise.all([
        api.patient.getBills().catch(() => ({ success: true, data: [] })),
        api.patient.getHospitals().catch(() => ({ success: true, data: [] })),
      ]);
      setBills(billsRes?.data || []);
      setHospitals(hospsRes?.data || []);
    } catch (err: any) {
      console.error("Failed to load patient bills", err);
      setError(err?.message || "Failed to load billing history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalPaid = bills.filter((b) => b.payment_status === "PAID").reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const totalPending = bills.filter((b) => b.payment_status !== "PAID").reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

  const filtered = bills.filter((b) => {
    if (statusFilter === "PAID" && b.payment_status !== "PAID") return false;
    if (statusFilter === "PENDING" && b.payment_status === "PAID") return false;
    if (hospitalFilter !== "ALL" && b.hospital_id !== hospitalFilter) return false;
    return true;
  });

  const handlePay = async (billId: string, amount: number) => {
    try {
      const transactionRef = `UPI-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const res = await api.billing.pay(billId, amount, "UPI", transactionRef);
      if (res?.success) {
        setPaySuccess(`Payment of ₹${amount} completed successfully via UPI.`);
        setTimeout(() => setPaySuccess(null), 4000);
        await loadData();
        setSelectedBill(null);
      }
    } catch (err: any) {
      alert(err?.message || "Payment processing failed.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <Link
            href="/patient"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Health Overview</span>
          </Link>
          <span className="text-xs text-slate-400">Financial Ledger</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bills & Payments</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Itemized hospital invoices, consultation fees, lab charges, and settlement receipts.
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Financial Overview Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Settled & Paid Invoices</p>
              <h3 className="text-2xl font-bold text-emerald-950 mt-1">₹{totalPaid.toLocaleString("en-IN")}</h3>
              <p className="text-[11px] text-emerald-700 mt-0.5">All electronic receipts authorized</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-amber-50 to-rose-50 border border-amber-200 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Pending Balance</p>
              <h3 className="text-2xl font-bold text-amber-950 mt-1">₹{totalPending.toLocaleString("en-IN")}</h3>
              <p className="text-[11px] text-amber-700 mt-0.5">Outstanding hospital copay / dues</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {paySuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{paySuccess}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {(["ALL", "PAID", "PENDING"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === tab
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab === "ALL" ? `All (${bills.length})` : tab === "PAID" ? "Paid" : "Pending Dues"}
              </button>
            ))}
          </div>

          {/* Hospital Filter */}
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={hospitalFilter}
              onChange={(e) => setHospitalFilter(e.target.value)}
              aria-label="Filter by Hospital"
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Hospitals</option>
              {hospitals.map((h) => (
                <option key={h.hospital_id} value={h.hospital_id}>
                  {h.hospital_name || h.name || "Hospital"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={loadData} className="font-semibold underline">Retry</button>
          </div>
        )}

        {/* Bills List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No invoices found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              All hospital billing entries, itemized receipts, and insurance claims will be archived here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((bill) => (
              <div
                key={bill.id}
                className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-5 shadow-sm space-y-3 transition group cursor-pointer"
                onClick={() => setSelectedBill(bill)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      #{bill.invoice_number || bill.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      bill.payment_status === "PAID"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {bill.payment_status}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {bill.created_at ? new Date(bill.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Recent"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-slate-900 font-mono">
                      ₹{Number(bill.total_amount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Hospital className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{bill.hospital_name}</span>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-blue-600 group-hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>View Itemized Bill</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Itemized Invoice Modal */}
        {selectedBill && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    INVOICE #{selectedBill.invoice_number || selectedBill.id}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">{selectedBill.hospital_name}</h3>
                  <p className="text-xs text-slate-400">
                    Date: {new Date(selectedBill.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBill(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Itemized Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Line Items</h4>
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden text-xs">
                  {selectedBill.items && selectedBill.items.length > 0 ? (
                    selectedBill.items.map((it, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="font-semibold text-slate-900">{it.description}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{it.item_type}</p>
                        </div>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{Number(it.total_price || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3.5 flex items-center justify-between">
                      <span className="text-slate-700">Clinical Consultation & Outpatient Triage</span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{Number(selectedBill.total_amount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-4 bg-slate-50 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono">₹{Number(selectedBill.total_amount || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax (GST)</span>
                  <span className="font-mono">₹0.00</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                  <span>Total Amount</span>
                  <span className="font-mono">₹{Number(selectedBill.total_amount || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <div className="flex items-center gap-2">
                  {selectedBill.payment_status !== "PAID" && (
                    <button
                      onClick={() => handlePay(selectedBill.id, selectedBill.total_amount)}
                      disabled={paying}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                    >
                      {paying ? "Processing..." : `Pay ₹${selectedBill.total_amount} via UPI`}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedBill(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
