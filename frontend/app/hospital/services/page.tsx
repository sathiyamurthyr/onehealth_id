"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
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
  Tag,
  IndianRupee,
  Settings2,
  Stethoscope,
  FlaskConical,
  Scan,
  Activity,
  Scissors,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { api, HospitalServiceUpsertPayload } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";

export default function ServicesPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("oh_workspace") || "{}").hospital_ref_id : "") || "";
  const [services, setServices] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [showUpsertModal, setShowUpsertModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<HospitalServiceUpsertPayload>({
    service_name: "",
    service_code: "CONS-",
    category: "Consultation",
    department_id: "",
    duration_mins: 15,
    fee: 500,
    status: "ACTIVE",
    hospital_id: activeHospitalId,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [serviceList, deptList] = await Promise.all([
        api.hospital.getServices(activeHospitalId).catch(() => []),
        api.admin.departments().catch(() => []),
      ]);
      setServices(serviceList || []);
      setDepartments(deptList || []);
      if (deptList && deptList.length > 0 && !formData.department_id) {
        setFormData((prev) => ({ ...prev, hospital_id: activeHospitalId, department_id: deptList[0].id }));
      }
    } catch (err: any) {
      console.error("Failed to load hospital services:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeHospitalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await api.hospital.upsertService({ ...formData, hospital_id: activeHospitalId });
      setSuccessMessage(`${formData.service_name} updated in tariff catalogue!`);
      setShowUpsertModal(false);
      setFormData({
        service_name: "",
        service_code: "CONS-",
        category: "Consultation",
        department_id: departments[0]?.id || "",
        duration_mins: 15,
        fee: 500,
        status: "ACTIVE",
        hospital_id: activeHospitalId,
      });
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save hospital service.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      (s.service_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.service_code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.category || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "ALL" || s.category === selectedCategory;
    const matchesDept = selectedDept === "ALL" || s.department_id === selectedDept || s.department_name === selectedDept;
    return matchesSearch && matchesCat && matchesDept;
  });

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case "consultation":
        return <Stethoscope className="w-4 h-4 text-emerald-600" />;
      case "laboratory":
        return <FlaskConical className="w-4 h-4 text-purple-600" />;
      case "radiology":
        return <Scan className="w-4 h-4 text-blue-600" />;
      case "procedure":
        return <Scissors className="w-4 h-4 text-rose-600" />;
      default:
        return <Activity className="w-4 h-4 text-amber-600" />;
    }
  };

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
              Refresh
            </button>
            <button
              onClick={() => setShowUpsertModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Service / Tariff
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
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-emerald-400/20">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Hospital Services & Tariff Catalogue
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Clinical Services & Fee Schedule</h1>
              <p className="text-emerald-100/80 text-sm max-w-xl">
                Configure hospital services, consultation fee schedules, diagnostic investigation prices, and expected consultation durations.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
              <div className="px-3">
                <div className="text-2xl font-bold">{services.length}</div>
                <div className="text-[11px] font-medium text-emerald-200">Total Services</div>
              </div>
              <div className="px-3 border-x border-white/10">
                <div className="text-2xl font-bold text-teal-300">
                  {services.filter((s) => s.category === "Consultation").length}
                </div>
                <div className="text-[11px] font-medium text-emerald-200">Consultations</div>
              </div>
              <div className="px-3">
                <div className="text-2xl font-bold text-amber-300">
                  {services.filter((s) => s.category === "Diagnostics" || s.category === "Laboratory").length}
                </div>
                <div className="text-[11px] font-medium text-emerald-200">Diagnostics</div>
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
              placeholder="Search by service code, service name, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="ALL">All Categories</option>
              <option value="Consultation">Consultations</option>
              <option value="Diagnostics">Diagnostics</option>
              <option value="Laboratory">Laboratory</option>
              <option value="Radiology">Radiology</option>
              <option value="Procedure">Procedures</option>
            </select>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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

        {/* Services List */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading service catalogue & tariff schedule...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Services Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              No hospital services match your current filters. Add a new service to populate the tariff schedule.
            </p>
            <button
              onClick={() => setShowUpsertModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
            >
              <Plus className="w-4 h-4" /> Add First Service
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Service Code & Name</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Duration</th>
                    <th className="py-3.5 px-4">Standard Fee</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredServices.map((service) => (
                    <tr key={service.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                            {getCategoryIcon(service.category)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{service.service_name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{service.service_code}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {service.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {service.department_name || "General Medicine"}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {service.duration_mins || 15} mins
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 font-mono text-sm flex items-center">
                          <IndianRupee className="w-3.5 h-3.5 text-slate-500" />
                          {Number(service.fee || 0).toLocaleString("en-IN")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            service.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${service.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"}`}
                          />
                          {service.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setFormData({
                              id: service.id,
                              service_name: service.service_name,
                              service_code: service.service_code,
                              category: service.category,
                              department_id: service.department_id,
                              duration_mins: service.duration_mins,
                              fee: service.fee,
                              status: service.status,
                              hospital_id: activeHospitalId,
                            });
                            setShowUpsertModal(true);
                          }}
                          className="text-emerald-700 font-semibold hover:underline inline-flex items-center gap-1 text-[11px]"
                        >
                          <Settings2 className="w-3.5 h-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add/Edit Service */}
        {showUpsertModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {formData.id ? "Edit Service Tariff" : "Add Clinical Service"}
                    </h2>
                    <p className="text-xs text-slate-500">Set service code, category, duration, and billing fee</p>
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
                    <label className="block text-xs font-medium text-slate-700 mb-1">Service Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="CONS-01"
                      value={formData.service_code}
                      onChange={(e) => setFormData({ ...formData, service_code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Service Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="General Consultation"
                      value={formData.service_name}
                      onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="Consultation">Consultation</option>
                      <option value="Diagnostics">Diagnostics</option>
                      <option value="Laboratory">Laboratory</option>
                      <option value="Radiology">Radiology</option>
                      <option value="Procedure">Procedure</option>
                      <option value="Physiotherapy">Physiotherapy</option>
                      <option value="Vaccination">Vaccination</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Department *</label>
                    <select
                      required
                      value={formData.department_id}
                      onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Standard Fee (₹) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={50}
                      value={formData.fee}
                      onChange={(e) => setFormData({ ...formData, fee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Est. Duration (Minutes)</label>
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={formData.duration_mins}
                      onChange={(e) => setFormData({ ...formData, duration_mins: parseInt(e.target.value) || 15 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="ACTIVE">ACTIVE (Available for booking & billing)</option>
                    <option value="INACTIVE">INACTIVE (Temporarily suspended)</option>
                  </select>
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
                    className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
                  >
                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
                    {submitting ? "Saving..." : "Save Service Tariff"}
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
