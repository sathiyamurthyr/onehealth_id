"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  IndianRupee,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  PlusCircle,
  ArrowRight,
  Printer,
  XCircle,
  QrCode,
  ShieldCheck
} from "lucide-react";
import { api } from "@/lib/api";
import { Invoice } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/FeedbackStates";

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Payment Modal State
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>("UPI");
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState("");

  const loadInvoices = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.billing.invoices();
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || "Failed to load hospital invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleOpenPayModal = (inv: Invoice) => {
    setActiveInvoice(inv);
    const due = (inv.balance_due ?? inv.balance_amount ?? 0);
    setPayAmount(due > 0 ? due : 0);
    setTransactionRef(`UPI-${Date.now().toString().slice(-6)}`);
    setPayError("");
    setPaySuccess("");
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) return;

    if (payAmount <= 0) {
      setPayError("Payment amount must be greater than zero");
      return;
    }

    setPaying(true);
    setPayError("");
    try {
      await api.billing.pay(activeInvoice.id, payAmount, paymentMode, transactionRef);
      setPaySuccess(`Payment of ₹${payAmount.toFixed(2)} recorded successfully via ${paymentMode}`);
      setTimeout(() => {
        setActiveInvoice(null);
        setPaySuccess("");
        loadInvoices();
      }, 1500);
    } catch (err: any) {
      setPayError(err.message || "Failed to settle payment");
    } finally {
      setPaying(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter;
    const matchesSearch =
      !search ||
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.patient_name?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalInvoiced = invoices.reduce((acc, i) => acc + (i.total_amount || 0), 0);
  const totalCollected = invoices.reduce((acc, i) => acc + (i.paid_amount || 0), 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + (i.balance_due || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Billing & Revenue Operations
              </h1>
              <Badge variant="primary" className="text-xs">
                GST Compliant
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Inpatient/Outpatient invoices, UPI payments, GST breakdown, and receipt records
            </p>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Billed Tariff</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              ₹{totalInvoiced.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Cumulative gross billing</span>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] text-emerald-500 uppercase font-bold block">Collected Revenue</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{totalCollected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Realized through UPI & Cash</span>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] text-rose-500 uppercase font-bold block">Outstanding Balance</span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              ₹{totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Pending patient or TPA clearance</span>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice number (e.g. INV-2026-001) or patient name..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {["ALL", "PAID", "PARTIAL", "PENDING"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all min-h-[40px] ${
                  statusFilter === st
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <LoadingState message="Fetching hospital billing ledger and tax registers..." />
        ) : error ? (
          <ErrorState
            title="Failed to Load Invoices"
            message={error}
            onRetry={loadInvoices}
          />
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            title="No Invoices Found"
            message="No billing records match the current filter parameters."
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-4 px-6">Invoice #</th>
                    <th className="py-4 px-6">Patient Name</th>
                    <th className="py-4 px-6">Issue Date</th>
                    <th className="py-4 px-6">Tax (GST)</th>
                    <th className="py-4 px-6">Total Amount</th>
                    <th className="py-4 px-6">Balance Due</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                          {inv.invoice_number}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <Link
                          href={`/patients/${inv.patient_id}`}
                          className="font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 block"
                        >
                          {inv.patient_name}
                        </Link>
                      </td>

                      <td className="py-4 px-6">
                        <span className="text-slate-500 font-mono text-[11px]">
                          {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "Recent"}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <span className="text-slate-600 dark:text-slate-400 font-mono">
                          ₹{(inv.tax_amount ?? inv.tax_gst ?? 0).toFixed(2)}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                          ₹{inv.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`font-mono font-bold text-sm ${
                            (inv.balance_due ?? inv.balance_amount ?? 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"
                          }`}
                        >
                          ₹{(inv.balance_due ?? inv.balance_amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <Badge
                          variant={
                            inv.status === "PAID"
                              ? "success"
                              : inv.status === "PARTIAL"
                              ? "warning"
                              : "danger"
                          }
                          className="text-[10px]"
                        >
                          {inv.status || inv.payment_status || "PENDING"}
                        </Badge>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(inv.balance_due ?? inv.balance_amount ?? 0) > 0 && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenPayModal(inv)}
                              className="text-[11px] h-8 px-2.5 bg-emerald-600 hover:bg-emerald-500"
                            >
                              Settle Due
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.print()}
                            className="text-[11px] h-8 px-2"
                            title="Print Tax Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-3">
              {filteredInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                        {inv.invoice_number}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                        {inv.patient_name}
                      </h3>
                    </div>
                    <Badge
                      variant={
                        inv.status === "PAID"
                          ? "success"
                          : inv.status === "PARTIAL"
                          ? "warning"
                          : "danger"
                      }
                      className="text-[10px]"
                    >
                      {inv.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Billed</span>
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        ₹{inv.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Balance Due</span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          (inv.balance_due ?? inv.balance_amount ?? 0) > 0 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        ₹{(inv.balance_due ?? inv.balance_amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Actions (Min 44px touch target) */}
                  <div className="pt-2 flex items-center gap-2">
                    {(inv.balance_due ?? inv.balance_amount ?? 0) > 0 ? (
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => handleOpenPayModal(inv)}
                        className="flex-1 text-xs justify-center bg-emerald-600 hover:bg-emerald-500"
                      >
                        Pay Balance
                      </Button>
                    ) : (
                      <div className="flex-1 text-center py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Fully Settled</span>
                      </div>
                    )}
                    <Link href={`/patients/${inv.patient_id}`} className="flex-1">
                      <Button variant="outline" size="md" className="w-full text-xs justify-center">
                        Patient File
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Record Payment Modal */}
        {activeInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Record Patient Payment
                  </h3>
                  <p className="text-xs text-slate-500">
                    Invoice: <strong className="font-mono text-blue-600">{activeInvoice.invoice_number}</strong> ({activeInvoice.patient_name})
                  </p>
                </div>
                <button
                  onClick={() => setActiveInvoice(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {payError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium">
                  {payError}
                </div>
              )}

              {paySuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{paySuccess}</span>
                </div>
              )}

              <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount to Settle (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={payAmount}
                      onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Outstanding Due: ₹{(activeInvoice.balance_due ?? activeInvoice.balance_amount ?? 0).toFixed(2)}
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Instrument
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  >
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="CASH">Cash at Hospital Counter</option>
                    <option value="CARD">Credit / Debit POS Card</option>
                    <option value="INSURANCE_TPA">Insurance Cashless TPA</option>
                    <option value="NET_BANKING">Direct Bank IMPS / NEFT</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Transaction / Bank UTR Reference
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. UPI-99882211"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setActiveInvoice(null)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={paying}
                    className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500"
                  >
                    {paying ? "Processing Transaction..." : "Confirm & Settle Receipt"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
