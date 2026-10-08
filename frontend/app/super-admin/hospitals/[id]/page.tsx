"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Hospital, Building2, ShieldCheck, CreditCard, Receipt, Activity,
  Users, CheckCircle2, AlertTriangle, ArrowLeft, RefreshCw, Lock,
  Phone, Mail, MapPin, Calendar, FileText, Settings, Award, Eye,
  Clock, ShieldAlert, Sparkles, Check, X
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { api, PlatformHospital, FeatureEntitlement, SaaSInvoice } from "@/lib/api";

export default function SuperAdminHospitalDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const hospitalId = resolvedParams.id;

  const [hospital, setHospital] = useState<PlatformHospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "FEATURES" | "BILLING" | "AUDIT">("OVERVIEW");
  const [updatingFeature, setUpdatingFeature] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const loadDetails = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.superAdmin.getHospitalDetails(hospitalId);
      setHospital(data);
    } catch (err: any) {
      setError(err.message || "Failed to load hospital details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [hospitalId]);

  const handleToggleFeature = async (feat: FeatureEntitlement) => {
    if (!hospital) return;
    try {
      setUpdatingFeature(feat.feature_key);
      const res = await api.superAdmin.updateFeature(hospital.id, {
        feature_key: feat.feature_key,
        is_enabled: !feat.is_enabled,
      });
      setMsg(res.message || `Feature ${feat.feature_name} updated`);
      loadDetails();
    } catch (err: any) {
      alert(err.message || "Failed to toggle feature");
    } finally {
      setUpdatingFeature(null);
    }
  };

  if (loading) {
    return (
      <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
        <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
          <span>Loading hospital 360° profile...</span>
        </div>
      </WorkspaceLayout>
    );
  }

  if (error || !hospital) {
    return (
      <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-rose-800 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
          <h2 className="text-base font-bold">Hospital Not Found</h2>
          <p className="text-xs text-rose-600 mt-1">{error || "Could not retrieve hospital profile."}</p>
          <Link href="/super-admin/hospitals" className="mt-4 inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold">
            Back to Directory
          </Link>
        </div>
      </WorkspaceLayout>
    );
  }

  const features: FeatureEntitlement[] = Array.isArray(hospital.features)
    ? hospital.features
    : hospital.features && typeof hospital.features === "object"
      ? Object.entries(hospital.features).map(([key, val]) => ({
          id: `feat-${key}`,
          hospital_id: hospital.id || "",
          feature_key: key,
          feature_name: typeof val === "object" && val !== null && (val as any).feature_name
            ? (val as any).feature_name
            : key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          category: ((typeof val === "object" && val !== null && (val as any).category) || "CORE") as any,
          is_enabled: typeof val === "object" && val !== null ? Boolean((val as any).is_enabled) : Boolean(val),
          configured_at: new Date().toISOString(),
        }))
      : [];

  const invoices: SaaSInvoice[] = Array.isArray(hospital.invoices) ? hospital.invoices : [];
  const auditLogs = Array.isArray(hospital.audit_logs) ? hospital.audit_logs : [];

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Top Navigation Back */}
        <div className="flex items-center justify-between">
          <Link
            href="/super-admin/hospitals"
            className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Hospital Directory
          </Link>
          <button
            onClick={loadDetails}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Profile
          </button>
        </div>

        {msg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{msg}</span>
            </div>
            <button onClick={() => setMsg("")}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ── Hospital Profile Header Card ── */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 lg:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 ${
                hospital.lifecycle_status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                hospital.lifecycle_status === "SUSPENDED" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                "bg-slate-100 text-slate-700 border border-slate-200"
              }`}>
                {hospital.code.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl lg:text-2xl font-black text-slate-900">{hospital.name}</h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    hospital.lifecycle_status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" :
                    hospital.lifecycle_status === "SUSPENDED" ? "bg-rose-100 text-rose-800" :
                    "bg-amber-100 text-amber-800"
                  }`}>
                    {hospital.lifecycle_status}
                  </span>
                  {hospital.featured_badge && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                      {hospital.featured_badge}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-bold text-slate-700">{hospital.code}</span>
                  <span>•</span>
                  <span>{hospital.client_name || "Independent"}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {hospital.city}, {hospital.state}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/super-admin/security"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" /> Support Impersonation
              </Link>
              <Link
                href={`/super-admin/hospitals`}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Change Status
              </Link>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-100 overflow-x-auto">
            {[
              { key: "OVERVIEW", label: "Overview & Capacity", icon: Hospital },
              { key: "FEATURES", label: "Feature Entitlements", icon: ShieldCheck, count: features.filter(f => f.is_enabled).length },
              { key: "BILLING", label: "SaaS Subscriptions & Invoices", icon: Receipt, count: invoices.length },
              { key: "AUDIT", label: "Platform Audit Log", icon: FileText, count: auditLogs.length },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 ${
                    isActive
                      ? "bg-purple-50 text-purple-700 border border-purple-200/80"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                      isActive ? "bg-purple-200 text-purple-900" : "bg-slate-100 text-slate-500"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TAB 1: OVERVIEW & ORGANIZATION ── */}
        {activeTab === "OVERVIEW" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Facility Details (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Hospital Facility Information
              </h2>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Client Network</span>
                  <span className="font-semibold text-slate-800">{hospital.client_name || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Facility Code</span>
                  <span className="font-mono font-semibold text-slate-800">{hospital.code}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Official Phone</span>
                  <span className="font-semibold text-slate-800">{hospital.phone || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Email</span>
                  <span className="font-semibold text-slate-800">{hospital.email || "N/A"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Physical Address</span>
                  <span className="font-semibold text-slate-800">{hospital.address || `${hospital.city}, ${hospital.state}`}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Onboarded Date</span>
                  <span className="font-semibold text-slate-800">
                    {hospital.onboarded_at ? new Date(hospital.onboarded_at).toLocaleDateString() : "Active"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Verification Status</span>
                  <span className="font-bold text-emerald-600">{hospital.verification_status || "VERIFIED"}</span>
                </div>
              </div>

              {hospital.suspension_reason && (
                <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <p className="font-bold">Suspension Record:</p>
                  <p className="mt-0.5">{hospital.suspension_reason}</p>
                  {hospital.suspension_ticket_ref && (
                    <p className="font-mono text-[10px] mt-1 text-rose-600">Ref: {hospital.suspension_ticket_ref}</p>
                  )}
                </div>
              )}
            </div>

            {/* Capacity & Usage (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-4">
                  Capacity &amp; Active Quotas
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Doctors</span>
                    <span className="text-xl font-black text-slate-900">{hospital.doctor_count ?? 0}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Staff &amp; Nurses</span>
                    <span className="text-xl font-black text-slate-900">{hospital.staff_count ?? 0}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Departments</span>
                    <span className="text-xl font-black text-slate-900">{hospital.department_count ?? 0}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Features Enabled</span>
                    <span className="text-xl font-black text-purple-700">{hospital.enabled_features_count ?? features.filter(f => f.is_enabled).length}</span>
                  </div>
                </div>
              </div>

              {/* Current Subscription Card */}
              <div className="bg-gradient-to-tr from-purple-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 text-[10px] font-bold uppercase tracking-wider">
                    {hospital.plan_tier || "PRO"} PLAN
                  </span>
                  <span className="text-xs text-purple-200 font-bold">
                    {hospital.billing_cycle || "MONTHLY"}
                  </span>
                </div>
                <div className="text-2xl font-black text-white mt-2">
                  ₹{(hospital.mrr_amount || 0).toLocaleString("en-IN")}<span className="text-xs text-purple-300 font-normal">/month</span>
                </div>
                <p className="text-xs text-purple-200/80 mt-1">
                  Status: <span className="font-bold text-emerald-400">{hospital.subscription_status || "ACTIVE"}</span> • Payment: <span className="font-bold">{hospital.payment_status || "PAID"}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: FEATURE ENTITLEMENTS MATRIX ── */}
        {activeTab === "FEATURES" && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Per-Facility Feature Entitlements</h2>
                <p className="text-xs text-slate-500">
                  Backend-enforced module access switches for {hospital.name}. Toggling modifies live hospital operations.
                </p>
              </div>
              <span className="text-xs text-purple-700 font-bold px-3 py-1 bg-purple-50 rounded-xl border border-purple-200">
                {features.filter((f) => f.is_enabled).length} of {features.length} Enabled
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {features.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-slate-400 text-xs">
                  No feature entitlements configured for this facility.
                </div>
              ) : (
                features.map((feat) => (
                  <div
                    key={feat.feature_key}
                    className={`p-4 rounded-2xl border transition flex items-center justify-between gap-3 ${
                      feat.is_enabled
                        ? "bg-white border-slate-200/90 shadow-xs"
                        : "bg-slate-50 border-slate-200/50 opacity-60"
                    }`}
                  >
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">{feat.feature_name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[9px] font-mono uppercase font-bold">
                          {feat.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        key: {feat.feature_key}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleFeature(feat)}
                      disabled={updatingFeature === feat.feature_key}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        feat.is_enabled ? "bg-purple-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          feat.is_enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: BILLING & INVOICES ── */}
        {activeTab === "BILLING" && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">SaaS License Invoices &amp; Payments</h2>
                <p className="text-xs text-slate-500">18% GST B2B SaaS collection logs for {hospital.name}</p>
              </div>
              <Link
                href="/super-admin/payments"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Record Payment
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Subtotal</th>
                    <th className="py-3 px-4">GST (18%)</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4">Transaction Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No SaaS invoices on record for this hospital.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-bold font-mono text-slate-900">{inv.invoice_number}</td>
                        <td className="py-3 px-4">₹{inv.subtotal.toLocaleString("en-IN")}</td>
                        <td className="py-3 px-4 text-slate-500">₹{inv.gst_amount.toLocaleString("en-IN")}</td>
                        <td className="py-3 px-4 font-black text-slate-900">₹{inv.total_amount.toLocaleString("en-IN")}</td>
                        <td className="py-3 px-4 text-slate-600">{new Date(inv.due_date).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.payment_status === "PAID" ? "bg-emerald-100 text-emerald-800" :
                            inv.payment_status === "OVERDUE" ? "bg-rose-100 text-rose-800" :
                            "bg-amber-100 text-amber-800"
                          }`}>
                            {inv.payment_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500">{inv.transaction_ref || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: AUDIT TRAIL ── */}
        {activeTab === "AUDIT" && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1">Platform Administrative Audit Log</h2>
            <p className="text-xs text-slate-500 mb-4">Tamper-evident logs of all status changes, feature toggles, and payment records.</p>

            <div className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <p className="py-8 text-center text-slate-400 text-xs">No audit logs recorded for this facility.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="py-3.5 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{log.action}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                          by {log.admin_username}
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs mt-0.5">{log.reason || "Administrative update"}</p>
                      {log.ticket_ref && (
                        <p className="text-[10px] font-mono text-purple-600 mt-0.5">Ticket Ref: {log.ticket_ref}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
