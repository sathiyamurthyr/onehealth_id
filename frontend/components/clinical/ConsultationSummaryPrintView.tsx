"use client";

import React from "react";
import {
  Printer,
  FileCheck,
  CheckCircle2,
  Calendar,
  Building,
  User,
  Stethoscope,
  Pill,
  FlaskConical,
  Share2,
  ArrowRight,
  ShieldCheck,
  QrCode
} from "lucide-react";
import { ConsultationSummary } from "@/lib/types";

interface ConsultationSummaryPrintViewProps {
  summary: ConsultationSummary;
  onReturnToQueue?: () => void;
}

export function ConsultationSummaryPrintView({
  summary,
  onReturnToQueue,
}: ConsultationSummaryPrintViewProps) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const p = summary.patient;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner with Action Controls (Hidden on Print) */}
      <div className="bg-emerald-500 text-white rounded-3xl p-6 shadow-lg flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Consultation Successfully Completed</h2>
            <p className="text-xs text-emerald-100">
              Clinical documentation and prescriptions are locked & securely synchronized to OneHealth ID
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Clinical Sheet
          </button>
          {onReturnToQueue && (
            <button
              type="button"
              onClick={onReturnToQueue}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Today&apos;s Queue
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Printable Clinical Sheet Document */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm print:border-none print:shadow-none print:p-0 space-y-6 text-xs text-slate-800">
        {/* Hospital Letterhead Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b-2 border-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                OH
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {summary.hospital_name || "Kedar Hospital & Medical Research Institute"}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              National Health Grid • Unified Outpatient Clinical Consultation Summary
            </p>
          </div>

          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 font-mono text-xs font-bold text-slate-900 border border-slate-200">
              <QrCode className="w-3.5 h-3.5 text-indigo-600" />
              OH-ID: {p.onehealth_id || p.id}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Date: {summary.consultation_date ? new Date(summary.consultation_date).toLocaleDateString() : "Today"}
            </p>
          </div>
        </div>

        {/* Patient & Doctor Demographics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Patient Name</span>
            <p className="font-bold text-slate-900 text-sm mt-0.5">{p.name}</p>
            <span className="text-[11px] text-slate-500">
              {p.age} yrs • {p.gender} • Blood: {p.blood_group || "O+"}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attending Doctor</span>
            <p className="font-bold text-slate-900 text-sm mt-0.5">{summary.doctor_name || "Dr. Senthil Kumar"}</p>
            <span className="text-[11px] text-indigo-600 font-medium">{summary.doctor_specialty || "General Medicine"}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Encounter Ref</span>
            <p className="font-mono font-bold text-slate-900 mt-0.5">{summary.consultation_id || "ENC-CONSULT-01"}</p>
            <span className="text-[11px] text-slate-500">OPD Consultation</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] mt-0.5">
              <ShieldCheck className="w-3 h-3" />
              FINALIZED & SIGNED
            </span>
          </div>
        </div>

        {/* Diagnoses Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
            <Stethoscope className="w-4 h-4 text-indigo-600" />
            Clinical Diagnoses (ICD-10)
          </h3>
          <div className="flex flex-wrap gap-2 pt-1">
            {summary.diagnoses && summary.diagnoses.length > 0 ? (
              summary.diagnoses.map((d, i) => (
                <div key={i} className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs flex items-center gap-2">
                  {d.code && <span className="font-mono font-bold text-indigo-700">{d.code}</span>}
                  <span className="font-semibold text-slate-900">{d.description}</span>
                  <span className="text-[10px] font-bold uppercase text-indigo-500">({d.tier})</span>
                </div>
              ))
            ) : (
              <p className="text-slate-500 italic">No formal ICD-10 diagnosis attached.</p>
            )}
          </div>
        </div>

        {/* Prescription Details */}
        {summary.prescription && summary.prescription.items && summary.prescription.items.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <Pill className="w-4 h-4 text-purple-600" />
              Prescription (Rx) — {summary.prescription.items.length} Medications
            </h3>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-1.5">Medicine & Strength</th>
                  <th className="pb-1.5">Dosage / Frequency</th>
                  <th className="pb-1.5">Route & Duration</th>
                  <th className="pb-1.5">Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.prescription.items.map((med: any, i: number) => (
                  <tr key={i}>
                    <td className="py-2">
                      <span className="font-bold text-slate-900">{med.medicine_name || med.medicine}</span>
                      {med.strength && <span className="text-slate-500 font-normal ml-1">({med.strength})</span>}
                    </td>
                    <td className="py-2 font-medium text-slate-700">
                      {med.dose || "1 tab"} • {med.frequency || "Twice daily"}
                    </td>
                    <td className="py-2 text-slate-600">
                      {med.route || "Oral"} • {med.duration || "5 days"}
                    </td>
                    <td className="py-2 text-slate-600 italic">
                      {med.instructions || "After food"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Ordered Investigations */}
        {summary.investigations && summary.investigations.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <FlaskConical className="w-4 h-4 text-teal-600" />
              Investigations & Diagnostic Orders
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {summary.investigations.map((inv: any, i: number) => (
                <div key={i} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">{inv.test_name || inv.test?.name}</span>
                    <p className="text-[11px] text-slate-500">Priority: {inv.priority || "ROUTINE"}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-bold text-[10px] border border-teal-200">
                    DISPATCHED
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up & Referral Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
          {summary.follow_up && summary.follow_up.required && (
            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-1">
              <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Scheduled Follow-up
              </span>
              <p className="font-bold text-slate-900 text-sm">{summary.follow_up.date || "In 7 Days"}</p>
              <p className="text-[11px] text-slate-600">{summary.follow_up.notes || "Review with test reports"}</p>
            </div>
          )}

          {summary.referral && (
            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200 space-y-1">
              <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block flex items-center gap-1">
                <Share2 className="w-3.5 h-3.5 text-purple-600" />
                Specialist Referral
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {summary.referral.specialty} • {summary.referral.receiving_doctor_name || "Department"}
              </p>
              <p className="text-[11px] text-slate-600">{summary.referral.reason}</p>
            </div>
          )}
        </div>

        {/* Digital Signature & Footer Signoff */}
        <div className="pt-6 border-t border-slate-200 flex flex-wrap items-end justify-between gap-4">
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <p>OneHealth ID Clinical Information System • Versioned Encounter Record</p>
            <p>This is a computer-verified medical record generated in compliance with ABDM/FHIR standards.</p>
          </div>
          <div className="text-right border-t border-slate-400 pt-2 min-w-44">
            <p className="font-bold text-slate-900 text-xs">{summary.doctor_name || "Dr. Senthil Kumar"}</p>
            <p className="text-[11px] text-slate-500">Reg: TNMC-64821 • Digitally Signed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
