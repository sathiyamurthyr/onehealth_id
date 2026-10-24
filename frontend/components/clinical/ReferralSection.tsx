"use client";

import React, { useState } from "react";
import {
  Share2,
  AlertTriangle,
  Building,
  User,
  CheckCircle2,
  FileCheck,
  Send,
  ShieldCheck
} from "lucide-react";
import { ReferralPayload } from "@/lib/types";

interface ReferralSectionProps {
  referral?: ReferralPayload;
  onChange: (ref: ReferralPayload) => void;
}

const SPECIALTIES = [
  "Cardiology & Intensive Care",
  "Neurology & Neuro Surgery",
  "Nephrology & Renal Dialysis",
  "Endocrinology & Diabetology",
  "Orthopedics & Joint Care",
  "Gastroenterology",
  "Ophthalmology (Diabetic Retinopathy)",
  "Pulmonology & Respiratory Medicine",
];

const CONSULTANTS: Record<string, string[]> = {
  "Cardiology & Intensive Care": ["Dr. Sundaramoorthy (DM Cardio)", "Dr. Senthil Nathan (MD, DM)"],
  "Neurology & Neuro Surgery": ["Dr. Rajesh (MCh Neuro)", "Dr. K. Meenakshi (DM Neuro)"],
  "Nephrology & Renal Dialysis": ["Dr. Ramesh (DM Nephro)", "Dr. Anitha (MD Gen Med)"],
  "Endocrinology & Diabetology": ["Dr. Arvind (DM Endo)", "Dr. Preethi (MD)"],
  "Orthopedics & Joint Care": ["Dr. Manikandan (MS Ortho)", "Dr. Vikram (DNB Ortho)"],
};

export function ReferralSection({ referral, onChange }: ReferralSectionProps) {
  const [createdNotice, setCreatedNotice] = useState(false);

  const currentRef: ReferralPayload = referral || {
    patient_id: "",
    referring_doctor_id: "",
    referral_type: "INTERNAL",
    specialty: "Cardiology & Intensive Care",
    receiving_doctor_name: "",
    reason: "",
    clinical_summary: "",
    priority: "ROUTINE",
    requested_evaluation: "",
    attached_reports: [],
  };

  const handleSpecialtyChange = (spec: string) => {
    const defaultDoc = CONSULTANTS[spec]?.[0] || "Attending Specialist";
    onChange({
      ...currentRef,
      specialty: spec,
      receiving_doctor_name: defaultDoc,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="bg-slate-50/70 border-b border-slate-200/80 px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-purple-600" />
            <span>Refer Patient to Specialist / External Facility</span>
          </h3>
          <p className="text-[11px] text-slate-500">
            Internal & external medical consultations with scoped clinical summaries and priority ratings.
          </p>
        </div>

        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
          Point 11 Spec
        </span>
      </div>

      <div className="p-6 space-y-4">
        {createdNotice && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Referral created. Secure clinical summary routed to receiving specialist.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Referral Type</label>
            <div className="flex gap-2">
              {(["INTERNAL", "EXTERNAL"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChange({ ...currentRef, referral_type: t })}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                    currentRef.referral_type === t
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {t === "INTERNAL" ? "Internal Department" : "External Hospital"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Specialty</label>
            <select
              value={currentRef.specialty}
              onChange={(e) => handleSpecialtyChange(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
            >
              {SPECIALTIES.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Consulting Specialist</label>
            <select
              value={currentRef.receiving_doctor_name || ""}
              onChange={(e) => onChange({ ...currentRef, receiving_doctor_name: e.target.value })}
              className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
            >
              {(CONSULTANTS[currentRef.specialty] || ["Attending Specialist"]).map((doc) => (
                <option key={doc} value={doc}>
                  {doc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Priority Rating */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Referral Priority</label>
          <div className="grid grid-cols-3 gap-2">
            {(["ROUTINE", "URGENT", "EMERGENCY"] as const).map((pri) => (
              <button
                key={pri}
                type="button"
                onClick={() => onChange({ ...currentRef, priority: pri })}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  currentRef.priority === pri
                    ? pri === "EMERGENCY"
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : pri === "URGENT"
                      ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                      : "bg-purple-600 text-white border-purple-600 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {pri}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Reason for Clinical Referral
            </label>
            <input
              type="text"
              value={currentRef.reason}
              onChange={(e) => onChange({ ...currentRef, reason: e.target.value })}
              placeholder="e.g. Further evaluation of borderline hypertension and ECG LV strain"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Requested Diagnostic Evaluation
            </label>
            <input
              type="text"
              value={currentRef.requested_evaluation || ""}
              onChange={(e) => onChange({ ...currentRef, requested_evaluation: e.target.value })}
              placeholder="e.g. 2D Echo, Dobutamine Stress Echo, Holter monitoring"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Clinical Summary for Receiving Physician
          </label>
          <textarea
            value={currentRef.clinical_summary || ""}
            onChange={(e) => onChange({ ...currentRef, clinical_summary: e.target.value })}
            rows={2}
            placeholder="Brief medical history, pertinent physical findings, current pharmacotherapy, and specific questions..."
            className="w-full p-3 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
    </div>
  );
}
