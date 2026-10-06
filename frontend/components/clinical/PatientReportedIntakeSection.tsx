"use client";

import React from "react";
import { MessageSquare, Clock, AlertCircle, Sparkles, CheckCircle2, ShieldAlert } from "lucide-react";
import { PatientReportedIntake } from "@/lib/types";

interface PatientReportedIntakeSectionProps {
  intake?: PatientReportedIntake | null;
  onApplyToNotes?: (intake: PatientReportedIntake) => void;
}

export function PatientReportedIntakeSection({
  intake,
  onApplyToNotes,
}: PatientReportedIntakeSectionProps) {
  if (!intake || !intake.reason_for_visit) {
    return (
      <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-950">Patient-Reported Intake Pending</h3>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              No pre-consultation symptom description was submitted by the patient prior to this encounter.
              You may inquire during the consultation and record findings in the Clinical Notes section below.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const severityColor = {
    Mild: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Moderate: "bg-amber-50 text-amber-700 border-amber-200",
    Severe: "bg-rose-50 text-rose-700 border-rose-200",
  }[intake.severity || "Moderate"] || "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="bg-linear-to-br from-indigo-50/60 via-white to-purple-50/40 border border-indigo-100 rounded-2xl p-5 shadow-xs transition-all">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-indigo-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Patient-Reported Problem & Visit Description
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-indigo-100/70 text-indigo-700 text-[10px] font-bold tracking-wider uppercase">
                Patient Voice
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Submitted prior to appointment • Original patient words preserved separately from clinical documentation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {intake.severity && (
            <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${severityColor}`}>
              Severity: {intake.severity}
            </span>
          )}
          {onApplyToNotes && (
            <button
              type="button"
              onClick={() => onApplyToNotes(intake)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Copy to HPI Note
            </button>
          )}
        </div>
      </div>

      {/* Main Reason & Patient's Own Words */}
      <div className="mt-4 space-y-4">
        {/* Primary Quote Box */}
        <div className="bg-white/90 border border-indigo-200/80 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Tell the doctor what you are experiencing (Reason for Visit)
          </span>
          <p className="text-sm font-medium text-slate-800 leading-relaxed italic bg-indigo-50/40 p-3 rounded-lg border border-indigo-100/70">
            &ldquo;{intake.reason_for_visit}&rdquo;
          </p>
          {intake.description && intake.description !== intake.reason_for_visit && (
            <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
              {intake.description}
            </p>
          )}
        </div>

        {/* Structured Intake Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {intake.duration && (
            <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
              <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                {intake.duration}
              </p>
            </div>
          )}

          {intake.main_concern && (
            <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Main Concern</span>
              <p className="font-semibold text-slate-800 mt-0.5 truncate">{intake.main_concern}</p>
            </div>
          )}

          {intake.location && (
            <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Location / Site</span>
              <p className="font-semibold text-slate-800 mt-0.5">{intake.location}</p>
            </div>
          )}

          {intake.relieving_factors && (
            <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Relieving Factors</span>
              <p className="font-semibold text-slate-800 mt-0.5">{intake.relieving_factors}</p>
            </div>
          )}
        </div>

        {/* Aggravating & Associated Symptoms */}
        {(intake.aggravating_factors || (intake.associated_symptoms && intake.associated_symptoms.length > 0)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {intake.aggravating_factors && (
              <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aggravating Factors</span>
                <p className="font-medium text-slate-700 mt-0.5">{intake.aggravating_factors}</p>
              </div>
            )}
            {intake.associated_symptoms && intake.associated_symptoms.length > 0 && (
              <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Associated Symptoms</span>
                <div className="flex flex-wrap gap-1.5">
                  {intake.associated_symptoms.map((sym, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200"
                    >
                      {sym}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Patient-Reported Allergies & Medications Warnings */}
        {(intake.known_allergies || intake.current_medications) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {intake.known_allergies && (
              <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-rose-800 font-bold mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  Patient-Reported Allergies
                </div>
                <p className="text-slate-800 font-medium">{intake.known_allergies}</p>
              </div>
            )}
            {intake.current_medications && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-blue-800 font-bold mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  Self-Reported Current Medications
                </div>
                <p className="text-slate-800 font-medium">{intake.current_medications}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
