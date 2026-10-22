"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Building,
  ShieldCheck,
  AlertCircle,
  X,
  RefreshCw,
  Tag,
  IndianRupee,
  FileText,
  CreditCard,
  RotateCcw,
  Sliders,
  DollarSign,
  Download,
  Eye,
  Check,
  Ban,
  ArrowUpRight,
  TrendingUp,
  User,
  Sparkles
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { phase5Api } from "@/lib/api/phase5";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import {
  BillingInvoice,
  ChargeItem,
  PaymentRecord,
  BillingRefund,
  BillingAdjustment,
  HospitalFinancialAnalytics
} from "@/lib/types";

export default function HospitalBillingOperationsPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("oh_workspace") || "{}").hospital_ref_id : "") || "";

  const [activeTab, setActiveTab] = useState<"invoices" | "charges" | "payments" | "refunds" | "adjustments">("invoices");
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [refunds, setRefunds] = useState<BillingRefund[]>([]);
  const [adjustments, setAdjustments] = useState<BillingAdjustment[]>([]);
  const [analytics, setAnalytics] = useState<HospitalFinancialAnalytics | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  // Selected charge IDs for invoice generation
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);

  // Action status message
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [newChargeData, setNewChargeData] = useState({
    hospital_id: activeHospitalId,
    patient_id: "",
    source_type: "OPD_CONSULTATION",
    description: "",
    quantity: 1,
    unit_price: 500,
    discount_amount: 0,
    tax_amount: 0
  });

  const [refundForm, setRefundForm] = useState({
    invoice_id: "",
    payment_id: "",
    refund_amount: 0,
    reason: ""
  });

  const [adjustmentForm, setAdjustmentForm] = useState({
    hospital_id: activeHospitalId,
    invoice_id: "",
    adjustment_type: "DISCOUNT_APPROVAL",
    adjustment_amount: 100,
    reason: ""
  });

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [invRes, chgRes, payRes, refRes, adjRes, anaRes] = await Promise.all([
        phase5Api.listInvoices({ hospital_id: activeHospitalId }).catch(() => []),
        phase5Api.listCharges({ hospital_id: activeHospitalId }).catch(() => []),
        phase5Api.listPayments(activeHospitalId).catch(() => []),
        phase5Api.listRefunds(activeHospitalId).catch(() => []),
        phase5Api.listAdjustments(activeHospitalId).catch(() => []),
        phase5Api.getFinancialAnalytics(activeHospitalId).catch(() => null)
      ]);

      setInvoices(invRes || []);
      setCharges(chgRes || []);
      setPayments(payRes || []);
      setRefunds(refRes || []);
      setAdjustments(adjRes || []);
      setAnalytics(anaRes);
    } catch (err: any) {
      console.error("Failed to load hospital billing data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [activeHospitalId]);

  const handleIssueInvoice = async (invoiceId: string) => {
    try {
      await phase5Api.issueInvoice(invoiceId);
      setActionMessage({ type: "success", text: "Invoice finalized and officially issued to patient account!" });
      await loadAllData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to issue invoice." });
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to void this invoice? This action is immutable.")) return;
    try {
      await phase5Api.cancelInvoice(invoiceId, "Administrative correction");
      setActionMessage({ type: "success", text: "Invoice cancelled and charges unbundled." });
      await loadAllData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to cancel invoice." });
    }
  };

  const handleCreateInvoiceFromCharges = async () => {
    if (selectedChargeIds.length === 0) return;
    try {
      // Find the first patient ID from selected charges
      const firstCharge = charges.find((c) => selectedChargeIds.includes(c.id));
      if (!firstCharge) return;

      const res = await phase5Api.createInvoiceFromCharges({
        hospital_id: activeHospitalId,
        patient_id: firstCharge.patient_id,
        charge_ids: selectedChargeIds,
        due_days: 14
      });

      const invNum = res.data?.invoice_number || "INV-GEN";
      setActionMessage({ type: "success", text: `Invoice ${invNum} generated from ${selectedChargeIds.length} charges!` });
      setSelectedChargeIds([]);
      setActiveTab("invoices");
      await loadAllData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to generate invoice." });
    }
  };

  const handleApproveRefund = async (refundId: string) => {
    try {
      await phase5Api.approveRefund(refundId);
      setActionMessage({ type: "success", text: "Refund request approved by Financial Authority." });
      await loadAllData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to approve refund." });
    }
  };

  const handleProcessRefund = async (refundId: string) => {
    try {
      await phase5Api.processRefund(refundId);
      setActionMessage({ type: "success", text: "Refund processed and settled to original payment method." });
      await loadAllData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to process refund." });
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      (inv.invoice_number?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (inv.patient_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (inv.onehealth_id?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || inv.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "ISSUED":
      case "PENDING":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "PARTIALLY_PAID":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DRAFT":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "OVERDUE":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "REFUNDED":
      case "CANCELLED":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Phase 5 Enterprise Operational Billing
              </span>
              <span className="text-xs text-slate-500 font-medium">ISO/FHIR Financial Traceability</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <Receipt className="w-7 h-7 text-emerald-600" />
              Hospital Patient Billing & Financial Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Comprehensive patient accounts, multi-source charge generation, invoice state machine, and digital receipts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/hospital/billing/services"
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all flex items-center gap-2 shadow-xs"
            >
              <Tag className="w-4 h-4 text-slate-500" />
              Tariff & Price Lists
            </Link>
            <Link
              href="/hospital/insurance"
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-semibold text-blue-700 transition-all flex items-center gap-2 shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Insurance & Preauths
            </Link>
            <button
              onClick={loadAllData}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-all shadow-xs cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Action feedback toast */}
        {actionMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              actionMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {actionMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              {actionMessage.text}
            </div>
            <button onClick={() => setActionMessage(null)} className="text-xs font-semibold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Financial KPI Summary Cards */}
        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 relative overflow-hidden shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Gross Billed</span>
                <DollarSign className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                ₹{Number(analytics.total_gross_billed || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-500 mt-1">Discounts: ₹{Number(analytics.total_discounts || 0).toFixed(2)}</div>
            </div>

            <div className="bg-white border border-emerald-200/80 rounded-2xl p-4.5 relative overflow-hidden shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700">Total Collected</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-2">
                ₹{Number(analytics.total_collected || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-emerald-700/80 mt-1 font-medium">
                Collection Rate: {Number(analytics.collection_rate_percentage || 0).toFixed(1)}%
              </div>
            </div>

            <div className="bg-white border border-amber-200/80 rounded-2xl p-4.5 relative overflow-hidden shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700">Total Outstanding</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-600 mt-2">
                ₹{Number(analytics.total_outstanding || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-amber-700/80 mt-1">Pending patient/payer receivables</div>
            </div>

            <div className="bg-white border border-purple-200/80 rounded-2xl p-4.5 relative overflow-hidden shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-700">Total Invoices</span>
                <Receipt className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">{analytics.total_invoices || 0}</div>
              <div className="text-xs text-purple-700/80 mt-1">Refunded: ₹{Number(analytics.total_refunded || 0).toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "invoices"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab("charges")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "charges"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Charges Queue ({charges.filter((c) => c.status === "POSTED").length} unbilled)
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "payments"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Payment Transactions ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab("refunds")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "refunds"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refunds ({refunds.length})
          </button>
          <button
            onClick={() => setActiveTab("adjustments")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "adjustments"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Adjustments ({adjustments.length})
          </button>
        </div>

        {/* TAB 1: INVOICES CONSOLE */}
        {activeTab === "invoices" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by invoice #, patient name, OH-ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ISSUED">Issued</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveTab("charges");
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Generate Invoice from Charges
                </button>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Patient / OH-ID</th>
                    <th className="p-3.5">Date & Due</th>
                    <th className="p-3.5 text-right">Total Amount</th>
                    <th className="p-3.5 text-right">Paid</th>
                    <th className="p-3.5 text-right">Balance</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No invoices found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-mono font-semibold text-emerald-700">{inv.invoice_number}</td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">{inv.patient_name || "Patient"}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{inv.onehealth_id || inv.patient_id}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-900 font-medium">{new Date(inv.invoice_date).toLocaleDateString()}</div>
                          <div className="text-[11px] text-slate-500">Due: {new Date(inv.due_date).toLocaleDateString()}</div>
                        </td>
                        <td className="p-3.5 text-right font-semibold text-slate-900">
                          ₹{Number(inv.total_amount).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-semibold text-emerald-600">
                          ₹{Number(inv.amount_paid || 0).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-semibold text-amber-600">
                          ₹{Number(inv.outstanding_balance || 0).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                              inv.payment_status
                            )}`}
                          >
                            {inv.payment_status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                              title="View Invoice Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {inv.payment_status === "DRAFT" && (
                              <button
                                onClick={() => handleIssueInvoice(inv.id)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                              >
                                Issue
                              </button>
                            )}
                            {(inv.payment_status === "DRAFT" || inv.payment_status === "ISSUED") && (
                              <button
                                onClick={() => handleCancelInvoice(inv.id)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-all cursor-pointer"
                                title="Cancel Invoice"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: CHARGES QUEUE */}
        {activeTab === "charges" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Select posted clinical charges to consolidate into a finalized patient invoice.
              </div>
              <button
                disabled={selectedChargeIds.length === 0}
                onClick={handleCreateInvoiceFromCharges}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Generate Invoice ({selectedChargeIds.length} selected)
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          charges.filter((c) => c.status === "POSTED").length > 0 &&
                          selectedChargeIds.length === charges.filter((c) => c.status === "POSTED").length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedChargeIds(charges.filter((c) => c.status === "POSTED").map((c) => c.id));
                          } else {
                            setSelectedChargeIds([]);
                          }
                        }}
                      />
                    </th>
                    <th className="p-3.5">Source & Service</th>
                    <th className="p-3.5">Patient</th>
                    <th className="p-3.5">Qty x Unit Price</th>
                    <th className="p-3.5 text-right">Net Amount</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {charges.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No clinical charges available in queue.
                      </td>
                    </tr>
                  ) : (
                    charges.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 text-center">
                          {c.status === "POSTED" && (
                            <input
                              type="checkbox"
                              checked={selectedChargeIds.includes(c.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                   setSelectedChargeIds([...selectedChargeIds, c.id]);
                                } else {
                                  setSelectedChargeIds(selectedChargeIds.filter((id) => id !== c.id));
                                }
                              }}
                            />
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">{c.description}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {c.source_type} {c.service_code ? `• ${c.service_code}` : ""}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-800 font-medium">{c.patient_name || c.patient_id}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{c.onehealth_id || ""}</div>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {c.quantity} × ₹{Number(c.unit_price).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-semibold text-emerald-600">
                          ₹{Number(c.net_amount).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              c.status === "POSTED"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : c.status === "INVOICED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right text-slate-500 text-[11px]">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PAYMENTS */}
        {activeTab === "payments" && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Transaction Ref</th>
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Mode</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Settled At</th>
                    <th className="p-3.5 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No payment transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-mono text-slate-600">
                          {p.transaction_reference || p.gateway_transaction_id || p.id}
                        </td>
                        <td className="p-3.5 font-mono font-semibold text-emerald-700">{p.invoice_number || p.invoice_id}</td>
                        <td className="p-3.5 font-medium text-slate-900">{p.payment_mode}</td>
                        <td className="p-3.5 text-right font-semibold text-emerald-600">
                          ₹{Number(p.amount).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              p.payment_status === "VERIFIED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {p.payment_status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right text-slate-500">
                          {p.verified_at ? new Date(p.verified_at).toLocaleString() : new Date(p.recorded_at).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right font-mono text-[11px]">
                          {p.receipt_id ? (
                            <span className="text-emerald-700 font-semibold">REC-CONFIRMED</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: REFUNDS */}
        {activeTab === "refunds" && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Refund ID</th>
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Reason</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {refunds.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No refund requests submitted.
                      </td>
                    </tr>
                  ) : (
                    refunds.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-mono text-slate-600">{r.id.substring(0, 12)}...</td>
                        <td className="p-3.5 font-mono font-semibold text-emerald-700">{r.invoice_number || r.invoice_id}</td>
                        <td className="p-3.5 text-slate-800">{r.reason}</td>
                        <td className="p-3.5 text-right font-semibold text-rose-600">
                          ₹{Number(r.refund_amount).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              r.status === "PROCESSED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : r.status === "APPROVED"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {r.status === "REQUESTED" && (
                              <button
                                onClick={() => handleApproveRefund(r.id)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                              >
                                Approve
                              </button>
                            )}
                            {r.status === "APPROVED" && (
                              <button
                                onClick={() => handleProcessRefund(r.id)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                              >
                                Process Settlement
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: ADJUSTMENTS */}
        {activeTab === "adjustments" && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Adjustment Type</th>
                    <th className="p-3.5 text-right">Original</th>
                    <th className="p-3.5 text-right">Adjustment</th>
                    <th className="p-3.5 text-right">Adjusted Net</th>
                    <th className="p-3.5">Authorized By & Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No billing adjustments recorded.
                      </td>
                    </tr>
                  ) : (
                    adjustments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-mono font-semibold text-emerald-700">{a.invoice_number || a.invoice_id}</td>
                        <td className="p-3.5 font-medium text-slate-900">{a.adjustment_type}</td>
                        <td className="p-3.5 text-right text-slate-500">₹{Number(a.original_amount).toFixed(2)}</td>
                        <td className="p-3.5 text-right text-amber-600 font-medium">
                          -₹{Number(a.adjustment_amount).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right text-emerald-600 font-bold">
                          ₹{Number(a.adjusted_amount).toFixed(2)}
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-800 font-medium">{a.reason}</div>
                          <div className="text-[10px] text-slate-500 font-mono">By: {a.authorized_by}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INVOICE DETAILS MODAL */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-600" />
                    Invoice: {selectedInvoice.invoice_number}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Issued by {selectedInvoice.hospital_name || workspace?.hospital_name || "Healthcare Facility"} on{" "}
                    {new Date(selectedInvoice.invoice_date).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500">Patient Name:</span>
                  <div className="font-semibold text-slate-900 mt-0.5">{selectedInvoice.patient_name || "Patient"}</div>
                </div>
                <div>
                  <span className="text-slate-500">One Health ID (OH-ID):</span>
                  <div className="font-mono text-emerald-700 font-semibold mt-0.5">
                    {selectedInvoice.onehealth_id || selectedInvoice.patient_id}
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Billed Line Items</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold">
                      <tr>
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Rate</th>
                        <th className="p-2.5 text-right">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                        selectedInvoice.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 text-slate-900 font-medium">{it.description}</td>
                            <td className="p-2.5 text-center">{it.quantity}</td>
                            <td className="p-2.5 text-right">₹{Number(it.unit_price).toFixed(2)}</td>
                            <td className="p-2.5 text-right font-semibold text-emerald-600">
                              ₹{Number(it.net_amount).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400">
                            No item breakdown available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹{Number(selectedInvoice.subtotal).toFixed(2)}</span>
                </div>
                {Number(selectedInvoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Discount:</span>
                    <span>-₹{Number(selectedInvoice.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                {Number(selectedInvoice.tax_amount) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax:</span>
                    <span>+₹{Number(selectedInvoice.tax_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                  <span>Total Amount:</span>
                  <span className="text-emerald-700">₹{Number(selectedInvoice.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Amount Paid:</span>
                  <span className="text-emerald-700 font-medium">₹{Number(selectedInvoice.amount_paid || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-700 font-semibold text-xs">
                  <span>Outstanding Balance:</span>
                  <span>₹{Number(selectedInvoice.outstanding_balance || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
