"use client";

import React, { useState, useEffect } from "react";
import { 
  Microscope, Activity, AlertTriangle, CheckCircle2, Clock, 
  FlaskConical, Send, Plus, Filter, ShieldAlert, ArrowRight, User
} from "lucide-react";
import { networkApi } from "@/lib/api/network";
import { NetworkDiagnosticOrder, NetworkProvider } from "@/lib/types";

export default function NetworkDiagnosticsPage() {
  const [orders, setOrders] = useState<NetworkDiagnosticOrder[]>([]);
  const [labs, setLabs] = useState<NetworkProvider[]>([]);
  const [currentLabId, setCurrentLabId] = useState("lab-thyrocare");
  const [loading, setLoading] = useState(true);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [criticalOnly, setCriticalOnly] = useState(false);

  // New Order State
  const [newOrderId, setNewOrderId] = useState(`LAB-${Math.floor(1000 + Math.random() * 9000)}`);
  const [patientId, setPatientId] = useState("p-dccc29e4");
  const [testCodes, setTestCodes] = useState("LIPID_PROFILE, HBA1C, SERUM_CREATININE");

  useEffect(() => {
    loadData();
  }, [currentLabId, criticalOnly]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orderData, labData] = await Promise.all([
        networkApi.listDiagnosticOrders({
          diagnostic_lab_id: currentLabId,
          critical_only: criticalOnly,
        }),
        networkApi.listProviders({ provider_type: "LABORATORY", stage: "ACTIVE" }),
      ]);
      setOrders(orderData || []);
      setLabs(labData || []);
    } catch (err) {
      console.error("Failed to load diagnostic orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await networkApi.createDiagnosticOrder({
        order_id: newOrderId,
        patient_id: patientId,
        ordering_provider_id: "hosp-provider",
        diagnostic_lab_id: currentLabId,
        test_codes: testCodes.split(",").map(s => s.trim()),
      });
      setShowOrderModal(false);
      setNewOrderId(`LAB-${Math.floor(1000 + Math.random() * 9000)}`);
      loadData();
    } catch (err) {
      console.error("Failed to create diagnostic order:", err);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string, isCritical: boolean = false) => {
    try {
      await networkApi.updateDiagnosticStatus(orderId, status, isCritical, `rep-diag-${orderId.toLowerCase()}`, 120);
      loadData();
    } catch (err) {
      console.error("Failed to update status:", err);
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
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "0.3rem 0.8rem", borderRadius: "20px", color: "#fbbf24", fontSize: "0.85rem", marginBottom: "0.8rem" }}>
              <Microscope size={16} /> Inter-Facility Diagnostic Network
            </div>
            <h1 style={{ fontSize: "2rem", fontWeight: "700", margin: "0 0 0.5rem 0", background: "linear-gradient(90deg, #ffffff, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Diagnostic Lab Orders & Critical Alerts
            </h1>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "1rem", maxWidth: "700px" }}>
              Track specimen collection, automated laboratory workflow, TAT turnaround monitoring, and instant critical-value notification loops.
            </p>
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={() => setCriticalOnly(!criticalOnly)}
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: "8px",
                border: "1px solid",
                borderColor: criticalOnly ? "#ef4444" : "rgba(255,255,255,0.15)",
                background: criticalOnly ? "rgba(239, 68, 68, 0.2)" : "rgba(15, 23, 42, 0.6)",
                color: criticalOnly ? "#f87171" : "#cbd5e1",
                cursor: "pointer",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <AlertTriangle size={16} /> Critical Values Only
            </button>
            <button
              onClick={() => setShowOrderModal(true)}
              style={{
                padding: "0.6rem 1.4rem",
                background: "#f59e0b",
                border: "none",
                borderRadius: "8px",
                color: "#000000",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <Plus size={16} /> Order Diagnostic Investigation
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
          <Clock className="animate-spin" size={36} style={{ margin: "0 auto 1rem auto", color: "#fbbf24" }} />
          <p>Loading laboratory order queues...</p>
        </div>
      ) : orders.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "4rem 2rem",
          background: "rgba(30, 41, 59, 0.4)",
          borderRadius: "16px",
          border: "1px dashed rgba(255, 255, 255, 0.1)"
        }}>
          <FlaskConical size={48} style={{ color: "#64748b", margin: "0 auto 1rem auto" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: "600", margin: "0 0 0.5rem 0" }}>No diagnostic orders in this view</h3>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Create an order to initiate inter-facility specimen routing.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {orders.map((ord) => {
            const statusColor = 
              ord.specimen_status === "REPORT_READY" ? "#34d399" :
              ord.specimen_status === "PROCESSING" ? "#60a5fa" :
              ord.specimen_status === "SPECIMEN_COLLECTED" ? "#fbbf24" : "#94a3b8";

            return (
              <div
                key={ord.id}
                style={{
                  background: ord.critical_flag ? "rgba(239, 68, 68, 0.12)" : "rgba(30, 41, 59, 0.5)",
                  border: "1px solid",
                  borderColor: ord.critical_flag ? "rgba(239, 68, 68, 0.4)" : "rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.5rem" }}>
                    <span style={{
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "6px",
                      background: `${statusColor}25`,
                      color: statusColor,
                      border: `1px solid ${statusColor}50`
                    }}>
                      {ord.specimen_status}
                    </span>
                    {ord.critical_flag && (
                      <span style={{
                        fontSize: "0.75rem",
                        fontWeight: "800",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "6px",
                        background: "rgba(239, 68, 68, 0.25)",
                        color: "#ef4444",
                        border: "1px solid #ef4444",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem"
                      }}>
                        <AlertTriangle size={13} /> CRITICAL PANIC VALUE
                      </span>
                    )}
                    <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Order ID: {ord.order_id}</span>
                  </div>

                  <h3 style={{ fontSize: "1.15rem", fontWeight: "700", margin: "0 0 0.3rem 0" }}>
                    {ord.patient_name || "Kavitha Raman"} ({ord.onehealth_id || "OHID-IND-2026-01005"})
                  </h3>

                  <p style={{ color: "#cbd5e1", fontSize: "0.88rem", margin: "0 0 0.6rem 0" }}>
                    <strong>Ordered Tests:</strong> {Array.isArray(ord.test_codes) ? ord.test_codes.join(", ") : String(ord.test_codes)}
                  </p>

                  <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.8rem", color: "#94a3b8" }}>
                    <span>Ordering: {ord.ordering_provider_name || ord.ordering_provider_id}</span>
                    <span>Diagnostic Lab: {ord.lab_name || ord.diagnostic_lab_id}</span>
                    {ord.turnaround_minutes && <span>TAT: {ord.turnaround_minutes} Mins</span>}
                  </div>
                </div>

                {/* Workflow Stepper Action Buttons */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {ord.specimen_status === "ORDERED" && (
                    <button
                      onClick={() => handleUpdateStatus(ord.order_id || ord.id, "SPECIMEN_COLLECTED")}
                      style={{ padding: "0.5rem 1rem", background: "#f59e0b", border: "none", borderRadius: "6px", color: "#000", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}
                    >
                      Collect Specimen
                    </button>
                  )}
                  {ord.specimen_status === "SPECIMEN_COLLECTED" && (
                    <button
                      onClick={() => handleUpdateStatus(ord.order_id || ord.id, "PROCESSING")}
                      style={{ padding: "0.5rem 1rem", background: "#3b82f6", border: "none", borderRadius: "6px", color: "#fff", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}
                    >
                      Start Analyzer Run
                    </button>
                  )}
                  {ord.specimen_status === "PROCESSING" && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(ord.order_id || ord.id, "REPORT_READY", false)}
                        style={{ padding: "0.5rem 1rem", background: "#10b981", border: "none", borderRadius: "6px", color: "#fff", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}
                      >
                        Publish Normal Report
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(ord.order_id || ord.id, "REPORT_READY", true)}
                        style={{ padding: "0.5rem 1rem", background: "#ef4444", border: "none", borderRadius: "6px", color: "#fff", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}
                      >
                        Publish Critical Alert
                      </button>
                    </>
                  )}
                  {ord.specimen_status === "REPORT_READY" && (
                    <span style={{ fontSize: "0.85rem", color: "#34d399", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      <CheckCircle2 size={16} /> Result Synced to OH-ID
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Order Modal */}
      {showOrderModal && (
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
              Order External Diagnostic Panel
            </h2>

            <form onSubmit={handleCreateOrder} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
                  Destination Accredited Lab:
                </label>
                <select
                  value={currentLabId}
                  onChange={(e) => setCurrentLabId(e.target.value)}
                  style={{ width: "100%", padding: "0.7rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#f8fafc" }}
                >
                  {labs.map(l => (
                    <option key={l.id} value={l.id}>{l.organization_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
                  Test Codes (Comma-separated):
                </label>
                <input
                  type="text"
                  required
                  value={testCodes}
                  onChange={(e) => setTestCodes(e.target.value)}
                  style={{ width: "100%", padding: "0.7rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#f8fafc" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  style={{ padding: "0.6rem 1.2rem", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#f8fafc", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "0.6rem 1.5rem", background: "#f59e0b", border: "none", borderRadius: "8px", color: "#000", fontWeight: "700", cursor: "pointer" }}
                >
                  Dispatch Lab Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
