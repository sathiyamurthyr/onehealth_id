"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity, Stethoscope, Hospital, Calendar, ArrowLeft,
  RefreshCw, AlertCircle, CheckCircle2, ShieldCheck, HeartPulse
} from "lucide-react";
import { api, PatientDiagnosesProcedures } from "@/lib/api";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function PatientDiagnosesPage() {
  const [data, setData] = useState<PatientDiagnosesProcedures | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.patient.getDiagnoses();
      if (res?.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load diagnoses", err);
      setError(err?.message || "Failed to load clinical diagnoses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const diagnoses = data?.diagnoses || [];
  const procedures = data?.procedures || [];

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <Link
            href="/patient"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Health Overview</span>
          </Link>
          <span className="text-xs text-slate-400">Clinical Conditions Vault</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Diagnoses & Procedures</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Verified clinical diagnoses (ICD-10 coded) and medical procedures recorded across all hospital visits.
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

        {loading ? (
          <div className="space-y-4">
            <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
            <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
          </div>
        ) : (
          <>
            {/* Section 1: Diagnoses History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Diagnosed Medical Conditions ({diagnoses.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">ICD-10 Diagnostic Standards</span>
              </div>

              {diagnoses.length === 0 ? (
                <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                  No chronic or acute diagnoses on record.
                </div>
              ) : (
                <div className="space-y-3">
                  {diagnoses.map((d, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-5 shadow-sm space-y-3 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{d.name}</span>
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {d.code}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                          {d.status || "Confirmed"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Dr. {d.doctor_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Hospital className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{d.hospital_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{d.diagnosed_date ? new Date(d.diagnosed_date).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Recent"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Clinical Procedures & Interventions */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Medical Procedures & Interventions ({procedures.length})
                  </h3>
                </div>
              </div>

              {procedures.length === 0 ? (
                <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                  No surgical or minor therapeutic procedures recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {procedures.map((p, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{p.name}</h4>
                        <p className="text-slate-500 mt-0.5">{p.hospital_name} • Attending: {p.doctor_name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-500">
                          {p.date ? new Date(p.date).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Recent"}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                          {p.status || "Completed"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}
