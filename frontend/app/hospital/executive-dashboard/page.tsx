"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Activity,
  Users,
  Bed,
  Clock,
  Download,
  Building,
  RefreshCw,
  Sparkles,
  Calendar,
  AlertCircle,
  Stethoscope,
  FlaskConical,
  Scan,
  Pill,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
  PieChart,
  BarChart3,
  IndianRupee,
  ArrowLeft
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { phase5Api } from "@/lib/api/phase5";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import {
  HospitalFinancialAnalytics,
  HospitalOperationalKPIs,
  DepartmentPerformanceSummary
} from "@/lib/types";

export default function HospitalExecutiveDashboardPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("oh_workspace") || "{}").hospital_ref_id : "") || "";
  const hospitalName = workspace?.hospital_name || "Hospital";

  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState<HospitalFinancialAnalytics | null>(null);
  const [kpis, setKpis] = useState<HospitalOperationalKPIs | null>(null);
  const [deptSummary, setDeptSummary] = useState<DepartmentPerformanceSummary[]>([]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [finRes, kpiRes, deptRes] = await Promise.all([
        phase5Api.getFinancialAnalytics(activeHospitalId).catch(() => null),
        phase5Api.getOperationalKPIs(activeHospitalId).catch(() => null),
        phase5Api.getDepartmentPerformance(activeHospitalId).catch(() => [])
      ]);
      setFinancials(finRes);
      setKpis(kpiRes);
      setDeptSummary(deptRes || []);
    } catch (err: any) {
      console.error("Failed to load executive analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [activeHospitalId]);

  const handleExportSummary = () => {
    const dataStr = JSON.stringify(
      {
        hospital_id: activeHospitalId,
        hospital_name: hospitalName,
        exported_at: new Date().toISOString(),
        financials,
        kpis,
        department_performance: deptSummary
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OHID_Executive_Report_${activeHospitalId}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12 bg-white text-slate-900">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/hospital"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hospital Operations
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSummary}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export Audit JSON
            </button>
            <button
              onClick={loadAnalytics}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : "text-slate-600"}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Header Banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Operational Intelligence & Revenue Realization
                </span>
                <span className="text-xs text-slate-400 font-medium">{hospitalName}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                <Activity className="w-8 h-8 text-emerald-600" />
                Executive Operations & Analytics
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Real-time institutional telemetry of patient flow, bed occupancy rates, clinical diagnostic volumes, and multi-department revenue.
              </p>
            </div>
          </div>
        </div>

        {/* TOP LEVEL METRICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue Realization */}
          <div className="bg-white border border-emerald-200/80 rounded-2xl p-5 shadow-xs relative overflow-hidden hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Total Collections</span>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-3">
              ₹{financials ? Number(financials.total_collected).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
              <span>Gross: ₹{financials ? Number(financials.total_gross_billed).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "0"}</span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {financials ? Number(financials.collection_rate_percentage).toFixed(1) : "0.0"}% Realized
              </span>
            </div>
          </div>

          {/* Bed Occupancy */}
          <div className="bg-white border border-blue-200/80 rounded-2xl p-5 shadow-xs relative overflow-hidden hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">IPD Bed Occupancy</span>
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                <Bed className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-3">
              {kpis ? Number(kpis.bed_occupancy_percentage).toFixed(1) : "0.0"}%
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
              <span>{kpis?.active_ipd_occupancy || 0} Inpatients</span>
              <span className="font-semibold text-slate-700">{kpis?.operational_beds || 150} Total Beds</span>
            </div>
          </div>

          {/* Clinical Patient Volume */}
          <div className="bg-white border border-purple-200/80 rounded-2xl p-5 shadow-xs relative overflow-hidden hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Patient Care Volume</span>
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-3">
              {(kpis?.opd_consultation_volume || 0) + (kpis?.ipd_admission_volume || 0) + (kpis?.emergency_volume || 0)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
              <span>OPD: {kpis?.opd_consultation_volume || 0}</span>
              <span className="font-semibold text-slate-700">Emergency: {kpis?.emergency_volume || 0}</span>
            </div>
          </div>

          {/* Average Waiting Time */}
          <div className="bg-white border border-amber-200/80 rounded-2xl p-5 shadow-xs relative overflow-hidden hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Avg OPD Wait Time</span>
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-3">
              {kpis ? Number(kpis.average_waiting_time_minutes).toFixed(0) : "15"} mins
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
              <span>Pending Lab: {kpis?.pending_lab_investigations || 0}</span>
              <span className="font-semibold text-slate-700">Radiology: {kpis?.pending_radiology_studies || 0}</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: REVENUE AND CLINICAL METRICS PANELS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Breakdown */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Institutional Revenue Realization
              </h3>
              <span className="text-xs text-slate-500 font-mono font-semibold">Currency: INR (₹)</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200">
                <span className="text-slate-600 font-medium">Gross Billed Charges:</span>
                <span className="text-slate-900 font-bold">
                  ₹{financials ? Number(financials.total_gross_billed).toFixed(2) : "0.00"}
                </span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200">
                <span className="text-slate-600 font-medium">Authorized Discounts & Exemptions:</span>
                <span className="text-amber-700 font-bold">
                  -₹{financials ? Number(financials.total_discounts).toFixed(2) : "0.00"}
                </span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                <span className="text-emerald-900 font-semibold">Net Billed Invoice Volume:</span>
                <span className="text-emerald-700 font-black">
                  ₹{financials ? Number(financials.total_net_billed).toFixed(2) : "0.00"}
                </span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-rose-50/60 rounded-2xl border border-rose-200">
                <span className="text-rose-900 font-semibold">Outstanding Patient/Payer Receivables:</span>
                <span className="text-rose-700 font-black">
                  ₹{financials ? Number(financials.total_outstanding).toFixed(2) : "0.00"}
                </span>
              </div>
            </div>
          </div>

          {/* Operational Workflow Diagnostics */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Hospital Workflow & Operational Queues
              </h3>
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Live Telemetry</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <Stethoscope className="w-4 h-4 text-emerald-600" />
                  <span>OPD Consultations</span>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">{kpis?.opd_consultation_volume || 0}</div>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <FlaskConical className="w-4 h-4 text-purple-600" />
                  <span>Pending Lab Tests</span>
                </div>
                <div className="text-2xl font-black text-purple-700 mt-1">{kpis?.pending_lab_investigations || 0}</div>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <Scan className="w-4 h-4 text-blue-600" />
                  <span>Pending Radiology</span>
                </div>
                <div className="text-2xl font-black text-blue-700 mt-1">{kpis?.pending_radiology_studies || 0}</div>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Claims in Adjudication</span>
                </div>
                <div className="text-2xl font-black text-amber-700 mt-1">{kpis?.pending_claims_adjudication || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: DEPARTMENT PERFORMANCE MATRIX */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Department Performance & Workload Matrix
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Activity breakdown across consultations, procedures, diagnostic investigations, and dispensary realization.
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5 text-center">Appointments</th>
                    <th className="p-3.5 text-center">Consultations</th>
                    <th className="p-3.5 text-center">Procedures</th>
                    <th className="p-3.5 text-center">Lab Orders</th>
                    <th className="p-3.5 text-center">Radiology</th>
                    <th className="p-3.5 text-center">Prescriptions</th>
                    <th className="p-3.5 text-right">Department Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deptSummary.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No department performance data available for this cycle.
                      </td>
                    </tr>
                  ) : (
                    deptSummary.map((d, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{d.department_name}</td>
                        <td className="p-3.5 text-center text-slate-600">{d.appointment_count}</td>
                        <td className="p-3.5 text-center text-emerald-700 font-bold">{d.consultation_count}</td>
                        <td className="p-3.5 text-center text-slate-600">{d.procedure_count}</td>
                        <td className="p-3.5 text-center text-purple-700 font-semibold">{d.lab_order_count}</td>
                        <td className="p-3.5 text-center text-blue-700 font-semibold">{d.radiology_order_count}</td>
                        <td className="p-3.5 text-center text-amber-700 font-semibold">{d.prescriptions_dispensed}</td>
                        <td className="p-3.5 text-right font-black text-emerald-700">
                          ₹{Number(d.department_revenue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
