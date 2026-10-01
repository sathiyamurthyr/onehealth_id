"use client";

import React from "react";
import { Building2, Users, Shield, Activity, Settings, AlertTriangle, Eye, ArrowRight, PlusCircle } from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";

const ADMIN_SECTIONS = [
  { href: "/admin/organizations", icon: Building2, label: "Organizations", desc: "Manage tenant organizations and hospital groups", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { href: "/admin/hospitals",     icon: Building2, label: "Hospitals",     desc: "Add and configure hospital facilities across the network", color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200" },
  { href: "/admin/users",         icon: Users,     label: "Users",         desc: "Manage all platform users, roles, and account status", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { href: "/admin/roles",         icon: Shield,    label: "Roles & RBAC",  desc: "Configure role-based access control and permissions",   color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200" },
  { href: "/admin/audit",         icon: Eye,       label: "Audit Logs",    desc: "Review all system actions for compliance and security",  color: "text-rose-600",   bg: "bg-rose-50",   border: "border-rose-200" },
  { href: "/admin/monitoring",    icon: Activity,  label: "System Monitoring", desc: "Real-time platform health metrics and alerts",       color: "text-cyan-600",   bg: "bg-cyan-50",   border: "border-cyan-200" },
];

export default function AdminPage() {
  return (
    <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-200">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Super Admin Console</h1>
              <p className="text-sm text-slate-500">Platform-wide administration, governance, and monitoring</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADMIN_SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`bg-white border ${s.border} rounded-2xl p-5 hover:shadow-md transition group`}
              >
                <div className={`w-10 h-10 ${s.bg} ${s.color} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{s.label}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{s.desc}</p>
                <div className={`flex items-center gap-1 text-xs font-semibold ${s.color}`}>
                  Open <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
