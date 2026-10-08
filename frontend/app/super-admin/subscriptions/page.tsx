"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Receipt, CreditCard, Building2, CheckCircle2, RefreshCw,
  PlusCircle, ShieldCheck, ArrowUpRight, Zap, Award, Edit3, X, Check
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { api, SubscriptionPlan } from "@/lib/api";

export default function SuperAdminSubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Edit Subscription Modal
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [targetPlanId, setTargetPlanId] = useState("");
  const [targetBillingCycle, setTargetBillingCycle] = useState("MONTHLY");
  const [targetDiscount, setTargetDiscount] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.superAdmin.listSubscriptions();
      setPlans(data.plans || []);
      setSubscriptions(data.subscriptions || []);
    } catch (err: any) {
      setError(err.message || "Failed to load subscriptions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEdit = (sub: any) => {
    setSelectedSub(sub);
    setTargetPlanId(sub.plan_id);
    setTargetBillingCycle(sub.billing_cycle || "MONTHLY");
    setTargetDiscount(sub.discount_percent || 0);
  };

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    try {
      setIsUpdating(true);
      const res = await api.superAdmin.updateSubscription(selectedSub.hospital_id, {
        plan_id: targetPlanId,
        billing_cycle: targetBillingCycle,
        discount_percent: Number(targetDiscount),
      });
      setSuccessMsg(res.message || "Subscription updated successfully!");
      setSelectedSub(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update subscription.");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatINR = (amt?: number) => {
    if (!amt) return "₹0";
    return "₹" + amt.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl lg:text-2xl font-black text-slate-900">SaaS Subscription Plans &amp; Monetization</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                {subscriptions.length} Active Contracts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure SaaS tiers, recurring license fees, resource quotas, and manage active hospital contracts.
            </p>
          </div>

          <button
            onClick={loadData}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ── SaaS Tier Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isEnterprise = plan.tier === "ENTERPRISE";
            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-6 transition flex flex-col justify-between ${
                  isEnterprise
                    ? "bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 text-white border border-purple-700/60 shadow-xl"
                    : "bg-white border border-slate-200/80 shadow-xs hover:border-purple-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isEnterprise ? "bg-purple-500/30 text-purple-200 border border-purple-400/30" : "bg-purple-50 text-purple-700 border border-purple-200"
                    }`}>
                      {plan.tier}
                    </span>
                    {isEnterprise && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300">
                        <Zap className="w-3 h-3 text-amber-300" /> Popular
                      </span>
                    )}
                  </div>

                  <h3 className={`text-base font-black ${isEnterprise ? "text-white" : "text-slate-900"}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-xs mt-1 leading-relaxed ${isEnterprise ? "text-purple-200/80" : "text-slate-500"}`}>
                    {plan.description}
                  </p>

                  <div className="my-4 pt-3 border-t border-slate-200/20">
                    <div className="text-2xl font-black">
                      {formatINR(plan.monthly_price)}
                      <span className={`text-xs font-normal ${isEnterprise ? "text-purple-300" : "text-slate-400"}`}>
                        /month
                      </span>
                    </div>
                    <span className={`text-[10px] ${isEnterprise ? "text-purple-300" : "text-slate-500"}`}>
                      Annual: {formatINR(plan.annual_price)}/yr
                    </span>
                  </div>

                  <div className={`space-y-2 text-xs mb-4 ${isEnterprise ? "text-purple-100" : "text-slate-700"}`}>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Up to <strong>{plan.max_doctors}</strong> Doctor seats</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Up to <strong>{plan.max_staff}</strong> Staff logins</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span><strong>{plan.max_storage_gb} GB</strong> secure storage</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span><strong>{plan.monthly_patient_limit.toLocaleString()}</strong> monthly OPD patients</span>
                    </div>
                  </div>
                </div>

                <div className={`text-[10px] text-center py-1.5 rounded-xl font-bold ${
                  isEnterprise ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-700"
                }`}>
                  {plan.features_included?.length || 10} Feature Entitlements
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Active Hospital Contracts Table ── */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Active Hospital Subscription Contracts</h2>
              <p className="text-xs text-slate-500">Live contracts, billing cycles, renewals, and revenue tracking</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Hospital Facility</th>
                  <th className="py-3.5 px-4">Client Network</th>
                  <th className="py-3.5 px-4">Current Plan</th>
                  <th className="py-3.5 px-4">Billing Cycle</th>
                  <th className="py-3.5 px-4">MRR Amount</th>
                  <th className="py-3.5 px-4">Payment Status</th>
                  <th className="py-3.5 px-4">Next Renewal</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <Link href={`/super-admin/hospitals/${sub.hospital_id}`} className="font-bold text-slate-900 hover:text-purple-600 transition">
                        {sub.hospital_name}
                      </Link>
                      <span className="block text-[10px] font-mono text-slate-400">{sub.hospital_code}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{sub.client_name || "Independent"}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200 text-[10px]">
                        {sub.plan_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{sub.billing_cycle}</td>
                    <td className="py-3.5 px-4 font-black text-slate-900">{formatINR(sub.mrr_amount)}/mo</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sub.payment_status === "PAID" ? "bg-emerald-100 text-emerald-800" :
                        sub.payment_status === "OVERDUE" ? "bg-rose-100 text-rose-800" :
                        "bg-amber-100 text-amber-800"
                      }`}>
                        {sub.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      {sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString() : "Active"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(sub)}
                        className="px-3 py-1 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 rounded-lg text-xs font-semibold transition"
                      >
                        Modify Plan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Modify Plan Modal ── */}
        {selectedSub && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Modify Hospital Subscription</h3>
                    <p className="text-xs text-slate-500">{selectedSub.hospital_name}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedSub(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleUpdateSubscription} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Plan</label>
                  <select
                    value={targetPlanId}
                    onChange={(e) => setTargetPlanId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatINR(p.monthly_price)}/mo
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Billing Cycle</label>
                  <select
                    value={targetBillingCycle}
                    onChange={(e) => setTargetBillingCycle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
                  >
                    <option value="MONTHLY">Monthly Recurring</option>
                    <option value="ANNUAL">Annual Prepaid (Discounted)</option>
                    <option value="QUARTERLY">Quarterly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Special Discount (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={targetDiscount}
                    onChange={(e) => setTargetDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSub(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    {isUpdating ? "Updating..." : "Save Subscription"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
