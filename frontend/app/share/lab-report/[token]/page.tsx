"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  FileDown, 
  Printer, 
  Building2, 
  Lock, 
  CheckCircle2, 
  Calendar,
  Layers,
  ArrowRight
} from "lucide-react";
import { labReportsAPI, LabReport, SharedLabReportResponse } from "@/lib/api/lab-reports";
import { LabReportDocumentView } from "@/components/labs/LabReportDocumentView";

export default function PublicSharedLabReportPage() {
  const params = useParams();
  const token = params?.token as string;

  const [sharedData, setSharedData] = useState<SharedLabReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRevokedOrExpired, setIsRevokedOrExpired] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchSharedReport = async () => {
      try {
        setLoading(true);
        setError(null);
        setIsRevokedOrExpired(false);

        const res = await labReportsAPI.getPublicShare(token);
        if (res.success && res.data) {
          setSharedData(res.data);
        } else if (res.error?.code === "SHARE_LINK_EXPIRED_OR_REVOKED") {
          setIsRevokedOrExpired(true);
          setError(res.error?.message || "This secure lab report share link has expired or been revoked by the patient.");
        } else {
          setError(res.message || "Failed to load shared laboratory report.");
        }
      } catch (err: any) {
        console.error("Failed to load shared report", err);
        setError(err?.message || "Invalid or unreachable laboratory report share link.");
      } finally {
        setLoading(false);
      }
    };

    fetchSharedReport();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased p-4 sm:p-8">
      {/* Shared Recipient Public Banner */}
      <div className="max-w-4xl mx-auto mb-6 print:hidden">
        <div className="rounded-2xl border border-teal-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 rounded-xl shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                OneHealth ID Secure Clinical Share Portal
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {sharedData?.share_metadata?.recipient_name 
                  ? `Shared for: ${sharedData.share_metadata.recipient_name}` 
                  : "Authorized Diagnostic Record Access"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono self-end sm:self-auto">
            <span>Share Token: {token?.slice(0, 14)}...</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-20 bg-white dark:bg-slate-900 rounded-2xl animate-pulse" />
          <div className="h-96 bg-white dark:bg-slate-900 rounded-3xl animate-pulse" />
        </div>
      ) : isRevokedOrExpired ? (
        <div className="max-w-xl mx-auto p-8 sm:p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Share Link Expired or Revoked
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
            This secure, time-limited link is no longer active. The patient may have revoked access or the authorized viewing period has ended under OneHealth ID privacy policy.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
            >
              OneHealth ID Homepage <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : error || !sharedData?.report ? (
        <div className="max-w-xl mx-auto p-8 sm:p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Laboratory Report Unavailable
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {error || "The requested laboratory diagnostic report could not be retrieved."}
          </p>
        </div>
      ) : (
        <LabReportDocumentView
          report={sharedData.report}
          isSharedView={true}
        />
      )}
    </div>
  );
}
