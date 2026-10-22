"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { PrescriptionRecord } from "@/lib/api/prescriptions";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { PrescriptionDocumentView } from "@/components/prescriptions/PrescriptionDocumentView";

function PrescriptionDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const prescriptionId = params?.id as string;

  const [prescription, setPrescription] = useState<PrescriptionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPrescription() {
      if (!prescriptionId) return;
      try {
        setLoading(true);
        setError("");
        const data = await api.prescriptions.get(prescriptionId);
        setPrescription(data);
      } catch (err: any) {
        console.error("Failed to load prescription:", err);
        setError(err.message || "Prescription not found or access unauthorized.");
      } finally {
        setLoading(false);
      }
    }
    loadPrescription();
  }, [prescriptionId]);

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["DOCTOR", "HOSPITAL_ADMIN", "PATIENT", "SUPER_ADMIN"]}>
      <div className="min-h-screen bg-slate-50/60 pb-16 pt-4 px-4 sm:px-6">
        {/* Loading State */}
        {loading && (
          <div className="max-w-4xl mx-auto p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Loading canonical prescription document...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="max-w-4xl mx-auto p-8 text-center rounded-2xl bg-white border border-rose-200 shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Unable to Load Prescription</h3>
              <p className="text-xs text-rose-600 mt-1 max-w-sm mx-auto">{error}</p>
            </div>
            <Link
              href="/doctor"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Doctor Workspace</span>
            </Link>
          </div>
        )}

        {/* Canonical Redesigned Document View */}
        {!loading && prescription && (
          <PrescriptionDocumentView
            prescription={prescription}
            onBack={() => router.push("/doctor")}
          />
        )}
      </div>
    </WorkspaceLayout>
  );
}

export default function PrescriptionDetailsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Loading prescription details...</div>}>
      <PrescriptionDetailsContent />
    </React.Suspense>
  );
}
