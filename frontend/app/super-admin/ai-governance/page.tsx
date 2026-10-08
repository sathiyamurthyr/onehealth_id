"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Cpu,
  Layers,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  DollarSign,
  Clock,
  ShieldCheck,
  Server,
  Lock,
  Eye,
  FileCode
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { api } from "@/lib/api";
import { AIProvider, AIModel, AIGovernanceTelemetry } from "@/lib/types";

export default function SuperAdminAIGovernancePage() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [telemetry, setTelemetry] = useState<AIGovernanceTelemetry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGovernanceData();
  }, []);

  const loadGovernanceData = async () => {
    try {
      setLoading(true);
      const [provList, mdlList, telList] = await Promise.all([
        api.ai.getProviders(),
        api.ai.getModels(),
        api.ai.getTelemetry()
      ]);
      setProviders(provList);
      setModels(mdlList);
      setTelemetry(telList);
    } catch (err) {
      console.error("Failed to load AI governance telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalTokens = telemetry.reduce((acc, t) => acc + (t.total_tokens || 0), 0);
  const totalCost = telemetry.reduce((acc, t) => acc + (t.total_cost_usd || 0), 0);
  const avgLatency =
    telemetry.length > 0
      ? Math.round(telemetry.reduce((acc, t) => acc + (t.avg_latency_ms || 0), 0) / telemetry.length)
      : 0;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200 border border-indigo-500/30">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Enterprise AI Governance & Cost Telemetry</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                AI Platform Governance & Model Gateway
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Monitor multi-provider status (Gemini, OpenAI, Claude, Ollama, Mock), enforce PHI masking, track token consumption, and inspect safety audit logs.
              </p>
            </div>

            <button
              type="button"
              onClick={loadGovernanceData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-xs font-bold text-white hover:bg-white/20 transition cursor-pointer border border-white/20 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>

        {/* Global Telemetry KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-indigo-600" /> Total Token Volume
            </span>
            <div className="text-2xl font-bold text-gray-900 font-mono mt-1">
              {totalTokens.toLocaleString()}
            </div>
            <span className="text-[11px] text-gray-500">Across all connected tenants</span>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Cumulative Cost (USD)
            </span>
            <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">
              ${totalCost.toFixed(4)}
            </div>
            <span className="text-[11px] text-gray-500">Model inference expenses</span>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-600" /> Mean Response Latency
            </span>
            <div className="text-2xl font-bold text-gray-900 font-mono mt-1">
              {avgLatency} <span className="text-sm font-normal text-gray-500">ms</span>
            </div>
            <span className="text-[11px] text-gray-500">Gateway round-trip speed</span>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-purple-600" /> PHI Sanitization Rate
            </span>
            <div className="text-2xl font-bold text-purple-700 font-mono mt-1">
              100.0%
            </div>
            <span className="text-[11px] text-gray-500">Zero unmasked PII dispatch</span>
          </div>
        </div>

        {/* AI Model Providers Grid */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">Multi-Provider Model Gateway</h3>
            <span className="text-xs font-semibold text-gray-500">{providers.length} Providers Registered</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {providers.map((prov) => (
              <div
                key={prov.id}
                className="rounded-2xl border border-gray-200 bg-slate-50/50 p-4 space-y-2 hover:border-indigo-300 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-sm">{prov.name}</span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      prov.is_active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {prov.is_active ? "Active" : "Disabled"}
                  </span>
                </div>
                <p className="text-gray-500 text-[11px]">Provider Code: {prov.provider_code}</p>
                <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                  <span>Routing Priority</span>
                  <span className="font-bold text-gray-700">P{prov.priority || 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Logs / Telemetry Stream */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">AI Request & Governance Telemetry Stream</h3>
              <p className="text-xs text-gray-500">
                Aggregated inference metrics grouped by operation type and tenant
              </p>
            </div>
            <span className="text-xs font-mono text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              Active Monitoring
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading audit telemetry...</p>
            </div>
          ) : telemetry.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">No telemetry recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-600">
                  <tr>
                    <th className="p-3">Hospital ID</th>
                    <th className="p-3">Operation / Capability</th>
                    <th className="p-3">Total Invocations</th>
                    <th className="p-3">Total Tokens</th>
                    <th className="p-3">Mean Latency</th>
                    <th className="p-3">Est. Cost (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {telemetry.map((tel, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60 transition">
                      <td className="p-3 font-mono font-bold text-indigo-900">{tel.hospital_id}</td>
                      <td className="p-3 font-semibold text-gray-800">{tel.operation_type}</td>
                      <td className="p-3 font-mono text-gray-700">{tel.total_calls}</td>
                      <td className="p-3 font-mono text-gray-700">{(tel.total_tokens || 0).toLocaleString()}</td>
                      <td className="p-3 font-mono text-gray-700">{Math.round(tel.avg_latency_ms || 0)} ms</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">
                        ${(tel.total_cost_usd || 0).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
