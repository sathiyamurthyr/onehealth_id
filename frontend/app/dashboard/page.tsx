"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CalendarCheck,
  ListOrdered,
  UserCheck,
  BedDouble,
  TestTube,
  DollarSign,
  ArrowUpRight,
  PlusCircle,
  Activity,
  Clock,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { api } from "@/lib/api";
import { DashboardMetrics, Appointment, QueueEntry, UserProfile } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import { LoadingState, ErrorState } from "@/components/ui/FeedbackStates";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const [m, a, q] = await Promise.all([
        api.dashboard.metrics(),
        api.appointments.list(),
        api.queue.getLive(),
      ]);
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
        {/* Top Welcome Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Welcome, {user?.name || "Dr. Administrator"}
              </h1>
              <Badge variant="primary" className="text-xs">
                {user?.role || "Admin"}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Live hospital operations & clinical metrics • Apollo Central Hospital (TN-01)
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/patients/register">
              <Button variant="primary" size="md" className="gap-2 text-xs font-semibold w-full sm:w-auto">
                <PlusCircle className="w-4 h-4" />
                <span>New Patient Registration</span>
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Connecting to hospital views & real-time telemetry..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadDashboardData} />
        ) : (
          <>
            {/* KPI Metric Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Total Patients */}
              <Card className="p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patients</span>
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {metrics?.total_patients ?? 0}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>Active OneHealth Network</span>
                  </div>
                </div>
              </Card>

              {/* Card 2: Live Queue Waiting */}
              <Card className="p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">OPD Queue</span>
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                    <ListOrdered className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {metrics?.active_queue_count ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-1">
                    Tokens waiting currently
                  </div>
                </div>
              </Card>

              {/* Card 3: Active Appointments */}
              <Card className="p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Appointments</span>
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {metrics?.active_appointments ?? 0}
                  </div>
                  <div className="text-[11px] text-indigo-500 font-medium mt-1">
                    Scheduled for today
                  </div>
                </div>
              </Card>

              {/* Card 4: Revenue & Billing */}
              <Card className="p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue Collected</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    ₹{Number(metrics?.total_revenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-1 truncate">
                    ₹{Number(metrics?.outstanding_balance || 0).toLocaleString("en-IN")} pending
                  </div>
                </div>
              </Card>
            </div>

            {/* Inpatient & Diagnostics Quick Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{metrics?.available_doctors ?? 5}</div>
                  <div className="text-[10px] text-slate-400">Doctors On Duty</div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                  <BedDouble className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{metrics?.available_beds ?? 4}</div>
                  <div className="text-[10px] text-slate-400">Available Beds</div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{metrics?.admitted_ipd_patients ?? 1}</div>
                  <div className="text-[10px] text-slate-400">IPD Admitted</div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600">
                  <TestTube className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{metrics?.pending_labs ?? 1}</div>
                  <div className="text-[10px] text-slate-400">Pending Lab Tests</div>
                </div>
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
                        className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white font-black text-sm flex items-center justify-center">
                            #{q.token_number}
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {q.patient_name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {q.doctor_name} • {q.doctor_specialty}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge
                            variant={q.status === "WAITING" ? "warning" : q.status === "CALLING" ? "primary" : "neutral"}
                            className="text-[10px]"
                          >
                            {q.status}
                          </Badge>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            ~{q.estimated_wait_minutes} mins wait
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Appointments Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    <CalendarCheck className="w-4 h-4 text-blue-500" />
                    <span>Today's Consultation Schedule</span>
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
                        className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {a.patient_name || a.patient_id}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Dr. {a.doctor_name || a.doctor_id} • {a.slot}
                            </div>
                          </div>
                        </div>

                        <div>
                          <Badge
                            variant={a.status === "completed" ? "success" : a.status === "scheduled" ? "primary" : "neutral"}
                            className="text-[10px]"
                          >
                            {a.status}
                          </Badge>
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
