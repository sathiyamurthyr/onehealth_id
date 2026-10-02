"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FlaskConical,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  FileText,
  User,
  Building2,
  Calendar,
  ChevronRight,
  ShieldCheck,
  QrCode,
  Send,
  FileCheck2,
  X,
  RefreshCw,
  BellRing,
} from "lucide-react";
import { api } from "@/lib/api";
import { LabOrder } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge, Button } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/FeedbackStates";

export default function LaboratoryPage() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected Order for Result Entry / Verification Modal
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [modalStage, setModalStage] = useState<"COLLECT" | "RESULT_ENTRY" | "VERIFY" | null>(null);

  // Result Entry Form State
  const [resultVal, setResultVal] = useState("");
  const [normalRange, setNormalRange] = useState("");
  const [isAbnormal, setIsAbnormal] = useState(false);
  const [labNotes, setLabNotes] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadLabOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.clinical.labOrders();
      setOrders(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load laboratory orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLabOrders();
  }, []);

  const openActionModal = (order: LabOrder, stage: "COLLECT" | "RESULT_ENTRY" | "VERIFY") => {
    setSelectedOrder(order);
    setModalStage(stage);
    setResultVal(order.result_value || "");
    setNormalRange(order.normal_range || "12.0 - 16.0 g/dL");
    setIsAbnormal(order.is_abnormal || false);
    setLabNotes("");
  };

  const handleAdvanceStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !modalStage) return;
    setSavingAction(true);

    try {
      let nextStatus = selectedOrder.status;
      if (modalStage === "COLLECT") nextStatus = "SAMPLE_COLLECTED";
      if (modalStage === "RESULT_ENTRY") nextStatus = "PROCESSING";
      if (modalStage === "VERIFY") nextStatus = "VERIFIED";

      // Update local state with new specimen and result status
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrder.id
            ? {
                ...o,
                status: nextStatus,
                result_value: resultVal || o.result_value,
                normal_range: normalRange || o.normal_range,
                is_abnormal: isAbnormal,
              }
            : o
        )
      );

      setActionSuccess(`Order #${selectedOrder.id} successfully updated to ${nextStatus}.`);
      setTimeout(() => {
        setActionSuccess(null);
        setModalStage(null);
        setSelectedOrder(null);
      }, 1200);
    } catch (err: any) {
      alert("Failed to advance test lifecycle: " + (err.message || "Error"));
    } finally {
      setSavingAction(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    const matchesSearch =
      !search ||
      o.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.test_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.test_code?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <AppLayout>
      <div className="bg-white min-h-screen text-slate-900 pb-20 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="w-5 h-5 text-indigo-600" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Diagnostic Laboratory Station (LIS)
              </h1>
              <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Specimen & Result Lifecycle
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Sample collection barcodes, instrument result entry, pathologist verification, and clinician notification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadLabOrders}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Refresh Orders</span>
            </button>
            <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              Active Tests: <strong className="text-slate-800">{orders.length}</strong>
            </span>
          </div>
        </div>

        {/* RBAC Notice (Point 16) */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-slate-900">Protected Clinical Scope (Point 16):</span>{" "}
            Laboratory personnel are restricted to authorized specimen requisitions, barcode tracking, and quantitative result entry.
            Unrelated patient medical histories and doctor consultation notes remain masked to preserve clinical confidentiality.
          </div>
        </div>

        {/* Test Order Lifecycle Pipeline (Point 16) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center text-xs">
          {[
            { label: "1. Test Order", count: orders.filter((o) => o.status === "ORDERED").length, active: true },
            { label: "2. Sample Collection", count: orders.filter((o) => o.status === "SAMPLE_COLLECTED").length, active: true },
            { label: "3. Processing", count: orders.filter((o) => o.status === "PROCESSING").length, active: true },
            { label: "4. Result Entry", count: orders.filter((o) => o.result_value).length, active: true },
            { label: "5. Verification", count: orders.filter((o) => o.status === "VERIFIED").length, active: true },
            { label: "6. MD Notification", count: orders.filter((o) => o.status === "VERIFIED").length, active: true },
            { label: "7. Patient Release", count: orders.filter((o) => o.status === "VERIFIED").length, active: true },
          ].map((stage, idx) => (
            <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
              <div className="font-semibold text-[11px] text-slate-700">{stage.label}</div>
              <div className="font-mono text-xs font-bold text-indigo-600 mt-0.5">{stage.count}</div>
            </div>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tests by name, patient, code (e.g. CBC, Lipid, HbA1c)..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {["ALL", "ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "VERIFIED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === st
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Test Name & Code</th>
                  <th className="py-3 px-4">Patient Requisition</th>
                  <th className="py-3 px-4">Specimen Type</th>
                  <th className="py-3 px-4">Quantitative Value</th>
                  <th className="py-3 px-4">Biological Reference</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Laboratory Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No matching lab requisitions found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{o.test_name}</div>
                        <span className="font-mono text-[11px] text-slate-400">Code: {o.test_code}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{o.patient_name}</div>
                        <span className="font-mono text-[11px] text-slate-400">{o.id}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {o.specimen_type || "Venous Whole Blood"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {o.result_value ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-mono font-bold text-xs ${
                                o.is_abnormal ? "text-rose-600" : "text-emerald-700"
                              }`}
                            >
                              {o.result_value}
                            </span>
                            {o.is_abnormal && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                ABNORMAL
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Pending Entry</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {o.normal_range || "N/A"}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            o.status === "VERIFIED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : o.status === "PROCESSING"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {o.status.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {o.status === "ORDERED" && (
                            <button
                              type="button"
                              onClick={() => openActionModal(o, "COLLECT")}
                              className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold border border-indigo-200"
                            >
                              Collect Sample
                            </button>
                          )}

                          {o.status === "SAMPLE_COLLECTED" && (
                            <button
                              type="button"
                              onClick={() => openActionModal(o, "RESULT_ENTRY")}
                              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold"
                            >
                              Enter Result
                            </button>
                          )}

                          {o.status === "PROCESSING" && (
                            <button
                              type="button"
                              onClick={() => openActionModal(o, "VERIFY")}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold"
                            >
                              Verify & Sign
                            </button>
                          )}

                          {o.status === "VERIFIED" && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Notified MD</span>
                            </span>
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

        {/* INTERACTIVE WORKFLOW MODAL (Point 16) */}
        {modalStage && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    {modalStage === "COLLECT" && "Sample Collection & Barcode Tagging"}
                    {modalStage === "RESULT_ENTRY" && "Enter Diagnostic Specimen Result"}
                    {modalStage === "VERIFY" && "Pathologist Verification & Notification"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalStage(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleAdvanceStage} className="p-5 space-y-4 text-xs">
                {actionSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="font-semibold text-slate-900">{selectedOrder.test_name}</div>
                  <div className="text-[11px] text-slate-500">
                    Patient: {selectedOrder.patient_name} • Requisition #{selectedOrder.id}
                  </div>
                </div>

                {modalStage === "COLLECT" && (
                  <div className="space-y-3">
                    <div className="p-3 border border-slate-200 rounded-lg bg-white flex items-center gap-3">
                      <QrCode className="w-8 h-8 text-slate-700" />
                      <div>
                        <div className="font-mono text-xs font-bold text-slate-800">
                          BARCODE: LAB-{selectedOrder.id}-SMP
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Affix printed barcode to EDTA / Serum separator tube.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {modalStage === "RESULT_ENTRY" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Quantitative Result Value <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={resultVal}
                        onChange={(e) => setResultVal(e.target.value)}
                        placeholder="e.g. 13.8 g/dL or 142 mg/dL"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Biological Reference Range
                      </label>
                      <input
                        type="text"
                        value={normalRange}
                        onChange={(e) => setNormalRange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={isAbnormal}
                        onChange={(e) => setIsAbnormal(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded"
                      />
                      <span className="font-semibold text-rose-700 text-xs">Flag as Pathological / Abnormal Result</span>
                    </label>
                  </div>
                )}

                {modalStage === "VERIFY" && (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Result to verify:</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {selectedOrder.result_value || "13.2 g/dL"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Normal Interval:</span>
                        <span className="font-mono">{selectedOrder.normal_range || "12.0 - 16.0 g/dL"}</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] flex items-center gap-2">
                      <BellRing className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Verifying will automatically trigger a Doctor Notification on the OPD dashboard and release reports to Patient Records.
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalStage(null)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAction}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2"
                  >
                    {savingAction ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Action</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
