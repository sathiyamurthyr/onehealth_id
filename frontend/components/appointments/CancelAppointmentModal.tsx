"use client";

import React, { useState } from "react";
import {
  X, AlertTriangle, CheckCircle2, RefreshCw, Calendar,
  Clock, Hospital, Stethoscope, User, AlertCircle
} from "lucide-react";
import { api, PatientAppointment } from "@/lib/api";

interface CancelModalProps {
  appointment: PatientAppointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_REASONS = [
  "Feeling better / Symptoms resolved",
  "Scheduling conflict / Busy at work",
  "Doctor requested change / Doctor unavailable",
  "Visiting a different healthcare facility",
  "Transportation / Travel issue",
  "Financial / Insurance reasons",
  "Other personal reasons",
];

export function CancelAppointmentModal({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}: CancelModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_REASONS[0]);
  const [customNotes, setCustomNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);

  if (!isOpen || !appointment) return null;

  const handleCancel = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const fullReason = customNotes.trim()
        ? `${selectedReason}: ${customNotes.trim()}`
        : selectedReason;

      const res = await api.patient.cancelAppointment(appointment.id, { reason: fullReason });
      if (res?.success) {
        setIsCancelled(true);
        onSuccess();
      } else {
        throw new Error(res?.message || "Failed to cancel appointment.");
      }
    } catch (err: any) {
      console.error("Cancel error", err);
      setError(err?.message || "Failed to cancel appointment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-rose-900 via-red-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Cancel Appointment</h3>
              <p className="text-xs text-rose-200/80">Please let the doctor know why you are cancelling</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {isCancelled ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-900">Appointment Cancelled</h4>
                <p className="text-xs text-slate-500">
                  Your appointment slot has been released. The clinic has been notified.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Appointment Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    Dr. {appointment.doctor_name}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-mono font-semibold">
                    {appointment.doctor_specialty}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Hospital className="w-3.5 h-3.5 text-slate-400" />
                  <span>{appointment.hospital_name}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-800">{appointment.slot}</span>
                </div>
              </div>

              {/* Cancellation Reason Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Reason for Cancellation <span className="text-rose-600">*</span>
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {COMMON_REASONS.map((r, i) => (
                    <option key={i} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Custom Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Additional Notes <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Provide any additional context for the hospital staff..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Policy Alert */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
                <p className="font-semibold">Cancellation Policy:</p>
                <p className="text-amber-700">
                  Cancellations are free of charge. You can re-book an appointment anytime through the OH-ID discovery portal.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition"
                >
                  Keep Appointment
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleCancel}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Cancel Appointment</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
