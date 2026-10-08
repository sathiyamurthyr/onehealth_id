"use client";

import React, { useState, useEffect } from "react";
import {
  Building,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  RefreshCw,
  Stethoscope,
  HeartPulse,
  Award,
  Users,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";

export default function DepartmentsPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("oh_workspace") || "{}").hospital_ref_id : "") || "";
  const [departments, setDepartments] = useState<any[]>([]);
  const [counters, setCounters] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [deptList, counterList, docList] = await Promise.all([
        api.admin.departments().catch(() => []),
        api.hospital.getCounters(activeHospitalId).catch(() => []),
        api.hospital.getDoctors(activeHospitalId).catch(() => []),
      ]);
      setDepartments(deptList || []);
      setCounters(counterList || []);
      setDoctors(docList || []);
    } catch (err: any) {
      console.error("Failed to load departments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeHospitalId]);

  const filteredDepts = departments.filter((d) => {
    return (
      (d.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN"]}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/hospital"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hospital Operations
          </Link>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Header with Stats */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-blue-400/20">
                <Building className="w-3.5 h-3.5" /> Department Hierarchy & Specialties
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Clinical Departments & Specialties</h1>
              <p className="text-blue-100/80 text-sm max-w-xl">
                Manage hospital specialty departments, staff assignments, consultation rooms, and mapped OPD counters.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
              <div className="px-3">
                <div className="text-2xl font-bold">{departments.length}</div>
                <div className="text-[11px] font-medium text-blue-200">Departments</div>
              </div>
              <div className="px-3 border-x border-white/10">
                <div className="text-2xl font-bold text-emerald-300">{doctors.length}</div>
                <div className="text-[11px] font-medium text-blue-200">Mapped Doctors</div>
              </div>
              <div className="px-3">
                <div className="text-2xl font-bold text-amber-300">{counters.length}</div>
                <div className="text-[11px] font-medium text-blue-200">OPD Counters</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search departments by name, specialty, or code (e.g. CARD, GENMED, ORTHO)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent focus:outline-none"
          />
        </div>

        {/* Departments Grid */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading departments and specialty mappings...</p>
          </div>
        ) : filteredDepts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Departments Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">No departments match your search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDepts.map((dept) => {
              const deptCounters = counters.filter((c) => c.department_id === dept.id);
              const deptDocs = doctors.filter((d) => d.department_id === dept.id);
              return (
                <div
                  key={dept.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                        {dept.code || "DEPT"}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base mt-2">{dept.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{dept.description || "Full clinical specialty care"}</p>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                      <Building className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5 text-slate-400" /> Doctors Assigned:
                      </span>
                      <span className="font-bold text-slate-900">{deptDocs.length} Doctors</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" /> OPD Counters:
                      </span>
                      <span className="font-bold text-slate-900">
                        {deptCounters.length > 0
                          ? deptCounters.map((c) => c.token_prefix).join(", ")
                          : `${dept.code || "OPD"}- (Default)`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> OPD Hours:
                      </span>
                      <span className="font-semibold text-slate-800">08:00 AM – 08:00 PM</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <Link
                      href="/hospital/doctors"
                      className="text-blue-700 font-semibold hover:underline inline-flex items-center gap-1 text-[11px]"
                    >
                      View Staff <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href="/hospital/counters"
                      className="text-slate-500 font-medium hover:text-slate-900 inline-flex items-center gap-1 text-[11px]"
                    >
                      Configure Counters
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
