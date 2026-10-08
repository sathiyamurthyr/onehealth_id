"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Activity,
  Users,
  Building2,
  Calendar,
  Send,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  BarChart3,
  Search,
  Bed,
  Layers,
  ArrowRight,
  Flame,
  Zap,
  Check
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import {
  OperationsRootCauseResponse,
  QueueWaitTimePredictionResponse,
  BedOccupancyForecastResponse,
  ManagementCopilotResponse
} from "@/lib/types";

export default function HospitalAIIntelligencePage() {
  const { workspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<"copilot" | "diagnostics" | "predictions" | "bed_forecast">("copilot");
  const hospitalId = workspace?.hospital_ref_id || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("oh_workspace") || "{}").hospital_ref_id : "") || "";

  // State for Management Copilot
  const [copilotQuery, setCopilotQuery] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResult, setCopilotResult] = useState<ManagementCopilotResponse | null>(null);

  // State for Diagnostics (Root Cause)
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState<OperationsRootCauseResponse | null>(null);

  // State for Wait Time Prediction
  const [queuePos, setQueuePos] = useState(5);
  const [waitTimePrediction, setWaitTimePrediction] = useState<QueueWaitTimePredictionResponse | null>(null);
  const [waitLoading, setWaitLoading] = useState(false);

  // State for Bed Forecast
  const [horizonHours, setHorizonHours] = useState(24);
  const [bedForecast, setBedForecast] = useState<BedOccupancyForecastResponse | null>(null);
  const [bedLoading, setBedLoading] = useState(false);

  // Management Copilot Presets
  const copilotPresets = [
    "Which department had the highest waiting time this week?",
    "Why did OPD performance decrease yesterday?",
    "Compare this month with last month across all clinics",
    "What are the top operational bottlenecks in Emergency?",
    "Show departments where patient waiting time is increasing"
  ];

  useEffect(() => {
    loadDiagnostics();
    loadWaitTimePrediction(5);
    loadBedForecast(24);
  }, []);

  const handleQueryCopilot = async (queryText: string) => {
    if (!queryText.trim() || copilotLoading) return;
    try {
      setCopilotLoading(true);
      const res = await api.ai.queryManagementCopilot(queryText, hospitalId);
      setCopilotResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setCopilotLoading(false);
    }
  };

  const loadDiagnostics = async () => {
    try {
      setDiagnosticsLoading(true);
      const res = await api.ai.getOperationsInsights(hospitalId);
      setDiagnosticsData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const loadWaitTimePrediction = async (pos: number) => {
    try {
      setWaitLoading(true);
      const res = await api.ai.predictWaitTime(hospitalId, pos);
      setWaitTimePrediction(res);
    } catch (err) {
      console.error(err);
    } finally {
      setWaitLoading(false);
    }
  };

  const loadBedForecast = async (hours: number) => {
    try {
      setBedLoading(true);
      const res = await api.ai.forecastBedOccupancy(hospitalId, hours);
      setBedForecast(res);
    } catch (err) {
      console.error(err);
    } finally {
      setBedLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200 border border-indigo-500/30">
                <Zap className="h-3.5 w-3.5 text-indigo-400" />
                <span>Enterprise Hospital Operations Intelligence</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                AI Hospital Intelligence & Predictive Flow
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Transform OPD volumes, queue tokens, bed allocations, and financial records into explainable operational root-cause diagnostics and forecasts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-2xl bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur border border-white/10">
                <Building2 className="h-4 w-4 text-indigo-400" />
                <span>{workspace?.hospital_name || "Hospital HQ"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1.5 border border-slate-200/80 overflow-x-auto text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab("copilot")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === "copilot"
                ? "bg-white text-indigo-600 shadow-sm font-bold"
                : "hover:text-slate-900"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Management Copilot (NL Analytics)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("diagnostics")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === "diagnostics"
                ? "bg-white text-indigo-600 shadow-sm font-bold"
                : "hover:text-slate-900"
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Root-Cause Bottlenecks</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("predictions")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === "predictions"
                ? "bg-white text-indigo-600 shadow-sm font-bold"
                : "hover:text-slate-900"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Queue Wait-Time Predictor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bed_forecast")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === "bed_forecast"
                ? "bg-white text-indigo-600 shadow-sm font-bold"
                : "hover:text-slate-900"
            }`}
          >
            <Bed className="h-4 w-4" />
            <span>Inpatient Bed Forecast</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: MANAGEMENT COPILOT */}
        {/* =================================================================== */}
        {activeTab === "copilot" && (
          <div className="space-y-6">
            {/* Query Input Section */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Hospital Executive Management Copilot</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ask questions in natural language. Powered by controlled, permission-gated analytics queries.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5" /> Schema-Safe
                </span>
              </div>

              {/* Preset Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {copilotPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCopilotQuery(preset);
                      handleQueryCopilot(preset);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-1.5 text-xs text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3 text-indigo-500" />
                    <span>{preset}</span>
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="text"
                  value={copilotQuery}
                  onChange={(e) => setCopilotQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleQueryCopilot(copilotQuery);
                    }
                  }}
                  placeholder="e.g. Compare OPD waiting times across Cardiology, Orthopedics and General Medicine this week..."
                  className="flex-1 rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-xs text-gray-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => handleQueryCopilot(copilotQuery)}
                  disabled={copilotLoading || !copilotQuery.trim()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:from-indigo-700 hover:to-violet-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {copilotLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>Query Intelligence</span>
                </button>
              </div>
            </div>

            {/* Copilot Response Display */}
            {copilotResult && (
              <div className="space-y-4 rounded-3xl border border-indigo-100 bg-gradient-to-b from-indigo-50/30 via-white to-white p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-indigo-100/70">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <span>Executive Analytics Synthesis</span>
                  </div>
                  <span className="text-[11px] font-mono text-gray-400">
                    Query Confidence: {Math.round((copilotResult.confidence_score ?? 0.95) * 100)}%
                  </span>
                </div>

                {/* Narrative Summary */}
                <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-2xs space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950">Executive Finding</h4>
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {copilotResult.executive_summary}
                  </p>
                </div>

                {/* KPI Metric Highlights */}
                {copilotResult.relevant_metrics && Object.keys(copilotResult.relevant_metrics).length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(copilotResult.relevant_metrics).map(([key, val], idx) => (
                      <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          {key.replace(/_/g, " ")}
                        </span>
                        <p className="text-lg font-bold text-indigo-950 mt-1 font-mono">
                          {typeof val === "number" ? val.toLocaleString() : String(val)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommended Actions */}
                {copilotResult.recommended_actions && copilotResult.recommended_actions.length > 0 && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Prescriptive Operational Actions
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-emerald-900">
                      {copilotResult.recommended_actions.map((act, aIdx) => (
                        <div key={aIdx} className="flex items-start gap-2 bg-white/80 rounded-xl p-2.5 border border-emerald-200/60">
                          <ArrowRight className="h-3.5 w-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: ROOT CAUSE BOTTLENECK DIAGNOSTICS */}
        {/* =================================================================== */}
        {activeTab === "diagnostics" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">OPD & Department Flow Diagnostics</h3>
                <p className="text-xs text-gray-500">
                  Automated correlation of queue tokens, physician arrival times, and counter congestion
                </p>
              </div>
              <button
                type="button"
                onClick={loadDiagnostics}
                disabled={diagnosticsLoading}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${diagnosticsLoading ? "animate-spin" : ""}`} />
                <span>Re-Analyze</span>
              </button>
            </div>

            {diagnosticsLoading ? (
              <div className="py-16 text-center">
                <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600">Correlating operational queues and counters...</p>
              </div>
            ) : diagnosticsData ? (
              <div className="space-y-4">
                {/* Diagnostics Summary Banner */}
                <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Primary Bottleneck Detected
                      </span>
                      <h4 className="text-base font-bold text-amber-950 mt-0.5">
                        {diagnosticsData.bottleneck_department || "Cardiology OPD"}
                      </h4>
                      <p className="text-xs text-amber-800 mt-1">{diagnosticsData.overview}</p>
                    </div>
                  </div>
                  <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-300">
                    Congestion Severity: {diagnosticsData.severity_level || "MODERATE"}
                  </span>
                </div>

                {/* Primary Contributors Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-rose-500" />
                      Primary Operational Contributors
                    </h4>
                    <ul className="space-y-2.5 text-xs text-gray-700">
                      {(diagnosticsData.primary_contributors || []).map((c, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                          <span className="font-bold text-indigo-600 font-mono text-xs mt-0.5">{idx + 1}.</span>
                          <span className="font-medium">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Recommended Mitigation Steps
                    </h4>
                    <ul className="space-y-2.5 text-xs text-emerald-950">
                      {(diagnosticsData.recommended_actions || []).map((act, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                          <Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: LIVE WAIT-TIME PREDICTIONS */}
        {/* =================================================================== */}
        {activeTab === "predictions" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Predictive Patient Flow & Queue Simulation</h3>
                <p className="text-xs text-gray-500">
                  Dynamic wait-time computation factoring current arrival rates, consultation duration distributions, and doctor breaks.
                </p>
              </div>

              {/* Slider for Queue Position */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-gray-700">Simulate Queue Position Token:</span>
                  <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    Token #{queuePos}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={queuePos}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setQueuePos(val);
                    loadWaitTimePrediction(val);
                  }}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>

            {waitLoading ? (
              <div className="py-12 text-center">
                <div className="h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-500">Calculating stochastic wait prediction...</p>
              </div>
            ) : waitTimePrediction ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Main Estimated Wait Card */}
                <div className="rounded-3xl border border-indigo-200 bg-gradient-to-tr from-indigo-900 to-slate-900 p-6 text-white shadow-md flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                      Estimated Wait Duration
                    </span>
                    <div className="text-3xl font-extrabold tracking-tight mt-1 font-mono text-white">
                      {waitTimePrediction.predicted_wait_minutes} <span className="text-lg font-medium text-indigo-200">mins</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-indigo-200">
                    <span>Confidence Score:</span>
                    <span className="font-mono font-bold text-white">
                      {Math.round((waitTimePrediction.confidence_score ?? 0.9) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Factors Card */}
                <div className="md:col-span-2 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Key Contributing Wait Factors
                  </h4>
                  <div className="space-y-2 text-xs">
                    {waitTimePrediction.factors_breakdown &&
                      Object.entries(waitTimePrediction.factors_breakdown).map(([k, v], idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                          <span className="font-medium text-gray-700">{k}</span>
                          <span className="font-mono text-gray-900 font-bold">{String(v)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: BED OCCUPANCY FORECAST */}
        {/* =================================================================== */}
        {activeTab === "bed_forecast" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Inpatient Bed Utilization & Admission Forecast</h3>
                <p className="text-xs text-gray-500">
                  Multi-horizon admission velocity vs projected discharge trajectory
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setHorizonHours(24);
                    loadBedForecast(24);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    horizonHours === 24
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  24 Hours
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHorizonHours(48);
                    loadBedForecast(48);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    horizonHours === 48
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  48 Hours
                </button>
              </div>
            </div>

            {bedLoading ? (
              <div className="py-12 text-center">
                <div className="h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-500">Simulating bed occupancy velocity...</p>
              </div>
            ) : bedForecast ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Current Occupancy
                  </span>
                  <div className="text-2xl font-bold text-gray-900 font-mono">
                    {bedForecast.current_occupancy_percent}%
                  </div>
                  <span className="text-[11px] text-gray-500">Occupied wards</span>
                </div>

                <div className="rounded-3xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                    Projected {horizonHours}h Occupancy
                  </span>
                  <div className="text-2xl font-bold text-indigo-950 font-mono">
                    {bedForecast.projected_occupancy_percent}%
                  </div>
                  <span className="text-[11px] text-indigo-600">Predicted capacity</span>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Predicted Discharges
                  </span>
                  <div className="text-2xl font-bold text-emerald-700 font-mono">
                    {bedForecast.expected_discharges}
                  </div>
                  <span className="text-[11px] text-gray-500">Expected to clear</span>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Alert Status
                  </span>
                  <div className="text-base font-bold text-amber-700 mt-1">
                    {bedForecast.alert_status || "NORMAL"}
                  </div>
                  <span className="text-[11px] text-gray-500">Admission reserve</span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
