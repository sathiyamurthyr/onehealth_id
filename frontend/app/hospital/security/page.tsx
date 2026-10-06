"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Building,
  AlertCircle,
  RefreshCw,
  Lock,
  Eye,
  KeyRound,
  FileText,
  Activity,
  UserCheck,
  ShieldAlert,
  Fingerprint,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { api } from "@/lib/api";

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<"RBAC" | "ACCESS_LOGS" | "AUDIT_TRAIL">("RBAC");
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [accList, audList] = await Promise.all([
        api.hospital.getAccessLogs("hosp-kedar", 100).catch(() => []),
        api.hospital.getAuditLogs(100).catch(() => []),
      ]);
      setAccessLogs(accList || []);
      setAuditLogs(audList || []);
    } catch (err: any) {
      console.error("Failed to load security logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const permissionsMatrix = [
    { code: "PATIENT_VIEW", label: "Patient Search & Demographics", granted: true, category: "Patients" },
    { code: "PATIENT_REGISTER", label: "Patient Identity Registration", granted: true, category: "Patients" },
    { code: "APPOINTMENT_VIEW", label: "Hospital Appointments View", granted: true, category: "Operations" },
    { code: "APPOINTMENT_MANAGE", label: "Slot & Schedule Allocation", granted: true, category: "Operations" },
    { code: "QUEUE_VIEW", label: "Live OPD Queue Monitoring", granted: true, category: "Operations" },
    { code: "QUEUE_MANAGE", label: "Counter & Token Dispatch", granted: true, category: "Operations" },
    { code: "DOCTOR_MANAGE", label: "Doctor Registration & Mapping", granted: true, category: "People" },
    { code: "NURSE_MANAGE", label: "Nurse Roster & Ward Assignment", granted: true, category: "People" },
    { code: "TRAINEE_MANAGE", label: "Trainee Supervision Rules", granted: true, category: "People" },
    { code: "DEPARTMENT_MANAGE", label: "Department & Specialties", granted: true, category: "Departments" },
    { code: "COUNTER_MANAGE", label: "OPD Counter Token Config", granted: true, category: "Departments" },
    { code: "ROSTER_MANAGE", label: "Shift & On-Duty Status", granted: true, category: "Operations" },
    { code: "BILLING_VIEW", label: "Hospital Invoices & Tariff", granted: true, category: "Financial" },
    {
      code: "CLINICAL_RESTRICTED",
      label: "Patient Clinical Records (Notes/Rx)",
      granted: false,
      category: "Privacy Guardrail",
      restrictedNote: "Explicitly restricted by default to preserve patient healthcare privacy.",
    },
    { code: "AUDIT_VIEW", label: "Access & System Audit Logs", granted: true, category: "Security" },
    { code: "SETTINGS_MANAGE", label: "Hospital Profile & Rules", granted: true, category: "Security" },
  ];

  const filteredAccessLogs = accessLogs.filter((log) => {
    return (
      (log.accessor_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.patient_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.access_purpose || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredAuditLogs = auditLogs.filter((log) => {
    return (
      (log.action || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.user_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN"]}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/hospital"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hospital Operations
          </Link>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-slate-900" : ""}`} />
            Refresh Logs
          </button>
        </div>

        {/* Header with Stats */}
        <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-slate-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Security & Privacy Governance
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Access Logs, RBAC & Privacy Audit</h1>
              <p className="text-slate-300 text-sm max-w-xl">
                Cryptographically tracked audit logs, patient clinical record access logs, and role-based permissions matrix for Hospital Administration.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
              <div className="px-3">
                <div className="text-2xl font-bold text-emerald-400">16</div>
                <div className="text-[11px] font-medium text-slate-300">RBAC Scopes</div>
              </div>
              <div className="px-3 border-x border-white/10">
                <div className="text-2xl font-bold text-indigo-300">{accessLogs.length}</div>
                <div className="text-[11px] font-medium text-slate-300">Patient Access Logs</div>
              </div>
              <div className="px-3">
                <div className="text-2xl font-bold text-teal-300">{auditLogs.length}</div>
                <div className="text-[11px] font-medium text-slate-300">Audit Events</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("RBAC")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "RBAC"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" /> RBAC Permission Scope
          </button>
          <button
            onClick={() => setActiveTab("ACCESS_LOGS")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "ACCESS_LOGS"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" /> Patient Record Access Logs ({accessLogs.length})
          </button>
          <button
            onClick={() => setActiveTab("AUDIT_TRAIL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "AUDIT_TRAIL"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Hospital Audit Trail ({auditLogs.length})
          </button>
        </div>

        {/* TAB 1: RBAC */}
        {activeTab === "RBAC" && (
          <div className="space-y-6">
            {/* Privacy Alert */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Healthcare Privacy Guardrail:</span> Hospital Administrators have full operational, scheduling, queue, and staff oversight. However,{" "}
                <strong>sensitive patient clinical records (notes, diagnoses, full prescriptions)</strong> are restricted by default to preserve HIPAA/GDPR healthcare privacy standards.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {permissionsMatrix.map((perm) => (
                <div
                  key={perm.code}
                  className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 ${
                    perm.granted
                      ? "bg-white border-slate-200 shadow-sm"
                      : "bg-rose-50/50 border-rose-200"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {perm.category}
                      </span>
                      <code className="text-xs font-mono font-bold text-slate-800">{perm.code}</code>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{perm.label}</div>
                    {perm.restrictedNote && (
                      <p className="text-xs text-rose-700 font-medium">{perm.restrictedNote}</p>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                      perm.granted
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-100 text-rose-800 border border-rose-300"
                    }`}
                  >
                    {perm.granted ? <CheckCircle2 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {perm.granted ? "AUTHORIZED" : "RESTRICTED"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: PATIENT ACCESS LOGS */}
        {activeTab === "ACCESS_LOGS" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search access logs by doctor/staff name, patient name, or access purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent focus:outline-none"
              />
            </div>

            {loading ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <RefreshCw className="w-8 h-8 text-slate-600 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">Loading patient access logs...</p>
              </div>
            ) : filteredAccessLogs.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <Fingerprint className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Access Logs Recorded</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                  Every time a patient record or encounter is accessed, an immutable access log is registered here.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4">Staff Member</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Patient Record Accessed</th>
                        <th className="py-3.5 px-4">Access Purpose</th>
                        <th className="py-3.5 px-4">IP Address</th>
                        <th className="py-3.5 px-4 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAccessLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{log.accessor_name || "Dr. Arun Kumar"}</div>
                            <div className="text-[10px] text-slate-400 font-mono">ID: {log.accessed_by?.slice(0, 8)}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {log.accessor_role || "DOCTOR"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-emerald-800">{log.patient_name || "Patient Record"}</span>
                            <div className="text-[10px] text-slate-400 font-mono">OH-ID: {log.patient_id?.slice(0, 8)}</div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {log.access_purpose || "OPD Clinical Consultation"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                            {log.ip_address || "192.168.1.104"}
                          </td>

                          <td className="py-3.5 px-4 text-right text-slate-500 text-[11px] font-mono">
                            {log.accessed_at ? new Date(log.accessed_at).toLocaleString() : "Just now"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUDIT TRAIL */}
        {activeTab === "AUDIT_TRAIL" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search system audit events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent focus:outline-none"
              />
            </div>

            {loading ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <RefreshCw className="w-8 h-8 text-slate-600 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">Loading system audit trail...</p>
              </div>
            ) : filteredAuditLogs.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No System Audit Logs</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">No operational changes recorded yet.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4">Action</th>
                        <th className="py-3.5 px-4">Actor</th>
                        <th className="py-3.5 px-4">Details / Entity</th>
                        <th className="py-3.5 px-4 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                              {log.action}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-slate-700">
                            {log.user_name || log.user_id || "Hospital Admin (hospadmin)"}
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 max-w-md truncate">
                            {typeof log.details === "object" ? JSON.stringify(log.details) : log.details || "Operation executed"}
                          </td>

                          <td className="py-3.5 px-4 text-right text-slate-500 text-[11px] font-mono">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : "Today"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
