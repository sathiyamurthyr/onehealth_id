"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Hospital, Building2, Search, Filter, PlusCircle, ShieldAlert,
  CheckCircle2, XCircle, AlertTriangle, ExternalLink, RefreshCw,
  MoreVertical, Eye, Settings, ShieldCheck, Clock, Check, X,
  MapPin, Phone, Mail, Award, Users, Receipt
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { api, PlatformHospital, PlatformClient, SubscriptionPlan } from "@/lib/api";

export default function SuperAdminHospitalsPage() {
  const [hospitals, setHospitals] = useState<PlatformHospital[]>([]);
  const [clients, setClients] = useState<PlatformClient[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal States
  const [selectedHospitalForStatus, setSelectedHospitalForStatus] = useState<PlatformHospital | null>(null);
  const [targetStatus, setTargetStatus] = useState<"ACTIVE" | "SUSPENDED" | "INACTIVE">("SUSPENDED");
  const [statusReason, setStatusReason] = useState("");
  const [statusTicketRef, setStatusTicketRef] = useState("");
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  // Onboarding Modal
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [newHospName, setNewHospName] = useState("");
  const [newHospCode, setNewHospCode] = useState("");
  const [newHospClient, setNewHospClient] = useState("");
  const [newHospCity, setNewHospCity] = useState("");
  const [newHospState, setNewHospState] = useState("");
  const [newHospPlan, setNewHospPlan] = useState("");
  const [newHospPhone, setNewHospPhone] = useState("");
  const [newHospEmail, setNewHospEmail] = useState("");
  const [isOnboarding, setIsOnboarding] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [hospList, clientList, subList] = await Promise.all([
        api.superAdmin.listHospitals(),
        api.superAdmin.listClients(),
        api.superAdmin.listSubscriptions(),
      ]);
      setHospitals(hospList || []);
      setClients(clientList || []);
      const loadedPlans = subList?.plans || [];
      setPlans(loadedPlans);
      if (loadedPlans.length > 0) {
        setNewHospPlan((prev) => prev || loadedPlans[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load hospitals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredHospitals = hospitals.filter((h) => {
    const matchesSearch =
      !search ||
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.code.toLowerCase().includes(search.toLowerCase()) ||
      h.city.toLowerCase().includes(search.toLowerCase()) ||
      (h.client_name && h.client_name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || h.lifecycle_status === statusFilter;
    const matchesPlan = planFilter === "ALL" || h.plan_tier === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const handleOpenStatusModal = (hosp: PlatformHospital, action: "ACTIVE" | "SUSPENDED" | "INACTIVE") => {
    setSelectedHospitalForStatus(hosp);
    setTargetStatus(action);
    setStatusReason(action === "SUSPENDED" ? "Subscription payment overdue by 30 days" : "Re-activated following payment settlement & audit");
    setStatusTicketRef("");
  };

  const handleConfirmStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospitalForStatus) return;
    if (!statusReason.trim()) {
      alert("A mandatory audit reason must be provided.");
      return;
    }

    try {
      setIsSubmittingStatus(true);
      const res = await api.superAdmin.updateHospitalStatus(selectedHospitalForStatus.id, {
        new_status: targetStatus,
        reason: statusReason.trim(),
        ticket_ref: statusTicketRef.trim() || undefined,
      });
      setSuccessMsg(res.message || `Hospital ${selectedHospitalForStatus.name} status updated to ${targetStatus}`);
      setSelectedHospitalForStatus(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update hospital status.");
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospName.trim()) return;

    try {
      setIsOnboarding(true);
      const res = await api.superAdmin.onboardHospital({
        name: newHospName.trim(),
        code: newHospCode.trim() || undefined,
        client_id: newHospClient || undefined,
        city: newHospCity.trim() || "Chennai",
        state: newHospState.trim() || "Tamil Nadu",
        plan_id: newHospPlan || plans[0]?.id || "ENTERPRISE",
        phone: newHospPhone.trim() || undefined,
        email: newHospEmail.trim() || undefined,
      });
      setSuccessMsg(`Hospital '${res?.name || newHospName}' successfully onboarded!`);
      setShowOnboardModal(false);
      setNewHospName("");
      setNewHospCode("");
      setNewHospClient("");
      setNewHospCity("");
      setNewHospState("");
      setNewHospPhone("");
      setNewHospEmail("");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to onboard hospital.");
    } finally {
      setIsOnboarding(false);
    }
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl lg:text-2xl font-black text-slate-900">Hospital &amp; Clinic Network</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                {hospitals.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Global directory of hospitals, health centers, and specialty clinics running on Sathus OneHealth ID.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/super-admin/hospitals/applications"
              className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-2 transition"
            >
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              Onboarding Approvals
            </Link>
            <Link
              href="/super-admin/hospitals/new"
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md shadow-blue-500/20"
            >
              <PlusCircle className="w-4 h-4" />
              Onboard Hospital
            </Link>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by hospital name, code, city, or client group..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
            >
              <option value="ALL">All Lifecycle Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="PENDING">Pending Verification</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
            >
              <option value="ALL">All SaaS Plans</option>
              <option value="STARTER">Starter</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="ENTERPRISE">Enterprise</option>
              <option value="GOVERNMENT">Government</option>
            </select>
          </div>
        </div>

        {/* Hospitals Table */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Hospital / Facility</th>
                  <th className="py-3.5 px-4">Client Network</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">SaaS Plan</th>
                  <th className="py-3.5 px-4">MRR / Billing</th>
                  <th className="py-3.5 px-4">Capacity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHospitals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No hospitals found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredHospitals.map((hosp) => (
                    <tr key={hosp.id} className="hover:bg-slate-50/60 transition group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            hosp.lifecycle_status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            hosp.lifecycle_status === "SUSPENDED" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                            "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {hosp.code.slice(0, 2)}
                          </div>
                          <div>
                            <Link href={`/super-admin/hospitals/${hosp.id}`} className="font-bold text-slate-900 hover:text-purple-600 transition">
                              {hosp.name}
                            </Link>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                              <span className="font-mono">{hosp.code}</span>
                              {hosp.featured_badge && (
                                <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[9px]">
                                  {hosp.featured_badge}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700">{hosp.client_name || "Independent Facility"}</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {hosp.city}, {hosp.state}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200 text-[10px]">
                          {hosp.plan_tier || "PRO"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-black text-slate-900">
                            ₹{(hosp.mrr_amount || 0).toLocaleString("en-IN")}/mo
                          </span>
                          <span className={`block text-[10px] font-bold ${
                            hosp.payment_status === "PAID" ? "text-emerald-600" :
                            hosp.payment_status === "OVERDUE" ? "text-rose-600" :
                            "text-amber-600"
                          }`}>
                            {hosp.payment_status || "PAID"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        <span>{hosp.doctor_count} Doctors</span> • <span>{hosp.enabled_features_count} Feats</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          hosp.lifecycle_status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" :
                          hosp.lifecycle_status === "SUSPENDED" ? "bg-rose-100 text-rose-800" :
                          "bg-amber-100 text-amber-800"
                        }`}>
                          {hosp.lifecycle_status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/super-admin/hospitals/${hosp.id}`}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                          >
                            Details
                          </Link>
                          {hosp.lifecycle_status === "ACTIVE" ? (
                            <button
                              onClick={() => handleOpenStatusModal(hosp, "SUSPENDED")}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenStatusModal(hosp, "ACTIVE")}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Safe Status Transition Modal (Suspend / Activate) ── */}
        {selectedHospitalForStatus && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  targetStatus === "SUSPENDED" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {targetStatus === "SUSPENDED" ? "Suspend Hospital Platform Access" : "Activate Hospital Facility"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedHospitalForStatus.name} ({selectedHospitalForStatus.code})
                  </p>
                </div>
              </div>

              {targetStatus === "SUSPENDED" ? (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs mb-4">
                  <p className="font-bold mb-1">⚠ Critical Operational Effect:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700">
                    <li>Hospital administrators, doctors, and staff will immediately lose workspace access.</li>
                    <li>Online patient appointment booking will be restricted.</li>
                    <li>Patient medical records are safely retained in cold storage per healthcare legal retention requirements.</li>
                  </ul>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs mb-4">
                  <p className="font-bold mb-1">✓ Platform Access Re-activation:</p>
                  <p className="text-[11px] text-emerald-700">
                    All hospital clinical staff workspaces and patient appointment booking services will be instantly restored.
                  </p>
                </div>
              )}

              <form onSubmit={handleConfirmStatusChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mandatory Audit Reason <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide detailed compliance, billing, or operational reason for this action..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Optional Support Ticket / Reference ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TKT-2026-803 or INV-SATHUS-004"
                    value={statusTicketRef}
                    onChange={(e) => setStatusTicketRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedHospitalForStatus(null)}
                    disabled={isSubmittingStatus}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingStatus}
                    className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition shadow-sm ${
                      targetStatus === "SUSPENDED" ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500"
                    }`}
                  >
                    {isSubmittingStatus ? "Processing..." : `Confirm ${targetStatus === "SUSPENDED" ? "Suspension" : "Activation"}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Onboard Hospital Modal ── */}
        {showOnboardModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Hospital className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Onboard Hospital Facility</h3>
                    <p className="text-xs text-slate-500">Register new hospital or clinic under a client network</p>
                  </div>
                </div>
                <button onClick={() => setShowOnboardModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleOnboardSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hospital / Facility Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. City Healthcare Centre"
                    value={newHospName}
                    onChange={(e) => setNewHospName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Facility Code</label>
                    <input
                      type="text"
                      placeholder="e.g. CHC-CHE-01"
                      value={newHospCode}
                      onChange={(e) => setNewHospCode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Client Group</label>
                    <select
                      value={newHospClient}
                      onChange={(e) => setNewHospClient(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    >
                      <option value="">No Group (Independent Hospital)</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Chennai, Mumbai, Bengaluru"
                      value={newHospCity}
                      onChange={(e) => setNewHospCity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">SaaS Subscription Plan</label>
                    <select
                      value={newHospPlan}
                      onChange={(e) => setNewHospPlan(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    >
                      {plans.length === 0 && <option value="">No plans available</option>}
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.monthly_price !== undefined ? `(₹${Number(p.monthly_price).toLocaleString("en-IN")}/mo)` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Official Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 44 2476 0000"
                      value={newHospPhone}
                      onChange={(e) => setNewHospPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      placeholder="e.g. contact@hospital.org"
                      value={newHospEmail}
                      onChange={(e) => setNewHospEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowOnboardModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isOnboarding}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    {isOnboarding ? "Onboarding..." : "Onboard Hospital"}
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
