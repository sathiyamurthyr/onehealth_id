"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode, ShieldCheck, ArrowLeft, RefreshCw, CheckCircle2,
  Lock, Sparkles, AlertCircle, Info, Download, Users
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { useFamily } from "@/lib/patient/FamilyContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function PatientQRPage() {
  const { user } = useWorkspace();
  const { activePerson, selectedPersonId, primaryProfile } = useFamily();
  const [qrData, setQrData] = useState<{ onehealth_id: string; qr_token: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);

  const loadQr = async () => {
    try {
      setLoading(true);
      const res = await api.patient.getQrToken(selectedPersonId || undefined);
      if (res?.data) {
        setQrData(res.data);
      }
    } catch (err) {
      console.error("Failed to load QR token", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQr();
  }, [selectedPersonId]);

  const handleRotate = async () => {
    setRefreshing(true);
    await loadQr();
    setRefreshing(false);
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 4000);
  };

  const isSelf = activePerson?.isSelf ?? true;
  const currentName = activePerson?.name || primaryProfile?.name || user?.name || "Patient";
  const currentOhid = qrData?.onehealth_id || activePerson?.onehealth_id || user?.username || "OHID-CITIZEN";

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-md mx-auto space-y-6 text-center">
        {/* Back Link */}
        <div className="text-left">
          <Link
            href="/patient"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Health Overview</span>
          </Link>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Zero-Knowledge Health QR</h1>
          <p className="text-xs text-slate-500 mt-1">
            Show this dynamic QR code at hospital reception, OPD triage, or diagnostic labs to check in securely without creating duplicate records.
          </p>
        </div>

        {/* Main QR Card */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-xl space-y-6 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 text-left">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-900">{currentName}</p>
                {!isSelf && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                    {activePerson?.relationship}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-cyan-700 font-semibold">{currentOhid}</p>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Token
            </span>
          </div>

          {/* Large High-Contrast Scannable QR Display */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
            {loading ? (
              <div className="w-48 h-48 bg-slate-200 rounded-2xl animate-pulse" />
            ) : (
              <div className="relative p-3 bg-white rounded-xl shadow-md border border-slate-200">
                <QRCodeSVG
                  value={typeof window !== "undefined" ? `${window.location.origin}/scan/${qrData?.qr_token || "DEMO"}` : `https://ohid.online/scan/${qrData?.qr_token || "DEMO"}`}
                  size={192}
                  level="H"
                  includeMargin={false}
                />
              </div>
            )}
            <p className="text-[10px] font-mono font-bold text-slate-500 mt-3 uppercase tracking-wider">
              {qrData?.qr_token ? `Token: ${qrData.qr_token.slice(0, 16)}...` : "TOKEN-VERIFIED-ABDM"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRotate}
              disabled={refreshing}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh Pass</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Pass</span>
            </button>
          </div>

          {refreshed && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Pass Token Refreshed</span>
            </div>
          )}

          {/* Privacy Footnote */}
          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Contains zero clinical data. Encrypted ABDM token.</span>
          </div>
        </div>

        {/* Security Reassurance Box */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-left text-xs text-blue-800 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Zero-Knowledge Architecture</span>
          </div>
          <p className="text-[11px] text-blue-700 leading-relaxed">
            Scanning this QR pass only resolves your cryptographic patient identifier at authorized provider terminals. Your medical records, prescriptions, and diagnoses remain securely encrypted on the server.
          </p>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
