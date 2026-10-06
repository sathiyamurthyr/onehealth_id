"use client";

import React from "react";
import {
  CheckCircle2,
  AlertCircle,
  FileCheck,
  X,
  Pill,
  FlaskConical,
  Share2,
  Calendar,
  Stethoscope,
  ShieldCheck
} from "lucide-react";
import { Patient } from "@/lib/types";

interface ConsultationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  patient: Patient;
  hasPatientIntake: boolean;
  clinicalNotesEntered: boolean;
  diagnosesCount: number;
  prescriptionsCount: number;
  investigationsCount: number;
  hasReferral: boolean;
  hasFollowUp: boolean;
  followUpDate?: string;
  primaryDiagnosis?: string;
}

export function ConsultationReviewModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  patient,
  hasPatientIntake,
  clinicalNotesEntered,
  diagnosesCount,
  prescriptionsCount,
  investigationsCount,
  hasReferral,
  hasFollowUp,
  followUpDate,
  primaryDiagnosis,
}: ConsultationReviewModalProps) {
  if (!isOpen) return null;

  const checklist = [
    {
      label: "Patient Problem / Description Reviewed",
      status: hasPatientIntake ? "COMPLETE" : "OPTIONAL",
      detail: hasPatientIntake ? "Pre-consultation intake verified" : "No pre-intake submitted",
    },
    {
      label: "Clinical Notes & Examination Recorded",
      status: clinicalNotesEntered ? "COMPLETE" : "OPTIONAL",
      detail: clinicalNotesEntered ? "SOAP notes & examination documented" : "Standard notes",
    },
    {
      label: `Diagnosis Coded (${diagnosesCount} recorded)`,
      status: diagnosesCount > 0 ? "COMPLETE" : "ATTENTION",
      detail: primaryDiagnosis ? `Primary: ${primaryDiagnosis}` : "No primary diagnosis selected",
    },
    {
      label: `Prescription Configured (${prescriptionsCount} medicines)`,
      status: prescriptionsCount > 0 ? "COMPLETE" : "OPTIONAL",
      detail: prescriptionsCount > 0 ? `${prescriptionsCount} medications prescribed with frequency & route` : "No prescription issued",
    },
    {
      label: `Investigation Orders (${investigationsCount} ordered)`,
      status: investigationsCount > 0 ? "COMPLETE" : "OPTIONAL",
      detail: investigationsCount > 0 ? `${investigationsCount} diagnostic orders attached` : "No lab tests ordered",
    },
    {
      label: "Specialist Referral",
      status: hasReferral ? "COMPLETE" : "OPTIONAL",
      detail: hasReferral ? "Internal/External referral attached" : "None required",
    },
    {
      label: "Follow-up Configured",
      status: hasFollowUp ? "COMPLETE" : "OPTIONAL",
      detail: hasFollowUp ? `Next appointment: ${followUpDate || "Configured"}` : "SOS / As needed",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Pre-Completion Clinical Review
              </h3>
              <p className="text-xs text-slate-500">
                {patient.name} • OH-ID: <span className="font-mono font-semibold">{patient.onehealth_id || patient.id}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        <p className="text-xs text-slate-600 leading-relaxed">
          Please review the consultation checklist before finalizing. Upon completion, this clinical encounter record and associated prescriptions will become <strong>versioned and immutable</strong>.
        </p>

        {/* Verification Checklist */}
        <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200 text-xs">
          {checklist.map((item, idx) => (
            <div key={idx} className="flex items-start justify-between gap-2 py-1">
              <div className="flex items-start gap-2">
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    item.status === "COMPLETE"
                      ? "text-emerald-600"
                      : item.status === "ATTENTION"
                      ? "text-amber-500"
                      : "text-slate-400"
                  }`}
                />
                <div>
                  <span className="font-semibold text-slate-800">{item.label}</span>
                  <p className="text-[11px] text-slate-500">{item.detail}</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                  item.status === "COMPLETE"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : item.status === "ATTENTION"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Back to Edit
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            {isSubmitting ? "Finalizing Encounter..." : "Complete Consultation"}
          </button>
        </div>
      </div>
    </div>
  );
}
