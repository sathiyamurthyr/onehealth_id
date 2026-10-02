"use client";

import React, { useState } from "react";
import {
  FileText,
  Copy,
  Clock,
  User,
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Filter,
  Pill,
  ShieldAlert
} from "lucide-react";
import { Prescription, PrescriptionItem } from "@/lib/types";

interface PreviousPrescriptionsProps {
  prescriptions: Prescription[];
  onCopyPrescription: (items: PrescriptionItem[], instructions?: string) => void;
}

export function PreviousPrescriptions({
  prescriptions,
  onCopyPrescription,
}: PreviousPrescriptionsProps) {
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [confirmModalRx, setConfirmModalRx] = useState<Prescription | null>(null);
  const [filterQuery, setFilterQuery] = useState("");

  const handleCopyConfirm = () => {
    if (confirmModalRx) {
      onCopyPrescription(confirmModalRx.items, confirmModalRx.instructions);
      setConfirmModalRx(null);
    }
  };

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    const doctorMatch = rx.doctor_name?.toLowerCase().includes(q);
    const diagMatch = rx.diagnosis?.toLowerCase().includes(q);
    const medMatch = rx.items?.some((it) => it.medicine_name.toLowerCase().includes(q));
    return doctorMatch || diagMatch || medMatch;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="bg-slate-50/70 border-b border-slate-200/80 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" />
            <span>Previous Prescriptions & Re-Prescribe Protocol</span>
          </h3>
          <p className="text-[11px] text-slate-500">
            Copying previous orders requires explicit doctor validation to prevent accidental duplications.
          </p>
        </div>

        {/* Filter search */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter by doctor, drug or diagnosis..."
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="p-6">
        {filteredPrescriptions.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
            No previous prescription records found for this patient.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPrescriptions.map((rx) => (
              <div
                key={rx.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 bg-white transition-all space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs">
                      Rx
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {rx.created_at ? new Date(rx.created_at).toLocaleDateString() : "Historical"}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">• {rx.id}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {rx.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Prescriber: <span className="font-semibold text-slate-800">{rx.doctor_name || "Consultant"}</span> • {rx.diagnosis || "OPD Review"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmModalRx(rx)}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Prescription</span>
                    </button>
                  </div>
                </div>

                {/* Medication Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {rx.items?.map((it, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-0.5"
                    >
                      <span className="font-bold text-slate-900">{it.medicine_name}</span>
                      <span className="text-[11px] text-slate-500 block">
                        {it.dose || "1 tab"} • {it.frequency} • {it.duration_value} {it.duration_unit || "Days"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal to prevent silent re-prescribing */}
      {confirmModalRx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-purple-700">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Prescription Copy & Re-Order
                </h3>
                <p className="text-xs text-slate-500">
                  Doctor confirmation required before importing past medications into active draft.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold block">Patient Safety Warning:</span>
              <p>
                Importing {confirmModalRx.items?.length || 0} medications from{" "}
                <span className="font-semibold">{confirmModalRx.doctor_name}</span> ({confirmModalRx.created_at ? new Date(confirmModalRx.created_at).toLocaleDateString() : "past encounter"}).
                Please review all dosages, verify kidney/liver status, and sign to activate.
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 p-2 text-xs">
              {confirmModalRx.items?.map((it, i) => (
                <div key={i} className="py-2 flex items-center justify-between">
                  <span className="font-bold text-slate-800">{it.medicine_name}</span>
                  <span className="text-slate-500">{it.dose} • {it.frequency}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalRx(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCopyConfirm}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Load into Current Order</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
