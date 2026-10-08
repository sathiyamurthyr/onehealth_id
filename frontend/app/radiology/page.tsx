"use client";

import React, { useState, useEffect } from "react";
import {
  Scan,
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
  FileCheck2,
  X,
  RefreshCw,
  PlusCircle,
  Eye,
  Camera,
  Layers,
  Sparkles
} from "lucide-react";
import { radiologyApi } from "@/lib/api/phase3";
import { RadiologyOrder, RadiologyReport } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState } from "@/components/ui/FeedbackStates";

export default function RadiologyPage() {
  const [orders, setOrders] = useState<RadiologyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalityFilter, setModalityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected Order for Reporting
  const [selectedOrder, setSelectedOrder] = useState<RadiologyOrder | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<RadiologyReport | null>(null);
  
  // Report Form State
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [savingReport, setSavingReport] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New Order Modal State
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [newPatientId, setNewPatientId] = useState("");
  const [newModality, setNewModality] = useState<string>("XRAY");
  const [newBodyPart, setNewBodyPart] = useState("Chest PA");
  const [newIndication, setNewIndication] = useState("");
  const [newPriority, setNewPriority] = useState<string>("ROUTINE");
  const [creatingOrder, setCreatingOrder] = useState(false);

  const loadRadiologyOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await radiologyApi.listOrders({
        status: statusFilter !== "ALL" ? statusFilter : undefined
      });
      setOrders(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load radiology imaging queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRadiologyOrders();
  }, [statusFilter]);

  const openReportModal = async (order: RadiologyOrder) => {
    setSelectedOrder(order);
    setFindings("");
    setImpression("");
    setRecommendations("");
    setReportModalOpen(true);
    try {
      const report = await radiologyApi.getReport(order.id);
      if (report) {
        setActiveReport(report);
        setFindings(report.findings || "");
        setImpression(report.impression || "");
        setRecommendations(report.recommendations || "");
      } else {
        setActiveReport(null);
      }
    } catch (err) {
      setActiveReport(null);
    }
  };

  const handleSaveReport = async (finalize: boolean) => {
    if (!selectedOrder) return;
    setSavingReport(true);
    try {
      const res = await radiologyApi.saveReport({
        order_id: selectedOrder.id,
        patient_id: selectedOrder.patient_id,
        findings: findings || "No focal acute osseous or soft tissue abnormalities identified.",
        impression: impression || "Unremarkable examination within normal limits.",
        recommendations: recommendations,
        is_finalized: finalize
      });
      setActionSuccess(finalize ? "Radiology report finalized and signed" : "Draft report saved");
      setTimeout(() => {
        setActionSuccess(null);
        setReportModalOpen(false);
        loadRadiologyOrders();
      }, 1200);
    } catch (err: any) {
      alert(err.message || "Failed to save radiology report");
    } finally {
      setSavingReport(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientId || !newIndication) {
      alert("Please provide patient ID and clinical indication");
      return;
    }
    setCreatingOrder(true);
    try {
      await radiologyApi.createOrder({
        patient_id: newPatientId,
        modality: newModality,
        body_part: newBodyPart,
        clinical_indication: newIndication,
        priority: newPriority
      });
      setNewOrderModalOpen(false);
      setNewPatientId("");
      setNewIndication("");
      loadRadiologyOrders();
    } catch (err: any) {
      alert(err.message || "Failed to create radiology order");
    } finally {
      setCreatingOrder(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      (o.patient_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.onehealth_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.body_part || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.id || "").toLowerCase().includes(search.toLowerCase());
    const matchesModality = modalityFilter === "ALL" || o.modality === modalityFilter;
    return matchesSearch && matchesModality;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-inner">
              <Scan className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Radiology & Diagnostic Imaging
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-medium">
                  Phase 3 Live RIS
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Digital DICOM metadata tracking, modality scheduling, and structured radiologist interpretations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadRadiologyOrders}
              className="gap-2 border-slate-700 bg-slate-800/60 hover:bg-slate-700/60 text-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setNewOrderModalOpen(true)}
              className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20"
            >
              <PlusCircle className="h-4 w-4" />
              New Imaging Order
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Patient Name, OH-ID, Body Part, or Order ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div>
            <select
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-violet-500"
            >
              <option value="ALL">All Modalities</option>
              <option value="XRAY">X-Ray (Radiography)</option>
              <option value="CT">CT (Computed Tomography)</option>
              <option value="MRI">MRI (Magnetic Resonance)</option>
              <option value="ULTRASOUND">Ultrasound / Sonography</option>
              <option value="ECG">ECG / Echo</option>
            </select>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-violet-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ORDERED">ORDERED (Pending Schedule)</option>
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="PERFORMED">PERFORMED (Acquired)</option>
              <option value="REPORTING">REPORTING</option>
              <option value="FINALIZED">FINALIZED (Signed)</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <LoadingState message="Fetching live radiology orders..." />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            title="No Imaging Orders Found"
            description="There are currently no radiology orders matching your filter criteria."
          />
        ) : (
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden shadow-xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Patient & Identity</th>
                    <th className="px-6 py-4">Modality & Study</th>
                    <th className="px-6 py-4">Priority & Indication</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">PACS / Metadata</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{ord.patient_name || "Patient"}</div>
                        <div className="text-xs text-violet-400 font-mono">{ord.onehealth_id || "OH-0000"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-xs font-bold text-violet-300 border border-slate-700">
                            {ord.modality}
                          </span>
                          {ord.body_part}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">Ordered: {new Date(ord.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              ord.priority === "STAT"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : ord.priority === "URGENT"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}
                          >
                            {ord.priority}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 truncate max-w-xs">{ord.clinical_indication}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            ord.status === "FINALIZED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : ord.status === "PERFORMED" || ord.status === "REPORTING"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {ord.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-400 font-mono">UID: {ord.dicom_study_uid ? ord.dicom_study_uid.slice(0, 14) + "..." : "Simulated DICOM"}</div>
                        <div className="text-xs text-slate-500">Ref: {ord.id.slice(0, 10)}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => openReportModal(ord)}
                          className="bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs gap-1.5"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {ord.status === "FINALIZED" ? "View Report" : "Interpret / Report"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report Editor / Viewer Modal */}
        {reportModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                    <Scan className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      Radiology Report: {selectedOrder.modality} - {selectedOrder.body_part}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Patient: <span className="text-slate-200 font-medium">{selectedOrder.patient_name}</span> ({selectedOrder.onehealth_id})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReportModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-200">
                {actionSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                {/* Indication Banner */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clinical Indication</div>
                  <div className="text-slate-200">{selectedOrder.clinical_indication}</div>
                </div>

                {/* Findings Section */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Radiological Findings <span className="text-violet-400">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    disabled={selectedOrder.status === "FINALIZED"}
                    placeholder="Enter detailed radiological findings (e.g. lung fields, cardiac silhouette, osseous structures)..."
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 disabled:opacity-75"
                  />
                </div>

                {/* Impression Section */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Diagnostic Impression / Summary <span className="text-violet-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={impression}
                    onChange={(e) => setImpression(e.target.value)}
                    disabled={selectedOrder.status === "FINALIZED"}
                    placeholder="Enter definitive radiologist impression or primary conclusion..."
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 disabled:opacity-75"
                  />
                </div>

                {/* Recommendations */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Recommendations & Follow-up
                  </label>
                  <input
                    type="text"
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    disabled={selectedOrder.status === "FINALIZED"}
                    placeholder="Optional clinical recommendations or follow-up imaging suggestions..."
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 disabled:opacity-75"
                  />
                </div>

                {activeReport?.finalized_at && (
                  <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-500/20 flex items-center justify-between text-xs text-violet-300">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" /> Finalized & Digitally Signed (Version {activeReport.version})
                    </span>
                    <span>{new Date(activeReport.finalized_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
                <Button
                  variant="outline"
                  onClick={() => setReportModalOpen(false)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Close
                </Button>
                {selectedOrder.status !== "FINALIZED" && (
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      disabled={savingReport}
                      onClick={() => handleSaveReport(false)}
                      className="border-violet-500/30 text-violet-300 hover:bg-violet-950/30"
                    >
                      Save Draft
                    </Button>
                    <Button
                      disabled={savingReport}
                      onClick={() => handleSaveReport(true)}
                      className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                    >
                      <FileCheck2 className="h-4 w-4 mr-2" />
                      Sign & Finalize Report
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Imaging Order Modal */}
        {newOrderModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Camera className="h-5 w-5 text-violet-400" />
                  Order Diagnostic Imaging Study
                </h2>
                <button
                  onClick={() => setNewOrderModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="p-6 space-y-4 text-sm text-slate-200">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Patient ID or Reference <span className="text-violet-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Patient ID (e.g. pt-01 or UUID)..."
                    value={newPatientId}
                    onChange={(e) => setNewPatientId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Modality
                    </label>
                    <select
                      value={newModality}
                      onChange={(e) => setNewModality(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-violet-500"
                    >
                      <option value="XRAY">X-Ray (Radiography)</option>
                      <option value="CT">CT Scan</option>
                      <option value="MRI">MRI Scan</option>
                      <option value="ULTRASOUND">Ultrasound / USG</option>
                      <option value="ECG">ECG / Echo</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Priority
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-violet-500"
                    >
                      <option value="ROUTINE">Routine</option>
                      <option value="URGENT">Urgent (4 Hours)</option>
                      <option value="STAT">STAT (Emergency - Immediate)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Anatomical Body Part / View
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chest PA, Lumbar Spine AP/Lat, Abdomen USG..."
                    value={newBodyPart}
                    onChange={(e) => setNewBodyPart(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Clinical Indication / Reason for Study <span className="text-violet-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe clinical symptoms, provisional diagnosis, or reason for ordering..."
                    value={newIndication}
                    onChange={(e) => setNewIndication(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewOrderModalOpen(false)}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creatingOrder}
                    className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                  >
                    {creatingOrder ? "Placing Order..." : "Place Imaging Order"}
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
