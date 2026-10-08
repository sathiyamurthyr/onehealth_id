"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2, Hospital, Users, PlusCircle, Search, Filter,
  CheckCircle2, XCircle, RefreshCw, Mail, Phone, ExternalLink,
  ChevronRight, X, Shield, Briefcase, Award
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { api, PlatformClient } from "@/lib/api";

export default function SuperAdminClientsPage() {
  const [clients, setClients] = useState<PlatformClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [clientType, setClientType] = useState("HOSPITAL_GROUP");
  const [primaryName, setPrimaryName] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [techEmail, setTechEmail] = useState("");
  const [billEmail, setBillEmail] = useState("");
  const [compEmail, setCompEmail] = useState("");
  const [accountMgr, setAccountMgr] = useState("Sathus Key Accounts");

  const loadClients = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.superAdmin.listClients();
      setClients(data);
    } catch (err: any) {
      setError(err.message || "Failed to load clients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = clients.filter((c) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.primary_contact_name && c.primary_contact_name.toLowerCase().includes(search.toLowerCase())) ||
    (c.account_manager && c.account_manager.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await api.superAdmin.createClient({
        name: name.trim(),
        code: code.trim() || undefined,
        client_type: clientType,
        primary_contact_name: primaryName.trim() || undefined,
        primary_contact_email: primaryEmail.trim() || undefined,
        primary_contact_phone: primaryPhone.trim() || undefined,
        technical_contact_email: techEmail.trim() || undefined,
        billing_contact_email: billEmail.trim() || undefined,
        compliance_contact_email: compEmail.trim() || undefined,
        account_manager: accountMgr.trim() || undefined,
      });

      setSuccessMsg(`Client '${res.name}' created successfully!`);
      setShowCreateModal(false);
      setName("");
      setCode("");
      loadClients();
    } catch (err: any) {
      alert(err.message || "Failed to create client organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatINR = (amt?: number) => {
    if (!amt) return "₹0";
    return "₹" + amt.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl lg:text-2xl font-black text-slate-900">Client Organizations &amp; Groups</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                {clients.length} Clients
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Multi-facility hospital networks, diagnostic chains, corporate health providers, and government health missions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadClients}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Add Client Group
            </button>
          </div>
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

        {/* Search Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search clients by organization name, code, contact or account manager..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
            />
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:border-purple-300 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold text-sm">
                    {client.code.slice(0, 2)}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    client.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}>
                    {client.status}
                  </span>
                </div>

                <Link href={`/super-admin/clients/${client.id}`} className="block font-black text-slate-900 text-base hover:text-purple-600 transition">
                  {client.name}
                </Link>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                  {client.code} • {client.client_type.replace(/_/g, " ")}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Hospitals &amp; Branches:</span>
                    <span className="font-bold text-slate-900">{client.hospital_count} ({client.active_hospital_count} Active)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Monthly Subscription MRR:</span>
                    <span className="font-black text-purple-700">{formatINR(client.total_mrr)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Total Billed Revenue:</span>
                    <span className="font-bold text-slate-900">{formatINR(client.total_revenue_paid)}</span>
                  </div>
                  {client.outstanding_amount > 0 && (
                    <div className="flex items-center justify-between text-rose-600 font-semibold text-[11px]">
                      <span>Outstanding Overdue:</span>
                      <span>{formatINR(client.outstanding_amount)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                  <p className="truncate"><strong>Primary:</strong> {client.primary_contact_name || "N/A"}</p>
                  <p className="truncate font-mono text-[10px]"><strong>Email:</strong> {client.primary_contact_email || "N/A"}</p>
                  <p className="truncate"><strong>Account Mgr:</strong> {client.account_manager}</p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/super-admin/hospitals?client_id=${client.id}`}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  View Hospitals ({client.hospital_count}) <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href={`/super-admin/clients/${client.id}`}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Client 360°
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* ── Create Client Modal ── */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Add Client Organization</h3>
                    <p className="text-xs text-slate-500">Register new hospital network or clinic group</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateClient} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Organization / Group Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SRM Healthcare Trust"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Client Code</label>
                    <input
                      type="text"
                      placeholder="e.g. SRM-GRP"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Customer Type</label>
                    <select
                      value={clientType}
                      onChange={(e) => setClientType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    >
                      <option value="HOSPITAL_GROUP">Hospital Group</option>
                      <option value="CLINIC_CHAIN">Clinic Chain</option>
                      <option value="DIAGNOSTIC_NETWORK">Diagnostic Network</option>
                      <option value="GOVT_HEALTH">Government Health Mission</option>
                      <option value="CORPORATE">Corporate Healthcare</option>
                    </select>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Stakeholder Contacts</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Primary Contact Person</label>
                      <input
                        type="text"
                        placeholder="Dr. Rajesh"
                        value={primaryName}
                        onChange={(e) => setPrimaryName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Primary Email</label>
                      <input
                        type="email"
                        placeholder="contact@srmhealth.in"
                        value={primaryEmail}
                        onChange={(e) => setPrimaryEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Technical Contact Email</label>
                      <input
                        type="email"
                        placeholder="it@srmhealth.in"
                        value={techEmail}
                        onChange={(e) => setTechEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Billing Contact Email</label>
                      <input
                        type="email"
                        placeholder="accounts@srmhealth.in"
                        value={billEmail}
                        onChange={(e) => setBillEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sathus Account Manager</label>
                  <input
                    type="text"
                    value={accountMgr}
                    onChange={(e) => setAccountMgr(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    {isSubmitting ? "Creating..." : "Create Client Organization"}
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
