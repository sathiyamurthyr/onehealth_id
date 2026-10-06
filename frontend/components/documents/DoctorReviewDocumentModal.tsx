"use client";

import React, { useState } from "react";
import { X, CheckCircle2, ShieldCheck, FileText, AlertCircle, Calendar, Building2 } from "lucide-react";
import { doctorWorkspaceApi } from "@/lib/api/doctor-workspace";
import { MedicalDocument } from "@/lib/api/documents";

interface DoctorReviewDocumentModalProps {
  document: MedicalDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onReviewCompleted: () => void;
}

export const DoctorReviewDocumentModal: React.FC<DoctorReviewDocumentModalProps> = ({
  document,
  isOpen,
  onClose,
  onReviewCompleted
}) => {
  const [reviewNotes, setReviewNotes] = useState<string>(
    "Clinically reviewed prior patient-uploaded diagnostic record. Findings noted for active clinical care plan."
  );
  const [markVerified, setMarkVerified] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !document) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewNotes.trim()) {
      setError("Please provide doctor clinical review notes.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await doctorWorkspaceApi.reviewDocument(document.id, {
        review_notes: reviewNotes.trim(),
        mark_verified: markVerified
      });
      onReviewCompleted();
      onClose();
    } catch (err: any) {
      console.error("Failed to record document clinical review:", err);
      setError(err.message || "Failed to submit clinical review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Doctor Clinical Review
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Certify clinical review of patient-uploaded health record
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Context Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Target Document
              </span>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {document.title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                Patient: <strong className="text-slate-700 dark:text-slate-300">{document.patient_name || document.patient_id}</strong> • Code: <span className="font-mono">{document.document_code}</span>
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              {document.source_type}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Clinical Review Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Doctor Clinical Notes & Observations *
            </label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="e.g. Reviewed 2025 MRI scan. Confirmed chronic disc bulge L4-L5 without acute cord compression."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
              required
            />
          </div>

          {/* Verification Checkbox */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start gap-3">
            <input
              type="checkbox"
              id="mark-verified-cb"
              checked={markVerified}
              onChange={(e) => setMarkVerified(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="mark-verified-cb" className="cursor-pointer select-none">
              <span className="font-bold text-slate-900 dark:text-white block text-xs">
                Mark as Clinically Verified Record
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Upgrades document status to <span className="font-mono font-semibold">VERIFIED</span> with official digital signature and doctor stamp.
              </span>
            </label>
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
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {submitting ? "Submitting Review..." : "Confirm Doctor Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
