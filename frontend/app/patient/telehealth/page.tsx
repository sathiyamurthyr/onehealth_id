"use client";

import React, { useState, useEffect } from "react";
import {
  Video, VideoOff, Mic, MicOff, PhoneCall, ShieldCheck,
  Clock, User, CheckCircle2, AlertCircle, Heart, Zap, Camera
} from "lucide-react";
import { globalApi } from "@/lib/api/global";
import { TelehealthSession } from "@/lib/types";

export default function PatientTelehealthWaitingRoomPage() {
  const [sessions, setSessions] = useState<TelehealthSession[]>([]);
  const [activeSession, setActiveSession] = useState<TelehealthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [vitalsSynced, setVitalsSynced] = useState(true);
  const [joinedCall, setJoinedCall] = useState(false);

  useEffect(() => {
    loadPatientSessions();
  }, []);

  const loadPatientSessions = async () => {
    setLoading(true);
    try {
      const data = await globalApi.listTelehealthSessions();
      setSessions(data || []);
      if (data && data.length > 0) {
        setActiveSession(data[0]);
      }
    } catch (err) {
      console.error("Failed to load patient telehealth sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", minHeight: "100vh", backgroundColor: "#0b0f19", color: "#f8fafc", fontFamily: "sans-serif" }}>
      {/* Top Banner */}
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
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>OH-ID Virtual Care & Telehealth Waiting Room</h1>
            </div>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.95rem" }}>
              Connect directly with accredited doctors and specialists anywhere in the world from the comfort of your home.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 600 }}>
            <ShieldCheck size={18} /> Encrypted Sovereign Channel
          </div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "#64748b" }}>Connecting to waiting room...</p>
      ) : activeSession ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "1.5rem" }}>
          {/* Main Video Box / Waiting Screen */}
          <div style={{
            background: "radial-gradient(ellipse at center, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "16px",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "440px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, color: "#cbd5e1" }}>
                Appointment with <strong style={{ color: "#fff" }}>Dr. {activeSession.doctor_name || "Specialist"}</strong>
              </span>
              <span style={{ fontSize: "0.8rem", color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "0.25rem 0.6rem", borderRadius: "4px" }}>
                {activeSession.session_status}
              </span>
            </div>

            {/* Video Preview Simulation */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{
                width: "120px", height: "120px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", fontWeight: 700, color: "#fff", marginBottom: "1rem",
                boxShadow: "0 0 30px rgba(59, 130, 246, 0.4)"
              }}>
                {cameraOn ? <Camera size={44} /> : <VideoOff size={44} />}
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 600, margin: "0 0 0.25rem 0" }}>
                {joinedCall ? "Doctor is connected • Consultation in progress" : "Doctor will join shortly • You are 1st in queue"}
              </h3>
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: 0 }}>
                {activeSession.hospital_name || "OneHealth Telehealth Network"}
              </p>
            </div>

            {/* Device Controls */}
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
              <button
                onClick={() => setCameraOn(!cameraOn)}
                style={{
                  padding: "0.75rem", borderRadius: "50%", border: "none",
                  background: cameraOn ? "rgba(255, 255, 255, 0.15)" : "#ef4444", color: "#fff", cursor: "pointer"
                }}
              >
                {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
              <button
                onClick={() => setMicOn(!micOn)}
                style={{
                  padding: "0.75rem", borderRadius: "50%", border: "none",
                  background: micOn ? "rgba(255, 255, 255, 0.15)" : "#ef4444", color: "#fff", cursor: "pointer"
                }}
              >
                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button
                onClick={() => setJoinedCall(!joinedCall)}
                style={{
                  padding: "0.75rem 1.75rem", borderRadius: "30px", border: "none",
                  background: joinedCall ? "#ef4444" : "#10b981", color: "#fff", fontWeight: 700, cursor: "pointer"
                }}
              >
                {joinedCall ? "Leave Consultation" : "Join Consultation Room"}
              </button>
            </div>
          </div>

          {/* Right Sidebar: Pre-Consultation Checklist & Live Vitals */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "1.5rem"
            }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={18} color="#34d399" /> Pre-Call Device Check
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}>
                  <span>Camera & Video:</span>
                  <span style={{ color: cameraOn ? "#34d399" : "#f87171" }}>{cameraOn ? "HD 1080p Ready" : "Off"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}>
                  <span>Microphone:</span>
                  <span style={{ color: micOn ? "#34d399" : "#f87171" }}>{micOn ? "Active (Low noise)" : "Muted"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}>
                  <span>Network Latency:</span>
                  <span style={{ color: "#34d399" }}>18 ms (Optimal)</span>
                </div>
              </div>
            </div>

            <div style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "1.5rem"
            }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Heart size={18} color="#f87171" /> Connected Live Vitals
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(30, 41, 59, 0.4)", padding: "0.75rem", borderRadius: "8px" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>HEART RATE (RPM)</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f8fafc" }}>74 bpm</div>
                  </div>
                  <Zap size={16} color="#34d399" />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(30, 41, 59, 0.4)", padding: "0.75rem", borderRadius: "8px" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>BLOOD OXYGEN (SPO2)</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#38bdf8" }}>99%</div>
                  </div>
                  <Zap size={16} color="#34d399" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "#64748b" }}>
          No scheduled telehealth appointments today.
        </div>
      )}
    </div>
  );
}
