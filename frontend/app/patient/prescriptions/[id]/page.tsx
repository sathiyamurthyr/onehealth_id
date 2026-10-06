"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, RefreshCw, Pill } from "lucide-react";
import { prescriptionsApi, PrescriptionRecord } from "@/lib/api/prescriptions";
import { useFamily } from "@/lib/patient/FamilyContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { PrescriptionDocumentView } from "@/components/prescriptions/PrescriptionDocumentView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PrescriptionDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id: prescriptionId } = use(params);
  const { selectedPersonId, canAccess } = useFamily();

  const [prescription, setPrescription] = useState<PrescriptionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasPermission = canAccess("view_prescriptions");

  const loadPrescription = async () => {
    if (!hasPermission) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await prescriptionsApi.getMyPrescriptionDetail(prescriptionId, selectedPersonId || undefined);
      if (res?.data) {
        setPrescription(res.data);
      } else {
        setError("Prescription record not found.");
      }
    } catch (err: any) {
      console.error("Failed to fetch prescription detail:", err);
      setError(err?.message || "Failed to load digital prescription document.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (prescriptionId) {
      loadPrescription();
    }
  }, [prescriptionId, selectedPersonId, hasPermission]);

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Navigation Breadcrumb */}
        <div className="no-print flex items-center justify-between pb-2 border-b border-slate-200">
          <Link
            href="/patient/prescriptions"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Prescriptions</span>
          </Link>
          <span className="text-xs text-slate-400 font-mono">
            Document ID: {prescriptionId}
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Loading digital prescription document...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-8 text-center rounded-2xl bg-white border border-rose-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Unable to Open Prescription</h3>
              <p className="text-xs text-rose-600 mt-1 max-w-sm mx-auto">{error}</p>
            </div>
            <Link
              href="/patient/prescriptions"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <span>Return to Prescriptions</span>
            </Link>
          </div>
        )}

        {/* Success Document View */}
        {!loading && prescription && (
          <PrescriptionDocumentView
            prescription={prescription}
            onBack={() => router.push("/patient/prescriptions")}
          />
        )}
      </div>
    </WorkspaceLayout>
  );
}
