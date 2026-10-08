"use client";

import React, { useState, useEffect } from "react";
import {
  Eye,
  Shield,
  Search,
  Filter,
  RefreshCw,
  Building2,
  User,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
  FileCode,
  Globe,
  Terminal,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { api, PlatformAuditLog } from "@/lib/api";

const ACTION_COLORS: Record<string, { badge: string }> = {
  HOSPITAL_ACTIVATED: { badge: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  HOSPITAL_SUSPENDED: { badge: "bg-rose-100 text-rose-800 border-rose-200 font-bold" },
  FEATURE_UPDATED: { badge: "bg-purple-100 text-purple-800 border-purple-200" },
  PAYMENT_RECORDED: { badge: "bg-blue-100 text-blue-800 border-blue-200" },
  SUPPORT_IMPERSONATION_START: { badge: "bg-amber-100 text-amber-800 border-amber-200 font-bold" },
  SUPPORT_IMPERSONATION_END: { badge: "bg-slate-100 text-slate-700 border-slate-200" },
  CLIENT_CREATED: { badge: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  HOSPITAL_ONBOARDED: { badge: "bg-teal-100 text-teal-800 border-teal-200" },
};

export default function SuperAdminAuditPage() {
  const [logs, setLogs] = useState<PlatformAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<PlatformAuditLog | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await api.superAdmin.listAuditLogs({ limit: 100 });
      setLogs(res);
    } catch (err: any) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.admin_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.entity_name && log.entity_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.reason && log.reason.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.ticket_ref && log.ticket_ref.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesEntity = entityFilter === "ALL" || log.entity_type === entityFilter;
    return matchesSearch && matchesEntity;
  });

  const entityTypes = ["ALL", "HOSPITAL", "CLIENT", "SUBSCRIPTION", "FEATURE", "PAYMENT", "IMPERSONATION"];

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 p-8 rounded-3xl text-white shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-200 border border-purple-400/30 rounded-full text-xs font-semibold">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Sathus Immutable Compliance Ledger
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Platform Audit Trail</h1>
            <p className="text-purple-200 text-sm max-w-2xl">
              Complete chronological ledger of administrative operations, policy changes, feature toggles, suspensions, and support sessions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAuditLogs()}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-3 rounded-2xl border border-white/20 transition backdrop-blur-md text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Logs
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by action, admin, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
              {entityTypes.map((et) => (
                <button
                  key={et}
                  onClick={() => setEntityFilter(et)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    entityFilter === et
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {et}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mb-3"></div>
              <p className="text-sm text-slate-500">Querying platform audit log entries...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Eye className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700">No audit events found</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing your filters or search keywords.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-6">Action / Event</th>
                    <th className="py-4 px-6">Admin User</th>
                    <th className="py-4 px-6">Target Resource</th>
                    <th className="py-4 px-6">Reason / Ticket</th>
                    <th className="py-4 px-6">Origin IP</th>
                    <th className="py-4 px-6 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredLogs.map((log) => {
                    const actionStyle = ACTION_COLORS[log.action] || {
                      badge: "bg-slate-100 text-slate-700 border-slate-200",
                    };

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${actionStyle.badge}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-900 text-xs">
                              {log.admin_username}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-xs">
                          <p className="font-bold text-slate-800">{log.entity_name || log.entity_type}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{log.entity_id}</p>
                        </td>
                        <td className="py-4 px-6 text-xs max-w-xs">
                          <p className="text-slate-700 line-clamp-1">{log.reason || "Administrative update"}</p>
                          {log.ticket_ref && (
                            <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded">
                              Ticket #{log.ticket_ref}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-xs font-mono text-slate-500">
                          {log.ip_address || "127.0.0.1"}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 font-semibold px-3 py-1.5 rounded-xl text-xs transition border border-slate-200"
                          >
                            <FileCode className="w-3.5 h-3.5" /> Diff
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Diff / JSON Payload Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wider font-mono">
                    {selectedLog.action}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5">Audit Payload Inspection</h3>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block font-medium">Actor / Administrator</span>
                    <span className="font-bold text-slate-800">{selectedLog.admin_username}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Timestamp</span>
                    <span className="font-bold text-slate-800">{new Date(selectedLog.created_at).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Resource Entity</span>
                    <span className="font-bold text-slate-800">{selectedLog.entity_name} ({selectedLog.entity_type})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Reason</span>
                    <span className="font-bold text-slate-800">{selectedLog.reason || "N/A"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Previous Value State</label>
                    <pre className="bg-slate-900 text-slate-200 p-4 rounded-2xl overflow-x-auto text-[11px] font-mono h-48 border border-slate-800">
                      {JSON.stringify(selectedLog.previous_value, null, 2) || "null (Initial state)"}
                    </pre>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">New Value State</label>
                    <pre className="bg-slate-900 text-emerald-400 p-4 rounded-2xl overflow-x-auto text-[11px] font-mono h-48 border border-slate-800">
                      {JSON.stringify(selectedLog.new_value, null, 2) || "null"}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-6 mt-6 border-t border-slate-100">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
