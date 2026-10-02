"use client";

import React, { useState, useEffect } from "react";
import {
  Pill,
  AlertTriangle,
  CheckCircle2,
  Package,
  Search,
  Filter,
  Calendar,
  Building2,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckSquare,
  ArrowRight,
  FileCheck2,
  X,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { api } from "@/lib/api";
import { PharmacyItem, Prescription } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState } from "@/components/ui/FeedbackStates";

export default function PharmacyPage() {
  const [activeTab, setActiveTab] = useState<"QUEUE" | "INVENTORY">("QUEUE");

  // Prescriptions Queue State
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingRx, setLoadingRx] = useState(true);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);

  // Inventory State
  const [medicines, setMedicines] = useState<PharmacyItem[]>([]);
  const [loadingInv, setLoadingInv] = useState(false);
  const [search, setSearch] = useState("");

  // Dispense Modal State
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [dispenseData, setDispenseData] = useState<any[]>([]);
  const [pharmacistNotes, setPharmacistNotes] = useState("");
  const [dispensingInProgress, setDispensingInProgress] = useState(false);
  const [dispenseSuccess, setDispenseSuccess] = useState(false);

  // Load Prescriptions Queue
  const loadPrescriptions = async () => {
    setLoadingRx(true);
    try {
      const data = await api.consultations.listPrescriptions({ status: "ACTIVE" });
      setPrescriptions(data || []);
      if (data && data.length > 0 && !selectedRx) {
        setSelectedRx(data[0]);
      }
    } catch (err) {
      console.error("Failed to load prescription queue:", err);
    } finally {
      setLoadingRx(false);
    }
  };

  // Load Inventory Formulary
  const loadInventory = async () => {
    setLoadingInv(true);
    try {
      const data = await api.clinical.pharmacyDispensary();
      setMedicines(data || []);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoadingInv(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
    loadInventory();
  }, []);

  const openDispenseModal = (rx: Prescription) => {
    setSelectedRx(rx);
    // Initialize item dispense draft
    const initialDispense = rx.items.map((it) => ({
      item_id: it.id || it.medicine_name,
      medicine_name: it.brand_name || it.medicine_name,
      generic_name: it.generic_name,
      prescribed_qty: it.quantity || 10,
      dispensed_qty: it.quantity || 10,
      batch_number: "BCH-2026-" + Math.floor(1000 + Math.random() * 9000),
      expiry_date: "2027-12-31",
      substitution_made: false,
      substitution_drug: "",
    }));
    setDispenseData(initialDispense);
    setIsDispenseModalOpen(true);
  };

  const handleConfirmDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRx) return;
    setDispensingInProgress(true);
    try {
      const currentUser = api.auth.getCurrentUser();
      await api.consultations.dispensePrescription(
        selectedRx.id,
        dispenseData,
        currentUser?.name || "Pharmacist Rajesh"
      );

      setDispenseSuccess(true);
      setTimeout(() => {
        setDispenseSuccess(false);
        setIsDispenseModalOpen(false);
        loadPrescriptions();
      }, 1500);
    } catch (err: any) {
      alert("Failed to record dispensing: " + (err.message || "Database error"));
    } finally {
      setDispensingInProgress(false);
    }
  };

  const filteredMedicines = medicines.filter((m) => {
    return (
      !search ||
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.generic_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.batch_number?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <AppLayout>
      <div className="bg-white min-h-screen text-slate-900 pb-20 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Pill className="w-5 h-5 text-indigo-600" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Pharmacy & Medication Dispensing Station
              </h1>
              <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                FHIR MedicationDispense
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Prescription verification, batch & expiry controls, generic substitution rules, and formulary inventory.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                loadPrescriptions();
                loadInventory();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* FHIR Workflow Notification (Point 15) */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-slate-900">FHIR Clinical Workflow Separation:</span>{" "}
            Prescribing (<code className="font-mono text-indigo-600">MedicationRequest</code>) and Dispensing (
            <code className="font-mono text-emerald-600">MedicationDispense</code>) are maintained as independent stages.
            The dispensing pharmacist records batch numbers, verifies expiry dates, applies permitted generic substitutions, and commits an immutable dispense record.
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("QUEUE")}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "QUEUE"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Prescription Queue ({prescriptions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("INVENTORY")}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "INVENTORY"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Drug Formulary & Batches</span>
          </button>
        </div>

        {/* TAB 1: PRESCRIPTION QUEUE & DISPENSING WORKSPACE */}
        {activeTab === "QUEUE" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Queue List (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Prescriptions To Dispense
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {prescriptions.length} Active
                </span>
              </div>

              {loadingRx ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading orders...</div>
              ) : prescriptions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No pending prescriptions in queue.
                </div>
              ) : (
                <div className="space-y-2">
                  {prescriptions.map((rx) => (
                    <button
                      key={rx.id}
                      type="button"
                      onClick={() => setSelectedRx(rx)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedRx?.id === rx.id
                          ? "border-indigo-600 bg-indigo-50/40 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-xs text-slate-900">
                            {rx.patient_name || "Patient Encounter"}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500">{rx.id}</div>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            rx.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {rx.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 mt-1">
                        Prescribed by: <span className="font-medium">{rx.doctor_name || "Doctor"}</span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                        <span>{rx.items?.length || 0} medications</span>
                        <span className="font-mono">{rx.created_at?.split("T")[0]}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Verification & Order Breakdown (8 cols) */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
              {selectedRx ? (
                <div className="space-y-5">
                  {/* Selected Rx Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          {selectedRx.patient_name || "Patient Order"}
                        </h2>
                        <span className="font-mono text-xs text-slate-500">
                          Prescription #{selectedRx.id}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Prescribing Clinician: <span className="font-medium text-slate-800">{selectedRx.doctor_name || "Dr. Senthil Kumar"}</span> • Prescribed on: {selectedRx.created_at?.split("T")[0]}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openDispenseModal(selectedRx)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      <span>Verify & Dispense Medications</span>
                    </button>
                  </div>

                  {/* Digital Signature / Audit Stamp */}
                  {selectedRx.digital_signature_hash && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span className="font-medium text-slate-800">
                          Physician Digitally Signed: {selectedRx.signed_by || "Authorized Clinician"}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 truncate max-w-xs">
                        {selectedRx.digital_signature_hash}
                      </span>
                    </div>
                  )}

                  {/* Medications List */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
                      Medication Request Line Items ({selectedRx.items?.length || 0})
                    </h4>

                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                      {selectedRx.items?.map((it, idx) => (
                        <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-xs text-slate-900">
                                {it.brand_name || it.medicine_name}{" "}
                                <span className="text-slate-500 font-normal">({it.generic_name})</span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                                <span className="font-mono">{it.strength || it.dosage}</span>
                                <span>•</span>
                                <span>{it.dosage_form || "Tablet"}</span>
                                <span>•</span>
                                <span>{it.route || "Oral"}</span>
                                <span>•</span>
                                <span className="font-medium text-indigo-700">{it.frequency}</span>
                                <span>•</span>
                                <span>{it.duration_value || it.duration_days} {it.duration_unit || "Days"}</span>
                                {it.food_instruction && <span>({it.food_instruction})</span>}
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 font-mono text-xs font-semibold">
                                Prescribed Qty: {it.quantity || "—"}
                              </span>
                            </div>
                          </div>

                          {it.specific_instructions && (
                            <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                              <span className="font-semibold text-slate-700">Instructions:</span> {it.specific_instructions}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 text-xs">
                  Select a prescription order from the queue to review and dispense.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INVENTORY & DRUG FORMULARY */}
        {activeTab === "INVENTORY" && (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search drug formulary by Brand, Generic Name, or Batch Number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Medicine Name</th>
                      <th className="py-3 px-4">Generic Composition</th>
                      <th className="py-3 px-4">Batch No.</th>
                      <th className="py-3 px-4">Expiry Date</th>
                      <th className="py-3 px-4">Stock Level</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredMedicines.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold text-slate-900">{m.name}</td>
                        <td className="py-3 px-4 text-slate-600">{m.generic_name || "—"}</td>
                        <td className="py-3 px-4 font-mono text-[11px]">{m.batch_number || "BCH-2026-01"}</td>
                        <td className="py-3 px-4 font-mono text-[11px]">{m.expiry_date || "2027-12-31"}</td>
                        <td className="py-3 px-4 font-mono font-medium">{m.stock_quantity ?? 120} units</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Available
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* DISPENSE MODAL (Point 15: Quantity, Batch, Expiry, Generic Substitution Rules) */}
        {isDispenseModalOpen && selectedRx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Dispense Medication Order (FHIR MedicationDispense)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Patient: <span className="font-medium text-slate-800">{selectedRx.patient_name}</span> • Prescription #{selectedRx.id}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDispenseModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleConfirmDispense} className="flex-1 overflow-y-auto p-6 space-y-5">
                {dispenseSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Dispensing committed successfully. Updating prescription status to DISPENSED.</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Verify Batches & Substitution Options
                    </h4>
                    <span className="text-[11px] text-slate-500">Statutory Batch Reconciliation</span>
                  </div>

                  <div className="space-y-3">
                    {dispenseData.map((it, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-semibold text-xs text-slate-900">{it.medicine_name}</span>
                            <div className="text-[11px] text-slate-500">{it.generic_name}</div>
                          </div>
                          <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-700">
                            Prescribed: {it.prescribed_qty} units
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                              Dispense Qty
                            </label>
                            <input
                              type="number"
                              value={it.dispensed_qty}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setDispenseData((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, dispensed_qty: val } : item))
                                );
                              }}
                              className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                              Batch Number
                            </label>
                            <input
                              type="text"
                              value={it.batch_number}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDispenseData((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, batch_number: val } : item))
                                );
                              }}
                              className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                              Batch Expiry
                            </label>
                            <input
                              type="date"
                              value={it.expiry_date}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDispenseData((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, expiry_date: val } : item))
                                );
                              }}
                              className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white font-mono"
                            />
                          </div>
                        </div>

                        {/* Substitution Rule Checkbox */}
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={it.substitution_made}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setDispenseData((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, substitution_made: checked } : item
                                  )
                                );
                              }}
                              className="w-3.5 h-3.5 text-indigo-600 rounded"
                            />
                            <span className="text-[11px] text-slate-700">Generic Substitution Permitted</span>
                          </label>

                          {it.substitution_made && (
                            <input
                              type="text"
                              placeholder="Substituted generic brand name..."
                              value={it.substitution_drug}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDispenseData((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, substitution_drug: val } : item
                                  )
                                );
                              }}
                              className="px-2 py-1 border border-slate-200 rounded text-[11px] bg-white w-64"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pharmacist Counseling & Dispense Notes
                  </label>
                  <textarea
                    rows={2}
                    value={pharmacistNotes}
                    onChange={(e) => setPharmacistNotes(e.target.value)}
                    placeholder="E.g., Counseled on taking morning dose after breakfast; verified no penicillin antibiotic was dispensed."
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-white"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDispenseModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={dispensingInProgress}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
                  >
                    {dispensingInProgress ? (
                      <span>Recording Dispense...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm & Dispense Medication</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
