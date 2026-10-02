"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Activity,
  Heart,
  Thermometer,
  Scale,
  Stethoscope,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Search,
  Sparkles
} from "lucide-react";
import {
  ChiefComplaint,
  ClinicalExamination,
  MedicalHistory,
  DiagnosisItem
} from "@/lib/types";

interface ClinicalAssessmentProps {
  symptomsText: string;
  onSymptomsTextChange: (text: string) => void;
  diagnosisText: string;
  onDiagnosisTextChange: (text: string) => void;
  clinicalNotes: string;
  onClinicalNotesChange: (text: string) => void;
  vitals: {
    bp: string;
    pulse: number;
    spo2: number;
    temperature: string;
    weight_kg: number;
    height_cm: number;
    bmi?: number;
    pain_score?: number;
    resp_rate?: number;
  };
  onVitalsChange: (vitals: any) => void;
  chiefComplaint: ChiefComplaint;
  onChiefComplaintChange: (cc: ChiefComplaint) => void;
  examination: ClinicalExamination;
  onExaminationChange: (exam: ClinicalExamination) => void;
  medicalHistory: MedicalHistory;
  onMedicalHistoryChange: (history: MedicalHistory) => void;
  diagnosesList: DiagnosisItem[];
  onDiagnosesListChange: (diagnoses: DiagnosisItem[]) => void;
}

// ICD-10 quick dictionary
const COMMON_ICD_CODES = [
  { code: "E11.40", name: "Type 2 diabetes mellitus with diabetic neuropathy, unspecified" },
  { code: "E11.9", name: "Type 2 diabetes mellitus without complications" },
  { code: "I10", name: "Essential (primary) hypertension" },
  { code: "J06.9", name: "Acute upper respiratory infection, unspecified" },
  { code: "J45.909", name: "Unspecified asthma, uncomplicated" },
  { code: "K21.9", name: "Gastro-esophageal reflux disease without esophagitis" },
  { code: "M54.5", name: "Low back pain, unspecified" },
  { code: "R50.9", name: "Fever, unspecified" },
  { code: "R05", name: "Cough, unspecified" },
  { code: "E78.5", name: "Hyperlipidemia, unspecified" },
];

