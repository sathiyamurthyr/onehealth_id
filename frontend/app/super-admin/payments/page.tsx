"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard, Receipt, Building2, Hospital, CheckCircle2,
  AlertTriangle, RefreshCw, PlusCircle, Search, Filter,
  ArrowUpRight, Download, Check, X, ShieldCheck, Zap
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { api, SaaSInvoice, PlatformMetrics } from "@/lib/api";

export default function SuperAdminPaymentsPage() {
  const [invoices, setInvoices] = useState<SaaSInvoice[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Record Payment Modal
  const [selectedInvoice, setSelectedInvoice] = useState<SaaSInvoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState("RAZORPAY_GATEWAY");
  const [payTxRef, setPayTxRef] = useState("");
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invList, m] = await Promise.all([
        api.superAdmin.listPayments(),
        api.superAdmin.getMetrics(),
      ]);
      setInvoices(invList);
      setMetrics(m);
    } catch (err: any) {
      alert(err.message || "Failed to load payment invoices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      !search ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.hospital_name && inv.hospital_name.toLowerCase().includes(search.toLowerCase())) ||
      (inv.client_name && inv.client_name.toLowerCase().includes(search.toLowerCase())) ||
      (inv.transaction_ref && inv.transaction_ref.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || inv.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenRecordPayment = (inv: SaaSInvoice) => {
    setSelectedInvoice(inv);
    setPayAmount(inv.balance_amount || inv.total_amount);
    setPayTxRef(`tx_sathus_${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      setIsSubmittingPay(true);
      const res = await api.superAdmin.recordPayment({
        invoice_id: selectedInvoice.id,
        amount: Number(payAmount),
        payment_mode: payMode,
        transaction_ref: payTxRef.trim() || undefined,
      });

      setSuccessMsg(res.message || "Payment recorded successfully!");
      setSelectedInvoice(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record payment.");
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const formatINR = (amt?: number) => {
    if (!amt) return "₹0";
    return "₹" + amt.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl lg:text-2xl font-black text-slate-900">SaaS Billing &amp; Payment Collections</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                18% GST Compliant
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              B2B healthcare SaaS revenue collection, invoice tracking, auto-debits, and transaction verification.
            </p>
          </div>

          <button
            onClick={loadData}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ── Revenue Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              30-Day Collected Revenue
            </span>
            <span className="text-2xl lg:text-3xl font-black text-emerald-600">
              {formatINR(metrics?.monthly_revenue)}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">Verified B2B SaaS Settlements</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Outstanding Overdue Payments
            </span>
            <span className="text-2xl lg:text-3xl font-black text-rose-600">
              {formatINR(metrics?.pending_payments_amount)}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">Requires Payment Follow-up or Suspension</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Monthly Recurring Revenue
            </span>
            <span className="text-2xl lg:text-3xl font-black text-purple-700">
              {formatINR(metrics?.mrr)}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">Across {metrics?.active_subscriptions_count || 0} active hospital licenses</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice #, hospital, client network, or transaction reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">Paid / Settled</option>
              <option value="PENDING">Pending Payment</option>
              <option value="OVERDUE">Overdue</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Invoice Number</th>
                  <th className="py-3.5 px-4">Hospital / Client</th>
                  <th className="py-3.5 px-4">Base Subtotal</th>
                  <th className="py-3.5 px-4">GST (18%)</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{inv.hospital_name || inv.hospital_id}</span>
                      <span className="text-[10px] text-slate-500">{inv.client_name || "Independent Facility"}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{formatINR(inv.subtotal)}</td>
                    <td className="py-3.5 px-4 text-slate-500">{formatINR(inv.gst_amount)}</td>
                    <td className="py-3.5 px-4 font-black text-slate-900">{formatINR(inv.total_amount)}</td>
                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      {new Date(inv.due_date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        inv.payment_status === "PAID" ? "bg-emerald-100 text-emerald-800" :
                        inv.payment_status === "OVERDUE" ? "bg-rose-100 text-rose-800" :
                        "bg-amber-100 text-amber-800"
                      }`}>
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {inv.payment_status !== "PAID" ? (
                        <button
                          onClick={() => handleOpenRecordPayment(inv)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition shadow-xs"
                        >
                          Record Payment
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400">
                          {inv.transaction_ref || "Settled"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Record Payment Modal ── */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Record SaaS Payment</h3>
                    <p className="text-xs text-slate-500">{selectedInvoice.invoice_number}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedInvoice(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hospital:</span>
                    <span className="font-bold text-slate-900">{selectedInvoice.hospital_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Total:</span>
                    <span className="font-bold text-slate-900">{formatINR(selectedInvoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Balance Outstanding:</span>
                    <span className="font-black text-rose-600">{formatINR(selectedInvoice.balance_amount || selectedInvoice.total_amount)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Amount Collected (₹) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Channel</label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
                  >
                    <option value="RAZORPAY_GATEWAY">Razorpay SaaS Gateway</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS)</option>
                    <option value="UPI_AUTOPAY">UPI AutoPay Mandate</option>
                    <option value="GOVT_TREASURY_CHALLAN">Government Treasury Challan</option>
                    <option value="CHEQUE">Corporate Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Reference</label>
                  <input
                    type="text"
                    required
                    value={payTxRef}
                    onChange={(e) => setPayTxRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPay}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    {isSubmittingPay ? "Recording..." : "Confirm Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
