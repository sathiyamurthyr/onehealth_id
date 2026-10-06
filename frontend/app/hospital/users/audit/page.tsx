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
  Layers
} from "lucide-react";
import { api } from "@/lib/api";
import { UserAuditRecord } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function HospitalAccessAuditPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || "hosp-kedar";

  const [logs, setLogs] = useState<UserAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [search, setSearch] = useState("");

  const loadAuditLogs = async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await api.hospital.getUserAuditTrail({
        hospital_id: activeHospitalId,
        action_type: selectedAction !== "ALL" ? selectedAction : undefined,
        limit: 100,
      });
      if (res?.audit_logs) setLogs(res.audit_logs);
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
    const q = search.toLowerCase();
    return (
      l.target_user_name.toLowerCase().includes(q) ||
      l.actor_name.toLowerCase().includes(q) ||
      (l.reason || "").toLowerCase().includes(q) ||
      l.action_type.toLowerCase().includes(q)
    );
  });

  return (
    <WorkspaceLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/hospital/users"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  Administration &rarr; Users & Access &rarr; Audit Trail
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                User Access & RBAC Audit Trail
              </h1>
            </div>
          </div>

          <button
            onClick={() => loadAuditLogs(false)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>
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
              className="w-full pl-9.5 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
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
            <option value="BRANCH_ACCESS_MODIFIED">BRANCH_ACCESS_MODIFIED</option>
            <option value="CREDENTIAL_VERIFIED">CREDENTIAL_VERIFIED</option>
            <option value="ACCOUNT_SUSPENDED">ACCOUNT_SUSPENDED</option>
            <option value="ACCOUNT_ACTIVATED">ACCOUNT_ACTIVATED</option>
            <option value="LOGIN_DISABLED">LOGIN_DISABLED</option>
            <option value="LOGIN_ENABLED">LOGIN_ENABLED</option>
            <option value="ACCOUNT_UNLOCKED">ACCOUNT_UNLOCKED</option>
            <option value="PASSWORD_RESET_TRIGGERED">PASSWORD_RESET_TRIGGERED</option>
            <option value="SESSIONS_REVOKED">SESSIONS_REVOKED</option>
            <option value="USER_CREATED">USER_CREATED</option>
            <option value="USER_UPDATED">USER_UPDATED</option>
          </select>
        </div>

        {/* Audit Log Stream */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              <p className="text-sm">Loading audit events...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Audit Events Found</h3>
              <p className="text-sm text-slate-500">No mutations recorded matching the active filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-5 hover:bg-slate-50/60 transition space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        {log.action_type}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        Target: {log.target_user_name}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        by {log.actor_name}
                      </span>
                    </div>

                    <span className="text-xs font-mono text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>

                  {log.reason && (
                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-medium">
                      Reason: {log.reason}
                    </p>
                  )}

                  {(log.previous_state || log.new_state) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                      {log.previous_state && Object.keys(log.previous_state).length > 0 && (
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-600">
                          <span className="font-bold text-slate-700 block mb-1">Previous State:</span>
                          <pre className="whitespace-pre-wrap">{JSON.stringify(log.previous_state, null, 2)}</pre>
                        </div>
                      )}
                      {log.new_state && Object.keys(log.new_state).length > 0 && (
                        <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 font-mono text-[11px] text-emerald-900">
                          <span className="font-bold text-emerald-800 block mb-1">New State:</span>
                          <pre className="whitespace-pre-wrap">{JSON.stringify(log.new_state, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
