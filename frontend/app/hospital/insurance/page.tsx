"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Building,
  FileCheck,
  FileText,
  Clock,
  Check,
  Ban,
  TrendingUp,
  User,
  CreditCard,
  Eye,
  Sliders,
  Sparkles
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { phase5Api } from "@/lib/api/phase5";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import {
  Payer,
  InsurancePolicy,
  Preauthorization,
  InsuranceClaim
} from "@/lib/types";

export default function HospitalInsuranceAndClaimsPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || "";

  const [activeTab, setActiveTab] = useState<"claims" | "preauths" | "policies" | "payers">("claims");
  const [loading, setLoading] = useState(true);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [preauths, setPreauths] = useState<Preauthorization[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);
  const [showPreauthModal, setShowPreauthModal] = useState(false);
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Forms
  const [payerForm, setPayerForm] = useState<Partial<Payer>>({
    hospital_id: activeHospitalId,
    code: "PAYER-",
    name: "",
    payer_type: "TPA",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    is_active: true
  });

  const [preauthForm, setPreauthForm] = useState({
    hospital_id: activeHospitalId,
    patient_id: "",
    payer_id: "",
    policy_number: "",
    procedure_name: "",
    procedure_code: "PROC-",
    requested_amount: 25000,
    submission_notes: ""
  });

  const [claimForm, setClaimForm] = useState({
    hospital_id: activeHospitalId,
    patient_id: "",
    payer_id: "",
    policy_number: "",
    claim_amount: 45000,
    treatment_summary: ""
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pyrRes, polRes, preRes, clmRes] = await Promise.all([
        phase5Api.listPayers(activeHospitalId).catch(() => []),
        phase5Api.listPolicies({ hospital_id: activeHospitalId }).catch(() => []),
        phase5Api.listPreauthorizations({ hospital_id: activeHospitalId }).catch(() => []),
        phase5Api.listClaims({ hospital_id: activeHospitalId }).catch(() => [])
      ]);
      setPayers(pyrRes || []);
      setPolicies(polRes || []);
      setPreauths(preRes || []);
      setClaims(clmRes || []);
    } catch (err: any) {
      console.error("Failed to load insurance datasets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [activeHospitalId]);

  const handleCreatePayer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await phase5Api.createPayer(payerForm);
      setActionMessage({ type: "success", text: `Payer '${payerForm.name}' registered!` });
      setShowPayerModal(false);
      await loadAll();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to create payer." });
    }
  };

  const handleCreatePreauth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await phase5Api.createPreauthorization(preauthForm);
      setActionMessage({ type: "success", text: "Preauthorization request submitted to payer!" });
      setShowPreauthModal(false);
      await loadAll();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to create preauth." });
    }
  };

  const handleAdjudicatePreauth = async (preauthId: string, status: string, amount: number) => {
    try {
      await phase5Api.adjudicatePreauthorization(preauthId, {
        status,
        approved_amount: amount,
        notes: `Adjudication decision: ${status}`
      });
      setActionMessage({ type: "success", text: `Preauthorization marked as ${status}.` });
      await loadAll();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to adjudicate preauth." });
    }
  };

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await phase5Api.createClaim(claimForm);
      setActionMessage({ type: "success", text: "Insurance claim generated and submitted!" });
      setShowClaimModal(false);
      await loadAll();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to create claim." });
    }
  };

  const handleAdjudicateClaim = async (claimId: string, status: string, approved: number, rejected: number) => {
    try {
      await phase5Api.adjudicateClaim(claimId, {
        status,
        approved_amount: approved,
        rejected_amount: rejected,
        rejection_reason: rejected > 0 ? "Non-covered consumable policy cap" : undefined
      });
      setActionMessage({ type: "success", text: `Claim adjudication updated to ${status}.` });
      await loadAll();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to adjudicate claim." });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
      case "SETTLED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "PARTIALLY_APPROVED":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Phase 5 Insurance & Payer Framework
              </span>
              <span className="text-xs text-slate-500 font-medium">ABHA / PMJAY / TPA Claims Adjudication</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 text-blue-600" />
              Insurance, Preauthorizations & Claims
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage third-party payers, patient policy linkages, treatment preauthorizations, and claims adjudication.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/hospital/billing"
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all flex items-center gap-2 shadow-xs"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              Hospital Invoices
            </Link>
            <button
              onClick={loadAll}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-all shadow-xs cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Action Message */}
        {actionMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              actionMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {actionMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              {actionMessage.text}
            </div>
            <button onClick={() => setActionMessage(null)} className="text-xs font-semibold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("claims")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "claims"
                ? "bg-blue-50 text-blue-700 border border-blue-300 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Insurance Claims ({claims.length})
          </button>
          <button
            onClick={() => setActiveTab("preauths")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "preauths"
                ? "bg-blue-50 text-blue-700 border border-blue-300 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Preauthorizations ({preauths.length})
          </button>
          <button
            onClick={() => setActiveTab("policies")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "policies"
                ? "bg-blue-50 text-blue-700 border border-blue-300 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Patient Policies ({policies.length})
          </button>
          <button
            onClick={() => setActiveTab("payers")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "payers"
                ? "bg-blue-50 text-blue-700 border border-blue-300 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            Payers & TPAs ({payers.length})
          </button>
        </div>

        {/* TAB 1: CLAIMS */}
        {activeTab === "claims" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Institutional insurance claims filed with TPAs and healthcare insurance providers.
              </p>
              <button
                onClick={() => setShowClaimModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Submit New Claim
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Claim #</th>
                    <th className="p-3.5">Patient / OH-ID</th>
                    <th className="p-3.5">Payer</th>
                    <th className="p-3.5 text-right">Claim Amount</th>
                    <th className="p-3.5 text-right">Approved</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {claims.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No claims registered. Click "Submit New Claim" to initiate a payer claim.
                      </td>
                    </tr>
                  ) : (
                    claims.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-mono text-blue-700 font-semibold">{c.claim_number}</td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">{c.patient_name || "Patient"}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{c.onehealth_id || c.patient_id}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-800 font-medium">{c.payer_name || c.payer_id}</div>
                          <div className="text-[10px] text-slate-500">Policy: {c.policy_number || "Direct"}</div>
                        </td>
                        <td className="p-3.5 text-right font-medium text-slate-900">
                          ₹{Number(c.claim_amount).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-semibold text-emerald-700">
                          ₹{Number(c.approved_amount || 0).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                              c.status
                            )}`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {c.status === "SUBMITTED" && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleAdjudicateClaim(c.id, "APPROVED", Number(c.claim_amount), 0)}
                                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold hover:bg-emerald-100 cursor-pointer"
                              >
                                Approve Full
                              </button>
                              <button
                                onClick={() =>
                                  handleAdjudicateClaim(
                                    c.id,
                                    "PARTIALLY_APPROVED",
                                    Number(c.claim_amount) * 0.8,
                                    Number(c.claim_amount) * 0.2
                                  )
                                }
                                className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-semibold hover:bg-amber-100 cursor-pointer"
                              >
                                80% Copay
                              </button>
                            </div>
                          )}
                          {c.status === "APPROVED" && (
                            <button
                              onClick={() => handleAdjudicateClaim(c.id, "SETTLED", Number(c.approved_amount || c.claim_amount), 0)}
                              className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-semibold hover:bg-blue-100 cursor-pointer"
                            >
                              Settle EFT
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PREAUTHORIZATIONS */}
        {activeTab === "preauths" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Prior treatment approvals requested before elective procedures, surgeries, and specialized diagnostics.
              </p>
              <button
                onClick={() => setShowPreauthModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Request Preauthorization
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Procedure / Treatment</th>
                    <th className="p-3.5">Patient</th>
                    <th className="p-3.5">Payer</th>
                    <th className="p-3.5 text-right">Requested</th>
                    <th className="p-3.5 text-right">Approved</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {preauths.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No preauthorizations submitted yet.
                      </td>
                    </tr>
                  ) : (
                    preauths.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">{p.procedure_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{p.procedure_code}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-800 font-medium">{p.patient_name || p.patient_id}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{p.onehealth_id || ""}</div>
                        </td>
                        <td className="p-3.5 text-slate-700">{p.payer_name || p.payer_id}</td>
                        <td className="p-3.5 text-right font-medium text-slate-900">
                          ₹{Number(p.requested_amount).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-semibold text-emerald-700">
                          ₹{Number(p.approved_amount || 0).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                              p.status
                            )}`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {p.status === "SUBMITTED" && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleAdjudicatePreauth(p.id, "APPROVED", Number(p.requested_amount))}
                                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold hover:bg-emerald-100 cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAdjudicatePreauth(p.id, "REJECTED", 0)}
                                className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold hover:bg-rose-100 cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PATIENT POLICIES */}
        {activeTab === "policies" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {policies.map((pol) => (
                <div
                  key={pol.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-slate-300 hover:shadow-md transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {pol.relationship}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-2">{pol.patient_name || "Patient Policy"}</h3>
                      <div className="text-xs font-mono text-slate-500">Member: {pol.member_id}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {pol.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Payer:</span>
                      <span className="text-slate-900 font-medium">{pol.payer_name || "Insurance Corp"}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Policy Number:</span>
                      <span className="font-mono text-blue-700 font-semibold">{pol.policy_number}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Coverage Sum:</span>
                      <span className="text-emerald-700 font-bold">₹{Number(pol.coverage_amount).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Copay:</span>
                      <span className="text-amber-700 font-semibold">{pol.copay_percentage}%</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                    <span>Valid until: {new Date(pol.expiry_date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PAYERS */}
        {activeTab === "payers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Authorized insurance companies, TPAs, and corporate panel agreements.
              </p>
              <button
                onClick={() => setShowPayerModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Register Payer / TPA
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {payers.map((pyr) => (
                <div
                  key={pyr.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 hover:border-slate-300 hover:shadow-md transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {pyr.payer_type}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-2">{pyr.name}</h3>
                      <div className="text-xs font-mono text-slate-500">{pyr.code}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ACTIVE
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-slate-500">
                    <div>Contact: {pyr.contact_person || "Institutional Desk"}</div>
                    <div>Email: {pyr.contact_email || "claims@payer.com"}</div>
                    <div>Phone: {pyr.contact_phone || "+91 1800-200-4000"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL: SUBMIT PREAUTH */}
        {showPreauthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Request Treatment Preauthorization
                </h3>
                <button onClick={() => setShowPreauthModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePreauth} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Target Payer</label>
                  <select
                    value={preauthForm.payer_id}
                    onChange={(e) => setPreauthForm({ ...preauthForm, payer_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    {payers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.payer_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Procedure Name</label>
                  <input
                    type="text"
                    required
                    value={preauthForm.procedure_name}
                    onChange={(e) => setPreauthForm({ ...preauthForm, procedure_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Procedure Code</label>
                    <input
                      type="text"
                      value={preauthForm.procedure_code}
                      onChange={(e) => setPreauthForm({ ...preauthForm, procedure_code: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Requested Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={preauthForm.requested_amount}
                      onChange={(e) => setPreauthForm({ ...preauthForm, requested_amount: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Clinical Notes</label>
                  <textarea
                    rows={2}
                    value={preauthForm.submission_notes}
                    onChange={(e) => setPreauthForm({ ...preauthForm, submission_notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPreauthModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer"
                  >
                    Submit Preauth
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
