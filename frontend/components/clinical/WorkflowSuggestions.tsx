"use client";

import React, { useState } from "react";
import {
  Sparkles,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export interface WorkflowSuggestion {
  id: string;
  type: "LAB_REPORT" | "FOLLOW_UP" | "ALLERGY_ALERT" | "CHRONIC_REVIEW" | "INTERACTION_CHECK";
  title: string;
  description: string;
  badge: string;
  severity: "info" | "warning" | "caution";
  actionLabel?: string;
  actionTarget?: string;
}

interface WorkflowSuggestionsProps {
  patient: {
    allergies?: string[];
    chronic_conditions?: string[];
    next_visit?: string | null;
    last_visit?: string | null;
  };
  hasRecentReports?: boolean;
  recentReportTitle?: string;
  onAction?: (type: string, target?: string) => void;
}

export const WorkflowSuggestions: React.FC<WorkflowSuggestionsProps> = ({
  patient,
  hasRecentReports = true,
  recentReportTitle = "Comprehensive Metabolic Panel & Lipid Profile (15-Sep-2026)",
  onAction,
}) => {
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Dynamically assemble clinical workflow reminders (NON-AUTONOMOUS, WORKFLOW ONLY)
  const suggestions: WorkflowSuggestion[] = [];

  if (hasRecentReports) {
    suggestions.push({
      id: "sug-rep-01",
      type: "LAB_REPORT",
      title: "Previous Diagnostic Report Available",
      description: `New laboratory panel filed: "${recentReportTitle}". Review baseline values before ordering repeat tests.`,
      badge: "Investigation Notice",
      severity: "info",
      actionLabel: "View Report",
      actionTarget: "reports-tab",
    });
  }

  if (patient.allergies && patient.allergies.length > 0) {
    suggestions.push({
      id: "sug-alg-01",
      type: "ALLERGY_ALERT",
      title: `Documented Allergens: ${patient.allergies.join(", ")}`,
      description: "Cross-check beta-lactam and NSAID drug classes during medication selection to avoid adverse cross-reactivity.",
      badge: "Safety Verification",
      severity: "warning",
      actionLabel: "Verify Allergy Profile",
      actionTarget: "history-allergies",
    });
  }

  if (!patient.next_visit) {
    suggestions.push({
      id: "sug-fup-01",
      type: "FOLLOW_UP",
      title: "Scheduled Follow-up Not Placed",
      description: "Hypertension and metabolic management guidelines advise a 2-4 week review interval. No booking is currently queued.",
      badge: "Workflow Prompt",
      severity: "caution",
      actionLabel: "Draft Follow-up Plan",
      actionTarget: "followup-section",
    });
  }

  if (patient.chronic_conditions && patient.chronic_conditions.length > 0) {
    suggestions.push({
      id: "sug-chr-01",
      type: "CHRONIC_REVIEW",
      title: `Active Chronic Regimen: ${patient.chronic_conditions.join(", ")}`,
      description: "Verify adherence and refill requirements for existing maintenance therapies before closing today's encounter.",
      badge: "Care Continuity",
      severity: "info",
      actionLabel: "Check Active Rx",
      actionTarget: "rx-section",
    });
  }

  const activeSuggestions = suggestions.filter((s) => !dismissed.includes(s.id));

  if (activeSuggestions.length === 0) return null;

  const getSeverityStyles = (sev: "info" | "warning" | "caution") => {
    switch (sev) {
      case "warning":
        return {
          card: "border-amber-200 bg-amber-50/40 text-amber-950",
          badge: "bg-amber-100 text-amber-800 border-amber-200",
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />,
          btn: "bg-amber-600 hover:bg-amber-700 text-white",
        };
      case "caution":
        return {
          card: "border-sky-200 bg-sky-50/40 text-sky-950",
          badge: "bg-sky-100 text-sky-800 border-sky-200",
          icon: <Clock className="w-4 h-4 text-sky-600 flex-shrink-0" />,
          btn: "bg-sky-600 hover:bg-sky-700 text-white",
        };
      case "info":
      default:
        return {
          card: "border-slate-200 bg-white text-slate-800 hover:border-slate-300",
          badge: "bg-slate-100 text-slate-700 border-slate-200",
          icon: <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />,
          btn: "bg-indigo-600 hover:bg-indigo-700 text-white",
        };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6 transition-all">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              OHID Clinical Workflow Prompts
              <span className="text-[11px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                Decision Support (Advisory Only)
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Contextual alerts to assist clinical workflow and follow-up continuity without restricting doctor autonomy.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {activeSuggestions.length} active notice{activeSuggestions.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {activeSuggestions.map((sug) => {
          const style = getSeverityStyles(sug.severity);
          return (
            <div
              key={sug.id}
              className={`p-3.5 rounded-lg border flex flex-col justify-between transition-all ${style.card}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    {style.icon}
                    <span className="text-xs font-semibold text-slate-900">
                      {sug.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded border ${style.badge}`}
                    >
                      {sug.badge}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDismissed((prev) => [...prev, sug.id])}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                      title="Dismiss notice"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  {sug.description}
                </p>
              </div>

              {sug.actionLabel && (
                <div className="pt-2 border-t border-slate-100/60 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onAction && onAction(sug.type, sug.actionTarget)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <span>{sug.actionLabel}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
