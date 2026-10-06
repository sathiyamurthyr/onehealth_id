"use client";

import React from "react";
import { X, ShieldCheck, Clock, FileText, AlertTriangle, Info } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function PrescriptionValidityExplainerModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2 text-indigo-700">
            <Info className="w-5 h-5" />
            <h3 className="font-bold text-slate-900 text-base">About Prescription Validity in OH-ID</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-sm text-slate-600 max-h-[75vh] overflow-y-auto">
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100/80 text-indigo-900">
            <p className="font-semibold text-xs uppercase tracking-wider text-indigo-700 mb-1">
              Authoritative Clinical Record
            </p>
            <p className="text-xs leading-relaxed text-indigo-950">
              Prescription validity in OneHealth ID is based directly on the clinical validity period and instructions recorded by your healthcare provider and governing medical regulations.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-xs">Active / Currently Valid</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Prescription is within its approved validity window and can be presented for medication dispensing or refills.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-xs">Expired — Retained for History</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  An expired prescription is retained permanently in your medical history for clinical continuity, but displays an official non-valid watermark. It should not be presented for new dispensing without doctor re-evaluation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-xs">Superseded / Replaced</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  When a doctor amends dosage or changes your medication regimen, the previous version is marked Superseded and provides a direct reference link to the latest prescription.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 shrink-0 mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-xs">Cryptographic Verification</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Every finalized prescription contains a digital signature hash and secure QR code. Pharmacists and clinicians can verify authenticity in real-time without exposing your private medical notes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end px-6 py-3 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-sm"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
