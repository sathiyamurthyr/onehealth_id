"use client";

import React, { useState, useEffect } from "react";
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
  Building2,
  Activity
} from "lucide-react";
import { api } from "@/lib/api";
import { QueueEntry, Doctor, Appointment, UserProfile } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/FeedbackStates";

export default function DoctorQueuePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("doc-k-01");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [callingToken, setCallingToken] = useState<string | null>(null);

  useEffect(() => {
    const cur = api.auth.getCurrentUser();
    setUser(cur);
    if (cur?.username === "dr.anitha") {
      setSelectedDoctorId("doc-k-02");
    } else {
      setSelectedDoctorId("doc-k-01");
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [q, a, d] = await Promise.all([
        api.queue.getLive(selectedDoctorId),
        api.appointments.list({ doctor_id: selectedDoctorId }),
        api.doctors.list("hosp-kedar"),
      ]);
      setQueue(q);
      setAppointments(a);
      setDoctors(d);
    } catch (err: any) {
      setError(err.message || "Failed to load doctor console");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [selectedDoctorId]);

  const handleCall = async (queueId: string) => {
    setCallingToken(queueId);
    try {
      await api.queue.call(queueId);
      await loadData();
    } catch (err: any) {
      alert("Failed to call token: " + (err.message || "Error"));
    } finally {
      setCallingToken(null);
    }
  };

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];
  const waitingEntries = queue.filter((q) => q.status === "WAITING" || q.status === "CALLING" || q.status === "ON_HOLD");
  const activeConsultation = queue.find((q) => q.status === "IN_CONSULTATION" || q.status === "CALLING");

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header with Doctor Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Stethoscope className="w-5 h-5 text-purple-600" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Doctor Consultation Console
              </h1>
              <Badge variant="primary" className="text-xs">
                Kedar Hospital Mugalivakkam
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Active Outpatient Roster: <strong>{selectedDoctor?.name || "Dr. Senthil Nathan"}</strong> ({selectedDoctor?.specialty || "General Medicine"})
            </p>
          </div>

          {/* Doctor Switcher Dropdown */}
          <div className="flex items-center gap-3">
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialty})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Consultation Hero Card if calling or in consult */}
        {activeConsultation && (
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-3xl p-6 shadow-lg shadow-purple-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-2">
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  <span>Now In Room: Token #{activeConsultation.token_number}</span>
                </div>
                <h2 className="text-xl font-bold">
                  {activeConsultation.patient_name}
                </h2>
                <p className="text-xs text-purple-100 font-mono mt-0.5">
                  OneHealth ID: {activeConsultation.onehealth_id || "OHID-PENDING"} • Phone: {activeConsultation.patient_phone || "N/A"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link href={`/doctor/consultation/${activeConsultation.patient_id}?appointment_id=${activeConsultation.appointment_id || ''}&queue_id=${activeConsultation.id}`}>
                  <Button variant="outline" size="md" className="bg-white text-purple-700 hover:bg-purple-50 border-white font-bold text-xs gap-1.5 min-h-[44px]">
                    <Stethoscope className="w-4 h-4" />
                    <span>Open Consultation Room</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading doctor consultation queue and scheduled patients..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Waiting Queue List (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Waiting Patients ({waitingEntries.length})
                  </h2>
                </div>
                <span className="text-xs text-slate-400">Auto-updating</span>
              </div>

              {waitingEntries.length === 0 ? (
                <EmptyState
                  title="No patients waiting"
                  description="No patients are currently checked-in in the queue for this doctor."
                />
              ) : (
                <div className="space-y-3">
                  {waitingEntries.map((entry) => (
                    <Card key={entry.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 font-black text-lg flex items-center justify-center shrink-0">
                          #{entry.token_number}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                              {entry.patient_name}
                            </h3>
                            <Badge variant={entry.status === "CALLING" ? "primary" : "warning"} className="text-[10px]">
                              {entry.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
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
                          size="md"
                          onClick={() => handleCall(entry.id)}
                          disabled={callingToken === entry.id}
                          className="flex-1 sm:flex-none text-xs gap-1.5 min-h-[44px]"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                          <span>{entry.status === "CALLING" ? "Recall" : "Call Next"}</span>
                        </Button>
                        <Link
                          href={`/doctor/consultation/${entry.patient_id}?appointment_id=${entry.appointment_id || ''}&queue_id=${entry.id}`}
                          className="flex-1 sm:flex-none"
                        >
                          <Button variant="primary" size="md" className="w-full text-xs gap-1.5 min-h-[44px]">
                            <Stethoscope className="w-3.5 h-3.5" />
                            <span>Consult</span>
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Today's Appointments Column (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-2 px-1">
                <CalendarCheck className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Today's Schedule ({appointments.length})
                </h2>
              </div>

              <div className="space-y-3">
                {appointments.map((a) => (
                  <Card key={a.id} className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {a.patient_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Slot: {a.slot}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {a.notes || "Regular Consultation"}
                        </div>
                      </div>
                      <Badge
                        variant={a.status === "checked_in" ? "success" : a.status === "completed" ? "outline" : "primary"}
                        className="text-[10px] capitalize"
                      >
                        {a.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
