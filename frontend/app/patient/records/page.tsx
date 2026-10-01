"use client";

import React, { useState } from "react";
import { FileText, TestTube, Pill, Stethoscope, Calendar, ArrowLeft, ChevronRight, Activity, Heart, Download } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";

const MOCK_RECORDS = [
  {
    id: "rec-001",
    type: "CONSULTATION",
    date: "2026-09-15",
    title: "OPD Consultation — Dr. Senthil Kumar",
    department: "General Medicine",
    doctor: "Dr. Senthil Kumar",
    diagnosis: "Acute pharyngitis with mild fever",
    prescription: "Amoxicillin 500mg × 5 days, Paracetamol 500mg SOS",
    notes: "Patient advised rest for 2 days. Follow-up in 1 week if symptoms persist.",
    icon: Stethoscope,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    id: "rec-002",
    type: "LAB",
    date: "2026-09-15",
    title: "Complete Blood Count (CBC)",
    department: "Clinical Laboratory",
    doctor: "Lab: Kedar Diagnostics",
    diagnosis: "Mild leucocytosis (WBC: 11,200/μL) — consistent with bacterial infection",
    prescription: "",
    notes: "All other parameters within normal limits. Re-test after antibiotic course.",
    icon: TestTube,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  {
    id: "rec-003",
    type: "PRESCRIPTION",
    date: "2026-09-10",
    title: "Prescription — Chronic Hypertension Follow-up",
    department: "Cardiology",
    doctor: "Dr. Anitha Ramachandran",
    diagnosis: "Stage 1 Hypertension (BP: 148/92 mmHg)",
    prescription: "Amlodipine 5mg OD, Losartan 50mg OD — continue 3 months",
    notes: "BP monitoring daily. Reduce sodium intake. Next echo in 6 months.",
    icon: Pill,
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
];

const TYPE_LABELS: Record<string, string> = {
  CONSULTATION: "OPD Consultation",
  LAB: "Lab Report",
  PRESCRIPTION: "Prescription",
};

export default function PatientRecordsPage() {
  const { workspace, user } = useWorkspace();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const filtered = MOCK_RECORDS.filter((r) => typeFilter === "ALL" || r.type === typeFilter);

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back */}
        <Link href="/patient" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition">
          <ArrowLeft className="w-4 h-4" /> Back to Health Dashboard
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Medical Records & Visit History</h1>
          <p className="text-sm text-slate-500 mt-1">Your complete clinical history — consultations, lab reports, and prescriptions — secured by ABDM consent framework.</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Consultations", count: MOCK_RECORDS.filter(r => r.type === "CONSULTATION").length, icon: Stethoscope, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
            { label: "Lab Reports",   count: MOCK_RECORDS.filter(r => r.type === "LAB").length,          icon: TestTube,    color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
            { label: "Prescriptions", count: MOCK_RECORDS.filter(r => r.type === "PRESCRIPTION").length, icon: Pill,        color: "text-rose-600",   bg: "bg-rose-50",   border: "border-rose-200" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`bg-white border ${s.border} rounded-2xl p-4 text-center shadow-sm`}>
                <div className={`w-9 h-9 ${s.bg} ${s.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                  <Icon className="w-4.5 h-4.5 w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{s.count}</p>
                <p className="text-[11px] text-slate-500 font-medium">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit flex-wrap">
          {["ALL", "CONSULTATION", "LAB", "PRESCRIPTION"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                typeFilter === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "ALL" ? "All Records" : TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Records List */}
        <div className="space-y-3">
          {filtered.map((rec) => {
            const Icon = rec.icon;
            const isExpanded = expandedId === rec.id;
            return (
              <div key={rec.id} className={`bg-white border ${rec.border} rounded-2xl shadow-sm overflow-hidden transition`}>
                <button
                  className="w-full text-left p-5"
                  onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 ${rec.bg} ${rec.color} rounded-xl flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm leading-tight">{rec.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{rec.department} • {rec.doctor}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-slate-400 font-mono">{rec.date}</span>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className={`px-5 pb-5 border-t ${rec.border} space-y-3`}>
                    <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {rec.diagnosis && (
                        <div className={`p-3 rounded-xl ${rec.bg} ${rec.border} border`}>
                          <p className="font-bold text-slate-700 mb-0.5">Diagnosis / Finding</p>
                          <p className="text-slate-600">{rec.diagnosis}</p>
                        </div>
                      )}
                      {rec.prescription && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <p className="font-bold text-slate-700 mb-0.5">Prescription / Treatment</p>
                          <p className="text-slate-600">{rec.prescription}</p>
                        </div>
                      )}
                    </div>
                    {rec.notes && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                        <p className="font-bold text-slate-700 mb-0.5">Doctor's Notes</p>
                        <p>{rec.notes}</p>
                      </div>
                    )}
                    <button className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 transition">
                      <Download className="w-3.5 h-3.5" /> Download PDF Report
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Privacy Callout */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-700">
          <Heart className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <span>
            <strong>Your records are private.</strong> Medical history is accessible only to you and your treating doctor during active consultation episodes. ABDM consent is required for any third-party access.
          </span>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
