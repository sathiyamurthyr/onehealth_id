"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  KeyRound,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Building2,
  Stethoscope,
  HeartPulse,
  Clock,
  MoreVertical,
  Mail,
  Phone,
  Eye,
  Edit,
  UserX,
  History,
  ShieldAlert,
  Sparkles,
  Building,
  GraduationCap,
  Layers,
  Check,
  Trash2
} from "lucide-react";
import { api } from "@/lib/api";
import { HospitalUser, AccessReviewSummary } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function HospitalUsersPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("oh_workspace") || "{}").hospital_ref_id : "") || "";

  // Data State
  const [users, setUsers] = useState<HospitalUser[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [categories, setCategories] = useState<any>(null);
  const [accessReview, setAccessReview] = useState<AccessReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Action Modals State
  const [selectedUserForStatus, setSelectedUserForStatus] = useState<HospitalUser | null>(null);
  const [statusAction, setStatusAction] = useState<string>("SUSPENDED");
  const [statusReason, setStatusReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Password Modal State
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<HospitalUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Quick Contact Edit Modal State
  const [selectedUserForContact, setSelectedUserForContact] = useState<HospitalUser | null>(null);
  const [contactForm, setContactForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
  });

  // Delete User Modal State
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<HospitalUser | null>(null);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [res, revRes] = await Promise.all([
        api.hospital.getUsers({
          hospital_id: activeHospitalId,
          role_code: selectedRole,
          department_id: selectedDept,
          branch_id: selectedBranch,
          status: selectedStatus,
          search: search.trim() || undefined,
          limit: 100,
        }),
        api.hospital.getAccessReview(activeHospitalId).catch(() => null)
      ]);

      if (res) {
        setUsers(res.users || []);
        setMetrics(res.metrics || null);
        setCategories(res.categories || null);
      }
      if (revRes) {
        setAccessReview(revRes);
      }
    } catch (err) {
      console.error("Failed to load hospital users:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, [activeHospitalId, selectedRole, selectedDept, selectedBranch, selectedStatus]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Status Change Handler
  const handleStatusChangeSubmit = async () => {
    if (!selectedUserForStatus) return;
    setActionLoading(true);
    try {
      await api.hospital.setUserStatus(
        selectedUserForStatus.user_id,
        statusAction,
        statusReason || `Updated by Administrator to ${statusAction}`,
        activeHospitalId
      );
      showToast(`User ${selectedUserForStatus.full_name || selectedUserForStatus.username || "staff"} status updated to ${statusAction}`);
      setSelectedUserForStatus(null);
      setStatusReason("");
      loadData(true);
    } catch (err: any) {
      alert(err?.message || "Failed to update user status");
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Security Action
  const handleQuickSecurityAction = async (user: HospitalUser, action: string) => {
    try {
      await api.hospital.manageUserSecurity(user.user_id, action, activeHospitalId);
      showToast(`Security action ${action} applied for ${user.full_name || user.username || "staff"}`);
      loadData(true);
    } catch (err: any) {
      alert(err?.message || `Failed to execute security action`);
    }
  };

  // Password Update Handler
  const handlePasswordSubmit = async () => {
    if (!selectedUserForPassword) return;
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }
    setActionLoading(true);
    setPasswordError(null);
    try {
      await api.hospital.setUserPassword(selectedUserForPassword.user_id, newPassword, activeHospitalId);
      showToast(`Password successfully updated for ${selectedUserForPassword.full_name || selectedUserForPassword.username || "staff"}`);
      setSelectedUserForPassword(null);
      setNewPassword("");
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to update password.");
    } finally {
      setActionLoading(false);
    }
  };

  // Contact Details Update Handler (Mobile & Email)
  const handleContactSubmit = async () => {
    if (!selectedUserForContact) return;
    setActionLoading(true);
    try {
      await api.hospital.updateUser(
        selectedUserForContact.user_id,
        {
          first_name: contactForm.first_name,
          last_name: contactForm.last_name,
          email: contactForm.email,
          mobile: contactForm.mobile,
        },
        activeHospitalId
      );
      showToast(`Contact information updated for ${contactForm.first_name || selectedUserForContact.full_name || "staff"}`);
      setSelectedUserForContact(null);
      loadData(true);
    } catch (err: any) {
      alert(err?.message || "Failed to update contact details");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete / Remove User Handler
  const handleDeleteSubmit = async () => {
    if (!selectedUserForDelete) return;
    setActionLoading(true);
    try {
      await api.hospital.deleteUser(selectedUserForDelete.user_id, activeHospitalId);
      showToast(`User ${selectedUserForDelete.full_name || selectedUserForDelete.username || "staff"} has been removed from active staff.`);
      setSelectedUserForDelete(null);
      loadData(true);
    } catch (err: any) {
      alert(err?.message || "Failed to remove user");
    } finally {
      setActionLoading(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string, loginEnabled: boolean) => {
    const s = (status || "ACTIVE").toUpperCase();
    switch (s) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Active
          </span>
        );
      case "INVITED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            Invited
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Suspended
          </span>
        );
      case "LOCKED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Lock className="w-3 h-3 text-rose-600" />
            Locked
          </span>
        );
      case "INACTIVE":
      case "TERMINATED":
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3 h-3 text-slate-400" />
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  // Role Badge Helper
  const renderRoleBadge = (roleCode: string) => {
    const rc = (roleCode || "STAFF").toUpperCase();
    let badgeClass = "bg-slate-100 text-slate-700 border-slate-200";
    if (rc === "DOCTOR") badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold";
    else if (rc === "NURSE") badgeClass = "bg-rose-50 text-rose-800 border-rose-200 font-semibold";
    else if (rc === "TRAINEE") badgeClass = "bg-purple-50 text-purple-800 border-purple-200 font-semibold";
    else if (rc === "RECEPTIONIST") badgeClass = "bg-cyan-50 text-cyan-800 border-cyan-200 font-semibold";
    else if (rc.includes("LAB")) badgeClass = "bg-amber-50 text-amber-800 border-amber-200 font-semibold";
    else if (rc.includes("PHARMACY")) badgeClass = "bg-teal-50 text-teal-800 border-teal-200 font-semibold";
    else if (rc.includes("ADMIN") || rc.includes("MANAGER")) badgeClass = "bg-blue-50 text-blue-800 border-blue-200 font-semibold";

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${badgeClass}`}>
        {rc.replace("_", " ")}
      </span>
    );
  };

  const totalAccessAlerts = useMemo(() => {
    if (!accessReview?.summary) return 0;
    return (
      (accessReview.summary.expiring_credentials_count || 0) +
      (accessReview.summary.expired_credentials_count || 0) +
      (accessReview.summary.inactive_accounts_count || 0) +
      (accessReview.summary.locked_accounts_count || 0)
    );
  }, [accessReview]);

  return (
    <WorkspaceLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Toast Notification */}
        {successToast && (
          <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-xl border border-slate-800 animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">{successToast}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Hospital User Management
                </h1>
                <p className="text-sm text-slate-500">
                  Administration &rarr; Users & Access central governance, RBAC permissions, and credential lifecycle.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData(false)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
              title="Refresh staff records"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            </button>

            <Link
              href="/hospital/users/access-review"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-sm font-semibold transition shadow-sm"
            >
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Access Review
              {totalAccessAlerts > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs bg-amber-500 text-white font-bold">
                  {totalAccessAlerts}
                </span>
              )}
            </Link>

            <Link
              href="/hospital/users/create"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold shadow-sm shadow-blue-500/20 transition"
            >
              <UserPlus className="w-4 h-4" />
              Create User
            </Link>
          </div>
        </div>

        {/* Operational Access Review Banner (If active alerts exist) */}
        {totalAccessAlerts > 0 && accessReview && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  Access Governance Attention Required ({totalAccessAlerts} alerts)
                </h4>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-800 mt-0.5">
                  {accessReview.summary.expired_credentials_count > 0 && (
                    <span>&bull; <strong>{accessReview.summary.expired_credentials_count}</strong> expired registrations</span>
                  )}
                  {accessReview.summary.expiring_credentials_count > 0 && (
                    <span>&bull; <strong>{accessReview.summary.expiring_credentials_count}</strong> credentials expiring soon</span>
                  )}
                  {accessReview.summary.inactive_accounts_count > 0 && (
                    <span>&bull; <strong>{accessReview.summary.inactive_accounts_count}</strong> dormant accounts (&gt;90d)</span>
                  )}
                  {accessReview.summary.locked_accounts_count > 0 && (
                    <span>&bull; <strong>{accessReview.summary.locked_accounts_count}</strong> locked accounts</span>
                  )}
                </div>
              </div>
            </div>

            <Link
              href="/hospital/users/access-review"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition"
            >
              Review & Remediate
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Metrics KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-medium uppercase tracking-wider">Total Staff</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {metrics?.total_users || users.length}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
              <span>{categories?.doctors_count || 0} Doctors</span> &bull; <span>{categories?.nurses_count || 0} Nurses</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-medium uppercase tracking-wider">Active Logins</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">
              {metrics?.active_users || users.filter((u) => u.employment_status === "ACTIVE").length}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1">
              Single-portal /login active
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-medium uppercase tracking-wider">Pending Invites</span>
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {metrics?.invited_users || users.filter((u) => u.employment_status === "INVITED").length}
            </div>
            <Link href="/hospital/users/invitations" className="text-[11px] text-blue-600 hover:underline mt-1 block">
              Manage Invitations &rarr;
            </Link>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-medium uppercase tracking-wider">Suspended / Locked</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-rose-700">
              {(metrics?.suspended_users || 0) + (metrics?.locked_users || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Records intact / non-destructive
            </div>
          </div>
        </div>

        {/* Sub-Navigation Quick Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 text-sm">
          <Link
            href="/hospital/users"
            className="px-3.5 py-2 font-semibold text-blue-600 border-b-2 border-blue-600 flex items-center gap-2 shrink-0"
          >
            <Users className="w-4 h-4" />
            All Users ({users.length})
          </Link>
          <Link
            href="/hospital/users/create"
            className="px-3.5 py-2 font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Create User
          </Link>
          <Link
            href="/hospital/users/invitations"
            className="px-3.5 py-2 font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2 shrink-0"
          >
            <Mail className="w-4 h-4" />
            Pending Invitations
          </Link>
          <Link
            href="/hospital/users/roles"
            className="px-3.5 py-2 font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2 shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            Roles & Permissions
          </Link>
          <Link
            href="/hospital/users/branches"
            className="px-3.5 py-2 font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2 shrink-0"
          >
            <Building2 className="w-4 h-4" />
            Branch Access
          </Link>
          <Link
            href="/hospital/users/security"
            className="px-3.5 py-2 font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2 shrink-0"
          >
            <Lock className="w-4 h-4" />
            Login & Security
          </Link>
          <Link
            href="/hospital/users/suspended"
            className="px-3.5 py-2 font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2 shrink-0"
          >
            <UserX className="w-4 h-4" />
            Suspended Users
          </Link>
          <Link
            href="/hospital/users/audit"
            className="px-3.5 py-2 font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2 shrink-0"
          >
            <History className="w-4 h-4" />
            Access Audit
          </Link>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff by name, email, employee ID, mobile..."
                className="w-full pl-9.5 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            {/* Role Filter */}
            <div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-700"
              >
                <option value="ALL">All Roles</option>
                <option value="DOCTOR">Doctor</option>
                <option value="NURSE">Nurse</option>
                <option value="RECEPTIONIST">Receptionist</option>
                <option value="LAB_TECH">Lab Technician</option>
                <option value="LAB_ADMIN">Lab Admin</option>
                <option value="PHARMACIST">Pharmacist</option>
                <option value="PHARMACY_STAFF">Pharmacy Staff</option>
                <option value="RADIOLOGY_TECH">Radiology Tech</option>
                <option value="BILLING_STAFF">Billing Staff</option>
                <option value="ACCOUNTS">Accounts</option>
                <option value="HOSPITAL_MANAGER">Hospital Manager</option>
                <option value="DEPT_COORDINATOR">Dept Coordinator</option>
                <option value="TRAINEE">Trainee / Intern</option>
                <option value="STAFF">Other Staff</option>
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-700"
              >
                <option value="ALL">All Departments</option>
                <option value="dept-k-01">Cardiology</option>
                <option value="dept-k-02">Orthopedics</option>
                <option value="dept-k-03">General Medicine</option>
                <option value="dept-k-04">Pediatrics</option>
                <option value="dept-k-05">Emergency & Triage</option>
                <option value="dept-k-06">Radiology</option>
                <option value="dept-k-07">Laboratory</option>
                <option value="dept-k-08">Pharmacy</option>
                <option value="dept-k-09">Administration</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INVITED">Invited / Pending</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="LOCKED">Locked</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              <p className="text-sm">Loading staff directory and permissions...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No staff members found</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                No users match your active filter criteria. Try adjusting the search term or role filter.
              </p>
              <Link
                href="/hospital/users/create"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                <UserPlus className="w-4 h-4" />
                Create New User
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">User / Staff Member</th>
                    <th className="px-4 py-3.5">Role & Designation</th>
                    <th className="px-4 py-3.5">Department & Branch</th>
                    <th className="px-4 py-3.5">Credentials & Expiry</th>
                    <th className="px-4 py-3.5">Status & Login</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u, idx) => {
                    const displayName =
                      u.full_name ||
                      `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
                      u.username ||
                      u.email ||
                      "Staff Member";
                    const initial = (displayName || "S").charAt(0).toUpperCase();

                    return (
                      <tr key={u.membership_id || `${u.user_id}-${u.role_code || idx}`} className="hover:bg-slate-50/60 transition group">
                        {/* Name & Contact */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0 text-sm overflow-hidden">
                              {u.photo_url ? (
                                <img src={u.photo_url} alt={displayName} className="w-full h-full object-cover" />
                              ) : (
                                initial
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/hospital/users/${u.user_id}`}
                                className="font-bold text-slate-900 hover:text-blue-600 transition truncate block group-hover:underline"
                              >
                                {displayName}
                              </Link>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                <span className="truncate">{u.email}</span>
                                {u.employee_id && (
                                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                    {u.employee_id}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                      {/* Role & Designation */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {renderRoleBadge(u.role_code)}
                            {u.additional_roles && u.additional_roles.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                +{u.additional_roles.length}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 truncate font-medium">
                            {u.designation || u.role_code}
                          </div>
                          <div className="text-[11px] text-slate-400 capitalize">
                            {(u.employment_type || "FULL_TIME").replace("_", " ").toLowerCase()}
                          </div>
                        </div>
                      </td>

                      {/* Department & Branch */}
                      <td className="px-4 py-4">
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{u.department_name || "General"}</span>
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {u.branch_name || "Main Branch"}
                          </div>
                          {u.branch_ids && u.branch_ids.length > 1 && (
                            <span className="inline-block text-[10px] text-blue-600 font-semibold">
                              Multi-branch ({u.branch_ids.length})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Credentials */}
                      <td className="px-4 py-4">
                        {u.credential_number ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-xs font-mono font-medium text-slate-800">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">{u.credential_number}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {u.credential_authority || "Medical Authority"}
                            </div>
                            {u.credential_expiry_date && (
                              <div className="text-[10px] text-slate-500">
                                Exp: {u.credential_expiry_date}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not applicable</span>
                        )}
                      </td>

                      {/* Status & Login */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {renderStatusBadge(u.employment_status, u.login_enabled)}
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            {u.login_enabled ? (
                              <span className="text-emerald-600 font-medium">Login enabled</span>
                            ) : (
                              <span className="text-slate-400 font-medium">Login disabled</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Edit Contact Info (Mobile, Email, Name) */}
                          <button
                            onClick={() => {
                              setSelectedUserForContact(u);
                              const parts = (u.full_name || "").trim().split(" ");
                              setContactForm({
                                first_name: u.first_name || parts[0] || "",
                                last_name: u.last_name || parts.slice(1).join(" ") || "",
                                email: u.email || "",
                                mobile: u.mobile || "",
                              });
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition"
                            title="Edit Contact Info (Phone / Email)"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Update / Reset Password */}
                          <button
                            onClick={() => {
                              setSelectedUserForPassword(u);
                              setNewPassword("");
                              setPasswordError(null);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-amber-50 text-slate-600 hover:text-amber-700 transition"
                            title="Update Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* View Full Profile */}
                          <Link
                            href={`/hospital/users/${u.user_id}`}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                            title="View / Edit Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* Quick Toggle Login */}
                          <button
                            onClick={() => handleQuickSecurityAction(u, "TOGGLE_LOGIN")}
                            className={`p-1.5 rounded-lg border transition ${
                              u.login_enabled
                                ? "border-slate-200 hover:bg-rose-50 text-slate-600 hover:text-rose-600"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                            title={u.login_enabled ? "Disable Login" : "Enable Login"}
                          >
                            {u.login_enabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>

                          {/* Status Transition Modal Trigger */}
                          <button
                            onClick={() => {
                              setSelectedUserForStatus(u);
                              setStatusAction(u.employment_status === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                            title="Change Status / Suspend"
                          >
                            <UserX className="w-4 h-4" />
                          </button>

                          {/* Remove User from Hospital */}
                          <button
                            onClick={() => setSelectedUserForDelete(u)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition"
                            title="Remove User from Hospital"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Change Status / Suspend Modal */}
        {selectedUserForStatus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Update Account Status
                  </h3>
                  <p className="text-sm text-slate-500">
                    Non-destructive status management for <strong>{selectedUserForStatus.full_name || selectedUserForStatus.username || selectedUserForStatus.email || "Staff Member"}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUserForStatus(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Target Employment Status
                  </label>
                  <select
                    value={statusAction}
                    onChange={(e) => setStatusAction(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE (Enable login & roster access)</option>
                    <option value="SUSPENDED">SUSPENDED (Temporarily freeze login & appointments)</option>
                    <option value="INACTIVE">INACTIVE (Dormant staff member)</option>
                    <option value="LOCKED">LOCKED (Security lock)</option>
                    <option value="TERMINATED">TERMINATED (Offboarded - preserve clinical records)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Audit Log Reason / Notes
                  </label>
                  <textarea
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="Enter explicit reason for audit trail (e.g., Extended medical leave, Relocation, Resignation)..."
                    rows={3}
                    className="w-full p-3 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Enterprise RBAC Guarantee:</strong> Historical consultation records, prescriptions, and billing entries authored by this user remain strictly preserved.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForStatus(null)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStatusChangeSubmit}
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading ? "Updating..." : "Confirm Status Change"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Change / Update Password Modal */}
        {selectedUserForPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Update User Password</h3>
                    <p className="text-xs text-slate-500">
                      Set a new password for <strong>{selectedUserForPassword.full_name || selectedUserForPassword.username || selectedUserForPassword.email || "Staff Member"}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUserForPassword(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {passwordError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    The user will be able to log in immediately with this new password.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPassword(null)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePasswordSubmit}
                  disabled={actionLoading || !newPassword}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  {actionLoading ? "Updating..." : "Set Password"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Edit Contact Details Modal */}
        {selectedUserForContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                    <Edit className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Edit Contact Details</h3>
                    <p className="text-xs text-slate-500">
                      Update contact and profile details for <strong>{selectedUserForContact.full_name || selectedUserForContact.username || selectedUserForContact.email || "Staff Member"}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUserForContact(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={contactForm.first_name}
                      onChange={(e) => setContactForm({ ...contactForm, first_name: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={contactForm.last_name}
                      onChange={(e) => setContactForm({ ...contactForm, last_name: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mobile Phone *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={contactForm.mobile}
                      onChange={(e) => setContactForm({ ...contactForm, mobile: e.target.value })}
                      placeholder="+91 98401 23456"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Synchronized across user login profile, doctor register, and nursing staff databases.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForContact(null)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleContactSubmit}
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {actionLoading ? "Saving..." : "Save Contact Info"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove / Delete User Confirmation Modal */}
        {selectedUserForDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Remove Staff Member</h3>
                    <p className="text-xs text-slate-500">
                      Remove from hospital active roster
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUserForDelete(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 space-y-2">
                <p className="font-semibold text-sm">
                  Are you sure you want to remove <strong>{selectedUserForDelete.full_name || selectedUserForDelete.username || selectedUserForDelete.email || "Staff Member"}</strong>?
                </p>
                <p>
                  This will terminate their hospital membership, disable single-portal login, and mark their roster availability as inactive.
                </p>
                <p className="text-[11px] text-rose-700 font-medium">
                  Past clinical documents, consultations, and prescriptions authored by this user remain preserved for regulatory compliance.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForDelete(null)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {actionLoading ? "Removing..." : "Confirm Removal"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
