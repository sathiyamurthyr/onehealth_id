"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Building2, Hospital, Users, CreditCard, Receipt, ArrowLeft,
  RefreshCw, CheckCircle2, AlertTriangle, Phone, Mail, MapPin,
  Calendar, ExternalLink, ShieldCheck, HeartPulse
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { api, PlatformClient } from "@/lib/api";

export default function SuperAdminClientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const clientId = resolvedParams.id;

  const [client, setClient] = useState<PlatformClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.superAdmin.getClientDetails(clientId);
      setClient(data);
    } catch (err: any) {
      setError(err.message || "Failed to load client details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  const formatINR = (amt?: number) => {
    if (!amt) return "₹0";
    return "₹" + amt.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };

  if (loading) {
    return (
      <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
        <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
          <span>Loading client network profile...</span>
        </div>
      </WorkspaceLayout>
    );
  }

  if (error || !client) {
    return (
      <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-rose-800 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
          <h2 className="text-base font-bold">Client Not Found</h2>
          <p className="text-xs text-rose-600 mt-1">{error || "Could not load client details."}</p>
          <Link href="/super-admin/clients" className="mt-4 inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold">
            Back to Clients
          </Link>
        </div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/super-admin/clients"
            className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Clients List
          </Link>
          <button
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* ── Client Hero Card ── */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 lg:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center font-black text-lg shrink-0">
                {client.code.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl lg:text-2xl font-black text-slate-900">{client.name}</h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    client.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}>
                    {client.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Code: <span className="font-mono font-bold text-slate-700">{client.code}</span> • Type: <strong>{client.client_type.replace(/_/g, " ")}</strong> • Account Mgr: {client.account_manager}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-purple-50/70 border border-purple-200/80 p-4 rounded-2xl">
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider block">Monthly MRR</span>
                <span className="text-xl font-black text-purple-950">{formatINR(client.total_mrr)}</span>
              </div>
              <div className="border-l border-purple-200 pl-4">
                <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider block">Total Billed</span>
                <span className="text-xl font-black text-purple-950">{formatINR(client.total_revenue_paid)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Linked Hospitals ── */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Associated Hospital Facilities &amp; Branches</h2>
              <p className="text-xs text-slate-500">Facilities operating under {client.name}</p>
            </div>
            <Link
              href="/super-admin/hospitals"
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              + Onboard Facility
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {client.hospitals?.map((h) => (
              <div key={h.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-purple-300 transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 text-xs truncate">{h.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    h.lifecycle_status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}>
                    {h.lifecycle_status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {h.city}, {h.state} • {h.doctor_count} Doctors • Plan: <strong>{h.plan_tier || "PRO"}</strong>
                </p>
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">{h.code}</span>
                  <Link href={`/super-admin/hospitals/${h.id}`} className="text-xs font-bold text-purple-600 hover:underline">
                    View 360° →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Key Contacts & Contracts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-3">Stakeholder Contacts</h2>
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Primary Executive</span>
                  <span className="font-semibold text-slate-800">{client.primary_contact_name || "N/A"}</span>
                </div>
                <span className="font-mono text-slate-600 text-[11px]">{client.primary_contact_email}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Technical &amp; IT Lead</span>
                  <span className="font-semibold text-slate-800">{client.technical_contact_email || "N/A"}</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Billing &amp; Treasury</span>
                  <span className="font-semibold text-slate-800">{client.billing_contact_email || "N/A"}</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Compliance &amp; Legal</span>
                  <span className="font-semibold text-slate-800">{client.compliance_contact_email || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-3">Open Support Tickets</h2>
            {(!client.support_tickets || client.support_tickets.length === 0) ? (
              <p className="text-xs text-slate-400 py-8 text-center">No active support tickets for this client.</p>
            ) : (
              <div className="space-y-2">
                {client.support_tickets.map((t) => (
                  <div key={t.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{t.subject}</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">{t.ticket_number} • {t.category}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold">
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
