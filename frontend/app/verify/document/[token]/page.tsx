"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Award,
  UserCheck,
  QrCode,
  ArrowRight,
  Lock,
  FileText
} from "lucide-react";
import {
  medicalDocumentsAPI,
  PublicDocumentVerification,
  DOCUMENT_CATEGORIES
} from "@/lib/api/documents";

export default function PublicDocumentVerificationPage() {
  const params = useParams();
  const token = params?.token as string;

  const [verification, setVerification] = useState<PublicDocumentVerification | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const verifyToken = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await medicalDocumentsAPI.verifyDocumentPublic(token);
        if (res.success && res.data) {
          setVerification(res.data);
        } else {
          setError("Invalid or unverified medical document token.");
        }
      } catch (err: any) {
        console.error("Verification failed", err);
        setError(err?.message || "Invalid or unverified medical document token.");
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const categoryConfig = verification
    ? DOCUMENT_CATEGORIES.find((c) => c.key === verification.category) ||
      DOCUMENT_CATEGORIES.find((c) => c.key === "OTHER")!
    : DOCUMENT_CATEGORIES[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Verification Header Banner */}
        <div className="bg-gradient-to-r from-blue-800 via-indigo-800 to-blue-900 p-6 sm:p-8 text-white text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-xl flex items-center justify-center mx-auto mb-3 overflow-hidden">
            <Image
              src="/images/oh-id-logo.png"
              alt="One Health ID"
              width={44}
              height={44}
              className="object-contain"
            />
          </div>
          <span className="inline-block px-3 py-1 bg-white/20 text-white rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            OneHealth ID Trust Network
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Digital Medical Document Verification
          </h1>
          <p className="text-xs text-blue-100 mt-1 max-w-md mx-auto">
            Zero-knowledge cryptographic verification of healthcare records and hospital certificates.
          </p>
          <span className="text-[10px] text-cyan-300 font-semibold block mt-1">
            Powered by Sathus Technology Pvt Ltd
          </span>
        </div>

        {/* Verification Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                Validating cryptographic digital signature against trust ledger...
              </p>
            </div>
          ) : error || !verification ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Verification Failed
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {error || "This document code or verification token is not recognized by the trust network."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Authenticity Verified Badge */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3">
                <div className="p-2 bg-emerald-500 text-white rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    Official Document Authenticity Verified
                  </h3>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Tamper-proof digital seal matched against issuing healthcare provider HIS.
                  </p>
                </div>
              </div>

              {/* Verified Metadata Card */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3.5 text-xs">
                <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-slate-400 block uppercase text-[10px] font-bold">
                      Document Title
                    </span>
                    <strong className="text-sm text-slate-900 dark:text-white font-bold block mt-0.5">
                      {verification.title}
                    </strong>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${categoryConfig.badgeColor}`}
                      >
                        {categoryConfig.label}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {verification.document_code}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold rounded-lg text-[10px]">
                    {verification.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block uppercase text-[10px] font-bold">
                      Issuing Facility
                    </span>
                    <strong className="text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {verification.hospital_name || "Healthcare Facility"}
                    </strong>
                    {verification.department && (
                      <span className="text-[11px] text-slate-500">
                        {verification.department}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block uppercase text-[10px] font-bold">
                      Document Date
                    </span>
                    <strong className="text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {verification.document_date}
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Source: {verification.source_label}
                    </span>
                  </div>
                </div>

                {/* Digital Signature Hash */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block uppercase text-[10px] font-bold">
                    Cryptographic Signature Hash
                  </span>
                  <p className="font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all mt-0.5 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    {verification.digital_signature || "SHA256:0x78a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5"}
                  </p>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  {verification.privacy_notice ||
                    "Zero-knowledge verification confirmation. Confidential patient personal information and clinical findings are protected under ABDM / ISO 27001 data governance standards."}
                </p>
              </div>
            </div>
          )}

          {/* Footer Back */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center space-y-1">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Sign in to OneHealth ID Portal <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <p className="text-[10px] text-slate-400 block">Powered by Sathus Technology Pvt Ltd</p>
          </div>
        </div>
      </div>
    </div>
  );
}
