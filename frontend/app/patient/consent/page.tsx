"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  RefreshCw,
  QrCode,
  ExternalLink,
  Ban,
  Check,
  X,
  FileText,
  Building,
  UserCheck,
  Scale,
  Send,
  HelpCircle,
  ChevronRight
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { api, AbhaProfile, ConsentArtifact, PrivacyGrievance } from "@/lib/api";

export default function PatientConsentPage() {
  const [loading, setLoading] = useState(true);
  const [abhaProfile, setAbhaProfile] = useState<AbhaProfile | null>(null);
  const [consents, setConsents] = useState<ConsentArtifact[]>([]);
  const [myGrievances, setMyGrievances] = useState<PrivacyGrievance[]>([]);

  // Modals & Forms
  const [showLinkAbhaModal, setShowLinkAbhaModal] = useState(false);
  const [showGrievanceModal, setShowGrievanceModal] = useState(false);
  const [newAbhaAddress, setNewAbhaAddress] = useState("sathiya.murthy@abdm");
  const [newAbhaNumber, setNewAbhaNumber] = useState("91-4421-9982-1044");
  const [grievanceType, setGrievanceType] = useState("DATA_CORRECTION");
  const [grievanceDescription, setGrievanceDescription] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadPatientData = async () => {
    setLoading(true);
    try {
      const [abha, conList, grvList] = await Promise.all([
        api.compliance.getPatientAbha("p-101").catch(() => null),
        api.compliance.listPatientConsents("ALL", "p-101").catch(() => []),
        api.compliance.listMyPrivacyGrievances("hosp-kedar", "p-101").catch(() => [])
      ]);
      setAbhaProfile(abha);
      setConsents(conList || []);
      setMyGrievances(grvList || []);
    } catch (err) {
      console.error("Failed to load patient consent data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, []);

  const handleLinkAbha = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.compliance.linkPatientAbha({
        abha_address: newAbhaAddress,
        abha_number: newAbhaNumber,
        auth_method: "AADHAAR_OTP"
      }, "p-101");
      setShowLinkAbhaModal(false);
      await loadPatientData();
    } catch (e) {
      alert("Failed to link ABHA ID.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlinkAbha = async () => {
    if (!confirm("Are you sure you want to unlink your ABHA ID? This will revoke automatic cross-hospital record sharing.")) return;
    setActionLoading(true);
    try {
      await api.compliance.unlinkPatientAbha("p-101");
      await loadPatientData();
    } catch (e) {
      alert("Failed to unlink ABHA ID.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGrantConsent = async (consentId: string) => {
    setActionLoading(true);
    try {
      await api.compliance.grantConsent(consentId, "ECDSA_P256_SHA256:USER_APPROVED_TOKEN", "p-101");
      await loadPatientData();
    } catch (e) {
      alert("Failed to grant consent.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDenyConsent = async (consentId: string) => {
    setActionLoading(true);
    try {
      await api.compliance.denyConsent(consentId, "p-101");
      await loadPatientData();
    } catch (e) {
      alert("Failed to reject consent request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeConsent = async (consentId: string) => {
    if (!confirm("Revoke this consent authorization immediately? The hospital will no longer be able to access your records.")) return;
    setActionLoading(true);
    try {
      await api.compliance.revokeConsent(consentId, "Patient requested immediate revocation", "p-101");
      await loadPatientData();
    } catch (e) {
      alert("Failed to revoke consent.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLodgeGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.compliance.lodgePatientGrievance({
        hospital_id: "hosp-kedar",
        grievance_type: grievanceType,
        description: grievanceDescription
      }, "p-101");
      setShowGrievanceModal(false);
      setGrievanceDescription("");
      await loadPatientData();
    } catch (e) {
      alert("Failed to lodge grievance.");
    } finally {
      setActionLoading(false);
    }
  };

  const pendingRequests = consents.filter((c) => c.consent_status === "REQUESTED");
  const activeConsents = consents.filter((c) => c.consent_status === "GRANTED");
  const historyConsents = consents.filter((c) => c.consent_status !== "REQUESTED" && c.consent_status !== "GRANTED");

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-6xl mx-auto space-y-6 pb-16">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-emerald-900/40">
          <div className="absolute -right-10 -top-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-emerald-400/20">
                <Shield className="w-3.5 h-3.5" /> ABDM & DPDP Health Privacy
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Privacy & Consent Center</h1>
              <p className="text-emerald-100/80 text-sm leading-relaxed">
                You have full control over your health records. Manage your linked <strong>Ayushman Bharat Health Account (ABHA)</strong>, approve doctor access requests, and revoke sharing permissions at any time.
              </p>
            </div>

            <button
              onClick={() => setShowGrievanceModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition border border-white/20 backdrop-blur-md shrink-0"
            >
              <Scale className="w-4 h-4 text-emerald-400" />
              Lodge Privacy Grievance
            </button>
          </div>
        </div>

        {/* ABHA Digital Health Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center font-bold shrink-0">
                <QrCode className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">ABHA Digital Health Account</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      abhaProfile?.link_status === "LINKED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {abhaProfile?.link_status === "LINKED" ? "LINKED & KYC VERIFIED" : "UNLINKED"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  National Digital Health Mission (ABDM) identification linked to OH-ID record: <strong>{abhaProfile?.oh_id || "OH-101-7890"}</strong>
                </p>

                {abhaProfile?.link_status === "LINKED" ? (
                  <div className="mt-3 flex flex-wrap gap-4 text-xs font-mono">
                    <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      <span className="text-slate-400 font-sans text-[10px] block">ABHA Address:</span>
                      <span className="font-bold text-sky-900">{abhaProfile.abha_address}</span>
                    </div>
                    <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      <span className="text-slate-400 font-sans text-[10px] block">ABHA Number:</span>
                      <span className="font-bold text-slate-800">{abhaProfile.abha_number || "91-4421-9982-1044"}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-2 italic">
                    Link your ABHA address to seamlessly discover and share health records across national hospitals.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {abhaProfile?.link_status === "LINKED" ? (
                <button
                  onClick={handleUnlinkAbha}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-bold transition"
                >
                  Unlink ABHA
                </button>
              ) : (
                <button
                  onClick={() => setShowLinkAbhaModal(true)}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Link My ABHA ID
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pending Consent Requests Banner */}
        {pendingRequests.length > 0 && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-amber-900">
              <Clock className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-base">Pending Health Record Access Requests ({pendingRequests.length})</h3>
            </div>

            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.consent_id} className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{req.requester_name}</span>
                      <span className="text-xs text-slate-500 font-medium">({req.requester_hospital_name})</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      <strong>Purpose:</strong> {req.purpose_text} &bull; <strong>Source:</strong> {req.provider_hospital_name}
                    </p>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1">
                      <span>Categories: {Array.isArray(req.data_categories) ? req.data_categories.join(", ") : req.data_categories}</span>
                      <span>&bull;</span>
                      <span>Valid until: {req.expires_at ? new Date(req.expires_at).toLocaleDateString() : "6 months"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDenyConsent(req.consent_id)}
                      disabled={actionLoading}
                      className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      Deny
                    </button>
                    <button
                      onClick={() => handleGrantConsent(req.consent_id)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve Access
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Health Record Sharing Authorizations */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Active Record Sharing Permissions</h3>
              <p className="text-xs text-slate-500 mt-0.5">Healthcare providers currently authorized to access portions of your medical vault</p>
            </div>
          </div>

          {activeConsents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
              No active third-party sharing permissions. Your health records are completely private to your active consultation providers.
            </div>
          ) : (
            <div className="space-y-3">
              {activeConsents.map((con) => (
                <div key={con.consent_id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{con.requester_name}</span>
                      <span className="text-xs text-slate-500">({con.requester_hospital_name})</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      <strong>Source Facility:</strong> {con.provider_hospital_name} &bull; <strong>Purpose:</strong> {con.purpose_code}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRevokeConsent(con.consent_id)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition shrink-0"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Revoke Permission
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Link ABHA */}
        {showLinkAbhaModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">Link ABHA Digital Health Account</h3>
                <button onClick={() => setShowLinkAbhaModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleLinkAbha} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">ABHA Address (PHR Handle)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. yourname@abdm"
                    value={newAbhaAddress}
                    onChange={(e) => setNewAbhaAddress(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">14-Digit ABHA Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="91-XXXX-XXXX-XXXX"
                    value={newAbhaNumber}
                    onChange={(e) => setNewAbhaNumber(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                  />
                </div>

                <div className="bg-sky-50 p-3 rounded-xl border border-sky-100 text-[11px] text-sky-900">
                  By linking your ABHA account, you authorize OH-ID to query and exchange consented health records via the national ABDM gateway in compliance with the ABDM Health Data Management Policy.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLinkAbhaModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold"
                  >
                    {actionLoading ? "Linking..." : "Confirm & Link"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Lodge Privacy Grievance */}
        {showGrievanceModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">Lodge Privacy Grievance / Data Correction</h3>
                <button onClick={() => setShowGrievanceModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleLodgeGrievance} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Grievance Category</label>
                  <select
                    value={grievanceType}
                    onChange={(e) => setGrievanceType(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                  >
                    <option value="DATA_CORRECTION">Correction / Rectification of Personal Details</option>
                    <option value="CONSENT_REVOCATION_DISPUTE">Consent Revocation Dispute</option>
                    <option value="UNAUTHORIZED_ACCESS_REPORT">Report Unauthorized Record Access</option>
                    <option value="DATA_ERASURE_REQUEST">Request Record Deletion (Subject to Statutory Retention)</option>
                    <option value="GENERAL_PRIVACY">General DPDP Privacy Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Detailed Description of Request</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe what information needs updating or your specific privacy inquiry..."
                    value={grievanceDescription}
                    onChange={(e) => setGrievanceDescription(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                  <strong>DPDP Act Statutory SLA:</strong> All privacy grievances are assigned directly to the Hospital Data Protection Officer (DPO) and must be reviewed and resolved within 30 statutory days.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGrievanceModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || !grievanceDescription.trim()}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                  >
                    {actionLoading ? "Submitting..." : "Submit Grievance"}
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
