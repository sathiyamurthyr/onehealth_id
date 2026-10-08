"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarCheck,
  Clock,
  User,
  Hospital,
  ArrowLeft,
  Filter,
  CheckCircle2,
  Stethoscope,
  Plus
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
export default function DoctorAppointmentsPage() {
  const { workspace } = useWorkspace();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const currentHospitalName = workspace?.hospital_name || "Healthcare Facility";
  const currentBranchName = workspace?.branch_name || "Main Branch";

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const appts = await api.doctors.getMyAppointments(false).catch(() => []);
        setAppointments(appts || []);
      } catch (err) {
        console.error("Failed to load appointments:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [workspace?.hospital_ref_id]);

  const filtered = appointments.filter((a) => {
    if (selectedStatusFilter && a.status !== selectedStatusFilter) {
      return false;
    }
    return true;
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
                <h1 className="text-xl font-bold text-slate-900">Outpatient Consultation Appointments</h1>
                <p className="text-xs text-slate-500">
                  Doctor-scoped appointments at {currentHospitalName} ({currentBranchName})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-left flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-800">{currentHospitalName}</span>
              </div>

              <Link
                href="/doctor/prescriptions/new"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Prescription</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-6xl mx-auto px-6 pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>Filter By Status:</span>
              </div>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="IN_CONSULTATION">IN_CONSULTATION</option>
                <option value="WAITING">WAITING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>

            <span className="text-xs text-slate-500">
              Showing {filtered.length} of {appointments.length} appointments
            </span>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Time Slot</th>
                  <th className="py-3 px-4">Token</th>
                  <th className="py-3 px-4">Patient Name & OH-ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Clinical Indication</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Loading appointments...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No appointments matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((appt) => (
                    <tr key={appt.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {appt.slot || "09:00 - 09:15"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                          #{appt.token_number || 1}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{appt.patient_name}</p>
                        <p className="text-[11px] font-mono text-slate-400">{appt.onehealth_id || appt.patient_id}</p>
                        {appt.booked_by_name && appt.relationship_context === "FAMILY" && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-medium">
                            Booked by: {appt.booked_by_name} ({appt.booked_by_relationship || "Family"})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                          {appt.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {appt.notes || "Orthopedic consultation"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/doctor/consultation/${appt.patient_id}?appointment_id=${appt.id}`}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] transition"
                          >
                            Consult
                          </Link>
                          <Link
                            href={`/doctor/prescriptions/new?patient_id=${appt.patient_id}&visit_id=${appt.id}`}
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
