"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  UserCheck,
  PhoneCall,
  PlayCircle,
  CheckCircle2,
  PauseCircle,
  SkipForward,
  RotateCcw,
  Users,
  Stethoscope,
  Building2,
  AlertTriangle,
  RefreshCw,
  Volume2
} from "lucide-react";
import { api } from "@/lib/api";
import { QueueEntry, Doctor } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/FeedbackStates";

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastAnnounced, setLastAnnounced] = useState<string | null>(null);

  const loadQueue = async () => {
    try {
      const docParam = selectedDoctorId !== "ALL" ? selectedDoctorId : undefined;
      const data = await api.queue.getLive(docParam);
      setQueue(data);
    } catch (err: any) {
      setError(err.message || "Failed to load live OPD queue");
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    try {
      const docs = await api.doctors.list();
      setDoctors(docs);
    } catch (e) {
      // doctor list optional
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    setLoading(true);
    loadQueue();
    // Auto-refresh queue every 10 seconds for real-time board
    const timer = setInterval(() => {
      loadQueue();
    }, 10000);
    return () => clearInterval(timer);
  }, [selectedDoctorId]);

  const handleQueueAction = async (queueId: string, action: string, tokenNumber?: number) => {
    setActionLoading(queueId);
    try {
      const res = await api.queue.action(queueId, action);
      if (action === "CALL_NEXT" || action === "RECALL") {
        setLastAnnounced(`Token #${tokenNumber || "—"} called to consultation room.`);
        setTimeout(() => setLastAnnounced(null), 6000);
      }
      await loadQueue();
    } catch (err: any) {
      alert("Queue Action Failed: " + (err.message || "Error executing stored procedure"));
    } finally {
      setActionLoading(null);
    }
  };

  // Group queue by active consultation vs waiting list
  const activeConsultation = queue.find((q) => q.status === "IN_CONSULTATION" || q.status === "CALLED");
  const waitingPatients = queue.filter((q) => q.status === "WAITING" || q.status === "ON_HOLD");
  const completedPatients = queue.filter((q) => q.status === "COMPLETED" || q.status === "SKIPPED");

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white  p-5 sm:p-6 rounded-3xl border border-slate-200  shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 ">
                Live OPD Queue Orchestrator
              </h1>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <Badge variant="success" className="text-xs">
                Real-Time Synced
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Department consultation tokens, triage priority, and waiting time dispatcher
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50  border border-slate-200  rounded-xl text-xs font-semibold text-slate-700  min-h-[44px]"
            >
              <option value="ALL">All Consulting Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.name} ({d.specialty})
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="md"
              onClick={loadQueue}
              className="gap-2 text-xs font-semibold"
              title="Refresh queue status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Real-time Chime Announcement Banner */}
        {lastAnnounced && (
          <div className="p-4 rounded-2xl bg-blue-600 text-white flex items-center justify-between shadow-lg shadow-blue-500/20 animate-fadeIn">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 animate-bounce" />
              <span className="font-semibold text-xs sm:text-sm">{lastAnnounced}</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
              Kiosk Audio Alert
            </span>
          </div>
        )}

        {/* Content Area */}
        {loading && queue.length === 0 ? (
          <LoadingState message="Connecting to OPD live queue stream..." />
        ) : error ? (
          <ErrorState
            title="Queue Connection Failed"
            message={error}
            onRetry={loadQueue}
          />
        ) : queue.length === 0 ? (
          <EmptyState
            title="No Active Patients in OPD Queue"
            message="All scheduled outpatient appointments have either completed consultation or are not yet checked in."
          />
        ) : (
          <div className="space-y-6">
            {/* Active Consultation Spotlight Card */}
            {activeConsultation && (
              <div className="p-6 bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-3xl border border-blue-800 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Currently with Doctor in Room 102</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white">
                        #{activeConsultation.token_number}
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold">
                          {activeConsultation.patient_name}
                        </h2>
                        <p className="text-xs text-blue-200">
                          Dr. {activeConsultation.doctor_name} • {activeConsultation.department_name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions for current consultation */}
                  <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
                    {activeConsultation.status === "CALLED" && (
                      <Button
                        variant="primary"
                        size="md"
                        disabled={actionLoading === activeConsultation.id}
                        onClick={() => handleQueueAction(activeConsultation.id, "START_CONSULT")}
                        className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold gap-2 min-h-[44px]"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>Start Consultation</span>
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="md"
                      disabled={actionLoading === activeConsultation.id}
                      onClick={() => handleQueueAction(activeConsultation.id, "COMPLETE")}
                      className="bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold gap-2 min-h-[44px]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete & Discharge</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      disabled={actionLoading === activeConsultation.id}
                      onClick={() => handleQueueAction(activeConsultation.id, "HOLD")}
                      className="bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs gap-1.5 min-h-[44px]"
                    >
                      <PauseCircle className="w-4 h-4" />
                      <span>Hold</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      disabled={actionLoading === activeConsultation.id}
                      onClick={() => handleQueueAction(activeConsultation.id, "SKIP")}
                      className="bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs gap-1.5 min-h-[44px]"
                    >
                      <SkipForward className="w-4 h-4" />
                      <span>Skip</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Waiting Queue List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 ">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <CardTitle className="text-base">
                    Waiting OPD Patients ({waitingPatients.length})
                  </CardTitle>
                </div>
                <span className="text-xs text-slate-500">
                  Est. Wait: ~{waitingPatients.length * 12} mins
                </span>
              </CardHeader>
              <CardContent className="pt-4">
                {waitingPatients.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No patients currently waiting in this queue.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 ">
                    {waitingPatients.map((item, idx) => (
                      <div
                        key={item.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-50  text-amber-700  border border-amber-200  flex items-center justify-center font-mono font-black text-sm shrink-0">
                            #{item.token_number}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 ">
                                {item.patient_name}
                              </span>
                              <Badge
                                variant={
                                  item.priority === "EMERGENCY"
                                    ? "danger"
                                    : item.priority === "URGENT"
                                    ? "warning"
                                    : "outline"
                                }
                                className="text-[10px]"
                              >
                                {item.priority}
                              </Badge>
                              {item.status === "ON_HOLD" && (
                                <Badge variant="danger" className="text-[10px]">
                                  On Hold
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Dr. {item.doctor_name} • {item.department_name} • Position in line: #{idx + 1}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons (min 44px touch targets on mobile) */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="primary"
                            size="md"
                            disabled={actionLoading === item.id}
                            onClick={() => handleQueueAction(item.id, "CALL_NEXT", item.token_number)}
                            className="text-xs font-semibold gap-1.5 flex-1 sm:flex-none"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Call Next</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="md"
                            disabled={actionLoading === item.id}
                            onClick={() => handleQueueAction(item.id, "HOLD")}
                            className="text-xs flex-1 sm:flex-none"
                            title="Place token on hold"
                          >
                            Hold
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completed Consultations Log */}
            {completedPatients.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs uppercase text-slate-400 font-bold tracking-wider">
                    Completed or Discharged Today ({completedPatients.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {completedPatients.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50  rounded-xl border border-slate-100  flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-500">#{item.token_number}</span>
                          <span className="font-medium text-slate-700 ">{item.patient_name}</span>
                        </div>
                        <Badge
                          variant={item.status === "COMPLETED" ? "success" : "outline"}
                          className="text-[10px]"
                        >
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
