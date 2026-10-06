"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  History, Clock, Pill, TestTube, FileText, CreditCard,
  Calendar, Hospital, Stethoscope, ArrowLeft, RefreshCw,
  AlertCircle, Filter, ChevronRight, Activity, Sparkles
} from "lucide-react";
import { api, PatientTimelineEvent, PatientVisitedHospital } from "@/lib/api";
import { useFamily } from "@/lib/patient/FamilyContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  VISIT:        { label: "Doctor Visit",      icon: Clock,       color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  PRESCRIPTION: { label: "Prescription",      icon: Pill,        color: "text-emerald-600",bg: "bg-emerald-50",border: "border-emerald-200" },
  LAB:          { label: "Laboratory Test",   icon: TestTube,    color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  BILL:         { label: "Billing & Payment", icon: CreditCard,  color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200" },
  DOCUMENT:     { label: "Medical Document",  icon: FileText,    color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200" },
  APPOINTMENT:  { label: "Appointment",       icon: Calendar,    color: "text-sky-600",    bg: "bg-sky-50",    border: "border-sky-200" },
};

const formatSafeString = (val: any, fallback = ""): string => {
  if (!val) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    if (val.name) return String(val.name);
    if (val.description) return String(val.description);
    if (val.reason) return String(val.reason);
    try {
      return Object.values(val).filter(v => typeof v === "string" || typeof v === "number").join(", ");
    } catch {
      return fallback;
    }
  }
  return String(val);
};

export default function PatientTimelinePage() {
  const { activePerson, selectedPersonId, canAccess } = useFamily();
  const [events, setEvents] = useState<PatientTimelineEvent[]>([]);
  const [hospitals, setHospitals] = useState<PatientVisitedHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedHospital, setSelectedHospital] = useState<string>("ALL");

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [timelineRes, hospsRes] = await Promise.all([
        api.patient.getTimeline({ patient_id: selectedPersonId || undefined }).catch(() => ({ success: true, data: [] })),
        api.patient.getHospitals(selectedPersonId || undefined).catch(() => ({ success: true, data: [] })),
      ]);
      setEvents(timelineRes?.data || []);
      setHospitals(hospsRes?.data || []);
    } catch (err: any) {
      console.error("Failed to load timeline", err);
      setError(err?.message || "Failed to load healthcare timeline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPersonId]);

  const filtered = events.filter((evt) => {
    if (selectedType !== "ALL" && evt.event_type !== selectedType) return false;
    if (selectedHospital !== "ALL") {
      const hMatch = hospitals.find((h) => h.hospital_id === selectedHospital);
      if (hMatch && evt.hospital_name !== hMatch.name) return false;
    }
    return true;
  });

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
          <span className="text-xs text-slate-400">Complete Healthcare Journey</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Health Timeline</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Unified chronological stream of all your outpatient visits, prescriptions, diagnostic reports, and hospital episodes.
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Type Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { key: "ALL", label: "All Events" },
                { key: "VISIT", label: "Visits" },
                { key: "PRESCRIPTION", label: "Prescriptions" },
                { key: "LAB", label: "Lab Reports" },
                { key: "BILL", label: "Bills" },
                { key: "DOCUMENT", label: "Documents" },
                { key: "APPOINTMENT", label: "Appointments" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedType(tab.key)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-semibold transition ${
                    selectedType === tab.key
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Hospital Filter Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                aria-label="Filter by Hospital"
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Hospitals</option>
                {hospitals.map((h) => (
                  <option key={h.hospital_id} value={h.hospital_id}>
                    {h.hospital_name || h.name || "Hospital"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={loadData} className="font-semibold underline">Retry</button>
          </div>
        )}

        {/* Timeline Vertical Stream */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No events found in timeline</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your clinical visits, laboratory investigations, and medication histories will populate this universal timeline.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-6">
            {filtered.map((evt, idx) => {
              const cfg = EVENT_TYPE_CONFIG[evt.event_type] || EVENT_TYPE_CONFIG.VISIT;
              const Icon = cfg.icon;
              const title = formatSafeString(evt.title, "Clinical Event");
              const subtitle = formatSafeString(evt.subtitle);
              const hospName = formatSafeString(evt.hospital_name, "Hospital Facility");
              const docName = formatSafeString(evt.doctor_name);
              const status = formatSafeString(evt.status, "Completed");

              return (
                <div key={evt.id || idx} className="relative group">
                  {/* Timeline Dot Indicator */}
                  <div className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-7 h-7 rounded-xl ${cfg.bg} ${cfg.color} ${cfg.border} border-2 flex items-center justify-center shadow-sm`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {/* Event Card */}
                  <div className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-5 shadow-sm space-y-3 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border} uppercase`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-600">
                          {evt.date ? new Date(evt.date).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Recent"}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
                        {status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
                      {subtitle && (
                        <p className="text-xs text-slate-600">{subtitle}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Hospital className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-700">{hospName}</span>
                      </div>
                      {docName && (
                        <div className="flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Dr. {docName}</span>
                        </div>
                      )}
                    </div>
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
