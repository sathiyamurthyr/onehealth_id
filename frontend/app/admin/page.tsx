"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Building2,
  Users,
  KeyRound,
  FileCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Activity,
  Layers,
  ShieldCheck,
  Lock
} from "lucide-react";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/FeedbackStates";

export default function AdminPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"audit" | "departments" | "rbac">("audit");
  const [search, setSearch] = useState("");

  const loadAdminData = async () => {
    setLoading(true);
    setError("");
    try {
      const [deptData, auditData] = await Promise.all([
        api.admin.departments().catch(() => []),
        api.admin.auditLogs().catch(() => []),
      ]);
      setDepartments(deptData);
      setAuditLogs(auditData);
    } catch (err: any) {
      setError(err.message || "Failed to load administrative governance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const filteredLogs = auditLogs.filter((l) => {
    return (
      !search ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.actor_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.resource?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Hospital Administration & Governance
              </h1>
              <Badge variant="primary" className="text-xs">
                HIPAA & ABDM Audited
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Department structures, immutable security audit trails, and multi-tenant RBAC policies
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">
              Active Tenant: <strong className="text-slate-700 dark:text-slate-200">Apollo Health Network (TN-01)</strong>
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-2">
          {[
            { id: "audit", label: `Audit Trail & Security Logs (${auditLogs.length})`, icon: ShieldAlert },
            { id: "departments", label: `Clinical Departments (${departments.length})`, icon: Building2 },
            { id: "rbac", label: "RBAC Role Hierarchy", icon: KeyRound },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[44px] ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Audit Trail */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter logs by actor, action (e.g. REGISTER_PATIENT), or resource..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
              </div>
            </div>

            {loading ? (
              <LoadingState message="Fetching immutable security ledger..." />
            ) : filteredLogs.length === 0 ? (
              <EmptyState
                title="No Audit Records Found"
                message="No log entries matching your current search parameters."
              />
            ) : (
              <div className="space-y-3">
                {/* Desktop Table View */}
                <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-4 px-6">Timestamp</th>
                        <th className="py-4 px-6">Actor / User</th>
                        <th className="py-4 px-6">Action Performed</th>
                        <th className="py-4 px-6">Affected Resource</th>
                        <th className="py-4 px-6">IP Address</th>
                        <th className="py-4 px-6 text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredLogs.map((log, idx) => (
                        <tr key={log.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-4 px-6 font-mono text-slate-500 text-[11px]">
                            {new Date(log.created_at || Date.now()).toLocaleString()}
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">
                            {log.actor_name || "System Actor"}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                            {log.resource}
                          </td>
                          <td className="py-4 px-6 font-mono text-slate-500 text-[11px]">
                            {log.ip_address || "127.0.0.1"}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <Badge variant={log.status === "FAILED" ? "danger" : "success"} className="text-[10px]">
                              {log.status || "SUCCESS"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile / Tablet Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-3">
                  {filteredLogs.map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                          {log.action}
                        </span>
                        <Badge variant={log.status === "FAILED" ? "danger" : "success"} className="text-[10px]">
                          {log.status || "SUCCESS"}
                        </Badge>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">
                        Actor: <strong>{log.actor_name || "System"}</strong> • Resource: {log.resource}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span>{new Date(log.created_at || Date.now()).toLocaleTimeString()}</span>
                        <span className="font-mono">{log.ip_address || "127.0.0.1"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Departments */}
        {activeTab === "departments" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <Card key={dept.id}>
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {dept.code}
                      </div>
                      <CardTitle className="text-sm font-bold">
                        {dept.name}
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 text-xs space-y-2">
                  <p className="text-slate-500">
                    {dept.description || "Comprehensive clinical diagnosis, treatment and round-the-clock emergency cover."}
                  </p>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Hospital Affiliation</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {dept.hospital_name || "Apollo Speciality Hospital Greams Road"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tab 3: RBAC Roles Hierarchy */}
        {activeTab === "rbac" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { role: "SUPER_ADMIN", desc: "Global tenant provisioning, system configs, master database access", level: "Tier 1" },
              { role: "HOSPITAL_ADMIN", desc: "Single hospital facility management, staff assignments, tariffs", level: "Tier 2" },
              { role: "DOCTOR", desc: "Outpatient queue consultations, prescriptions, IPD bed rounds, lab orders", level: "Tier 3" },
              { role: "RECEPTIONIST", desc: "Patient registration, appointment booking, queue token issuance", level: "Tier 4" },
              { role: "PHARMACY_STAFF", desc: "Formulary dispensing, batch stock replenishment, medicine sales", level: "Tier 4" },
              { role: "PATIENT", desc: "Personal OneHealth ID digital card, lab downloads, payment receipts", level: "Tier 5" },
            ].map((r) => (
              <Card key={r.role}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                      {r.role}
                    </CardTitle>
                    <Badge variant="primary" className="text-[10px]">
                      {r.level}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-slate-500">
                  <p>{r.desc}</p>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Enforced at API Gateway Layer</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
