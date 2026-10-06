"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Stethoscope, Hospital, Calendar, ArrowLeft, ChevronRight,
  RefreshCw, AlertCircle, Clock, CheckCircle2, User
} from "lucide-react";
import { api, PatientVisitedDoctor } from "@/lib/api";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

const formatSafeString = (val: any, fallback = ""): string => {
  if (!val) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    if (val.name) return String(val.name);
    return JSON.stringify(val);
  }
  return String(val);
};

export default function PatientDoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.patient.getDoctors();
      setDoctors(res?.data || []);
    } catch (err: any) {
      console.error("Failed to load doctors", err);
      setError(err?.message || "Failed to load visited doctors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <Link
            href="/patient"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Health Overview</span>
          </Link>
          <span className="text-xs text-slate-400">Consultant Directory</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Doctors</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Healthcare consultants and specialists who have treated you across accredited hospitals.
            </p>
          </div>
          <button
            onClick={loadDoctors}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={loadDoctors} className="font-semibold underline">Retry</button>
          </div>
        )}

        {/* Doctors Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
            <Stethoscope className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No doctors on file</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your visited doctors will appear here automatically once an authorized clinician records a consultation episode.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctors.map((doc, idx) => {
              const docName = formatSafeString(doc.doctor_name || doc.name, "Consultant");
              const initial = docName.charAt(0).toUpperCase() || "D";
              const spec = formatSafeString(doc.specialty, "Specialist");
              const qual = formatSafeString(doc.qualification);
              const visits = doc.consultations_count || doc.total_visits || 1;
              const facility = formatSafeString(
                doc.hospital_name || (Array.isArray(doc.hospitals) ? doc.hospitals.join(", ") : doc.hospitals),
                "Accredited Network Facility"
              );

              return (
                <div
                  key={doc.doctor_id || idx}
                  className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-5 shadow-sm space-y-4 transition flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                        {initial}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{docName}</h3>
                        <p className="text-xs text-blue-600 font-semibold">{spec}</p>
                        {qual && (
                          <p className="text-[11px] text-slate-400">{qual}</p>
                        )}
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200 shrink-0">
                      {visits} Visit(s)
                    </span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Hospital className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{facility}</span>
                    </div>
                    {doc.last_visit_date && (
                      <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          Last Consulted: {new Date(doc.last_visit_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <Link
                      href={`/patient/visits?doctor_id=${doc.doctor_id || ""}`}
                      className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span>View Consultations</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
