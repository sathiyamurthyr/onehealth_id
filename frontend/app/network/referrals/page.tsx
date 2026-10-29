"use client";

import React, { useState, useEffect } from "react";
import { 
  GitPullRequest, Send, Inbox, ArrowUpRight, ArrowDownLeft, 
  AlertCircle, CheckCircle2, Clock, User, Building2, Plus, 
  Search, ShieldAlert, Check, X, FileText
} from "lucide-react";
import { networkApi } from "@/lib/api/network";
import { NetworkReferral, NetworkProvider } from "@/lib/types";

export default function NetworkReferralsPage() {
  const [direction, setDirection] = useState<"INCOMING" | "OUTGOING">("INCOMING");
  const [referrals, setReferrals] = useState<NetworkReferral[]>([]);
  const [providers, setProviders] = useState<NetworkProvider[]>([]);
  const [currentProviderId, setCurrentProviderId] = useState("prov-city-01");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<NetworkReferral | null>(null);
  const [responseNotes, setResponseNotes] = useState("");

  // Create Form State
  const [newPatientId, setNewPatientId] = useState("p-dccc29e4");
  const [targetProviderId, setTargetProviderId] = useState("prov-city-01");
  const [targetSpecialty, setTargetSpecialty] = useState("Neurology");
  const [urgency, setUrgency] = useState("URGENT");
  const [clinicalSummary, setClinicalSummary] = useState("");
  const [referralQuestion, setReferralQuestion] = useState("");
  const [referringDoctorName, setReferringDoctorName] = useState("Dr. Arun Kumar");

  useEffect(() => {
    loadReferrals();
  }, [direction, currentProviderId]);

  const loadReferrals = async () => {
    setLoading(true);
    try {
      const [refs, provs] = await Promise.all([
        direction === "INCOMING"
          ? networkApi.listIncomingReferrals(currentProviderId)
          : networkApi.listOutgoingReferrals(currentProviderId),
        networkApi.listProviders({ stage: "ACTIVE" }),
      ]);
      setReferrals(refs || []);
      setProviders(provs || []);
    } catch (err) {
      console.error("Failed to load referrals:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await networkApi.createReferral({
        patient_id: newPatientId,
        referring_provider_id: currentProviderId,
        referring_doctor_id: "doc-cardio-1",
        referring_doctor_name: referringDoctorName,
        target_provider_id: targetProviderId,
        target_specialty: targetSpecialty,
        urgency,
        clinical_summary: clinicalSummary,
        referral_question: referralQuestion,
        attached_record_ids: ["enc-cardio-001", "lab-lipid-002"],
      });
      setShowCreateModal(false);
      setClinicalSummary("");
      setReferralQuestion("");
      loadReferrals();
    } catch (err) {
      console.error("Failed to create referral:", err);
    }
  };

  const handleUpdateStatus = async (referralId: string, status: string) => {
    try {
      await networkApi.updateReferralStatus(referralId, status, responseNotes || "Accepted by specialist clinic.");
      setSelectedReferral(null);
      setResponseNotes("");
      loadReferrals();
    } catch (err) {
      console.error("Failed to update referral status:", err);
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
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.3)", padding: "0.3rem 0.8rem", borderRadius: "20px", color: "#c084fc", fontSize: "0.85rem", marginBottom: "0.8rem" }}>
              <GitPullRequest size={16} /> Inter-Provider Clinical Exchange
            </div>
            <h1 style={{ fontSize: "2rem", fontWeight: "700", margin: "0 0 0.5rem 0", background: "linear-gradient(90deg, #ffffff, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Provider-to-Provider Digital Referrals
            </h1>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "1rem", maxWidth: "700px" }}>
              Bidirectional clinical referral loop: Dispatch structured specialist referrals with clinical questions, track consult status, and receive return reports.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: "0.8rem 1.6rem",
              background: "linear-gradient(90deg, #8b5cf6, #7c3aed)",
              border: "none",
              borderRadius: "10px",
              color: "#ffffff",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 14px rgba(139, 92, 246, 0.3)"
            }}
          >
            <Plus size={18} /> Create Structured Referral
          </button>
        </div>

        {/* View Controls & Provider Filter */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginTop: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", background: "rgba(15, 23, 42, 0.6)", padding: "0.3rem", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <button
              onClick={() => setDirection("INCOMING")}
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: "8px",
                border: "none",
                background: direction === "INCOMING" ? "#8b5cf6" : "transparent",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <Inbox size={16} /> Incoming Referrals
            </button>
            <button
              onClick={() => setDirection("OUTGOING")}
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: "8px",
                border: "none",
                background: direction === "OUTGOING" ? "#8b5cf6" : "transparent",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <Send size={16} /> Outgoing Dispatches
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Viewing As Provider:</span>
            <select
              value={currentProviderId}
              onChange={(e) => setCurrentProviderId(e.target.value)}
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "8px",
                padding: "0.5rem 1rem",
                color: "#f8fafc",
                fontSize: "0.9rem",
                outline: "none"
              }}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.organization_name} ({p.provider_type})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Referrals List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
          <Clock className="animate-spin" size={36} style={{ margin: "0 auto 1rem auto", color: "#8b5cf6" }} />
          <p>Synchronizing network referral transactions...</p>
        </div>
      ) : referrals.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "4rem 2rem",
          background: "rgba(30, 41, 59, 0.4)",
          borderRadius: "16px",
          border: "1px dashed rgba(255, 255, 255, 0.1)"
        }}>
          <Inbox size={48} style={{ color: "#64748b", margin: "0 auto 1rem auto" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: "600", margin: "0 0 0.5rem 0" }}>
            No {direction.toLowerCase()} referrals found
          </h3>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0 }}>
            {direction === "INCOMING"
              ? "Your organization currently has no pending inbound patient referrals."
              : "No outbound digital referrals have been dispatched from this facility yet."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {referrals.map((ref) => {
            const urgencyColor = 
              ref.urgency === "STAT_EMERGENCY" ? "#ef4444" :
              ref.urgency === "URGENT" ? "#f59e0b" : "#3b82f6";

            const statusBg =
              ref.status === "COMPLETED" ? "rgba(16, 185, 129, 0.2)" :
              ref.status === "ACCEPTED" ? "rgba(59, 130, 246, 0.2)" :
              ref.status === "REJECTED" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)";

            const statusColor =
              ref.status === "COMPLETED" ? "#34d399" :
              ref.status === "ACCEPTED" ? "#60a5fa" :
              ref.status === "REJECTED" ? "#f87171" : "#fbbf24";

            return (
              <div
                key={ref.id}
                style={{
                  background: "rgba(30, 41, 59, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "1rem"
                }}
              >
                <div style={{ flex: "1 1 500px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.6rem" }}>
                    <span style={{
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "6px",
                      background: `${urgencyColor}25`,
                      color: urgencyColor,
                      border: `1px solid ${urgencyColor}50`
                    }}>
                      {ref.urgency}
                    </span>
                    <span style={{
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "6px",
                      background: statusBg,
                      color: statusColor
                    }}>
                      {ref.status}
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                      Ref ID: {ref.id}
                    </span>
                  </div>

                  <h3 style={{ fontSize: "1.2rem", fontWeight: "600", margin: "0 0 0.4rem 0" }}>
                    {ref.patient_name || "Kavitha Raman"} ({ref.onehealth_id || "OHID-IND-2026-01005"})
                  </h3>

                  <p style={{ color: "#cbd5e1", fontSize: "0.9rem", margin: "0 0 0.8rem 0", lineHeight: "1.5" }}>
                    <strong style={{ color: "#c084fc" }}>Target Specialty:</strong> {ref.target_specialty}
                  </p>

                  <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "0.8rem 1rem", borderRadius: "8px", marginBottom: "0.8rem", fontSize: "0.88rem" }}>
                    <p style={{ margin: "0 0 0.3rem 0", color: "#94a3b8" }}><strong>Clinical Summary:</strong> {ref.clinical_summary}</p>
                    {ref.referral_question && (
                      <p style={{ margin: 0, color: "#60a5fa" }}><strong>Clinical Question:</strong> {ref.referral_question}</p>
                    )}
                  </div>

                  {ref.response_notes && (
                    <div style={{ background: "rgba(16, 185, 129, 0.1)", borderLeft: "3px solid #10b981", padding: "0.6rem 0.8rem", borderRadius: "4px", fontSize: "0.85rem", color: "#a7f3d0" }}>
                      <strong>Return Clinical Report / Notes:</strong> {ref.response_notes}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.8rem" }}>
                    <span>Referring: {ref.referring_provider_name || ref.referring_provider_id} ({ref.referring_doctor_name || "Doctor"})</span>
                    <span>Target: {ref.target_provider_name || ref.target_provider_id}</span>
                  </div>
                </div>

                {direction === "INCOMING" && ref.status === "PENDING" && (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => {
                        setSelectedReferral(ref);
                        setResponseNotes("Specialist consult scheduled.");
                      }}
                      style={{
                        padding: "0.5rem 1rem",
                        background: "#10b981",
                        border: "none",
                        borderRadius: "6px",
                        color: "#ffffff",
                        fontWeight: "600",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem"
                      }}
                    >
                      <Check size={14} /> Accept & Triage
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(ref.id, "REJECTED")}
                      style={{
                        padding: "0.5rem 1rem",
                        background: "rgba(239, 68, 68, 0.2)",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        borderRadius: "6px",
                        color: "#f87171",
                        fontWeight: "600",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem"
                      }}
                    >
                      <X size={14} /> Decline
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Referral Modal */}
      {showCreateModal && (
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
            maxWidth: "600px",
            width: "90%",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
          }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "700", margin: "0 0 1.2rem 0", color: "#f8fafc" }}>
              Dispatch Structured Clinical Referral
            </h2>

            <form onSubmit={handleCreateReferral} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
                  Destination Hospital / Specialist Center:
                </label>
                <select
                  value={targetProviderId}
                  onChange={(e) => setTargetProviderId(e.target.value)}
                  style={{ width: "100%", padding: "0.7rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#f8fafc" }}
                >
                  {providers.filter(p => p.id !== currentProviderId).map(p => (
                    <option key={p.id} value={p.id}>{p.organization_name} ({p.provider_type})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Specialty:</label>
                  <input
                    type="text"
                    value={targetSpecialty}
                    onChange={(e) => setTargetSpecialty(e.target.value)}
                    style={{ width: "100%", padding: "0.7rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#f8fafc" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Urgency Level:</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    style={{ width: "100%", padding: "0.7rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#f8fafc" }}
                  >
                    <option value="ROUTINE">Routine (Elective)</option>
                    <option value="URGENT">Urgent (Within 48h)</option>
                    <option value="STAT_EMERGENCY">STAT / Emergency (Immediate)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Clinical Summary & History:</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Patient presentation, current treatments, diagnostic findings..."
                  value={clinicalSummary}
                  onChange={(e) => setClinicalSummary(e.target.value)}
                  style={{ width: "100%", padding: "0.7rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#f8fafc", resize: "vertical" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.3rem" }}>Specific Referral Question / Objective:</label>
                <input
                  type="text"
                  placeholder="e.g. Evaluate for surgical intervention / second opinion on echo..."
                  value={referralQuestion}
                  onChange={(e) => setReferralQuestion(e.target.value)}
                  style={{ width: "100%", padding: "0.7rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#f8fafc" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: "0.6rem 1.2rem", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#f8fafc", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "0.6rem 1.5rem", background: "#8b5cf6", border: "none", borderRadius: "8px", color: "#ffffff", fontWeight: "600", cursor: "pointer" }}
                >
                  Dispatch Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accept & Response Modal */}
      {selectedReferral && (
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
              Triage & Accept Inbound Referral
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1rem" }}>
              Patient: {selectedReferral.patient_name} ({selectedReferral.target_specialty})
            </p>

            <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.3rem" }}>
              Appointment Scheduling & Specialist Response Notes:
            </label>
            <textarea
              rows={3}
              value={responseNotes}
              onChange={(e) => setResponseNotes(e.target.value)}
              style={{ width: "100%", padding: "0.7rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#f8fafc", resize: "vertical", marginBottom: "1.2rem" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem" }}>
              <button
                onClick={() => setSelectedReferral(null)}
                style={{ padding: "0.6rem 1.2rem", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#f8fafc", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedReferral.id, "ACCEPTED")}
                style={{ padding: "0.6rem 1.5rem", background: "#10b981", border: "none", borderRadius: "8px", color: "#ffffff", fontWeight: "600", cursor: "pointer" }}
              >
                Confirm Acceptance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
