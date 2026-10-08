"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Siren, AlertTriangle, Clock, Lock, Unlock, 
  CheckCircle2, FileText, User, Activity, BellRing
} from "lucide-react";
import { networkApi } from "@/lib/api/network";
import { EmergencyBreakGlassLog } from "@/lib/types";

export default function NetworkEmergencyBreakGlassPage() {
  const [patientId, setPatientId] = useState("p-dccc29e4");
  const [clinicianId, setClinicianId] = useState("doc-er-chief");
  const [clinicianName, setClinicianName] = useState("Dr. Vikram Seth (Trauma Lead)");
  const [providerId, setProviderId] = useState("emerg-metro");
  const [triageLevel, setTriageLevel] = useState("RESUSCITATION");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [breakGlassResult, setBreakGlassResult] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<EmergencyBreakGlassLog[]>([]);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      const logs = await networkApi.listBreakGlassLogs();
      setAuditLogs(logs || []);
    } catch (err) {
      console.error("Failed to load break glass logs:", err);
    }
  };

  const handleExecuteBreakGlass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.length < 15) {
      alert("A comprehensive clinical justification is mandatory for emergency break-glass override.");
      return;
    }
    setLoading(true);
    try {
      const res = await networkApi.executeBreakGlass({
        patient_id: patientId,
        provider_id: providerId,
        clinician_id: clinicianId,
        clinician_name: clinicianName,
        reason,
        triage_level: triageLevel,
        accessed_records: ["ALLERGIES", "CHRONIC_CONDITIONS", "RECENT_MEDS", "BLOOD_GROUP"],
      });
      setBreakGlassResult(res);
      loadAuditLogs();
    } catch (err) {
      console.error("Failed to execute break-glass access:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", minHeight: "100vh", backgroundColor: "#0b0f19", color: "#f8fafc", fontFamily: "sans-serif" }}>
      {/* Header Warning Banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%)",
        border: "1px solid rgba(239, 68, 68, 0.4)",
        borderRadius: "16px",
        padding: "2rem",
        marginBottom: "2rem",
        backdropFilter: "blur(12px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", color: "#ef4444", marginBottom: "0.8rem" }}>
          <Siren size={28} className="animate-pulse" />
          <span style={{ fontSize: "0.9rem", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase" }}>
            Emergency Medical Compliance Gate
          </span>
        </div>

        <h1 style={{ fontSize: "2rem", fontWeight: "800", margin: "0 0 0.5rem 0", color: "#f8fafc" }}>
          Emergency Break-Glass Protocol Override
        </h1>

        <p style={{ color: "#cbd5e1", fontSize: "0.95rem", margin: 0, maxWidth: "800px", lineHeight: "1.5" }}>
          This facility is strictly restricted to life-threatening trauma and critical care episodes where the patient is incapacitated. 
          Every access event triggers an immutable regulatory audit entry, sends high-priority SMS notifications to the patient / emergency proxy, and opens a 120-minute time-bound retrieval window.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "2rem", alignItems: "start" }}>
        {/* Left Column: Override Trigger Form */}
        <div style={{
          background: "rgba(30, 41, 59, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "14px",
          padding: "1.5rem",
          backdropFilter: "blur(8px)"
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", margin: "0 0 1.2rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Lock size={18} style={{ color: "#ef4444" }} /> Authorize Life-Saving Override
          </h2>

          <form onSubmit={handleExecuteBreakGlass} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
                Target Patient OH-ID / Master Patient ID:
              </label>
              <input
                type="text"
                required
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                style={{ width: "100%", padding: "0.7rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#f8fafc" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
                  Triage Severity:
                </label>
                <select
                  value={triageLevel}
                  onChange={(e) => setTriageLevel(e.target.value)}
                  style={{ width: "100%", padding: "0.7rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#f8fafc" }}
                >
                  <option value="RESUSCITATION">Level 1: Resuscitation (Cardiac/Trauma)</option>
                  <option value="EMERGENT">Level 2: Emergent (Critical Unconscious)</option>
                  <option value="URGENT">Level 3: Urgent Trauma</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
                  Attending Clinician:
                </label>
                <input
                  type="text"
                  required
                  value={clinicianName}
                  onChange={(e) => setClinicianName(e.target.value)}
                  style={{ width: "100%", padding: "0.7rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#f8fafc" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#f87171", marginBottom: "0.3rem", fontWeight: "600" }}>
                Mandatory Clinical Justification (Min 15 chars):
              </label>
              <textarea
                rows={3}
                required
                placeholder="Detail patient status, lack of responsiveness, immediate need for allergy/cardiac history..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ width: "100%", padding: "0.7rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: "8px", color: "#f8fafc", resize: "vertical" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.8rem",
                background: "linear-gradient(90deg, #ef4444, #dc2626)",
                border: "none",
                borderRadius: "8px",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "0.95rem",
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)"
              }}
            >
              <Unlock size={18} /> Execute Break-Glass Protocol
            </button>
          </form>

          {/* Break Glass Active Records Display */}
          {breakGlassResult && (
            <div style={{
              marginTop: "1.5rem",
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(52, 211, 153, 0.4)",
              borderRadius: "12px",
              padding: "1.5rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ fontSize: "0.85rem", color: "#34d399", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <CheckCircle2 size={16} /> Break-Glass Active: 120 Mins Window
                </span>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  Session ID: {breakGlassResult.emergency_log_id}
                </span>
              </div>

              <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: "0 0 1rem 0" }}>
                High-priority notification sent to patient. {breakGlassResult.records_count} critical health records decrypted for emergency evaluation.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {(breakGlassResult.critical_records || []).slice(0, 5).map((rec: any, idx: number) => (
                  <div key={idx} style={{ background: "rgba(30, 41, 59, 0.6)", padding: "0.6rem 0.8rem", borderRadius: "6px", fontSize: "0.85rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong style={{ color: "#60a5fa" }}>{rec.event_title}</strong>
                      <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>{rec.event_date ? new Date(rec.event_date).toLocaleDateString() : "Past"}</span>
                    </div>
                    <span style={{ color: "#cbd5e1", fontSize: "0.8rem", display: "block" }}>Source: {rec.source_provider_name || "Network Hospital"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Immutable Audit Trail */}
        <div style={{
          background: "rgba(30, 41, 59, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "14px",
          padding: "1.5rem",
          backdropFilter: "blur(8px)"
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Activity size={18} style={{ color: "#fbbf24" }} /> Emergency Override Audit Log
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {auditLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "10px",
                  padding: "1rem",
                  fontSize: "0.85rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                  <span style={{ fontWeight: "700", color: "#f87171" }}>{log.triage_level}</span>
                  <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                    {log.created_at ? new Date(log.created_at).toLocaleString() : "Recent"}
                  </span>
                </div>
                <p style={{ margin: "0 0 0.3rem 0", fontWeight: "600", color: "#f8fafc" }}>
                  {log.patient_name || log.patient_id}
                </p>
                <p style={{ margin: "0 0 0.4rem 0", color: "#94a3b8", fontSize: "0.8rem" }}>
                  Clinician: {log.clinician_name} ({log.provider_name || log.provider_id})
                </p>
                <div style={{ background: "rgba(30, 41, 59, 0.5)", padding: "0.4rem 0.6rem", borderRadius: "4px", color: "#cbd5e1", fontSize: "0.78rem" }}>
                  Reason: {log.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
