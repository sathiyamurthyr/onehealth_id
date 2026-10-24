"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  Calendar,
  User,
  ArrowRight,
  Clock,
  Layers,
  KeyRound,
  Trash2,
  Lock,
  UserCheck
} from "lucide-react";
import { api } from "@/lib/api";
import { UserAuditRecord } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function HospitalAccessAuditPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || "";

  const [logs, setLogs] = useState<UserAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [search, setSearch] = useState("");

  const loadAuditLogs = async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res: any = await api.hospital.getUserAuditTrail({
        hospital_id: activeHospitalId,
        action_type: selectedAction !== "ALL" ? selectedAction : undefined,
        limit: 100,
      });
      const list = Array.isArray(res) ? res : (res?.audit_logs || res?.items || []);
      setLogs(list);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAuditLogs(false);
  }, [activeHospitalId, selectedAction]);

  const filteredLogs = logs.filter((l) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (l.target_user_name || "").toLowerCase().includes(q) ||
      (l.actor_name || "").toLowerCase().includes(q) ||
      (l.reason || "").toLowerCase().includes(q) ||
      (l.action_type || "").toLowerCase().includes(q) ||
      (l.target_user_id || "").toLowerCase().includes(q) ||
      (l.actor_id || "").toLowerCase().includes(q)
    );
  });

  const getActionBadgeClass = (actionType?: string) => {
    const act = (actionType || "").toUpperCase();
    if (act.includes("DELETE") || act.includes("TERMINATE") || act.includes("SUSPEND") || act.includes("DISABLE")) {
      return "bg-rose-50 text-rose-800 border-rose-200";
    }
    if (act.includes("PASSWORD") || act.includes("RESET") || act.includes("SECURITY") || act.includes("UNLOCK")) {
      return "bg-amber-50 text-amber-800 border-amber-200";
    }
    if (act.includes("ROLE") || act.includes("PERMISSION") || act.includes("BRANCH")) {
      return "bg-blue-50 text-blue-800 border-blue-200";
    }
    if (act.includes("CREATE") || act.includes("ACTIVAT") || act.includes("ENABLE") || act.includes("VERIF")) {
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  return (
    <WorkspaceLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/hospital/users"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
              title="Back to Users"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  Administration &rarr; Users & Access &rarr; Audit Trail
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                  {logs.length} Recorded Events
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                User Access & RBAC Audit Trail
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAuditLogs(false)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
              title="Refresh Audit Logs"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            </button>
            <Link
              href="/hospital/users"
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition"
            >
              View User Roster
            </Link>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit trail by user, administrator, or action reason..."
              className="w-full pl-9.5 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none transition"
            />
          </div>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none font-semibold text-slate-700"
          >
            <option value="ALL">All Mutation Actions</option>
            <option value="ROLE_CHANGED">ROLE_CHANGED</option>
            <option value="PERMISSIONS_UPDATED">PERMISSIONS_UPDATED</option>
            <option value="CUSTOM_ROLE_CREATED">CUSTOM_ROLE_CREATED</option>
            <option value="BRANCH_ACCESS_MODIFIED">BRANCH_ACCESS_MODIFIED</option>
            <option value="CREDENTIAL_VERIFIED">CREDENTIAL_VERIFIED</option>
            <option value="PASSWORD_RESET">PASSWORD_RESET</option>
            <option value="PASSWORD_RESET_TRIGGERED">PASSWORD_RESET_TRIGGERED</option>
            <option value="ACCOUNT_SUSPENDED">ACCOUNT_SUSPENDED</option>
            <option value="ACCOUNT_ACTIVATED">ACCOUNT_ACTIVATED</option>
            <option value="LOGIN_DISABLED">LOGIN_DISABLED</option>
            <option value="LOGIN_ENABLED">LOGIN_ENABLED</option>
            <option value="ACCOUNT_UNLOCKED">ACCOUNT_UNLOCKED</option>
            <option value="SESSIONS_REVOKED">SESSIONS_REVOKED</option>
            <option value="USER_CREATED">USER_CREATED</option>
            <option value="USER_UPDATED">USER_UPDATED</option>
            <option value="USER_DELETED">USER_DELETED</option>
          </select>
        </div>

        {/* Audit Log Stream */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-slate-500 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              <p className="text-sm font-medium">Loading audit events...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-3">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Audit Events Found</h3>
              <p className="text-sm text-slate-500">
                No access or security mutations match the active filters.
              </p>
              {(search || selectedAction !== "ALL") && (
                <button
                  onClick={() => { setSearch(""); setSelectedAction("ALL"); }}
                  className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                >
                  Clear search and filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const badgeClass = getActionBadgeClass(log.action_type);
                const dateStr = log.created_at ? new Date(log.created_at).toLocaleString() : "Recently";

                return (
                  <div key={log.id} className="p-5 hover:bg-slate-50/60 transition space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${badgeClass}`}>
                          {log.action_type}
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          Target: {log.target_user_name}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          by <strong className="text-slate-700">{log.actor_name}</strong>
                          {log.actor_role && (
                            <span className="text-slate-400 ml-1">({log.actor_role})</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                        <span>{dateStr}</span>
                      </div>
                    </div>

                    {log.reason && (
                      <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-medium">
                        Reason: {log.reason}
                      </p>
                    )}

                    {(log.previous_state || log.new_state) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                        {log.previous_state && Object.keys(log.previous_state).length > 0 && (
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-600 overflow-x-auto">
                            <span className="font-bold text-slate-700 block mb-1">Previous State:</span>
                            <pre className="whitespace-pre-wrap">{JSON.stringify(log.previous_state, null, 2)}</pre>
                          </div>
                        )}
                        {log.new_state && Object.keys(log.new_state).length > 0 && (
                          <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 font-mono text-[11px] text-emerald-900 overflow-x-auto">
                            <span className="font-bold text-emerald-800 block mb-1">New State:</span>
                            <pre className="whitespace-pre-wrap">{JSON.stringify(log.new_state, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
