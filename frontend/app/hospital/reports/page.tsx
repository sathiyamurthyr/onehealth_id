"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  ArrowLeft,
  TrendingUp,
  Clock,
  Building,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Layers,
  Activity,
  ChevronRight,
  Stethoscope,
  PieChart,
  FileSpreadsheet,
  FileText,
  UserCheck,
  Award,
  Filter
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  PatientFlowReport,
  AppointmentAnalyticsReport,
  DepartmentQueueReport,
  DoctorProductivityReport
} from "@/lib/types";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";

export default function ReportsPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("oh_workspace") || "{}").hospital_ref_id : "") || "";
  const [activeReportTab, setActiveReportTab] = useState<"PATIENT_FLOW" | "APPOINTMENTS" | "DEPARTMENT_QUEUES" | "DOCTOR_PRODUCTIVITY">("PATIENT_FLOW");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const [patientFlowReport, setPatientFlowReport] = useState<PatientFlowReport | null>(null);
  const [appointmentReport, setAppointmentReport] = useState<AppointmentAnalyticsReport | null>(null);
  const [departmentReport, setDepartmentReport] = useState<DepartmentQueueReport | null>(null);
  const [productivityReport, setProductivityReport] = useState<DoctorProductivityReport | null>(null);

  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = { hospital_id: activeHospitalId, date_from: dateFrom, date_to: dateTo };
      const [pFlow, appt, dept, prod] = await Promise.all([
        api.hospital.getPatientFlowReport(params).catch(() => null),
        api.hospital.getAppointmentAnalyticsReport(params).catch(() => null),
        api.hospital.getDepartmentQueueReport(params).catch(() => null),
        api.hospital.getDoctorProductivityReport(params).catch(() => null),
      ]);
      setPatientFlowReport(pFlow);
      setAppointmentReport(appt);
      setDepartmentReport(dept);
      setProductivityReport(prod);
    } catch (err: any) {
      console.error("Failed to load operational reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [dateFrom, dateTo, activeHospitalId]);

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/hospital"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hospital Operations
          </Link>
          <button
            onClick={loadReports}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span>Refresh Reports</span>
          </button>
        </div>

        {/* Header with Stats */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-indigo-400/20">
                <BarChart3 className="w-3.5 h-3.5" /> Phase 2 Operational Intelligence & Reporting
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Hospital Reports & Operational Analytics</h1>
              <p className="text-indigo-100/80 text-sm max-w-xl">
                Real-time patient flow velocity, appointment conversion funnels, department queue volume, and doctor productivity.
              </p>
            </div>

            {/* Date Range Selector */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Date Range Filter
              </p>
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-900/60 border border-indigo-300/30 rounded-lg text-white font-mono"
                />
                <span className="text-indigo-200">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-900/60 border border-indigo-300/30 rounded-lg text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Report Sub-Tabs */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
          {[
            { key: "PATIENT_FLOW", label: "Patient Flow & Hourly Distribution", icon: <TrendingUp className="w-4 h-4" /> },
            { key: "APPOINTMENTS", label: "Appointment Analytics & Conversion", icon: <Calendar className="w-4 h-4" /> },
            { key: "DEPARTMENT_QUEUES", label: "Department Queue & Wait Times", icon: <Building className="w-4 h-4" /> },
            { key: "DOCTOR_PRODUCTIVITY", label: "Doctor Productivity & Workload", icon: <Stethoscope className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveReportTab(tab.key as any)}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeReportTab === tab.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: PATIENT FLOW REPORT */}
        {activeReportTab === "PATIENT_FLOW" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Registrations</div>
                <div className="text-3xl font-black text-slate-900 mt-1">{patientFlowReport?.total_registrations || 0}</div>
                <div className="text-[11px] text-indigo-600 font-medium mt-1">Arrivals & Check-ins</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Consultations</div>
                <div className="text-3xl font-black text-emerald-800 mt-1">{patientFlowReport?.total_consultations || 0}</div>
                <div className="text-[11px] text-emerald-600 font-medium mt-1">Completed Clinical Encounters</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Waiting Time</div>
                <div className="text-3xl font-black text-cyan-800 mt-1">{Math.round(patientFlowReport?.avg_wait_time_minutes || 0)}m</div>
                <div className="text-[11px] text-cyan-600 font-medium mt-1">Registration to Doctor Calling</div>
              </div>
            </div>

            {/* Hourly Distribution Chart */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Hourly Patient Flow Distribution</h3>
                    <p className="text-[11px] text-slate-500">Registrations vs consultations started across operating hours</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {patientFlowReport?.hourly_distribution && patientFlowReport.hourly_distribution.length > 0 ? (
                  patientFlowReport.hourly_distribution.map((h) => {
                    const maxVal = Math.max(...patientFlowReport.hourly_distribution.map((i) => Math.max(i.registrations, i.consultations_started, 1)));
                    const regPct = Math.round((h.registrations / maxVal) * 100);
                    const consultPct = Math.round((h.consultations_started / maxVal) * 100);
                    return (
                      <div key={h.hour} className="space-y-1 text-xs">
                        <div className="flex items-center justify-between font-mono font-bold text-slate-700">
                          <span>{h.hour}</span>
                          <span className="text-[11px] text-slate-500">{h.registrations} reg / {h.consultations_started} consulted</span>
                        </div>
                        <div className="flex gap-2 h-3.5">
                          <div className="flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${regPct}%` }} title={`Registrations: ${h.registrations}`} />
                          </div>
                          <div className="flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${consultPct}%` }} title={`Consultations: ${h.consultations_started}`} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No flow events recorded for this date window.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: APPOINTMENTS REPORT */}
        {activeReportTab === "APPOINTMENTS" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Booked</div>
                <div className="text-3xl font-black text-slate-900 mt-1">{appointmentReport?.total_booked || 0}</div>
                <div className="text-[11px] text-slate-500 mt-1">Scheduled appointments</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Checked In</div>
                <div className="text-3xl font-black text-indigo-800 mt-1">{appointmentReport?.total_checked_in || 0}</div>
                <div className="text-[11px] text-indigo-600 mt-1">Arrivals confirmed</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Conversion Rate</div>
                <div className="text-3xl font-black text-emerald-800 mt-1">
                  {Math.round(appointmentReport?.conversion_rate_percentage || 0)}%
                </div>
                <div className="text-[11px] text-emerald-600 mt-1">Bookings to consultation</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">No-Show Rate</div>
                <div className="text-3xl font-black text-amber-800 mt-1">
                  {Math.round(appointmentReport?.no_show_rate_percentage || 0)}%
                </div>
                <div className="text-[11px] text-amber-600 mt-1">{appointmentReport?.total_no_shows || 0} patients missed</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DEPARTMENT QUEUES REPORT */}
        {activeReportTab === "DEPARTMENT_QUEUES" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Department Queue Performance & Wait Times</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Tokens Issued</th>
                    <th className="py-3 px-4">Patients Served</th>
                    <th className="py-3 px-4">Avg Wait Time</th>
                    <th className="py-3 px-4">Max Wait Time</th>
                    <th className="py-3 px-4">Avg Service Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {departmentReport?.departments && departmentReport.departments.length > 0 ? (
                    departmentReport.departments.map((dept) => (
                      <tr key={dept.department_name} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{dept.department_name}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">{dept.total_tokens_issued}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">{dept.total_served}</td>
                        <td className="py-3.5 px-4">{Math.round(dept.avg_wait_time_minutes || 0)} mins</td>
                        <td className="py-3.5 px-4 text-amber-700 font-semibold">{Math.round(dept.max_wait_time_minutes || 0)} mins</td>
                        <td className="py-3.5 px-4">{Math.round(dept.avg_service_time_minutes || 0)} mins</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No department queue records for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: DOCTOR PRODUCTIVITY REPORT */}
        {activeReportTab === "DOCTOR_PRODUCTIVITY" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Doctor Consultation Volume & Prescriptions Generated</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Doctor Name</th>
                    <th className="py-3 px-4">Specialty</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Patients Seen</th>
                    <th className="py-3 px-4">Avg Consult Time</th>
                    <th className="py-3 px-4">Prescriptions</th>
                    <th className="py-3 px-4">Lab Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {productivityReport?.doctors && productivityReport.doctors.length > 0 ? (
                    productivityReport.doctors.map((doc) => (
                      <tr key={doc.doctor_id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-bold text-slate-900">Dr. {doc.doctor_name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{doc.specialty}</td>
                        <td className="py-3.5 px-4 text-slate-600">{doc.department_name}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">{doc.patients_seen}</td>
                        <td className="py-3.5 px-4">{Math.round(doc.avg_consultation_time_minutes || 0)} mins</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">{doc.prescriptions_generated}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-700">{doc.lab_orders_generated}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No doctor productivity records for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
