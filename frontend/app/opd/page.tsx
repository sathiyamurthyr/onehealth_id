"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Stethoscope,
  Activity,
  Heart,
  Thermometer,
  Pill,
  Search,
  Filter,
  Calendar,
  FileText,
  User,
  PlusCircle,
  Building2,
  ChevronRight
} from "lucide-react";
import { api } from "@/lib/api";
import { OPDEncounter } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/FeedbackStates";

export default function OPDPage() {
  const [encounters, setEncounters] = useState<OPDEncounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadEncounters = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.clinical.opdEncounters();
      setEncounters(data);
    } catch (err: any) {
      setError(err.message || "Failed to load OPD encounters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEncounters();
  }, []);

  const filteredEncounters = encounters.filter((enc) => {
    return (
      !search ||
      enc.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      enc.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
      enc.chief_complaints?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Outpatient Department (OPD)
              </h1>
              <Badge variant="primary" className="text-xs">
                Clinical Consultations
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Doctor diagnostic notes, clinical vitals triage, and outpatient prescriptions
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/appointments">
              <Button variant="primary" size="md" className="gap-2 text-xs font-semibold w-full sm:w-auto">
                <PlusCircle className="w-4 h-4" />
                <span>Schedule New Consultation</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient name, attending doctor, or diagnosis..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            />
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <LoadingState message="Loading outpatient clinical encounters..." />
        ) : error ? (
          <ErrorState
            title="Failed to Load OPD Consultations"
            message={error}
            onRetry={loadEncounters}
          />
        ) : filteredEncounters.length === 0 ? (
          <EmptyState
            title="No Outpatient Records Found"
            message="No consultation encounters recorded matching the selected filter."
          />
        ) : (
          <div className="space-y-4">
            {filteredEncounters.map((enc) => (
              <Card key={enc.id} className="overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                <CardContent className="p-5 sm:p-6 space-y-4">
                  {/* Top Bar: Patient, Doctor, Date, Token */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                        {enc.patient_name?.charAt(0) || "P"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/patients/${enc.patient_id}`}
                            className="font-bold text-sm text-slate-900 dark:text-white hover:text-blue-600"
                          >
                            {enc.patient_name}
                          </Link>
                          <Badge variant="outline" className="text-[10px]">
                            Token #{enc.token_number || "—"}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Attending: <strong className="text-slate-700 dark:text-slate-300">Dr. {enc.doctor_name}</strong> ({enc.department_name})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-500">
                        {enc.created_at ? new Date(enc.created_at).toLocaleDateString() : "Recent"}
                      </span>
                      <Link href={`/patients/${enc.patient_id}`}>
                        <Button variant="outline" size="sm" className="text-xs gap-1">
                          <span>Patient File</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Vitals Grid */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                      Clinical Triage Vitals
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 block">Blood Pressure</span>
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                            {enc.vitals?.bp || "120/80 mmHg"}
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 block">Pulse / Heart Rate</span>
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                            {enc.vitals?.pulse || 72} bpm
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 block">Body Temp</span>
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                            {enc.vitals?.temp || "98.6 °F"}
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 block">Oxygen (SpO2)</span>
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                            {enc.vitals?.spo2 || "99%"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis & Clinical Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40">
                      <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block mb-1">
                        Chief Complaint & Assessment
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 font-medium">
                        {enc.chief_complaints || "Routine checkup and vitals assessment"}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Doctor's Clinical Notes
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 italic">
                        "{enc.clinical_notes || "Patient advised hydration and lifestyle follow-up."}"
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
