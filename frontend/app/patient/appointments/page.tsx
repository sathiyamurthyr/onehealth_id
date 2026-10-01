"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, User, Stethoscope, CheckCircle2, XCircle, AlertCircle, ArrowLeft, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  SCHEDULED:  { label: "Scheduled",    color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200",   icon: Clock },
  CHECKED_IN: { label: "Checked In",   color: "text-cyan-700",   bg: "bg-cyan-50",   border: "border-cyan-200",   icon: CheckCircle2 },
  COMPLETED:  { label: "Completed",    color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200", icon: CheckCircle2 },
  CANCELLED:  { label: "Cancelled",    color: "text-rose-700",   bg: "bg-rose-50",   border: "border-rose-200",   icon: XCircle },
  NO_SHOW:    { label: "No Show",      color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  icon: AlertCircle },
};

export default function PatientAppointmentsPage() {
  const { workspace, user } = useWorkspace();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "UPCOMING" | "COMPLETED">("ALL");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.appointments.list();
        setAppointments(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err?.message || "Failed to load appointments");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = appointments.filter((a) => {
    if (filter === "UPCOMING") return ["SCHEDULED", "CHECKED_IN"].includes(a.status);
    if (filter === "COMPLETED") return a.status === "COMPLETED";
    return true;
  });

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back */}
        <Link href="/patient" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition">
          <ArrowLeft className="w-4 h-4" /> Back to Health Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
            <p className="text-sm text-slate-500 mt-1">Your clinical visit history and upcoming scheduled consultations at Kedar Hospital.</p>
          </div>
          <Link
            href="/appointments"
            className="flex items-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition shrink-0"
          >
            <Plus className="w-4 h-4" /> Book New
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
          {(["ALL", "UPCOMING", "COMPLETED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f === "ALL" ? `All (${appointments.length})` : f === "UPCOMING" ? "Upcoming" : "Past Visits"}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No appointments found</p>
            <p className="text-slate-400 text-xs mt-1">Book a new consultation with your doctor.</p>
            <Link href="/appointments" className="inline-flex items-center gap-2 mt-4 py-2 px-4 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
              <Plus className="w-4 h-4" /> Book Appointment
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((appt, i) => {
              const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.SCHEDULED;
              const Icon = cfg.icon;
              return (
                <div key={i} className={`bg-white border ${cfg.border} rounded-2xl p-5 shadow-sm`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border} flex items-center gap-1`}>
                          <Icon className="w-3 h-3" /> {cfg.label}
                        </span>
                        {appt.department && (
                          <span className="text-[11px] text-slate-500 font-medium">{appt.department}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Stethoscope className="w-4 h-4 text-blue-500 shrink-0" />
                        {appt.doctor_name || "Doctor TBA"}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {appt.scheduled_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(appt.scheduled_time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        )}
                        {appt.room_number && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            Room {appt.room_number}
                          </span>
                        )}
                        {appt.token_number && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            Token #{appt.token_number}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400 shrink-0">
                      {appt.appointment_type && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-medium text-[11px]">
                          {appt.appointment_type}
                        </span>
                      )}
                    </div>
                  </div>
                  {appt.chief_complaint && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                      <span className="font-medium text-slate-700">Reason: </span>
                      {appt.chief_complaint}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
