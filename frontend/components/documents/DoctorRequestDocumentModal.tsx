"use client";

import React, { useState } from "react";
import { X, Send, AlertCircle, Clock, Sparkles } from "lucide-react";
import { doctorWorkspaceApi } from "@/lib/api/doctor-workspace";
import { DOCUMENT_CATEGORIES } from "@/lib/api/documents";

interface DoctorRequestDocumentModalProps {
  patientId: string;
  patientName: string;
  isOpen: boolean;
  onClose: () => void;
  onRequestCreated: () => void;
  relatedVisitId?: string;
}

const COMMON_REQUEST_TEMPLATES = [
  {
    type: "IMAGING_REPORT",
    title: "Previous MRI / CT Scan Report",
    instructions: "Please upload your previous MRI / CT imaging film reports or diagnostic CD summary for clinical comparison."
  },
  {
    type: "LAB_REPORT",
    title: "Previous Blood Test / Lipid / HbA1c Profile",
    instructions: "Please provide recent laboratory test results from the last 3-6 months to assess baseline parameters."
  },
  {
    type: "PRESCRIPTION",
    title: "Previous Prescription / Medication List",
    instructions: "Please photograph or upload your current chronic medication prescription from your previous physician."
  },
  {
    type: "DISCHARGE_SUMMARY",
    title: "Past Inpatient Hospital Discharge Summary",
    instructions: "Please upload the complete discharge summary from your previous hospital admission."
  }
];

export const DoctorRequestDocumentModal: React.FC<DoctorRequestDocumentModalProps> = ({
  patientId,
  patientName,
  isOpen,
  onClose,
  onRequestCreated,
  relatedVisitId
}) => {
  const [docType, setDocType] = useState<string>("IMAGING_REPORT");
  const [title, setTitle] = useState<string>("Previous MRI / CT Scan Report");
  const [instructions, setInstructions] = useState<string>(
    "Please upload your previous MRI / CT imaging film reports or diagnostic CD summary for clinical comparison."
  );
  const [urgency, setUrgency] = useState<"ROUTINE" | "URGENT" | "STAT">("ROUTINE");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectTemplate = (tpl: typeof COMMON_REQUEST_TEMPLATES[0]) => {
    setDocType(tpl.type);
    setTitle(tpl.title);
    setInstructions(tpl.instructions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please specify a document title or description.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await doctorWorkspaceApi.requestDocumentFromPatient(patientId, {
        title: title.trim(),
        document_type: docType,
        instructions: instructions.trim() || undefined,
        urgency,
        related_visit_id: relatedVisitId
      });
      onRequestCreated();
      onClose();
    } catch (err: any) {
      console.error("Failed to submit document request:", err);
      setError(err.message || "Failed to dispatch document request to patient.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
                <Send className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Request Document from Patient
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dispatches an in-app request & notification to <strong className="text-slate-800 dark:text-slate-200">{patientName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Templates */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/40 dark:bg-indigo-950/20">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-900 dark:text-indigo-300 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Quick Request Templates:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_REQUEST_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectTemplate(tpl)}
                className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition shadow-2xs font-medium"
              >
                {tpl.title.split("/")[0].trim()}
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Document Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Requested Document Category *
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
            >
              {DOCUMENT_CATEGORIES.filter(c => c.key !== "ALL").map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.icon} {cat.label} — {cat.description}
                </option>
              ))}
            </select>
          </div>

          {/* Document Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Document Title / Specifier *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Previous MRI Brain Scan (2025)"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
              required
            />
          </div>

          {/* Instructions for Patient */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Clinical Instructions for Patient
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Provide specific guidelines on what pages, dates, or resolution are required..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              The patient will see these instructions in their OH-ID app / medical documents vault.
            </p>
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Clinical Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "ROUTINE", label: "Routine", desc: "Next consultation", color: "border-slate-200 text-slate-700" },
                { key: "URGENT", label: "Urgent", desc: "Within 24-48 hrs", color: "border-amber-200 text-amber-700" },
                { key: "STAT", label: "STAT / Immediate", desc: "Active review", color: "border-rose-200 text-rose-700" }
              ].map((lvl) => (
                <button
                  key={lvl.key}
                  type="button"
                  onClick={() => setUrgency(lvl.key as any)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition ${
                    urgency === lvl.key
                      ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 dark:border-indigo-500 ring-1 ring-indigo-500"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-bold text-slate-900 dark:text-white">{lvl.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{lvl.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "Sending Request..." : "Send Request to Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
