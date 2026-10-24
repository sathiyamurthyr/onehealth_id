"use client";

import React, { useState, useEffect } from "react";
import {
  Bot,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Eye,
  Calendar,
  Activity,
  FileText,
  UserCheck,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { api } from "@/lib/api";
import { AIAgentTask } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";

export default function HospitalAIAgentsPage() {
  const { workspace } = useWorkspace();
  const hospitalId = workspace?.hospital_ref_id || "";

  const [tasks, setTasks] = useState<AIAgentTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Selected Task for Review
  const [selectedTask, setSelectedTask] = useState<AIAgentTask | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Trigger loading
  const [triggeringFollowup, setTriggeringFollowup] = useState(false);
  const [triggeringOps, setTriggeringOps] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [filterStatus]);

  const loadTasks = async () => {
    try {
      setLoadingTasks(true);
      const statusParam = filterStatus === "ALL" ? undefined : filterStatus;
      const res = await api.ai.listAgentTasks(hospitalId, statusParam);
      setTasks(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleApprove = async (task: AIAgentTask) => {
    try {
      setActionLoading(true);
      await api.ai.approveAgentTask(task.id, hospitalId);
      setActionMessage(`Task ${task.id} approved and executed successfully.`);
      setSelectedTask(null);
      loadTasks();
    } catch (err: any) {
      setActionMessage(`Approval failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (task: AIAgentTask) => {
    try {
      setActionLoading(true);
      await api.ai.rejectAgentTask(task.id, "Rejected by administrative reviewer", hospitalId);
      setActionMessage(`Task ${task.id} rejected.`);
      setSelectedTask(null);
      loadTasks();
    } catch (err: any) {
      setActionMessage(`Rejection failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerFollowupAgent = async () => {
    try {
      setTriggeringFollowup(true);
      const res = await api.ai.triggerFollowupAgent(hospitalId);
      setActionMessage(`Follow-up scan completed: ${res.created_tasks_count || 0} tasks staged for approval.`);
      loadTasks();
    } catch (err: any) {
      setActionMessage(`Trigger failed: ${err.message}`);
    } finally {
      setTriggeringFollowup(false);
    }
  };

  const handleTriggerOpsAgent = async () => {
    try {
      setTriggeringOps(true);
      const res = await api.ai.triggerOperationsAgent(hospitalId);
      setActionMessage(`Operations scan completed: ${res.message || "Queue evaluation finished"}`);
      loadTasks();
    } catch (err: any) {
      setActionMessage(`Trigger failed: ${err.message}`);
    } finally {
      setTriggeringOps(false);
    }
  };

  const agents = [
    {
      name: "Follow-up Due Agent",
      role: "Identifies patients with pending clinical reviews and drafts follow-up scheduling tasks.",
      type: "FOLLOWUP_AGENT",
      status: "ACTIVE",
      icon: Calendar
    },
    {
      name: "Queue Overcapacity Agent",
      role: "Detects OPD congestion thresholds and stages load-balancing alerts for operations.",
      type: "OPERATIONS_AGENT",
      status: "ACTIVE",
      icon: Activity
    },
    {
      name: "Appointment Slot Agent",
      role: "Proposes slot re-allocations and detects doctor schedule overlaps.",
      type: "APPOINTMENT_AGENT",
      status: "ACTIVE",
      icon: Clock
    },
    {
      name: "Operational Report Agent",
      role: "Synthesizes daily clinical volume, revenue, and queue metrics for management.",
      type: "REPORT_AGENT",
      status: "ACTIVE",
      icon: FileText
    }
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-200 border border-purple-500/30">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                <span>Controlled Autonomous Operations</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                AI Workflow Agents & Human-in-the-Loop Governance
              </h1>
              <p className="text-sm text-purple-200 max-w-2xl leading-relaxed">
                Empower controlled AI agents to prepare administrative workflows, follow-up reminders, and queue rebalancing with mandatory human approval gates.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTriggerFollowupAgent}
                disabled={triggeringFollowup}
                className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-purple-700 transition cursor-pointer disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                <span>{triggeringFollowup ? "Scanning..." : "Scan Due Follow-ups"}</span>
              </button>
              <button
                type="button"
                onClick={handleTriggerOpsAgent}
                disabled={triggeringOps}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition cursor-pointer border border-white/20 disabled:opacity-50"
              >
                <Activity className="h-3.5 w-3.5 text-purple-300" />
                <span>{triggeringOps ? "Checking..." : "Check Queue Load"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {actionMessage && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-xs font-semibold text-indigo-900 flex items-center justify-between shadow-2xs">
            <span>{actionMessage}</span>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-indigo-400 hover:text-indigo-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* Registered Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {agents.map((ag, idx) => {
            const Icon = ag.icon;
            return (
              <div key={idx} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    {ag.status}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{ag.name}</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{ag.role}</p>
                </div>
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-purple-600 font-semibold">
                  <span>Scope: Non-Clinical</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Task Queue Section */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Agent Action Task Queue</h3>
              <p className="text-xs text-gray-500">
                Staged agent actions awaiting human-in-the-loop review and execution sign-off
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold text-gray-600">
              {["ALL", "PENDING_APPROVAL", "APPROVED", "EXECUTED", "REJECTED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                    filterStatus === st
                      ? "bg-white text-purple-700 shadow-xs font-bold"
                      : "hover:text-gray-900"
                  }`}
                >
                  {st.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {loadingTasks ? (
            <div className="py-16 text-center">
              <div className="h-8 w-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-xs text-gray-500">Loading staged agent tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-8 text-center text-xs text-gray-400">
              No agent tasks found for the selected filter.
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs hover:border-purple-300 transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{task.task_type.replace(/_/g, " ")}</span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            task.status === "PENDING_APPROVAL"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : task.status === "APPROVED" || task.status === "EXECUTED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1">
                        <strong>Target:</strong> {task.target_entity_type} • ID: {task.target_entity_id}
                      </p>
                      {task.proposed_payload && (
                        <p className="text-gray-400 text-[11px] mt-0.5 font-mono line-clamp-1">
                          {JSON.stringify(task.proposed_payload)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {task.status === "PENDING_APPROVAL" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(task)}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Run
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(task)}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedTask(task)}
                      className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" /> Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Inspection Modal */}
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 text-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-purple-600" />
                  <h3 className="font-bold text-base text-gray-900">Agent Task Specification</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="font-semibold text-gray-500">Task ID:</span>
                  <span className="font-mono text-gray-900">{selectedTask.id}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="font-semibold text-gray-500">Task Type:</span>
                  <span className="font-bold text-purple-900">{selectedTask.task_type}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="font-semibold text-gray-500">Status:</span>
                  <span className="font-bold">{selectedTask.status}</span>
                </div>
                <div className="py-2">
                  <span className="font-semibold text-gray-500 block mb-1">Proposed Execution Payload:</span>
                  <pre className="rounded-xl bg-slate-900 text-slate-100 p-3 overflow-x-auto text-[11px] font-mono">
                    {JSON.stringify(selectedTask.proposed_payload, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                {selectedTask.status === "PENDING_APPROVAL" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleReject(selectedTask)}
                      disabled={actionLoading}
                      className="rounded-xl border border-gray-300 px-4 py-2 font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Reject Action
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedTask)}
                      disabled={actionLoading}
                      className="rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white shadow-sm hover:bg-emerald-700"
                    >
                      Approve & Execute
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-gray-600 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
