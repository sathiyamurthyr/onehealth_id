"use client";

import React, { useState, useEffect } from "react";
import {
  Activity, Heart, Zap, Watch, AlertTriangle, ShieldCheck,
  TrendingUp, RefreshCw, Plus, Bell, CheckCircle2, Droplet
} from "lucide-react";
import { globalApi } from "@/lib/api/global";
import { WearableObservation } from "@/lib/types";

export default function GlobalWearablesRPMPage() {
  const [streams, setStreams] = useState<WearableObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [metricFilter, setMetricFilter] = useState("ALL");

  // Ingest Simulator State
  const [showSimModal, setShowSimModal] = useState(false);
  const [simPatientId, setSimPatientId] = useState("p-dccc29e4");
  const [simDevice, setSimDevice] = useState("APPLE_WATCH");
  const [simMetric, setSimMetric] = useState("HEART_RATE");
  const [simValue, setSimValue] = useState("128");
  const [simUnit, setSimUnit] = useState("bpm");
  const [simAbnormal, setSimAbnormal] = useState(true);

  useEffect(() => {
    loadStreams();
  }, [metricFilter]);

  const loadStreams = async () => {
    setLoading(true);
    try {
      const data = await globalApi.getWearableStreams();
      setStreams(data || []);
      if (data && data.length > 0 && !selectedPatientId) {
        setSelectedPatientId(data[0].patient_id);
      }
    } catch (err) {
      console.error("Failed to load wearable RPM streams:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await globalApi.ingestWearableObservation({
        patient_id: simPatientId,
        device_type: simDevice,
        metric_type: simMetric,
        metric_value: parseFloat(simValue) || 0,
        unit: simUnit,
        is_abnormal: simAbnormal,
      });
      setShowSimModal(false);
      loadStreams();
    } catch (err) {
      console.error("Failed to ingest observation:", err);
    }
  };

  const filteredStreams = streams.filter((s) => {
    if (metricFilter === "ALL") return true;
    if (metricFilter === "ABNORMAL") return s.is_abnormal;
    return s.metric_type === metricFilter;
  });

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
              <div style={{ padding: "0.5rem", borderRadius: "10px", background: "rgba(239, 68, 68, 0.2)", color: "#f87171" }}>
                <Activity size={26} />
              </div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>Remote Patient Monitoring (RPM) & Wearable Streams</h1>
            </div>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.95rem" }}>
              Continuous real-time IoT biometric feeds, Apple HealthKit/Garmin synchronization, and proactive anomaly alert monitoring.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => setShowSimModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem", background: "#ef4444", color: "#fff",
                border: "none", borderRadius: "10px", padding: "0.75rem 1.25rem", fontWeight: 600, cursor: "pointer"
              }}
            >
              <Zap size={18} /> Ingest Live Telemetry
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>TOTAL TELEMETRY READINGS</span>
            <Activity size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f8fafc" }}>{streams.length}</div>
        </div>
        <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>ABNORMAL SPIKES / ALERTS</span>
            <AlertTriangle size={18} color="#f87171" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f87171" }}>
            {streams.filter(s => s.is_abnormal).length}
          </div>
        </div>
        <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>CONNECTED DEVICE MODELS</span>
            <Watch size={18} color="#a855f7" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f8fafc" }}>5 Vendors</div>
        </div>
        <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>PROVENANCE COMPLIANCE</span>
            <ShieldCheck size={18} color="#34d399" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#34d399" }}>100% Signed</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {["ALL", "ABNORMAL", "HEART_RATE", "BLOOD_GLUCOSE", "SPO2", "BLOOD_PRESSURE_SYS"].map((m) => (
          <button
            key={m}
            onClick={() => setMetricFilter(m)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background: metricFilter === m ? "rgba(239, 68, 68, 0.25)" : "rgba(30, 41, 59, 0.4)",
              color: metricFilter === m ? "#fca5a5" : "#94a3b8",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer"
            }}
          >
            {m.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Telemetry Observations Grid */}
      <div style={{
        background: "rgba(15, 23, 42, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "16px",
        padding: "1.5rem"
      }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1rem 0" }}>Live RPM Biometric Ingestion Stream</h2>
        {loading ? (
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Connecting to device streams...</p>
        ) : filteredStreams.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No observations matching filter.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
            {filteredStreams.map((obs) => (
              <div
                key={obs.id}
                style={{
                  padding: "1.25rem",
                  borderRadius: "12px",
                  background: obs.is_abnormal ? "rgba(239, 68, 68, 0.1)" : "rgba(30, 41, 59, 0.4)",
                  border: `1px solid ${obs.is_abnormal ? "rgba(239, 68, 68, 0.4)" : "rgba(255, 255, 255, 0.05)"}`,
                  position: "relative"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#f8fafc", fontSize: "1rem" }}>{obs.patient_name || "Patient Record"}</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{obs.device_type} • {obs.device_model || "Connected Sensor"}</div>
                  </div>
                  {obs.is_abnormal ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "rgba(239, 68, 68, 0.2)", color: "#f87171", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                      <AlertTriangle size={12} /> ABNORMAL
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                      <CheckCircle2 size={12} /> NORMAL
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", margin: "0.5rem 0" }}>
                  <span style={{ fontSize: "2rem", fontWeight: 700, color: obs.is_abnormal ? "#f87171" : "#38bdf8" }}>
                    {obs.metric_value ?? obs.value_numeric}
                  </span>
                  <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>{obs.unit}</span>
                  <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#64748b" }}>{obs.metric_type}</span>
                </div>

                <div style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", justifyContent: "space-between", marginTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.5rem" }}>
                  <span>Recorded: {new Date(obs.recorded_at).toLocaleTimeString()}</span>
                  <span>Provenance: {obs.source_provenance}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Simulator Modal */}
      {showSimModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "16px",
            padding: "2rem", width: "480px", maxWidth: "90%"
          }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 1rem 0" }}>Simulate IoT Sensor Reading Ingest</h3>
            <form onSubmit={handleSimulateIngest} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Device Vendor</label>
                <select
                  value={simDevice}
                  onChange={(e) => setSimDevice(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff" }}
                >
                  <option value="APPLE_WATCH">Apple Watch Series 9</option>
                  <option value="CONTINUOUS_GLUCOSE_MONITOR">Dexcom G7 CGM</option>
                  <option value="OMRON_BP">Omron Wireless Blood Pressure</option>
                  <option value="FITBIT">Fitbit Sense 2</option>
                  <option value="PULSE_OXIMETER">Masimo Wireless SpO2</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Biometric Metric</label>
                <select
                  value={simMetric}
                  onChange={(e) => {
                    setSimMetric(e.target.value);
                    if (e.target.value === "HEART_RATE") { setSimUnit("bpm"); setSimValue("128"); }
                    else if (e.target.value === "BLOOD_GLUCOSE") { setSimUnit("mg/dL"); setSimValue("210"); }
                    else if (e.target.value === "SPO2") { setSimUnit("%"); setSimValue("88"); }
                    else if (e.target.value === "BLOOD_PRESSURE_SYS") { setSimUnit("mmHg"); setSimValue("160"); }
                  }}
                  style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff" }}
                >
                  <option value="HEART_RATE">Heart Rate (bpm)</option>
                  <option value="BLOOD_GLUCOSE">Blood Glucose (mg/dL)</option>
                  <option value="SPO2">Blood Oxygen SpO2 (%)</option>
                  <option value="BLOOD_PRESSURE_SYS">Systolic BP (mmHg)</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Value</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={simValue}
                    onChange={(e) => setSimValue(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Unit</label>
                  <input
                    type="text"
                    readOnly
                    value={simUnit}
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#94a3b8" }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="abnormalCheck"
                  checked={simAbnormal}
                  onChange={(e) => setSimAbnormal(e.target.checked)}
                />
                <label htmlFor="abnormalCheck" style={{ fontSize: "0.85rem", color: "#cbd5e1", cursor: "pointer" }}>
                  Mark as clinically abnormal / trigger alert
                </label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowSimModal(false)}
                  style={{ padding: "0.6rem 1.2rem", background: "transparent", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#94a3b8", borderRadius: "8px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "0.6rem 1.2rem", background: "#ef4444", border: "none", color: "#fff", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
                >
                  Ingest Stream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
