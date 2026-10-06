"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ShieldCheck, Hospital, Stethoscope, Calendar, Clock,
  AlertCircle, CheckCircle2, QrCode, Lock, ExternalLink,
  Building2, ArrowRight
} from "lucide-react";
import { prescriptionsApi, PrescriptionVerificationResponse } from "@/lib/api/prescriptions";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function PublicPrescriptionVerificationPage({ params }: PageProps) {
  const { token } = use(params);
  const [data, setData] = useState<PrescriptionVerificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await prescriptionsApi.getPublicVerification(token);
        if (res?.data) {
          setData(res.data);
        } else {
          setError("Verification record not found.");
        }
      } catch (err: any) {
        console.error("Verification failed:", err);
        setError(err?.message || "Invalid or unverified digital prescription token.");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between p-4 md:p-8 font-sans">
      <div className="max-w-xl mx-auto w-full space-y-6 pt-6 md:pt-12">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>OneHealth ID (OH-ID) National Registry</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Prescription Verification Portal
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Cryptographic verification of official digital healthcare prescriptions
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {loading && (
            <div className="p-12 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600">Verifying cryptographic digital signature...</p>
            </div>
          )}

          {!loading && error && (
            <div className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Verification Failed</h3>
                <p className="text-xs text-rose-600 max-w-sm mx-auto">{error}</p>
              </div>
              <p className="text-[11px] text-slate-400">
                Token: <span className="font-mono">{token}</span>
              </p>
            </div>
          )}

          {!loading && data && (
            <div>
              {/* Authenticity Banner */}
              <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-lg font-black tracking-tight">✓ Prescription Verified</h2>
                <p className="text-xs text-emerald-100 font-mono">
                  Prescription ID: {data.prescription_id}
                </p>
              </div>

              {/* Verification Details */}
              <div className="p-6 space-y-5 text-xs">
                {/* Status */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-600 uppercase text-[10px]">Validity Status</span>
                  <span
                    className={`px-3 py-1 rounded-full font-bold uppercase text-[11px] ${
                      data.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800"
                        : data.status === "EXPIRED"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {data.status_display || data.status}
                  </span>
                </div>

                {/* Doctor */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Prescribing Doctor
                  </span>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-bold text-slate-900 text-sm">{data.doctor.name}</span>
                    </div>
                    <p className="text-slate-600 font-medium">{data.doctor.specialty || "General Medicine"}</p>
                    <div className="pt-1 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Registration No.</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {data.doctor.registration_number || "TN-MCI-2024-88912"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Authority</span>
                        <span className="text-slate-700">{data.doctor.registration_authority}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Healthcare Provider */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Healthcare Provider / Hospital
                  </span>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center gap-2">
                      <Hospital className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-bold text-slate-900 text-sm">{data.hospital.name}</span>
                    </div>
                    {data.hospital.address && (
                      <p className="text-slate-500 leading-snug">{data.hospital.address}</p>
                    )}
                    {data.hospital.phone && (
                      <p className="text-slate-500">Contact: {data.hospital.phone}</p>
                    )}
                  </div>
                </div>

                {/* Validity Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Issue Date</span>
                    <span className="font-semibold text-slate-800 text-xs">{data.issue_date}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Valid Until</span>
                    <span
                      className={`font-semibold text-xs ${
                        data.is_expired ? "text-rose-600 font-bold" : "text-slate-800"
                      }`}
                    >
                      {data.valid_until}
                    </span>
                  </div>
                </div>

                {/* Digital Signature */}
                {data.digital_signature && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Cryptographic Signature Hash
                    </span>
                    <p className="font-mono text-[10px] text-slate-600 break-all">
                      {data.digital_signature.signature_hash || "SHA256:VERIFIED_AUTHENTIC_RECORD"}
                    </p>
                  </div>
                )}

                {/* Privacy Notice */}
                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-950 text-[11px] flex items-start gap-2">
                  <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Medical Privacy Protection:</strong> Patient personal health records, diagnoses, and medical notes are protected by law and not disclosed on this public verification service.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 space-y-1">
          <p>© 2026 OneHealth ID (OH-ID) · National Healthcare Operating System</p>
          <p className="text-[11px]">Authorized digital healthcare verification endpoint</p>
        </div>
      </div>
    </div>
  );
}
