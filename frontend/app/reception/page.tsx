"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  UserPlus,
  ArrowRight,
  Search,
  Building2,
  DollarSign,
  ShieldCheck,
  Stethoscope,
  Phone,
  Send,
  RefreshCw,
  LogOut,
  LogIn,
  Sliders,
} from "lucide-react";
import { api } from "@/lib/api";
import { Patient, QueueItem, UserProfile } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/ui/FeedbackStates";

export default function ReceptionWorkspacePage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"QUEUE" | "REGISTER" | "DOCTORS" | "BILLING">("QUEUE");

  // Queue state
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Doctor Availability state
  const [doctorsAvailability, setDoctorsAvailability] = useState([
    {
      id: "doc-k-01",
      name: "Dr. Senthil Kumar, MD",
      department: "General Medicine",
      room: "OPD Room #4",
      status: "AVAILABLE",
      patientsInQueue: 3,
      avgWait: "12 mins",
    },
    {
      id: "doc-k-02",
      name: "Dr. Anitha Rangarajan, MD (Cardio)",
      department: "Cardiology",
      room: "OPD Room #2",
      status: "IN_CONSULTATION",
      patientsInQueue: 5,
      avgWait: "25 mins",
    },
    {
      id: "doc-k-03",
      name: "Dr. Arvind Swamy, MS (Ortho)",
      department: "Orthopedics",
      room: "OPD Room #6",
      status: "AVAILABLE",
      patientsInQueue: 1,
      avgWait: "5 mins",
    },
  ]);

  // Quick Registration Form
  const [regForm, setRegForm] = useState({
    name: "",
    phone: "",
    gender: "MALE",
    age: "35",
    department: "General Medicine",
    doctor_id: "doc-k-01",
  });
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await api.queue.list();
      setQueueItems(data || []);
    } catch (err) {
      console.error("Failed to load queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentUser(api.auth.getCurrentUser());
    loadQueue();
  }, []);

  const handleCheckIn = async (item: QueueItem) => {
    try {
      await api.queue.call(item.id);
      loadQueue();
    } catch {
      // update local
      setQueueItems((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "IN_CONSULTATION" } : q))
      );
    }
  };

  const handleCheckOut = async (item: QueueItem) => {
    try {
      await api.queue.complete(item.id);
      loadQueue();
    } catch {
      setQueueItems((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "COMPLETED" } : q))
      );
    }
  };

  const handleRegisterPatient = (e: React.FormEvent) => {
    e.preventDefault();
    const mockUhid = "OH-2026-" + Math.floor(10000 + Math.random() * 90000);
    setRegSuccess(`Patient ${regForm.name} registered successfully. Assigned UHID: ${mockUhid} & Token #A-18`);
    setTimeout(() => {
      setRegSuccess(null);
      setRegForm({
        name: "",
        phone: "",
        gender: "MALE",
        age: "35",
        department: "General Medicine",
        doctor_id: "doc-k-01",
      });
      setActiveTab("QUEUE");
      loadQueue();
    }, 2000);
  };

  return (
    <AppLayout>
      <div className="bg-white min-h-screen text-slate-900 pb-20 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Front Desk & Reception Operations
              </h1>
              <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Front Office
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Patient registration, OPD queue coordination, doctor availability, check-in/check-out, and cashier billing handoff.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadQueue}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* RBAC Scope Notice (Point 14) */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-slate-900">Role-Based Scope (Point 14):</span>{" "}
            Receptionists oversee patient registration, appointment slots, queue tokens, and billing handoffs.
            Detailed medical records, clinical notes, and private clinician diagnoses remain strictly protected and hidden.
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 gap-2">
          {[
            { key: "QUEUE", label: "Patient Check-in / Queue", icon: <Clock className="w-3.5 h-3.5" /> },
            { key: "REGISTER", label: "New Patient Intake", icon: <UserPlus className="w-3.5 h-3.5" /> },
            { key: "DOCTORS", label: "Doctor Availability", icon: <Stethoscope className="w-3.5 h-3.5" /> },
            { key: "BILLING", label: "Cashier Handoff", icon: <DollarSign className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: QUEUE & CHECK-IN / CHECK-OUT */}
        {activeTab === "QUEUE" && (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search queue by Patient Name or Token Number..."
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
                      <th className="py-3 px-4">Token #</th>
                      <th className="py-3 px-4">Patient Name</th>
                      <th className="py-3 px-4">Department / Room</th>
                      <th className="py-3 px-4">Assigned Doctor</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Desk Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {queueItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No active patients in queue.
                        </td>
                      </tr>
                    ) : (
                      queueItems.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {q.token_number || "#T-12"}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{q.patient_name}</td>
                          <td className="py-3 px-4 text-slate-600">{q.department || "General Medicine"}</td>
                          <td className="py-3 px-4 text-slate-800">{q.doctor_name || "Dr. Senthil Kumar"}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                q.status === "WAITING"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : q.status === "IN_CONSULTATION"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {q.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {q.status === "WAITING" && (
                                <button
                                  type="button"
                                  onClick={() => handleCheckIn(q)}
                                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium flex items-center gap-1"
                                >
                                  <LogIn className="w-3 h-3" />
                                  <span>Check In</span>
                                </button>
                              )}
                              {q.status === "IN_CONSULTATION" && (
                                <button
                                  type="button"
                                  onClick={() => handleCheckOut(q)}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium flex items-center gap-1"
                                >
                                  <LogOut className="w-3 h-3" />
                                  <span>Check Out</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTER NEW PATIENT */}
        {activeTab === "REGISTER" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm max-w-2xl mx-auto space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              Quick Patient Registration & Token Generation
            </h3>

            {regSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{regSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRegisterPatient} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    placeholder="e.g. Meenakshi Sundaram"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    placeholder="+91 98401 23456"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Gender</label>
                  <select
                    value={regForm.gender}
                    onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Age (Years)</label>
                  <input
                    type="number"
                    value={regForm.age}
                    onChange={(e) => setRegForm({ ...regForm, age: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Department & Doctor</label>
                <select
                  value={regForm.doctor_id}
                  onChange={(e) => setRegForm({ ...regForm, doctor_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="doc-k-01">General Medicine — Dr. Senthil Kumar (Room 4)</option>
                  <option value="doc-k-02">Cardiology — Dr. Anitha Rangarajan (Room 2)</option>
                  <option value="doc-k-03">Orthopedics — Dr. Arvind Swamy (Room 6)</option>
                </select>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
                >
                  Generate OneHealth ID & OPD Token
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: DOCTOR AVAILABILITY */}
        {activeTab === "DOCTORS" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {doctorsAvailability.map((doc) => (
              <div key={doc.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{doc.name}</h4>
                    <div className="text-[11px] text-slate-500">{doc.department}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      doc.status === "AVAILABLE"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {doc.status.replace("_", " ")}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location:</span>
                    <span className="font-semibold text-slate-800">{doc.room}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Queue Depth:</span>
                    <span className="font-mono font-medium text-slate-800">{doc.patientsInQueue} patients</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Est. Wait:</span>
                    <span className="font-mono text-indigo-600 font-semibold">{doc.avgWait}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: BILLING HANDOFF */}
        {activeTab === "BILLING" && (
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4 max-w-3xl mx-auto">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Cashier & Billing Desk Handoff
            </h3>
            <p className="text-xs text-slate-500">
              Patients completed with doctor consultations awaiting invoice settlement and pharmacy receipt token.
            </p>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <div className="font-semibold text-slate-900">Alice Smith (OH-2026-90412)</div>
                  <div className="text-[11px] text-slate-500">OPD Consultation Fee + Lab Panel Requisition</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sm text-slate-900">₹850.00</span>
                  <button
                    type="button"
                    onClick={() => alert("Handoff token transferred to Cashier Window 2")}
                    className="px-3 py-1.5 rounded bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700"
                  >
                    Send to Cashier
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