export function ClinicalAssessment({
  symptomsText,
  onSymptomsTextChange,
  diagnosisText,
  onDiagnosisTextChange,
  clinicalNotes,
  onClinicalNotesChange,
  vitals,
  onVitalsChange,
  chiefComplaint,
  onChiefComplaintChange,
  examination,
  onExaminationChange,
  medicalHistory,
  onMedicalHistoryChange,
  diagnosesList,
  onDiagnosesListChange,
}: ClinicalAssessmentProps) {
  const [activeTab, setActiveTab] = useState<"complaint" | "vitals" | "exam" | "history" | "diagnosis">("complaint");
  const [newSymptom, setNewSymptom] = useState("");
  const [icdSearch, setIcdSearch] = useState("");
  const [showIcdDropdown, setShowIcdDropdown] = useState(false);

  // Auto calculate BMI
  useEffect(() => {
    if (vitals.weight_kg > 0 && vitals.height_cm > 0) {
      const heightMeters = vitals.height_cm / 100;
      const calculatedBmi = parseFloat((vitals.weight_kg / (heightMeters * heightMeters)).toFixed(1));
      if (calculatedBmi !== vitals.bmi) {
        onVitalsChange({ ...vitals, bmi: calculatedBmi });
      }
    }
  }, [vitals.weight_kg, vitals.height_cm]);

  const getBmiBadge = (bmi?: number) => {
    if (!bmi) return { label: "N/A", color: "bg-slate-100 text-slate-700" };
    if (bmi < 18.5) return { label: "Underweight", color: "bg-blue-50 text-blue-700 border-blue-200" };
    if (bmi < 24.9) return { label: "Normal Weight", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (bmi < 29.9) return { label: "Overweight", color: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: "Obese (Class I+)", color: "bg-rose-50 text-rose-700 border-rose-200" };
  };

  const getPainScoreLabel = (score: number) => {
    if (score === 0) return { emoji: "😊", label: "No pain", color: "text-emerald-600" };
    if (score <= 3) return { emoji: "🙂", label: "Mild discomfort", color: "text-blue-600" };
    if (score <= 6) return { emoji: "😐", label: "Moderate pain", color: "text-amber-600" };
    if (score <= 8) return { emoji: "😣", label: "Severe pain", color: "text-orange-600" };
    return { emoji: "😫", label: "Worst possible pain", color: "text-rose-600" };
  };

  const handleAddSymptom = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (newSymptom.trim()) {
      const updated = [...chiefComplaint.symptoms, newSymptom.trim()];
      onChiefComplaintChange({ ...chiefComplaint, symptoms: updated });
      onSymptomsTextChange(updated.join(", "));
      setNewSymptom("");
    }
  };

  const handleRemoveSymptom = (index: number) => {
    const updated = chiefComplaint.symptoms.filter((_, i) => i !== index);
    onChiefComplaintChange({ ...chiefComplaint, symptoms: updated });
    onSymptomsTextChange(updated.join(", "));
  };

  const handleAddDiagnosisFromIcd = (item: { code: string; name: string }) => {
    const exists = diagnosesList.some((d) => d.code === item.code);
    if (!exists) {
      const updated = [
        ...diagnosesList,
        {
          type: diagnosesList.length === 0 ? "Primary" : "Secondary",
          code: item.code,
          name: item.name,
          status: "Confirmed",
        } as DiagnosisItem,
      ];
      onDiagnosesListChange(updated);
      if (!diagnosisText) {
        onDiagnosisTextChange(item.name);
      }
    }
    setIcdSearch("");
    setShowIcdDropdown(false);
  };

  const filteredIcd = COMMON_ICD_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(icdSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(icdSearch.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Tab Navigation Header (Design Engineer Segmented Control) */}
      <div className="bg-slate-50/70 border-b border-slate-200/80 px-4 pt-3 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("complaint")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "complaint"
                ? "bg-white text-purple-700 border-purple-600 shadow-xs"
                : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/50"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>A. Chief Complaint</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("vitals")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "vitals"
                ? "bg-white text-purple-700 border-purple-600 shadow-xs"
                : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/50"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>B. Vitals Triage</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("exam")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "exam"
                ? "bg-white text-purple-700 border-purple-600 shadow-xs"
                : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/50"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>C. Clinical Examination</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "history"
                ? "bg-white text-purple-700 border-purple-600 shadow-xs"
                : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/50"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>D. Medical History</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("diagnosis")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "diagnosis"
                ? "bg-white text-purple-700 border-purple-600 shadow-xs"
                : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/50"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
            <span>E. Diagnosis & Notes</span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-medium hidden md:block">
          FHIR ClinicalEncounter Assessment v2.4
        </span>
      </div>

      {/* Tab Panels */}
      <div className="p-6">
        {/* TAB A: Chief Complaint */}
        {activeTab === "complaint" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Reason for Visit / Primary Complaint <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={chiefComplaint.reason}
                  onChange={(e) =>
                    onChiefComplaintChange({ ...chiefComplaint, reason: e.target.value })
                  }
                  placeholder="e.g. Follow-up for uncontrolled hyperglycemia and bilateral foot tingling"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Duration</label>
                <input
                  type="text"
                  value={chiefComplaint.duration}
                  onChange={(e) =>
                    onChiefComplaintChange({ ...chiefComplaint, duration: e.target.value })
                  }
                  placeholder="e.g. 2 weeks"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                />
              </div>
            </div>

            {/* Severity & Onset Segmented Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Severity</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Mild", "Moderate", "Severe"] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() =>
                        onChiefComplaintChange({ ...chiefComplaint, severity: sev })
                      }
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        chiefComplaint.severity === sev
                          ? sev === "Severe"
                            ? "bg-rose-50 border-rose-300 text-rose-800 shadow-xs"
                            : sev === "Moderate"
                            ? "bg-amber-50 border-amber-300 text-amber-800 shadow-xs"
                            : "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Onset Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Acute", "Subacute", "Chronic"] as const).map((ons) => (
                    <button
                      key={ons}
                      type="button"
                      onClick={() =>
                        onChiefComplaintChange({ ...chiefComplaint, onset: ons })
                      }
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        chiefComplaint.onset === ons
                          ? "bg-purple-50 border-purple-300 text-purple-800 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {ons}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Symptoms Tags */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Symptoms Checklist & Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2.5">
                {chiefComplaint.symptoms.map((sym, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-xs font-medium text-purple-900"
                  >
                    <span>{sym}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSymptom(idx)}
                      className="text-purple-400 hover:text-purple-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSymptom}
                  onChange={(e) => setNewSymptom(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSymptom(e))}
                  placeholder="Type symptom (e.g. Dry cough, Nocturia, Tremors) and press Enter"
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={handleAddSymptom}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Relevant History of Presenting Illness
              </label>
              <textarea
                value={chiefComplaint.relevant_history || ""}
                onChange={(e) =>
                  onChiefComplaintChange({ ...chiefComplaint, relevant_history: e.target.value })
                }
                rows={2}
                placeholder="Details on symptom progression, aggravating or relieving factors, self-medication taken..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        {/* TAB B: Vitals Triage & BMI */}
        {activeTab === "vitals" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {/* BP */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Blood Pressure</span>
                <input
                  type="text"
                  value={vitals.bp}
                  onChange={(e) => onVitalsChange({ ...vitals, bp: e.target.value })}
                  placeholder="120/80 mmHg"
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Norm: 120/80</span>
              </div>

              {/* Pulse */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Pulse (bpm)</span>
                <input
                  type="number"
                  value={vitals.pulse}
                  onChange={(e) => onVitalsChange({ ...vitals, pulse: parseInt(e.target.value) || 0 })}
                  placeholder="72"
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Norm: 60-100</span>
              </div>

              {/* SpO2 */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">SpO2 (%)</span>
                <input
                  type="number"
                  value={vitals.spo2}
                  onChange={(e) => onVitalsChange({ ...vitals, spo2: parseInt(e.target.value) || 0 })}
                  placeholder="98"
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Norm: 95-100%</span>
              </div>

              {/* Temp */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Temperature</span>
                <input
                  type="text"
                  value={vitals.temperature}
                  onChange={(e) => onVitalsChange({ ...vitals, temperature: e.target.value })}
                  placeholder="98.6 °F"
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Norm: 98.6 °F</span>
              </div>

              {/* Resp Rate */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Resp. Rate (/min)</span>
                <input
                  type="number"
                  value={vitals.resp_rate || 16}
                  onChange={(e) => onVitalsChange({ ...vitals, resp_rate: parseInt(e.target.value) || 16 })}
                  placeholder="16"
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Norm: 12-20</span>
              </div>

              {/* Weight & Height */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Weight / Height</span>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={vitals.weight_kg}
                    onChange={(e) => onVitalsChange({ ...vitals, weight_kg: parseFloat(e.target.value) || 0 })}
                    placeholder="70 kg"
                    className="w-1/2 px-1.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-900"
                  />
                  <input
                    type="number"
                    value={vitals.height_cm || 170}
                    onChange={(e) => onVitalsChange({ ...vitals, height_cm: parseFloat(e.target.value) || 170 })}
                    placeholder="170 cm"
                    className="w-1/2 px-1.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-900"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">kg / cm</span>
              </div>
            </div>

            {/* BMI Auto Classification Card */}
            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                  {vitals.bmi || 24.2}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Body Mass Index (BMI)</h4>
                  <p className="text-[11px] text-slate-500">
                    Calculated from {vitals.weight_kg} kg and {vitals.height_cm || 170} cm
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getBmiBadge(vitals.bmi).color}`}>
                  {getBmiBadge(vitals.bmi).label}
                </span>
              </div>
            </div>

            {/* Pain Score (0 - 10 Visual Scale) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>Wong-Baker Pain Scale (0 - 10)</span>
                  <span className={`font-semibold ${getPainScoreLabel(vitals.pain_score || 0).color}`}>
                    {getPainScoreLabel(vitals.pain_score || 0).emoji} {getPainScoreLabel(vitals.pain_score || 0).label} (Score: {vitals.pain_score || 0})
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-11 gap-1">
                {Array.from({ length: 11 }, (_, i) => i).map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => onVitalsChange({ ...vitals, pain_score: score })}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      (vitals.pain_score || 0) === score
                        ? score > 7
                          ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                          : score > 3
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB C: Clinical Examination (PICLE + Systems) */}
        {activeTab === "exam" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* General Examination: PICLE Checklist */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                General Examination (P.I.C.L.E. Checklist)
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { key: "pallor", label: "Pallor" },
                  { key: "icterus", label: "Icterus" },
                  { key: "cyanosis", label: "Cyanosis" },
                  { key: "clubbing", label: "Clubbing" },
                  { key: "lymphadenopathy", label: "Lymphadenopathy" },
                ].map(({ key, label }) => {
                  const isChecked = (examination.general as any)[key];
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        isChecked
                          ? "bg-rose-50 border-rose-200 text-rose-800"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          onExaminationChange({
                            ...examination,
                            general: {
                              ...examination.general,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}

                <div className="col-span-1">
                  <input
                    type="text"
                    value={examination.general.edema}
                    onChange={(e) =>
                      onExaminationChange({
                        ...examination,
                        general: { ...examination.general, edema: e.target.value },
                      })
                    }
                    placeholder="Pedal Edema (e.g. Mild +1)"
                    className="w-full p-2 text-xs rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Systemic Examination */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Cardiovascular System (CVS)
                </label>
                <input
                  type="text"
                  value={examination.systems.cvs}
                  onChange={(e) =>
                    onExaminationChange({
                      ...examination,
                      systems: { ...examination.systems, cvs: e.target.value },
                    })
                  }
                  placeholder="S1 S2 heard, regular rate, no murmurs"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Respiratory System (RS)
                </label>
                <input
                  type="text"
                  value={examination.systems.rs}
                  onChange={(e) =>
                    onExaminationChange({
                      ...examination,
                      systems: { ...examination.systems, rs: e.target.value },
                    })
                  }
                  placeholder="Bilateral vesicular breath sounds, no wheezing"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Abdomen Examination (PA)
                </label>
                <input
                  type="text"
                  value={examination.systems.pa}
                  onChange={(e) =>
                    onExaminationChange({
                      ...examination,
                      systems: { ...examination.systems, pa: e.target.value },
                    })
                  }
                  placeholder="Soft, non-tender, no hepatomegaly, normal bowel sounds"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Central Nervous System (CNS)
                </label>
                <input
                  type="text"
                  value={examination.systems.cns}
                  onChange={(e) =>
                    onExaminationChange({
                      ...examination,
                      systems: { ...examination.systems, cns: e.target.value },
                    })
                  }
                  placeholder="Conscious, oriented, cranial nerves intact, sensory normal"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Specific Examination Findings & Physician Notes
              </label>
              <textarea
                value={examination.doctor_notes || ""}
                onChange={(e) =>
                  onExaminationChange({ ...examination, doctor_notes: e.target.value })
                }
                rows={2}
                placeholder="Specific clinical findings: e.g. Monofilament 10g sensory reduction over distal 1st metatarsal, peripheral pulses intact..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        {/* TAB D: Medical History */}
        {activeTab === "history" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Past Medical Illnesses
                </label>
                <textarea
                  value={medicalHistory.illnesses || ""}
                  onChange={(e) =>
                    onMedicalHistoryChange({ ...medicalHistory, illnesses: e.target.value })
                  }
                  rows={2}
                  placeholder="Previous infections, hospital admissions, infectious diseases..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Past Surgeries & Procedures
                </label>
                <textarea
                  value={medicalHistory.surgeries || ""}
                  onChange={(e) =>
                    onMedicalHistoryChange({ ...medicalHistory, surgeries: e.target.value })
                  }
                  rows={2}
                  placeholder="e.g. Laparoscopic appendectomy in 2018, cataract surgery left eye 2024..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Family History</label>
                <input
                  type="text"
                  value={medicalHistory.family_history || ""}
                  onChange={(e) =>
                    onMedicalHistoryChange({ ...medicalHistory, family_history: e.target.value })
                  }
                  placeholder="e.g. Father had CAD and T2DM; Mother has osteoporosis"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Social History</label>
                <input
                  type="text"
                  value={
                    typeof medicalHistory.social_history === "string"
                      ? medicalHistory.social_history
                      : `${medicalHistory.social_history?.smoking || "Non-smoker"}, ${medicalHistory.social_history?.diet || "Normal diet"}`
                  }
                  onChange={(e) =>
                    onMedicalHistoryChange({
                      ...medicalHistory,
                      social_history: {
                        smoking: e.target.value,
                        alcohol: "Occasional",
                        diet: "Balanced",
                        activity: "Sedentary",
                      },
                    })
                  }
                  placeholder="Smoking status, alcohol, diet, occupational exposures"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Current Medications</label>
              <div className="flex flex-wrap gap-2">
                {medicalHistory.current_medications?.map((med: any, i: number) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800"
                  >
                    {typeof med === "string" ? med : med.name || JSON.stringify(med)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB E: Multi-tier Diagnosis & Standardized Terminology */}
        {activeTab === "diagnosis" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Standardized ICD-10 Search Bar */}
            <div className="relative">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-purple-600" />
                  ICD-10 / SNOMED Standardized Clinical Terminology Lookup
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Standardized nomenclature prevents uncontrolled free text errors
                </span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={icdSearch}
                  onChange={(e) => {
                    setIcdSearch(e.target.value);
                    setShowIcdDropdown(true);
                  }}
                  onFocus={() => setShowIcdDropdown(true)}
                  placeholder="Search disease by name or ICD code (e.g. Type 2 Diabetes, Hypertension, Asthma)..."
                  className="w-full px-4 py-2.5 pl-10 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>

              {showIcdDropdown && filteredIcd.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {filteredIcd.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleAddDiagnosisFromIcd(item)}
                      className="w-full px-4 py-2.5 text-left text-xs hover:bg-purple-50 flex items-center justify-between transition-colors"
                    >
                      <span className="font-semibold text-slate-900">{item.name}</span>
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                        {item.code}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Diagnoses List Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-2">
                Active Encoded Diagnoses List ({diagnosesList.length})
              </h4>

              {diagnosesList.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                  No standardized diagnoses added yet. Search above or enter primary diagnosis below.
                </div>
              ) : (
                <div className="space-y-2">
                  {diagnosesList.map((d, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <select
                          value={d.type}
                          onChange={(e) => {
                            const updated = [...diagnosesList];
                            updated[index].type = e.target.value as any;
                            onDiagnosesListChange(updated);
                          }}
                          className="px-2 py-1 rounded-md text-[11px] font-bold bg-white border border-slate-300 text-slate-800"
                        >
                          <option value="Primary">Primary</option>
                          <option value="Secondary">Secondary</option>
                          <option value="Differential">Differential</option>
                        </select>

                        {d.code && (
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                            {d.code}
                          </span>
                        )}

                        <span className="font-bold text-slate-900">{d.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={d.status}
                          onChange={(e) => {
                            const updated = [...diagnosesList];
                            updated[index].status = e.target.value as any;
                            onDiagnosesListChange(updated);
                          }}
                          className="px-2 py-1 rounded-md text-[11px] font-semibold bg-white border border-slate-300 text-slate-700"
                        >
                          <option value="Confirmed">Confirmed</option>
                          <option value="Provisional">Provisional</option>
                          <option value="Refuted">Refuted</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = diagnosesList.filter((_, i) => i !== index);
                            onDiagnosesListChange(updated);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Primary Diagnosis String Input */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Primary Clinical Diagnosis Summary <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={diagnosisText}
                onChange={(e) => onDiagnosisTextChange(e.target.value)}
                placeholder="e.g. Type 2 Diabetes Mellitus with Mild Peripheral Neuropathy"
                className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
              />
            </div>

            {/* Doctor Clinical Notes */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Doctor Consultation Notes, Diet & Lifestyle Advice
              </label>
              <textarea
                value={clinicalNotes}
                onChange={(e) => onClinicalNotesChange(e.target.value)}
                rows={3}
                placeholder="Clinical impressions, dietary recommendations, exercise precautions, red flag warning signs explained to patient..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 bg-white font-sans focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
