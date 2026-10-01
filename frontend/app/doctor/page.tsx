"use client";

import React, { useState, useEffect } from "react";
import {
  Stethoscope,
  ListOrdered,
  CalendarCheck,
  Users,
  Play,
  CheckCircle2,
  Clock,
  ArrowRight,
  TestTube,
  Pill,
  HeartPulse,
  Activity,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { DynamicDashboard } from "@/components/workspace/DynamicDashboard";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DoctorWorkspacePage() {
  const { workspace, user } = useWorkspace();
  const router = useRouter();
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [callingToken, setCallingToken] = useState(false);

  useEffect(() => {
    async function loadQueue() {
      try {
        setLoading(true);
        const data = await api.queue.list({
          status: "WAITING",
          hospital_id: workspace?.hospital_ref_id,
        }).catch(() => []);
        setQueueItems(data || []);
      } catch (err) {
        console.error("Failed to load doctor queue", err);
      } finally {
        setLoading(false);
      }
    }
    loadQueue();
  }, [workspace?.hospital_ref_id]);

  const handleCallNext = async () => {
    if (queueItems.length === 0) return;
    const nextItem = queueItems[0];
    try {
      setCallingToken(true);
      await api.queue.call(nextItem.id);
      router.push(`/doctor/consultation/${nextItem.patient_id}?queue_id=${nextItem.id}`);
    } catch (err: any) {
      alert(err.message || "Failed to call next token");
    } finally {
      setCallingToken(false);
    }
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["DOCTOR"]}>
      <div className="space-y-6">
        {/* Dynamic Doctor Dashboard Widgets */}
        <DynamicDashboard
          title={`Clinical Console — ${user?.name || "Dr. Senthil"}`}
          subtitle={`Active OP Practice at ${workspace?.hospital_name || "Kedar Hospital"} • Patient queue, consultations, and digital prescriptions.`}
        />

        {/* Quick Clinical Action Strip */}
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Outpatient Consultation Desk</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  Queue Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {queueItems.length} patients waiting in consultation queue for {workspace?.hospital_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="primary"
              size="lg"
              disabled={callingToken || queueItems.length === 0}
              onClick={handleCallNext}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 text-xs font-semibold w-full md:w-auto"
            >
              <Play className="w-4 h-4 fill-white" />
              {callingToken ? "Calling..." : `Call Next Token (${queueItems[0]?.token_number || "None"})`}
            </Button>
            <Link
              href="/doctor/queue"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5 shrink-0"
            >
              <ListOrdered className="w-4 h-4 text-emerald-400" />
              <span>Full Queue</span>
            </Link>
          </div>
        </div>

        {/* Clinical Navigation Modules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/doctor/queue"
            className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 transition group space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <ListOrdered className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="text-sm font-bold text-white">Live OPD Queue</h4>
            <p className="text-xs text-slate-400">View waiting tokens, recall patients, or mark consultations complete.</p>
          </Link>

          <Link
            href="/appointments"
            className="bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 transition group space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="text-sm font-bold text-white">My Appointments</h4>
            <p className="text-xs text-slate-400">Scheduled outpatient appointments and follow-up consultation slots.</p>
          </Link>

          <Link
            href="/patients"
            className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 transition group space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="text-sm font-bold text-white">Patient Records</h4>
            <p className="text-xs text-slate-400">Medical histories, diagnostic lab results, and longitudinal records.</p>
          </Link>

          <Link
            href="/laboratory"
            className="bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-5 transition group space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <TestTube className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="text-sm font-bold text-white">Diagnostic Orders</h4>
            <p className="text-xs text-slate-400">Pathology, hematology, and biochemistry test requisitions.</p>
          </Link>
        </div>

        {/* Live Waiting Patients Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Waiting Patients in Queue
            </h3>
            <span className="text-xs text-slate-400">{queueItems.length} awaiting triage/doctor</span>
          </div>

          {loading ? (
            <div className="h-32 flex items-center justify-center text-xs text-slate-400">
              Loading waiting queue...
            </div>
          ) : queueItems.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/80">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">Queue is Clear</p>
              <p className="text-xs text-slate-400 mt-1">No patients are currently waiting in this department queue.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Token #</th>
                    <th className="py-2.5 px-4">Patient Name</th>
                    <th className="py-2.5 px-4">OneHealth ID</th>
                    <th className="py-2.5 px-4">Wait Time</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {queueItems.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {q.token_number}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {q.patient_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {q.onehealth_id || "OH-N/A"}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {q.wait_time_minutes ? `${q.wait_time_minutes} mins` : "Just now"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/doctor/consultation/${q.patient_id}?queue_id=${q.id}`}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition inline-flex items-center gap-1"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          Consult
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
