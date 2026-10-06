"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Users,
  CheckCircle2,
  RefreshCw,
  Search,
  Check
} from "lucide-react";
import { api } from "@/lib/api";
import { HospitalUser } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function HospitalSecurityManagementPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || "hosp-kedar";

  const [users, setUsers] = useState<HospitalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.hospital.getUsers({ hospital_id: activeHospitalId, limit: 100 });
      if (res?.users) setUsers(res.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeHospitalId]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleAction = async (userId: string, action: string, userName: string) => {
    try {
      await api.hospital.manageUserSecurity(userId, action, activeHospitalId);
      showToast(`Action ${action} completed for ${userName}`);
      loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to execute action");
    }
  };

  return (
    <WorkspaceLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
        {toastMsg && (
          <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-xl border border-slate-800 animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">{toastMsg}</span>
          </div>
        )}

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
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  Administration &rarr; Users & Access &rarr; Security
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Login & Security Governance
              </h1>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Login Enabled</th>
                <th className="px-4 py-3.5">Failed Attempts</th>
                <th className="px-5 py-3.5 text-right">Security Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.user_id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-3.5">
                    <Link href={`/hospital/users/${u.user_id}`} className="font-bold text-slate-900 hover:underline">
                      {u.full_name}
                    </Link>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-slate-700">{u.role_code}</td>
                  <td className="px-4 py-3.5">
                    {u.login_enabled ? (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-700">
                    {u.failed_login_attempts || 0}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleAction(u.user_id, "TOGGLE_LOGIN", u.full_name)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-100"
                      >
                        {u.login_enabled ? "Disable Login" : "Enable Login"}
                      </button>
                      <button
                        onClick={() => handleAction(u.user_id, "RESET_PASSWORD", u.full_name)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-100"
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => handleAction(u.user_id, "REVOKE_SESSIONS", u.full_name)}
                        className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-medium"
                      >
                        Revoke Sessions
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
