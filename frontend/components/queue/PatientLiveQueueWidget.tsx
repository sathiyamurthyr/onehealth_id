"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Stethoscope,
  Users,
  RefreshCw,
  DoorOpen,
  Volume2,
  Sparkles,
  Zap
} from "lucide-react";
import { api } from "@/lib/api";

export interface PatientQueueData {
  queue_id: string;
  token_number: number;
  token_prefix: string;
  token_str: string;
  status: "WAITING" | "CALLED" | "IN_CONSULTATION" | "HOLD" | "COMPLETED";
  priority: string;
  estimated_wait_minutes: number;
  hospital_id: string;
  hospital_name: string;
  department_id: string;
  department_name: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty?: string;
  counter_number?: string;
  room_number?: string;
  currently_serving_token: string;
  currently_serving_status: string;
  patients_ahead: number;
}

export function PatientLiveQueueWidget({
  onRefresh,
  compact = false
}: {
  onRefresh?: () => void;
  compact?: boolean;
}) {
  const [queueData, setQueueData] = useState<PatientQueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [audioNotified, setAudioNotified] = useState(false);

  const fetchStatus = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await api.patient.getQueueStatus().catch(() => null);
      if (res && res.active && res.data) {
        setQueueData(res.data);
        // Play subtle sound if CALLED and not notified yet
        if (res.data.status === "CALLED" && !audioNotified) {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
            setAudioNotified(true);
          } catch (e) {
            // Audio context blocked or unsupported
          }
        }
      } else {
        setQueueData(null);
      }
    } catch (err) {
      console.warn("Failed to fetch live queue status:", err);
      setQueueData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus(false);
    const interval = setInterval(() => fetchStatus(true), 15000); // 15s polling
    return () => clearInterval(interval);
  }, []);

  if (loading && !queueData) {
    return null; // Silently load
  }

  if (!queueData) {
    return null; // No active check-in
  }

  const isCalled = queueData.status === "CALLED";
  const isInConsultation = queueData.status === "IN_CONSULTATION";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border transition-all duration-300 shadow-md ${
        isCalled
          ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500 animate-pulse"
          : isInConsultation
          ? "bg-gradient-to-r from-indigo-900 to-slate-900 text-white border-indigo-700"
          : "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white border-slate-700/60"
      } ${compact ? "p-4" : "p-6"}`}
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Token info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-md">
              <Zap className="w-3 h-3 text-amber-300" /> Live OPD Queue Tracker
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide ${
                isCalled
                  ? "bg-white text-emerald-800 animate-bounce"
                  : isInConsultation
                  ? "bg-indigo-400 text-indigo-950"
                  : "bg-blue-500/30 text-blue-200 border border-blue-400/30"
              }`}
            >
              {isCalled
                ? "🔔 YOUR TOKEN IS CALLED"
                : isInConsultation
                ? "IN CONSULTATION"
                : queueData.status}
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white drop-shadow-sm">
              {queueData.token_str}
            </span>
            <span className="text-xs text-white/80 font-medium">
              at {queueData.hospital_name}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-white/80">
            <span className="flex items-center gap-1 font-semibold text-white">
              <Building2 className="w-3.5 h-3.5 text-blue-300" />
              {queueData.department_name}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-semibold text-white">
              <Stethoscope className="w-3.5 h-3.5 text-emerald-300" />
              Dr. {queueData.doctor_name}
            </span>
            {(queueData.room_number || queueData.counter_number) && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 font-bold text-amber-300">
                  <DoorOpen className="w-3.5 h-3.5" />
                  Room {queueData.room_number || queueData.counter_number}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Metrics & Live Serving Token */}
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
          <div className="text-center px-3 border-r border-white/15">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/70">
              Now Serving
            </span>
            <span className="text-lg font-black font-mono text-amber-300">
              {queueData.currently_serving_token}
            </span>
          </div>

          <div className="text-center px-3 border-r border-white/15">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/70">
              Ahead of You
            </span>
            <span className="text-lg font-black text-white">
              {queueData.patients_ahead}{" "}
              <span className="text-xs font-normal text-white/70">patients</span>
            </span>
          </div>

          <div className="text-center px-3">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/70">
              Est. Wait
            </span>
            <span className="text-lg font-black text-white flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-300" />
              {queueData.estimated_wait_minutes}
              <span className="text-xs font-normal text-white/70">m</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchStatus(false);
              if (onRefresh) onRefresh();
            }}
            disabled={refreshing}
            className="p-2 ml-1 text-white/70 hover:text-white hover:bg-white/15 rounded-xl transition"
            title="Refresh Live Queue"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

