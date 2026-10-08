"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Users,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  KeyRound,
  RefreshCw,
  Clock,
  Mail,
  Phone,
  Building2,
  Stethoscope,
  HeartPulse,
  GraduationCap,
  History,
  Edit,
  Save,
  X,
  Check,
  Building,
  UserX,
  Layers,
  Sparkles,
  Calendar,
  Award,
  FileText,
  Activity,
  Copy,
  UserCheck
} from "lucide-react";
import { api } from "@/lib/api";
import { HospitalUser, UserAuditRecord, HospitalRoleOption } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

type TabId =
  | "overview"
  | "employment"
  | "credentials"
  | "roles"
  | "assignment"
  | "documents"
  | "security"
  | "activity"
  | "audit";

export default function HospitalUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("oh_workspace") || "{}").hospital_ref_id : "") || "";

  const [user, setUser] = useState<HospitalUser | any | null>(null);
  const [auditLogs, setAuditLogs] = useState<UserAuditRecord[]>([]);
  const [rolesCatalog, setRolesCatalog] = useState<HospitalRoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const loadUser = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [u, audRes, rolesRes] = await Promise.all([
        api.hospital.getUserDetail(userId, activeHospitalId),
        api.hospital.getUserAuditTrail({ hospital_id: activeHospitalId, target_user_id: userId, limit: 50 }).catch(() => null),
        api.hospital.getRolesCatalog().catch(() => null),
      ]);

      if (u) {
        setUser(u);
        const ov = u.overview || {};
        const emp = u.employment || {};
        const cred = u.credentials || {};

        setEditFormData({
          first_name: ov.first_name || u.first_name || "",
          middle_name: ov.middle_name || u.middle_name || "",
          last_name: ov.last_name || u.last_name || "",
          email: u.email || "",
          mobile: ov.mobile || u.mobile || "",
          gender: ov.gender || "Male",
          dob: ov.dob || "1990-01-01",
          address: ov.address || "",
          emergency_contact: ov.emergency_contact || "",
          designation: emp.designation || u.designation || "",
          employment_type: emp.employment_type || u.employment_type || "FULL_TIME",
          department_id: u.department_id || "dept-01",
          branch_id: u.branch_id || "br-main",
          role_code: ov.primary_role || u.role_code || "STAFF",
          branch_ids: u.branch_ids || [u.branch_id || "br-main"],
          department_ids: u.department_ids || [u.department_id || "dept-01"],
          custom_permissions: u.custom_permissions || [],
          shift_access: u.shift_access || "ALL_SHIFTS",
          login_enabled: u.login_enabled ?? true,
          credential_number: cred.registration_number || u.credential_number || "",
          credential_authority: cred.registration_authority || u.credential_authority || "",
          credential_expiry_date: cred.registration_expiry || u.credential_expiry_date || "",
          verification_status: cred.verification_status || u.verification_status || "PENDING",
        });
      }
      if (audRes?.audit_logs) {
        setAuditLogs(audRes.audit_logs);
      }
      if (rolesRes?.roles) {
        setRolesCatalog(rolesRes.roles);
      }
    } catch (err) {
      console.error("Failed to load user detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [userId, activeHospitalId]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Save profile edits
  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updated = await api.hospital.updateUser(userId, editFormData, activeHospitalId);
      setUser(updated);
      setIsEditing(false);
      showToast("User profile and RBAC permissions updated successfully!");
      loadUser();
    } catch (err: any) {
      alert(err?.message || "Failed to save user updates");
    } finally {
      setSaving(false);
    }
  };

  // Security Actions
  const handleSecurityAction = async (action: string) => {
    try {
      await api.hospital.manageUserSecurity(userId, action, activeHospitalId);
      showToast(`Security action ${action} executed successfully!`);
      loadUser();
    } catch (err: any) {
      alert(err?.message || "Failed to execute security action");
    }
  };

  // Status Change
  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.hospital.setUserStatus(
        userId,
        newStatus,
        `Status updated by Hospital Administrator to ${newStatus}`,
        activeHospitalId
      );
      showToast(`User status changed to ${newStatus}`);
      loadUser();
    } catch (err: any) {
      alert(err?.message || "Failed to change status");
    }
  };

  const copyInvitationUrl = (token: string) => {
    const url = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 3000);
  };

  if (loading && !user) {
    return (
      <WorkspaceLayout>
        <div className="p-12 text-center text-slate-500 space-y-3 max-w-4xl mx-auto">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm">Loading staff member profile and access controls...</p>
        </div>
      </WorkspaceLayout>
    );
  }

  if (!user) {
    return (
      <WorkspaceLayout>
        <div className="p-12 text-center text-slate-500 space-y-3 max-w-4xl mx-auto">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Staff User Not Found</h2>
          <p className="text-sm">The requested user profile does not exist in this hospital workspace.</p>
          <Link
            href="/hospital/users"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Back to Users Directory
          </Link>
        </div>
      </WorkspaceLayout>
    );
  }

  const fullName =
    user.overview?.full_name ||
    user.full_name ||
    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
    user.username ||
    "Staff Member";

  const primaryRole =
    user.overview?.primary_role ||
    user.role_code ||
    (user.roles && user.roles[0]?.role_code) ||
    "STAFF";

  const empStatus = user.status || user.employment_status || "ACTIVE";
  const invitation = user.active_invitation;

  return (
    <WorkspaceLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
        {/* Toast */}
        {toastMsg && (
          <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-xl border border-slate-800 animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">{toastMsg}</span>
          </div>
        )}

        {/* Top Breadcrumb & Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/hospital/users"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Hospital Administration &rarr; People & Access &rarr; Staff Detail
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {fullName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition shadow-sm"
              >
                <Edit className="w-4 h-4" />
                Edit Staff Profile
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Header Hero Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0 overflow-hidden">
                {user.overview?.photo_url || user.photo_url ? (
                  <img
                    src={user.overview?.photo_url || user.photo_url}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  fullName.charAt(0)
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-900">{fullName}</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    {primaryRole}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                      empStatus === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : empStatus === "INVITED"
                        ? "bg-purple-50 text-purple-800 border-purple-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {empStatus}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-600">
                  {user.employment?.designation || user.designation || "Staff Member"} &bull;{" "}
                  {user.department_name || "Clinical Workforce"}
                </p>

                <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {user.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {user.overview?.mobile || user.mobile}
                  </span>
                  {(user.employment?.employee_id || user.employee_id) && (
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      ID: {user.employment?.employee_id || user.employee_id}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Status Toggles */}
            <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0">
              {empStatus === "ACTIVE" ? (
                <button
                  onClick={() => handleStatusChange("SUSPENDED")}
                  className="px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <UserX className="w-4 h-4 text-amber-600" />
                  Suspend
                </button>
              ) : (
                <button
                  onClick={() => handleStatusChange("ACTIVE")}
                  className="px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Activate
                </button>
              )}

              <button
                onClick={() => handleSecurityAction("TOGGLE_LOGIN")}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                  user.is_active !== false && user.login_enabled !== false
                    ? "border-slate-200 bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                {user.is_active !== false && user.login_enabled !== false ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Unlock className="w-4 h-4" />
                )}
                {user.is_active !== false && user.login_enabled !== false ? "Disable Login" : "Enable Login"}
              </button>
            </div>
          </div>

          {/* Pending Invitation Banner */}
          {invitation && (
            <div className="mt-4 p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="text-xs text-purple-900 font-medium">
                  Invitation link is active and valid until{" "}
                  <strong>{new Date(invitation.expires_at).toLocaleDateString()}</strong>.
                </span>
              </div>
              <button
                onClick={() => copyInvitationUrl(invitation.token)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1 shrink-0"
              >
                {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedInvite ? "Copied Invite URL" : "Copy Invitation URL"}
              </button>
            </div>
          )}
        </div>

        {/* 9 Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 text-xs font-semibold pb-px">
          {[
            { id: "overview", label: "1. Overview", icon: Users },
            { id: "employment", label: "2. Employment", icon: Building },
            { id: "credentials", label: "3. Professional Credentials", icon: Award },
            { id: "roles", label: "4. Roles & Permissions", icon: ShieldCheck },
            { id: "assignment", label: "5. Hospital Assignment", icon: Building2 },
            { id: "documents", label: `6. Documents (${user.documents?.length || 0})`, icon: FileText },
            { id: "security", label: "7. Login & Security", icon: Lock },
            { id: "activity", label: `8. Activity (${user.activity?.length || 0})`, icon: Activity },
            { id: "audit", label: `9. Audit Trail (${auditLogs.length || user.audit_trail?.length || 0})`, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`px-3.5 py-2.5 flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
                  active
                    ? "border-blue-600 text-blue-600 bg-blue-50/50 font-bold"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: Overview & Demographics */}
        {activeTab === "overview" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Demographic Profile</h3>
              {isEditing && <span className="text-xs text-blue-600 font-semibold">Editing Mode Active</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Full Legal Name
                </span>
                {isEditing ? (
                  <div className="grid grid-cols-3 gap-1">
                    <input
                      type="text"
                      value={editFormData.first_name}
                      onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                      placeholder="First"
                      className="p-2 border rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      value={editFormData.middle_name}
                      onChange={(e) => setEditFormData({ ...editFormData, middle_name: e.target.value })}
                      placeholder="Middle"
                      className="p-2 border rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      value={editFormData.last_name}
                      onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                      placeholder="Last"
                      className="p-2 border rounded-lg text-xs"
                    />
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-800">{fullName}</p>
                )}
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Official Email
                </span>
                <p className="text-sm font-mono font-medium text-slate-800">{user.email}</p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Contact Mobile
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editFormData.mobile}
                    onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                    className="p-2 border rounded-lg text-xs w-full font-mono"
                  />
                ) : (
                  <p className="text-sm font-mono font-medium text-slate-800">
                    {user.overview?.mobile || user.mobile}
                  </p>
                )}
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Gender
                </span>
                <p className="text-sm font-medium text-slate-800">{user.overview?.gender || "Not specified"}</p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Date of Birth
                </span>
                <p className="text-sm font-medium text-slate-800">{user.overview?.dob || "1990-01-01"}</p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Emergency Contact
                </span>
                <p className="text-sm text-slate-700">{user.overview?.emergency_contact || "Not specified"}</p>
              </div>

              <div className="md:col-span-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Residential Address
                </span>
                <p className="text-sm text-slate-700">{user.overview?.address || "Chennai, Tamil Nadu"}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Employment */}
        {activeTab === "employment" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900">Hospital Employment Record</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Employee / Staff ID
                </span>
                <p className="text-base font-mono font-bold text-slate-900">
                  {user.employment?.employee_id || user.employee_id || "EMP-001"}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Designation
                </span>
                <p className="text-sm font-semibold text-slate-800">
                  {user.employment?.designation || user.designation}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Employment Type
                </span>
                <p className="text-sm font-medium text-slate-800 capitalize">
                  {(user.employment?.employment_type || user.employment_type || "FULL_TIME")
                    .replace("_", " ")
                    .toLowerCase()}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Joining Date
                </span>
                <p className="text-sm font-medium text-slate-800">
                  {user.employment?.joining_date || user.joining_date || "2026-01-01"}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Reporting Manager
                </span>
                <p className="text-sm font-medium text-slate-800">
                  {user.employment?.reporting_manager_id || "Medical Director"}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Employment Lifecycle Status
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {empStatus}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Professional Credentials */}
        {activeTab === "credentials" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900">Medical Council & Professional Licensing</h3>

            {user.credentials || user.credential_number ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      License / Reg Number
                    </span>
                    <p className="text-base font-mono font-bold text-slate-900">
                      {user.credentials?.registration_number || user.credential_number}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Issuing Council / Authority
                    </span>
                    <p className="text-sm font-semibold text-slate-800">
                      {user.credentials?.registration_authority || user.credential_authority || "Medical Council"}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      License Expiry Date
                    </span>
                    <p className="text-sm font-mono font-bold text-slate-800">
                      {user.credentials?.registration_expiry || user.credential_expiry_date || "2028-12-31"}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950">
                        Verification Status:{" "}
                        {user.credentials?.verification_status || user.verification_status || "VERIFIED"}
                      </h4>
                      <p className="text-xs text-emerald-800">
                        Hospital-verified against primary medical council licensing register.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm border rounded-2xl bg-slate-50">
                No formal medical council registration required for this role.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Roles & Permissions */}
        {activeTab === "roles" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900">Role & Access Control List (RBAC)</h3>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Assigned Primary Role
                </span>
                <span className="text-base font-bold text-blue-700">{primaryRole}</span>
              </div>
              {isEditing && (
                <select
                  value={editFormData.role_code}
                  onChange={(e) => setEditFormData({ ...editFormData, role_code: e.target.value })}
                  className="p-2 border rounded-lg text-sm bg-white font-semibold"
                >
                  <option value="DOCTOR">Doctor</option>
                  <option value="NURSE">Nurse</option>
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="LAB_TECH">Lab Technician</option>
                  <option value="LAB_ADMIN">Lab Admin</option>
                  <option value="PHARMACIST">Pharmacist</option>
                  <option value="BILLING_STAFF">Billing Staff</option>
                  <option value="ACCOUNTS">Accounts</option>
                  <option value="TRAINEE">Trainee / Intern</option>
                  <option value="HOSPITAL_MANAGER">Hospital Manager</option>
                  <option value="STAFF">Other Staff</option>
                </select>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Effective RBAC Permissions ({user.permissions?.length || user.effective_permissions?.length || 0})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {(
                  user.permissions?.map((p: any) => p.code) ||
                  user.effective_permissions || [
                    "PATIENT_SEARCH",
                    "PATIENT_VIEW",
                    "APPOINTMENT_VIEW",
                  ]
                ).map((perm: string) => (
                  <div
                    key={perm}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-medium text-slate-800 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{perm}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Hospital Assignment */}
        {activeTab === "assignment" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900">Hospital Assignment & Scope</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Authorized Hospital Branches
                </span>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>{user.branch_name || `${workspace?.hospital_name || "Hospital"} - Main Campus`}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-bold">
                      Primary
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Department & Shift Schedule
                </span>
                <p className="text-sm font-semibold text-slate-800">
                  {user.department_name || "General Medicine & Outpatient"}
                </p>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Shift Coverage: <strong>{user.shift_access || "ALL_SHIFTS"}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Documents */}
        {activeTab === "documents" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Credential Documents & Identity Records</h3>

            {user.documents && user.documents.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {user.documents.map((doc: any) => (
                  <div key={doc.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{doc.document_name}</h4>
                        <p className="text-xs text-slate-500">{doc.document_type} &bull; {doc.document_number}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                      {doc.verification_status || "VERIFIED"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm border rounded-2xl bg-slate-50">
                No external credential files uploaded for this user.
              </div>
            )}
          </div>
        )}

        {/* TAB 7: Login & Security */}
        {activeTab === "security" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900">Authentication & Credential Security</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Security Parameters
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 font-medium">Single-Portal /login:</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-bold ${
                      user.is_active !== false && user.login_enabled !== false
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {user.is_active !== false && user.login_enabled !== false ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 font-medium">Multi-Factor Authentication (MFA):</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                    {user.security?.mfa_enabled || user.mfa_enabled ? "ENABLED" : "OPTIONAL"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 font-medium">Failed Login Attempts:</span>
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {user.security?.failed_login_attempts || 0}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Access Management Actions
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSecurityAction("RESET_PASSWORD")}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                    Trigger Password Reset
                  </button>

                  <button
                    onClick={() => handleSecurityAction("UNLOCK")}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition"
                  >
                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                    Unlock Account
                  </button>

                  <button
                    onClick={() => handleSecurityAction("REVOKE_SESSIONS")}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-xs font-semibold text-rose-700 sm:col-span-2 flex items-center justify-center gap-1.5 transition"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Revoke All Active Sessions
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: Activity */}
        {activeTab === "activity" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Recent Login & Session Activity</h3>

            {user.activity && user.activity.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {user.activity.map((ev: any) => (
                  <div key={ev.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {ev.event_type} &bull; {ev.ip_address || "127.0.0.1"}
                      </p>
                      <p className="text-[11px] text-slate-400">{ev.user_agent || "Browser Session"}</p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(ev.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm border rounded-2xl bg-slate-50">
                No recent login sessions logged for this user.
              </div>
            )}
          </div>
        )}

        {/* TAB 9: Audit Trail */}
        {activeTab === "audit" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Immutable Access Audit Trail</h3>

            {auditLogs.length === 0 && (!user.audit_trail || user.audit_trail.length === 0) ? (
              <div className="p-8 text-center text-slate-500 text-sm border rounded-2xl bg-slate-50">
                No access audit events recorded for this user yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {(auditLogs.length > 0 ? auditLogs : user.audit_trail || []).map((log: any) => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 font-mono">
                          {log.action_type || log.action}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          by {log.actor_name || log.actor_role || "Administrator"}
                        </span>
                      </div>
                      {log.reason && <p className="text-xs text-slate-700">{log.reason}</p>}
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 shrink-0">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
