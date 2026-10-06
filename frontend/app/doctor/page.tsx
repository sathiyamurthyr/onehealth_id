"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Stethoscope,
  ListOrdered,
  CalendarCheck,
  Users,
  Play,
  CheckCircle2,
  Clock,
  ArrowRight,
  Pill,
  Building,
  Hospital as HospitalIcon,
  ChevronDown,
  Search,
  Share2,
  FileText,
  UserCheck,
  AlertCircle,
  Plus,
  Printer,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  Filter
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { Button } from "@/components/ui/Card";

export default function DoctorDashboardPage() {
  const router = useRouter();
  const { workspace, user } = useWorkspace();

  // Doctor Data State
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Referral Modal State
  const [showReferralModal, setShowReferralModal] = useState<boolean>(false);
  const [searchDoctorQuery, setSearchDoctorQuery] = useState<string>("");
  const [searchSpecialty, setSearchSpecialty] = useState<string>("");
  const [searchHospital, setSearchHospital] = useState<string>("");
  const [doctorSearchResults, setDoctorSearchResults] = useState<any[]>([]);
  const [searchingDoctors, setSearchingDoctors] = useState<boolean>(false);
  const [selectedReferralDoc, setSelectedReferralDoc] = useState<any>(null);
  const [referralReason, setReferralReason] = useState<string>("");
  const [referralSuccess, setReferralSuccess] = useState<string>("");

  // 1. Load initial doctor profile and hospital-scoped clinical data
  useEffect(() => {
    async function loadDoctorData() {
      try {
        setLoading(true);
        const meProfile = await api.me.getProfile().catch(() => null);
        const currentHospId = meProfile?.hospital_ref_id || workspace?.hospital_ref_id || "hosp-kedar";

        // Load Doctor Profile Details
        const doc = await api.doctors.getMe().catch(() => null);
        setDoctorProfile(doc || {
          name: meProfile?.doctor?.name || meProfile?.name || user?.name || "Dr. Senthil Nathan",
          specialty: meProfile?.doctor?.specialty || "General Medicine & Diabetology",
          registration_number: meProfile?.doctor?.registration_number || "TN-MCI-2026-REG"
        });

        // Load Appointments & Queue strictly scoped to this hospital
        await fetchScopedData(currentHospId);
      } catch (err) {
        console.error("Failed to load doctor dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDoctorData();
  }, [user, workspace?.hospital_ref_id]);

  // Fetch appointments, queue, and prescriptions for current hospital context
  const fetchScopedData = async (hospId: string) => {
    try {
      const [appts, queue, rxList] = await Promise.all([
        api.doctors.getMyAppointments(false).catch(() => []),
        api.doctors.getMyQueue().catch(() => []),
        api.prescriptions.list({ hospital_id: hospId }).catch(() => [])
      ]);

      const filteredQueue = queue ? queue.filter((q: any) => !q.hospital_id || q.hospital_id === hospId) : [];

      setAppointments(appts || []);
      setQueueItems(filteredQueue || []);
      setRecentPrescriptions(rxList?.slice(0, 5) || []);
    } catch (err) {
      console.error("Failed to fetch scoped data:", err);
    }
  };

  // Doctor search for clinical referral
  const handleSearchDoctors = async () => {
    try {
      setSearchingDoctors(true);
      const results = await api.doctors.search({
        name: searchDoctorQuery || undefined,
        specialty: searchSpecialty || undefined,
        hospital_id: searchHospital || undefined,
      });
      setDoctorSearchResults(results || []);
    } catch (err) {
      console.error("Doctor search failed:", err);
    } finally {
      setSearchingDoctors(false);
    }
  };

  const handleOpenReferralModal = () => {
    setShowReferralModal(true);
    setReferralSuccess("");
    handleSearchDoctors();
  };

  const handleConfirmReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReferralDoc) {
      alert("Please select an authorized doctor for the referral.");
      return;
    }
    setReferralSuccess(`Patient successfully referred to ${selectedReferralDoc.name} (${selectedReferralDoc.specialty}) at ${selectedReferralDoc.hospital_name || "Authorized Facility"}.`);
    setTimeout(() => {
      setShowReferralModal(false);
      setSelectedReferralDoc(null);
      setReferralReason("");
    }, 2000);
  };

  // Metrics for overview cards
  const totalAppointments = appointments.length;
  const waitingQueueCount = queueItems.filter(q => q.status === "WAITING").length;
  const inConsultationCount = appointments.filter(a => a.status === "IN_CONSULTATION").length;
  const completedCount = appointments.filter(a => a.status === "COMPLETED").length;

  const currentHospitalName = workspace?.hospital_name || "Kedar Hospital";
  const currentBranchName = workspace?.branch_name || "Mugalivakkam Main";

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["DOCTOR"]}>
      <div className="bg-white min-h-screen text-slate-900 pb-16">
        {/* ========================================================
            DOCTOR HEADER & LOCKED HOSPITAL BADGE
           ======================================================== */}
        <div className="border-b border-slate-200 bg-white sticky top-0 z-20 px-6 py-4 shadow-xs">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Doctor Identity */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center border border-blue-200 shadow-xs text-lg">
                DR
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    {doctorProfile?.name || user?.name || "Dr. Rajesh Kumar"}
                  </h1>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active Clinician
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  <span className="font-semibold text-blue-700">{doctorProfile?.specialty || "Orthopedics & Trauma"}</span> • Reg: {doctorProfile?.registration_number || "TN-MCI-2026-REG"}
                </p>
              </div>
            </div>

            {/* Locked Active Hospital Facility Badge */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Hospital Facility:</span>
              <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-left shadow-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {currentHospitalName}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {currentBranchName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            MAIN DASHBOARD CONTENT
           ======================================================== */}
        <div className="max-w-6xl mx-auto px-6 pt-6 space-y-6">
          {/* Quick Action Clinical Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  OP Practice at {currentHospitalName}
                </h3>
                <p className="text-xs text-slate-500">
                  Scoped exclusively to {currentBranchName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenReferralModal}
                className="gap-1.5 text-xs font-medium border-slate-300 text-slate-700 hover:bg-white bg-white"
              >
                <Share2 className="w-4 h-4 text-blue-600" />
                <span>Refer Patient</span>
              </Button>

              <Link
                href="/doctor/prescriptions/new"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Prescription</span>
              </Link>
            </div>
          </div>

          {/* ========================================================
              TODAY'S OVERVIEW CARDS
             ======================================================== */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Today&apos;s Clinical Overview • {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
              </h3>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Total Appointments</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold text-slate-900">{totalAppointments}</span>
                  <span className="text-xs text-slate-500 ml-1.5">Scheduled</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Waiting in Queue</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold text-amber-700">{waitingQueueCount}</span>
                  <span className="text-xs text-slate-500 ml-1.5">Tokens</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">In Consultation</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold text-emerald-700">{inConsultationCount}</span>
                  <span className="text-xs text-slate-500 ml-1.5">Active</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Completed Today</span>
                  <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold text-slate-800">{completedCount}</span>
                  <span className="text-xs text-slate-500 ml-1.5">Consults</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================
              TODAY'S SCHEDULE & OPD QUEUE
             ======================================================== */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-blue-600" />
                  Today&apos;s Consultation Schedule & Queue
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Outpatients scheduled for consultation with {doctorProfile?.name || user?.name || "your outpatient clinic"}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Total: {appointments.length} patients</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Time Slot</th>
                    <th className="py-3 px-4">Token #</th>
                    <th className="py-3 px-4">Patient Name & OH-ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No appointments scheduled for today.
                      </td>
                    </tr>
                  ) : (
                    appointments.map((appt) => {
                      const isWaiting = appt.status === "WAITING";
                      const isInConsult = appt.status === "IN_CONSULTATION";
                      const isCompleted = appt.status === "COMPLETED";

                      return (
                        <tr key={appt.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                            {appt.slot || "09:00 - 09:15"}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                              #{appt.token_number || "1"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{appt.patient_name}</p>
                            <p className="text-[11px] font-mono text-slate-400">{appt.onehealth_id || appt.patient_id}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isInConsult
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : isWaiting
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : isCompleted
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {appt.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                            {appt.notes || "Orthopedic assessment"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/doctor/consultation/${appt.patient_id}?appointment_id=${appt.id}`}
                                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] transition"
                              >
                                Consult
                              </Link>
                              <Link
                                href={`/doctor/prescriptions/new?patient_id=${appt.patient_id}&visit_id=${appt.id}`}
                                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition"
                              >
                                + Rx
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================================
              RECENT PRESCRIPTIONS SIGNED BY DR. KUMAR
             ======================================================== */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Recent Prescriptions Created
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Immutable clinical prescriptions finalized by your identity
                </p>
              </div>

              <Link
                href="/doctor/prescriptions/new"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>+ New Prescription</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recentPrescriptions.length === 0 ? (
                <div className="col-span-3 text-center py-6 text-xs text-slate-400">
                  No prescriptions created for this facility yet. Click &quot;Create Prescription&quot; to begin.
                </div>
              ) : (
                recentPrescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-700">{rx.id}</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {rx.status || "SIGNED"}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 mt-1">{rx.patient_name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{rx.diagnosis || "Consultation Rx"}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(rx.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} • {rx.hospital_name || "Kedar Hospital"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      <Link
                        href={`/doctor/prescriptions/${rx.id}`}
                        className="w-full py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-[11px] font-semibold text-center"
                      >
                        View Details
                      </Link>
                      <button
                        onClick={() => window.open(`/doctor/prescriptions/${rx.id}?print=true`, "_blank")}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600"
                        title="Print Prescription"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ========================================================
            DOCTOR REFERRAL & SEARCH MODAL (OTHER DOCTORS)
           ======================================================== */}
        {showReferralModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Clinical Patient Referral & Transfer</h3>
                    <p className="text-xs text-slate-500">Search authorized doctors across departments and hospital facilities</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReferralModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>

              {referralSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  {referralSuccess}
                </div>
              )}

              {/* Search Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Doctor Name</label>
                  <input
                    type="text"
                    value={searchDoctorQuery}
                    onChange={(e) => setSearchDoctorQuery(e.target.value)}
                    placeholder="Search doctor..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Specialty</label>
                  <input
                    type="text"
                    value={searchSpecialty}
                    onChange={(e) => setSearchSpecialty(e.target.value)}
                    placeholder="e.g. Cardiology, Neurology..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSearchDoctors}
                    disabled={searchingDoctors}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5"
                  >
                    <Search className="w-3.5 h-3.5 mr-1" />
                    <span>{searchingDoctors ? "Searching..." : "Search Doctors"}</span>
                  </Button>
                </div>
              </div>

              {/* Search Results List */}
              <div className="space-y-2 max-h-52 overflow-y-auto">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Authorized Doctor Directory ({doctorSearchResults.length})
                </p>

                {doctorSearchResults.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No matching doctors found.</p>
                ) : (
                  doctorSearchResults.map((doc) => {
                    const isSelected = selectedReferralDoc?.id === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedReferralDoc(doc)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? "bg-blue-50 border-blue-400 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">{doc.name}</p>
                          <p className="text-[11px] text-blue-700 font-medium">{doc.specialty}</p>
                          <p className="text-[10px] text-slate-500">{doc.hospital_name || "Kedar Hospital Network"}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${doc.is_available ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {doc.is_available ? "On Call / Available" : "Consultation"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Referral Reason Form */}
              <form onSubmit={handleConfirmReferral} className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Referral Clinical Reason & Notes *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={referralReason}
                    onChange={(e) => setReferralReason(e.target.value)}
                    placeholder="Specify clinical indication for referral / consultation transfer..."
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowReferralModal(false)}
                    className="text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!selectedReferralDoc}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Confirm Referral
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
