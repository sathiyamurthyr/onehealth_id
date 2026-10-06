"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
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
  Mail,
  Phone,
  Send,
  UserCheck,
  Briefcase,
  UserPlus,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { api, StaffInvitationPayload } from "@/lib/api";

export default function StaffPage() {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<StaffInvitationPayload>({
    full_name: "",
    email: "",
    mobile: "",
    role_code: "RECEPTIONIST",
    department_id: "",
    employment_type: "FULL_TIME",
    hospital_id: "hosp-kedar",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [invList, deptList] = await Promise.all([
        api.hospital.getInvitations("hosp-kedar").catch(() => []),
        api.admin.departments().catch(() => []),
      ]);
      setInvitations(invList || []);
      setDepartments(deptList || []);
      if (deptList && deptList.length > 0 && !formData.department_id) {
        setFormData((prev) => ({ ...prev, department_id: deptList[0].id }));
      }
    } catch (err: any) {
      console.error("Failed to load staff invitations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await api.hospital.createInvitation(formData);
      setSuccessMessage(`Invitation sent to ${formData.full_name} (${formData.email})!`);
      setShowInviteModal(false);
      setFormData({
        full_name: "",
        email: "",
        mobile: "",
        role_code: "RECEPTIONIST",
        department_id: departments[0]?.id || "",
        employment_type: "FULL_TIME",
        hospital_id: "hosp-kedar",
      });
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send staff invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInvitations = invitations.filter((inv) => {
    const matchesSearch =
      (inv.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.role_code || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === "ALL" || inv.role_code === selectedRole;
    return matchesSearch && matchesRole;
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
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm"
            >
              <UserPlus className="w-4 h-4" /> Invite Staff Member
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
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-blue-400/20">
                <Users className="w-3.5 h-3.5" /> Staff Operations & Invitations
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Hospital Staff & Account Invitations</h1>
              <p className="text-blue-100/80 text-sm max-w-xl">
                Manage receptionists, billing staff, laboratory technicians, pharmacists, IT managers, and automated onboarding invitations.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
              <div className="px-3">
                <div className="text-2xl font-bold">{invitations.length}</div>
                <div className="text-[11px] font-medium text-blue-200">Invitations Issued</div>
              </div>
              <div className="px-3 border-x border-white/10">
                <div className="text-2xl font-bold text-emerald-300">
                  {invitations.filter((i) => i.status === "ACTIVE" || i.status === "ACCEPTED").length}
                </div>
                <div className="text-[11px] font-medium text-blue-200">Active Accounts</div>
              </div>
              <div className="px-3">
                <div className="text-2xl font-bold text-amber-300">
                  {invitations.filter((i) => i.status === "SENT" || i.status === "PENDING").length}
                </div>
                <div className="text-[11px] font-medium text-blue-200">Pending Acceptance</div>
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
              placeholder="Search by staff name, email, or role code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Staff Roles</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="BILLING_STAFF">Billing Staff</option>
              <option value="LAB_TECHNICIAN">Lab Technician</option>
              <option value="PHARMACIST">Pharmacist</option>
              <option value="IT_SUPPORT">IT Support</option>
              <option value="MANAGER">Operations Manager</option>
            </select>
          </div>
        </div>

        {/* Staff Invitations Table */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading staff onboarding & invitations...</p>
          </div>
        ) : filteredInvitations.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Staff Invitations</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              No staff invitations match the filter. Click "Invite Staff Member" to onboard new personnel.
            </p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
            >
              <UserPlus className="w-4 h-4" /> Invite First Staff Member
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Staff Name & Contact</th>
                    <th className="py-3.5 px-4">Assigned Role</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Employment</th>
                    <th className="py-3.5 px-4">Invitation Status</th>
                    <th className="py-3.5 px-4 text-right">Invited At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{inv.full_name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1 font-mono">
                            <Mail className="w-3 h-3 text-slate-400" /> {inv.email}
                          </span>
                          {inv.mobile && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" /> {inv.mobile}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          {inv.role_code}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {inv.department_name || "General Hospital Operations"}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">{inv.employment_type || "FULL_TIME"}</td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            inv.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : inv.status === "ACCEPTED"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {inv.status === "ACTIVE" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {inv.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-500 font-mono text-[11px]">
                        {inv.invited_at ? new Date(inv.invited_at).toLocaleDateString() : "Today"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invite Staff Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Invite Hospital Staff</h2>
                    <p className="text-xs text-slate-500">Send secure onboarding email with pre-configured role</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Senthil Nathan"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="senthil.frontdesk@kedarhospital.in"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Mobile Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98410 99887"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Role / Function *</label>
                    <select
                      value={formData.role_code}
                      onChange={(e) => setFormData({ ...formData, role_code: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="RECEPTIONIST">Receptionist (Front Desk & Check-in)</option>
                      <option value="BILLING_STAFF">Billing & Cashier</option>
                      <option value="LAB_TECHNICIAN">Laboratory Technician</option>
                      <option value="PHARMACIST">Pharmacist (Dispensary)</option>
                      <option value="IT_SUPPORT">IT Support & Security</option>
                      <option value="HR_ADMIN">HR Coordinator</option>
                      <option value="MANAGER">Operations Manager</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                    <select
                      value={formData.department_id}
                      onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">General Hospital Administration</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Employment Type</label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                  >
                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {submitting ? "Sending..." : "Send Invitation"}
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
