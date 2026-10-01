"use client";

import React from "react";
import Link from "next/link";
import { Clock, User, Stethoscope, ChevronRight, Play, CheckCircle2, Pause, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { ClinicalStatus, ClinicalPriority } from "./tokens";

export interface QueueTokenCardProps {
  queueId: string;
  tokenNumber: number | string;
  patientId: string;
  patientName: string;
  onehealthId?: string;
  doctorName?: string;
  departmentName?: string;
  status: ClinicalStatus;
  priority: ClinicalPriority;
  estimatedWaitMinutes?: number;
  onCallNext?: () => void;
  onStartConsult?: () => void;
  onComplete?: () => void;
  onHold?: () => void;
  actionLoading?: boolean;
  className?: string;
}

export const QueueTokenCard: React.FC<QueueTokenCardProps> = ({
  queueId,
  tokenNumber,
  patientId,
  patientName,
  onehealthId,
  doctorName,
  departmentName,
  status,
  priority,
  estimatedWaitMinutes,
  onCallNext,
  onStartConsult,
  onComplete,
  onHold,
  actionLoading = false,
  className,
}) => {
  return (
    <div
      className={cn(
        "bg-white  border border-slate-200  rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3",
        status === "CALLING" && "ring-2 ring-indigo-500 border-indigo-300  bg-indigo-50/20 ",
        status === "IN_CONSULTATION" && "border-emerald-300  bg-emerald-50/15 ",
        className
      )}
    >
      {/* Header: Token # and Badges */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl font-black text-slate-900  font-mono">
            #{tokenNumber}
          </span>
          <StatusBadge priority={priority} />
        </div>
        <StatusBadge status={status} withPulse={status === "CALLING" || status === "IN_CONSULTATION"} />
      </div>

      {/* Patient & Doctor details */}
      <div className="space-y-1">
        <Link
          href={`/patients/${patientId}`}
          className="font-bold text-slate-900  hover:text-blue-600  transition-colors block text-base truncate"
        >
          {patientName}
        </Link>
        {onehealthId && (
          <span className="text-[11px] font-mono text-slate-400 block">
            ID: {onehealthId}
          </span>
        )}
        {doctorName && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600  mt-1">
            <Stethoscope className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate">Dr. {doctorName} {departmentName ? `(${departmentName})` : ""}</span>
          </div>
        )}
      </div>

      {/* Wait Time Indicator & Actions Footer */}
      <div className="pt-3 border-t border-slate-100  flex flex-wrap items-center justify-between gap-2">
        {estimatedWaitMinutes !== undefined && (
          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Est. Wait: <strong>{estimatedWaitMinutes}m</strong></span>
          </div>
        )}

        {/* Action Triggers */}
        <div className="flex items-center gap-1.5 ml-auto">
          {status === "WAITING" && onCallNext && (
            <button
              onClick={onCallNext}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 min-h-[40px] flex items-center gap-1"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Call Next</span>
            </button>
          )}

          {status === "CALLING" && onStartConsult && (
            <button
              onClick={onStartConsult}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 min-h-[40px] flex items-center gap-1"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Consult</span>
            </button>
          )}

          {status === "IN_CONSULTATION" && onComplete && (
            <button
              onClick={onComplete}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 min-h-[40px] flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Complete</span>
            </button>
          )}

          {onHold && status !== "COMPLETED" && status !== "HOLD" && (
            <button
              onClick={onHold}
              disabled={actionLoading}
              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50  rounded-xl transition-all disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Put on hold"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
