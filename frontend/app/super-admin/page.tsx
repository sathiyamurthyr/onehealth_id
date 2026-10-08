"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2, Hospital, Users, CreditCard, ShieldCheck, Activity,
  ArrowUpRight, ArrowDownRight, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, RefreshCw, PlusCircle, Search, ExternalLink, ShieldAlert,
  ChevronRight, Sparkles, Filter, Receipt, FileText, HeartPulse
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { api, PlatformMetrics, PlatformHospital, SaaSInvoice } from "@/lib/api";

export default function SuperAdminDashboardPage() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [recentHospitals, setRecentHospitals] = useState<PlatformHospital[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<SaaSInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setError("");
      const [m, h, inv] = await Promise.all([
        api.superAdmin.getMetrics(),
        api.superAdmin.listHospitals({ limit: 6 }),
        api.superAdmin.listPayments({ limit: 5 })
      ]);
      setMetrics(m && typeof m === "object" && "total_hospitals" in m ? m : (m as any)?.data || null);
      setRecentHospitals(Array.isArray(h) ? h : (h as any)?.data || []);
      setRecentInvoices(Array.isArray(inv) ? inv : (inv as any)?.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load platform telemetry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatINR = (amount?: number) => {
    if (amount === undefined || amount === null) return "₹0";
    return "₹" + amount.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* ── Top Hero Banner with Sathus Technology Identity ── */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white border border-purple-800/40 rounded-3xl p-6 lg:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-400/30 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                  Sathus Technology Platform
                </span>
                <span className="text-xs text-slate-300 font-mono">OH-ID SaaS Governance</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
                Platform Super Admin Console
              </h1>
              <p className="text-sm text-purple-200/80 mt-1 max-w-2xl">
                Global healthcare facility oversight, SaaS subscription monetization, per-facility feature entitlements, and audited tenant operations.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Updating..." : "Refresh Live"}
              </button>
              <Link
                href="/super-admin/hospitals"
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2 transition"
              >
                <PlusCircle className="w-4 h-4" />
                Manage Hospitals
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Metric Cards Grid (100% Real Aggregated DB Counts) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Monthly Recurring Revenue (MRR) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-purple-300 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SaaS MRR</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              {loading ? "..." : formatINR(metrics?.mrr)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mt-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{metrics?.active_subscriptions_count || 0} active subscriptions</span>
            </div>
          </div>

          {/* Total Hospitals */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-blue-300 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Hospitals</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Hospital className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              {loading ? "..." : metrics?.total_hospitals ?? 0}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-2">
              <span className="text-emerald-600 font-bold">{metrics?.active_hospitals ?? 0} Active</span>
              <span>•</span>
              <span className="text-amber-600 font-bold">{metrics?.pending_hospitals ?? 0} Pending</span>
              <span>•</span>
              <span className="text-rose-600 font-bold">{metrics?.suspended_hospitals ?? 0} Suspended</span>
            </div>
          </div>

          {/* Registered Doctors & Staff */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-emerald-300 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Doctors & Staff</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              {loading ? "..." : (metrics?.total_doctors ?? 0) + (metrics?.total_staff ?? 0)}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-2">
              <span className="text-emerald-700 font-semibold">{metrics?.total_doctors ?? 0} Doctors</span>
              <span>•</span>
              <span>{metrics?.total_staff ?? 0} Nurses &amp; Staff</span>
            </div>
          </div>

          {/* Total Patients */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-cyan-300 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Patients</span>
              <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              {loading ? "..." : metrics?.total_patients?.toLocaleString("en-IN") ?? 0}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-cyan-700 font-semibold mt-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
              <span>OneHealth ID Verified Registry</span>
            </div>
          </div>
        </div>

        {/* ── Quick Platform Governance Navigation Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { href: "/super-admin/hospitals", label: "Hospitals", count: `${metrics?.total_hospitals ?? 0} registered`, icon: Hospital, color: "text-blue-600", bg: "bg-blue-50" },
            { href: "/super-admin/clients", label: "Clients & Groups", count: `${metrics?.total_clients ?? 0} groups`, icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
            { href: "/super-admin/subscriptions", label: "Plans & MRR", count: `${metrics?.active_subscriptions_count ?? 0} active`, icon: Receipt, color: "text-emerald-600", bg: "bg-emerald-50" },
            { href: "/super-admin/payments", label: "SaaS Billing", count: formatINR(metrics?.pending_payments_amount), icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50" },
            { href: "/super-admin/support", label: "Support Desk", count: `${metrics?.open_support_tickets_count ?? 0} open`, icon: HeartPulse, color: "text-rose-600", bg: "bg-rose-50" },
            { href: "/super-admin/health", label: "System Health", count: "99.98% Uptime", icon: Activity, color: "text-cyan-600", bg: "bg-cyan-50" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 hover:shadow-md hover:border-slate-300 transition group flex flex-col justify-between"
              >
                <div className={`w-9 h-9 ${item.bg} ${item.color} rounded-xl flex items-center justify-center mb-2`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition flex items-center justify-between">
                    {item.label}
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">{item.count}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── Main Dashboard Split: Recent Hospitals vs SaaS Revenue Collections ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Registered Hospitals Overview (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Hospital Directory &amp; SaaS Status</h2>
                  <p className="text-xs text-slate-500">Live platform network facilities, plans, and activation states</p>
                </div>
                <Link
                  href="/super-admin/hospitals"
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  View All ({metrics?.total_hospitals ?? 0}) <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {recentHospitals.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No hospitals registered yet.
                  </div>
                ) : (
                  recentHospitals.map((hosp) => (
                    <div key={hosp.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl px-2 transition">
                      <div className="flex items-center gap-3 truncate">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          hosp.lifecycle_status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          hosp.lifecycle_status === "SUSPENDED" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                          "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                          {hosp.code?.slice(0, 2) || "HP"}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <Link href={`/super-admin/hospitals/${hosp.id}`} className="text-xs font-bold text-slate-900 hover:text-purple-600 truncate">
                              {hosp.name}
                            </Link>
                            {hosp.plan_tier && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 text-[9px] font-bold border border-purple-200">
                                {hosp.plan_tier}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">
                            {hosp.city}, {hosp.state} • {hosp.doctor_count ?? 0} Doctors • {hosp.enabled_features_count ?? 0} Features
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          hosp.lifecycle_status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" :
                          hosp.lifecycle_status === "SUSPENDED" ? "bg-rose-100 text-rose-800" :
                          "bg-amber-100 text-amber-800"
                        }`}>
                          {hosp.lifecycle_status}
                        </span>
                        <Link
                          href={`/super-admin/hospitals/${hosp.id}`}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Sathus Zero-Direct-Query RBAC Engine</span>
              <Link href="/super-admin/features" className="font-semibold text-purple-600 hover:underline">
                Configure Feature Entitlements →
              </Link>
            </div>
          </div>

          {/* Right: SaaS Invoices & Payment Collections (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">SaaS Invoices &amp; Collections</h2>
                  <p className="text-xs text-slate-500">18% GST B2B subscription licenses</p>
                </div>
                <Link
                  href="/super-admin/payments"
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  Billing Hub <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-2.5">
                {recentInvoices.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No recent SaaS invoices.
                  </div>
                ) : (
                  recentInvoices.map((inv) => (
                    <div key={inv.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {inv.hospital_name || inv.hospital_id}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {inv.invoice_number}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Due: {new Date(inv.due_date).toLocaleDateString()} • {inv.notes || "SaaS License"}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-slate-900">{formatINR(inv.total_amount)}</p>
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          inv.payment_status === "PAID" ? "bg-emerald-100 text-emerald-800" :
                          inv.payment_status === "OVERDUE" ? "bg-rose-100 text-rose-800" :
                          "bg-amber-100 text-amber-800"
                        }`}>
                          {inv.payment_status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 bg-purple-50/60 -mx-6 -mb-6 p-4 rounded-b-3xl flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-purple-900 tracking-wider">Pending Collections</p>
                <p className="text-sm font-black text-purple-950">{formatINR(metrics?.pending_payments_amount)}</p>
              </div>
              <Link
                href="/super-admin/payments"
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Record Payment
              </Link>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
