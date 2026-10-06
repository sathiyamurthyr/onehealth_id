"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Hospital, MapPin, Phone, Mail, Clock, ArrowLeft,
  ChevronRight, RefreshCw, AlertCircle, ShieldCheck, Building2
} from "lucide-react";
import { api, PatientVisitedHospital } from "@/lib/api";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function PatientHospitalsPage() {
  const [hospitals, setHospitals] = useState<PatientVisitedHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHospitals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.patient.getHospitals();
      setHospitals(res?.data || []);
    } catch (err: any) {
      console.error("Failed to load hospitals", err);
      setError(err?.message || "Failed to load visited hospitals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHospitals();
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
          <span className="text-xs text-slate-400">Accredited Network Facilities</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Hospitals & Facilities</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Accredited hospitals, specialty centers, and diagnostic clinics where you have authorized medical records.
            </p>
          </div>
          <button
            onClick={loadHospitals}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Universal Access Reassurance */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-slate-900">Universal Health Network Architecture:</strong> You do not need separate accounts for each hospital. Your OneHealth ID connects your diagnoses, prescriptions, and lab reports across every provider in the network.
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={loadHospitals} className="font-semibold underline">Retry</button>
          </div>
        )}

        {/* Hospitals Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : hospitals.length === 0 ? (
          <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
            <Hospital className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No hospital records available yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Participating hospitals and clinics will be listed here after your first consultation or registration episode.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hospitals.map((hosp) => (
              <div
                key={hosp.hospital_id}
                className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-5 shadow-sm space-y-4 transition flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                      <Hospital className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{hosp.hospital_name || hosp.name || "Hospital Facility"}</h3>
                      <p className="text-[11px] font-mono text-slate-400">Code: {hosp.hospital_code || hosp.code || "HOSP"}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200 shrink-0">
                    {hosp.visits_count ?? hosp.visit_count ?? 0} Visit(s)
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  {hosp.address && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{hosp.address}</span>
                    </div>
                  )}
                  {hosp.last_visit_date && (
                    <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Last Visited: {new Date(hosp.last_visit_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <Link
                    href={`/patient/visits?hospital_id=${hosp.hospital_id}`}
                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>View Hospital Visits</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
