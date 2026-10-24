"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  ArrowLeft,
  Users,
  CheckCircle2,
  Building,
  RefreshCw,
  Search,
  Check
} from "lucide-react";
import { api } from "@/lib/api";
import { HospitalUser } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function HospitalBranchAccessPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || "";

  const [users, setUsers] = useState<HospitalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!activeHospitalId) return;
    api.hospital.getUsers({ hospital_id: activeHospitalId, limit: 100 })
      .then((res) => {
        if (res?.users) setUsers(res.users);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeHospitalId]);

  const filteredUsers = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.role_code.toLowerCase().includes(search.toLowerCase())
  );

  const mainBranchName = `${workspace?.hospital_name || "Hospital"} (Main Campus)`;
  const satelliteBranchName = `${workspace?.hospital_name || "Hospital"} (Satellite Branch)`;

  return (
    <WorkspaceLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
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
                  Administration &rarr; Users & Access &rarr; Branches
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Branch Access Matrix
              </h1>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter staff by name or role..."
              className="w-full max-w-md px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
            />
          </div>

          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-5 py-3.5">Staff Member</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">{mainBranchName}</th>
                <th className="px-4 py-3.5">{satelliteBranchName}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const branchIds = u.branch_ids || (u.branch_id ? [u.branch_id] : ["br-main"]);
                const hasMain = branchIds.length > 0;
                const hasBranch2 = branchIds.length > 1;
                return (
                  <tr key={u.user_id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      <Link href={`/hospital/users/${u.user_id}`} className="hover:underline">
                        {u.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">
                      {u.role_code}
                    </td>
                    <td className="px-4 py-3.5">
                      {hasMain ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Authorized
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {hasBranch2 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Authorized
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">&mdash;</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
