"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FlaskConical, 
  Building2, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  FileDown, 
  Printer, 
  Share2, 
  ShieldCheck, 
  QrCode, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown, 
  Activity, 
  TrendingUp, 
  RefreshCw, 
  Info, 
  Stethoscope, 
  ExternalLink,
  Award,
  Layers,
  ArrowLeft,
  Users
} from "lucide-react";
import { LabReport, LabTestParameter, LabParameterTrendPoint, labReportsAPI } from "@/lib/api/lab-reports";
import { LabReportValidityExplainerModal } from "./LabReportValidityExplainerModal";
import { LabReportShareModal } from "./LabReportShareModal";

interface LabReportDocumentViewProps {
  report: LabReport;
  activePatientName?: string;
  isFamilyContext?: boolean;
  familyRelationship?: string;
  onBack?: () => void;
  isSharedView?: boolean;
}

export const LabReportDocumentView: React.FC<LabReportDocumentViewProps> = ({
  report,
  activePatientName,
  isFamilyContext = false,
  familyRelationship = "Family Member",
  onBack,
  isSharedView = false,
}) => {
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [trendParameter, setTrendParameter] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<LabParameterTrendPoint[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);

  // Group test results by category
  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    report.results_data.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [report.results_data]);

  const filteredResults = React.useMemo(() => {
    if (selectedCategory === "ALL") return report.results_data;
    return report.results_data.filter((p) => p.category === selectedCategory);
  }, [report.results_data, selectedCategory]);

  // Load trend data for selected parameter
  const handleViewTrends = async (paramName: string) => {
    if (trendParameter === paramName) {
      setTrendParameter(null);
      return;
    }
    setTrendParameter(paramName);
    setLoadingTrends(true);
    try {
      const res = await labReportsAPI.getMyLabParameterTrends(paramName, report.patient_id);
      if (res.success && res.data) {
        setTrendData(res.data);
      }
    } catch (e) {
      console.error("Failed to load parameter trends", e);
    } finally {
      setLoadingTrends(false);
    }
  };

  const handlePrint = (type: "ORIGINAL" | "SUMMARY") => {
    labReportsAPI.recordAudit(report.id, `PRINT_${type}`, { channel: "WEB_PORTAL" });
    window.print();
  };

  const handleDownloadPdf = async () => {
    labReportsAPI.recordAudit(report.id, "DOWNLOAD_PDF", { channel: "WEB_PORTAL" });
    try {
      const res = await labReportsAPI.getMyLabReportPdf(report.id);
      if (res.data?.download_url) {
        window.open(res.data.download_url, "_blank");
      }
    } catch (e) {
      window.print();
    }
  };

  const isCorrected = report.is_corrected || report.status === "CORRECTED";
  const isProcessing = report.status === "PROCESSING" || report.status === "PENDING";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Navigation & Action Bar (Hidden in Print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              onClick={onBack}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Back to lab reports"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <Link
              href="/patient/labs"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Back to lab reports"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Official Laboratory Diagnostic Record
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-mono">
                {report.order_number || report.id}
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              {report.test_name}
            </h1>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setExplainerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <Info className="h-4 w-4 text-teal-600" />
            About Reference Ranges
          </button>

          {!isSharedView && (
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          )}

          <button
            onClick={() => handlePrint("ORIGINAL")}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>

          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-all"
          >
            <FileDown className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Family Context Banner if viewing family member's lab report */}
      {isFamilyContext && (
        <div className="print:hidden rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 dark:border-indigo-900/50 dark:from-indigo-950/40 dark:to-purple-950/30 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Authorized Family Record Context
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Viewing report for: {report.patient_name} ({familyRelationship})
              </p>
            </div>
          </div>
          <span className="text-xs font-mono bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200">
            OH-ID: {report.onehealth_id || report.patient_id}
          </span>
        </div>
      )}

      {/* Corrected / Amended Report Banner */}
      {isCorrected && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 dark:bg-amber-950/40 dark:border-amber-800 p-4 shadow-sm flex items-start gap-3.5">
          <div className="p-2 bg-amber-200/70 text-amber-900 dark:bg-amber-900 dark:text-amber-200 rounded-xl mt-0.5">
            <RefreshCw className="h-5 w-5 animate-spin-reverse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                Corrected Laboratory Report (Version {report.version})
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-full">
                Laboratory Amendment
              </span>
            </div>
            <p className="text-xs text-amber-900/90 dark:text-amber-300 mt-1 leading-relaxed">
              {report.correction_reason || "The laboratory has issued a corrected/amended version of this report. The previous version remains auditable in the laboratory archive."}
            </p>
          </div>
        </div>
      )}

      {/* Processing Status Banner */}
      {isProcessing && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800 p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-xl">
            <Clock className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-950 dark:text-blue-200">
              Laboratory Processing In Progress
            </h3>
            <p className="text-xs text-blue-800 dark:text-blue-300 mt-0.5">
              Your sample is currently undergoing diagnostic analysis. Final verified values will automatically populate once certified by the pathologist.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3-LAYER MASTER CLINICAL LABORATORY REPORT SHEET (A4 Printable Layout)     */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
        
        {/* --------------------------------------------------------------------- */}
        {/* HEADER: Laboratory Letterhead with NABL/CAP Accreditation             */}
        {/* --------------------------------------------------------------------- */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-teal-500/20 px-2.5 py-1 text-[11px] font-semibold text-teal-300 border border-teal-500/30">
                  <Award className="h-3.5 w-3.5 text-teal-400" />
                  {report.laboratory?.accreditation || "NABL ISO 15189:2022 Accredited"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                  {report.test_category || "Diagnostic Pathology"}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {report.laboratory?.name || report.hospital_name || "Central Diagnostic Laboratory"}
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                {report.laboratory?.address || "Main Diagnostic Center Campus, Chennai, Tamil Nadu"}
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                <span>Tel: {report.laboratory?.phone || "+91 44 2252 8800"}</span>
                <span>·</span>
                <span>Email: {report.laboratory?.email || "pathology@onehealthid.org"}</span>
              </div>
            </div>

            {/* Verification Status Badge */}
            <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-slate-700 pt-4 sm:pt-0 sm:pl-6 shrink-0">
              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-mono">
                  Report Status
                </span>
                <span className={`inline-flex items-center gap-1.5 text-sm font-bold mt-0.5 px-3 py-1 rounded-full ${
                  isCorrected
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                    : isProcessing
                    ? "bg-blue-400/20 text-blue-300 border border-blue-400/30"
                    : "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                }`}>
                  <CheckCircle2 className="h-4 w-4" />
                  {report.status_display}
                </span>
              </div>
              <div className="text-right mt-2 text-xs font-mono text-slate-300">
                v{report.version}.0
              </div>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* METADATA GRID: Patient, Referring Clinician, and Sample Audit Details  */}
        {/* --------------------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          
          {/* Box 1: Patient Information */}
          <div className="p-5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-teal-600" />
              Patient Details
            </span>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {report.patient_name}
              </p>
              <p className="text-xs font-mono text-teal-700 dark:text-teal-400 font-semibold">
                OH-ID: {report.onehealth_id || report.patient_id}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                <span>Age: {report.patient_age ? `${report.patient_age} yrs` : "N/A"}</span>
                <span>·</span>
                <span>Gender: {report.patient_gender || "N/A"}</span>
                {report.patient_blood_group && (
                  <>
                    <span>·</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {report.patient_blood_group}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Box 2: Referring Provider */}
          <div className="p-5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
              Requested By
            </span>
            {report.doctor?.name ? (
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {report.doctor.name}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {report.doctor.specialty || "Clinical Specialist"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {report.hospital_name || "Associated Hospital"}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 italic">
                  Self-Requested / Direct Lab Walk-in
                </p>
                <p className="text-xs text-slate-500">
                  Requested by: Not provided
                </p>
              </div>
            )}
          </div>

          {/* Box 3: Sample Information */}
          <div className="p-5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-teal-600" />
              Sample Information
            </span>
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span className="text-slate-400">Sample Type:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{report.sample_type || "Whole Blood"}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400 font-sans">Sample ID:</span>
                <span className="text-slate-800 dark:text-slate-200">{report.sample_id || "SMP-001"}</span>
              </div>
              <div className="flex justify-between pt-1 text-[11px] border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400">Reported:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {report.reported_at ? new Date(report.reported_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "In Progress"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* LAYER 3: Patient-Friendly Summary Box                                 */}
        {/* --------------------------------------------------------------------- */}
        <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800">
          <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/60 via-white to-emerald-50/40 dark:from-teal-950/20 dark:via-slate-900 dark:to-emerald-950/20 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
                  Patient-Friendly Result Summary (Layer 3)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 italic">
                Informational overview · Laboratory source remains authoritative
              </span>
            </div>

            {report.patient_summary ? (
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed mb-3">
                {report.patient_summary}
              </p>
            ) : (
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed mb-3">
                Your diagnostic panel contains {report.results_count} test results.{" "}
                {report.normal_count} results are within the laboratory&apos;s standard reference intervals, and{" "}
                {report.out_of_range_count} results are outside the reference ranges.
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-teal-100 dark:border-teal-900/40">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Total Parameters</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{report.results_count}</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">Within Range</span>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{report.normal_count}</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                <span className="text-[11px] text-amber-700 dark:text-amber-400 block">Outside Range</span>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-400">{report.out_of_range_count}</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-blue-200/60 dark:border-blue-900/40">
                <span className="text-[11px] text-blue-700 dark:text-blue-400 block">Critical Flags</span>
                <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{report.critical_count}</span>
              </div>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* LAYER 2: Structured Test Results Table & Visual Bullet Range Engine   */}
        {/* --------------------------------------------------------------------- */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-teal-600" />
                Structured Diagnostic Parameters (Layer 2)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Observed analytical values with laboratory-supplied reference ranges & visual position gauges
              </p>
            </div>

            {/* Category Filter Pills (if multiple categories present) */}
            {categories.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap print:hidden">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    selectedCategory === "ALL"
                      ? "bg-teal-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  All Panels ({report.results_data.length})
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      selectedCategory === c
                        ? "bg-teal-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4">Test Parameter</th>
                  <th className="py-3 px-4">Observed Value</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Reference Range</th>
                  <th className="py-3 px-4 w-44">Visual Range Gauge</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right print:hidden">Trends</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredResults.map((param, idx) => {
                  const isParamAbnormal = param.is_abnormal || param.abnormality_flag === "HIGH" || param.abnormality_flag === "LOW";
                  const isParamCritical = param.is_critical;
                  
                  // Calculate gauge position if reference min/max and numeric observed value available
                  let gaugePercent = 50;
                  const numVal = typeof param.observed_value === "number" 
                    ? param.observed_value 
                    : parseFloat(String(param.observed_value).replace(",", ""));
                  
                  if (!isNaN(numVal) && param.reference_min != null && param.reference_max != null) {
                    const span = (param.reference_max - param.reference_min) || 1;
                    const normalized = ((numVal - param.reference_min) / span) * 60 + 20; // 20% to 80% is normal range
                    gaugePercent = Math.max(5, Math.min(95, normalized));
                  }

                  return (
                    <tr 
                      key={idx}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isParamCritical
                          ? "bg-rose-50/40 dark:bg-rose-950/20"
                          : isParamAbnormal
                          ? "bg-amber-50/30 dark:bg-amber-950/15"
                          : ""
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {param.parameter_name}
                        </div>
                        {param.category && (
                          <div className="text-[11px] text-slate-400">
                            {param.category} {param.test_method ? `· ${param.test_method}` : ""}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-sm">
                        <span className={
                          isParamCritical
                            ? "text-rose-600 dark:text-rose-400"
                            : isParamAbnormal
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-slate-900 dark:text-white"
                        }>
                          {param.observed_value ?? "Pending"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                        {param.unit || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-mono text-xs">
                        {param.reference_range || "N/A"}
                      </td>
                      
                      {/* Visual Range Bar Gauge */}
                      <td className="py-3.5 px-4">
                        <div className="w-full">
                          <div className="relative h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-visible">
                            {/* Normal central zone */}
                            <div className="absolute left-[20%] right-[20%] top-0 bottom-0 bg-emerald-200 dark:bg-emerald-900/60 rounded-sm" />
                            {/* Observed Value Marker */}
                            {param.observed_value != null && (
                              <div 
                                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 shadow ${
                                  isParamCritical
                                    ? "bg-rose-600"
                                    : isParamAbnormal
                                    ? "bg-amber-600"
                                    : "bg-emerald-600"
                                }`}
                                style={{ left: `${gaugePercent}%` }}
                                title={`Observed: ${param.observed_value} ${param.unit || ""}`}
                              />
                            )}
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                            <span>{param.reference_min ?? "Min"}</span>
                            <span>{param.reference_max ?? "Max"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status Tag */}
                      <td className="py-3.5 px-4 text-center">
                        {isParamCritical ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">
                            <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                            Critical
                          </span>
                        ) : isParamAbnormal ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                            <AlertTriangle className="h-3 w-3 text-amber-600" />
                            Outside Range
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Within Range
                          </span>
                        )}
                      </td>

                      {/* Historical Trends Action */}
                      <td className="py-3.5 px-4 text-right print:hidden">
                        <button
                          onClick={() => handleViewTrends(param.parameter_name)}
                          className={`inline-flex items-center gap-1 p-1.5 rounded-lg text-xs transition-colors ${
                            trendParameter === param.parameter_name
                              ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
                              : "text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800"
                          }`}
                          title="View parameter history & trends across prior visits"
                        >
                          <TrendingUp className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card-Based Parameter View */}
          <div className="sm:hidden space-y-3">
            {filteredResults.map((param, idx) => {
              const isParamAbnormal = param.is_abnormal || param.abnormality_flag === "HIGH" || param.abnormality_flag === "LOW";
              const isParamCritical = param.is_critical;

              return (
                <div
                  key={idx}
                  className={`rounded-2xl border p-4 space-y-2.5 ${
                    isParamCritical
                      ? "border-rose-300 bg-rose-50/40 dark:bg-rose-950/20"
                      : isParamAbnormal
                      ? "border-amber-200 bg-amber-50/30 dark:bg-amber-950/15"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {param.parameter_name}
                      </h4>
                      {param.category && (
                        <p className="text-[11px] text-slate-400">{param.category}</p>
                      )}
                    </div>
                    {isParamCritical ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                        Critical
                      </span>
                    ) : isParamAbnormal ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        Outside Range
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        Within Range
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-slate-500">Observed Result:</span>
                    <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                      {param.observed_value ?? "Pending"} {param.unit || ""}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span>Reference Range:</span>
                    <span className="font-mono font-semibold">{param.reference_range || "As per laboratory"}</span>
                  </div>

                  <div className="pt-1 flex items-center justify-end">
                    <button
                      onClick={() => handleViewTrends(param.parameter_name)}
                      className="inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 font-semibold"
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      View Historical Trends
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Historical Trends Viewer Drawer/Section */}
          {trendParameter && (
            <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50/50 dark:bg-teal-950/20 dark:border-teal-900 p-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-teal-600" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Historical Progression: {trendParameter}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Comparing recurring observations across prior laboratory orders
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTrendParameter(null)}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  Close
                </button>
              </div>

              {loadingTrends ? (
                <div className="py-6 text-center text-xs text-slate-500">Loading historical trend points...</div>
              ) : trendData.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  No previous measurements recorded for {trendParameter}.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {trendData.map((tp, idx) => (
                      <div 
                        key={idx}
                        className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-teal-100 dark:border-slate-800 shadow-sm"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span>{new Date(tp.reported_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          <span className="truncate max-w-[120px]">{tp.laboratory_name}</span>
                        </div>
                        <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                          {tp.observed_value} <span className="text-xs text-slate-500 font-sans">{tp.unit}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Ref: {tp.reference_range || "Standard"}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-2">
                    * Note: Biological reference ranges and testing methods may differ between different laboratories and testing dates.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* DOCTOR&apos;S NOTES & CLINICAL INTERPRETATION                              */}
        {/* --------------------------------------------------------------------- */}
        {report.doctor_notes && (
          <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-xl mt-0.5">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Doctor&apos;s Clinical Impression & Notes
                </h4>
                <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">
                  {report.doctor?.name || "Consulting Physician"}
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 italic">
                  &ldquo;{report.doctor_notes}&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* LAYER 1: Authoritative Certification & Pathologist Digital Signature  */}
        {/* --------------------------------------------------------------------- */}
        <div className="p-6 sm:p-8 bg-slate-100/70 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            
            {/* Signature & Pathologist Credentials */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-teal-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Verified & Authenticated
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {report.pathologist.name}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {report.pathologist.qualification || "Consultant Clinical Pathologist"}
              </p>
              <p className="text-xs text-slate-500 font-mono">
                Reg No: {report.pathologist.registration_number || "TN-MCI-2018-44219"}
              </p>
            </div>

            {/* Cryptographic Token & Verification QR */}
            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <QrCode className="h-10 w-10 text-slate-800 dark:text-slate-200" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Digital Verification Token
                </span>
                <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400 block">
                  {report.verification_token}
                </span>
                <Link
                  href={`/verify/lab-report/${report.verification_token}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-teal-600 hover:underline print:hidden"
                >
                  Verify Authenticity <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Legal Safety Notice */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-center">
            This diagnostic report is displayed faithfully as provided by the certified testing laboratory. 
            Biological reference ranges are established by the laboratory. A result outside the reference limits does not constitute a standalone medical diagnosis. 
            For clinical evaluation, please consult your physician.
          </div>
        </div>
      </div>

      {/* Modals */}
      <LabReportValidityExplainerModal
        isOpen={explainerOpen}
        onClose={() => setExplainerOpen(false)}
      />

      <LabReportShareModal
        report={report}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
};
