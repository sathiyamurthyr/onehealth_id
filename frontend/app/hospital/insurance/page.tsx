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
  const activeHospitalId = workspace?.hospital_ref_id || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("oh_workspace") || "{}").hospital_ref_id : "") || "";

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
    payer_type: "INSURANCE",
    contact_person: "",
    contact_phone: "",
    contact_email: "",
    is_active: true
  });

  const [preauthForm, setPreauthForm] = useState<Partial<Preauthorization>>({
    hospital_id: activeHospitalId,
    patient_id: "",
    payer_id: "",
    procedure_code: "PROC-CARDIO-01",
    procedure_name: "Coronary Angioplasty (PTCA)",
    requested_amount: 150000,
    submission_notes: "Elective PTCA with drug-eluting stent"
  });

  const [claimForm, setClaimForm] = useState<{
    hospital_id: string;
    patient_id: string;
    payer_id: string;
    claim_amount: number;
  }>({
    hospital_id: activeHospitalId,
    patient_id: "",
    payer_id: "",
    claim_amount: 85000
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
      if (pyrRes && pyrRes.length > 0) {
        if (!preauthForm.payer_id) setPreauthForm((prev) => ({ ...prev, payer_id: pyrRes[0].id }));
        if (!claimForm.payer_id) setClaimForm((prev) => ({ ...prev, payer_id: pyrRes[0].id }));
      }
    } catch (err: any) {
      console.error("Failed to load insurance data:", err);
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
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "PARTIALLY_APPROVED":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "REJECTED":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Phase 5 Insurance & Payer Framework
              </span>
              <span className="text-xs text-zinc-500">ABHA / PMJAY / TPA Claims Adjudication</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 text-blue-400" />
              Insurance, Preauthorizations & Claims
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Manage third-party payers, patient policy linkages, treatment preauthorizations, and claims adjudication.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/hospital/billing"
              className="px-4 py-2 bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700/60 rounded-xl text-xs font-semibold text-zinc-200 transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-zinc-400" />
              Hospital Invoices
            </Link>
            <button
              onClick={loadAll}
              className="p-2 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 rounded-xl text-zinc-300 transition-all"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Action Message */}
        {actionMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              actionMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/20 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {actionMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {actionMessage.text}
            </div>
            <button onClick={() => setActionMessage(null)} className="text-xs hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2">
          <button
            onClick={() => setActiveTab("claims")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "claims"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Insurance Claims ({claims.length})
          </button>
          <button
            onClick={() => setActiveTab("preauths")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "preauths"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Preauthorizations ({preauths.length})
          </button>
          <button
            onClick={() => setActiveTab("policies")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "policies"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Patient Policies ({policies.length})
          </button>
          <button
            onClick={() => setActiveTab("payers")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "payers"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
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
              <p className="text-xs text-zinc-400">
                Institutional insurance claims filed with TPAs and healthcare insurance providers.
              </p>
              <button
                onClick={() => setShowClaimModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Submit New Claim
              </button>
            </div>

            <div className="border border-zinc-800/80 rounded-2xl overflow-hidden bg-zinc-900/40">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900/90 text-zinc-400 font-semibold border-b border-zinc-800">
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
                <tbody className="divide-y divide-zinc-800/60">
                  {claims.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-zinc-500">
                        No claims registered. Click "Submit New Claim" to initiate a payer claim.
                      </td>
                    </tr>
                  ) : (
                    claims.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-3.5 font-mono text-blue-400 font-medium">{c.claim_number}</td>
                        <td className="p-3.5">
                          <div className="font-semibold text-white">{c.patient_name || "Patient"}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{c.onehealth_id || c.patient_id}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-zinc-200">{c.payer_name || c.payer_id}</div>
                          <div className="text-[10px] text-zinc-500">Policy: {c.policy_number || "Direct"}</div>
                        </td>
                        <td className="p-3.5 text-right font-medium text-white">
                          ₹{Number(c.claim_amount).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-semibold text-emerald-400">
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
                                className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-semibold hover:bg-emerald-500/30"
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
                                className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-semibold hover:bg-amber-500/30"
                              >
                                80% Copay
                              </button>
                            </div>
                          )}
                          {c.status === "APPROVED" && (
                            <button
                              onClick={() => handleAdjudicateClaim(c.id, "SETTLED", Number(c.approved_amount || c.claim_amount), 0)}
                              className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-[10px] font-semibold hover:bg-blue-500/30"
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
              <p className="text-xs text-zinc-400">
                Prior treatment approvals requested before elective procedures, surgeries, and specialized diagnostics.
              </p>
              <button
                onClick={() => setShowPreauthModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Request Preauthorization
              </button>
            </div>

            <div className="border border-zinc-800/80 rounded-2xl overflow-hidden bg-zinc-900/40">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900/90 text-zinc-400 font-semibold border-b border-zinc-800">
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
                <tbody className="divide-y divide-zinc-800/60">
                  {preauths.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-zinc-500">
                        No preauthorizations submitted yet.
                      </td>
                    </tr>
                  ) : (
                    preauths.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-3.5">
                          <div className="font-semibold text-white">{p.procedure_name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{p.procedure_code}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-zinc-200 font-medium">{p.patient_name || p.patient_id}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{p.onehealth_id || ""}</div>
                        </td>
                        <td className="p-3.5 text-zinc-300">{p.payer_name || p.payer_id}</td>
                        <td className="p-3.5 text-right font-medium text-white">
                          ₹{Number(p.requested_amount).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-semibold text-emerald-400">
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
                                className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-semibold hover:bg-emerald-500/30"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAdjudicatePreauth(p.id, "REJECTED", 0)}
                                className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded text-[10px] font-semibold hover:bg-rose-500/30"
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
                  className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {pol.relationship}
                      </span>
                      <h3 className="text-base font-bold text-white mt-2">{pol.patient_name || "Patient Policy"}</h3>
                      <div className="text-xs font-mono text-zinc-500">Member: {pol.member_id}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {pol.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Payer:</span>
                      <span className="text-white font-medium">{pol.payer_name || "Insurance Corp"}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Policy Number:</span>
                      <span className="font-mono text-blue-400">{pol.policy_number}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Coverage Sum:</span>
                      <span className="text-emerald-400 font-bold">₹{Number(pol.coverage_amount).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Copay:</span>
                      <span className="text-amber-400">{pol.copay_percentage}%</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-500 flex justify-between">
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
              <p className="text-xs text-zinc-400">
                Authorized insurance companies, TPAs, and corporate panel agreements.
              </p>
              <button
                onClick={() => setShowPayerModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Register Payer / TPA
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {payers.map((pyr) => (
                <div
                  key={pyr.id}
                  className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-3 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {pyr.payer_type}
                      </span>
                      <h3 className="text-base font-bold text-white mt-2">{pyr.name}</h3>
                      <div className="text-xs font-mono text-zinc-500">{pyr.code}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ACTIVE
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-zinc-400">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Request Treatment Preauthorization
                </h3>
                <button onClick={() => setShowPreauthModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePreauth} className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1">Target Payer</label>
                  <select
                    value={preauthForm.payer_id}
                    onChange={(e) => setPreauthForm({ ...preauthForm, payer_id: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                  >
                    {payers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.payer_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Procedure Name</label>
                  <input
                    type="text"
                    required
                    value={preauthForm.procedure_name}
                    onChange={(e) => setPreauthForm({ ...preauthForm, procedure_name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Procedure Code</label>
                    <input
                      type="text"
                      value={preauthForm.procedure_code}
                      onChange={(e) => setPreauthForm({ ...preauthForm, procedure_code: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Requested Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={preauthForm.requested_amount}
                      onChange={(e) => setPreauthForm({ ...preauthForm, requested_amount: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Clinical Notes</label>
                  <textarea
                    rows={2}
                    value={preauthForm.submission_notes}
                    onChange={(e) => setPreauthForm({ ...preauthForm, submission_notes: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowPreauthModal(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
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
