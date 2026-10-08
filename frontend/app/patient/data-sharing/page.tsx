"use client";

import React, { useState, useEffect } from "react";
import {
  Share2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Building2,
  Calendar,
  Lock,
  Plus,
  RefreshCw,
  Ban,
  Check,
  X,
  FileText,
  Activity,
  ChevronRight,
  Filter
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { phase4Api } from "@/lib/api/phase4";
import { ConsentArtifact } from "@/lib/types";

export default function PatientDataSharingPage() {
  const [loading, setLoading] = useState(true);
  const [consents, setConsents] = useState<ConsentArtifact[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showShareModal, setShowShareModal] = useState(false);

  // New Share Form
  const [targetProvider, setTargetProvider] = useState("Apollo Multispeciality Hospital");
  const [purpose, setPurpose] = useState("TREATMENT");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "OPConsultation",
    "Prescription",
    "DiagnosticReport",
  ]);
  const [expiryDays, setExpiryDays] = useState(30);

  const loadConsents = async () => {
    setLoading(true);
    try {
      const data = await phase4Api.getPatientConsents();
      setConsents(data);
    } catch (err) {
      console.error("Failed to load consents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConsents();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await phase4Api.approveConsent(id);
      await loadConsents();
    } catch (e: any) {
      alert(e.message || "Failed to approve consent request.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (id: string) => {
    setActionLoading(id);
    try {
      await phase4Api.denyConsent(id);
      await loadConsents();
    } catch (e: any) {
      alert(e.message || "Failed to deny consent request.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke data sharing? The provider will immediately lose access.")) return;
    setActionLoading(id);
    try {
      await phase4Api.revokeConsent(id);
      await loadConsents();
    } catch (e: any) {
      alert(e.message || "Failed to revoke consent.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategories.length === 0) {
      alert("Please select at least one clinical record category to share.");
      return;
    }
    setActionLoading("create");
    try {
      await phase4Api.requestConsent({
        patient_id: "usr-patient-101",
        requester_name: targetProvider,
        requester_type: "HOSPITAL",
        purpose_of_use: purpose,
        data_categories: selectedCategories,
        expiry_days: expiryDays,
      });
      setShowShareModal(false);
      await loadConsents();
    } catch (e: any) {
      alert(e.message || "Failed to create share consent.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredConsents = consents.filter((c) => {
    if (filterStatus === "ALL") return true;
    return c.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "GRANTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Active Sharing
          </span>
        );
      case "REQUESTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> Authorization Pending
          </span>
        );
      case "REVOKED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Ban className="w-3.5 h-3.5" /> Access Revoked
          </span>
        );
      case "DENIED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-400 border border-slate-700">
            <XCircle className="w-3.5 h-3.5" /> Request Denied
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-400 border border-slate-700">
            <Clock className="w-3.5 h-3.5" /> Expired
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <WorkspaceLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/60 p-6 rounded-2xl border border-blue-500/20 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Patient Data Governance
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Lock className="w-3.5 h-3.5" />
                Zero-Trust Gating
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Data Sharing & Consent Artifacts
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              You maintain full sovereign control over your digital health records. Grant, limit, or revoke access permissions to participating healthcare providers anytime.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadConsents}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-2 shadow-lg shadow-blue-900/30"
            >
              <Share2 className="w-4 h-4" />
              Share My Health Record
            </button>
          </div>
        </div>

        {/* Filter Navigation */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "REQUESTED", "GRANTED", "REVOKED", "DENIED", "EXPIRED"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  filterStatus === status
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                    : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                {status === "ALL" ? "All Consent Artifacts" : status.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            Showing <strong className="text-white">{filteredConsents.length}</strong> record sharing permissions
          </span>
        </div>

        {/* Consents List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-3" />
            <p>Loading consent registry...</p>
          </div>
        ) : filteredConsents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
            <ShieldCheck className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No Consent Artifacts Found</h3>
            <p className="text-xs text-slate-500 mt-1">No active, pending, or revoked data sharing permissions match your filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConsents.map((consent) => (
              <div
                key={consent.id}
                className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 transition-all shadow-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-white">{consent.requester_name}</h3>
                          {getStatusBadge(consent.status)}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Purpose: <strong className="text-slate-200">{consent.purpose_of_use}</strong> • Created: {new Date(consent.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Granular Categories Badges */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium mr-1">Shared Scope:</span>
                      {consent.data_categories.map((cat) => (
                        <span
                          key={cat}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800/90 text-slate-200 border border-slate-700"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 text-xs text-slate-400 flex items-center gap-4">
                      <span>Valid until: <strong className="text-slate-200">{new Date(consent.expiry_at).toLocaleDateString()}</strong></span>
                      {consent.digital_signature_hash && (
                        <span className="font-mono text-[11px] text-emerald-400/90 truncate max-w-xs">
                          Sig: {consent.digital_signature_hash.substring(0, 16)}...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    {consent.status === "REQUESTED" && (
                      <>
                        <button
                          onClick={() => handleApprove(consent.id)}
                          disabled={actionLoading === consent.id}
                          className="px-4 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1.5 shadow-md shadow-emerald-900/20"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve Access
                        </button>
                        <button
                          onClick={() => handleDeny(consent.id)}
                          disabled={actionLoading === consent.id}
                          className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700 flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" /> Deny
                        </button>
                      </>
                    )}

                    {consent.status === "GRANTED" && (
                      <button
                        onClick={() => handleRevoke(consent.id)}
                        disabled={actionLoading === consent.id}
                        className="px-4 py-2 rounded-xl text-xs font-medium bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-all flex items-center gap-1.5"
                      >
                        <Ban className="w-3.5 h-3.5" /> Revoke Access Immediately
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Share Record Modal */}
        {showShareModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">Share Health Record</h3>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateShare} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Recipient Provider / Hospital</label>
                  <input
                    type="text"
                    required
                    value={targetProvider}
                    onChange={(e) => setTargetProvider(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Apollo Multispeciality Hospital"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Purpose of Data Sharing</label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="TREATMENT">TREATMENT — Clinical Consultation & Care</option>
                    <option value="REFERRAL">REFERRAL — Specialist Referral Evaluation</option>
                    <option value="SECOND_OPINION">SECOND_OPINION — Diagnostic Verification</option>
                    <option value="FOLLOW_UP">FOLLOW_UP — Routine Review</option>
                    <option value="PATIENT_REQUEST">PATIENT_REQUEST — Personal Record Sharing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Clinical Categories to Share</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {[
                      { key: "OPConsultation", label: "Consultation Notes" },
                      { key: "Prescription", label: "Prescriptions & Meds" },
                      { key: "DiagnosticReport", label: "Laboratory & Imaging" },
                      { key: "DischargeSummary", label: "Hospital Discharges" },
                    ].map((item) => {
                      const isChecked = selectedCategories.includes(item.key);
                      return (
                        <button
                          type="button"
                          key={item.key}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedCategories(selectedCategories.filter((k) => k !== item.key));
                            } else {
                              setSelectedCategories([...selectedCategories, item.key]);
                            }
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-medium text-left border transition-all ${
                            isChecked
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                              : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="rounded border-slate-700 text-blue-500 pointer-events-none"
                            />
                            <span>{item.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Access Duration (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(parseInt(e.target.value) || 30)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Access automatically revokes after this period.</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === "create"}
                    className="px-5 py-2.5 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-900/30"
                  >
                    {actionLoading === "create" ? "Authorizing..." : "Grant Consent"}
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
