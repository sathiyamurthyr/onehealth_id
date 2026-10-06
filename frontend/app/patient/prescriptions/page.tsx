"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pill, Stethoscope, Hospital, Calendar, ArrowLeft, Download,
  Printer, Share2, Search, Filter, RefreshCw, AlertCircle,
  CheckCircle2, Clock, AlertTriangle, XCircle, Info, ChevronRight,
  ShieldCheck, Eye, FileText, User, Sparkles, Building2
} from "lucide-react";
import { api, PatientVisitedHospital } from "@/lib/api";
import { prescriptionsApi, PrescriptionRecord, PrescriptionFilterParams } from "@/lib/api/prescriptions";
import { useFamily } from "@/lib/patient/FamilyContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { PrescriptionShareModal } from "@/components/prescriptions/PrescriptionShareModal";
import { PrescriptionValidityExplainerModal } from "@/components/prescriptions/PrescriptionValidityExplainerModal";

type StatusTab = "ALL" | "ACTIVE" | "EXPIRED" | "COMPLETED" | "SUPERSEDED" | "CANCELLED";

export default function PatientPrescriptionsListPage() {
  const router = useRouter();
  const { activePerson, selectedPersonId, canAccess } = useFamily();

  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [hospitals, setHospitals] = useState<PatientVisitedHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [statusTab, setStatusTab] = useState<StatusTab>("ALL");
  const [hospitalFilter, setHospitalFilter] = useState<string>("ALL");
  const [doctorFilter, setDoctorFilter] = useState<string>("ALL");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("ALL_TIME");
  const [prescriptionTypeFilter, setPrescriptionTypeFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modals State
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [shareTargetRx, setShareTargetRx] = useState<PrescriptionRecord | null>(null);

  const hasPermission = canAccess("view_prescriptions");

  const loadPrescriptions = async () => {
    if (!hasPermission) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const params: PrescriptionFilterParams = {
        patient_id: selectedPersonId || undefined,
        status: statusTab !== "ALL" ? statusTab : undefined,
        hospital_id: hospitalFilter !== "ALL" ? hospitalFilter : undefined,
        doctor_id: doctorFilter !== "ALL" ? doctorFilter : undefined,
        date_range: dateRangeFilter !== "ALL_TIME" ? dateRangeFilter : undefined,
        prescription_type: prescriptionTypeFilter !== "ALL" ? prescriptionTypeFilter : undefined,
        search: searchTerm.trim() || undefined,
      };

      const [rxRes, hospRes] = await Promise.all([
        prescriptionsApi.getMyPrescriptions(params).catch(() => ({ success: true, data: [] })),
        api.patient.getHospitals(selectedPersonId || undefined).catch(() => ({ success: true, data: [] })),
      ]);

      setPrescriptions(rxRes?.data || []);
      setHospitals(hospRes?.data || []);
    } catch (err: any) {
      console.error("Failed to fetch prescriptions:", err);
      setError(err?.message || "Failed to load prescriptions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, [selectedPersonId, hasPermission, statusTab, hospitalFilter, doctorFilter, dateRangeFilter, prescriptionTypeFilter]);

  // Handle live search filter trigger
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPrescriptions();
  };

  // Distinct doctors for filtering
  const distinctDoctors = useMemo(() => {
    const map = new Map<string, string>();
    prescriptions.forEach((r) => {
      if (r.doctor_id && r.doctor_name) {
        map.set(r.doctor_id, r.doctor_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [prescriptions]);

  // Status counts for tabs
  const counts = useMemo(() => {
    return {
      all: prescriptions.length,
      active: prescriptions.filter((r) => r.computed_status === "ACTIVE" || r.is_valid).length,
      expired: prescriptions.filter((r) => r.computed_status === "EXPIRED" || r.is_expired).length,
      completed: prescriptions.filter((r) => r.computed_status === "COMPLETED").length,
      superseded: prescriptions.filter((r) => r.computed_status === "SUPERSEDED").length,
      cancelled: prescriptions.filter((r) => r.computed_status === "CANCELLED").length,
    };
  }, [prescriptions]);

  const isSelf = activePerson?.isSelf ?? true;
  const currentName = activePerson?.name || "Patient";

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <Link
            href="/patient"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Health Workspace</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Person:</span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
              {currentName} {isSelf ? "(Self)" : `(${activePerson?.relationship})`}
            </span>
          </div>
        </div>

        {/* Page Title & About Validity Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                <Pill className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Prescriptions</h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Digital prescriptions, medication instructions, validity tracking, and verification
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExplainerOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Info className="w-4 h-4" />
              <span>About Prescription Validity</span>
            </button>
            <button
              onClick={loadPrescriptions}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
              title="Refresh prescriptions"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Permission Gate */}
        {!hasPermission && (
          <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>Restricted Family Access</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              You do not have active consent permission to view prescriptions for <strong>{currentName}</strong>. Please request <em>View Prescriptions</em> consent from the primary account holder.
            </p>
          </div>
        )}

        {hasPermission && (
          <>
            {/* Search and Secondary Filter Bar */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by medicine name, doctor, hospital, diagnosis, or RX ID..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Search
                </button>
              </form>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                {[
                  { id: "ALL", label: "All", count: counts.all },
                  { id: "ACTIVE", label: "✓ Currently Valid", count: counts.active, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                  { id: "EXPIRED", label: "Expired", count: counts.expired, color: "text-rose-700 bg-rose-50 border-rose-200" },
                  { id: "COMPLETED", label: "Completed", count: counts.completed, color: "text-blue-700 bg-blue-50 border-blue-200" },
                  { id: "SUPERSEDED", label: "Replaced / Superseded", count: counts.superseded, color: "text-amber-700 bg-amber-50 border-amber-200" },
                  { id: "CANCELLED", label: "Cancelled", count: counts.cancelled, color: "text-red-700 bg-red-50 border-red-200" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusTab(tab.id as StatusTab)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                      statusTab === tab.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        statusTab === tab.id ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Secondary Filter Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-xs">
                {/* Hospital Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Hospital Facility
                  </label>
                  <select
                    value={hospitalFilter}
                    onChange={(e) => setHospitalFilter(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Hospitals & Clinics</option>
                    {hospitals.map((h) => (
                      <option key={h.hospital_id} value={h.hospital_id}>
                        {h.name || (h as any).hospital_name || h.hospital_id}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Doctor Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Doctor
                  </label>
                  <select
                    value={doctorFilter}
                    onChange={(e) => setDoctorFilter(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Prescribing Doctors</option>
                    {distinctDoctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Date Range
                  </label>
                  <select
                    value={dateRangeFilter}
                    onChange={(e) => setDateRangeFilter(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL_TIME">All Time</option>
                    <option value="LAST_30_DAYS">Last 30 Days</option>
                    <option value="LAST_6_MONTHS">Last 6 Months</option>
                    <option value="LAST_YEAR">Last 1 Year</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Prescriptions List */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-6 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-3">
                    <div className="h-5 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                    <div className="h-10 bg-slate-50 rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white border border-slate-200/80 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Pill className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">No Prescriptions Found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {searchTerm || statusTab !== "ALL" || hospitalFilter !== "ALL"
                      ? "No prescriptions match the selected filter criteria. Try resetting filters."
                      : `No digital prescriptions have been issued to ${currentName} yet.`}
                  </p>
                </div>
                {(searchTerm || statusTab !== "ALL" || hospitalFilter !== "ALL") && (
                  <button
                    onClick={() => {
                      setStatusTab("ALL");
                      setHospitalFilter("ALL");
                      setDoctorFilter("ALL");
                      setDateRangeFilter("ALL_TIME");
                      setSearchTerm("");
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {prescriptions.map((rx) => {
                  const isActive = rx.computed_status === "ACTIVE" || rx.is_valid;
                  const isExpired = rx.computed_status === "EXPIRED" || rx.is_expired;
                  const isSuperseded = rx.computed_status === "SUPERSEDED";
                  const isCancelled = rx.computed_status === "CANCELLED";
                  const isCompleted = rx.computed_status === "COMPLETED";

                  return (
                    <div
                      key={rx.id}
                      className="p-5 md:p-6 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition space-y-4"
                    >
                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm md:text-base">
                              {rx.doctor_name}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs font-semibold text-indigo-700">
                              {rx.doctor_specialty || "General Medicine"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Hospital className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{rx.hospital_name}</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isExpired
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : isSuperseded
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : isCancelled
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            {isExpired && <Clock className="w-3.5 h-3.5 text-rose-600" />}
                            {isSuperseded && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                            {isCancelled && <XCircle className="w-3.5 h-3.5 text-red-600" />}
                            <span>{rx.status_display || rx.computed_status}</span>
                          </span>
                        </div>
                      </div>

                      {/* RX Details Strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Prescription ID</span>
                          <span className="font-mono font-bold text-slate-800">{rx.id}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Issued Date</span>
                          <span className="font-semibold text-slate-800">
                            {rx.created_at ? new Date(rx.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Valid Until</span>
                          <span className={`font-semibold ${isExpired ? "text-rose-600 font-bold" : "text-slate-800"}`}>
                            {rx.valid_until ? new Date(rx.valid_until).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "As advised"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Medicines</span>
                          <span className="font-bold text-indigo-700">{rx.items?.length || 0} Prescribed</span>
                        </div>
                      </div>

                      {/* Medicines Preview Pills */}
                      {rx.items && rx.items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {rx.items.map((it, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/80 flex items-center gap-1"
                            >
                              <Pill className="w-3 h-3 text-indigo-600" />
                              <span>
                                {it.medicine_name} {it.strength ? `(${it.strength})` : ""}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Superseded Notice Link if applicable */}
                      {isSuperseded && rx.superseded_by_id && (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                          <span>Replaced by newer prescription <strong>{rx.superseded_by_id}</strong>.</span>
                          <Link
                            href={`/patient/prescriptions/${rx.superseded_by_id}`}
                            className="font-bold text-amber-800 hover:underline flex items-center gap-1"
                          >
                            <span>View Latest</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/patient/prescriptions/${rx.id}`}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Full Prescription</span>
                          </Link>

                          <Link
                            href={`/patient/prescriptions/${rx.id}`}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </Link>
                        </div>

                        <button
                          onClick={() => setShareTargetRx(rx)}
                          className="px-3 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Explainer Modal */}
      <PrescriptionValidityExplainerModal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
      />

      {/* Share Modal */}
      {shareTargetRx && (
        <PrescriptionShareModal
          isOpen={!!shareTargetRx}
          onClose={() => setShareTargetRx(null)}
          prescriptionId={shareTargetRx.id}
          prescriptionNumber={shareTargetRx.id}
        />
      )}
    </WorkspaceLayout>
  );
}
