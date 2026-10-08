"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  ShieldCheck,
  Building2,
  Lock,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  CheckCircle2,
  FileText,
  UserCheck,
  Activity,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { phase4Api } from "@/lib/api/phase4";
import { AccessHistoryEntry } from "@/lib/types";

export default function PatientAccessHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [accessLogs, setAccessLogs] = useState<AccessHistoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBasis, setFilterBasis] = useState<string>("ALL");

  const loadAccessHistory = async () => {
    setLoading(true);
    try {
      const data = await phase4Api.getPatientAccessHistory();
      setAccessLogs(data);
    } catch (err) {
      console.error("Failed to load access history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccessHistory();
  }, []);

  const filteredLogs = accessLogs.filter((log) => {
    const matchesSearch =
      log.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.purpose_of_use.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBasis = filterBasis === "ALL" || log.access_basis === filterBasis;
    return matchesSearch && matchesBasis;
  });

  return (
    <WorkspaceLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900/60 p-6 rounded-2xl border border-purple-500/20 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <History className="w-3.5 h-3.5" />
                Immutable Access Transparency
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Audit Logged
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Health Record Access History
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Real-time audit log of every hospital, doctor, laboratory, and external entity that accessed your health records, including the specific purpose and authorization basis.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAccessHistory}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-400" : ""}`} />
              Refresh Logs
            </button>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search hospital, clinic, or purpose..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/90 border border-slate-700/60 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {["ALL", "PATIENT_CONSENT", "BREAK_GLASS_EMERGENCY", "DIRECT_PATIENT_ACCESS"].map((basis) => (
              <button
                key={basis}
                onClick={() => setFilterBasis(basis)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  filterBasis === basis
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                    : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                {basis === "ALL" ? "All Access Events" : basis.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table / List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-3" />
            <p>Loading security audit telemetry...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
            <History className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No Access Events Recorded</h3>
            <p className="text-xs text-slate-500 mt-1">No healthcare providers have accessed your records matching the selected filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                    log.access_basis === "BREAK_GLASS_EMERGENCY"
                      ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                      : "bg-purple-500/15 border border-purple-500/30 text-purple-400"
                  }`}>
                    {log.access_basis === "BREAK_GLASS_EMERGENCY" ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Building2 className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-white">{log.requester_name}</h3>
                      
                      {log.access_basis === "BREAK_GLASS_EMERGENCY" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3" /> Emergency Break-Glass
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Authorized by Consent
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      Clinical Purpose: <strong className="text-slate-200">{log.purpose_of_use}</strong> • Requester Type: <span className="text-slate-300">{log.requester_type}</span>
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-slate-500 mr-1">Retrieved Categories:</span>
                      {log.data_categories.map((cat) => (
                        <span
                          key={cat}
                          className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-right md:shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800 text-xs">
                  <div className="flex md:flex-col items-center md:items-end justify-between gap-1 text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(log.accessed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-slate-300 font-medium">
                      {new Date(log.accessed_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
