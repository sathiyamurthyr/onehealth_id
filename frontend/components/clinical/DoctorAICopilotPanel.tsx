"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  FileText,
  Activity,
  History,
  AlertTriangle,
  CheckCircle2,
  Copy,
  RotateCcw,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Minus,
  Pill,
  Stethoscope,
  Building2,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Edit3,
  Check,
  X
} from "lucide-react";
import { api } from "@/lib/api";
import {
  DoctorPatientBrief,
  ConsultationAssistDraft,
  LabTrendAnalysisResponse,
  LongitudinalSummaryResponse
} from "@/lib/types";

interface DoctorAICopilotPanelProps {
  patientId: string;
  hospitalId?: string;
  chiefComplaint?: string;
  onApplyDraftToConsultation?: (draft: ConsultationAssistDraft) => void;
  className?: string;
}

export function DoctorAICopilotPanel({
  patientId,
  hospitalId = "",
  chiefComplaint = "Scheduled OPD Review",
  onApplyDraftToConsultation,
  className = ""
}: DoctorAICopilotPanelProps) {
  const [activeTab, setActiveTab] = useState<"brief" | "drafter" | "lab_trends" | "journey">("brief");

  // State for Brief
  const [brief, setBrief] = useState<DoctorPatientBrief | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  // State for Note Drafter
  const [rawNotes, setRawNotes] = useState("");
  const [draft, setDraft] = useState<ConsultationAssistDraft | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // State for Lab Trends
  const [selectedAnalyte, setSelectedAnalyte] = useState("Hemoglobin");
  const [labTrend, setLabTrend] = useState<LabTrendAnalysisResponse | null>(null);
  const [loadingLabTrend, setLoadingLabTrend] = useState(false);

  // State for Longitudinal Journey
  const [journey, setJourney] = useState<LongitudinalSummaryResponse | null>(null);
  const [loadingJourney, setLoadingJourney] = useState(false);

  // Load Brief on mount
  useEffect(() => {
    if (patientId) {
      loadPatientBrief();
    }
  }, [patientId]);

  const loadPatientBrief = async () => {
    try {
      setLoadingBrief(true);
      setBriefError(null);
      const res = await api.ai.generatePatientBrief(patientId, chiefComplaint, hospitalId);
      setBrief(res);
    } catch (err: any) {
      setBriefError(err.message || "Failed to generate AI Patient Brief");
    } finally {
      setLoadingBrief(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!rawNotes.trim()) return;
    try {
      setLoadingDraft(true);
      setDraftError(null);
      const res = await api.ai.assistConsultationDraft(patientId, rawNotes, undefined, hospitalId);
      setDraft(res);
    } catch (err: any) {
      setDraftError(err.message || "Failed to generate structured consultation note");
    } finally {
      setLoadingDraft(false);
    }
  };

  const handleLoadLabTrends = async (analyte: string) => {
    setSelectedAnalyte(analyte);
    try {
      setLoadingLabTrend(true);
      const res = await api.ai.getLabTrends(patientId, analyte, hospitalId);
      setLabTrend(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLabTrend(false);
    }
  };

  const handleLoadJourney = async () => {
    try {
      setLoadingJourney(true);
      const res = await api.ai.getLongitudinalSummary(patientId, hospitalId);
      setJourney(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingJourney(false);
    }
  };

  const copyToClipboard = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div
      className={`rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-white shadow-sm overflow-hidden ${className}`}
    >
      {/* Header Banner */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-indigo-100/80 bg-white/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 tracking-tight text-base">Doctor AI Copilot</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-200">
                <ShieldCheck className="h-3 w-3" /> OH-ID Intelligence
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Traceable, permission-aware clinical summaries & assistive drafting
            </p>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1 rounded-xl bg-gray-100/80 p-1 border border-gray-200/60 text-xs font-medium text-gray-600">
          <button
            type="button"
            onClick={() => setActiveTab("brief")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              activeTab === "brief"
                ? "bg-white text-indigo-600 font-semibold shadow-sm"
                : "hover:text-gray-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> 30s Brief
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("drafter")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              activeTab === "drafter"
                ? "bg-white text-indigo-600 font-semibold shadow-sm"
                : "hover:text-gray-900"
            }`}
          >
            <FileText className="h-3.5 w-3.5" /> Note Drafter
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("lab_trends");
              if (!labTrend) handleLoadLabTrends("Hemoglobin");
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              activeTab === "lab_trends"
                ? "bg-white text-indigo-600 font-semibold shadow-sm"
                : "hover:text-gray-900"
            }`}
          >
            <Activity className="h-3.5 w-3.5" /> Lab Trends
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("journey");
              if (!journey) handleLoadJourney();
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              activeTab === "journey"
                ? "bg-white text-indigo-600 font-semibold shadow-sm"
                : "hover:text-gray-900"
            }`}
          >
            <History className="h-3.5 w-3.5" /> Longitudinal
          </button>
        </div>
      </div>

      {/* Safety & Compliance Badge */}
      <div className="bg-amber-50/70 border-b border-amber-200/50 px-5 py-2 flex items-center justify-between text-xs text-amber-800">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Clinical Safety Notice:</strong> AI outputs are strictly assistive drafts. Clinician maintains 100% final decision authority.
          </span>
        </div>
        <span className="text-[11px] font-mono text-amber-700">Audit Active</span>
      </div>

      {/* Tab Body */}
      <div className="p-5">
        {/* ================================================================= */}
        {/* TAB 1: 30-SECOND PATIENT BRIEF */}
        {/* ================================================================= */}
        {activeTab === "brief" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-900/70">
                Pre-Consultation Clinical Synthesis
              </span>
              <button
                type="button"
                onClick={loadPatientBrief}
                disabled={loadingBrief}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingBrief ? "animate-spin" : ""}`} />
                Refresh Synthesis
              </button>
            </div>

            {loadingBrief ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mb-3" />
                <p className="text-sm font-medium text-gray-700">Synthesizing authorized patient records...</p>
                <p className="text-xs text-gray-400 mt-1">Cross-referencing consultations, labs, and medications</p>
              </div>
            ) : briefError ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                <p className="font-semibold">Unable to generate brief</p>
                <p className="text-xs mt-1">{briefError}</p>
              </div>
            ) : brief ? (
              <div className="space-y-4">
                {/* Executive Summary Card */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <h4 className="text-sm font-semibold text-indigo-950">Executive Brief</h4>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{brief.overview_summary}</p>
                </div>

                {/* 2-Column Clinical Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Chronic Conditions */}
                  <div className="rounded-xl border border-gray-200/80 bg-white p-3 shadow-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-gray-900 mb-2">
                      <Stethoscope className="h-3.5 w-3.5 text-rose-500" />
                      Chronic & Past Diagnoses
                    </div>
                    {brief.chronic_conditions && brief.chronic_conditions.length > 0 ? (
                      <ul className="space-y-1 text-gray-600">
                        {brief.chronic_conditions.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400 italic">No chronic conditions flagged.</p>
                    )}
                  </div>

                  {/* Active Medications */}
                  <div className="rounded-xl border border-gray-200/80 bg-white p-3 shadow-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-gray-900 mb-2">
                      <Pill className="h-3.5 w-3.5 text-emerald-500" />
                      Current / Recent Medications
                    </div>
                    {brief.current_medications && brief.current_medications.length > 0 ? (
                      <ul className="space-y-1 text-gray-600">
                        {brief.current_medications.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400 italic">No active medications documented.</p>
                    )}
                  </div>

                  {/* Allergies & Red Flags */}
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-900 mb-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      Allergies & Sensitivities
                    </div>
                    {brief.known_allergies && brief.known_allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {brief.known_allergies.map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 font-medium text-amber-800"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-amber-700 italic">No documented drug/environmental allergies.</p>
                    )}
                  </div>

                  {/* Lab Trends & Flags */}
                  <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-3">
                    <div className="flex items-center gap-1.5 font-semibold text-blue-900 mb-2">
                      <Activity className="h-3.5 w-3.5 text-blue-600" />
                      Key Investigation Highlights
                    </div>
                    {brief.important_lab_trends && brief.important_lab_trends.length > 0 ? (
                      <ul className="space-y-1 text-blue-950">
                        {brief.important_lab_trends.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-blue-700 italic">All recent investigation parameters stable.</p>
                    )}
                  </div>
                </div>

                {/* Citations / Provenance List */}
                {brief.citations && brief.citations.length > 0 && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                      Authoritative Source Records ({brief.citations.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {brief.citations.map((c, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-700 shadow-2xs"
                        >
                          <Building2 className="h-3 w-3 text-indigo-600" />
                          <span className="font-medium text-gray-900">{c.hospital_name || "Hospital"}</span>
                          <span className="text-gray-400">•</span>
                          <span>{c.record_type}</span>
                          {c.date && <span className="text-gray-400 font-mono">({c.date})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: AMBIENT CONSULTATION NOTE DRAFTER */}
        {/* ================================================================= */}
        {activeTab === "drafter" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Doctor's Raw Notes / Voice Dictation / Impressions:
              </label>
              <textarea
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder="e.g. 45yo patient reports sharp epigastric pain radiating to back for 3 weeks, aggravated post meals. BP 130/85, Pulse 76. Soft abdomen, epigastric tenderness. Suspect peptic ulcer disease vs gastritis. Prescribing pantoprazole and ordering H. pylori antigen."
                rows={4}
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">
                Extracts structured SOAP, ICD-10 suggestions, vitals, and patient instructions
              </span>
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={loadingDraft || !rawNotes.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-indigo-700 hover:to-violet-700 transition disabled:opacity-50"
              >
                {loadingDraft ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Drafting Note...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> Structure & Assist Note
                  </>
                )}
              </button>
            </div>

            {draftError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {draftError}
              </div>
            )}

            {/* Generated Structured Draft */}
            {draft && (
              <div className="space-y-3 rounded-xl border-2 border-indigo-200 bg-indigo-50/20 p-4">
                {/* Draft Disclaimer Banner */}
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2 mb-2">
                  <div className="flex items-center gap-2 text-indigo-900 font-semibold text-xs">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <span>AI Generated Draft Note</span>
                  </div>
                  {onApplyDraftToConsultation && (
                    <button
                      type="button"
                      onClick={() => onApplyDraftToConsultation(draft)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-xs"
                    >
                      <Check className="h-3.5 w-3.5" /> Accept into Active Consultation
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 text-xs">
                  {/* Subjective */}
                  <div className="rounded-lg bg-white p-3 border border-gray-200">
                    <div className="flex items-center justify-between font-semibold text-gray-900 mb-1">
                      <span>Subjective (HPI & History)</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(draft.subjective_hpi || "", "subj")}
                        className="text-gray-400 hover:text-indigo-600"
                      >
                        {copiedSection === "subj" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{draft.subjective_hpi}</p>
                  </div>

                  {/* Objective */}
                  <div className="rounded-lg bg-white p-3 border border-gray-200">
                    <div className="flex items-center justify-between font-semibold text-gray-900 mb-1">
                      <span>Objective (Examination Findings)</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(draft.objective_exam || "", "obj")}
                        className="text-gray-400 hover:text-indigo-600"
                      >
                        {copiedSection === "obj" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{draft.objective_exam}</p>
                  </div>

                  {/* Assessment */}
                  <div className="rounded-lg bg-white p-3 border border-gray-200">
                    <div className="flex items-center justify-between font-semibold text-gray-900 mb-1">
                      <span>Assessment & Clinical Impression</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(draft.assessment_summary || "", "assess")}
                        className="text-gray-400 hover:text-indigo-600"
                      >
                        {copiedSection === "assess" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{draft.assessment_summary}</p>
                  </div>

                  {/* Plan & Patient Instructions */}
                  <div className="rounded-lg bg-white p-3 border border-gray-200">
                    <div className="flex items-center justify-between font-semibold text-gray-900 mb-1">
                      <span>Plan & Patient Instructions</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(draft.patient_instructions_draft || "", "plan")}
                        className="text-gray-400 hover:text-indigo-600"
                      >
                        {copiedSection === "plan" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{draft.patient_instructions_draft}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: LONGITUDINAL LAB TRENDS */}
        {/* ================================================================= */}
        {activeTab === "lab_trends" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Analyte Longitudinal Progression
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={selectedAnalyte}
                  onChange={(e) => handleLoadLabTrends(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 outline-none"
                >
                  <option value="Hemoglobin">Hemoglobin (Hb)</option>
                  <option value="Serum Creatinine">Serum Creatinine</option>
                  <option value="Fasting Blood Sugar">Fasting Blood Sugar</option>
                  <option value="HbA1c">HbA1c</option>
                  <option value="Platelet Count">Platelet Count</option>
                  <option value="Total Cholesterol">Total Cholesterol</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleLoadLabTrends(selectedAnalyte)}
                  disabled={loadingLabTrend}
                  className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingLabTrend ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {loadingLabTrend ? (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mb-2" />
                <p className="text-xs text-gray-500">Analyzing historical analyte points...</p>
              </div>
            ) : labTrend ? (
              <div className="space-y-3">
                {/* Trend Summary Badge */}
                <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 p-3">
                  <div className="flex items-center gap-2">
                    {labTrend.trend_direction === "INCREASING" ? (
                      <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                        <TrendingUp className="h-3.5 w-3.5" /> Upward Trend
                      </span>
                    ) : labTrend.trend_direction === "DECREASING" ? (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        <TrendingDown className="h-3.5 w-3.5" /> Downward Trend
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        <Minus className="h-3.5 w-3.5" /> Stable Baseline
                      </span>
                    )}
                    <span className="text-xs font-medium text-gray-700">
                      {labTrend.analyte || selectedAnalyte}: {labTrend.historical_points?.length || 0} measurements recorded
                    </span>
                  </div>
                </div>

                {/* Clinician Technical Synthesis */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-xs">
                  <h5 className="font-semibold text-indigo-950 mb-1">Clinical Technical Evaluation</h5>
                  <p className="text-gray-700">{labTrend.clinical_summary}</p>
                </div>

                {/* Patient-Friendly Explanation */}
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-xs">
                  <h5 className="font-semibold text-emerald-950 mb-1">Patient-Friendly Explanation</h5>
                  <p className="text-gray-700">{labTrend.patient_explanation}</p>
                </div>

                {/* Historical Table */}
                <div className="rounded-xl border border-gray-200 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-600">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Result Value</th>
                        <th className="p-2">Ref Range</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(labTrend.historical_points || []).map((pt, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="p-2 font-mono text-gray-600">{pt.date}</td>
                          <td className="p-2 font-semibold text-gray-900">
                            {pt.value} {pt.unit}
                          </td>
                          <td className="p-2 text-gray-500">{pt.reference_range || "N/A"}</td>
                          <td className="p-2">
                            {pt.is_abnormal ? (
                              <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                                Abnormal
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                Normal
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: LONGITUDINAL JOURNEY */}
        {/* ================================================================= */}
        {activeTab === "journey" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Connected Hospital Trajectory
              </span>
              <button
                type="button"
                onClick={handleLoadJourney}
                disabled={loadingJourney}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingJourney ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>

            {loadingJourney ? (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mb-2" />
                <p className="text-xs text-gray-500">Loading cross-hospital longitudinal record...</p>
              </div>
            ) : journey ? (
              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-indigo-100 bg-white p-3 shadow-xs">
                  <h5 className="font-semibold text-gray-900 mb-1.5">Longitudinal Narrative</h5>
                  <p className="text-gray-700 leading-relaxed">{journey.timeline_summary}</p>
                </div>

                {/* Recent Prior Consultations */}
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <h5 className="font-semibold text-gray-900 mb-2">Previous Consultations</h5>
                  {journey.previous_consultations && journey.previous_consultations.length > 0 ? (
                    <div className="space-y-2">
                      {journey.previous_consultations.map((c, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                          <Building2 className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-900">{c.hospital_name || "Hospital"}</span>
                              <span className="text-gray-400 font-mono text-[11px]">{c.date}</span>
                            </div>
                            <p className="text-gray-600 text-[11px] mt-0.5">
                              <strong>Diagnosis:</strong> {c.diagnosis || "Routine OPD review"}
                            </p>
                            {c.doctor_name && (
                              <p className="text-gray-400 text-[10px]">Dr. {c.doctor_name}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">No prior consultations recorded.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
