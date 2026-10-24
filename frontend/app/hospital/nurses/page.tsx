"use client";

import React, { useState, useEffect } from "react";
import {
  HeartPulse,
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
  Phone,
  Mail,
  MapPin,
  UserCheck,
  Users,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { api, NurseRegisterPayload } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";

export default function NursesPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || "";
  const [nurses, setNurses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedShift, setSelectedShift] = useState("ALL");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<NurseRegisterPayload>({
    name: "",
    email: "",
    phone: "",
    qualification: "",
    registration_number: "",
    department_id: "",
    ward: "",
    shift: "MORNING",
    hospital_id: activeHospitalId,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [nurseList, deptList] = await Promise.all([
        api.hospital.getNurses(activeHospitalId).catch(() => []),
        api.admin.departments().catch(() => []),
      ]);
      setNurses(nurseList || []);
      setDepartments(deptList || []);
      if (deptList && deptList.length > 0 && !formData.department_id) {
        setFormData((prev) => ({ ...prev, hospital_id: activeHospitalId, department_id: deptList[0].id }));
      }
    } catch (err: any) {
      console.error("Failed to load nursing data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeHospitalId]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await api.hospital.registerNurse({ ...formData, hospital_id: activeHospitalId });
      setSuccessMessage(`Nurse ${formData.name} registered and assigned successfully!`);
      setShowRegisterModal(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        qualification: "",
        registration_number: "",
        department_id: departments[0]?.id || "",
        ward: "",
        shift: "MORNING",
        hospital_id: activeHospitalId,
      });
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to register nurse. Please check all fields.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredNurses = nurses.filter((nurse) => {
    const matchesSearch =
      (nurse.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (nurse.registration_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (nurse.ward || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === "ALL" || nurse.department_id === selectedDept || nurse.department_name === selectedDept;
    const matchesShift = selectedShift === "ALL" || nurse.shift === selectedShift;
    return matchesSearch && matchesDept && matchesShift;
  });

  const onDutyCount = nurses.filter((n) => n.on_duty_status === "ON_DUTY" || n.is_available).length;
  const morningCount = nurses.filter((n) => n.shift === "MORNING").length;
  const eveningCount = nurses.filter((n) => n.shift === "EVENING").length;
  const nightCount = nurses.filter((n) => n.shift === "NIGHT").length;

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN"]}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/hospital"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-rose-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hospital Operations
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-rose-600" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Register Nurse
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
        <div className="bg-gradient-to-r from-rose-950 via-pink-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-rose-400/20">
                <HeartPulse className="w-3.5 h-3.5" /> Nursing Staff Administration
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Nursing Roster & Ward Mapping</h1>
              <p className="text-rose-100/80 text-sm max-w-xl">
                Manage registered nursing staff, ward allocations, shift schedules, and professional nursing council registrations.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-4 gap-2 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
              <div className="px-2">
                <div className="text-2xl font-bold">{nurses.length}</div>
                <div className="text-[10px] font-medium text-rose-200">Total Nurses</div>
              </div>
              <div className="px-2 border-l border-white/10">
                <div className="text-2xl font-bold text-emerald-300">{onDutyCount}</div>
                <div className="text-[10px] font-medium text-rose-200">On Duty</div>
              </div>
              <div className="px-2 border-l border-white/10">
                <div className="text-2xl font-bold text-amber-300">{morningCount}</div>
                <div className="text-[10px] font-medium text-rose-200">Morning Shift</div>
              </div>
              <div className="px-2 border-l border-white/10">
                <div className="text-2xl font-bold text-sky-300">{nightCount}</div>
                <div className="text-[10px] font-medium text-rose-200">Night Shift</div>
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
              placeholder="Search by nurse name, registration number, or ward..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="ALL">All Shifts</option>
              <option value="MORNING">Morning (07:00 - 15:00)</option>
              <option value="EVENING">Evening (15:00 - 23:00)</option>
              <option value="NIGHT">Night (23:00 - 07:00)</option>
            </select>
          </div>
        </div>

        {/* Nurse List */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <RefreshCw className="w-8 h-8 text-rose-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading nursing staff roster...</p>
          </div>
        ) : filteredNurses.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <HeartPulse className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Nursing Staff Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              No nursing staff match your filter criteria. Try changing your filters or register a new nurse.
            </p>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition"
            >
              <Plus className="w-4 h-4" /> Register First Nurse
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredNurses.map((nurse) => {
              const isOnDuty = nurse.on_duty_status === "ON_DUTY" || nurse.is_available;
              return (
                <div
                  key={nurse.id || nurse.nurse_id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-4"
                >
                  {/* Top Status */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-bold text-base">
                        {nurse.name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase() || "RN"}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">{nurse.name}</h3>
                        <p className="text-xs font-semibold text-rose-700 mt-0.5">{nurse.qualification || "—"}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{nurse.registration_number || "—"}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isOnDuty ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnDuty ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                      {isOnDuty ? "ON DUTY" : "OFF DUTY"}
                    </span>
                  </div>

                  {/* Ward & Shift details */}
                  <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" /> Department:
                      </span>
                      <span className="font-semibold text-slate-800">{nurse.department_name || "—"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> Assigned Ward:
                      </span>
                      <span className="font-semibold text-slate-800">{nurse.ward || "—"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> Shift:
                      </span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          nurse.shift === "MORNING"
                            ? "bg-amber-100 text-amber-800"
                            : nurse.shift === "EVENING"
                            ? "bg-indigo-100 text-indigo-800"
                            : nurse.shift === "NIGHT"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {nurse.shift || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                      <ShieldCheck className="w-3 h-3" /> State Nursing Council
                    </span>

                    <div className="flex items-center gap-1 text-slate-400">
                      {nurse.phone && (
                        <a
                          href={`tel:${nurse.phone}`}
                          title={nurse.phone}
                          className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {nurse.email && (
                        <a
                          href={`mailto:${nurse.email}`}
                          title={nurse.email}
                          className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Register Nurse Modal */}
        {showRegisterModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                    <HeartPulse className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Register Nursing Staff</h2>
                    <p className="text-xs text-slate-500">Add nurse to hospital ward and shift roster</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Staff Nurse Deepa K"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="nurse@hospital.org"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Mobile Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98401 23456"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Qualification *</label>
                    <input
                      type="text"
                      required
                      placeholder="B.Sc. Nursing, GNM, RN"
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nursing Reg Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="TNC-RN-58291"
                      value={formData.registration_number}
                      onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Department *</label>
                  <select
                    required
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Ward / Unit *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ward 3B - Step Down"
                      value={formData.ward}
                      onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Initial Shift</label>
                    <select
                      value={formData.shift}
                      onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20"
                    >
                      <option value="MORNING">Morning (07:00 - 15:00)</option>
                      <option value="EVENING">Evening (15:00 - 23:00)</option>
                      <option value="NIGHT">Night (23:00 - 07:00)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition shadow-sm disabled:opacity-50"
                  >
                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                    {submitting ? "Registering..." : "Confirm & Register Nurse"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
