"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  ArrowLeft,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Building,
  ShieldCheck,
  AlertCircle,
  X,
  RefreshCw,
  Stethoscope,
  HeartPulse,
  GraduationCap,
  MapPin,
  Layers,
  UserCheck,
  ChevronDown,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { api } from "@/lib/api";

export default function RosterPage() {
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaffType, setSelectedStaffType] = useState("ALL");
  const [selectedShift, setSelectedShift] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const rosterList = await api.hospital.getRoster("hosp-kedar");
      setRoster(rosterList || []);
    } catch (err: any) {
      console.error("Failed to load staff roster:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (rosterId: string, newStatus: string) => {
    setUpdatingId(rosterId);
    setErrorMessage(null);
    try {
      await api.hospital.updateRosterStatus(rosterId, { on_duty_status: newStatus });
      setSuccessMessage(`Staff on-duty status updated to ${newStatus}`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update staff duty status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRoster = roster.filter((item) => {
    const matchesSearch =
      (item.staff_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.department_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.room_number || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedStaffType === "ALL" || item.staff_type === selectedStaffType;
    const matchesShift = selectedShift === "ALL" || item.shift === selectedShift;
    const matchesStatus = selectedStatus === "ALL" || item.on_duty_status === selectedStatus;
    return matchesSearch && matchesType && matchesShift && matchesStatus;
  });

  const onDutyCount = roster.filter((r) => r.on_duty_status === "ON_DUTY").length;
  const doctorsCount = roster.filter((r) => r.staff_type === "DOCTOR").length;
  const nursesCount = roster.filter((r) => r.staff_type === "NURSE").length;
  const traineesCount = roster.filter((r) => r.staff_type === "TRAINEE").length;

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN"]}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/hospital"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hospital Operations
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
              Refresh Roster
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header with Stats */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-teal-400/20">
                <Calendar className="w-3.5 h-3.5" /> Live Operational Roster
              </div>
              <h1 className="text-3xl font-bold tracking-tight">On-Duty Roster & Shift Management</h1>
              <p className="text-teal-100/80 text-sm max-w-xl">
                Real-time active roster for doctors, nurses, and trainees across consultation rooms, wards, and OPD counters.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-4 gap-2 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
              <div className="px-2">
                <div className="text-2xl font-bold text-emerald-300">{onDutyCount}</div>
                <div className="text-[10px] font-medium text-teal-200">On Duty Now</div>
              </div>
              <div className="px-2 border-l border-white/10">
                <div className="text-2xl font-bold">{doctorsCount}</div>
                <div className="text-[10px] font-medium text-teal-200">Doctors</div>
              </div>
              <div className="px-2 border-l border-white/10">
                <div className="text-2xl font-bold">{nursesCount}</div>
                <div className="text-[10px] font-medium text-teal-200">Nurses</div>
              </div>
              <div className="px-2 border-l border-white/10">
                <div className="text-2xl font-bold">{traineesCount}</div>
                <div className="text-[10px] font-medium text-teal-200">Trainees</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by staff name, department, or consultation room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={selectedStaffType}
              onChange={(e) => setSelectedStaffType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="ALL">All Staff Roles</option>
              <option value="DOCTOR">Doctors</option>
              <option value="NURSE">Nurses</option>
              <option value="TRAINEE">Trainees / Interns</option>
            </select>

            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="ALL">All Shifts</option>
              <option value="MORNING">Morning (09:00 - 13:00)</option>
              <option value="AFTERNOON">Afternoon (13:00 - 17:00)</option>
              <option value="EVENING">Evening (17:00 - 21:00)</option>
              <option value="NIGHT">Night (21:00 - 07:00)</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="ALL">All Duty Statuses</option>
              <option value="ON_DUTY">ON DUTY</option>
              <option value="OFF_DUTY">OFF DUTY</option>
              <option value="BREAK">BREAK</option>
              <option value="ON_LEAVE">ON LEAVE</option>
              <option value="EMERGENCY_DUTY">EMERGENCY DUTY</option>
            </select>
          </div>
        </div>

        {/* Roster Table */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading operational staff roster...</p>
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Roster Entries Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">No staff members match the selected filters.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Shift & Hours</th>
                    <th className="py-3.5 px-4">Location / Room</th>
                    <th className="py-3.5 px-4">OPD Counter</th>
                    <th className="py-3.5 px-4">Duty Status</th>
                    <th className="py-3.5 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoster.map((item) => {
                    const isOnDuty = item.on_duty_status === "ON_DUTY";
                    const isUpdating = updatingId === item.id;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                item.staff_type === "DOCTOR"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : item.staff_type === "NURSE"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              }`}
                            >
                              {item.staff_type === "DOCTOR" ? (
                                <Stethoscope className="w-4 h-4" />
                              ) : item.staff_type === "NURSE" ? (
                                <HeartPulse className="w-4 h-4" />
                              ) : (
                                <GraduationCap className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{item.staff_name}</div>
                              <div className="text-[10px] text-slate-400">ID: #{item.staff_id?.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.staff_type === "DOCTOR"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.staff_type === "NURSE"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {item.staff_type}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {item.department_name || "General Medicine"}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800">{item.shift || "MORNING"}</div>
                          <div className="text-[10px] text-slate-400">
                            {item.shift_start ? `${item.shift_start} – ${item.shift_end}` : "09:00 – 13:00"}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {item.room_number || "Room 101"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                            <Layers className="w-3 h-3 text-slate-400" />
                            {item.counter_name || "General OPD"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              item.on_duty_status === "ON_DUTY"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : item.on_duty_status === "BREAK"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : item.on_duty_status === "EMERGENCY_DUTY"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.on_duty_status === "ON_DUTY"
                                  ? "bg-emerald-500 animate-pulse"
                                  : item.on_duty_status === "EMERGENCY_DUTY"
                                  ? "bg-rose-500 animate-ping"
                                  : "bg-slate-400"
                              }`}
                            />
                            {item.on_duty_status || "OFF_DUTY"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <select
                            disabled={isUpdating}
                            value={item.on_duty_status || "OFF_DUTY"}
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer disabled:opacity-50"
                          >
                            <option value="ON_DUTY">Mark ON DUTY</option>
                            <option value="OFF_DUTY">Mark OFF DUTY</option>
                            <option value="BREAK">Mark ON BREAK</option>
                            <option value="ON_LEAVE">Mark ON LEAVE</option>
                            <option value="EMERGENCY_DUTY">Mark EMERGENCY</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
