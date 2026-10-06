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
  Eye,
  Building2,
  User,
  Calendar,
  Layers,
  ExternalLink,
  ShieldCheck,
  FolderOpen
} from "lucide-react";

interface MedicalDocumentsTimelineViewProps {
  documents: MedicalDocument[];
  onView: (document: MedicalDocument) => void;
  onShare: (document: MedicalDocument) => void;
}

export const MedicalDocumentsTimelineView: React.FC<MedicalDocumentsTimelineViewProps> = ({
  documents,
  onView,
  onShare
}) => {
  // Group documents by "Month Year" (e.g., "October 2026", "September 2026")
  const groupedByMonth = React.useMemo(() => {
    const groups: { [key: string]: MedicalDocument[] } = {};

    // Sort documents descending by date first
    const sorted = [...documents].sort((a, b) => {
      return new Date(b.document_date).getTime() - new Date(a.document_date).getTime();
    });

    sorted.forEach((doc) => {
      let groupKey = "Undated";
      if (doc.document_date) {
        try {
          const d = new Date(doc.document_date);
          groupKey = d.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric"
          });
        } catch {
          groupKey = "Other Records";
        }
      }
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(doc);
    });

    return groups;
  }, [documents]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "DISCHARGE_SUMMARY":
        return <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case "LAB_REPORT":
        return <FlaskConical className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "PRESCRIPTION":
        return <Pill className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case "MEDICAL_CERTIFICATE":
        return <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case "IMAGING_REPORT":
        return <Scan className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case "REFERRAL_LETTER":
        return <ExternalLink className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
      case "CLINICAL_DOCUMENT":
        return <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      case "INSURANCE_DOCUMENT":
        return <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      default:
        return <FolderOpen className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
    }
  };

  const formatDay = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {Object.entries(groupedByMonth).map(([monthYear, docs]) => (
        <div key={monthYear} className="relative pl-10">
          {/* Month Header Node */}
          <div className="absolute left-0 top-1 -translate-x-1/2 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md border-4 border-slate-50 dark:border-slate-900 z-10">
            <Calendar className="w-3.5 h-3.5" />
          </div>

          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{monthYear}</span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {docs.length} {docs.length === 1 ? "document" : "documents"}
              </span>
            </h3>
          </div>

          {/* Document list for this month */}
          <div className="space-y-3">
            {docs.map((doc) => {
              const categoryConfig =
                DOCUMENT_CATEGORIES.find((c) => c.key === doc.category) ||
                DOCUMENT_CATEGORIES.find((c) => c.key === "OTHER")!;

              const isPatientUploaded = doc.source_type === "PATIENT_UPLOADED";

              return (
                <div
                  key={doc.id}
                  data-testid={`timeline-item-${doc.id}`}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 text-center shrink-0 pt-0.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        {formatDay(doc.document_date)}
                      </span>
                    </div>

                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      {getCategoryIcon(doc.category)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {doc.title}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${categoryConfig.badgeColor}`}
                        >
                          {categoryConfig.label}
                        </span>
                        {isPatientUploaded && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-medium">
                            Uploaded by You
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {doc.hospital_name || (isPatientUploaded ? "Personal Vault" : "Healthcare Network")}
                        </span>
                        {doc.doctor_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {doc.doctor_name}
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-slate-400">
                          {doc.document_code}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onShare(doc)}
                      className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                      title="Share document"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onView(doc)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
