"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Stethoscope,
  Users,
  Clock,
  PhoneCall,
  CheckCircle2,
  CalendarCheck,
  UserCheck,
  ChevronRight,
  ArrowRight,
  AlertCircle,
  Building,
  Activity,
  RefreshCw,
  PauseCircle,
  SkipForward,
  CheckCircle,
  ExternalLink,
  Layers,
  ChevronDown,
  Sparkles
} from "lucide-react";
import { api } from "@/lib/api";
import { QueueEntry, Appointment, UserProfile } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { Button } from "@/components/ui/Card";
import { LoadingState, EmptyState } from "@/components/ui/FeedbackStates";

export default function DoctorQueuePage() {
  const router = useRouter();
  const { workspace, user } = useWorkspace();

  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load authenticated doctor's personal queue & appointments (Strictly scoped to logged-in doctor)
  const loadDoctorQueue = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    setError("");
    try {
      const [docMe, q, appts] = await Promise.all([
        api.doctors.getMe().catch(() => null),
        api.doctors.getMyQueue().catch(() => []),
        api.doctors.getMyAppointments(false).catch(() => [])
      ]);

      if (docMe) {
        setDoctorProfile(docMe);
      }
      setQueue(q || []);
      setAppointments(appts || []);
    } catch (err: any) {
      console.error("Failed to load doctor queue:", err);
      if (!isSilent) setError(err.message || "Failed to load live consultation queue");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDoctorQueue(false);
    // Poll queue every 8 seconds for real-time OPD flow updates
    const interval = setInterval(() => {
      loadDoctorQueue(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [loadDoctorQueue, workspace?.hospital_ref_id]);

  // Queue actions (Call, Recall, Hold, Complete)
  const handleCall = async (queueId: string) => {
    setActionLoading(`call-${queueId}`);
    try {
      await api.queue.call(queueId);
      await loadDoctorQueue(true);
    } catch (err: any) {
      alert("Failed to call token: " + (err.message || "Error"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleHold = async (queueId: string) => {
    setActionLoading(`hold-${queueId}`);
    try {
      await api.queue.hold(queueId);
      await loadDoctorQueue(true);
    } catch (err: any) {
      alert("Failed to hold token: " + (err.message || "Error"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (queueId: string) => {
    if (!confirm("Are you sure you want to mark this consultation as completed?")) return;
    setActionLoading(`complete-${queueId}`);
    try {
      await api.queue.complete(queueId);
      await loadDoctorQueue(true);
    } catch (err: any) {
      alert("Failed to complete token: " + (err.message || "Error"));
    } finally {
      setActionLoading(null);
    }
  };

  // Filter queues by status
  const waitingEntries = queue.filter(
    (q) => q.status === "WAITING" || q.status === "CALLING" || q.status === "ON_HOLD"
  );
  const activeConsultation = queue.find(
    (q) => q.status === "IN_CONSULTATION" || q.status === "CALLING"
  );
  const completedEntries = queue.filter((q) => q.status === "COMPLETED");

  const doctorName = doctorProfile?.name || user?.name || "Doctor";
  const doctorSpecialty = doctorProfile?.specialty || "General Medicine";
  const doctorReg = doctorProfile?.registration_number || "";

  const currentHospitalName = workspace?.hospital_name || "Healthcare Facility";
  const currentBranchName = workspace?.branch_name || "Main Branch";

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["DOCTOR"]}>
      <div className="bg-white min-h-screen text-slate-900 pb-16">
        {/* ========================================================
            TOP HEADER: DOCTOR IDENTITY & FACILITY SCOPE
           ======================================================== */}
        <div className="border-b border-slate-200 bg-white sticky top-0 z-20 px-6 py-4 shadow-xs">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Doctor Info (Single Identity) */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-sm shrink-0">
                {doctorName.replace("Dr. ", "").substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                    {doctorName}
                  </h1>
                  <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Active Clinician
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-semibold text-blue-700">{doctorSpecialty}</span>
                  <span className="mx-1.5">•</span>
                  <span>Reg: {doctorReg}</span>
                </p>
              </div>
            </div>

            {/* Locked Active Hospital Facility Badge */}
            <div className="flex items-center gap-3 self-end md:self-auto">
              <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-left flex items-center gap-2.5 text-xs shadow-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div>
                  <p className="font-bold text-slate-900">{currentHospitalName}</p>
                  <p className="text-[10px] text-slate-500">{currentBranchName}</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDoctorQueue(false)}
                disabled={refreshing}
                className="gap-1.5 text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${refreshing ? "animate-spin" : ""}`} />
                <span>{refreshing ? "Syncing..." : "Refresh"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ========================================================
            MAIN BODY CONTENT
           ======================================================== */}
        <div className="max-w-6xl mx-auto px-6 pt-6 space-y-6">
          {/* Subtitle / Scope Notice */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Outpatient Consultation Queue
                </h2>
                <p className="text-xs text-slate-500">
                  Live patient queue scoped strictly to your outpatient roster at{" "}
                  <strong>{currentHospitalName}</strong> ({currentBranchName})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Roster Connected
              </span>
            </div>
          </div>

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Waiting Patients</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold text-slate-900">{waitingEntries.length}</span>
                <span className="text-xs text-slate-400 ml-1.5">In Line</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">In Room</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Stethoscope className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold text-blue-700">{activeConsultation ? 1 : 0}</span>
                <span className="text-xs text-slate-400 ml-1.5">Consulting</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Completed Today</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold text-emerald-700">{completedEntries.length}</span>
                <span className="text-xs text-slate-400 ml-1.5">Patients</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Scheduled</span>
                <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">
                  <CalendarCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold text-slate-900">{appointments.length}</span>
                <span className="text-xs text-slate-400 ml-1.5">Today</span>
              </div>
            </div>
          </div>

          {/* Active Consultation Hero Card (If calling or in consultation) */}
          {activeConsultation && (
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white rounded-2xl p-6 shadow-md shadow-blue-500/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-2.5">
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    <span>Now in Consultation Room • Token #{activeConsultation.token_number}</span>
                  </div>
                  <h3 className="text-2xl font-bold">{activeConsultation.patient_name}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-blue-100 font-mono mt-1">
                    <span>OH-ID: {activeConsultation.onehealth_id || "OHID-PENDING"}</span>
                    <span>•</span>
                    <span>Phone: {activeConsultation.patient_phone || "N/A"}</span>
                    {activeConsultation.patient_age && (
                      <>
                        <span>•</span>
                        <span>{activeConsultation.patient_age} yrs, {activeConsultation.patient_gender}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleHold(activeConsultation.id)}
                    disabled={actionLoading === `hold-${activeConsultation.id}`}
                    className="bg-white/10 hover:bg-white/20 border-white/30 text-white text-xs gap-1.5 min-h-[42px]"
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    <span>Hold</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleComplete(activeConsultation.id)}
                    disabled={actionLoading === `complete-${activeConsultation.id}`}
                    className="bg-white/10 hover:bg-white/20 border-white/30 text-white text-xs gap-1.5 min-h-[42px]"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mark Done</span>
                  </Button>

                  <Link
                    href={`/doctor/consultation/${activeConsultation.patient_id}?appointment_id=${activeConsultation.appointment_id || ''}&queue_id=${activeConsultation.id}`}
                  >
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs gap-1.5 shadow-sm min-h-[42px] px-4"
                    >
                      <Stethoscope className="w-4 h-4 text-blue-600" />
                      <span>Open Consultation Room</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Queue & Schedule Layout */}
          {loading ? (
            <LoadingState message="Loading your patient queue..." />
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center">
              <p className="font-bold text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDoctorQueue(false)}
                className="mt-3 bg-white"
              >
                Retry Loading
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Waiting Patients List (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Waiting Patients ({waitingEntries.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">Auto-refreshing every 8s</span>
                </div>

                {waitingEntries.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">Queue is Clear</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      No patients are currently waiting for consultation with {doctorName}. New check-ins from reception will appear here instantly.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {waitingEntries.map((entry) => {
                      const isCalling = entry.status === "CALLING";
                      return (
                        <div
                          key={entry.id}
                          className={`bg-white border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition shadow-xs ${
                            isCalling ? "border-blue-400 ring-2 ring-blue-100 bg-blue-50/20" : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 font-black text-lg flex items-center justify-center shrink-0">
                              #{entry.token_number}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-slate-900">
                                  {entry.patient_name}
                                </h4>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isCalling
                                      ? "bg-blue-100 text-blue-700 animate-pulse"
                                      : entry.status === "ON_HOLD"
                                      ? "bg-purple-100 text-purple-700"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {entry.status}
                                </span>
                                {entry.priority && entry.priority !== "NORMAL" && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                    {entry.priority}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">
                                {entry.onehealth_id || "OHID-PENDING"} • {entry.patient_phone || "No phone"}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Est. Wait: ~{entry.estimated_wait_minutes ?? 10} min
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCall(entry.id)}
                              disabled={actionLoading === `call-${entry.id}`}
                              className="flex-1 sm:flex-none text-xs gap-1.5 border-slate-300 bg-white hover:bg-slate-50 min-h-[40px]"
                            >
                              <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                              <span>{isCalling ? "Recall" : "Call Next"}</span>
                            </Button>

                            <Link
                              href={`/doctor/consultation/${entry.patient_id}?appointment_id=${entry.appointment_id || ''}&queue_id=${entry.id}`}
                              className="flex-1 sm:flex-none"
                            >
                              <Button
                                variant="primary"
                                size="sm"
                                className="w-full text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white min-h-[40px] font-semibold"
                              >
                                <Stethoscope className="w-3.5 h-3.5" />
                                <span>Consult</span>
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Today's Appointments Roster (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Today&apos;s Appointments ({appointments.length})
                    </h3>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs divide-y divide-slate-100 space-y-3">
                  {appointments.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">
                      No appointments scheduled for today.
                    </p>
                  ) : (
                    appointments.map((a) => {
                      const isCompleted = a.status === "completed";
                      const isCheckedIn = a.status === "checked_in";
                      return (
                        <div key={a.id} className="pt-3 first:pt-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-xs text-slate-900">{a.patient_name}</p>
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                Slot: {a.slot}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                {a.notes || "Regular Consultation"}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                                isCompleted
                                  ? "bg-slate-100 text-slate-600"
                                  : isCheckedIn
                                  ? "bg-emerald-100 text-emerald-800 font-semibold"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {a.status?.replace("_", " ") || "scheduled"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick Link to Appointments & Prescriptions */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                  <p className="font-bold text-slate-700">Quick Shortcuts</p>
                  <div className="flex flex-col gap-1.5">
                    <Link
                      href="/doctor/appointments"
                      className="text-blue-600 hover:text-blue-800 font-medium flex items-center justify-between py-1"
                    >
                      <span>View All Appointments Calendar</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href="/doctor/prescriptions/new"
                      className="text-blue-600 hover:text-blue-800 font-medium flex items-center justify-between py-1"
                    >
                      <span>Create New Prescription</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
