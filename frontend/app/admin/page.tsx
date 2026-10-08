"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Shield,
  Activity,
  ArrowRight,
  Sparkles,
  CreditCard,
  Zap,
  LifeBuoy,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";

const SATHUS_SECTIONS = [
  { href: "/super-admin", icon: Shield, label: "Platform Overview", desc: "Executive SaaS health, real-time MRR, and hospital metrics", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { href: "/super-admin/hospitals", icon: Building2, label: "Hospitals & Facilities", desc: "Directory, lifecycle activation, safe suspension, and profiles", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { href: "/super-admin/clients", icon: Users, label: "Clients & Networks", desc: "Manage healthcare customer groups, contracts, and stakeholders", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { href: "/super-admin/subscriptions", icon: Zap, label: "SaaS Subscriptions", desc: "Tiered licensing plans (Starter, Pro, Enterprise, Govt)", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { href: "/super-admin/payments", icon: CreditCard, label: "Billing & Invoices", desc: "Revenue tracking, 18% GST invoices, and collection recording", color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-200" },
  { href: "/super-admin/features", icon: Sparkles, label: "Feature Matrix", desc: "Real-time per-hospital feature gating & backend entitlement", color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-200" },
  { href: "/super-admin/support", icon: LifeBuoy, label: "Customer Support", desc: "Multi-tenant ticketing desk with SLA auto-assignment", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  { href: "/super-admin/security", icon: Shield, label: "Security & Impersonation", desc: "Audited support access delegation and zero-chart protection", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
  { href: "/super-admin/health", icon: Activity, label: "System Health", desc: "PostgreSQL telemetry, latency benchmarks, and gateway status", color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-200" },
];

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Optionally auto-redirect to super-admin
    // router.push("/super-admin");
  }, [router]);

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-200 border border-purple-400/30 rounded-full text-xs font-semibold">
              <Shield className="w-3.5 h-3.5 text-purple-300" />
              Sathus Technology Platform Control
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Platform Admin Console</h1>
            <p className="text-purple-200 text-sm max-w-xl">
              Unified governance, multi-hospital subscription monetization, feature entitlements, and security compliance.
            </p>
          </div>

          <Link
            href="/super-admin"
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg transition text-sm whitespace-nowrap"
          >
            Launch Super Admin Hub <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SATHUS_SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`bg-white border ${s.border} rounded-3xl p-6 hover:shadow-md transition group flex flex-col justify-between`}
              >
                <div>
                  <div className={`w-12 h-12 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">{s.label}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{s.desc}</p>
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${s.color}`}>
                  Open Console <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
