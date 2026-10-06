"use client";

import React, { useState, useEffect } from "react";
import {
  X, Calendar, Clock, AlertCircle, CheckCircle2, ChevronRight,
  RefreshCw, Stethoscope, Hospital, User, ArrowRight
} from "lucide-react";
import { api, PatientAppointment } from "@/lib/api";
import { discoveryApi, SlotItem } from "@/lib/api/discovery";

interface RescheduleModalProps {
  appointment: PatientAppointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RescheduleAppointmentModal({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);
  const [reason, setReason] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);

  // Generate next 14 available dates
  const nextDates = React.useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const monthName = d.toLocaleDateString("en-US", { month: "short" });
      const dayNum = d.getDate();
      dates.push({ iso, dayName, monthName, dayNum });
    }
    return dates;
  }, []);

  useEffect(() => {
    if (isOpen && nextDates.length > 0) {
      setSelectedDate(nextDates[0].iso);
      setSelectedSlot(null);
      setError(null);
      setSuccessData(null);
      setReason("");
    }
  }, [isOpen, nextDates]);

  useEffect(() => {
    if (!isOpen || !appointment || !selectedDate) return;
    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        setError(null);
        const res = await discoveryApi.getSlots(appointment.doctor_id, selectedDate);
        if (res?.data) {
          setSlots(res.data || []);
        } else {
          setSlots([]);
        }
      } catch (err: any) {
        console.error("Failed to fetch slots for doctor", err);
        setError(err?.message || "Failed to load doctor slots for the selected date.");
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [isOpen, appointment, selectedDate]);

  if (!isOpen || !appointment) return null;

  const handleReschedule = async () => {
    if (!selectedSlot) {
      setError("Please select a new time slot.");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const res = await api.patient.rescheduleAppointment(appointment.id, {
        new_date: selectedDate,
        new_time: selectedSlot.slot_value || selectedSlot.time,
        new_slot: selectedSlot.time,
        reason: reason.trim() || "Rescheduled by patient",
      });
      if (res?.success) {
        setSuccessData(res.data);
        onSuccess();
      } else {
        throw new Error(res?.message || "Failed to reschedule appointment.");
      }
    } catch (err: any) {
      console.error("Reschedule error", err);
      setError(err?.message || "Failed to reschedule. Please try a different slot.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Reschedule Appointment</h3>
              <p className="text-xs text-blue-200/80">Select a new date and available time slot</p>
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
          {successData ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-900">Appointment Rescheduled!</h4>
                <p className="text-xs text-slate-500">
                  Your appointment slot has been successfully updated on the doctor's calendar.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Original Slot:</span>
                  <span className="font-mono text-slate-700 line-through">{appointment.slot}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>New Schedule:</span>
                  <span className="font-mono">{successData.appointment_date} · {successData.start_time}</span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                  <span>Doctor:</span>
                  <span className="font-semibold text-slate-800">Dr. {appointment.doctor_name}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Current Appointment Summary */}
              <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    Dr. {appointment.doctor_name}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-semibold">
                    {appointment.doctor_specialty}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Hospital className="w-3.5 h-3.5 text-slate-400" />
                  <span>{appointment.hospital_name}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Current: <strong className="text-slate-800">{appointment.slot}</strong></span>
                </div>
              </div>

              {/* Step 1: Select Date */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>1. Select New Date</span>
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {nextDates.map((d) => {
                    const isSelected = selectedDate === d.iso;
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => {
                          setSelectedDate(d.iso);
                          setSelectedSlot(null);
                        }}
                        className={`px-3 py-2.5 rounded-2xl border text-center shrink-0 transition ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/30"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="text-[10px] font-semibold uppercase">{d.dayName}</div>
                        <div className="text-sm font-extrabold">{d.dayNum}</div>
                        <div className="text-[9px] opacity-80">{d.monthName}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Select Slot */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>2. Select New Time Slot</span>
                </label>

                {loadingSlots ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : slots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {slots.map((slot) => {
                      const isSelected = selectedSlot?.slot_value === slot.slot_value;
                      return (
                        <button
                          key={slot.slot_value}
                          type="button"
                          disabled={!slot.is_available}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-2.5 rounded-xl border text-center transition ${
                            !slot.is_available
                              ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed line-through"
                              : isSelected
                              ? "bg-blue-600 text-white border-blue-600 font-bold shadow-sm"
                              : "bg-white border-slate-200 text-slate-800 hover:border-blue-300 font-semibold text-xs"
                          }`}
                        >
                          <span className="text-xs">{slot.time}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800">
                    No available time slots on this date. Please select another day.
                  </div>
                )}
              </div>

              {/* Step 3: Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Reason for Rescheduling <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Schedule conflict, traveling, work emergency..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Reschedule Comparison Pill */}
              {selectedSlot && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="text-slate-500 line-through font-mono">{appointment.slot}</div>
                  <ArrowRight className="w-4 h-4 text-emerald-600" />
                  <div className="font-bold text-emerald-800 font-mono">
                    {selectedDate} · {selectedSlot.time}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedSlot || submitting}
                  onClick={handleReschedule}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Reschedule</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
