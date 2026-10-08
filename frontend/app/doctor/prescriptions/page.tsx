"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Printer,
  Search,
  ArrowLeft,
  Calendar,
  Building,
  User,
  ShieldCheck,
  ChevronRight,
  Filter
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { PrescriptionRecord } from "@/lib/api/prescriptions";

export default function DoctorPrescriptionsListPage() {
  const { workspace } = useWorkspace();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    async function loadPrescriptions() {
      try {
        setLoading(true);
        const data = await api.prescriptions.list({
          hospital_id: workspace?.hospital_ref_id,
          status: statusFilter || undefined,
        });
        setPrescriptions(data || []);
      } catch (err) {
        console.error("Failed to load prescriptions list:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPrescriptions();
  }, [workspace?.hospital_ref_id, statusFilter]);

  const filtered = prescriptions.filter((rx) => {
    const q = searchQuery.toLowerCase();
    return (
      rx.id.toLowerCase().includes(q) ||
      (rx.patient_name && rx.patient_name.toLowerCase().includes(q)) ||
      (rx.onehealth_id && rx.onehealth_id.toLowerCase().includes(q)) ||
      (rx.diagnosis && rx.diagnosis.toLowerCase().includes(q))
    );
  });

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
                <h1 className="text-xl font-bold text-slate-900">Clinical Prescriptions Registry</h1>
                <p className="text-xs text-slate-500">
                  Scoped to {workspace?.hospital_name || "Healthcare Facility"} • Digitally signed prescriptions
                </p>
              </div>
            </div>

            <Link
              href="/doctor/prescriptions/new"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Prescription</span>
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 pt-6 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Rx ID, Patient Name, OneHealth ID, or Diagnosis..."
                className="w-full text-xs bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-slate-900"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
            >
              <option value="">All Statuses</option>
              <option value="SIGNED">SIGNED</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISPENSED">DISPENSED</option>
            </select>
          </div>

          {/* List */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Prescription ID</th>
                  <th className="py-3 px-4">Patient & OH-ID</th>
                  <th className="py-3 px-4">Clinical Diagnosis</th>
                  <th className="py-3 px-4">Items Count</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Loading prescriptions...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No prescriptions found matching your query.
                    </td>
                  </tr>
                ) : (
                  filtered.map((rx) => (
                    <tr key={rx.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(rx.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {rx.id}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{rx.patient_name}</p>
                        <p className="text-[11px] font-mono text-slate-400">{rx.onehealth_id || rx.patient_id}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium max-w-xs truncate">
                        {rx.diagnosis || "Consultation"}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {rx.items?.length || 0} meds
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {rx.status || "SIGNED"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/doctor/prescriptions/${rx.id}`}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => window.open(`/doctor/prescriptions/${rx.id}?print=true`, "_blank")}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                            title="Print Prescription"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
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
