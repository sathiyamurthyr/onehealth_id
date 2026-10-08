"use client";

import React, { useState, useEffect } from "react";
import {
  Siren,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  FileText,
  User,
  Building2,
  Calendar,
  ChevronRight,
  ShieldCheck,
  FileCheck2,
  X,
  RefreshCw,
  PlusCircle,
  HeartPulse,
  Flame,
  UserCheck,
  Sparkles,
  BedDouble,
  LogOut,
  ArrowRight
} from "lucide-react";
import { emergencyApi } from "@/lib/api/phase3";
import { EmergencyEncounter } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState } from "@/components/ui/FeedbackStates";

const TRIAGE_CATEGORIES = [
  { id: "RED_RESUSCITATION", label: "Red (Resuscitation / Immediate)", color: "border-red-500/30 bg-red-500/10 text-red-400", dot: "bg-red-500" },
  { id: "ORANGE_EMERGENT", label: "Orange (Emergent / <15m)", color: "border-orange-500/30 bg-orange-500/10 text-orange-400", dot: "bg-orange-500" },
  { id: "YELLOW_URGENT", label: "Yellow (Urgent / <60m)", color: "border-amber-500/30 bg-amber-500/10 text-amber-400", dot: "bg-amber-500" },
  { id: "GREEN_LESS_URGENT", label: "Green (Less Urgent / <120m)", color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-500" },
  { id: "BLUE_NON_URGENT", label: "Blue (Non-Urgent / Routine)", color: "border-blue-500/30 bg-blue-500/10 text-blue-400", dot: "bg-blue-500" }
];

export default function EmergencyPage() {
  const [encounters, setEncounters] = useState<EmergencyEncounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Intake Modal State
  const [intakeModalOpen, setIntakeModalOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [arrivalMode, setArrivalMode] = useState("AMBULANCE");
  const [emergencyCategory, setEmergencyCategory] = useState("RED_RESUSCITATION");
  const [presentingComplaint, setPresentingComplaint] = useState("");
  const [triageScore, setTriageScore] = useState(1);
  const [triageNotes, setTriageNotes] = useState("");
  const [submittingIntake, setSubmittingIntake] = useState(false);

  // Disposition Modal State
  const [selectedEncounter, setSelectedEncounter] = useState<EmergencyEncounter | null>(null);
  const [dispositionModalOpen, setDispositionModalOpen] = useState(false);
  const [dispositionChoice, setDispositionChoice] = useState("ADMITTED");
  const [dispositionNotes, setDispositionNotes] = useState("");
  const [submittingDisposition, setSubmittingDisposition] = useState(false);

  // Reconcile Modal State
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [reconcilePatientId, setReconcilePatientId] = useState("");
  const [submittingReconcile, setSubmittingReconcile] = useState(false);

  const loadEmergencyEncounters = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await emergencyApi.listEncounters({
        emergency_category: categoryFilter !== "ALL" ? categoryFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined
      });
      setEncounters(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load emergency encounters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmergencyEncounters();
  }, [categoryFilter, statusFilter]);

  const handleCreateIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presentingComplaint) {
      alert("Please provide the patient's presenting complaint");
      return;
    }
    setSubmittingIntake(true);
    try {
      await emergencyApi.registerIntake({
        patient_id: !isAnonymous && patientId ? patientId : undefined,
        is_anonymous_patient: isAnonymous,
        arrival_mode: arrivalMode,
        emergency_category: emergencyCategory,
        presenting_complaint: presentingComplaint,
        triage_score: triageScore,
        triage_notes: triageNotes
      });
      setIntakeModalOpen(false);
      setPatientId("");
      setPresentingComplaint("");
      setTriageNotes("");
      loadEmergencyEncounters();
    } catch (err: any) {
      alert(err.message || "Failed to register emergency intake");
    } finally {
      setSubmittingIntake(false);
    }
  };

  const handleUpdateDisposition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEncounter) return;
    setSubmittingDisposition(true);
    try {
      await emergencyApi.updateDisposition(selectedEncounter.id, {
        disposition: dispositionChoice,
        notes: dispositionNotes
      });
      setDispositionModalOpen(false);
      loadEmergencyEncounters();
    } catch (err: any) {
      alert(err.message || "Failed to update emergency disposition");
    } finally {
      setSubmittingDisposition(false);
    }
  };

  const handleReconcilePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEncounter || !reconcilePatientId) return;
    setSubmittingReconcile(true);
    try {
      await emergencyApi.reconcilePatient(selectedEncounter.id, {
        patient_id: reconcilePatientId
      });
      setReconcileModalOpen(false);
      setReconcilePatientId("");
      loadEmergencyEncounters();
    } catch (err: any) {
      alert(err.message || "Failed to reconcile patient identity");
    } finally {
      setSubmittingReconcile(false);
    }
  };

  const filteredEncounters = encounters.filter((enc) => {
    const matchesSearch =
      (enc.patient_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (enc.onehealth_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (enc.temporary_identity_code || "").toLowerCase().includes(search.toLowerCase()) ||
      (enc.presenting_complaint || "").toLowerCase().includes(search.toLowerCase()) ||
      (enc.id || "").toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-red-950/40 via-slate-900/60 to-slate-900/40 p-6 rounded-2xl border border-red-500/20 backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shadow-inner animate-pulse">
              <Siren className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Emergency Care & Rapid Triage
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-medium">
                  Phase 3 Live ED
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Instant intake registration, anonymous trauma temporary codes, structured 5-tier triage, and care dispositions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadEmergencyEncounters}
              className="gap-2 border-slate-700 bg-slate-800/60 hover:bg-slate-700/60 text-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setIntakeModalOpen(true)}
              className="gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-500/20"
            >
              <PlusCircle className="h-4 w-4" />
              Emergency Intake / Triage
            </Button>
          </div>
        </div>

        {/* Triage Overview Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {TRIAGE_CATEGORIES.map((cat) => {
            const count = encounters.filter((e) => e.emergency_category === cat.id && e.status !== "DISCHARGED").length;
            return (
              <div
                key={cat.id}
                onClick={() => setCategoryFilter(categoryFilter === cat.id ? "ALL" : cat.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  categoryFilter === cat.id ? "ring-2 ring-violet-500" : ""
                } ${cat.color}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider truncate">{cat.label.split(" ")[0]}</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${cat.dot}`} />
                </div>
                <div className="text-2xl font-bold text-white">{count}</div>
                <div className="text-[11px] opacity-80 truncate">{cat.label.split("(")[1]?.replace(")", "") || "Active"}</div>
              </div>
            );
          })}
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Patient Name, OH-ID, Temporary Code, or Presenting Complaint..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="TRIAGED">TRIAGED (In Queue)</option>
              <option value="IN_PROGRESS">IN_PROGRESS (Under Care)</option>
              <option value="ADMITTED">ADMITTED to IPD</option>
              <option value="DISCHARGED">DISCHARGED</option>
            </select>
          </div>
        </div>

        {/* Encounters Table */}
        {loading ? (
          <LoadingState message="Fetching emergency room queue..." />
        ) : filteredEncounters.length === 0 ? (
          <EmptyState
            title="No Emergency Encounters"
            description="There are currently no active emergency patients matching your filter criteria."
          />
        ) : (
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden shadow-xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Patient & Identity</th>
                    <th className="px-6 py-4">Triage & Priority</th>
                    <th className="px-6 py-4">Presenting Complaint</th>
                    <th className="px-6 py-4">Arrival Mode & Time</th>
                    <th className="px-6 py-4">Status & Disposition</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredEncounters.map((enc) => {
                    const catObj = TRIAGE_CATEGORIES.find((c) => c.id === enc.emergency_category) || TRIAGE_CATEGORIES[2];
                    return (
                      <tr key={enc.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          {enc.is_anonymous_patient ? (
                            <div>
                              <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                                <AlertTriangle className="h-4 w-4" /> Anonymous Trauma Victim
                              </div>
                              <div className="text-xs text-slate-400 font-mono">
                                Temp Code: {enc.temporary_identity_code || "TEMP-UNKNOWN"}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold text-white">{enc.patient_name || "Patient"}</div>
                              <div className="text-xs text-red-400 font-mono">{enc.onehealth_id || "OH-0000"}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${catObj.color}`}>
                            <span className={`h-2 w-2 rounded-full ${catObj.dot}`} />
                            Level {enc.triage_score}: {enc.emergency_category.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-200 max-w-sm truncate font-medium">{enc.presenting_complaint}</div>
                          {enc.triage_notes && <div className="text-xs text-slate-400 truncate max-w-sm">{enc.triage_notes}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-medium text-slate-200">{enc.arrival_mode}</div>
                          <div className="text-xs text-slate-400">{new Date(enc.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-semibold text-slate-200">{enc.status}</div>
                          {enc.disposition && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 mt-1 inline-block">
                              {enc.disposition}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {enc.is_anonymous_patient && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedEncounter(enc);
                                  setReconcileModalOpen(true);
                                }}
                                className="border-amber-500/30 text-amber-300 hover:bg-amber-950/30 text-xs"
                              >
                                <UserCheck className="h-3.5 w-3.5 mr-1" />
                                Reconcile
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedEncounter(enc);
                                setDispositionChoice(enc.disposition || "ADMITTED");
                                setDispositionModalOpen(true);
                              }}
                              className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs"
                            >
                              Disposition
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Emergency Intake Modal */}
        {intakeModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Siren className="h-5 w-5 text-red-400" />
                  Emergency Rapid Intake & Triage
                </h2>
                <button onClick={() => setIntakeModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateIntake} className="p-6 space-y-4 text-sm text-slate-200">
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">Unknown / Anonymous Patient?</div>
                    <div className="text-xs text-slate-400">Generate temporary emergency identity without permanent duplicates</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-700 text-red-600 focus:ring-red-500"
                  />
                </div>

                {!isAnonymous && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Patient ID or OH-ID <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. pt-01 or OH-2026-XXXX"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Arrival Mode
                    </label>
                    <select
                      value={arrivalMode}
                      onChange={(e) => setArrivalMode(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-red-500"
                    >
                      <option value="AMBULANCE">Ambulance (108 / EMS)</option>
                      <option value="WALK_IN">Walk-In</option>
                      <option value="POLICE">Police Escort</option>
                      <option value="TRANSFER">Inter-Hospital Transfer</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Triage Category
                    </label>
                    <select
                      value={emergencyCategory}
                      onChange={(e) => {
                        setEmergencyCategory(e.target.value);
                        if (e.target.value === "RED_RESUSCITATION") setTriageScore(1);
                        else if (e.target.value === "ORANGE_EMERGENT") setTriageScore(2);
                        else if (e.target.value === "YELLOW_URGENT") setTriageScore(3);
                        else if (e.target.value === "GREEN_LESS_URGENT") setTriageScore(4);
                        else setTriageScore(5);
                      }}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-red-500"
                    >
                      <option value="RED_RESUSCITATION">Red - Resuscitation (Level 1)</option>
                      <option value="ORANGE_EMERGENT">Orange - Emergent (Level 2)</option>
                      <option value="YELLOW_URGENT">Yellow - Urgent (Level 3)</option>
                      <option value="GREEN_LESS_URGENT">Green - Less Urgent (Level 4)</option>
                      <option value="BLUE_NON_URGENT">Blue - Non-Urgent (Level 5)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Presenting Complaint / Chief Complaint <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Severe crushing chest pain radiating to left arm, altered sensorium, acute dyspnea..."
                    value={presentingComplaint}
                    onChange={(e) => setPresentingComplaint(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Triage Nurse Clinical Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pale, diaphoretic, SpO2 88% on room air, oxygen started at 4L..."
                    value={triageNotes}
                    onChange={(e) => setTriageNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIntakeModalOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingIntake} className="bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20">
                    {submittingIntake ? "Registering..." : "Submit Emergency Intake"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Emergency Disposition Modal */}
        {dispositionModalOpen && selectedEncounter && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <LogOut className="h-5 w-5 text-red-400" />
                  Update Emergency Disposition
                </h2>
                <button onClick={() => setDispositionModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateDisposition} className="p-6 space-y-4 text-sm text-slate-200">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Disposition Outcome <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={dispositionChoice}
                    onChange={(e) => setDispositionChoice(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="ADMITTED">Admit to Inpatient / ICU (IPD)</option>
                    <option value="DISCHARGED">Discharge Home (Stable)</option>
                    <option value="TRANSFERRED">Transfer to Tertiary Center</option>
                    <option value="OBSERVATION">Retain under ED Observation</option>
                    <option value="LAMA">Left Against Medical Advice (LAMA)</option>
                    <option value="EXPIRED">Expired / Deceased</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Disposition Notes & Clinical Summary
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter discharge instructions, bed request details, or transfer facility..."
                    value={dispositionNotes}
                    onChange={(e) => setDispositionNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDispositionModalOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingDisposition} className="bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20">
                    {submittingDisposition ? "Saving..." : "Finalize Disposition"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Patient Identity Reconciliation Modal */}
        {reconcileModalOpen && selectedEncounter && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-amber-400" />
                  Reconcile Temporary Identity
                </h2>
                <button onClick={() => setReconcileModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleReconcilePatient} className="p-6 space-y-4 text-sm text-slate-200">
                <div className="bg-amber-950/20 p-3 rounded-xl border border-amber-500/20 text-xs text-amber-300">
                  Temporary Code: <span className="font-mono font-bold">{selectedEncounter.temporary_identity_code}</span>
                  <div className="mt-1 text-slate-400">
                    Once verified, all emergency clinical care records and timeline events will attach directly to the patient's official OH-ID.
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Official Verified Patient ID <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter official patient ID (e.g. pt-01)..."
                    value={reconcilePatientId}
                    onChange={(e) => setReconcilePatientId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setReconcileModalOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingReconcile} className="bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20">
                    {submittingReconcile ? "Reconciling..." : "Reconcile Identity"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
