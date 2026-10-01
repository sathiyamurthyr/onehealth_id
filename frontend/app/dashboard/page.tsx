"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CalendarCheck,
  ListOrdered,
  UserCheck,
  Building2,
  Clock,
  ArrowUpRight,
  PlusCircle,
  Activity,
  CheckCircle2,
  Stethoscope,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { api } from "@/lib/api";
import { DashboardSummary, DashboardMetrics, Appointment, QueueEntry, UserProfile } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import { LoadingState, ErrorState } from "@/components/ui/FeedbackStates";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { workspace, isLoading: wsLoading } = useWorkspace();
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!wsLoading && workspace?.default_route && workspace.default_route !== "/dashboard") {
      router.replace(workspace.default_route);
    }
  }, [workspace, wsLoading, router]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const [sum, m, a, q] = await Promise.all([
        api.dashboard.getSummary("hosp-kedar"),
        api.dashboard.getMetrics(),
        api.appointments.list(),
        api.queue.getLive(),
      ]);
      setSummary(sum);
      setMetrics(m);
      setAppointments(a.slice(0, 5));
      setQueue(q.slice(0, 5));
      setUser(api.auth.getCurrentUser());
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Hospital Facility Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white  p-5 sm:p-6 rounded-3xl border border-slate-200  shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 ">
                  {summary?.hospital_name || user?.hospital_name || "Kedar Hospital"}
                </h1>
              </div>
              <Badge variant="primary" className="text-xs">
                {summary?.branch_area || "Mugalivakkam"}, Chennai
              </Badge>
              {user && (
                <Badge variant="outline" className="text-xs font-semibold">
                  Role: {user.role}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              {summary?.branch_name || "Kedar Hospital - Mugalivakkam Main"} • OneHealth ID Pilot Operating System
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link href="/patients/register">
              <Button variant="primary" size="md" className="gap-2 text-xs font-semibold w-full sm:w-auto min-h-[44px]">
                <PlusCircle className="w-4 h-4" />
                <span>Register Patient</span>
              </Button>
            </Link>
            <Link href="/queue">
              <Button variant="outline" size="md" className="gap-2 text-xs font-semibold w-full sm:w-auto min-h-[44px]">
                <ListOrdered className="w-4 h-4 text-amber-500" />
                <span>Live Queue</span>
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading Kedar Hospital operations from PostgreSQL views..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadDashboardData} />
        ) : (
          <>
            {/* Today's Overview Grid (Section 10 Requirement) */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 ">
                  Today's Overview
                </h2>
                <span className="text-xs text-slate-400 font-medium">Live Telemetry</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {/* 1. Total Patients */}
                <Card className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Patients</span>
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600  ">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900 ">
                      {summary?.total_patients ?? metrics?.total_patients ?? 0}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">Total Registry</div>
                  </div>
                </Card>

                {/* 2. Appointments */}
                <Card className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Appointments</span>
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600  ">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900 ">
                      {summary?.total_appointments ?? metrics?.active_appointments ?? 0}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">Scheduled Today</div>
                  </div>
                </Card>

                {/* 3. Checked-in */}
                <Card className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Checked-in</span>
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600  ">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-emerald-600 ">
                      {summary?.checked_in_count ?? 0}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">Arrival Verified</div>
                  </div>
                </Card>

                {/* 4. Waiting */}
                <Card className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Waiting</span>
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600  ">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-amber-600 ">
                      {summary?.waiting_count ?? metrics?.active_queue_count ?? 0}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">In OPD Queue</div>
                  </div>
                </Card>

                {/* 5. In Consultation */}
                <Card className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">In Consultation</span>
                    <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600  ">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-purple-600 ">
                      {summary?.in_consultation_count ?? 0}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">With Doctor</div>
                  </div>
                </Card>

                {/* 6. Completed */}
                <Card className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed</span>
                    <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600  ">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-teal-600 ">
                      {summary?.completed_count ?? 0}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">Discharged OPD</div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Split Section: Real-time Queue & Appointments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Live Queue Board Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    <ListOrdered className="w-4 h-4 text-amber-500" />
                    <span>Live OPD Queue Board</span>
                  </CardTitle>
                  <Link href="/queue" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    Manage Queue <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  {queue.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">No patients waiting in queue</div>
                  ) : (
                    queue.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50  border border-slate-100 "
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white font-black text-sm flex items-center justify-center">
                            #{q.token_number}
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-slate-900 ">
                              {q.patient_name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {q.doctor_name} • {q.doctor_specialty}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge
                            variant={q.status === "CALLING" ? "primary" : q.status === "WAITING" ? "warning" : "success"}
                            className="text-[10px] font-bold"
                          >
                            {q.status}
                          </Badge>
                          <div className="text-[10px] text-slate-400 mt-1">
                            ~{q.estimated_wait_minutes ?? 10} min wait
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Today's Appointments Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    <CalendarCheck className="w-4 h-4 text-indigo-500" />
                    <span>Today's Outpatient Schedule</span>
                  </CardTitle>
                  <Link href="/appointments" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    All Appointments <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  {appointments.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">No appointments scheduled</div>
                  ) : (
                    appointments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50  border border-slate-100 "
                      >
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900 ">
                            {a.patient_name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {a.doctor_name} • {a.slot}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={a.status === "checked_in" ? "success" : a.status === "completed" ? "outline" : "primary"}
                            className="text-[10px] capitalize font-bold"
                          >
                            {a.status.replace("_", " ")}
                          </Badge>
                          <Link href={`/appointments`}>
                            <ChevronRight className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
