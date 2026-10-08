"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowLeft,
  AlertTriangle,
  Clock,
  UserX,
  Lock,
  Mail,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Users,
  Unlock,
  KeyRound,
  Eye,
  Check
} from "lucide-react";
import { api } from "@/lib/api";
import { AccessReviewSummary } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function HospitalAccessReviewPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("oh_workspace") || "{}").hospital_ref_id : "") || "";

  const [reviewData, setReviewData] = useState<AccessReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadAccessReview = async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const data = await api.hospital.getAccessReview(activeHospitalId);
      if (data) setReviewData(data);
    } catch (err) {
      console.error("Failed to load access review:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAccessReview(false);
  }, [activeHospitalId]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Remediation Action: Deactivate Dormant Account
  const handleDeactivateUser = async (userId: string, userName: string) => {
    setActionLoading(userId);
    try {
      await api.hospital.setUserStatus(
        userId,
        "INACTIVE",
        "Deactivated during periodic Access Review due to >90 days dormancy",
        activeHospitalId
      );
      showToast(`Account for ${userName} set to INACTIVE`);
      loadAccessReview(true);
    } catch (err: any) {
      alert(err?.message || "Failed to deactivate user");
    } finally {
      setActionLoading(null);
    }
  };

  // Remediation Action: Unlock Account
  const handleUnlockUser = async (userId: string, userName: string) => {
    setActionLoading(userId);
    try {
      await api.hospital.manageUserSecurity(userId, "UNLOCK", activeHospitalId);
      showToast(`Account for ${userName} unlocked`);
      loadAccessReview(true);
    } catch (err: any) {
      alert(err?.message || "Failed to unlock user");
    } finally {
      setActionLoading(null);
    }
  };

  // Remediation Action: Reactivate User
  const handleActivateUser = async (userId: string, userName: string) => {
    setActionLoading(userId);
    try {
      await api.hospital.setUserStatus(
        userId,
        "ACTIVE",
        "Reactivated during Access Review by Administrator",
        activeHospitalId
      );
      showToast(`Account for ${userName} reactivated`);
      loadAccessReview(true);
    } catch (err: any) {
      alert(err?.message || "Failed to activate user");
    } finally {
      setActionLoading(null);
    }
  };

  const summary = reviewData?.summary;
  const details = reviewData?.details;

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

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/hospital/users"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                  Administration &rarr; Governance
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Hospital Access Review
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Operational Safety
                </span>
              </h1>
            </div>
          </div>

          <button
            onClick={() => loadAccessReview(false)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            Run Live Audit Scan
          </button>
        </div>

        {/* Hero Alert Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Expired Regs
            </span>
            <div className="text-2xl font-bold text-rose-700">
              {summary?.expired_credentials_count || 0}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Expiring (30d)
            </span>
            <div className="text-2xl font-bold text-amber-700">
              {summary?.expiring_credentials_count || 0}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Dormant (&gt;90d)
            </span>
            <div className="text-2xl font-bold text-slate-800">
              {summary?.inactive_accounts_count || 0}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Excessive Perms
            </span>
            <div className="text-2xl font-bold text-purple-700">
              {summary?.excessive_permissions_count || 0}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Pending Invites
            </span>
            <div className="text-2xl font-bold text-blue-700">
              {summary?.pending_invitations_count || 0}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Locked Users
            </span>
            <div className="text-2xl font-bold text-rose-700">
              {summary?.locked_accounts_count || 0}
            </div>
          </div>
        </div>

        {/* SECTION 1: Expired Credentials */}
        {details?.expired_credentials && details.expired_credentials.users.length > 0 && (
          <div className="p-6 rounded-2xl bg-white border border-rose-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-950">
                  Expired Professional Registrations ({details.expired_credentials.users.length})
                </h3>
                <p className="text-xs text-rose-800">
                  Medical Council or Nursing license has expired. Action required to renew license or pause clinical authorization.
                </p>
              </div>
            </div>

            <div className="divide-y divide-rose-100">
              {details.expired_credentials.users.map((u) => (
                <div key={u.user_id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/hospital/users/${u.user_id}`}
                      className="text-sm font-bold text-slate-900 hover:text-blue-600 transition"
                    >
                      {u.full_name}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="font-semibold text-rose-700">{u.role_code}</span>
                      <span>&bull;</span>
                      <span>{u.department_name || "Department"}</span>
                      <span>&bull;</span>
                      <span className="font-mono text-rose-800 font-bold">
                        Expired on: {u.credential_expiry_date || "Past Due"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/hospital/users/${u.user_id}`}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50 transition"
                    >
                      Update Credential
                    </Link>
                    <button
                      onClick={() => handleDeactivateUser(u.user_id, u.full_name)}
                      disabled={actionLoading === u.user_id}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50"
                    >
                      Pause Access
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2: Expiring Credentials (30 Days) */}
        {details?.expiring_credentials_30d && details.expiring_credentials_30d.users.length > 0 && (
          <div className="p-6 rounded-2xl bg-white border border-amber-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-amber-950">
                  Credentials Expiring Within 30 Days ({details.expiring_credentials_30d.users.length})
                </h3>
                <p className="text-xs text-amber-800">
                  Notify clinical staff to renew license before regulatory validity lapse.
                </p>
              </div>
            </div>

            <div className="divide-y divide-amber-100">
              {details.expiring_credentials_30d.users.map((u) => (
                <div key={u.user_id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/hospital/users/${u.user_id}`}
                      className="text-sm font-bold text-slate-900 hover:text-blue-600 transition"
                    >
                      {u.full_name}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="font-semibold text-amber-700">{u.role_code}</span>
                      <span>&bull;</span>
                      <span className="font-mono">Reg: {u.credential_number}</span>
                      <span>&bull;</span>
                      <span className="font-mono font-bold text-amber-800">
                        Expires: {u.credential_expiry_date}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/hospital/users/${u.user_id}`}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition"
                  >
                    Review & Verify
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 3: Dormant Accounts (>90 Days Inactive) */}
        {details?.inactive_accounts_90d && details.inactive_accounts_90d.users.length > 0 && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
                <UserX className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Dormant Staff Accounts (&gt;90 Days Inactive) ({details.inactive_accounts_90d.users.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Staff accounts with no login activity for over 90 days. Recommended to set status to INACTIVE.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {details.inactive_accounts_90d.users.map((u) => (
                <div key={u.user_id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/hospital/users/${u.user_id}`}
                      className="text-sm font-bold text-slate-900 hover:text-blue-600 transition"
                    >
                      {u.full_name}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span>{u.role_code}</span>
                      <span>&bull;</span>
                      <span>{u.department_name || "General"}</span>
                      <span>&bull;</span>
                      <span>Last Login: {u.last_login_at || "Never logged in"}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeactivateUser(u.user_id, u.full_name)}
                    disabled={actionLoading === u.user_id}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold transition"
                  >
                    Deactivate Dormant Account
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 4: Locked or Suspended Accounts */}
        {details?.locked_or_suspended_accounts && details.locked_or_suspended_accounts.users.length > 0 && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Locked or Suspended Users ({details.locked_or_suspended_accounts.users.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Accounts blocked due to failed password attempts or administrative suspension.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {details.locked_or_suspended_accounts.users.map((u) => (
                <div key={u.user_id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/hospital/users/${u.user_id}`}
                      className="text-sm font-bold text-slate-900 hover:text-blue-600 transition"
                    >
                      {u.full_name}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="font-bold text-rose-700">{u.employment_status}</span>
                      <span>&bull;</span>
                      <span>Failed Attempts: {u.failed_login_attempts || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUnlockUser(u.user_id, u.full_name)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Unlock & Clear Attempts
                    </button>
                    <button
                      onClick={() => handleActivateUser(u.user_id, u.full_name)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
                    >
                      Reactivate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
