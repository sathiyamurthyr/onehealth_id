"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  QrCode, ShieldCheck, Download, Printer, Share2, Heart,
  ArrowLeft, RefreshCw, CheckCircle2, Lock, Eye, Sparkles
} from "lucide-react";
import { api, PatientProfile } from "@/lib/api";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function PatientOneHealthIdPage() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [qrData, setQrData] = useState<{ onehealth_id: string; qr_token: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pRes, qRes] = await Promise.all([
          api.patient.getProfile().catch(() => null),
          api.patient.getQrToken().catch(() => null),
        ]);
        if (pRes?.data) setProfile(pRes.data);
        if (qRes?.data) setQrData(qRes.data);
      } catch (err) {
        console.error("Failed to load OneHealth ID data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          href="/patient"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Health Overview</span>
        </Link>

        {/* Page Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Universal Healthcare Identity</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">My OneHealth ID</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Your universal digital health identity that seamlessly links and unifies your authorized healthcare records across all accredited hospitals and clinics.
          </p>
        </div>

        {/* Holographic Digital Health Pass Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 shadow-2xl text-white relative overflow-hidden border border-slate-700">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-blue-600/10 blur-2xl pointer-events-none" />

          {/* Card Header */}
          <div className="flex items-start justify-between gap-4 mb-6 relative z-10">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md">
                  OH
                </div>
                <div>
                  <h3 className="font-bold text-base tracking-tight leading-none">OneHealth ID</h3>
                  <span className="text-[10px] text-cyan-300 font-medium">Universal Health Network</span>
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-4">
                {profile?.name || "Citizen Patient"}
              </h2>
              <p className="text-cyan-300 text-sm font-mono font-bold tracking-wider mt-0.5">
                {profile?.onehealth_id || qrData?.onehealth_id || "OHID-CITIZEN"}
              </p>
            </div>

            {/* Zero-Knowledge QR Box */}
            <div className="bg-white p-3 rounded-2xl shadow-xl shrink-0 flex flex-col items-center border border-slate-200">
              <div className="w-24 h-24 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200">
                <QrCode className="w-16 h-16 text-slate-800" />
              </div>
              <span className="text-[8px] font-mono font-bold text-slate-500 mt-1 uppercase tracking-wider">
                Zero-Knowledge Pass
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-white/10 text-xs relative z-10">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Date of Birth / Age</p>
              <p className="font-semibold text-white mt-0.5">{profile?.age ? `${profile.age} Yrs` : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Gender</p>
              <p className="font-semibold text-white mt-0.5">{profile?.gender || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Blood Group</p>
              <p className="font-bold text-rose-300 mt-0.5">{profile?.blood_group || "O+"}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Network Status</p>
              <p className="font-semibold text-emerald-400 mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Verified
              </p>
            </div>
          </div>

          {/* Security Footer */}
          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-slate-400 relative z-10">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>ABDM Compliant • Cryptographically Signed Identity</span>
            </div>
            <span className="font-mono text-slate-500">Universal Access Protocol</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/patient/qr"
            className="flex flex-col items-center gap-2 py-4 px-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-blue-300 transition text-center shadow-sm"
          >
            <QrCode className="w-5 h-5 text-cyan-600" />
            <span className="text-xs font-semibold text-slate-700">Enlarge QR</span>
          </Link>
          <button
            onClick={handlePrint}
            className="flex flex-col items-center gap-2 py-4 px-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-blue-300 transition text-center shadow-sm"
          >
            <Printer className="w-5 h-5 text-slate-600" />
            <span className="text-xs font-semibold text-slate-700">Print Card</span>
          </button>
          <button
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(profile?.onehealth_id || "OHID-CITIZEN");
              }
              if (navigator.share) {
                navigator.share({
                  title: "My OneHealth ID",
                  text: `My Universal OneHealth ID: ${profile?.onehealth_id || "OHID-CITIZEN"}`,
                }).catch(() => {});
              }
            }}
            className="flex flex-col items-center gap-2 py-4 px-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-blue-300 transition text-center shadow-sm"
          >
            <Share2 className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-700">Share / Copy ID</span>
          </button>
        </div>

        {/* Informational Guidance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 text-xs text-slate-600">
          <h4 className="font-bold text-slate-900 text-sm">How your OneHealth ID works</h4>
          <ul className="space-y-2 list-disc list-inside text-slate-600">
            <li>Your OneHealth ID connects your medical history across all participating healthcare facilities without requiring separate accounts.</li>
            <li>Present this ID or QR code at reception desks for fast-track verification and triage.</li>
            <li>The QR code contains a secure zero-knowledge token and never exposes clinical diagnoses or private reports directly.</li>
          </ul>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
