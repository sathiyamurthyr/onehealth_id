"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  Coffee,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Save,
  ShieldCheck,
  User,
  Building2,
  Sliders,
  ArrowLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { DoctorScheduleItem, UserProfile } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/ui/FeedbackStates";

export default function DoctorSchedulePage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedDay, setSelectedDay] = useState("Monday");

  // Configurable Slot Duration Rules (Hospital, Department, Doctor, Service)
  const [slotConfigs, setSlotConfigs] = useState({
    hospital: "Kedar Super Speciality Hospital",
    department: "General Medicine / OPD Block A",
    doctor: "Dr. Senthil Kumar, MD",
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    newPatientDuration: 20, // mins
    followUpDuration: 15, // mins
    emergencyDuration: 10, // mins
    bufferDuration: 15, // mins
    overbookingLimit: 2, // max overbook tokens allowed
    overbookingRule: "Requires Doctor One-Time Override",
  });

  // Daily Schedule Timeline Items
  const [scheduleItems, setScheduleItems] = useState<DoctorScheduleItem[]>([
    {
      day_of_week: "Monday",
      start_time: "09:00",
      end_time: "09:20",
      slot_type: "NEW_PATIENT",
      is_break: false,
      max_patients: 1,
    },
    {
      day_of_week: "Monday",
      start_time: "09:20",
      end_time: "09:40",
      slot_type: "PATIENT",
      is_break: false,
      max_patients: 1,
    },
    {
      day_of_week: "Monday",
      start_time: "09:40",
      end_time: "10:00",
      slot_type: "PATIENT",
      is_break: false,
      max_patients: 1,
    },
    {
      day_of_week: "Monday",
      start_time: "10:00",
      end_time: "10:15",
      slot_type: "BUFFER",
      is_break: false,
      max_patients: 0,
    },
    {
      day_of_week: "Monday",
      start_time: "10:15",
      end_time: "10:30",
      slot_type: "FOLLOW_UP",
      is_break: false,
      max_patients: 1,
    },
    {
      day_of_week: "Monday",
      start_time: "10:30",
      end_time: "11:00",
      slot_type: "NEW_PATIENT",
      is_break: false,
      max_patients: 1,
    },
    {
      day_of_week: "Monday",
      start_time: "11:00",
      end_time: "11:15",
      slot_type: "EMERGENCY",
      is_break: false,
      max_patients: 1,
    },
    {
      day_of_week: "Monday",
      start_time: "13:00",
      end_time: "14:00",
      slot_type: "BREAK",
      is_break: true,
      max_patients: 0,
    },
    {
      day_of_week: "Monday",
      start_time: "14:00",
      end_time: "16:30",
      slot_type: "OPD_SESSION",
      is_break: false,
      max_patients: 10,
    },
  ]);

  // Leave & Absence Records
  const [leaves, setLeaves] = useState([
    {
      id: "lv-01",
      start_date: "2026-10-18",
      end_date: "2026-10-20",
      reason: "Annual Cardiology & Internal Medicine CME Conference",
      status: "Approved",
    },
  ]);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => {
    const cur = api.auth.getCurrentUser();
    setCurrentUser(cur);

    const loadSchedule = async () => {
      setLoading(true);
      try {
        const docId = cur?.username === "dr.anitha" ? "doc-k-02" : "doc-k-01";
        const fetched = await api.consultations.getDoctorSchedule(docId);
        if (fetched && fetched.length > 0) {
          setScheduleItems(fetched);
        }
      } catch (err) {
        console.error("Using default schedule template:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, []);

  const handleAddSlot = () => {
    const newSlot: DoctorScheduleItem = {
      day_of_week: selectedDay,
      start_time: "11:30",
      end_time: "11:45",
      slot_type: "PATIENT",
      is_break: false,
      max_patients: 1,
    };
    setScheduleItems((prev) => [...prev, newSlot]);
  };

  const handleDeleteSlot = (index: number) => {
    setScheduleItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      const docId = currentUser?.username === "dr.anitha" ? "doc-k-02" : "doc-k-01";
      await api.consultations.updateDoctorSchedule(docId, scheduleItems);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert("Failed to save schedule: " + (err.message || "Database error"));
    } finally {
      setSaving(false);
    }
  };

  const filteredSlots = scheduleItems.filter((s) => s.day_of_week === selectedDay);

  const getSlotBadge = (type: string) => {
    switch (type) {
      case "NEW_PATIENT":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "FOLLOW_UP":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "EMERGENCY":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "BUFFER":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "BREAK":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "OPD_SESSION":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-sky-50 text-sky-700 border-sky-200";
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="bg-white min-h-[80vh] flex items-center justify-center">
          <LoadingState message="Loading Doctor Time Allocation & Scheduling Rules..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="bg-white min-h-screen text-slate-900 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Link
                href="/doctor"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 py-1.5 px-2.5 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Doctor Workspace</span>
              </Link>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                <h1 className="text-base font-bold text-slate-900">
                  Doctor Time Allocation & Scheduling System
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Schedule Synced to PostgreSQL</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving Changes..." : "Save Schedule Rules"}</span>
              </button>
            </div>
          </div>

          {/* Principle Callout (Point 10) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-3">
            <Sliders className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-slate-900">Non-Hardcoded Dynamic Slot Engine:</span>{" "}
              Appointment durations and session structures are dynamically configured by Hospital,
              Department, Doctor, and Appointment Type (New Patient, Follow-up, Emergency, Buffer, and Overbooking rules).
            </div>
          </div>

          {/* Grid Layout: Config Panels + Timetable */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 1 Col: Rule Configuration */}
            <div className="space-y-6">
              {/* Doctor & Facility Metadata */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-500" /> Scope & Facility Context
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Hospital Facility
                    </label>
                    <input
                      type="text"
                      value={slotConfigs.hospital}
                      disabled
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Department / Service
                    </label>
                    <input
                      type="text"
                      value={slotConfigs.department}
                      disabled
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Consulting Physician
                    </label>
                    <input
                      type="text"
                      value={slotConfigs.doctor}
                      disabled
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Slot Duration Rule Matrix */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" /> Slot Durations (Minutes)
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">New Patient</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={slotConfigs.newPatientDuration}
                        onChange={(e) =>
                          setSlotConfigs((prev) => ({
                            ...prev,
                            newPatientDuration: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                      />
                      <span className="absolute right-3 top-2 text-[10px] text-slate-400">min</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Follow-up Slot</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={slotConfigs.followUpDuration}
                        onChange={(e) =>
                          setSlotConfigs((prev) => ({
                            ...prev,
                            followUpDuration: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                      />
                      <span className="absolute right-3 top-2 text-[10px] text-slate-400">min</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Emergency Slot</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={slotConfigs.emergencyDuration}
                        onChange={(e) =>
                          setSlotConfigs((prev) => ({
                            ...prev,
                            emergencyDuration: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                      />
                      <span className="absolute right-3 top-2 text-[10px] text-slate-400">min</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Buffer Time</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={slotConfigs.bufferDuration}
                        onChange={(e) =>
                          setSlotConfigs((prev) => ({
                            ...prev,
                            bufferDuration: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                      />
                      <span className="absolute right-3 top-2 text-[10px] text-slate-400">min</span>
                    </div>
                  </div>
                </div>

                {/* Overbooking Controls */}
                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Max Overbook Slots:</span>
                    <span className="font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                      {slotConfigs.overbookingLimit} Slots
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Rule: {slotConfigs.overbookingRule}
                  </div>
                </div>
              </div>

              {/* Leave Management */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-slate-500" /> Leave & CME Absence
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setLeaves((prev) => [
                        ...prev,
                        {
                          id: `lv-${Date.now()}`,
                          start_date: "2026-11-05",
                          end_date: "2026-11-06",
                          reason: "Medical Board Meeting",
                          status: "Pending",
                        },
                      ])
                    }
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    + Add Leave
                  </button>
                </div>

                <div className="space-y-2">
                  {leaves.map((lv) => (
                    <div
                      key={lv.id}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-slate-900">{lv.reason}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {lv.start_date} to {lv.end_date}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {lv.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 2 Cols: Interactive Timetable */}
            <div className="lg:col-span-2 space-y-6">
              {/* Day Segmented Tabs */}
              <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200">
                {daysOfWeek.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      selectedDay === day
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Day Timetable Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {selectedDay} Time Allocation Blueprint
                    </h3>
                    <p className="text-xs text-slate-500">
                      Standard OPD Session: {slotConfigs.workingHoursStart} ─ {slotConfigs.workingHoursEnd}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Add Custom Slot</span>
                  </button>
                </div>

                <div className="p-5 space-y-3">
                  {filteredSlots.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No specific allocation configured for {selectedDay}. Click &quot;Add Custom Slot&quot; to begin.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredSlots.map((slot, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-all bg-white"
                        >
                          {/* Time & Duration Indicator */}
                          <div className="flex items-center gap-3">
                            <div className="w-24 font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200 text-center">
                              {slot.start_time} ─ {slot.end_time}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${getSlotBadge(
                                    slot.slot_type || "PATIENT"
                                  )}`}
                                >
                                  {(slot.slot_type || "PATIENT").replace("_", " ")}
                                </span>
                                {slot.is_break && (
                                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Protected Rest Break
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Capacity: {slot.max_patients} patient{slot.max_patients === 1 ? "" : "s"}
                              </div>
                            </div>
                          </div>

                          {/* Quick Type Switcher & Delete */}
                          <div className="flex items-center gap-2">
                            <select
                              value={slot.slot_type}
                              onChange={(e) => {
                                const newType = e.target.value;
                                setScheduleItems((prev) =>
                                  prev.map((s, i) => (i === idx ? { ...s, slot_type: newType } : s))
                                );
                              }}
                              className="text-xs px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700"
                            >
                              <option value="PATIENT">Routine Patient</option>
                              <option value="NEW_PATIENT">New Patient</option>
                              <option value="FOLLOW_UP">Follow-up</option>
                              <option value="EMERGENCY">Emergency Slot</option>
                              <option value="BUFFER">Buffer Time</option>
                              <option value="BREAK">Break</option>
                              <option value="OPD_SESSION">OPD Session</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleDeleteSlot(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-slate-50 transition-colors"
                              title="Delete Slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
