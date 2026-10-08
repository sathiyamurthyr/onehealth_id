"use client";

import React, { useState, useEffect } from "react";
import {
  Network,
  Cpu,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Server,
  Zap,
  ShieldCheck,
  Filter,
  Search,
  Check,
  X,
  UserX,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { phase4Api } from "@/lib/api/phase4";
import {
  Integration,
  IntegrationEvent,
  IdentityConflict,
  IntegrationHealthSummary
} from "@/lib/types";

export default function SuperAdminIntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [healthSummary, setHealthSummary] = useState<IntegrationHealthSummary | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [conflicts, setConflicts] = useState<IdentityConflict[]>([]);
  const [activeTab, setActiveTab] = useState<"HEALTH" | "CONFLICTS" | "EVENTS">("HEALTH");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summary, intList, evtList, confList] = await Promise.all([
        phase4Api.getIntegrationHealthSummary().catch(() => null),
        phase4Api.getIntegrations().catch(() => []),
        phase4Api.getIntegrationEvents(undefined, 50).catch(() => []),
        phase4Api.getIdentityConflicts().catch(() => []),
      ]);
      setHealthSummary(summary);
      setIntegrations(intList);
      setEvents(evtList);
      setConflicts(confList);
    } catch (err) {
      console.error("Failed to load platform interoperability data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolveConflict = async (conflictId: string, resolution: "MERGED" | "NEW_PATIENT" | "REJECTED") => {
    setResolvingId(conflictId);
    try {
      await phase4Api.resolveIdentityConflict(conflictId, resolution);
      await loadData();
    } catch (e: any) {
      alert(e.message || "Failed to resolve conflict.");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <WorkspaceLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-purple-950/60 p-6 rounded-2xl border border-indigo-500/20 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Network className="w-3.5 h-3.5" />
                Platform Interoperability Command
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Live Health Telemetry
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Network Health & Identity Resolution
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Platform-level monitoring of FHIR R4 Gateways, ABDM Bridges, LIS/RIS Webhooks, and Deterministic Identity Matching Quarantine.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
              Refresh Health
            </button>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400 uppercase">Total Connectors</span>
            <p className="text-2xl font-bold text-white mt-1">{healthSummary?.total_integrations || integrations.length}</p>
            <span className="text-[11px] text-emerald-400 mt-0.5 block">{healthSummary?.active_integrations || 0} active</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400 uppercase">24h Exchange Volume</span>
            <p className="text-2xl font-bold text-indigo-400 mt-1">{healthSummary?.events_last_24h || events.length}</p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Events processed</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400 uppercase">Success Rate</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{healthSummary?.success_rate_percentage || 100}%</p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Zero data loss</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400 uppercase">Quarantined Conflicts</span>
            <p className={`text-2xl font-bold mt-1 ${conflicts.length > 0 ? "text-amber-400" : "text-white"}`}>
              {conflicts.length}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Pending manual review</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400 uppercase">Dead Letter Queue</span>
            <p className="text-2xl font-bold text-slate-300 mt-1">{healthSummary?.dead_letter_count || 0}</p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Permanent failures</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("HEALTH")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "HEALTH"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Server className="w-4 h-4" /> Platform Gateways ({integrations.length})
          </button>
          <button
            onClick={() => setActiveTab("CONFLICTS")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "CONFLICTS"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <AlertTriangle className="w-4 h-4" /> Identity Conflicts Quarantine ({conflicts.length})
          </button>
          <button
            onClick={() => setActiveTab("EVENTS")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "EVENTS"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-4 h-4" /> Network Events Log ({events.length})
          </button>
        </div>

        {/* Tab 1: Platform Gateways */}
        {activeTab === "HEALTH" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((intg) => (
              <div key={intg.id} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">{intg.provider_name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {intg.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono space-y-0.5">
                  <div>Type: {intg.integration_type}</div>
                  <div>Auth: {intg.auth_method}</div>
                  <div>Env: {intg.environment}</div>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Caps: {intg.capabilities.length}</span>
                  <span>{intg.endpoint_url ? "Configured" : "Inbound Only"}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Identity Conflicts Quarantine */}
        {activeTab === "CONFLICTS" && (
          <div className="space-y-4">
            {conflicts.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-300">Quarantine Clear</h3>
                <p className="text-xs text-slate-500 mt-1">Zero ambiguous patient matches or demographic conflicts detected.</p>
              </div>
            ) : (
              conflicts.map((conf) => (
                <div
                  key={conf.id}
                  className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">Demographic Conflict Quarantined</h3>
                        <p className="text-xs text-amber-300 font-mono mt-0.5">{conf.conflict_reason}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      {conf.status}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-xs font-mono grid grid-cols-2 gap-2 text-slate-300">
                    <div>Source: {conf.source_system}</div>
                    <div>External ID: {conf.external_patient_id}</div>
                    <div>Candidate OH-ID: {conf.candidate_patient_id}</div>
                    <div>Details: {JSON.stringify(conf.conflict_details)}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2 text-xs">
                    <button
                      onClick={() => handleResolveConflict(conf.id, "MERGED")}
                      disabled={resolvingId === conf.id}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                    >
                      Authorize Merge
                    </button>
                    <button
                      onClick={() => handleResolveConflict(conf.id, "NEW_PATIENT")}
                      disabled={resolvingId === conf.id}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium"
                    >
                      Create Distinct Patient
                    </button>
                    <button
                      onClick={() => handleResolveConflict(conf.id, "REJECTED")}
                      disabled={resolvingId === conf.id}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      Reject Import
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Events Stream */}
        {activeTab === "EVENTS" && (
          <div className="space-y-3">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-semibold text-white">{evt.event_type}</span>
                  <span className="text-slate-400 ml-2">
                    ({evt.source_system} → {evt.target_system})
                  </span>
                </div>
                <div className="text-slate-500 font-mono">
                  {new Date(evt.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
