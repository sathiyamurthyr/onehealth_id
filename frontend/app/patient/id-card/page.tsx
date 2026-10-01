"use client";

import React from "react";
import { QrCode, ShieldCheck, Download, Building2, Printer, Share2, Heart, User } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PatientIdCardPage() {
  const { workspace, user } = useWorkspace();

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back */}
        <Link href="/patient" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition">
          <ArrowLeft className="w-4 h-4" /> Back to Health Dashboard
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">My OneHealth ID Card</h1>
          <p className="text-sm text-slate-500 mt-1">Your verified digital health identity pass. Show this QR code at any Kedar Hospital reception.</p>
        </div>

        {/* Digital ID Card */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-900 rounded-3xl p-6 sm:p-8 shadow-2xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />

          <div className="flex items-start justify-between gap-4 mb-6 relative">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                  <Heart className="w-4 h-4 text-cyan-300" />
                </div>
                <span className="text-xs font-bold tracking-widest uppercase text-blue-200">OneHealth ID</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{user?.name || user?.username || "Patient"}</h2>
              <p className="text-blue-200 text-sm mt-0.5 font-mono">{user?.username || "OH-2026-PATIENT"}</p>
            </div>

            {/* QR Code Placeholder */}
            <div className="bg-white p-3 rounded-2xl shadow-lg shrink-0">
              <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                <QrCode className="w-16 h-16 text-slate-800" />
              </div>
              <p className="text-[9px] text-center text-slate-500 mt-1 font-mono">SCAN TO VERIFY</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 relative">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-0.5">Primary Facility</p>
              <p className="text-sm font-semibold">{workspace?.hospital_name || "Kedar Hospital"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-0.5">Network</p>
              <p className="text-sm font-semibold">{workspace?.tenant_name || "Kedar Healthcare Group"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-0.5">Blood Group</p>
              <p className="text-sm font-semibold">B+</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-0.5">Identity Status</p>
              <p className="text-sm font-semibold text-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Verified
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 flex items-center justify-between text-[10px] text-blue-300 relative">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>ABDM Compliant • Cryptographically Secured</span>
            </div>
            <span className="font-mono">v1.0 • 2026</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button className="flex flex-col items-center gap-2 py-4 px-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-blue-300 transition text-center shadow-sm">
            <Download className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-semibold text-slate-700">Download PDF</span>
          </button>
          <button className="flex flex-col items-center gap-2 py-4 px-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-blue-300 transition text-center shadow-sm">
            <Printer className="w-5 h-5 text-slate-600" />
            <span className="text-xs font-semibold text-slate-700">Print Card</span>
          </button>
          <button className="flex flex-col items-center gap-2 py-4 px-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-blue-300 transition text-center shadow-sm">
            <Share2 className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-700">Share</span>
          </button>
        </div>

        {/* Security Notice */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-700">
          <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <span>
            <strong>Privacy Notice:</strong> This card is uniquely tied to your biometric identity. Do not share the QR code digitally with unknown parties. Scan only at Kedar Hospital reception desks to verify identity.
          </span>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
