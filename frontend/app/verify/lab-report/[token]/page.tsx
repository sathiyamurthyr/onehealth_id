"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
  Lock
} from "lucide-react";
import { labReportsAPI, LabReportPublicVerification } from "@/lib/api/lab-reports";

export default function PublicLabReportVerificationPage() {
  const params = useParams();
  const token = params?.token as string;

  const [verification, setVerification] = useState<LabReportPublicVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const verifyToken = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await labReportsAPI.getPublicVerification(token);
        if (res.success && res.data) {
          setVerification(res.data);
        } else {
          setError("Invalid laboratory report verification token.");
        }
      } catch (err: any) {
        console.error("Verification failed", err);
        setError(err?.message || "Invalid or unverified laboratory report token.");
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Verification Header */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 p-6 sm:p-8 text-white text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-8 h-8 text-teal-300" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Digital Laboratory Report Verification
          </h1>
          <p className="text-xs text-teal-100/90 mt-1 max-w-sm mx-auto">
            OneHealth ID Zero-Knowledge Cryptographic Authenticity Validation
          </p>
        </div>

        {/* Verification Content */}
        <div className="p-6 sm:p-8">
          {loading ? (
            <div className="space-y-4 py-8 text-center">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Validating cryptographic signature...</p>
            </div>
          ) : error || !verification?.is_valid ? (
            <div className="text-center space-y-4 py-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Authenticity Verification Failed
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {error || "The provided token does not match any certified digital laboratory record in the OneHealth ID registry."}
              </p>
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Authenticity Verified Badge */}
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-emerald-950 dark:text-emerald-300">
                    Official Authenticated Laboratory Record
                  </h3>
                  <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                    Signed and certified by a registered pathologist with valid accreditation.
                  </p>
                </div>
              </div>

              {/* Verified Metadata Attributes */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs">
                
                <div className="p-3.5 flex justify-between items-center">
                  <span className="text-slate-400">Diagnostic Test:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{verification.test_name}</span>
                </div>

                <div className="p-3.5 flex justify-between items-center">
                  <span className="text-slate-400">Testing Laboratory:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{verification.laboratory_name}</span>
                </div>

                <div className="p-3.5 flex justify-between items-center">
                  <span className="text-slate-400">Accreditation:</span>
                  <span className="font-medium text-teal-700 dark:text-teal-400 text-right text-[11px]">{verification.laboratory_accreditation || "NABL ISO 15189:2022"}</span>
                </div>

                <div className="p-3.5 flex justify-between items-center">
                  <span className="text-slate-400">Report Status:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{verification.status_display}</span>
                </div>

                <div className="p-3.5 flex justify-between items-center">
                  <span className="text-slate-400">Issued On:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{verification.report_date}</span>
                </div>

                <div className="p-3.5 flex justify-between items-center">
                  <span className="text-slate-400">Certifying Pathologist:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{verification.pathologist?.name}</span>
                </div>

                <div className="p-3.5 flex justify-between items-center font-mono">
                  <span className="text-slate-400 font-sans">Report ID:</span>
                  <span className="text-slate-800 dark:text-slate-200">{verification.order_number}</span>
                </div>
              </div>

              {/* Zero-Knowledge Privacy Note */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                <Lock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <span>
                  <strong>Zero-Knowledge Privacy Guarantee:</strong> Individual patient names, confidential numerical values, and private clinical notes are withheld from public verification to safeguard health data privacy under ABDM/HIPAA guidelines.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Verification Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>OneHealth ID Trust Network</span>
          <Link href="/" className="text-teal-600 hover:underline font-semibold flex items-center gap-1">
            Learn More <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
