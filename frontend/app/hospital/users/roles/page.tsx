"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Building2,
  Stethoscope,
  HeartPulse,
  Clock,
  Sparkles,
  Layers,
  Users
} from "lucide-react";
import { api } from "@/lib/api";
import { HospitalRoleOption } from "@/lib/types";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function HospitalRolesCatalogPage() {
  const [roles, setRoles] = useState<HospitalRoleOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.hospital.getRolesCatalog().then((res) => {
      if (res?.roles) setRoles(res.roles);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

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
                  Administration &rarr; Users & Access &rarr; Roles
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Roles & Permissions Catalog
              </h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((r) => (
            <div
              key={r.code}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{r.title}</h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                      {r.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                  {r.category}
                </span>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Default Role Permissions ({r.default_permissions?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {r.default_permissions.map((p) => (
                    <span
                      key={p}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
