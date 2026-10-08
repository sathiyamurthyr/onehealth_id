"use client";

import React, { useState, useEffect } from "react";
import { 
  Shield, Key, Lock, Unlock, Clock, AlertCircle, CheckCircle2, 
  Trash2, Plus, Building2, User, FileText, ArrowRight, Activity
} from "lucide-react";
import { networkApi } from "@/lib/api/network";
import { NetworkConsent, NetworkRecordExchange, NetworkProvider } from "@/lib/types";

export default function PatientConsentManagerPage() {
  const [consents, setConsents] = useState<NetworkConsent[]>([]);
  const [accessHistory, setAccessHistory] = useState<NetworkRecordExchange[]>([]);
  const [providers, setProviders] = useState<NetworkProvider[]>([]);
  const [patientId, setPatientId] = useState("p-dccc29e4");
  const [loading, setLoading] = useState(true);
  const [showGrantModal, setShowGrantModal] = useState(false);

  // Grant Form
  const [targetProviderId, setTargetProviderId] = useState("hosp-apollo");
  const [consentScope, setConsentScope] = useState("ALL_RECORDS");
  const [purpose, setPurpose] = useState("CARE_TREATMENT");
  const [validDays, setValidDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [patientId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cstList, histList, provList] = await Promise.all([
        networkApi.listPatientConsents(patientId),
        networkApi.getExchangeAudit(patientId),
        networkApi.listProviders({ stage: "ACTIVE" }),
      ]);
      setConsents(cstList || []);
      setAccessHistory(histList || []);
      setProviders(provList || []);
    } catch (err) {
      console.error("Failed to load patient consent data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await networkApi.grantConsent({
        patient_id: patientId,
        grantee_provider_id: targetProviderId,
        consent_scope: consentScope,
        purpose,
        valid_days: validDays,
      });
      setShowGrantModal(false);
      loadData();
    } catch (err) {
      console.error("Failed to grant consent:", err);
    }
  };

  const handleRevokeConsent = async (consentId: string) => {
    if (!confirm("Are you sure you want to revoke this consent immediately? The hospital will lose access to records.")) return;
    try {
      await networkApi.revokeConsent(consentId, patientId, "Manually revoked by patient via OH-ID Privacy Center.");
      loadData();
    } catch (err) {
      console.error("Failed to revoke consent:", err);
    }
  };

  return (
    <div style={{ padding: "2rem", minHeight: "100vh", backgroundColor: "#0b0f19", color: "#f8fafc", fontFamily: "sans-serif" }}>
      {/* Header Banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "16px",
        padding: "2rem",
        marginBottom: "2rem",
        backdropFilter: "blur(12px)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.3)", padding: "0.3rem 0.8rem", borderRadius: "20px", color: "#60a5fa", fontSize: "0.85rem", marginBottom: "0.8rem" }}>
              <Shield size={16} /> Patient-Controlled Sovereign Privacy
            </div>
            <h1 style={{ fontSize: "2rem", fontWeight: "700", margin: "0 0 0.5rem 0", background: "linear-gradient(90deg, #ffffff, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Granular Consent & Record Sharing
            </h1>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "1rem", maxWidth: "700px" }}>
              Control exactly which hospitals, doctors, and diagnostic labs can view your medical history. Set record scopes, expiration dates, and audit real-time access.
            </p>
          </div>

          <button
            onClick={() => setShowGrantModal(true)}
            style={{
              padding: "0.8rem 1.6rem",
              background: "linear-gradient(90deg, #2563eb, #1d4ed8)",
              border: "none",
              borderRadius: "10px",
              color: "#ffffff",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)"
            }}
          >
            <Plus size={18} /> Grant Provider Consent
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "2rem", alignItems: "start" }}>
        {/* Left Column: Active Consents */}
        <div style={{
          background: "rgba(30, 41, 59, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "14px",
          padding: "1.5rem",
          backdropFilter: "blur(8px)"
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Key size={18} style={{ color: "#60a5fa" }} /> Active Consent Grants ({consents.filter(c => c.status === "GRANTED").length})
          </h2>

          {consents.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>
              No active or historical consents found for your OH-ID.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {consents.map((cst) => {
                const isGranted = cst.status === "GRANTED";
                return (
                  <div
                    key={cst.id}
                    style={{
                      background: isGranted ? "rgba(15, 23, 42, 0.7)" : "rgba(15, 23, 42, 0.4)",
                      border: "1px solid",
                      borderColor: isGranted ? "rgba(59, 130, 246, 0.3)" : "rgba(255, 255, 255, 0.06)",
                      borderRadius: "10px",
                      padding: "1.2rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: "1rem"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          background: isGranted ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                          color: isGranted ? "#34d399" : "#f87171"
                        }}>
                          {cst.status}
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "#60a5fa", fontWeight: "600" }}>
                          Scope: {cst.consent_scope}
                        </span>
                      </div>

                      <h3 style={{ fontSize: "1.1rem", fontWeight: "600", margin: "0 0 0.3rem 0" }}>
                        {cst.grantee_provider_name || cst.grantee_provider_id}
                      </h3>

                      <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "0 0 0.4rem 0" }}>
                        Purpose: {cst.purpose}
                      </p>

                      <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                        Valid Until: {cst.valid_until ? new Date(cst.valid_until).toLocaleDateString() : "30 Days"}
                      </span>
                    </div>

                    {isGranted && (
                      <button
                        onClick={() => handleRevokeConsent(cst.id)}
                        style={{
                          padding: "0.45rem 0.9rem",
                          background: "rgba(239, 68, 68, 0.15)",
                          border: "1px solid rgba(239, 68, 68, 0.4)",
                          borderRadius: "6px",
                          color: "#f87171",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.3rem"
                        }}
                      >
                        <Trash2 size={14} /> Revoke
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Real-Time Access Audit */}
        <div style={{
          background: "rgba(30, 41, 59, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "14px",
          padding: "1.5rem",
          backdropFilter: "blur(8px)"
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Activity size={18} style={{ color: "#34d399" }} /> Access & Provenance Log
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {accessHistory.map((exc) => (
              <div
                key={exc.id}
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "8px",
                  padding: "0.9rem",
                  fontSize: "0.82rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                  <strong style={{ color: "#f8fafc" }}>{exc.record_type}</strong>
                  <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                    {exc.accessed_at ? new Date(exc.accessed_at).toLocaleTimeString() : "Recent"}
                  </span>
                </div>
                <p style={{ margin: "0 0 0.3rem 0", color: "#94a3b8" }}>
                  Accessed by: <strong style={{ color: "#cbd5e1" }}>{exc.requester_organization || exc.requester_provider_id}</strong>
                </p>
                <span style={{ fontSize: "0.7rem", color: "#475569", fontFamily: "monospace", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Hash: {exc.provenance_hash}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grant Modal */}
      {showGrantModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(6px)"
        }}>
          <div style={{
            background: "#1e293b",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "16px",
            padding: "2rem",
            maxWidth: "500px",
            width: "90%"
          }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: "700", margin: "0 0 1rem 0" }}>
              Grant Scoped Healthcare Consent
            </h2>

            <form onSubmit={handleGrantConsent} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
                  Select Healthcare Provider:
                </label>
                <select
                  value={targetProviderId}
                  onChange={(e) => setTargetProviderId(e.target.value)}
                  style={{ width: "100%", padding: "0.7rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#f8fafc" }}
                >
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.organization_name} ({p.provider_type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
                  Data Record Scope:
                </label>
                <select
                  value={consentScope}
                  onChange={(e) => setConsentScope(e.target.value)}
                  style={{ width: "100%", padding: "0.7rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#f8fafc" }}
                >
                  <option value="ALL_RECORDS">Full Medical History (All Records)</option>
                  <option value="LABS_ONLY">Diagnostic & Lab Reports Only</option>
                  <option value="PRESCRIPTIONS_ONLY">Prescriptions & Medications Only</option>
                  <option value="CONSULTATIONS_ONLY">Consultation Notes Only</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
                  Access Duration (Days):
                </label>
                <select
                  value={validDays}
                  onChange={(e) => setValidDays(Number(e.target.value))}
                  style={{ width: "100%", padding: "0.7rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#f8fafc" }}
                >
                  <option value={7}>7 Days (Single Episode)</option>
                  <option value={15}>15 Days</option>
                  <option value={30}>30 Days (Standard Care)</option>
                  <option value={90}>90 Days (Chronic Care Episode)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  style={{ padding: "0.6rem 1.2rem", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#f8fafc", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "0.6rem 1.5rem", background: "#2563eb", border: "none", borderRadius: "8px", color: "#ffffff", fontWeight: "600", cursor: "pointer" }}
                >
                  Grant Consent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
