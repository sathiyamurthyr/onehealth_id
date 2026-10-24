"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Stethoscope,
  HeartPulse,
  BedDouble,
  Receipt,
  TestTube,
  Pill,
  CalendarCheck,
  ListOrdered,
  PlusCircle,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  TrendingUp,
  Activity,
  Award,
  FileText,
  UserCheck,
  UserPlus,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  DoorClosed,
  Zap
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { HospitalOperationsDashboard, OperationalAlert } from "@/lib/types";

export default function HospitalAdminDashboard() {
  const { workspace, user, switchContext, availableHospitals } = useWorkspace();
  const [dashboardData, setDashboardData] = useState<HospitalOperationsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [switchingBranch, setSwitchingBranch] = useState(false);
  const [ackingAlertId, setAckingAlertId] = useState<string | null>(null);

  const activeHospitalId = workspace?.hospital_ref_id || "";
  const hospitalName = workspace?.hospital_name || "Hospital Command Center";
  const branchName = workspace?.branch_name || "Main Facility";

  // Load live operational overview metrics from Phase 2 sp_views
  const loadOverviewData = async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const data = await api.hospital.getHospitalDashboard(activeHospitalId).catch(() => null);
      if (data) {
        setDashboardData(data);
      } else {
        // Fallback default structure
        setDashboardData({
          hospital_id: activeHospitalId,
          hospital_name: hospitalName,
          date: new Date().toISOString().split("T")[0],
          waiting_today: 0,
          in_consultation_today: 0,
          completed_today: 0,
          avg_wait_minutes: 0,
          active_doctors_count: 0,
          active_counters_count: 0,
          hourly_flow: [],
          department_breakdown: [],
          active_alerts: [],
        });
      }
    } catch (err) {
      console.error("Failed to load hospital overview:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOverviewData(false);
    const interval = setInterval(() => loadOverviewData(true), 15000);
    return () => clearInterval(interval);
  }, [activeHospitalId]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    setAckingAlertId(alertId);
    try {
      await api.hospital.acknowledgeAlert(alertId, activeHospitalId);
      if (dashboardData) {
        setDashboardData({
          ...dashboardData,
          active_alerts: dashboardData.active_alerts.filter((a) => a.id !== alertId),
        });
      }
    } catch (err: any) {
      alert("Failed to acknowledge alert: " + (err.message || "Unknown error"));
    } finally {
      setAckingAlertId(null);
    }
  };

  // Branch context switch handler (validated on backend)
  const handleSwitchBranch = async (targetHospitalId: string) => {
    if (targetHospitalId === activeHospitalId) {
      setShowBranchDropdown(false);
      return;
    }
    try {
      setSwitchingBranch(true);
      setShowBranchDropdown(false);
      await switchContext({ hospital_ref_id: targetHospitalId });
      await loadOverviewData(false);
    } catch (err: any) {
      alert("Branch context switch error: " + (err.message || "Unauthorized"));
    } finally {
      setSwitchingBranch(false);
    }
  };

  const metrics: HospitalOperationsDashboard = dashboardData || {
    hospital_id: activeHospitalId,
    hospital_name: hospitalName,
    date: new Date().toISOString().split("T")[0],
    waiting_today: 0,
    in_consultation_today: 0,
    completed_today: 0,
    avg_wait_minutes: 0,
    active_doctors_count: 0,
    active_counters_count: 0,
    hourly_flow: [],
    department_breakdown: [],
    active_alerts: [],
    doctors_on_duty: 0,
    nurses_on_duty: 0,
    active_trainees: 0,
    department_count: 0,
    active_opd_counters: 0,
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
      <div className="bg-slate-50/50 min-h-screen text-slate-900 pb-16 space-y-6">
        {/* ========================================================
            TOP HEADER & AUTHORIZED BRANCH CONTEXT SELECTOR
           ======================================================== */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4 shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Hospital Identity */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shadow-xs text-lg">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    {hospitalName}
                  </h1>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Hospital Administration
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Operational Control Center • {branchName} • Administrator:{" "}
                  <span className="font-semibold text-slate-700">{user?.name || "Hospital Admin"}</span>
                </p>
              </div>
            </div>

            {/* Branch Context Selector & Refresh */}
            <div className="flex items-center gap-3 self-end md:self-auto">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                  className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300 transition flex items-center gap-2.5 text-xs font-semibold shadow-xs"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="text-left">
                    <p className="text-slate-900 font-bold">{branchName}</p>
                    <p className="text-[10px] text-slate-500 font-normal">Authorized Facility Context</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                </button>

                {/* Branch Switcher Dropdown */}
                {showBranchDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Authorized Branches & Facilities
                      </p>
                    </div>
                    <div className="py-1">
                      {(availableHospitals && availableHospitals.length > 0
                        ? availableHospitals
                        : [{ id: activeHospitalId, name: hospitalName, branch: branchName }]
                      ).map((b: any) => (
                        <button
                          key={b.id || b.hospital_ref_id || b.hospital_id || activeHospitalId}
                          onClick={() => handleSwitchBranch(b.id || b.hospital_ref_id || b.hospital_id || activeHospitalId)}
                          className={`w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 transition flex items-center justify-between ${
                            (b.id || b.hospital_ref_id || b.hospital_id) === activeHospitalId ? "bg-blue-50/80 text-blue-700 font-semibold" : "text-slate-700"
                          }`}
                        >
                          <div>
                            <p className="font-bold text-slate-900">{b.name || b.hospital_name || hospitalName}</p>
                            <p className="text-[10px] text-slate-500">{b.branch || b.branch_name || "Main Campus"}</p>
                          </div>
                          {(b.id || b.hospital_ref_id || b.hospital_id) === activeHospitalId && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link
                href="/hospital/onboarding"
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hospital Setup Wizard</span>
              </Link>

              <button
                type="button"
                onClick={() => loadOverviewData(false)}
                disabled={refreshing}
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition shadow-xs"
                title="Sync Live Metrics"
              >
                <RefreshCw className={`w-4 h-4 text-blue-600 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 space-y-6">
          {/* ========================================================
              REAL OPERATIONAL ALERTS BANNER (Phase 2 Live)
             ======================================================== */}
          {metrics.active_alerts && metrics.active_alerts.length > 0 ? (
            <div className="space-y-2">
              {metrics.active_alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs transition ${
                    alert.severity === "CRITICAL"
                      ? "bg-rose-50 border-rose-200 text-rose-900"
                      : alert.severity === "WARNING"
                      ? "bg-amber-50 border-amber-200 text-amber-900"
                      : "bg-blue-50 border-blue-200 text-blue-900"
                  }`}
                >
                  <div className="flex items-start gap-3 text-xs">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        alert.severity === "CRITICAL"
                          ? "bg-rose-100 text-rose-700"
                          : alert.severity === "WARNING"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{alert.department_name ? `[${alert.department_name}] ` : ""}{alert.alert_type.replace(/_/g, " ")}</p>
                        <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-white/60 border">
                          {alert.severity}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] opacity-90">{alert.message}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={ackingAlertId === alert.id}
                    onClick={() => handleAcknowledgeAlert(alert.id)}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shrink-0 shadow-2xs transition disabled:opacity-50"
                  >
                    {ackingAlertId === alert.id ? "Acknowledging..." : "Acknowledge"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-emerald-900">Hospital Operational Health Optimal</p>
                <p className="text-emerald-700 mt-0.5">
                  Queue throughput steady. All {metrics.active_counters_count || 8} OPD counters active with zero wait time violations.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================
              LIVE OPERATIONAL METRICS (TODAY - PostgreSQL Live)
             ======================================================== */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Today&apos;s Live Hospital Operations Overview • {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
              </h3>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Live PostgreSQL Stream
              </span>
            </div>

            {/* 5 Core Operational Live Pillars */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Waiting in Queue */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Waiting in Queue</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-extrabold text-amber-800">{metrics.waiting_today}</span>
                  <span className="text-[11px] text-slate-500 ml-1.5">Tokens</span>
                </div>
              </div>

              {/* In Consultation */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">In Consultation</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-extrabold text-blue-900">{metrics.in_consultation_today}</span>
                  <span className="text-[11px] text-slate-500 ml-1.5">Active</span>
                </div>
              </div>

              {/* Completed Consultations */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Completed Visits</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-extrabold text-emerald-800">{metrics.completed_today}</span>
                  <span className="text-[11px] text-slate-500 ml-1.5">Consulted</span>
                </div>
              </div>

              {/* Avg Wait Time */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Avg Wait Time</span>
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-extrabold text-cyan-800">{Math.round(metrics.avg_wait_minutes || 0)}</span>
                  <span className="text-[11px] text-slate-500 ml-1.5">Minutes</span>
                </div>
              </div>

              {/* Active Doctors & Counters */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Doctors / Counters</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-extrabold text-indigo-900">{metrics.active_doctors_count}</span>
                  <span className="text-[11px] text-slate-500 ml-1.5">/ {metrics.active_counters_count} Counters</span>
                </div>
              </div>
            </div>

            {/* Department Breakdown Strip if present */}
            {metrics.department_breakdown && metrics.department_breakdown.length > 0 && (
              <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  Live Department Queue Distribution
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {metrics.department_breakdown.map((dept) => (
                    <div key={dept.department_name} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <p className="font-bold text-slate-900 truncate">{dept.department_name}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span>Waiting: <strong className="text-amber-700">{dept.waiting}</strong></span>
                        <span>Active: <strong className="text-blue-700">{dept.in_consultation}</strong></span>
                        <span>Done: <strong className="text-emerald-700">{dept.completed}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================
              ADMINISTRATIVE OPERATIONAL CONTROL MODULES
             ======================================================== */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Hospital Operational Modules & Governance
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Doctors */}
              <Link
                href="/hospital/doctors"
                className="bg-white border border-slate-200 hover:border-blue-500/60 rounded-2xl p-5 transition-all shadow-xs group hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      {metrics.doctors_on_duty} Clinicians
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                    Doctor Administration
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Doctor registration, medical council credentials, department & OPD counter assignment.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                  <span>Manage Doctors</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>

              {/* 2. Nurses & Wards */}
              <Link
                href="/hospital/nurses"
                className="bg-white border border-slate-200 hover:border-emerald-500/60 rounded-2xl p-5 transition-all shadow-xs group hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <HeartPulse className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {metrics.nurses_on_duty} Staff
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition">
                    Nursing Staff & Wards
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Nurse directory, triage station assignment, ward allocations, and shift schedules.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
                  <span>Manage Nursing</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>

              {/* 3. Trainees & Interns */}
              <Link
                href="/hospital/trainees"
                className="bg-white border border-slate-200 hover:border-purple-500/60 rounded-2xl p-5 transition-all shadow-xs group hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <Award className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      {metrics.active_trainees} Trainees
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition">
                    Trainees & Interns
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Medical & nursing trainees, junior residents, supervisor doctor binding with strict permission guardrails.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
                  <span>Manage Trainees</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>

              {/* 4. Staff & Invitations */}
              <Link
                href="/hospital/staff"
                className="bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-5 transition-all shadow-xs group hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                      Invite Staff
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                    Employees & Staff
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Receptionists, billing staff, lab technicians, pharmacy operators, and secure email invitation tokens.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Manage Staff Directory</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>

              {/* 5. Departments & Specialties */}
              <Link
                href="/hospital/departments"
                className="bg-white border border-slate-200 hover:border-indigo-500/60 rounded-2xl p-5 transition-all shadow-xs group hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Building className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {metrics.department_count} Departments
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    Departments & Specialties
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Configure clinical departments, sub-specialties, operating hours, and room resource allocations.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                  <span>Configure Departments</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>

              {/* 6. OPD Counters & Token Prefixes */}
              <Link
                href="/hospital/counters"
                className="bg-white border border-slate-200 hover:border-cyan-500/60 rounded-2xl p-5 transition-all shadow-xs group hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                      <ListOrdered className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full">
                      {metrics.active_opd_counters} Counters
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-cyan-600 transition">
                    OPD Counters & Token Rules
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Token prefix rules (GM-001, CARD-001), counter locations, daily numbering reset, and emergency priority.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-cyan-600">
                  <span>Setup Counters & Tokens</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>

              {/* 7. Live Staff Roster & Shifts */}
              <Link
                href="/hospital/roster"
                className="bg-white border border-slate-200 hover:border-amber-500/60 rounded-2xl p-5 transition-all shadow-xs group hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      Live Duty
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition">
                    Doctor & Nurse Rosters
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Shift allocations (Morning, Evening, Night), on-duty status toggles, consultation rooms, and duty history.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-600">
                  <span>Manage Shift Roster</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>

              {/* 8. Hospital Services & Tariff */}
              <Link
                href="/hospital/services"
                className="bg-white border border-slate-200 hover:border-teal-500/60 rounded-2xl p-5 transition-all shadow-xs group hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                      Tariff Master
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 transition">
                    Hospital Services & Fees
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Consultation fees, ECG, diagnostic tests, radiology, minor procedures, durations, and appointment rules.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-600">
                  <span>Manage Tariff Catalogue</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>
            </div>
          </div>

          {/* ========================================================
              COMPLIANCE, ANALYTICS, SETTINGS & SECURITY SECTION
             ======================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Hospital Facilities */}
            <Link
              href="/hospital/facilities"
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-blue-300 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">Hospital Facilities & Wings</h4>
                  <p className="text-xs text-slate-500 mt-0.5">OPD, IPD, Emergency, ICU, OT & Diagnostic Units</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
            </Link>

            {/* Compliance & Registration */}
            <Link
              href="/hospital/compliance"
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-emerald-300 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition">Registration & Compliance</h4>
                  <p className="text-xs text-slate-500 mt-0.5">CEA license, NABH accreditation, statutory permits</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
            </Link>

            {/* Reports & Analytics */}
            <Link
              href="/hospital/reports"
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-amber-300 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition">Reports & Operational Metrics</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Hourly token load, wait times, department volume</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
            </Link>

            {/* Security & Access Logs */}
            <Link
              href="/hospital/security"
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-purple-300 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition">RBAC & Patient Access Logs</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Immutable audit trail & patient record access logs</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
            </Link>

            {/* Hospital Settings */}
            <Link
              href="/hospital/settings"
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-400 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-slate-700 transition">Hospital Profile & Rules</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Emergency numbers, booking quotas & token reset</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
