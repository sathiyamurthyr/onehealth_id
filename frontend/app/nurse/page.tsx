"use client";

import React, { useState, useEffect } from "react";
import {
  HeartPulse,
  Activity,
  ListOrdered,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  ClipboardList,
  Thermometer,
  ShieldCheck,
  PlusCircle,
  Save,
  UserCheck,
  AlertTriangle,
  Pill,
  Calendar,
  Send,
  Lock,
  Layers,
  FileText,
  BadgeAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { DynamicDashboard } from "@/components/workspace/DynamicDashboard";
import { Badge } from "@/components/ui/Card";

interface CareTask {
  id: string;
  task: string;
  time: string;
  completed: boolean;
  priority: "High" | "Normal";
}

interface MarEntry {
  id: string;
  medicine: string;
  dose: string;
  route: string;
  scheduled_time: string;
  status: "DUE" | "GIVEN" | "HELD" | "MISSED";
  administered_by?: string;
  administered_at?: string;
}

export default function NurseWorkspacePage() {
  const { workspace, user } = useWorkspace();
  const [patients, setPatients] = useState<any[]>([
    {
      id: "pat-01",
      name: "Alice Smith",
      uhid: "OH-2026-90412",
      bed: "Bed 4A (General Ward)",
      age_gender: "42Y / Female",
      admission_date: "01-Oct-2026",
      condition: "Hypertension / Metabolic Review",
      allergies: ["Penicillin", "Amoxicillin"],
      fall_risk: "Moderate",
    },
    {
      id: "pat-02",
      name: "Ramesh Kumar",
      uhid: "OH-2026-88102",
      bed: "Bed 2B (Step-down ICU)",
      age_gender: "58Y / Male",
      admission_date: "30-Sep-2026",
      condition: "Post-op Cholecystectomy Day 1",
      allergies: ["Sulfa drugs"],
      fall_risk: "High",
    },
    {
      id: "pat-03",
      name: "Lakshmi Narayanan",
      uhid: "OH-2026-77319",
      bed: "Bed 6A (General Ward)",
      age_gender: "65Y / Female",
      admission_date: "01-Oct-2026",
      condition: "Type 2 Diabetes / Cellulitis",
      allergies: [],
      fall_risk: "Low",
    },
  ]);

  const [selectedPatientId, setSelectedPatientId] = useState("pat-01");
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  // Active Tab: Vitals | MAR | Nursing Notes | Care Tasks | Shift Handover
  const [activeTab, setActiveTab] = useState<"VITALS" | "MAR" | "NOTES" | "TASKS" | "HANDOVER">("VITALS");

  // Vitals State
  const [vitals, setVitals] = useState({
    bpSystolic: "134",
    bpDiastolic: "86",
    pulse: "78",
    temperature: "98.4",
    spo2: "98",
    respRate: "18",
    glucose: "128",
    painScore: "2",
  });
  const [savingVitals, setSavingVitals] = useState(false);
  const [vitalsSuccess, setVitalsSuccess] = useState(false);

  // MAR (Medication Administration Record) State
  const [marSchedule, setMarSchedule] = useState<MarEntry[]>([
    {
      id: "mar-1",
      medicine: "Amlodipine 5mg",
      dose: "1 Tablet",
      route: "Oral",
      scheduled_time: "08:00 AM",
      status: "GIVEN",
      administered_by: "Staff Nurse Priya",
      administered_at: "08:15 AM",
    },
    {
      id: "mar-2",
      medicine: "Paracetamol 650mg",
      dose: "1 Tablet",
      route: "Oral",
      scheduled_time: "02:00 PM",
      status: "DUE",
    },
    {
      id: "mar-3",
      medicine: "IV Ceftriaxone 1g",
      dose: "100ml Infusion",
      route: "IV Infusion",
      scheduled_time: "08:00 PM",
      status: "DUE",
    },
  ]);

  // Care Tasks
  const [careTasks, setCareTasks] = useState<CareTask[]>([
    { id: "task-1", task: "Check 2-hour blood pressure trend", time: "11:00 AM", completed: true, priority: "High" },
    { id: "task-2", task: "Wound dressing check & drain output measurement", time: "01:00 PM", completed: false, priority: "High" },
    { id: "task-3", task: "Post-prandial blood glucose check (2hr PP)", time: "02:30 PM", completed: false, priority: "Normal" },
    { id: "task-4", task: "Physical therapy assisted ambulation", time: "04:00 PM", completed: false, priority: "Normal" },
  ]);

  // Nursing Notes
  const [nurseNotes, setNurseNotes] = useState(
    "Patient is resting comfortably in bed. Pain score 2/10 in surgical site. Vital signs stable. Tolerating oral liquids well. Urine output adequate via Foley (600ml / 6hrs)."
  );

  // SBAR Handover
  const [sbar, setSbar] = useState({
    situation: "Alice Smith, 42F admitted for blood pressure stabilization and headache review.",
    background: "Known hypertension for 5 years. Allergy to penicillin. Appendectomy in 2018.",
    assessment: "Vitals stable on Amlodipine 5mg. Mild headache reported earlier; managed with paracetamol.",
    recommendation: "Monitor BP at 18:00 hrs. Ensure bedtime dose of antihypertensive. Check morning fasting lipid profile.",
  });
  const [handoverSuccess, setHandoverSuccess] = useState(false);

  const handleAdminister = (marId: string, action: "GIVEN" | "HELD" | "MISSED") => {
    setMarSchedule((prev) =>
      prev.map((entry) =>
        entry.id === marId
          ? {
              ...entry,
              status: action,
              administered_by: user?.name || "Staff Nurse",
              administered_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            }
          : entry
      )
    );
  };

  const handleRecordVitals = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVitals(true);
    setTimeout(() => {
      setSavingVitals(false);
      setVitalsSuccess(true);
      setTimeout(() => setVitalsSuccess(false), 3000);
    }, 600);
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["NURSE"]}>
      <div className="bg-white min-h-screen text-slate-900 pb-20 space-y-6">
        {/* Dynamic Header */}
        <DynamicDashboard
          title={`Nurse Inpatient Care & MAR Station — ${user?.name || "Staff Nurse"}`}
          subtitle={`Inpatient Ward Block B at ${workspace?.hospital_name || "Kedar Hospital"} • Vitals capture, medication administration, care tasks, and SBAR handover.`}
        />

        {/* RBAC Boundary Notification (Point 13) */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-slate-900">Role-Based Clinical Boundary (Point 13):</span>{" "}
            Nurses are authorized to record vitals, administer scheduled medications (MAR), record nursing observations,
            and log shift handovers. Physician diagnostic formulations and prescription creations remain strictly restricted to licensed doctors.
          </div>
        </div>

        {/* Main 2-Column Split: Assigned Patients (Left) + Nursing Station (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 1. Assigned Patients List (Left 4 Cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Assigned Patients ({patients.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">Shift 07:00 ─ 15:00</span>
            </div>

            <div className="space-y-2">
              {patients.map((pat) => (
                <button
                  key={pat.id}
                  type="button"
                  onClick={() => setSelectedPatientId(pat.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedPatient.id === pat.id
                      ? "border-indigo-500 bg-indigo-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-xs text-slate-900">{pat.name}</div>
                      <div className="font-mono text-[11px] text-slate-500">{pat.uhid}</div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {pat.bed}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 mt-1 line-clamp-1">
                    {pat.condition}
                  </div>

                  {pat.allergies.length > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-600 font-medium">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      <span>Allergy: {pat.allergies.join(", ")}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Patient Workspace & Tabs (Right 8 Cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* Patient Header Banner */}
            <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">{selectedPatient.name}</h2>
                  <span className="font-mono text-xs text-slate-500">({selectedPatient.uhid})</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-600">{selectedPatient.age_gender}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Location: <span className="font-medium text-slate-800">{selectedPatient.bed}</span> • Admitted: {selectedPatient.admission_date}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                  Fall Risk: {selectedPatient.fall_risk}
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-5 gap-1 overflow-x-auto">
              {[
                { key: "VITALS", label: "Vitals Observation" },
                { key: "MAR", label: "Medication Schedule (MAR)" },
                { key: "NOTES", label: "Nursing Notes" },
                { key: "TASKS", label: "Care Tasks" },
                { key: "HANDOVER", label: "SBAR Shift Handover" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? "border-indigo-600 text-indigo-600 bg-indigo-50/20"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="p-6 flex-1 bg-white">
              {/* TAB 1: VITALS */}
              {activeTab === "VITALS" && (
                <form onSubmit={handleRecordVitals} className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-rose-500" />
                      Record Vital Signs Triage
                    </h4>
                    {vitalsSuccess && (
                      <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Vitals recorded
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Systolic BP (mmHg)</label>
                      <input
                        type="number"
                        value={vitals.bpSystolic}
                        onChange={(e) => setVitals({ ...vitals, bpSystolic: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Diastolic BP (mmHg)</label>
                      <input
                        type="number"
                        value={vitals.bpDiastolic}
                        onChange={(e) => setVitals({ ...vitals, bpDiastolic: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Pulse (bpm)</label>
                      <input
                        type="number"
                        value={vitals.pulse}
                        onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">SpO₂ (%)</label>
                      <input
                        type="number"
                        value={vitals.spo2}
                        onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Temperature (°F)</label>
                      <input
                        type="text"
                        value={vitals.temperature}
                        onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Resp Rate (/min)</label>
                      <input
                        type="number"
                        value={vitals.respRate}
                        onChange={(e) => setVitals({ ...vitals, respRate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Blood Glucose (mg/dL)</label>
                      <input
                        type="number"
                        value={vitals.glucose}
                        onChange={(e) => setVitals({ ...vitals, glucose: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Pain Score (0-10)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={vitals.painScore}
                        onChange={(e) => setVitals({ ...vitals, painScore: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingVitals}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingVitals ? "Recording..." : "Save Ward Vitals"}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: MAR (Medication Administration Record) */}
              {activeTab === "MAR" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Pill className="w-4 h-4 text-emerald-600" />
                        Medication Administration Record (MAR)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Orders derived from physician FHIR MedicationRequest. Record administration stamps.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">Shift Schedule</span>
                  </div>

                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                    {marSchedule.map((mar) => (
                      <div key={mar.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900">{mar.medicine}</span>
                            <span className="text-[11px] text-slate-500">({mar.dose} • {mar.route})</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Scheduled: <span className="font-semibold text-slate-700">{mar.scheduled_time}</span>
                            {mar.administered_by && (
                              <span className="ml-2 text-emerald-700">
                                • Given at {mar.administered_at} by {mar.administered_by}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              mar.status === "GIVEN"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : mar.status === "DUE"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {mar.status}
                          </span>

                          {mar.status === "DUE" && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleAdminister(mar.id, "GIVEN")}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium"
                              >
                                Mark Given
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdminister(mar.id, "HELD")}
                                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium border border-slate-200"
                              >
                                Hold
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: NURSING NOTES */}
              {activeTab === "NOTES" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Ward Nursing Observations & Clinical Notes
                  </h4>
                  <textarea
                    rows={5}
                    value={nurseNotes}
                    onChange={(e) => setNurseNotes(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => alert("Nursing note appended to clinical encounter chart.")}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                    >
                      Commit Nursing Observation
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: CARE TASKS */}
              {activeTab === "TASKS" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-violet-600" />
                      Assigned Care Tasks
                    </h4>
                    <span className="text-[11px] text-slate-400">Shift Protocol</span>
                  </div>

                  <div className="space-y-2">
                    {careTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={t.completed}
                            onChange={() =>
                              setCareTasks((prev) =>
                                prev.map((item) =>
                                  item.id === t.id ? { ...item, completed: !item.completed } : item
                                )
                              )
                            }
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                          />
                          <span className={t.completed ? "line-through text-slate-400" : "text-slate-900 font-medium"}>
                            {t.task}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-slate-500">{t.time}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              t.priority === "High"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            {t.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: SBAR HANDOVER */}
              {activeTab === "HANDOVER" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-600" />
                      SBAR Shift Handover Briefing
                    </h4>
                    {handoverSuccess && (
                      <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                        Handover Transmitted
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        S — Situation
                      </span>
                      <textarea
                        rows={2}
                        value={sbar.situation}
                        onChange={(e) => setSbar({ ...sbar, situation: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded text-xs bg-white"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        B — Background
                      </span>
                      <textarea
                        rows={2}
                        value={sbar.background}
                        onChange={(e) => setSbar({ ...sbar, background: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded text-xs bg-white"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        A — Assessment
                      </span>
                      <textarea
                        rows={2}
                        value={sbar.assessment}
                        onChange={(e) => setSbar({ ...sbar, assessment: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded text-xs bg-white"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        R — Recommendation
                      </span>
                      <textarea
                        rows={2}
                        value={sbar.recommendation}
                        onChange={(e) => setSbar({ ...sbar, recommendation: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setHandoverSuccess(true);
                        setTimeout(() => setHandoverSuccess(false), 3000);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Transmit Shift Handover</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
