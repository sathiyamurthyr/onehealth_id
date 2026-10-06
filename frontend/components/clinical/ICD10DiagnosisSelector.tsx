"use client";

import React, { useState } from "react";
import { Plus, X, Search, Check, ShieldCheck, Tag } from "lucide-react";

export interface DiagnosisEntry {
  code?: string;
  description: string;
  tier: "PRIMARY" | "SECONDARY" | "PROVISIONAL" | "CONFIRMED";
  notes?: string;
}

const COMMON_ICD10_CODES = [
  { code: "E11.9", description: "Type 2 diabetes mellitus without complications" },
  { code: "I10", description: "Essential (primary) hypertension" },
  { code: "K29.7", description: "Gastritis, unspecified" },
  { code: "K21.9", description: "Gastro-esophageal reflux disease without esophagitis" },
  { code: "K30", description: "Functional dyspepsia" },
  { code: "R10.9", description: "Unspecified abdominal pain" },
  { code: "J06.9", description: "Acute upper respiratory infection, unspecified" },
  { code: "J45.9", description: "Asthma, unspecified" },
  { code: "M54.5", description: "Low back pain" },
  { code: "N39.0", description: "Urinary tract infection, site not specified" },
  { code: "I25.1", description: "Atherosclerotic heart disease of native coronary artery" },
  { code: "A09", description: "Infectious gastroenteritis and colitis, unspecified" },
  { code: "E78.5", description: "Hyperlipidemia, unspecified" },
  { code: "F41.9", description: "Anxiety disorder, unspecified" },
];

interface ICD10DiagnosisSelectorProps {
  diagnoses: DiagnosisEntry[];
  onChange: (updated: DiagnosisEntry[]) => void;
  readOnly?: boolean;
}

export function ICD10DiagnosisSelector({
  diagnoses,
  onChange,
  readOnly = false,
}: ICD10DiagnosisSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<"PRIMARY" | "SECONDARY" | "PROVISIONAL" | "CONFIRMED">("PRIMARY");
  const [customText, setCustomText] = useState("");

  const filteredCodes = searchQuery
    ? COMMON_ICD10_CODES.filter(
        (c) =>
          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : COMMON_ICD10_CODES.slice(0, 6);

  const addDiagnosis = (code: string | undefined, description: string) => {
    if (!description.trim()) return;
    const exists = diagnoses.some((d) => d.description.toLowerCase() === description.toLowerCase());
    if (exists) return;

    onChange([
      ...diagnoses,
      {
        code,
        description: description.trim(),
        tier: selectedTier,
      },
    ]);
    setSearchQuery("");
    setCustomText("");
  };

  const removeDiagnosis = (index: number) => {
    if (readOnly) return;
    onChange(diagnoses.filter((_, i) => i !== index));
  };

  const tierColors = {
    PRIMARY: "bg-indigo-50 text-indigo-700 border-indigo-200",
    SECONDARY: "bg-blue-50 text-blue-700 border-blue-200",
    PROVISIONAL: "bg-amber-50 text-amber-700 border-amber-200",
    CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Clinical Diagnosis (ICD-10 Coded)</h3>
            <p className="text-[11px] text-slate-500">
              Select or search standardized ICD-10 diagnoses with primary/provisional/confirmed tiers
            </p>
          </div>
        </div>

        {/* Tier Selector */}
        {!readOnly && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {(["PRIMARY", "SECONDARY", "PROVISIONAL", "CONFIRMED"] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedTier === tier
                    ? "bg-white text-indigo-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tier.charAt(0) + tier.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Diagnoses List */}
      {diagnoses.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {diagnoses.map((d, idx) => (
            <div
              key={idx}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium shadow-2xs ${tierColors[d.tier]}`}
            >
              {d.code && (
                <span className="font-mono font-bold px-1.5 py-0.5 rounded-md bg-white/80 border border-slate-300 text-[10px]">
                  {d.code}
                </span>
              )}
              <span className="font-semibold text-slate-900">{d.description}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                ({d.tier})
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeDiagnosis(idx)}
                  className="hover:bg-slate-200/60 p-0.5 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">No diagnoses recorded yet for this encounter.</p>
      )}

      {/* Search & Custom Input */}
      {!readOnly && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ICD-10 code or condition (e.g. Gastritis, E11, Hypertension)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50/50"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Or custom diagnosis..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDiagnosis(undefined, customText);
                  }
                }}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden w-48"
              />
              <button
                type="button"
                onClick={() => addDiagnosis(undefined, customText)}
                disabled={!customText.trim()}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Quick Suggestions Chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-center mr-1">
              Quick Suggestions:
            </span>
            {filteredCodes.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => addDiagnosis(item.code, item.description)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 hover:text-indigo-900 text-[11px] transition-colors cursor-pointer"
              >
                <span className="font-mono font-bold text-indigo-600 text-[10px]">{item.code}</span>
                <span>{item.description}</span>
                <Plus className="w-3 h-3 text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
