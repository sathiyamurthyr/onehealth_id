"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, RefreshCw, Lock } from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { useFamily } from "@/lib/patient/FamilyContext";
import { LabReport, labReportsAPI } from "@/lib/api/lab-reports";
import { LabReportDocumentView } from "@/components/labs/LabReportDocumentView";

export default function PatientLabReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params?.id as string;

  const { activePerson, selectedPersonId, canAccess, familyMembers } = useFamily();
  const [report, setReport] = useState<LabReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasPermission = canAccess("view_lab_reports");
  const isSelf = activePerson?.isSelf ?? true;
  const currentName = activePerson?.name || "Patient";

  const fetchDetail = async () => {
    if (!reportId) return;
    if (!hasPermission) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await labReportsAPI.getMyLabReportDetail(reportId, selectedPersonId || undefined);
      if (res.success && res.data) {
        setReport(res.data);
      } else {
        setError("Laboratory diagnostic report not found.");
      }
    } catch (err: any) {
      console.error("Failed to load lab report detail", err);
      setError(err?.message || "Failed to load laboratory report detail.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [reportId, selectedPersonId, hasPermission]);

  const activeFamilyMember = familyMembers.find((f) => f.member_patient_id === selectedPersonId);

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="space-y-6">
        {/* Permission Barrier */}
        {!hasPermission ? (
          <div className="max-w-2xl mx-auto p-8 bg-amber-50 border border-amber-200 rounded-3xl text-center space-y-3 dark:bg-amber-950/20 dark:border-amber-900">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Diagnostic Access Consent Required
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Viewing this diagnostic report for {currentName} requires active family permission under the OneHealth ID consent framework.
            </p>
            <Link
              href="/patient/family"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <span>Manage Family Permissions</span>
            </Link>
          </div>
        ) : loading ? (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
            <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
          </div>
        ) : error || !report ? (
          <div className="max-w-2xl mx-auto p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {error || "Report Not Available"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The requested laboratory report may have been archived or is not linked to your active profile.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/patient/labs"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Back to Lab Reports
              </Link>
              <button
                onClick={fetchDetail}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <LabReportDocumentView
            report={report}
            activePatientName={currentName}
            isFamilyContext={!isSelf}
            familyRelationship={activeFamilyMember?.relationship || "Family Member"}
            onBack={() => router.push("/patient/labs")}
          />
        )}
      </div>
    </WorkspaceLayout>
  );
}
