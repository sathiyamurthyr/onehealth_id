"use client";

import React, { useState } from "react";
import { Clock, CheckCircle2, AlertCircle, PlayCircle, PauseCircle, XCircle, Filter, Calendar } from "lucide-react";
import { PrescriptionItem } from "@/lib/types";

interface MedicationTimelineProps {
  currentItems?: PrescriptionItem[];
  historicalItems?: any[];
}

export function MedicationTimeline({
  currentItems = [],
  historicalItems = [
    {
      medicine_name: "Metformin 500mg",
      brand_name: "Glycomet 500",
      dose: "1 tablet BD",
      duration: "60 Days",
      start_date: "2026-09-01",
      end_date: "2026-10-31",
      status: "ACTIVE",
      type: "Chronic",
      progress_pct: 50,
    },
    {
      medicine_name: "Telmisartan 40mg",
      brand_name: "Telma 40",
      dose: "1 tablet OD",
      duration: "60 Days",
      start_date: "2026-09-01",
      end_date: "2026-10-31",
      status: "ACTIVE",
      type: "Chronic",
      progress_pct: 50,
    },
    {
      medicine_name: "Pregeb M OD (Pregabalin + Methylcobalamin)",
      brand_name: "Pregeb M",
      dose: "1 capsule HS",
      duration: "30 Days",
      start_date: "2026-09-01",
      end_date: "2026-10-01",
      status: "ACTIVE",
      type: "Acute / Neuropathy",
      progress_pct: 100,
    },
    {
      medicine_name: "Levosalbutamol + Ambroxol Syrup",
      brand_name: "Ascoril LS",
      dose: "5 ml TDS",
      duration: "5 Days",
      start_date: "2026-09-01",
      end_date: "2026-09-06",
      status: "COMPLETED",
      type: "Acute Infection",
      progress_pct: 100,
    },
    {
      medicine_name: "Amoxicillin + Clavulanic Acid 625mg",
      brand_name: "Augmentin 625",
      dose: "1 tab BD",
      duration: "7 Days",
      start_date: "2026-08-10",
      end_date: "2026-08-17",
      status: "COMPLETED",
      type: "Acute",
      progress_pct: 100,
    },
    {
      medicine_name: "Atorvastatin 20mg",
      brand_name: "Atorva 20",
      dose: "1 tab HS",
      duration: "30 Days",
      start_date: "2026-07-01",
      end_date: "2026-07-31",
      status: "DISCONTINUED",
      type: "Lipid Control",
      progress_pct: 60,
    },
  ],
}: MedicationTimelineProps) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "ACTIVE":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
          icon: PlayCircle,
        };
      case "COMPLETED":
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          dot: "bg-blue-500",
          icon: CheckCircle2,
        };
      case "DISCONTINUED":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
          icon: PauseCircle,
        };
      case "CANCELLED":
      case "EXPIRED":
        return {
          bg: "bg-slate-100 text-slate-600 border-slate-200",
          dot: "bg-slate-400",
          icon: XCircle,
        };
      default:
        return {
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          dot: "bg-purple-500",
          icon: Clock,
        };
    }
  };

  const filteredItems = historicalItems.filter((item) => {
    if (filterStatus === "ALL") return true;
    return item.status.toUpperCase() === filterStatus;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="bg-slate-50/70 border-b border-slate-200/80 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <span>Medication Timeline & Course Trajectory</span>
          </h3>
          <p className="text-[11px] text-slate-500">
            Differentiates Active, Completed, Discontinued, and Expired courses for acute & chronic therapies.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 text-xs">
          {["ALL", "ACTIVE", "COMPLETED", "DISCONTINUED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                filterStatus === st
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {filteredItems.map((med, idx) => {
          const badge = getStatusBadge(med.status);
          const Icon = badge.icon;

          return (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-purple-200 transition-all space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg border ${badge.bg}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{med.medicine_name}</h4>
                    <span className="text-[11px] text-slate-500">
                      {med.dose} • {med.duration} • <span className="font-semibold text-slate-700">{med.type}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-500">
                    {med.start_date} ──► {med.end_date}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} flex items-center gap-1`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                    {med.status}
                  </span>
                </div>
              </div>

              {/* Visual Gantt Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    med.status === "ACTIVE"
                      ? "bg-emerald-500"
                      : med.status === "COMPLETED"
                      ? "bg-blue-500"
                      : "bg-amber-500"
                  }`}
                  style={{ width: `${med.progress_pct || 100}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
