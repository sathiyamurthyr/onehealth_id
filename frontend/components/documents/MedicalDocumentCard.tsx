"use client";

import React from "react";
import { MedicalDocument, DOCUMENT_CATEGORIES } from "@/lib/api/documents";
import {
  FileText,
  FlaskConical,
  Pill,
  Award,
  Scan,
  Share2,
  Download,
  Eye,
  Building2,
  User,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  FolderOpen
} from "lucide-react";

interface MedicalDocumentCardProps {
  document: MedicalDocument;
  onView: (document: MedicalDocument) => void;
  onShare?: (document: MedicalDocument) => void;
  onDownload?: (document: MedicalDocument) => void;
  onReview?: (document: MedicalDocument) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectToggle?: (document: MedicalDocument) => void;
}

export const MedicalDocumentCard: React.FC<MedicalDocumentCardProps> = ({
  document,
  onView,
  onShare,
  onDownload,
  onReview,
  selectable,
  selected,
  onSelectToggle
}) => {
  const categoryConfig =
    DOCUMENT_CATEGORIES.find((c) => c.key === document.category) ||
    DOCUMENT_CATEGORIES.find((c) => c.key === "OTHER")!;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "DISCHARGE_SUMMARY":
        return <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "LAB_REPORT":
        return <FlaskConical className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case "PRESCRIPTION":
        return <Pill className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case "MEDICAL_CERTIFICATE":
        return <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case "IMAGING_REPORT":
        return <Scan className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case "REFERRAL_LETTER":
        return <ExternalLink className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />;
      case "CLINICAL_DOCUMENT":
        return <Layers className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      case "INSURANCE_DOCUMENT":
        return <ShieldCheck className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
      default:
        return <FolderOpen className="w-5 h-5 text-slate-600 dark:text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === "VERIFIED" || s === "VALID") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Verified Record
        </span>
      );
    }
    if (s === "REVIEWED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Clinically Reviewed
        </span>
      );
    }
    if (s === "AVAILABLE" || s === "FINAL") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {status === "FINAL" ? "Final Report" : "Available"}
        </span>
      );
    }
    if (s === "EXPIRED" || s === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
          <AlertTriangle className="w-3.5 h-3.5" />
          {status}
        </span>
      );
    }
    if (s === "CORRECTED" || s === "SUPERSEDED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
          <Clock className="w-3.5 h-3.5" />
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {status}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const isPatientUploaded =
    document.source_type === "PATIENT_UPLOADED" ||
    document.source_type === "PATIENT";
  const isExternal =
    document.source_type === "EXTERNAL_PROVIDER";
  const isReviewed =
    document.status === "REVIEWED" || Boolean(document.reviewed_by);
  const isVerified =
    document.status === "VERIFIED" || Boolean(document.verified_by);

  return (
    <div
      data-testid={`document-card-${document.id}`}
      className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group ${
        selected
          ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10"
          : "border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700"
      }`}
    >
      <div>
        {/* Top bar: Category icon/badge, Checkbox & Date */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {selectable && (
              <input
                type="checkbox"
                checked={selected || false}
                onChange={() => onSelectToggle && onSelectToggle(document)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            )}

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${categoryConfig.badgeColor}`}
            >
              {getCategoryIcon(document.category)}
              {categoryConfig.label}
            </span>

            {/* Source Label Tag with Verified / Reviewed distinctions */}
            {isVerified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                🏥 Provider Record
              </span>
            ) : isReviewed ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                🩺 Reviewed by Dr. {document.reviewed_by_name || "Doctor"}
              </span>
            ) : isPatientUploaded ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                👤 Uploaded by You (Not verified)
              </span>
            ) : isExternal ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800">
                🌐 External Provider
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50/70 text-blue-800 border border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900">
                🏥 Healthcare Provider
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {formatDate(document.document_date)}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
          {document.title}
        </h3>

        {/* Facility / Doctor / Visit Metadata */}
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-4 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
              {document.hospital_name || (isPatientUploaded ? "Personal Vault" : "Healthcare Network")}
            </span>
            {document.department && (
              <span className="text-slate-400 text-[11px] truncate">
                • {document.department}
              </span>
            )}
          </div>

          {document.doctor_name && (
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {document.doctor_name}
                {document.doctor_specialty && (
                  <span className="text-slate-400 ml-1 font-normal">
                    ({document.doctor_specialty})
                  </span>
                )}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
            <span className="font-mono">
              ID: {document.document_code || document.id.substring(0, 12)}
            </span>
            {document.visit_id && (
              <span className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                Visit: {document.visit_id}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Status and Action Buttons */}
      <div>
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>{getStatusBadge(document.status)}</div>

          <div className="flex items-center gap-1.5">
            {onReview && (
              <button
                onClick={() => onReview(document)}
                title="Clinically review this document"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Review
              </button>
            )}

            {onShare && (
              <button
                onClick={() => onShare(document)}
                title="Share document securely"
                className="p-2 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {onDownload && (
              <button
                onClick={() => onDownload(document)}
                title="Download document file"
                className="p-2 text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => onView(document)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-150 hover:shadow"
            >
              <Eye className="w-3.5 h-3.5" />
              {document.category === "IMAGING_REPORT" && (document.images_count || 0) > 0 ? "View & Images" : "View"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
