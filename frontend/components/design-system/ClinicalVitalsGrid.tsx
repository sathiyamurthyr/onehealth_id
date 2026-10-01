"use client";

import React from "react";
import { Activity, Heart, Thermometer, Wind, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VitalsData {
  bloodPressure?: string; // e.g. "120/80"
  heartRate?: number;     // e.g. 74 bpm
  spo2?: number;          // e.g. 98 %
  temperature?: number;   // e.g. 98.6 F
  respiratoryRate?: number; // e.g. 18 /min
}

export interface ClinicalVitalsGridProps {
  vitals: VitalsData;
  compact?: boolean;
  className?: string;
}

export const ClinicalVitalsGrid: React.FC<ClinicalVitalsGridProps> = ({
  vitals,
  compact = false,
  className,
}) => {
  // Clinical validation rules for out-of-range flagging
  const isBPAbnormal = () => {
    if (!vitals.bloodPressure) return false;
    const parts = vitals.bloodPressure.split("/").map((p) => parseInt(p.trim(), 10));
    if (parts.length === 2) {
      const [sys, dia] = parts;
      return sys > 140 || sys < 90 || dia > 90 || dia < 60;
    }
    return false;
  };

  const isHRAbnormal = () => vitals.heartRate !== undefined && (vitals.heartRate > 100 || vitals.heartRate < 55);
  const isSpO2Abnormal = () => vitals.spo2 !== undefined && vitals.spo2 < 95;
  const isTempAbnormal = () => vitals.temperature !== undefined && (vitals.temperature > 100.4 || vitals.temperature < 96.0);
  const isRRAbnormal = () => vitals.respiratoryRate !== undefined && (vitals.respiratoryRate > 24 || vitals.respiratoryRate < 12);

  const items = [
    {
      id: "bp",
      label: "Blood Pressure",
      value: vitals.bloodPressure || "—",
      unit: "mmHg",
      icon: Activity,
      abnormal: isBPAbnormal(),
      target: "90-120 / 60-80",
    },
    {
      id: "hr",
      label: "Pulse / HR",
      value: vitals.heartRate ? `${vitals.heartRate}` : "—",
      unit: "bpm",
      icon: Heart,
      abnormal: isHRAbnormal(),
      target: "60-100",
    },
    {
      id: "spo2",
      label: "Oxygen Sat (SpO2)",
      value: vitals.spo2 ? `${vitals.spo2}` : "—",
      unit: "%",
      icon: Wind,
      abnormal: isSpO2Abnormal(),
      target: "95-100%",
    },
    {
      id: "temp",
      label: "Body Temp",
      value: vitals.temperature ? `${vitals.temperature}` : "—",
      unit: "°F",
      icon: Thermometer,
      abnormal: isTempAbnormal(),
      target: "97.5-99.0",
    },
  ];

  if (vitals.respiratoryRate) {
    items.push({
      id: "rr",
      label: "Respiratory Rate",
      value: `${vitals.respiratoryRate}`,
      unit: "/min",
      icon: Wind,
      abnormal: isRRAbnormal(),
      target: "12-20",
    });
  }

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className={cn(
              "p-3.5 rounded-2xl border transition-all flex flex-col justify-between",
              item.abnormal
                ? "bg-rose-50/60  border-rose-300  text-rose-900 "
                : "bg-slate-50  border-slate-200  text-slate-800 "
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500  truncate">
                {item.label}
              </span>
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  item.abnormal ? "text-rose-500 animate-pulse" : "text-blue-500"
                )}
              />
            </div>

            <div className="flex items-baseline gap-1 my-0.5">
              <span
                className={cn(
                  "text-lg sm:text-xl font-black tracking-tight",
                  item.abnormal ? "text-rose-600 " : "text-slate-900 "
                )}
              >
                {item.value}
              </span>
              <span className="text-xs text-slate-400 font-medium">{item.unit}</span>
            </div>

            <div className="mt-1 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-mono">Norm: {item.target}</span>
              {item.abnormal && (
                <span className="inline-flex items-center gap-0.5 font-bold text-rose-600 ">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Alert
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
