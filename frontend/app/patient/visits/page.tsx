"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock, Hospital, Stethoscope, Search, Filter, Calendar,
  ArrowLeft, ChevronRight, X, FileText, Pill, TestTube,
  Receipt, AlertCircle, RefreshCw, CheckCircle2, Eye, Download
} from "lucide-react";
import { api, PatientVisit, PatientVisitedHospital, PatientVisitedDoctor } from "@/lib/api";
import { useFamily } from "@/lib/patient/FamilyContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

const formatSafeString = (val: any, fallback = ""): string => {
  if (!val) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    if (val.name) return String(val.name);
    if (val.description) return String(val.description);
    if (val.reason) {
      const parts: string[] = [String(val.reason)];
      if (val.duration) parts.push(`(${val.duration})`);
      if (val.severity) parts.push(`[${val.severity}]`);
      return parts.join(" ");
    }
    if (val.diagnosis) return String(val.diagnosis);
    try {
      return Object.values(val).filter(v => typeof v === "string" || typeof v === "number").join(", ");
    } catch {
      return fallback;
    }
  }
  return String(val);
};

export default function PatientVisitsPage() {
  const { activePerson, selectedPersonId, canAccess } = useFamily();
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [hospitals, setHospitals] = useState<PatientVisitedHospital[]>([]);
  const [doctors, setDoctors] = useState<PatientVisitedDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedHospital, setSelectedHospital] = useState<string>("ALL");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal State
  const [selectedVisit, setSelectedVisit] = useState<PatientVisit | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const hasPermission = canAccess("view_records");

  const loadData = async () => {
    if (!hasPermission) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [vRes, hRes, dRes] = await Promise.all([
        api.patient.getVisits({ patient_id: selectedPersonId || undefined }).catch(() => ({ success: true, data: [] })),
        api.patient.getHospitals(selectedPersonId || undefined).catch(() => ({ success: true, data: [] })),
        api.patient.getDoctors(selectedPersonId || undefined).catch(() => ({ success: true, data: [] })),
      ]);
      setVisits(vRes?.data || []);
      setHospitals(hRes?.data || []);
      setDoctors(dRes?.data || []);
    } catch (err: any) {
      console.error("Failed to load visits", err);
      setError(err?.message || "Failed to load medical visits.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPersonId, hasPermission]);

  const openVisitDetails = async (visit: PatientVisit) => {
    setSelectedVisit(visit);
    try {
      setDetailLoading(true);
      const res = await api.patient.getVisitDetail(visit.id);
      if (res?.data) {
        setSelectedVisit(res.data);
      }
    } catch (err) {
      console.error("Failed to load full visit details", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = visits.filter((v) => {
    if (selectedHospital !== "ALL" && v.hospital_id !== selectedHospital) return false;
    if (selectedDoctor !== "ALL" && v.doctor_id !== selectedDoctor) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const diagStr = formatSafeString(v.diagnosis).toLowerCase();
      const docStr = formatSafeString(v.doctor_name).toLowerCase();
      const hospStr = formatSafeString(v.hospital_name).toLowerCase();
      const symStr = formatSafeString(v.symptoms).toLowerCase();
      const match = diagStr.includes(q) || docStr.includes(q) || hospStr.includes(q) || symStr.includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <Link
            href="/patient"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Health Overview</span>
          </Link>
          <span className="text-xs text-slate-400">Visits & Clinical Encounters</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Visits & Medical History</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Comprehensive medical history across all accredited hospitals, clinics, and outpatient encounters.
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

        {/* Multi-Hospital Dynamic Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search diagnosis, doctor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Hospital Filter */}
            <div>
              <select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                aria-label="Filter by Hospital"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ALL">All Hospitals</option>
                {hospitals.map((h) => (
                  <option key={h.hospital_id} value={h.hospital_id}>
                    {h.hospital_name || h.name || "Hospital"}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor Filter */}
            <div>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                aria-label="Filter by Doctor"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ALL">All Doctors</option>
                {doctors.map((d) => (
                  <option key={d.doctor_id} value={d.doctor_id}>
                    {d.doctor_name || d.name || "Doctor"} ({d.specialty})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                aria-label="Filter by Date Range"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ALL">All Time</option>
                <option value="30D">Last 30 Days</option>
                <option value="6M">Last 6 Months</option>
                <option value="1Y">Last 1 Year</option>
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

        {/* Visits List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
            <Clock className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No medical visits found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No clinical encounters match your search or filter criteria across participating hospitals.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((visit) => {
              const diag = formatSafeString(visit.diagnosis, "General Health Review");
              const doc = formatSafeString(visit.doctor_name, "Doctor");
              const hosp = formatSafeString(visit.hospital_name, "Hospital Facility");
              const chief = formatSafeString(visit.chief_complaint);
              return (
                <div
                  key={visit.id}
                  className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-5 shadow-sm space-y-3 transition group cursor-pointer"
                  onClick={() => openVisitDetails(visit)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {visit.created_at ? new Date(visit.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Recent"}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {visit.visit_type || "OPD Consultation"}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {visit.status || "Completed"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-semibold text-blue-600 group-hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Diagnosis</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{diag}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Attending Physician</span>
                      <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
                        {doc}
                      </p>
                      <p className="text-[11px] text-slate-500">{formatSafeString(visit.doctor_specialty)}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Hospital / Facility</span>
                      <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                        <Hospital className="w-3.5 h-3.5 text-slate-400" />
                        {hosp}
                      </p>
                    </div>
                  </div>

                  {chief && (
                    <div className="pt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                      <span className="font-semibold text-slate-700">Chief Complaint: </span>
                      {chief}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Visit Details Modal */}
        {selectedVisit && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {selectedVisit.visit_type || "Outpatient Encounter"}
                    </span>
                    <span className="text-xs font-mono text-slate-400">ID: {selectedVisit.id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {formatSafeString(selectedVisit.diagnosis, "Medical Consultation Summary")}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedVisit(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Facility & Doctor Summary */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl text-xs">
                <div>
                  <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Hospital Facility</p>
                  <p className="font-bold text-slate-900 mt-0.5">{formatSafeString(selectedVisit.hospital_name, "Hospital")}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Consultant</p>
                  <p className="font-bold text-slate-900 mt-0.5">{formatSafeString(selectedVisit.doctor_name, "Doctor")}</p>
                  <p className="text-slate-500 text-[11px]">{formatSafeString(selectedVisit.doctor_specialty)}</p>
                </div>
              </div>

              {/* Clinical Notes & Complaint */}
              <div className="space-y-3 text-xs">
                {selectedVisit.chief_complaint && (
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1">Chief Complaint & Symptoms</h4>
                    <p className="p-3 bg-slate-50 rounded-xl text-slate-700">{formatSafeString(selectedVisit.chief_complaint)}</p>
                  </div>
                )}

                {selectedVisit.clinical_notes && (
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1">Physician Clinical Assessment</h4>
                    <p className="p-3 bg-slate-50 rounded-xl text-slate-700 whitespace-pre-line">{formatSafeString(selectedVisit.clinical_notes)}</p>
                  </div>
                )}

                {selectedVisit.treatment_plan && (
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1">Recommended Treatment Plan</h4>
                    <p className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-blue-900">{formatSafeString(selectedVisit.treatment_plan)}</p>
                  </div>
                )}
              </div>

              {/* Prescriptions Issued in this Visit */}
              {selectedVisit.prescriptions && selectedVisit.prescriptions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Pill className="w-4 h-4 text-emerald-600" />
                    <span>Prescribed Medications ({selectedVisit.prescriptions.length})</span>
                  </div>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl p-3 bg-white text-xs">
                    {selectedVisit.prescriptions.map((p, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{formatSafeString(p.doctor_name, "Physician Prescription")}</p>
                          <p className="text-[11px] text-slate-500">{formatSafeString(p.instructions, "Standard dosage regimen")}</p>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {p.status || "ACTIVE"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lab Orders in this Visit */}
              {selectedVisit.lab_orders && selectedVisit.lab_orders.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <TestTube className="w-4 h-4 text-purple-600" />
                    <span>Laboratory Tests Ordered</span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedVisit.lab_orders.map((lab, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-xl text-xs flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{formatSafeString(lab.test_name)}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{formatSafeString(lab.status)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedVisit(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
                >
                  Close Summary
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
