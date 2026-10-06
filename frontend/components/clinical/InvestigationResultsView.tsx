"use client";

import React, { useState, useEffect } from "react";
import {
  FlaskConical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  Eye,
  MessageSquare,
  X,
  Building,
  Calendar,
  AlertCircle
} from "lucide-react";
import { InvestigationOrder } from "@/lib/types";
import { doctorWorkspaceApi } from "@/lib/api/doctor-workspace";

interface InvestigationResultsViewProps {
  patientId: string;
  patientName: string;
  onehealthId: string;
}

export function InvestigationResultsView({
  patientId,
  patientName,
  onehealthId,
}: InvestigationResultsViewProps) {
  const [investigations, setInvestigations] = useState<InvestigationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Review modal state
  const [reviewOrder, setReviewOrder] = useState<InvestigationOrder | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    loadInvestigations();
  }, [patientId, selectedStatus]);

  const loadInvestigations = async () => {
    setLoading(true);
    try {
      const statusParam = selectedStatus === "ALL" ? undefined : selectedStatus;
      const res = await doctorWorkspaceApi.getPatientInvestigations(patientId, statusParam);
      setInvestigations(res.investigations || []);
    } catch (err: any) {
      console.error("Failed to load patient investigations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewOrder || !reviewNotes.trim()) return;
    setIsSubmittingReview(true);
    try {
      await doctorWorkspaceApi.reviewInvestigation(reviewOrder.id, reviewNotes.trim());
      setReviewOrder(null);
      setReviewNotes("");
      loadInvestigations();
    } catch (err: any) {
      alert(err.message || "Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "RESULT_AVAILABLE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "REVIEWED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "PROCESSING":
      case "SAMPLE_COLLECTED":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Status Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Investigation Orders & Lab Results
            </h3>
            <p className="text-[11px] text-slate-500">
              Patient-scoped diagnostic records with multi-parameter reference ranges & doctor sign-off
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 text-xs">
          {["ALL", "RESULT_AVAILABLE", "REVIEWED", "PROCESSING", "ORDERED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                selectedStatus === st
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              {st === "ALL" ? "All Orders" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
          Loading investigation results...
        </div>
      ) : investigations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500 space-y-1">
          <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-800">No investigation records found</p>
          <p className="text-slate-400">Order lab tests from the consultation workspace to see them here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {investigations.map((inv) => {
            const hasResults = inv.results && inv.results.length > 0;
            const isAbnormal = inv.is_abnormal || (inv.results || []).some((r) => r.status !== "NORMAL");

            return (
              <div
                key={inv.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-all"
              >
                {/* Order Top Summary Bar */}
                <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        inv.status === "RESULT_AVAILABLE" || inv.status === "REVIEWED"
                          ? isAbnormal
                            ? "bg-rose-500"
                            : "bg-emerald-500"
                          : "bg-amber-400 animate-pulse"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{inv.test_name}</span>
                        {inv.test_code && (
                          <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-100">
                            {inv.test_code}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${statusBadge(
                            inv.status
                          )}`}
                        >
                          ● {inv.status.replace("_", " ")}
                        </span>
                        {inv.priority !== "ROUTINE" && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            {inv.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Order #{inv.order_number} • Ordered:{" "}
                        {inv.ordered_at ? new Date(inv.ordered_at).toLocaleDateString() : "Recent"} •{" "}
                        {inv.preferred_lab_name || "Central Lab"}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {inv.status === "RESULT_AVAILABLE" && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewOrder(inv);
                          setReviewNotes("");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        Mark Reviewed
                      </button>
                    )}
                    {inv.status === "REVIEWED" && inv.doctor_review_notes && (
                      <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Reviewed
                      </span>
                    )}
                  </div>
                </div>

                {/* Parameters Table */}
                {hasResults ? (
                  <div className="p-4 overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                          <th className="pb-2">Parameter</th>
                          <th className="pb-2">Result Value</th>
                          <th className="pb-2">Reference Range</th>
                          <th className="pb-2">Status Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inv.results!.map((param, pIdx) => {
                          const isParamAbnormal = param.status !== "NORMAL";
                          return (
                            <tr key={pIdx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 font-medium text-slate-800">
                                {param.parameter_name}
                              </td>
                              <td className="py-2.5 font-bold font-mono text-slate-900">
                                {param.value} <span className="text-slate-500 font-normal text-[11px]">{param.unit}</span>
                              </td>
                              <td className="py-2.5 font-mono text-slate-500 text-[11px]">
                                {param.reference_interval || "—"}
                              </td>
                              <td className="py-2.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                                    isParamAbnormal
                                      ? param.status === "CRITICAL"
                                        ? "bg-rose-100 text-rose-800 border-rose-300"
                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  }`}
                                >
                                  {param.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-xs text-slate-500 italic bg-slate-50/30 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Specimen processing in laboratory. Results will update automatically once verified by pathologist.
                  </div>
                )}

                {/* Doctor Review Note Box if Present */}
                {inv.doctor_review_notes && (
                  <div className="px-4 py-3 bg-blue-50/60 border-t border-blue-100 text-xs text-blue-900 flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Doctor Clinical Review Note:</span>
                      <p className="mt-0.5 text-blue-800">{inv.doctor_review_notes}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Dialog Modal */}
      {reviewOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Doctor Review: {reviewOrder.test_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Document your clinical interpretation and mark this investigation as reviewed for {patientName} (OH-ID: {onehealthId}).
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Clinical Interpretation / Action Plan:
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Mild microcytic anemia noted; started oral iron supplementation. Retest in 4 weeks..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setReviewOrder(null)}
                className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReview || !reviewNotes.trim()}
                onClick={handleReviewSubmit}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors"
              >
                {isSubmittingReview ? "Saving..." : "Confirm & Mark Reviewed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
