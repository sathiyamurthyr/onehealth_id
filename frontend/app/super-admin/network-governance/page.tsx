"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, ShieldCheck, CheckCircle2, AlertTriangle, Clock, 
  Activity, Users, FileText, ArrowRight, Check, X, ShieldAlert,
  GitPullRequest, RefreshCw
} from "lucide-react";
import { networkApi } from "@/lib/api/network";
import { NetworkProvider, NetworkTelemetry } from "@/lib/types";

export default function SuperAdminNetworkGovernancePage() {
  const [providers, setProviders] = useState<NetworkProvider[]>([]);
  const [telemetry, setTelemetry] = useState<NetworkTelemetry | null>(null);
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const stages = ["ALL", "PENDING", "UNDER_REVIEW", "VERIFIED", "ACTIVE", "SUSPENDED", "INACTIVE"];

  useEffect(() => {
    loadData();
  }, [selectedStage]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [provList, telem] = await Promise.all([
        networkApi.listProviders({
          stage: selectedStage !== "ALL" ? selectedStage : undefined,
        }),
        networkApi.getNetworkTelemetry(),
      ]);
      setProviders(provList || []);
      setTelemetry(telem);
    } catch (err) {
      console.error("Failed to load network governance telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStage = async (providerId: string, nextStage: string) => {
    try {
      await networkApi.updateProviderStage(providerId, nextStage, "National Health Accreditation Authority");
      loadData();
    } catch (err) {
      console.error("Failed to update provider stage:", err);
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
              <ShieldCheck size={16} /> Super Admin Network Operations
            </div>
            <h1 style={{ fontSize: "2rem", fontWeight: "700", margin: "0 0 0.5rem 0", background: "linear-gradient(90deg, #ffffff, #93c5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Healthcare Network Governance & Onboarding
            </h1>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "1rem", maxWidth: "700px" }}>
              Review 9-stage provider verification pipelines, enforce trust and compliance boundaries, and monitor live cross-hospital data exchange telemetry.
            </p>
          </div>

          <button
            onClick={loadData}
            style={{
              padding: "0.6rem 1.2rem",
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              color: "#f8fafc",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.9rem"
            }}
          >
            <RefreshCw size={15} /> Refresh Telemetry
          </button>
        </div>

        {/* Telemetry KPI Cards */}
        {telemetry && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1.5rem" }}>
            <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "1.2rem", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block" }}>Accredited Providers</span>
              <span style={{ fontSize: "1.8rem", fontWeight: "700", color: "#60a5fa" }}>{telemetry.active_providers_count}</span>
            </div>
            <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "1.2rem", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block" }}>Active Facilities</span>
              <span style={{ fontSize: "1.8rem", fontWeight: "700", color: "#34d399" }}>{telemetry.active_facilities_count}</span>
            </div>
            <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "1.2rem", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block" }}>Active Patient Consents</span>
              <span style={{ fontSize: "1.8rem", fontWeight: "700", color: "#c084fc" }}>{telemetry.active_consents_count}</span>
            </div>
            <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "1.2rem", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block" }}>Total Record Exchanges</span>
              <span style={{ fontSize: "1.8rem", fontWeight: "700", color: "#fbbf24" }}>{telemetry.total_record_exchanges_count}</span>
            </div>
          </div>
        )}

        {/* Stage Filter Pills */}
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", marginTop: "1.5rem" }}>
          {stages.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStage(st)}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: "20px",
                border: "1px solid",
                borderColor: selectedStage === st ? "#3b82f6" : "rgba(255, 255, 255, 0.1)",
                background: selectedStage === st ? "rgba(59, 130, 246, 0.2)" : "rgba(15, 23, 42, 0.4)",
                color: selectedStage === st ? "#60a5fa" : "#94a3b8",
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Provider Onboarding Review List */}
      <div style={{ display: "grid", gap: "1rem" }}>
        {providers.map((prov) => {
          const stageColor = 
            prov.onboarding_stage === "ACTIVE" ? "#34d399" :
            prov.onboarding_stage === "VERIFIED" ? "#60a5fa" :
            prov.onboarding_stage === "UNDER_REVIEW" ? "#fbbf24" :
            prov.onboarding_stage === "SUSPENDED" ? "#f87171" : "#94a3b8";

          return (
            <div
              key={prov.id}
              style={{
                background: "rgba(30, 41, 59, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "1.5rem",
                backdropFilter: "blur(8px)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1.5rem"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "4px",
                    background: `${stageColor}25`,
                    color: stageColor,
                    border: `1px solid ${stageColor}50`
                  }}>
                    {prov.onboarding_stage}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{prov.provider_type}</span>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>ID: {prov.id}</span>
                </div>

                <h3 style={{ fontSize: "1.2rem", fontWeight: "700", margin: "0 0 0.3rem 0" }}>
                  {prov.organization_name}
                </h3>

                <p style={{ color: "#cbd5e1", fontSize: "0.85rem", margin: "0 0 0.4rem 0" }}>
                  Reg: {prov.registration_number} | Contact: {prov.primary_contact_name} ({prov.primary_phone}, {prov.primary_email})
                </p>

                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Location: {prov.city}, {prov.state}, {prov.country}
                </span>
              </div>

              {/* Onboarding Stage Control Buttons */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {prov.onboarding_stage === "PENDING" && (
                  <button
                    onClick={() => handleAdvanceStage(prov.id, "UNDER_REVIEW")}
                    style={{ padding: "0.5rem 1rem", background: "#f59e0b", border: "none", borderRadius: "6px", color: "#000", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}
                  >
                    Move to Review
                  </button>
                )}
                {prov.onboarding_stage === "UNDER_REVIEW" && (
                  <button
                    onClick={() => handleAdvanceStage(prov.id, "VERIFIED")}
                    style={{ padding: "0.5rem 1rem", background: "#3b82f6", border: "none", borderRadius: "6px", color: "#fff", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}
                  >
                    Verify Documents
                  </button>
                )}
                {prov.onboarding_stage === "VERIFIED" && (
                  <button
                    onClick={() => handleAdvanceStage(prov.id, "ACTIVE")}
                    style={{ padding: "0.5rem 1rem", background: "#10b981", border: "none", borderRadius: "6px", color: "#fff", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}
                  >
                    Activate on Network
                  </button>
                )}
                {prov.onboarding_stage === "ACTIVE" && (
                  <button
                    onClick={() => handleAdvanceStage(prov.id, "SUSPENDED")}
                    style={{ padding: "0.5rem 1rem", background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: "6px", color: "#f87171", fontSize: "0.85rem", cursor: "pointer" }}
                  >
                    Suspend Access
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
