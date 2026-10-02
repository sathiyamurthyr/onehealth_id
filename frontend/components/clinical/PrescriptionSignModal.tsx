"use client";

import React, { useState } from "react";
import {
  FileCheck2,
  ShieldCheck,
  Lock,
  AlertCircle,
  X,
  FileSignature,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Building2,
  Hash,
  ArrowRight,
} from "lucide-react";
import { PrescriptionItem } from "@/lib/types";

interface PrescriptionSignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSign: (signatureData: {
    doctorPin: string;
    signatureNote: string;
    generatedHash: string;
  }) => Promise<void>;
  patient: {
    name: string;
    uhid: string;
    age_gender: string;
  };
  doctor: {
    name: string;
    id: string;
    reg_no?: string;
    department?: string;
    hospital_name?: string;
  };
  items: PrescriptionItem[];
  validUntil: string;
  diagnosisSummary?: string;
}

export const PrescriptionSignModal: React.FC<PrescriptionSignModalProps> = ({
  isOpen,
  onClose,
  onConfirmSign,
  patient,
  doctor,
  items,
  validUntil,
  diagnosisSummary,
}) => {
  const [pin, setPin] = useState("");
  const [signatureNote, setSignatureNote] = useState("Clinically verified and authorized for pharmacy fulfillment.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Compute a mock SHA-256 digital signature representation based on payload
  const rawPayload = `${doctor.id}:${patient.uhid}:${items.length}:${new Date().toISOString()}`;
  const mockDigitalHash = "SHA256:0x" + Array.from(rawPayload)
    .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 0xffffffff, 7)
    .toString(16)
    .padStart(8, "0") + "e7b99c4f1a28d50c73e" + Date.now().toString(16);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || pin.length < 4) {
      setError("Please enter your 4-digit Clinical Signing PIN.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirmSign({
        doctorPin: pin,
        signatureNote,
        generatedHash: mockDigitalHash,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to digitally sign prescription. Please verify PIN.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <FileSignature className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Sign & Finalize Prescription
              </h2>
              <p className="text-xs text-slate-500">
                Prescription Lifecycle Transition: <span className="font-semibold text-amber-600">DRAFT</span> <ArrowRight className="inline w-3 h-3 text-slate-400" /> <span className="font-semibold text-emerald-600">SIGNED / ACTIVE</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Legal / Audit Notice */}
          <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold">Statutory Compliance & Audit Trail:</span> Digitally signing
              locks this prescription version in the OHID secure repository. Dispensing pharmacists and nursing
              MAR systems will recognize this order as authorized and binding.
            </div>
          </div>

          {/* Patient & Doctor Snapshot */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Patient Details
              </div>
              <div className="font-medium text-slate-900">{patient.name}</div>
              <div className="font-mono text-slate-600">{patient.uhid} • {patient.age_gender}</div>
              {diagnosisSummary && (
                <div className="text-slate-500 mt-1 line-clamp-1">
                  Dx: <span className="text-slate-700 font-medium">{diagnosisSummary}</span>
                </div>
              )}
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Prescribing Physician
              </div>
              <div className="font-medium text-slate-900">{doctor.name}</div>
              <div className="text-slate-600">
                Reg No: {doctor.reg_no || "MCI-748921"} • {doctor.department || "General Medicine"}
              </div>
              <div className="text-slate-500 font-mono mt-1">
                Valid Until: <span className="text-emerald-700 font-medium">{validUntil || "30 Days"}</span>
              </div>
            </div>
          </div>

          {/* Items Summary */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Prescribed Medications ({items.length})
              </h4>
              <span className="text-[11px] text-slate-500">FHIR MedicationRequest Payload</span>
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {items.map((it, idx) => (
                <div key={idx} className="p-2.5 text-xs flex items-center justify-between hover:bg-slate-50">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="font-medium text-slate-900 truncate">
                      {it.brand_name || it.medicine_name}{" "}
                      <span className="text-slate-500 font-normal">({it.generic_name})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono">{it.strength || it.dosage}</span>
                      <span>•</span>
                      <span>{it.route || "Oral"}</span>
                      <span>•</span>
                      <span>{it.frequency}</span>
                      <span>•</span>
                      <span>{it.duration_value || it.duration_days} {it.duration_unit || "Days"}</span>
                      {it.food_instruction && <span>({it.food_instruction})</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700 font-medium">
                      Qty: {it.quantity || "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Digital Signature Hash Preview */}
          <div className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
                <Hash className="w-3.5 h-3.5" /> Cryptographic Integrity Stamp
              </span>
              <span className="text-[10px]">ECDSA SHA-256</span>
            </div>
            <div className="break-all text-slate-300 font-mono text-[10px] select-all bg-slate-900/80 p-2 rounded border border-slate-800">
              {mockDigitalHash}
            </div>
          </div>

          {/* Doctor PIN Entry */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Physician Digital Signature PIN <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 4 or 6-digit clinical signing PIN (demo: 1234)"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono tracking-widest"
                  autoFocus
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Your PIN authorizes the generation of this immutable clinical order.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Clinical Authorization Note
              </label>
              <input
                type="text"
                value={signatureNote}
                onChange={(e) => setSignatureNote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing & Activating...</span>
                </>
              ) : (
                <>
                  <FileCheck2 className="w-4 h-4" />
                  <span>Confirm & Sign Prescription</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
