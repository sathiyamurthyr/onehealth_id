"use client";

import React, { useMemo } from "react";
import { Activity, Heart, Thermometer, Wind, Gauge, Scale, Droplet, AlertTriangle } from "lucide-react";

export interface VitalsData {
  systolic_bp?: number | string;
  diastolic_bp?: number | string;
  pulse_rate?: number | string;
  temperature?: number | string;
  respiratory_rate?: number | string;
  spo2?: number | string;
  height_cm?: number | string;
  weight_kg?: number | string;
  blood_glucose?: number | string;
  glucose_type?: "Fasting" | "Random" | "Postprandial";
  pain_score?: number;
  notes?: string;
}

interface VitalsMatrixProps {
  vitals: VitalsData;
  onChange: (updated: VitalsData) => void;
  readOnly?: boolean;
}

export function VitalsMatrix({ vitals, onChange, readOnly = false }: VitalsMatrixProps) {
  const updateField = (field: keyof VitalsData, value: any) => {
    if (readOnly) return;
    onChange({
      ...vitals,
      [field]: value,
    });
  };

  // Automated BMI calculation
  const bmiInfo = useMemo(() => {
    const h = Number(vitals.height_cm);
    const w = Number(vitals.weight_kg);
    if (!h || !w || h <= 0 || w <= 0) return null;
    const heightInMeters = h / 100;
    const bmi = Number((w / (heightInMeters * heightInMeters)).toFixed(1));
    let category = "Normal";
    let color = "text-emerald-700 bg-emerald-50 border-emerald-200";

    if (bmi < 18.5) {
      category = "Underweight";
      color = "text-blue-700 bg-blue-50 border-blue-200";
    } else if (bmi >= 25 && bmi < 30) {
      category = "Overweight";
      color = "text-amber-700 bg-amber-50 border-amber-200";
    } else if (bmi >= 30) {
      category = "Obese";
      color = "text-rose-700 bg-rose-50 border-rose-200";
    }
    return { bmi, category, color };
  }, [vitals.height_cm, vitals.weight_kg]);

  // Automated BP Classification
  const bpInfo = useMemo(() => {
    const sys = Number(vitals.systolic_bp);
    const dia = Number(vitals.diastolic_bp);
    if (!sys || !dia) return null;

    if (sys >= 180 || dia >= 120) {
      return { stage: "Crisis (Seek Immediate Care)", color: "text-rose-800 bg-rose-100 border-rose-300" };
    }
    if (sys >= 140 || dia >= 90) {
      return { stage: "Stage 2 HTN", color: "text-rose-700 bg-rose-50 border-rose-200" };
    }
    if (sys >= 130 || dia >= 80) {
      return { stage: "Stage 1 HTN", color: "text-amber-700 bg-amber-50 border-amber-200" };
    }
    if (sys >= 120 && dia < 80) {
      return { stage: "Elevated BP", color: "text-yellow-700 bg-yellow-50 border-yellow-200" };
    }
    return { stage: "Normal BP", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  }, [vitals.systolic_bp, vitals.diastolic_bp]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Patient Vital Signs Matrix</h3>
            <p className="text-[11px] text-slate-500">Record clinical vitals with auto-calculated BMI & BP staging</p>
          </div>
        </div>

        {bpInfo && (
          <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${bpInfo.color}`}>
            BP: {bpInfo.stage}
          </span>
        )}
      </div>

      {/* Grid of Vitals Inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
        {/* Blood Pressure */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
          <label className="font-bold text-slate-700 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            Blood Pressure (mmHg)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="Sys (120)"
              value={vitals.systolic_bp || ""}
              onChange={(e) => updateField("systolic_bp", e.target.value)}
              disabled={readOnly}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
            <span className="text-slate-400 font-bold">/</span>
            <input
              type="number"
              placeholder="Dia (80)"
              value={vitals.diastolic_bp || ""}
              onChange={(e) => updateField("diastolic_bp", e.target.value)}
              disabled={readOnly}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>
        </div>

        {/* Pulse / Heart Rate */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
          <label className="font-bold text-slate-700 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
            <Gauge className="w-3.5 h-3.5 text-red-500" />
            Pulse / Heart Rate (bpm)
          </label>
          <input
            type="number"
            placeholder="72"
            value={vitals.pulse_rate || ""}
            onChange={(e) => updateField("pulse_rate", e.target.value)}
            disabled={readOnly}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
          />
        </div>

        {/* Temperature */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
          <label className="font-bold text-slate-700 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
            <Thermometer className="w-3.5 h-3.5 text-amber-500" />
            Temperature (°F)
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="98.6"
            value={vitals.temperature || ""}
            onChange={(e) => updateField("temperature", e.target.value)}
            disabled={readOnly}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
          />
        </div>

        {/* Respiratory Rate */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
          <label className="font-bold text-slate-700 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
            <Wind className="w-3.5 h-3.5 text-teal-500" />
            Resp Rate (breaths/min)
          </label>
          <input
            type="number"
            placeholder="16"
            value={vitals.respiratory_rate || ""}
            onChange={(e) => updateField("respiratory_rate", e.target.value)}
            disabled={readOnly}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
          />
        </div>

        {/* Oxygen Saturation SpO2 */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
          <label className="font-bold text-slate-700 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
            <Droplet className="w-3.5 h-3.5 text-blue-500" />
            SpO2 Saturation (%)
          </label>
          <input
            type="number"
            placeholder="98"
            max="100"
            min="50"
            value={vitals.spo2 || ""}
            onChange={(e) => updateField("spo2", e.target.value)}
            disabled={readOnly}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
          />
        </div>

        {/* Height & Weight */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
          <label className="font-bold text-slate-700 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
            <Scale className="w-3.5 h-3.5 text-purple-500" />
            Height (cm) / Wt (kg)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="170 cm"
              value={vitals.height_cm || ""}
              onChange={(e) => updateField("height_cm", e.target.value)}
              disabled={readOnly}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
            <input
              type="number"
              placeholder="68 kg"
              value={vitals.weight_kg || ""}
              onChange={(e) => updateField("weight_kg", e.target.value)}
              disabled={readOnly}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>
        </div>

        {/* Calculated BMI */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-1.5 flex flex-col justify-between">
          <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
            Calculated BMI (kg/m²)
          </label>
          {bmiInfo ? (
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-bold text-slate-900">{bmiInfo.bmi}</span>
              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${bmiInfo.color}`}>
                {bmiInfo.category}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 italic text-[11px]">Enter height & weight</span>
          )}
        </div>

        {/* Blood Glucose */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
          <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
            Blood Glucose (mg/dL)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="110"
              value={vitals.blood_glucose || ""}
              onChange={(e) => updateField("blood_glucose", e.target.value)}
              disabled={readOnly}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
            <select
              value={vitals.glucose_type || "Random"}
              onChange={(e) => updateField("glucose_type", e.target.value)}
              disabled={readOnly}
              className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
            >
              <option value="Random">RBS</option>
              <option value="Fasting">FBS</option>
              <option value="Postprandial">PPBS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pain Score Slider */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Pain Score (0–10):</span>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
              const isSelected = (vitals.pain_score ?? 0) === score;
              const colorClass =
                score === 0
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : score <= 3
                  ? "bg-green-100 text-green-800 border-green-300"
                  : score <= 6
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : "bg-rose-100 text-rose-800 border-rose-300";

              return (
                <button
                  key={score}
                  type="button"
                  disabled={readOnly}
                  onClick={() => updateField("pain_score", score)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    isSelected ? `${colorClass} ring-2 ring-indigo-500 ring-offset-1 scale-110` : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {score}
                </button>
              );
            })}
          </div>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {(vitals.pain_score ?? 0) === 0
            ? "No Pain (0)"
            : (vitals.pain_score ?? 0) <= 3
            ? "Mild Discomfort (1–3)"
            : (vitals.pain_score ?? 0) <= 6
            ? "Moderate Pain (4–6)"
            : "Severe / Intense Pain (7–10)"}
        </span>
      </div>
    </div>
  );
}
