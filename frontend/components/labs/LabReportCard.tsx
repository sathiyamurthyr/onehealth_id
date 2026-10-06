"use client";

import React from "react";
import Link from "next/link";
import { 
  FlaskConical, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  Share2, 
  FileDown, 
  ChevronRight,
  ShieldCheck,
  Activity
} from "lucide-react";
import { LabReport } from "@/lib/api/lab-reports";

interface LabReportCardProps {
  report: LabReport;
  onShareClick?: (report: LabReport) => void;
  onPdfClick?: (report: LabReport) => void;
}

export const LabReportCard: React.FC<LabReportCardProps> = ({
  report,
  onShareClick,
  onPdfClick,
}) => {
  const isCorrected = report.is_corrected || report.status === "CORRECTED";
  const isProcessing = report.status === "PROCESSING" || report.status === "PENDING";
  const hasAbnormal = report.out_of_range_count > 0 || report.is_abnormal;

  // Format date
  const reportedDate = report.reported_at
    ? new Date(report.reported_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : report.ordered_at
    ? new Date(report.ordered_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Recent";

  return (
    <div 
      className={`group relative rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-teal-300 dark:bg-slate-900 dark:border-slate-800 ${
        isCorrected 
          ? "border-amber-200/80 bg-gradient-to-b from-amber-50/20 to-white dark:from-amber-950/10 dark:to-slate-900" 
          : hasAbnormal 
          ? "border-rose-100 bg-gradient-to-b from-rose-50/15 to-white dark:from-rose-950/10 dark:to-slate-900"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      {/* Top Meta row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2.5 rounded-xl ${
            isCorrected
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              : hasAbnormal
              ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
              : isProcessing
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              : "bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
          }`}>
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900 dark:text-white text-base group-hover:text-teal-600 transition-colors">
                {report.test_name}
              </h3>
              {isCorrected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  <RefreshCw className="h-3 w-3 animate-spin-reverse" />
                  Corrected (v{report.version})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              ID: {report.order_number || report.id}
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div>
          {isProcessing ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
              <Clock className="h-3.5 w-3.5 animate-pulse" />
              Processing
            </span>
          ) : hasAbnormal ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              {report.out_of_range_count} Outside Range
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Within Range
            </span>
          )}
        </div>
      </div>

      {/* Lab Facility & Date */}
      <div className="space-y-1.5 mb-4 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
            {report.laboratory?.name || report.hospital_name || "Diagnostic Laboratory"}
          </span>
          {report.laboratory?.branch && (
            <span className="text-slate-400 truncate">· {report.laboratory.branch}</span>
          )}
        </div>
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{reportedDate}</span>
          </div>
          {report.results_count > 0 && (
            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium text-[11px]">
              <Activity className="h-3 w-3 text-slate-500" />
              {report.results_count} results
            </span>
          )}
        </div>
      </div>

      {/* Patient-Friendly Quick Summary Snippet */}
      {report.patient_summary ? (
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2.5 mb-4 border border-slate-100 dark:border-slate-800">
          {report.patient_summary}
        </p>
      ) : report.doctor_notes ? (
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2.5 mb-4 border border-slate-100 dark:border-slate-800 italic">
          &ldquo;{report.doctor_notes}&rdquo;
        </p>
      ) : null}

      {/* Card Actions */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {onShareClick && (
            <button
              onClick={() => onShareClick(report)}
              className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Share secure link"
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}
          {onPdfClick && (
            <button
              onClick={() => onPdfClick(report)}
              className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Download original PDF"
            >
              <FileDown className="h-4 w-4" />
            </button>
          )}
          {report.digital_signature?.is_signed && (
            <span 
              className="inline-flex items-center text-teal-600 dark:text-teal-400 p-2"
              title="Verified Cryptographic Pathologist Signature"
            >
              <ShieldCheck className="h-4 w-4" />
            </span>
          )}
        </div>

        <Link
          href={`/patient/labs/${report.id}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all group/btn"
        >
          View Report
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
};
