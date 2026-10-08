"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Network,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Plus,
  Zap,
  Server,
  Key,
  Globe,
  Radio,
  ExternalLink,
  Shield,
  Layers,
  X,
  Play
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { phase4Api } from "@/lib/api/phase4";
import { Integration, IntegrationEvent } from "@/lib/types";

export default function HospitalIntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [activeTab, setActiveTab] = useState<"REGISTRY" | "EVENTS">("REGISTRY");
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<{ id: string; latency_ms: number; status: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New Integration Form
  const [providerName, setProviderName] = useState("Agfa Enterprise RIS/PACS");
  const [providerCode, setProviderCode] = useState("AGFA-PACS-01");
  const [integrationType, setIntegrationType] = useState<any>("RIS_PACS");
  const [endpointUrl, setEndpointUrl] = useState("https://pacs.enterprise-hospital.org/dicom-web");
  const [authMethod, setAuthMethod] = useState<any>("BEARER_TOKEN");
  const [environment, setEnvironment] = useState<any>("PRODUCTION");
  const [secretKey, setSecretKey] = useState("sec_pacs_prod_9941");

  const loadData = async () => {
    setLoading(true);
    try {
      const [intList, evtList] = await Promise.all([
        phase4Api.getIntegrations(),
        phase4Api.getIntegrationEvents(undefined, 30),
      ]);
      setIntegrations(intList);
      setEvents(evtList);
    } catch (err) {
      console.error("Failed to load integrations data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTestPing = async (id: string) => {
    setPingingId(id);
    setPingResult(null);
    try {
      const res = await phase4Api.testIntegrationPing(id);
      setPingResult({ id, latency_ms: res.latency_ms, status: res.status });
    } catch (e: any) {
      alert(e.message || "Ping test failed.");
    } finally {
      setPingingId(null);
    }
  };

  const handleCreateIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await phase4Api.createIntegration({
        provider_name: providerName,
        provider_code: providerCode,
        integration_type: integrationType,
        endpoint_url: endpointUrl,
        auth_method: authMethod,
        environment: environment,
        capabilities: ["DIAGNOSTIC_REPORT", "IMAGING_STUDY"],
        secret_key: secretKey,
      });
      setShowAddModal(false);
      await loadData();
    } catch (e: any) {
      alert(e.message || "Failed to register integration.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active Online
          </span>
        );
      case "CONFIGURED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Configured
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> Suspended
          </span>
        );
      case "ERROR":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5" /> Error
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <WorkspaceLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-cyan-900/40 via-blue-900/30 to-slate-900/60 p-6 rounded-2xl border border-cyan-500/20 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Cpu className="w-3.5 h-3.5" />
                Interoperability Gateway
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Shield className="w-3.5 h-3.5" />
                HMAC-SHA256 Signed
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Hospital Integrations & Gateway Hub
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Connect and monitor your facility&apos;s Laboratory Information Systems (LIS), Radiology PACS, FHIR R4 interfaces, and ABDM Gateways.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-all flex items-center gap-2 shadow-lg shadow-cyan-900/30"
            >
              <Plus className="w-4 h-4" />
              Register Integration
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("REGISTRY")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "REGISTRY"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Server className="w-4 h-4" /> Configured Connectors ({integrations.length})
          </button>
          <button
            onClick={() => setActiveTab("EVENTS")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "EVENTS"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-4 h-4" /> Live Event Stream ({events.length})
          </button>
        </div>

        {/* Tab 1: Integration Registry */}
        {activeTab === "REGISTRY" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {integrations.map((intg) => (
              <div
                key={intg.id}
                className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold shrink-0">
                        <Radio className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-white">{intg.provider_name}</h3>
                          {getStatusBadge(intg.status)}
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{intg.provider_code} • {intg.integration_type}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs font-mono space-y-1">
                    <div className="text-slate-400 truncate">
                      <span className="text-slate-500">Endpoint:</span> {intg.endpoint_url || "Local Event Listener"}
                    </div>
                    <div className="text-slate-400">
                      <span className="text-slate-500">Auth:</span> {intg.auth_method} • <span className="text-slate-500">Env:</span> {intg.environment}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {intg.capabilities.map((cap) => (
                      <span key={cap} className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {cap}
                      </span>
                    ))}
                  </div>

                  {pingResult && pingResult.id === intg.id && (
                    <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
                      <span>Live Health Ping: <strong>{pingResult.status}</strong></span>
                      <span className="font-mono">{pingResult.latency_ms} ms</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Last sync: {intg.last_sync_at ? new Date(intg.last_sync_at).toLocaleTimeString() : "Never"}
                  </span>

                  <button
                    onClick={() => handleTestPing(intg.id)}
                    disabled={pingingId === intg.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1.5"
                  >
                    <Play className={`w-3 h-3 ${pingingId === intg.id ? "animate-spin" : ""}`} />
                    {pingingId === intg.id ? "Pinging..." : "Test Health Ping"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Live Event Stream */}
        {activeTab === "EVENTS" && (
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
                <Activity className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <p>No integration webhook or exchange events recorded yet.</p>
              </div>
            ) : (
              events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                      evt.status === "COMPLETED"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{evt.event_type}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                          {evt.direction}
                        </span>
                        <span className="text-emerald-400 font-medium">{evt.status}</span>
                      </div>
                      <p className="text-slate-400 mt-0.5">
                        {evt.source_system} → {evt.target_system} • Attempts: {evt.attempt_count}
                      </p>
                    </div>
                  </div>

                  <div className="text-slate-500 font-mono text-[11px]">
                    {new Date(evt.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-white">Register Facility Integration</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateIntegration} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Provider / System Name</label>
                  <input
                    type="text"
                    required
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Provider Code</label>
                    <input
                      type="text"
                      required
                      value={providerCode}
                      onChange={(e) => setProviderCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Integration Type</label>
                    <select
                      value={integrationType}
                      onChange={(e) => setIntegrationType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="LIS_CONNECTOR">LIS_CONNECTOR</option>
                      <option value="RIS_PACS">RIS_PACS</option>
                      <option value="FHIR_R4">FHIR_R4</option>
                      <option value="REST_API">REST_API</option>
                      <option value="WEBHOOK">WEBHOOK</option>
                      <option value="ABDM_GATEWAY">ABDM_GATEWAY</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Endpoint URL</label>
                  <input
                    type="url"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Authentication Method</label>
                    <select
                      value={authMethod}
                      onChange={(e) => setAuthMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="BEARER_TOKEN">BEARER_TOKEN</option>
                      <option value="API_KEY">API_KEY</option>
                      <option value="HMAC_SHA256">HMAC_SHA256</option>
                      <option value="OAUTH2">OAUTH2</option>
                      <option value="NONE">NONE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Environment</label>
                    <select
                      value={environment}
                      onChange={(e) => setEnvironment(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="PRODUCTION">PRODUCTION</option>
                      <option value="STAGING">STAGING</option>
                      <option value="SANDBOX">SANDBOX</option>
                      <option value="DEVELOPMENT">DEVELOPMENT</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">HMAC / API Secret Key</label>
                  <input
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono"
                    placeholder="Enter integration secret token..."
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-all shadow-md shadow-cyan-900/30"
                  >
                    {actionLoading ? "Registering..." : "Save Integration"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
