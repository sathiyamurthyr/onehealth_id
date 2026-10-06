"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck, Shield, Heart, ArrowLeft, RefreshCw,
  AlertCircle, CheckCircle2, FileText, Info, Building2
} from "lucide-react";
import { api, PatientInsurance } from "@/lib/api";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function PatientInsurancePage() {
  const [insurances, setInsurances] = useState<PatientInsurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.patient.getInsurance();
      setInsurances(res?.data || []);
    } catch (err: any) {
      console.error("Failed to load insurance", err);
      setError(err?.message || "Failed to load health insurance policies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
          <span className="text-xs text-slate-400">Health Coverage & TPA</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Health Insurance</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Verified health insurance policies, TPA integration, and cashless hospitalization coverage.
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

        {/* Insurance Cards */}
        {loading ? (
          <div className="space-y-4">
            <div className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
          </div>
        ) : insurances.length === 0 ? (
          <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
            <Shield className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No active insurance policy on file</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You can present your insurance policy card or Ayushman Bharat health card at hospital registration for cashless integration.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {insurances.map((ins) => (
              <div
                key={ins.id}
                className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-white/10 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs font-bold text-cyan-300 uppercase tracking-widest">
                        {ins.policy_type || "Comprehensive Health Coverage"}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white">{ins.provider_name}</h3>
                    <p className="text-xs font-mono text-slate-300 mt-1">Policy #{ins.policy_number}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold self-start sm:self-auto">
                    {ins.status || "Active Coverage"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 text-xs relative z-10">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Sum Insured</span>
                    <p className="text-base font-bold text-white font-mono mt-0.5">
                      ₹{Number(ins.coverage_amount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Valid From</span>
                    <p className="text-white font-semibold mt-0.5">
                      {ins.valid_from ? new Date(ins.valid_from).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Active"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Valid Until</span>
                    <p className="text-white font-semibold mt-0.5">
                      {ins.valid_until ? new Date(ins.valid_until).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Annual"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">TPA Partner</span>
                    <p className="text-cyan-300 font-semibold mt-0.5">{ins.tpa_name || "Direct Cashless Desk"}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 relative z-10">
                  <span>Cashless Authorization Protocol Active</span>
                  <span className="font-mono text-cyan-300">ABDM Health Claim Support</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cashless Guidance Info Box */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-slate-900">Cashless Claims at Accredited Hospitals:</strong> During hospital admission or OPD procedures, show your OneHealth ID. Hospital billing desks will automatically link your verified insurance policy for real-time pre-authorization and cashless claims.
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
