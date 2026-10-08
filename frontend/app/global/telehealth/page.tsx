"use client";

import React, { useState, useEffect } from "react";
import {
  Video, VideoOff, Mic, MicOff, PhoneCall, Calendar, Clock,
  User, CheckCircle2, AlertCircle, FileText, Share2, ExternalLink, Play
} from "lucide-react";
import { globalApi } from "@/lib/api/global";
import { TelehealthSession } from "@/lib/types";

export default function GlobalTelehealthConsolePage() {
  const [sessions, setSessions] = useState<TelehealthSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<TelehealthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    loadSessions();
  }, [statusFilter]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await globalApi.listTelehealthSessions({
        session_status: statusFilter !== "ALL" ? statusFilter : undefined,
      });
      setSessions(data || []);
      if (data && data.length > 0 && !selectedSession) {
        setSelectedSession(data[0]);
        setNotes(data[0].consultation_notes || data[0].clinical_notes_draft || "");
      }
    } catch (err) {
      console.error("Failed to load telehealth sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (sessionId: string, newStatus: string) => {
    try {
      const updated = await globalApi.updateTelehealthSession(sessionId, {
        session_status: newStatus,
        consultation_notes: notes,
      });
      loadSessions();
      if (updated && selectedSession?.id === sessionId) {
        setSelectedSession(updated);
      }
    } catch (err) {
      console.error("Failed to update session status:", err);
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
              <div style={{ padding: "0.5rem", borderRadius: "10px", background: "rgba(168, 85, 247, 0.2)", color: "#c084fc" }}>
                <Video size={26} />
              </div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>Global Telehealth Virtual Consultation Hub</h1>
            </div>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.95rem" }}>
              Encrypted WebRTC cross-border tele-consultations, digital waiting rooms, real-time vital streams, and clinical documentation.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {["ALL", "SCHEDULED", "IN_PROGRESS", "COMPLETED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: "0.5rem 0.9rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: statusFilter === st ? "rgba(168, 85, 247, 0.3)" : "rgba(30, 41, 59, 0.4)",
                  color: statusFilter === st ? "#e9d5ff" : "#94a3b8",
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
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "1.5rem" }}>
        {/* Sessions List */}
        <div style={{
          background: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem"
        }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.5rem 0", color: "#cbd5e1" }}>Scheduled Virtual Sessions</h2>
          {loading ? (
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Loading consultations...</p>
          ) : sessions.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No telehealth sessions match this filter.</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setSelectedSession(s);
                  setNotes(s.consultation_notes || s.clinical_notes_draft || "");
                }}
                style={{
                  padding: "1rem",
                  borderRadius: "12px",
                  background: selectedSession?.id === s.id ? "rgba(168, 85, 247, 0.15)" : "rgba(30, 41, 59, 0.4)",
                  border: `1px solid ${selectedSession?.id === s.id ? "rgba(168, 85, 247, 0.4)" : "rgba(255, 255, 255, 0.05)"}`,
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <span style={{ fontWeight: 600, color: "#f8fafc" }}>{s.patient_name || "Anonymous Patient"}</span>
                  <span style={{
                    fontSize: "0.7rem",
                    padding: "0.2rem 0.4rem",
                    borderRadius: "4px",
                    background: s.session_status === "IN_PROGRESS" ? "rgba(239, 68, 68, 0.2)" : s.session_status === "COMPLETED" ? "rgba(16, 185, 129, 0.2)" : "rgba(59, 130, 246, 0.2)",
                    color: s.session_status === "IN_PROGRESS" ? "#f87171" : s.session_status === "COMPLETED" ? "#34d399" : "#60a5fa"
                  }}>
                    {s.session_status}
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Clock size={14} /> {new Date(s.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({s.duration_minutes || 30} mins)
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.3rem" }}>
                  Dr. {s.doctor_name || "Specialist"} • {s.hospital_name || "Healthcare Facility"}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Video Consultation Workspace */}
        {selectedSession ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Video Call Simulation Screen */}
            <div style={{
              background: "radial-gradient(ellipse at center, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "16px",
              padding: "2rem",
              height: "360px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden"
            }}>
              {/* Top Banner */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: selectedSession.session_status === "IN_PROGRESS" ? "#ef4444" : "#eab308", boxShadow: "0 0 10px currentColor" }} />
                  <span style={{ fontWeight: 600, color: "#fff" }}>WebRTC HD Stream • {selectedSession.patient_name}</span>
                </div>
                <div style={{ background: "rgba(0,0,0,0.5)", padding: "0.3rem 0.75rem", borderRadius: "6px", fontSize: "0.85rem", color: "#38bdf8" }}>
                  E2E AES-256 Encrypted
                </div>
              </div>

              {/* Center Patient Avatar Graphic */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                <div style={{
                  width: "90px", height: "90px", borderRadius: "50%", background: "linear-gradient(135deg, #a855f7, #6366f1)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem"
                }}>
                  {selectedSession.patient_name ? selectedSession.patient_name.charAt(0) : "P"}
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>{selectedSession.patient_name}</div>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>OH-ID: {selectedSession.onehealth_id || "OH-IND-8812"}</div>
              </div>

              {/* Call Controls Bar */}
              <div style={{ display: "flex", justifyContent: "center", gap: "1rem", zIndex: 2 }}>
                {selectedSession.session_status !== "IN_PROGRESS" ? (
                  <button
                    onClick={() => handleUpdateStatus(selectedSession.id, "IN_PROGRESS")}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem", background: "#10b981", color: "#fff",
                      border: "none", padding: "0.6rem 1.5rem", borderRadius: "30px", fontWeight: 600, cursor: "pointer"
                    }}
                  >
                    <Play size={18} /> Start Consultation
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateStatus(selectedSession.id, "COMPLETED")}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem", background: "#ef4444", color: "#fff",
                      border: "none", padding: "0.6rem 1.5rem", borderRadius: "30px", fontWeight: 600, cursor: "pointer"
                    }}
                  >
                    <PhoneCall size={18} /> End Call & Finalize
                  </button>
                )}
              </div>
            </div>

            {/* Clinical Notes Card */}
            <div style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "1.5rem"
            }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FileText size={18} color="#60a5fa" /> Real-time Consultation & Diagnosis Notes
              </h3>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter patient complaints, clinical findings, differential diagnosis, and recommended prescriptions..."
                style={{
                  width: "100%", padding: "1rem", background: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "10px", color: "#fff", fontSize: "0.95rem", resize: "vertical", boxSizing: "border-box"
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button
                  onClick={() => handleUpdateStatus(selectedSession.id, selectedSession.session_status)}
                  style={{
                    background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px",
                    padding: "0.6rem 1.25rem", fontWeight: 600, cursor: "pointer"
                  }}
                >
                  Save Consultation Record
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "#64748b" }}>
            Select a session to begin virtual consultation.
          </div>
        )}
      </div>
    </div>
  );
}
