"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck, Share2, AlertCircle, Clock, Lock,
  FileDown, Printer, ArrowLeft, CheckCircle2
} from "lucide-react";
import { prescriptionsApi, PatientPrescriptionDetail } from "@/lib/api/prescriptions";
import { PrescriptionDocumentView } from "@/components/prescriptions/PrescriptionDocumentView";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function SharedPrescriptionRecipientPage({ params }: PageProps) {
  const { token } = use(params);
  const [prescription, setPrescription] = useState<PatientPrescriptionDetail | null>(null);
  const [shareMeta, setShareMeta] = useState<{
    access_type?: string;
    expires_at?: string;
    recipient_name?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedPrescription = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await prescriptionsApi.getPublicShare(token);
        if (res?.data) {
          const rxData = res.data;
          setPrescription(rxData);
          setShareMeta({
            access_type: rxData.share_metadata?.access_level || "VIEW_ONLY",
            expires_at: rxData.share_metadata?.expires_at,
            recipient_name: rxData.share_metadata?.recipient_name,
          });
        } else {
          setError("Shared prescription record not found or inaccessible.");
        }
      } catch (err: any) {
        console.error("Failed to load shared prescription:", err);
        setError(err?.message || "This secure share link has expired, been revoked, or is invalid.");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSharedPrescription();
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-16">
      {/* Header bar */}
      <div className="bg-slate-900 text-white px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white p-0.5 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
              <Image
                src="/images/oh-id-logo.png"
                alt="One Health ID"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-100 block leading-tight">OneHealth ID (OH-ID)</span>
              <span className="text-[10px] text-cyan-400 block font-semibold">Secure Share • Powered by Sathus Technology Pvt Ltd</span>
            </div>
          </div>

          {shareMeta && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
              <Lock className="w-3.5 h-3.5 text-teal-400" />
              <span>
                {shareMeta.access_type === "view_and_download" ? "View & Download Access" : "View Only Access"}
              </span>
              {shareMeta.expires_at && (
                <span className="text-slate-400 border-l border-slate-700 pl-2">
                  Expires: {new Date(shareMeta.expires_at).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-3xl p-12 text-center shadow-lg border border-slate-200 space-y-4 max-w-lg mx-auto mt-12">
            <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Decrypting Secure Prescription...</h3>
              <p className="text-xs text-slate-500">Validating authorized access token and integrity</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-white rounded-3xl p-8 text-center shadow-lg border border-slate-200 space-y-4 max-w-lg mx-auto mt-12">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-black text-slate-900">Access Restricted</h2>
              <p className="text-xs text-rose-600 leading-relaxed max-w-sm mx-auto">{error}</p>
            </div>
            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
              <p>For patient safety and medical privacy, secure share links are time-limited and can be revoked at any time.</p>
              <p>Please contact the patient or healthcare provider to request a fresh secure link.</p>
            </div>
          </div>
        )}

        {/* Success / Document View */}
        {!loading && prescription && (
          <div className="space-y-4">
            {/* Share Notice Banner */}
            <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 flex items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  Authorized secure prescription view for{" "}
                  <strong>{shareMeta?.recipient_name || "Recipient"}</strong>.
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-200/70 text-teal-800 px-2 py-0.5 rounded-md">
                Verified Share
              </span>
            </div>

            {/* Document Render */}
            <PrescriptionDocumentView
              prescription={prescription}
              isSharedView={true}
              allowDownload={shareMeta?.access_type === "view_and_download"}
            />
          </div>
        )}
      </div>
    </div>
  );
}
