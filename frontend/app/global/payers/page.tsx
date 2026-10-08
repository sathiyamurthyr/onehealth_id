"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard, ShieldCheck, CheckCircle2, Clock, AlertTriangle,
  Building2, Globe, FileCheck, DollarSign, RefreshCw, Plus
} from "lucide-react";
import { globalApi } from "@/lib/api/global";
import { GlobalPayerClaim } from "@/lib/types";

export default function GlobalPayersClearinghousePage() {
  const [claims, setClaims] = useState<GlobalPayerClaim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<GlobalPayerClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Adjudication modal
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [approvedAmt, setApprovedAmt] = useState("");
  const [adjStatus, setAdjStatus] = useState("APPROVED");
  const [adjNotes, setAdjNotes] = useState("");

  useEffect(() => {
    loadClaims();
  }, [statusFilter]);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const data = await globalApi.listPayerClaims({
        adjudication_status: statusFilter !== "ALL" ? statusFilter : undefined,
      });
      setClaims(data || []);
      if (data && data.length > 0 && !selectedClaim) {
        setSelectedClaim(data[0]);
      }
    } catch (err) {
      console.error("Failed to load global payer claims:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjudicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;
    try {
      await globalApi.adjudicatePayerClaim(selectedClaim.id, {
        status: adjStatus,
        approved_amount: parseFloat(approvedAmt) || 0,
        adjudication_notes: adjNotes || "Automated tariff policy rule match and verified diagnosis code.",
      });
      setShowAdjModal(false);
      loadClaims();
    } catch (err) {
      console.error("Failed to adjudicate claim:", err);
    }
  };

  return (
    <div style={{ padding: "2rem", minHeight: "100vh", backgroundColor: "#0b0f19", color: "#f8fafc", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "16px",
        padding: "2rem",
        marginBottom: "2rem",
        backdropFilter: "blur(12px)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <div style={{ padding: "0.5rem", borderRadius: "10px", background: "rgba(16, 185, 129, 0.2)", color: "#34d399" }}>
                <CreditCard size={26} />
              </div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>Global Payer Clearinghouse & Cross-Border Claims</h1>
            </div>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.95rem" }}>
              International insurance pre-authorization, multi-currency claims adjudication (INR, AED, USD, GBP), and automated tariff settlement.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {["ALL", "SUBMITTED", "APPROVED", "REJECTED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: "0.5rem 0.9rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: statusFilter === st ? "rgba(16, 185, 129, 0.25)" : "rgba(30, 41, 59, 0.4)",
                  color: statusFilter === st ? "#a7f3d0" : "#94a3b8",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "1.5rem" }}>
        {/* Claims List */}
        <div style={{
          background: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem"
        }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.5rem 0", color: "#cbd5e1" }}>Insurance Claims Stream</h2>
          {loading ? (
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Loading claims...</p>
          ) : claims.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No insurance claims found.</p>
          ) : (
            claims.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedClaim(c);
                  setApprovedAmt(String(c.approved_amount || c.billed_amount || c.claim_amount || 0));
                }}
                style={{
                  padding: "1rem",
                  borderRadius: "12px",
                  background: selectedClaim?.id === c.id ? "rgba(16, 185, 129, 0.15)" : "rgba(30, 41, 59, 0.4)",
                  border: `1px solid ${selectedClaim?.id === c.id ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.05)"}`,
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <span style={{ fontWeight: 600, color: "#f8fafc" }}>{c.claim_number}</span>
                  <span style={{
                    fontSize: "0.7rem",
                    padding: "0.2rem 0.4rem",
                    borderRadius: "4px",
                    background: (c.claim_status === "APPROVED" || c.adjudication_status === "APPROVED") ? "rgba(16, 185, 129, 0.2)" : "rgba(234, 179, 8, 0.2)",
                    color: (c.claim_status === "APPROVED" || c.adjudication_status === "APPROVED") ? "#34d399" : "#facc15"
                  }}>
                    {c.claim_status || c.adjudication_status}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                  {c.patient_name || "Patient Record"} • {c.payer_name}
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#38bdf8", marginTop: "0.4rem" }}>
                  {c.currency_code} {c.billed_amount || c.claim_amount}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Claim Overview */}
        {selectedClaim ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "1.5rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 0.25rem 0" }}>{selectedClaim.claim_number}</h3>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>
                    Patient: <strong style={{ color: "#fff" }}>{selectedClaim.patient_name}</strong> | Payer: <strong style={{ color: "#fff" }}>{selectedClaim.payer_name}</strong>
                  </p>
                </div>
                {(selectedClaim.claim_status === "SUBMITTED" || selectedClaim.adjudication_status === "SUBMITTED") && (
                  <button
                    onClick={() => {
                      setApprovedAmt(String(selectedClaim.billed_amount || selectedClaim.claim_amount || 0));
                      setShowAdjModal(true);
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem", background: "#10b981", color: "#fff",
                      border: "none", borderRadius: "8px", padding: "0.6rem 1.2rem", fontWeight: 600, cursor: "pointer"
                    }}
                  >
                    <FileCheck size={18} /> Adjudicate Claim
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
                <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "1rem", borderRadius: "10px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>BILLED AMOUNT</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f8fafc" }}>
                    {selectedClaim.currency_code} {selectedClaim.billed_amount || selectedClaim.claim_amount}
                  </div>
                </div>
                <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "1rem", borderRadius: "10px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>APPROVED AMOUNT</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#34d399" }}>
                    {selectedClaim.approved_amount ? `${selectedClaim.currency_code} ${selectedClaim.approved_amount}` : "Pending"}
                  </div>
                </div>
                <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "1rem", borderRadius: "10px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>PATIENT COPAY</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#38bdf8" }}>
                    {selectedClaim.currency_code} {selectedClaim.copay_amount || 0}
                  </div>
                </div>
                <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "1rem", borderRadius: "10px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>STATUS</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: (selectedClaim.claim_status === "APPROVED" || selectedClaim.adjudication_status === "APPROVED") ? "#34d399" : "#facc15" }}>
                    {selectedClaim.claim_status || selectedClaim.adjudication_status}
                  </div>
                </div>
              </div>

              {selectedClaim.adjudication_notes && (
                <div style={{ marginTop: "1.5rem", padding: "1rem", borderRadius: "10px", background: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.25rem" }}>ADJUDICATION AUDIT LOG</div>
                  <div style={{ color: "#e2e8f0", fontSize: "0.9rem" }}>{selectedClaim.adjudication_notes}</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "#64748b" }}>
            Select a claim to review adjudication details.
          </div>
        )}
      </div>

      {/* Adjudication Modal */}
      {showAdjModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "16px",
            padding: "2rem", width: "480px", maxWidth: "90%"
          }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 1rem 0" }}>Adjudicate Payer Claim</h3>
            <form onSubmit={handleAdjudicate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Adjudication Decision</label>
                <select
                  value={adjStatus}
                  onChange={(e) => setAdjStatus(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff" }}
                >
                  <option value="APPROVED">Approve Full / Standard Tariff</option>
                  <option value="PARTIALLY_APPROVED">Partially Approve (Deductible applied)</option>
                  <option value="REJECTED">Reject (Policy exclusion)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Approved Reimbursement Amount ({selectedClaim?.currency_code})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={approvedAmt}
                  onChange={(e) => setApprovedAmt(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Adjudication Notes / Clinical Rationale</label>
                <textarea
                  rows={3}
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  placeholder="Enter medical necessity validation and tariff code verification..."
                  style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  style={{ padding: "0.6rem 1.2rem", background: "transparent", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#94a3b8", borderRadius: "8px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "0.6rem 1.2rem", background: "#10b981", border: "none", color: "#fff", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
                >
                  Submit Adjudication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
