"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  FlaskConical, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertCircle, 
  Building2, 
  User, 
  Calendar, 
  ChevronDown, 
  Info, 
  SlidersHorizontal,
  FileText,
  Lock,
  ArrowRight,
  ShieldAlert,
  Users
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { useFamily } from "@/lib/patient/FamilyContext";
import { LabReport, labReportsAPI } from "@/lib/api/lab-reports";
import { LabReportCard } from "@/components/labs/LabReportCard";
import { LabReportShareModal } from "@/components/labs/LabReportShareModal";
import { LabReportValidityExplainerModal } from "@/components/labs/LabReportValidityExplainerModal";

export default function PatientLabReportsListPage() {
  const { activePerson, selectedPersonId, canAccess, familyMembers, primaryProfile, switchPerson } = useFamily();
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "RECENT" | "OUTSIDE_RANGE" | "WITHIN_RANGE" | "PROCESSING" | "CORRECTED">("ALL");
  const [selectedHospital, setSelectedHospital] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("ALL");
  const [selectedResultStatus, setSelectedResultStatus] = useState<string>("ALL");

  // Modals
  const [sharingReport, setSharingReport] = useState<LabReport | null>(null);
  const [explainerOpen, setExplainerOpen] = useState(false);

  const hasPermission = canAccess("view_lab_reports");
  const isSelf = activePerson?.isSelf ?? true;
  const currentName = activePerson?.name || "Patient";

  const fetchReports = async () => {
    if (!hasPermission) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await labReportsAPI.listMyLabReports({
        patient_id: selectedPersonId || undefined,
        search: searchQuery || undefined,
        hospital_id: selectedHospital !== "ALL" ? selectedHospital : undefined,
        test_type: selectedCategory !== "ALL" ? selectedCategory : undefined,
      });

      if (res.success && res.data) {
        setReports(res.data);
      } else {
        setReports([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch lab reports", err);
      setError(err?.message || "Failed to load laboratory reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedPersonId, hasPermission, selectedHospital, selectedCategory]);

  // Handle Search Debounce / Trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchReports();
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Available Hospitals & Categories for Dropdowns
  const hospitalsList = useMemo(() => {
    const hs = new Set<string>();
    reports.forEach((r) => {
      const hName = r.laboratory?.name || r.hospital_name;
      if (hName) hs.add(hName);
    });
    return Array.from(hs);
  }, [reports]);

  const categoriesList = useMemo(() => {
    const cs = new Set<string>();
    reports.forEach((r) => {
      if (r.test_category) cs.add(r.test_category);
    });
    return Array.from(cs);
  }, [reports]);

  // Client-Side Tab & Date Filter Logic
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Status Tab filter
      if (activeTab === "RECENT") {
        const d = r.reported_at || r.ordered_at;
        if (!d) return false;
        const diffDays = (new Date().getTime() - new Date(d).getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30) return false;
      } else if (activeTab === "OUTSIDE_RANGE") {
        if (r.out_of_range_count === 0 && !r.is_abnormal) return false;
      } else if (activeTab === "WITHIN_RANGE") {
        if (r.out_of_range_count > 0 || r.is_abnormal) return false;
      } else if (activeTab === "PROCESSING") {
        if (r.status !== "PROCESSING" && r.status !== "PENDING") return false;
      } else if (activeTab === "CORRECTED") {
        if (!r.is_corrected && r.status !== "CORRECTED") return false;
      }

      // Result Status dropdown filter
      if (selectedResultStatus === "WITHIN_RANGE" && (r.out_of_range_count > 0 || r.is_abnormal)) return false;
      if (selectedResultStatus === "OUTSIDE_RANGE" && (r.out_of_range_count === 0 && !r.is_abnormal)) return false;
      if (selectedResultStatus === "CRITICAL" && r.critical_count === 0) return false;
      if (selectedResultStatus === "PENDING" && r.status !== "PROCESSING" && r.status !== "PENDING") return false;

      // Date Range dropdown filter
      if (selectedDateRange !== "ALL") {
        const d = r.reported_at || r.ordered_at;
        if (!d) return false;
        const diffDays = (new Date().getTime() - new Date(d).getTime()) / (1000 * 3600 * 24);
        if (selectedDateRange === "30_DAYS" && diffDays > 30) return false;
        if (selectedDateRange === "90_DAYS" && diffDays > 90) return false;
        if (selectedDateRange === "PAST_YEAR" && diffDays > 365) return false;
      }

      return true;
    });
  }, [reports, activeTab, selectedResultStatus, selectedDateRange]);

  const handleQuickDownloadPdf = async (rep: LabReport) => {
    try {
      const res = await labReportsAPI.getMyLabReportPdf(rep.id);
      if (res.data?.download_url) {
        window.open(res.data.download_url, "_blank");
      }
    } catch (e) {
      window.location.href = `/patient/labs/${rep.id}`;
    }
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-6xl mx-auto space-y-6 pb-16">
        
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300 rounded-lg">
                <FlaskConical className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Diagnostic Health Records
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {isSelf ? "My Lab Reports" : `${currentName}'s Lab Reports`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Your certified laboratory test results from all connected hospitals and pathology centers in one place.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setExplainerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <Info className="h-3.5 w-3.5 text-teal-600" />
              <span>Reference Ranges Guide</span>
            </button>
            <button
              onClick={fetchReports}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Family Member Active Context Alert */}
        {!isSelf && (
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 p-4 dark:border-indigo-900/50 dark:from-indigo-950/40 dark:to-purple-950/30 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Viewing Lab Reports for Family Member
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {currentName} · OH-ID: {activePerson?.onehealth_id || "OHID-FAMILY"}
                </p>
              </div>
            </div>
            <button
              onClick={() => switchPerson("self")}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold transition shrink-0"
            >
              Switch Back to Myself
            </button>
          </div>
        )}

        {/* Permission Barrier */}
        {!hasPermission ? (
          <div className="p-8 bg-amber-50 border border-amber-200 rounded-3xl text-center space-y-3 dark:bg-amber-950/20 dark:border-amber-900">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Diagnostic Access Consent Required
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Viewing diagnostic reports for {currentName} requires active family permission under the OneHealth ID consent framework.
            </p>
            <Link
              href="/patient/family"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <span>Manage Family Permissions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <>
            {/* Search & Status Tabs Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              
              {/* Search Bar with Autocomplete Suggestions */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lab reports (e.g. CBC, Blood sugar, HbA1c, Lipid, Thyroid, Vitamin D, Liver, Kidney, Urine)..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: "ALL", label: "All Reports" },
                  { id: "RECENT", label: "Recent (30 Days)" },
                  { id: "OUTSIDE_RANGE", label: "Outside Range" },
                  { id: "WITHIN_RANGE", label: "Within Range" },
                  { id: "PROCESSING", label: "Processing / Pending" },
                  { id: "CORRECTED", label: "Corrected Reports" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? "bg-teal-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Multi-Parameter Dropdown Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                
                {/* 1. Patient Selector */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Patient / Family
                  </label>
                  <select
                    value={selectedPersonId || "self"}
                    onChange={(e) => switchPerson(e.target.value === "self" ? null : e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="self">Myself ({primaryProfile?.name || "Primary"})</option>
                    {familyMembers.map((f) => (
                      <option key={f.member_patient_id} value={f.member_patient_id}>
                        {f.relationship}: {f.member_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Hospital / Diagnostic Lab Selector */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Hospital / Laboratory
                  </label>
                  <select
                    value={selectedHospital}
                    onChange={(e) => setSelectedHospital(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="ALL">All Diagnostic Labs ({hospitalsList.length || "All"})</option>
                    {hospitalsList.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Test Type / Category */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Test Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="ALL">All Categories</option>
                    {categoriesList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Result Status */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Result Status
                  </label>
                  <select
                    value={selectedResultStatus}
                    onChange={(e) => setSelectedResultStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="ALL">All Results</option>
                    <option value="WITHIN_RANGE">Within Reference Range</option>
                    <option value="OUTSIDE_RANGE">Outside Reference Range</option>
                    <option value="CRITICAL">Critical Flagged</option>
                    <option value="PENDING">Processing / Pending</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Reports Cards Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredReports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredReports.map((report) => (
                  <LabReportCard
                    key={report.id}
                    report={report}
                    onShareClick={(rep) => setSharingReport(rep)}
                    onPdfClick={(rep) => handleQuickDownloadPdf(rep)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                  <FlaskConical className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No Laboratory Reports Found
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {searchQuery || selectedHospital !== "ALL" || selectedCategory !== "ALL" || activeTab !== "ALL"
                    ? "Try resetting your search query or filter selections to view diagnostic orders."
                    : `No diagnostic test records available on file for ${currentName}.`}
                </p>
                {(searchQuery || selectedHospital !== "ALL" || selectedCategory !== "ALL" || activeTab !== "ALL") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedHospital("ALL");
                      setSelectedCategory("ALL");
                      setSelectedResultStatus("ALL");
                      setActiveTab("ALL");
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Share Modal */}
        <LabReportShareModal
          report={sharingReport}
          isOpen={Boolean(sharingReport)}
          onClose={() => setSharingReport(null)}
        />

        {/* Reference Ranges Explainer Modal */}
        <LabReportValidityExplainerModal
          isOpen={explainerOpen}
          onClose={() => setExplainerOpen(false)}
        />
      </div>
    </WorkspaceLayout>
  );
}
