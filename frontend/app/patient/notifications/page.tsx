"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell, CheckCircle2, ArrowLeft, RefreshCw, AlertCircle,
  Clock, Calendar, Pill, TestTube, CheckCheck
} from "lucide-react";
import { api, PatientNotification } from "@/lib/api";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function PatientNotificationsPage() {
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.patient.getNotifications();
      setNotifications(res?.data || []);
    } catch (err: any) {
      console.error("Failed to load notifications", err);
      setError(err?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.patient.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "UNREAD" && n.is_read) return false;
    return true;
  });

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <Link
            href="/patient"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Health Overview</span>
          </Link>
          <span className="text-xs text-slate-400">Activity Center</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Clinical appointment reminders, prescription updates, and diagnostic lab test notifications.
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("UNREAD")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === "UNREAD" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Unread ({notifications.filter((n) => !n.is_read).length})
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={loadData} className="font-semibold underline">Retry</button>
          </div>
        )}

        {/* Notification List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
            <Bell className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No notifications</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You are all caught up! Important health notifications will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 ${
                  n.is_read
                    ? "bg-white border-slate-200"
                    : "bg-blue-50/60 border-blue-200 shadow-sm"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    n.is_read ? "bg-slate-100 text-slate-500" : "bg-blue-600 text-white shadow-sm"
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] font-mono text-slate-400 block pt-1">
                      {n.created_at ? new Date(n.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Today"}
                    </span>
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition shrink-0"
                    title="Mark as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
