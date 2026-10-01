"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Stethoscope,
  ChevronRight,
  Phone,
  Calendar,
  Building2,
  FileText
} from "lucide-react";
import { api } from "@/lib/api";
import { Patient, UserProfile } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/FeedbackStates";

export default function DoctorPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    setUser(api.auth.getCurrentUser());
    const loadPatients = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api.patients.list({ hospital_id: "hosp-kedar" });
        setPatients(data);
      } catch (err: any) {
        setError(err.message || "Failed to load patient roster");
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, []);

  const filtered = patients.filter((p) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.onehealth_id.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone && p.phone.includes(search))
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Stethoscope className="w-5 h-5 text-purple-600" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Clinical Patient Roster
              </h1>
              <Badge variant="primary" className="text-xs">
                Kedar Hospital Mugalivakkam
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Assigned outpatient clinical profiles, OneHealth IDs, and medical encounter histories
            </p>
          </div>

          <Link href="/doctor/queue">
            <Button variant="primary" size="md" className="gap-2 text-xs font-semibold w-full sm:w-auto min-h-[44px]">
              <span>View Live Consultation Queue</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assigned patients by name, OneHealth ID, or phone..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
            />
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading clinician patient roster..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No patients found" description="No patient records match the search filter." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <Card key={p.id} className="p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</div>
                    <Badge variant="primary" className="text-[10px] font-mono">
                      {p.onehealth_id}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500 mb-2">
                    {p.age} yrs • {p.gender} • Blood Group: <strong className="text-rose-500">{p.blood_group || "N/A"}</strong>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl mb-3">
                    <span className="text-[10px] text-slate-400 block uppercase">Primary Clinical Reason</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{p.diagnosis}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Link href={`/patients/${p.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs min-h-[44px]">
                      Profile & QR
                    </Button>
                  </Link>
                  <Link href={`/doctor/consultation/${p.id}`} className="flex-1">
                    <Button variant="primary" size="sm" className="w-full text-xs min-h-[44px] gap-1">
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Consult</span>
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
