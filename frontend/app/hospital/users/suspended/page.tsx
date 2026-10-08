"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  UserX,
  ArrowLeft,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Unlock,
  ShieldAlert
} from "lucide-react";
import { api } from "@/lib/api";
import { HospitalUser } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function HospitalSuspendedUsersPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("oh_workspace") || "{}").hospital_ref_id : "") || "";

  const [users, setUsers] = useState<HospitalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.hospital.getUsers({ hospital_id: activeHospitalId, limit: 100 });
      if (res?.users) {
        setUsers(res.users.filter((u) => ["SUSPENDED", "INACTIVE", "LOCKED", "TERMINATED"].includes(u.employment_status)));
      }
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

  const handleReactivate = async (userId: string, userName: string) => {
    try {
      await api.hospital.setUserStatus(
        userId,
        "ACTIVE",
        "Reactivated by Hospital Administrator",
        activeHospitalId
      );
      showToast(`User ${userName} reactivated successfully!`);
      loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to reactivate user");
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
                <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                  Administration &rarr; Users & Access &rarr; Suspended
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Suspended & Inactive Users
              </h1>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              <p className="text-sm">Loading suspended user records...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Suspended Users</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                All staff accounts are in good standing or active.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
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
                    <td className="px-4 py-3.5 text-xs text-slate-700">{u.role_code}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-700">{u.department_name || "General"}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {u.employment_status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleReactivate(u.user_id, u.full_name)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                      >
                        Reactivate Account
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
