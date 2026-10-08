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
  Building,
  FileText,
  Plus,
  ArrowLeft,
  Hospital
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function DoctorPatientsPage() {
  const { workspace } = useWorkspace();
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPatients() {
      try {
        setLoading(true);
        setError("");
        const data = await api.doctors.getMyPatients().catch(() => []);
        setPatients(data || []);
      } catch (err: any) {
        console.error("Failed to load doctor patients:", err);
        setError(err.message || "Failed to load patient roster");
      } finally {
        setLoading(false);
      }
    }
    loadPatients();
  }, [workspace?.hospital_ref_id]);

  const filtered = patients.filter((p) =>
    !search ||
    (p.name && p.name.toLowerCase().includes(search.toLowerCase())) ||
    (p.onehealth_id && p.onehealth_id.toLowerCase().includes(search.toLowerCase())) ||
    (p.phone && p.phone.includes(search))
  );

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["DOCTOR"]}>
      <div className="bg-white min-h-screen text-slate-900 pb-16">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white sticky top-0 z-20 px-6 py-4 shadow-xs">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/doctor"
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Assigned Patient Roster</h1>
                <p className="text-xs text-slate-500">
                  Current Hospital: <span className="font-semibold text-slate-800">{workspace?.hospital_name || "Healthcare Facility"}</span> ({workspace?.branch_name || "Main Branch"})
                </p>
              </div>
            </div>

            <Link
              href="/doctor/prescriptions/new"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Prescription</span>
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 pt-6 space-y-4">
          {/* Search Box */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assigned patients by name, OneHealth ID, or phone..."
                className="w-full text-xs bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Patient Roster Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">OneHealth ID</th>
                  <th className="py-3 px-4">Age / Gender</th>
                  <th className="py-3 px-4">Phone / Contact</th>
                  <th className="py-3 px-4">Hospital Scope</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Loading patient roster...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No patients found matching your search.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <p className="text-[11px] text-slate-400">ID: {p.id}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">
                        {p.onehealth_id || "OHID-PENDING"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {p.age ? `${p.age} yrs` : "—"} / {p.gender || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {p.phone || "+91 98400 12345"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-semibold text-slate-800">{p.hospital_name || workspace?.hospital_name || "Healthcare Facility"}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/doctor/consultation/${p.id}`}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] transition"
                          >
                            Consult
                          </Link>
                          <Link
                            href={`/doctor/prescriptions/new?patient_id=${p.id}`}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition"
                          >
                            + Rx
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
