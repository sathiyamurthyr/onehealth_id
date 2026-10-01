"use client";

import React, { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { api } from "@/lib/api";
import { 
  Activity, Users, Calendar, ListOrdered, ShieldCheck, 
  Building2, Hospital, Stethoscope, HeartPulse, QrCode, 
  CheckCircle2, Clock, AlertCircle, FileText, ArrowRight
} from "lucide-react";
import Link from "next/link";

export function DynamicDashboard({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { workspace, user } = useWorkspace();
  const [widgetsData, setWidgetsData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWidgets() {
      try {
        setIsLoading(true);
        const res = await api.workspace.getDashboardWidgets(workspace?.hospital_ref_id);
        if (res.success) {
          setWidgetsData(res.data || {});
        }
      } catch (err: any) {
        console.error("Failed to load dashboard widgets:", err);
        setError(err?.message || "Failed to load dashboard metrics");
      } finally {
        setIsLoading(false);
      }
    }

    if (workspace) {
      fetchWidgets();
    }
  }, [workspace]);

  if (!workspace || !user) return null;

  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {workspace.role_name}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {workspace.hospital_name} {workspace.branch_name ? `• ${workspace.branch_name}` : ""}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
            {title || `Welcome, ${user.name || user.username}`}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {subtitle || `Role-controlled healthcare console configured for ${workspace.role_name}.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400">Authenticated Identity</p>
            <p className="text-sm font-semibold text-slate-800">{user.username}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-sm">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Widget Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* SYSTEM HEALTH WIDGET (SUPER_ADMIN) */}
          {widgetsData.system_health && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Health</span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  {widgetsData.system_health.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-1">Database Engine</p>
              <p className="text-sm font-semibold text-slate-900 mb-3">{widgetsData.system_health.db_engine}</p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex justify-between">
                <span>Tenant Isolation:</span>
                <span className="text-blue-600 font-medium">{widgetsData.system_health.tenant_isolation}</span>
              </div>
            </div>
          )}

          {/* ORGANIZATIONS & HOSPITALS SUMMARY (SUPER_ADMIN) */}
          {widgetsData.organizations_summary && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Platform Facilities</span>
                <Building2 className="w-4 h-4 text-purple-500" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {widgetsData.hospitals_summary?.total_hospitals || 2}
                </span>
                <span className="text-xs text-slate-500">Active Facilities</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">Group: {widgetsData.organizations_summary.primary_org}</p>
              <div className="text-xs text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
                Plan: {widgetsData.organizations_summary.subscription_plan}
              </div>
            </div>
          )}

          {/* PATIENT REGISTRY SUMMARY */}
          {widgetsData.patient_summary && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Registry</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {widgetsData.patient_summary.total_patients}
                </span>
                <span className="text-xs text-slate-500">Total Registered</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">Enrolled via National OneHealth ID</p>
              <Link
                href="/patients"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
              >
                Search Patient Registry <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* APPOINTMENT SCHEDULE SUMMARY */}
          {widgetsData.appointment_summary && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Appointments</span>
                <Calendar className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {widgetsData.appointment_summary.total_appointments}
                </span>
                <span className="text-xs text-slate-500">Consultations Scheduled</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>Checked In: <strong className="text-emerald-600">{widgetsData.appointment_summary.checked_in}</strong></span>
                <span>Upcoming: <strong className="text-slate-800">{widgetsData.appointment_summary.upcoming}</strong></span>
              </div>
            </div>
          )}

          {/* LIVE OPD QUEUE SUMMARY */}
          {widgetsData.queue_summary && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live OPD Queue</span>
                <ListOrdered className="w-4 h-4 text-amber-500" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-xs text-slate-500">Waiting</p>
                  <p className="text-xl font-bold text-amber-600">{widgetsData.queue_summary.waiting}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-xs text-slate-500">In Room</p>
                  <p className="text-xl font-bold text-blue-600">{widgetsData.queue_summary.in_consultation}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="text-xs text-slate-500">Done</p>
                  <p className="text-xl font-bold text-emerald-600">{widgetsData.queue_summary.completed}</p>
                </div>
              </div>
              <Link
                href="/queue"
                className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center justify-between transition pt-1"
              >
                <span>View Full Queue Board</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* DOCTOR SCHEDULE & ROOM (DOCTOR) */}
          {widgetsData.doctor_schedule && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consultation Room</span>
                <Stethoscope className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-slate-900 mb-0.5">{widgetsData.doctor_schedule.doctor_name}</p>
              <p className="text-xs text-slate-500 mb-3">{widgetsData.doctor_schedule.specialty} • {widgetsData.doctor_schedule.room_number}</p>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-700 mb-3">
                <span>Waiting in Queue:</span>
                <strong className="text-sm font-bold">{widgetsData.doctor_schedule.waiting_count} Patients</strong>
              </div>
              <Link
                href="/doctor/queue"
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium text-center flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <Stethoscope className="w-3.5 h-3.5" /> Call Next Patient
              </Link>
            </div>
          )}

          {/* NURSE TRIAGE WIDGET (NURSE) */}
          {widgetsData.waiting_triage && (
            <div className="bg-white border border-rose-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Triage & Vitals</span>
                <HeartPulse className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {widgetsData.waiting_triage.pending_vitals_count}
                </span>
                <span className="text-xs text-slate-500">Awaiting Triage Vitals</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">OPD Waiting Area Triage Desk</p>
              <Link
                href="/queue"
                className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-medium text-center flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <HeartPulse className="w-3.5 h-3.5" /> Record Patient Vitals
              </Link>
            </div>
          )}

          {/* PATIENT DIGITAL CARD (PATIENT) */}
          {widgetsData.my_onehealth_card && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Digital OneHealth Pass</span>
                <QrCode className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-lg font-bold text-slate-900 mb-1">{widgetsData.my_onehealth_card.name}</p>
              <p className="text-xs font-mono text-cyan-600 mb-3">{widgetsData.my_onehealth_card.onehealth_id}</p>
              <div className="p-3 bg-white rounded-xl border border-blue-200 text-xs text-slate-600 space-y-1 mb-3">
                <div className="flex justify-between">
                  <span>Blood Group:</span>
                  <strong className="text-slate-900">{widgetsData.my_onehealth_card.blood_group}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Emergency:</span>
                  <span className="text-slate-500">{widgetsData.my_onehealth_card.emergency_contact}</span>
                </div>
              </div>
            </div>
          )}

          {/* PATIENT UPCOMING APPOINTMENTS (PATIENT) */}
          {widgetsData.my_upcoming_appointments && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">My Appointments</span>
                <Calendar className="w-4 h-4 text-cyan-500" />
              </div>
              {widgetsData.my_upcoming_appointments.appointments.map((apt: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <p className="font-semibold text-slate-900">{apt.doctor_name}</p>
                  <p className="text-slate-500">{apt.department} • {apt.slot}</p>
                  <div className="flex justify-between items-center pt-1 text-[10px]">
                    <span className="text-cyan-600 font-semibold">{apt.status}</span>
                    <span className="text-slate-400">{apt.room}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
