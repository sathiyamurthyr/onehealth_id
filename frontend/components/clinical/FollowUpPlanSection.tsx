"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  CheckSquare,
  Square,
  FileCheck,
  Stethoscope,
  Building,
  CheckCircle2
} from "lucide-react";
import { FollowUpPayload } from "@/lib/types";

interface FollowUpPlanSectionProps {
  followUp: FollowUpPayload;
  onChange: (fup: FollowUpPayload) => void;
  primaryDoctorName?: string;
}

const COMMON_PRE_VISIT_TESTS = [
  "Complete Blood Count (CBC)",
  "Fasting Blood Sugar (FBS)",
  "Glycated Hemoglobin (HbA1c)",
  "Lipid Profile Comprehensive",
  "Serum Creatinine & Kidney Profile",
  "Chest X-Ray (PA View)",
  "Electrocardiogram (ECG)",
  "Urine Routine & Microscopic",
];

export function FollowUpPlanSection({
  followUp,
  onChange,
  primaryDoctorName = "Dr. Anitha (MD Gen Med)",
}: FollowUpPlanSectionProps) {
  const [scheduledSuccess, setScheduledSuccess] = useState(false);

  const handleToggleTest = (test: string) => {
    const current = followUp.required_investigations || [];
    const exists = current.includes(test);
    const updated = exists ? current.filter((t) => t !== test) : [...current, test];
    onChange({ ...followUp, required_investigations: updated });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="bg-slate-50/70 border-b border-slate-200/80 px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span>Structured Follow-Up & Next Visit Care Plan</span>
          </h3>
          <p className="text-[11px] text-slate-500">
            Define appointment date, slot duration, mandatory pre-visit lab investigations, and patient instructions.
          </p>
        </div>

        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
          Structured Protocol
        </span>
      </div>

      <div className="p-6 space-y-5">
        {scheduledSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Follow-up schedule locked in system. Reminder will be dispatched to patient portal.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Next Visit Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={followUp.scheduled_date}
              onChange={(e) => onChange({ ...followUp, scheduled_date: e.target.value })}
              className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Appointment Time</label>
            <input
              type="text"
              value={followUp.scheduled_time || "10:30 AM"}
              onChange={(e) => onChange({ ...followUp, scheduled_time: e.target.value })}
              placeholder="10:30 AM"
              className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Slot Duration</label>
            <select
              value={followUp.duration_minutes || 15}
              onChange={(e) => onChange({ ...followUp, duration_minutes: parseInt(e.target.value) || 15 })}
              className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
            >
              <option value="10">10 Minutes (Brief)</option>
              <option value="15">15 Minutes (Standard)</option>
              <option value="20">20 Minutes (Extended)</option>
              <option value="30">30 Minutes (Comprehensive)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Doctor & Department</label>
            <input
              type="text"
              readOnly
              value={`${primaryDoctorName} • General OPD`}
              className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Reason for Follow-Up</label>
          <input
            type="text"
            value={followUp.reason || ""}
            onChange={(e) => onChange({ ...followUp, reason: e.target.value })}
            placeholder="e.g. Evaluate HbA1c response, review pedal neuropathy, titration of oral hypoglycemics"
            className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 bg-white"
          />
        </div>

        {/* Required Pre-Visit Lab Investigations Checklist */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-2">
            Required Investigations Before Next Visit (Checklist for Patient & Lab):
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {COMMON_PRE_VISIT_TESTS.map((test) => {
              const isChecked = (followUp.required_investigations || []).includes(test);
              return (
                <button
                  key={test}
                  type="button"
                  onClick={() => handleToggleTest(test)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                    isChecked
                      ? "bg-purple-50 border-purple-300 text-purple-900 shadow-2xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-purple-600 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate">{test}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Special Pre-Visit Instructions for Patient
          </label>
          <input
            type="text"
            value={followUp.instructions || ""}
            onChange={(e) => onChange({ ...followUp, instructions: e.target.value })}
            placeholder="e.g. Fast for 10-12 hours prior to visit. Bring blood glucose diary and previous ECG report."
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white"
          />
        </div>
      </div>
    </div>
  );
}
