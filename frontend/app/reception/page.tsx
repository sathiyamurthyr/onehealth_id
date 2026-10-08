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
  Printer,
  X,
  QrCode,
  AlertTriangle,
  FileText,
  UserCheck,
  PlusCircle,
  Tag,
  Share2
} from "lucide-react";
import { api } from "@/lib/api";
import { Patient, QueueItem, UserProfile, Doctor, WalkInVisitResponse } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, EmptyState } from "@/components/ui/FeedbackStates";

export default function ReceptionWorkspacePage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("oh_workspace") || "{}").hospital_ref_id : "") || "";
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"QUEUE" | "SEARCH_REGISTER" | "WALK_IN" | "DOCTORS" | "BILLING">("QUEUE");

  // Queue state
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [queueSearch, setQueueSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Search-First Patient State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPatientForToken, setSelectedPatientForToken] = useState<Patient | null>(null);

  // Doctors & Departments state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Walk-in / Quick Token Form
  const [walkInForm, setWalkInForm] = useState({
    patient_id: "",
    ohid: "",
    patient_name: "",
    patient_phone: "",
    patient_age: "35",
    patient_gender: "MALE",
    department_name: "General Medicine",
    doctor_id: "",
    priority: "NORMAL",
    chief_complaint: "",
  });
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false);
  const [tokenSlip, setTokenSlip] = useState<WalkInVisitResponse["data"] | null>(null);

  // New Patient Registration Form
  const [regForm, setRegForm] = useState({
    name: "",
    phone: "",
    gender: "MALE",
    age: "35",
    email: "",
    blood_group: "O+",
    address: "",
    department_name: "General Medicine",
    doctor_id: "",
    priority: "NORMAL",
    chief_complaint: "",
  });
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Load Queue & Doctors
  const loadQueue = async () => {
    setLoadingQueue(true);
    try {
      const data = await api.queue.list();
      setQueueItems(data || []);
    } catch (err) {
      console.error("Failed to load queue:", err);
    } finally {
      setLoadingQueue(false);
    }
  };

  const loadDoctorsList = async () => {
    setLoadingDoctors(true);
    try {
      const data = await api.doctors.list();
      setDoctors(data || []);
      if (data && data.length > 0 && !walkInForm.doctor_id) {
        setWalkInForm((prev) => ({ ...prev, doctor_id: data[0].id }));
      }
    } catch (err) {
      console.error("Failed to load doctors:", err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    setCurrentUser(api.auth.getCurrentUser());
    loadQueue();
    loadDoctorsList();
    const timer = setInterval(() => loadQueue(), 12000);
    return () => clearInterval(timer);
  }, []);

  // Search-First Patient Lookup
  const handleSearchPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchingPatient(true);
    setHasSearched(true);
    try {
      const res = await api.patients.search(searchQuery.trim());
      setSearchResults(res || []);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setIsSearchingPatient(false);
    }
  };

  // Direct Walk-In Visit & Token Generation
  const handleGenerateWalkInToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingWalkIn(true);
    try {
      const payload = {
        hospital_id: activeHospitalId,
        patient_id: walkInForm.patient_id || undefined,
        ohid: walkInForm.ohid || undefined,
        department_name: walkInForm.department_name,
        doctor_id: walkInForm.doctor_id || undefined,
        priority: walkInForm.priority,
        chief_complaint: walkInForm.chief_complaint || undefined,
      };
      const res = await api.hospital.createWalkInVisit(payload);
      if (res && res.data) {
        setTokenSlip(res.data);
        await loadQueue();
      }
    } catch (err: any) {
      alert("Walk-In Token Generation Failed: " + (err.message || "Server Error"));
    } finally {
      setSubmittingWalkIn(false);
    }
  };

  // Register New Patient with Search-First fallback and instant Token Generation
  const handleRegisterAndIssueToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setRegError(null);
    try {
      // 1. Create Patient with generated OneHealth ID
      const newPatient = await api.patients.create({
        name: regForm.name,
        phone: regForm.phone,
        gender: regForm.gender,
        age: parseInt(regForm.age) || 30,
        email: regForm.email || undefined,
        blood_group: regForm.blood_group || undefined,
        address: regForm.address || undefined,
      });

      // 2. Issue Walk-In Visit Token
      const tokenRes = await api.hospital.createWalkInVisit({
        hospital_id: activeHospitalId,
        patient_id: newPatient.id,
        ohid: newPatient.onehealth_id,
        department_name: regForm.department_name,
        doctor_id: regForm.doctor_id || undefined,
        priority: regForm.priority,
        chief_complaint: regForm.chief_complaint || undefined,
      });

      if (tokenRes && tokenRes.data) {
        setTokenSlip(tokenRes.data);
        await loadQueue();
        setActiveTab("QUEUE");
      }
    } catch (err: any) {
      setRegError(err.message || "Failed to register patient and generate token.");
    } finally {
      setRegistering(false);
    }
  };

  // Queue Action Handlers
  const handleQueueAction = async (queueId: string, action: string) => {
    setActionLoading(queueId);
    try {
      await api.queue.action(queueId, action);
      await loadQueue();
    } catch (err: any) {
      alert("Queue Action Failed: " + (err.message || "Unauthorized"));
    } finally {
      setActionLoading(null);
    }
  };

  const filteredQueue = queueItems.filter((q) => {
    const qStr = (q.patient_name || "") + (q.token_number || "") + (q.onehealth_id || "") + (q.department_name || "") + (q.department || "");
    return qStr.toLowerCase().includes(queueSearch.toLowerCase());
  });

  return (
    <AppLayout>
      <div className="bg-slate-50/50 min-h-screen text-slate-900 pb-20 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Hospital Reception & Patient Flow Desk
              </h1>
              <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Phase 2 Operational Desk
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Search-first registration, rapid walk-in token generation, appointment check-in, and department queue coordination.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedPatientForToken(null);
                setActiveTab("WALK_IN");
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Direct Walk-In Token</span>
            </button>

            <button
              type="button"
              onClick={loadQueue}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
              title="Refresh live queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingQueue ? "animate-spin" : ""}`} />
              <span>Sync Queue</span>
            </button>
          </div>
        </div>

        {/* Privacy & Scope Notice */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-3 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Search-First Guardrail:</span> Always search existing OH-ID records before creating new patients to prevent duplicate digital health records. Tokens are prefixed per department (e.g., GM-001, CARD-001) for instant kiosk dispatch.
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
          {[
            { key: "QUEUE", label: `Live OPD Queue (${queueItems.length})`, icon: <Clock className="w-3.5 h-3.5" /> },
            { key: "SEARCH_REGISTER", label: "Search & Register Patient", icon: <Search className="w-3.5 h-3.5" /> },
            { key: "WALK_IN", label: "Rapid Walk-in Token", icon: <PlusCircle className="w-3.5 h-3.5" /> },
            { key: "DOCTORS", label: "Doctor On-Duty Roster", icon: <Stethoscope className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
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

        {/* TAB 1: LIVE OPD QUEUE */}
        {activeTab === "QUEUE" && (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter queue by Patient Name, Token (e.g. GM-001), or OH-ID..."
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Token #</th>
                      <th className="py-3.5 px-4">Patient & OH-ID</th>
                      <th className="py-3.5 px-4">Department</th>
                      <th className="py-3.5 px-4">Doctor / Room</th>
                      <th className="py-3.5 px-4">Priority</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Queue Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loadingQueue && queueItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin mx-auto mb-2" />
                          <span>Loading active OPD queue...</span>
                        </td>
                      </tr>
                    ) : filteredQueue.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No active patients in queue.
                        </td>
                      </tr>
                    ) : (
                      filteredQueue.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-black text-sm px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {q.token_number}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{q.patient_name}</div>
                            <div className="font-mono text-[10px] text-slate-500">{q.onehealth_id || "OH-ID Pending"}</div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-700">{q.department_name || q.department || "General Medicine"}</td>
                          <td className="py-3.5 px-4 text-slate-800">
                            <div>{q.doctor_name || "Assigned on Call"}</div>
                            <div className="text-[10px] text-slate-400">{q.room_number || "Room 101"}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                q.priority === "EMERGENCY"
                                  ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                                  : q.priority === "SENIOR_CITIZEN"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : q.priority === "PEDIATRIC"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {q.priority || "NORMAL"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                q.status === "WAITING"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : q.status === "CALLED" || q.status === "IN_CONSULTATION"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : q.status === "ON_HOLD"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {q.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {q.status === "WAITING" && (
                                <button
                                  type="button"
                                  disabled={actionLoading === q.id}
                                  onClick={() => handleQueueAction(q.id, "CALL_NEXT")}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs disabled:opacity-50"
                                >
                                  <LogIn className="w-3 h-3" />
                                  <span>Call</span>
                                </button>
                              )}
                              {q.status === "CALLED" && (
                                <button
                                  type="button"
                                  disabled={actionLoading === q.id}
                                  onClick={() => handleQueueAction(q.id, "START_CONSULT")}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs disabled:opacity-50"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  <span>In Room</span>
                                </button>
                              )}
                              {(q.status === "WAITING" || q.status === "CALLED") && (
                                <button
                                  type="button"
                                  disabled={actionLoading === q.id}
                                  onClick={() => handleQueueAction(q.id, "HOLD")}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold disabled:opacity-50"
                                >
                                  Hold
                                </button>
                              )}
                              {q.status === "ON_HOLD" && (
                                <button
                                  type="button"
                                  disabled={actionLoading === q.id}
                                  onClick={() => handleQueueAction(q.id, "RECALL")}
                                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold disabled:opacity-50"
                                >
                                  Recall
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

        {/* TAB 2: SEARCH-FIRST PATIENT REGISTRATION */}
        {activeTab === "SEARCH_REGISTER" && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Step 1: Search Existing Records */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Search Existing Patient Records</h3>
                  <p className="text-xs text-slate-500">Lookup by OH-ID (e.g. OH-2026-...), Mobile Number, or Full Name</p>
                </div>
              </div>

              <form onSubmit={handleSearchPatient} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Enter OH-ID, Mobile Number (+91...), or Patient Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="submit"
                  disabled={isSearchingPatient}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSearchingPatient ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Search Patient</span>
                </button>
              </form>

              {/* Results */}
              {hasSearched && (
                <div className="pt-3 border-t border-slate-100">
                  {searchResults.length === 0 ? (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                      <div>
                        <p className="font-bold">No existing patient found for &quot;{searchQuery}&quot;</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">Proceed with new patient registration below.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRegForm((prev) => ({
                            ...prev,
                            phone: /^\+?[0-9]{10,13}$/.test(searchQuery) ? searchQuery : prev.phone,
                            name: !/^[0-9+]+$/.test(searchQuery) && !searchQuery.startsWith("OH-") ? searchQuery : prev.name,
                          }));
                        }}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-700"
                      >
                        Autofill Register Form
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-700">Existing Records Found ({searchResults.length})</p>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                        {searchResults.map((pat) => (
                          <div key={pat.id} className="p-3.5 bg-white hover:bg-slate-50 flex items-center justify-between text-xs transition">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{pat.name}</span>
                                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                                  {pat.onehealth_id}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Age: {pat.age} • Gender: {pat.gender} • Phone: {pat.phone} • Blood: {pat.blood_group || "N/A"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPatientForToken(pat);
                                setWalkInForm((prev) => ({
                                  ...prev,
                                  patient_id: pat.id,
                                  ohid: pat.onehealth_id,
                                  patient_name: pat.name,
                                  patient_phone: pat.phone,
                                  patient_age: String(pat.age),
                                  patient_gender: pat.gender,
                                }));
                                setActiveTab("WALK_IN");
                              }}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-2xs"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Issue Walk-in Token</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Register New Patient Form */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Register New Patient & Issue Token</h3>
                  <p className="text-xs text-slate-500">Auto-generates unique OneHealth ID (OH-2026-...) and registers visit encounter</p>
                </div>
              </div>

              {regError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                  {regError}
                </div>
              )}

              <form onSubmit={handleRegisterAndIssueToken} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Full Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={regForm.name}
                      onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      placeholder="e.g. Meenakshi Sundaram"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Mobile Phone *</label>
                    <input
                      type="text"
                      required
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                      placeholder="+91 98401 23456"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Gender *</label>
                    <select
                      value={regForm.gender}
                      onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Age (Years) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={120}
                      value={regForm.age}
                      onChange={(e) => setRegForm({ ...regForm, age: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Blood Group</label>
                    <select
                      value={regForm.blood_group}
                      onChange={(e) => setRegForm({ ...regForm, blood_group: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Department Routing *</label>
                    <select
                      value={regForm.department_name}
                      onChange={(e) => setRegForm({ ...regForm, department_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="General Medicine">General Medicine (Prefix GM-)</option>
                      <option value="Cardiology">Cardiology (Prefix CARD-)</option>
                      <option value="Orthopedics">Orthopedics (Prefix ORTH-)</option>
                      <option value="Pediatrics">Pediatrics (Prefix PED-)</option>
                      <option value="Dermatology">Dermatology (Prefix DERM-)</option>
                      <option value="ENT">ENT (Prefix ENT-)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Triage Priority</label>
                    <select
                      value={regForm.priority}
                      onChange={(e) => setRegForm({ ...regForm, priority: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    >
                      <option value="NORMAL">NORMAL (Standard OPD)</option>
                      <option value="SENIOR_CITIZEN">SENIOR CITIZEN (Priority Queue)</option>
                      <option value="PEDIATRIC">PEDIATRIC (Child Priority)</option>
                      <option value="EMERGENCY">EMERGENCY (Immediate Alert)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Preferred Doctor (Optional)</label>
                    <select
                      value={regForm.doctor_id}
                      onChange={(e) => setRegForm({ ...regForm, doctor_id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="">-- Dynamic / On-duty Assignment --</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          Dr. {d.name} ({d.specialty})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Chief Complaint / Reason for Visit</label>
                  <input
                    type="text"
                    placeholder="e.g. Acute high fever and dry cough for 3 days"
                    value={regForm.chief_complaint}
                    onChange={(e) => setRegForm({ ...regForm, chief_complaint: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={registering}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {registering ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    <span>Register & Generate OPD Token</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: RAPID WALK-IN TOKEN GENERATION */}
        {activeTab === "WALK_IN" && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Direct Walk-In / Rapid Token Slip</h3>
                  <p className="text-xs text-slate-500">Instantly creates hospital visit encounter and issues department token</p>
                </div>
              </div>
              {selectedPatientForToken && (
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                  {selectedPatientForToken.name}
                </span>
              )}
            </div>

            <form onSubmit={handleGenerateWalkInToken} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">OneHealth ID (OH-ID) *</label>
                  <input
                    type="text"
                    required
                    placeholder="OH-2026-90412"
                    value={walkInForm.ohid}
                    onChange={(e) => setWalkInForm({ ...walkInForm, ohid: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Department Routing *</label>
                  <select
                    value={walkInForm.department_name}
                    onChange={(e) => setWalkInForm({ ...walkInForm, department_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="General Medicine">General Medicine (Prefix GM-)</option>
                    <option value="Cardiology">Cardiology (Prefix CARD-)</option>
                    <option value="Orthopedics">Orthopedics (Prefix ORTH-)</option>
                    <option value="Pediatrics">Pediatrics (Prefix PED-)</option>
                    <option value="Dermatology">Dermatology (Prefix DERM-)</option>
                    <option value="ENT">ENT (Prefix ENT-)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Triage Priority</label>
                  <select
                    value={walkInForm.priority}
                    onChange={(e) => setWalkInForm({ ...walkInForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="NORMAL">NORMAL (Standard OPD)</option>
                    <option value="SENIOR_CITIZEN">SENIOR CITIZEN (Priority Queue)</option>
                    <option value="PEDIATRIC">PEDIATRIC (Child Priority)</option>
                    <option value="EMERGENCY">EMERGENCY (Immediate Alert)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Consulting Doctor</label>
                  <select
                    value={walkInForm.doctor_id}
                    onChange={(e) => setWalkInForm({ ...walkInForm, doctor_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">-- Dynamic / On-duty Assignment --</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.name} ({d.specialty})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Chief Complaint</label>
                <input
                  type="text"
                  placeholder="e.g. Follow-up consultation or acute symptoms"
                  value={walkInForm.chief_complaint}
                  onChange={(e) => setWalkInForm({ ...walkInForm, chief_complaint: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submittingWalkIn}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingWalkIn ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                  <span>Generate OPD Token Slip</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: DOCTOR ON-DUTY ROSTER OVERVIEW */}
        {activeTab === "DOCTORS" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {doctors.map((doc) => (
              <div key={doc.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Dr. {doc.name}</h4>
                    <div className="text-[11px] text-slate-500">{doc.specialty} • {doc.department_name || "OPD"}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      doc.is_available !== false
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {doc.is_available !== false ? "ON DUTY" : "OFF DUTY"}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Consultation Room:</span>
                    <span className="font-bold text-slate-800">{doc.room_number || "Room 101"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">OPD Timings:</span>
                    <span className="font-medium text-slate-800">{doc.opd_timings || "09:00 AM - 01:00 PM"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Consultation Fee:</span>
                    <span className="font-mono font-bold text-indigo-700">₹{doc.consultation_fee || 500}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TOKEN SLIP PRINTABLE MODAL */}
        {tokenSlip && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{workspace?.hospital_name || "Hospital"} OPD</span>
                <button
                  type="button"
                  onClick={() => setTokenSlip(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Printable Token Body */}
              <div className="p-4 bg-gradient-to-b from-blue-50/50 to-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                <div className="text-xs text-indigo-700 font-bold uppercase tracking-wider">
                  {tokenSlip.department_name}
                </div>
                <div className="text-4xl font-black font-mono text-indigo-950 tracking-tight">
                  {tokenSlip.token_display || tokenSlip.token_number}
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-900">{tokenSlip.patient_name}</p>
                  <p className="font-mono text-[11px] text-slate-500 mt-0.5">{tokenSlip.onehealth_id}</p>
                </div>
                <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Priority: <strong>{tokenSlip.priority}</strong></span>
                  <span>Est. Wait: <strong>~{tokenSlip.estimated_wait_minutes || 10}m</strong></span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Token Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTokenSlip(null)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
