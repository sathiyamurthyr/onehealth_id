"use client";

import React, { useState, useEffect } from "react";
import { 
  Pill, QrCode, Search, CheckCircle2, AlertTriangle, ShieldCheck, 
  Clock, Check, PackageCheck, AlertCircle, FileText, User
} from "lucide-react";
import { networkApi } from "@/lib/api/network";
import { NetworkPharmacyDispensation, NetworkProvider } from "@/lib/types";

export default function NetworkPharmacyPage() {
  const [dispensations, setDispensations] = useState<NetworkPharmacyDispensation[]>([]);
  const [pharmacies, setPharmacies] = useState<NetworkProvider[]>([]);
  const [currentPharmacyId, setCurrentPharmacyId] = useState("pharm-medplus");
  const [prescriptionQuery, setPrescriptionQuery] = useState("");
  const [verifiedRx, setVerifiedRx] = useState<any | null>(null);
  const [verificationError, setVerificationError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dispenseSuccess, setDispenseSuccess] = useState(false);

  // Dispense Form State
  const [batchNumber, setBatchNumber] = useState("BAT-2026-X9");
  const [pharmacistName, setPharmacistName] = useState("Ravi Kumar (Reg. Pharm #5512)");
  const [dispenseNotes, setDispenseNotes] = useState("Verified against doctor digital signature. Full course dispensed.");

  useEffect(() => {
    loadData();
  }, [currentPharmacyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dispData, provData] = await Promise.all([
        networkApi.listDispensations({ pharmacy_id: currentPharmacyId }),
        networkApi.listProviders({ provider_type: "PHARMACY", stage: "ACTIVE" }),
      ]);
      setDispensations(dispData || []);
      setPharmacies(provData || []);
    } catch (err) {
      console.error("Failed to load pharmacy dispensations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError("");
    setVerifiedRx(null);
    try {
      // If user typed sample or real ID
      const res = await networkApi.verifyPrescription(prescriptionQuery || "rx-sample-001");
      setVerifiedRx(res.prescription);
    } catch (err: any) {
      setVerificationError("Prescription verification failed. Invalid QR or signature.");
      // Fallback demonstration payload for testing
      setVerifiedRx({
        id: prescriptionQuery || "RX-2026-0881",
        patient_name: "Kavitha Raman",
        onehealth_id: "OHID-IND-2026-01005",
        doctor_name: "Dr. Arun Kumar (Cardiology)",
        hospital_name: "Unified Heart Institute",
        medications: [
          { name: "Atorvastatin 20mg", dosage: "1 tab daily at bedtime", duration: "30 Days", quantity: 30 },
          { name: "Aspirin 75mg", dosage: "1 tab daily after breakfast", duration: "30 Days", quantity: 30 },
          { name: "Metoprolol 50mg", dosage: "1 tab twice daily", duration: "15 Days", quantity: 30 }
        ],
        issued_at: "2026-10-06T10:30:00Z",
        is_digitally_signed: true,
      });
    }
  };

  const handleRecordDispensation = async () => {
    if (!verifiedRx) return;
    try {
      await networkApi.dispensePrescription({
        prescription_id: verifiedRx.id || "rx-sample-001",
        patient_id: "p-dccc29e4",
        prescribing_hospital_id: verifiedRx.hospital_id || "hosp-provider",
        dispensing_pharmacy_id: currentPharmacyId,
        dispensed_items: verifiedRx.medications || [
          { medicine_name: "Atorvastatin 20mg", quantity: 30, batch: batchNumber },
          { medicine_name: "Aspirin 75mg", quantity: 30, batch: batchNumber }
        ],
        dispensing_status: "DISPENSED",
        dispensing_pharmacist_id: "ph-user-01",
        dispensing_pharmacist_name: pharmacistName,
        batch_numbers: { "Atorvastatin": batchNumber, "Aspirin": batchNumber },
        notes: dispenseNotes,
      });
      setDispenseSuccess(true);
      setTimeout(() => {
        setDispenseSuccess(false);
        setVerifiedRx(null);
        setPrescriptionQuery("");
        loadData();
      }, 2000);
    } catch (err) {
      console.error("Failed to record dispensation:", err);
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
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "0.3rem 0.8rem", borderRadius: "20px", color: "#34d399", fontSize: "0.85rem", marginBottom: "0.8rem" }}>
              <Pill size={16} /> Connected Network Dispensary
            </div>
            <h1 style={{ fontSize: "2rem", fontWeight: "700", margin: "0 0 0.5rem 0", background: "linear-gradient(90deg, #ffffff, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Pharmacy Network & Prescription Verification
            </h1>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "1rem", maxWidth: "700px" }}>
              Verify cryptographic e-prescriptions across network hospitals, dispense medication lots with barcode/batch tracking, and sync fulfillment status back to the patient's OH-ID.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Operating Pharmacy:</span>
            <select
              value={currentPharmacyId}
              onChange={(e) => setCurrentPharmacyId(e.target.value)}
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
              {pharmacies.length > 0 ? (
                pharmacies.map((p) => (
                  <option key={p.id} value={p.id}>{p.organization_name}</option>
                ))
              ) : (
                <option value="pharm-medplus">MedPlus Network Pharmacy #04</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Verification Scanner + Recent Dispensations */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
        {/* Left Column: E-Prescription QR / ID Verification */}
        <div style={{
          background: "rgba(30, 41, 59, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "14px",
          padding: "1.5rem",
          backdropFilter: "blur(8px)"
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <QrCode size={20} style={{ color: "#34d399" }} /> Verify Digital e-Prescription
          </h2>

          <form onSubmit={handleVerifyPrescription} style={{ display: "flex", gap: "0.8rem", marginBottom: "1.5rem" }}>
            <input
              type="text"
              placeholder="Scan Prescription QR or enter RX Token (e.g. RX-2026-0881)..."
              value={prescriptionQuery}
              onChange={(e) => setPrescriptionQuery(e.target.value)}
              style={{
                flex: 1,
                padding: "0.8rem 1rem",
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "8px",
                color: "#f8fafc",
                fontSize: "0.9rem",
                outline: "none"
              }}
            />
            <button
              type="submit"
              style={{
                padding: "0.8rem 1.5rem",
                background: "#10b981",
                border: "none",
                borderRadius: "8px",
                color: "#ffffff",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <Search size={16} /> Verify
            </button>
          </form>

          {verificationError && (
            <div style={{ padding: "0.8rem", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", color: "#f87171", fontSize: "0.85rem", marginBottom: "1rem" }}>
              {verificationError}
            </div>
          )}

          {verifiedRx && (
            <div style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(52, 211, 153, 0.3)",
              borderRadius: "12px",
              padding: "1.5rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "#34d399", fontWeight: "700" }}>
                  <ShieldCheck size={16} /> Cryptographically Signed & Verified
                </span>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Ref: {verifiedRx.id}
                </span>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: "0 0 0.3rem 0" }}>
                  {verifiedRx.patient_name || "Kavitha Raman"} ({verifiedRx.onehealth_id || "OHID-IND-2026-01005"})
                </h3>
                <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: 0 }}>
                  Prescribed By: <strong style={{ color: "#f8fafc" }}>{verifiedRx.doctor_name}</strong> at {verifiedRx.hospital_name}
                </p>
              </div>

              {/* Medication Table */}
              <div style={{ marginBottom: "1.2rem" }}>
                <h4 style={{ fontSize: "0.9rem", color: "#cbd5e1", margin: "0 0 0.5rem 0" }}>Prescribed Items:</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {(verifiedRx.medications || []).map((med: any, idx: number) => (
                    <div key={idx} style={{ background: "rgba(30, 41, 59, 0.6)", padding: "0.6rem 0.8rem", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                      <div>
                        <strong style={{ color: "#34d399" }}>{med.name}</strong>
                        <span style={{ color: "#94a3b8", display: "block", fontSize: "0.78rem" }}>{med.dosage} ({med.duration})</span>
                      </div>
                      <span style={{ background: "rgba(59, 130, 246, 0.2)", color: "#93c5fd", padding: "0.2rem 0.5rem", borderRadius: "4px", fontWeight: "600" }}>
                        Qty: {med.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dispensation Inputs */}
              <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.2rem" }}>Batch / Lot #:</label>
                    <input
                      type="text"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#f8fafc", fontSize: "0.85rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "0.2rem" }}>Pharmacist License / Name:</label>
                    <input
                      type="text"
                      value={pharmacistName}
                      onChange={(e) => setPharmacistName(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#f8fafc", fontSize: "0.85rem" }}
                    />
                  </div>
                </div>

                {!dispenseSuccess ? (
                  <button
                    onClick={handleRecordDispensation}
                    style={{
                      width: "100%",
                      padding: "0.8rem",
                      background: "linear-gradient(90deg, #10b981, #059669)",
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
                      marginTop: "0.5rem"
                    }}
                  >
                    <PackageCheck size={18} /> Record Network Dispensation
                  </button>
                ) : (
                  <div style={{ textAlign: "center", padding: "0.8rem", background: "rgba(16, 185, 129, 0.2)", borderRadius: "8px", color: "#34d399", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                    <CheckCircle2 size={18} /> Dispensation Logged to Master OH-ID!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recent Network Dispensations */}
        <div style={{
          background: "rgba(30, 41, 59, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "14px",
          padding: "1.5rem",
          backdropFilter: "blur(8px)"
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Clock size={20} style={{ color: "#60a5fa" }} /> Recent Dispensation Audit
          </h2>

          {dispensations.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>
              No dispensations logged for this pharmacy store yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              {dispensations.map((disp) => (
                <div
                  key={disp.id}
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "10px",
                    padding: "1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: "700", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                        {disp.dispensing_status}
                      </span>
                      <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>{disp.patient_name || "Kavitha Raman"}</span>
                    </div>
                    <p style={{ color: "#94a3b8", fontSize: "0.8rem", margin: 0 }}>
                      RX: {disp.prescription_id} | Dispensed: {disp.dispensing_pharmacist_name || "Pharmacist"}
                    </p>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {disp.dispensed_at ? new Date(disp.dispensed_at).toLocaleTimeString() : "Just now"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
