"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
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
  Hash,
  MapPin,
  Settings2,
  Activity,
  UserCheck,
  Tag,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { api, OPDCounterUpsertPayload } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";

export default function CountersPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || "";
  const [counters, setCounters] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [showUpsertModal, setShowUpsertModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<OPDCounterUpsertPayload>({
    counter_name: "",
    counter_number: "1",
    department_id: "",
    location: "Ground Floor, Room 101",
    token_prefix: "GM-",
    token_start: 1,
    status: "ACTIVE",
    assigned_doctor_id: "",
    operating_hours: "08:00 AM - 08:00 PM",
    hospital_id: activeHospitalId,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [counterList, deptList, docList] = await Promise.all([
        api.hospital.getCounters(activeHospitalId).catch(() => []),
        api.admin.departments().catch(() => []),
        api.hospital.getDoctors(activeHospitalId).catch(() => []),
      ]);
      setCounters(counterList || []);
      setDepartments(deptList || []);
      setDoctors(docList || []);
      if (deptList && deptList.length > 0 && !formData.department_id) {
        setFormData((prev) => ({
          ...prev,
          hospital_id: activeHospitalId,
          department_id: deptList[0].id,
          token_prefix: (deptList[0].code ? `${deptList[0].code}-` : "OPD-").toUpperCase(),
        }));
      }
    } catch (err: any) {
      console.error("Failed to load OPD counters data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeHospitalId]);

  const handleDepartmentChange = (deptId: string) => {
    const dept = departments.find((d) => d.id === deptId);
    setFormData((prev) => ({
      ...prev,
      department_id: deptId,
      token_prefix: (dept?.code ? `${dept.code}-` : "OPD-").toUpperCase(),
      counter_name: dept ? `Counter ${counters.length + 1} - ${dept.name}` : prev.counter_name,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await api.hospital.upsertCounter({ ...formData, hospital_id: activeHospitalId });
      setSuccessMessage(`${formData.counter_name} configured and operational!`);
      setShowUpsertModal(false);
      setFormData({
        counter_name: "",
        counter_number: String(counters.length + 2),
        department_id: departments[0]?.id || "",
        location: "Ground Floor, Room 101",
        token_prefix: "GM-",
        token_start: 1,
        status: "ACTIVE",
        assigned_doctor_id: "",
        operating_hours: "08:00 AM - 08:00 PM",
        hospital_id: activeHospitalId,
      });
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to configure OPD Counter.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCounters = counters.filter((c) => {
    const matchesSearch =
      (c.counter_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.token_prefix || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.location || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === "ALL" || c.department_id === selectedDept || c.department_name === selectedDept;
    return matchesSearch && matchesDept;
  });

  const activeCount = counters.filter((c) => c.status === "ACTIVE").length;

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN"]}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/hospital"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-amber-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hospital Operations
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-600" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowUpsertModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add OPD Counter
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
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-amber-400/20">
                <Layers className="w-3.5 h-3.5" /> OPD Counter & Token Management
              </div>
              <h1 className="text-3xl font-bold tracking-tight">OPD Counters & Token Allocation</h1>
              <p className="text-amber-100/80 text-sm max-w-xl">
                Configure physical OPD counters, customizable token prefixes, daily reset rules, and doctor consultation room assignments.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
              <div className="px-3">
                <div className="text-2xl font-bold">{counters.length}</div>
                <div className="text-[11px] font-medium text-amber-200">Total Counters</div>
              </div>
              <div className="px-3 border-x border-white/10">
                <div className="text-2xl font-bold text-emerald-300">{activeCount}</div>
                <div className="text-[11px] font-medium text-amber-200">Operational</div>
              </div>
              <div className="px-3">
                <div className="text-2xl font-bold text-teal-300">Daily Reset</div>
                <div className="text-[11px] font-medium text-amber-200">00:00 Auto</div>
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
              placeholder="Search by counter name, prefix (e.g. GM-, CARD-), or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Counters Grid */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading OPD counters & token configurations...</p>
          </div>
        ) : filteredCounters.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No OPD Counters Configured</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              No OPD counters have been set up for this department. Add your first counter to enable automated queue tokens.
            </p>
            <button
              onClick={() => setShowUpsertModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition"
            >
              <Plus className="w-4 h-4" /> Add OPD Counter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCounters.map((counter) => {
              const isOperational = counter.status === "ACTIVE";
              return (
                <div
                  key={counter.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        Counter #{counter.counter_number}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base mt-1.5">{counter.counter_name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" /> {counter.department_name || "General Medicine"}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isOperational ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isOperational ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                      {counter.status}
                    </span>
                  </div>

                  {/* Token Info Highlight */}
                  <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/70 border border-amber-200/60 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-amber-800">Token Prefix</div>
                      <div className="text-lg font-mono font-black text-amber-950 mt-0.5">{counter.token_prefix || "GM-"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-amber-800">Starts At</div>
                      <div className="text-sm font-mono font-bold text-amber-950 mt-0.5">#{counter.token_start || 1}</div>
                    </div>
                  </div>

                  {/* Counter Details */}
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> Location:
                      </span>
                      <span className="font-semibold text-slate-800">{counter.location || "Room 101"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> Operating Hours:
                      </span>
                      <span className="font-semibold text-slate-800">{counter.operating_hours || "08:00 AM - 08:00 PM"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" /> Assigned Doctor:
                      </span>
                      <span className="font-semibold text-slate-800">{counter.assigned_doctor_name || "Auto-routed / On-duty"}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="text-[11px]">Auto Daily Reset Active</span>
                    <button
                      onClick={() => {
                        setFormData({
                          id: counter.id,
                          counter_name: counter.counter_name,
                          counter_number: counter.counter_number,
                          department_id: counter.department_id,
                          location: counter.location,
                          token_prefix: counter.token_prefix,
                          token_start: counter.token_start,
                          status: counter.status,
                          assigned_doctor_id: counter.assigned_doctor_id || "",
                          operating_hours: counter.operating_hours,
                          hospital_id: activeHospitalId,
                        });
                        setShowUpsertModal(true);
                      }}
                      className="text-amber-700 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <Settings2 className="w-3.5 h-3.5" /> Edit Config
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Add/Edit OPD Counter */}
        {showUpsertModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {formData.id ? "Edit OPD Counter Configuration" : "Add OPD Consultation Counter"}
                    </h2>
                    <p className="text-xs text-slate-500">Configure counter routing, token prefixes, and department mapping</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpsertModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Counter Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="4"
                      value={formData.counter_number}
                      onChange={(e) => setFormData({ ...formData, counter_number: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Counter Display Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Counter 4 - Cardiology"
                      value={formData.counter_name}
                      onChange={(e) => setFormData({ ...formData, counter_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Department *</label>
                  <select
                    required
                    value={formData.department_id}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code || "DEPT"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Token Prefix *</label>
                    <input
                      type="text"
                      required
                      placeholder="CARD-"
                      value={formData.token_prefix}
                      onChange={(e) => setFormData({ ...formData, token_prefix: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Token Starting Number</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.token_start}
                      onChange={(e) => setFormData({ ...formData, token_start: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Physical Location / Room</label>
                    <input
                      type="text"
                      placeholder="1st Floor, Room 204"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Operating Hours</label>
                    <input
                      type="text"
                      placeholder="08:00 AM - 08:00 PM"
                      value={formData.operating_hours}
                      onChange={(e) => setFormData({ ...formData, operating_hours: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Doctor (Optional)</label>
                    <select
                      value={formData.assigned_doctor_id}
                      onChange={(e) => setFormData({ ...formData, assigned_doctor_id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="">-- Dynamic / On-duty Roster --</option>
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name} ({doc.specialty || "Doctor"})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="ACTIVE">ACTIVE (Operational)</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="OFFLINE">OFFLINE</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowUpsertModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 transition shadow-sm disabled:opacity-50"
                  >
                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
                    {submitting ? "Saving Counter..." : "Save OPD Counter"}
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
