"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar, Clock, MapPin, User, Stethoscope, CheckCircle2,
  XCircle, AlertCircle, ArrowLeft, Hospital, Filter, RefreshCw,
  Plus, ChevronRight, Lock, QrCode, Search, Tag, Users, AlertTriangle,
  ArrowUpDown, FileText, Printer, Building2
} from "lucide-react";
import { api, PatientAppointment, PatientVisitedHospital } from "@/lib/api";
import { useFamily } from "@/lib/patient/FamilyContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { AppointmentBookingModal } from "@/components/appointments/AppointmentBookingModal";
import { RescheduleAppointmentModal } from "@/components/appointments/RescheduleAppointmentModal";
import { CancelAppointmentModal } from "@/components/appointments/CancelAppointmentModal";
import { AppointmentQRModal } from "@/components/appointments/AppointmentQRModal";
import { AppointmentDetailsModal } from "@/components/appointments/AppointmentDetailsModal";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  SCHEDULED:        { label: "Scheduled",        color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200",   icon: Clock },
  CHECKED_IN:       { label: "Checked In",       color: "text-cyan-700",   bg: "bg-cyan-50",   border: "border-cyan-200",   icon: CheckCircle2 },
  IN_CONSULTATION:  { label: "In Consultation",  color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", icon: CheckCircle2 },
  COMPLETED:        { label: "Completed",        color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200", icon: CheckCircle2 },
  CANCELLED:        { label: "Cancelled",        color: "text-rose-700",   bg: "bg-rose-50",   border: "border-rose-200",   icon: XCircle },
  NO_SHOW:          { label: "No Show",          color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  icon: AlertCircle },
};

export default function PatientAppointmentsPage() {
  const { activePerson, selectedPersonId, primaryProfile, familyMembers, canAccess } = useFamily();
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [hospitals, setHospitals] = useState<PatientVisitedHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UPCOMING" | "COMPLETED" | "CANCELLED">("ALL");
  const [hospitalFilter, setHospitalFilter] = useState<string>("ALL");
  const [personFilter, setPersonFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "DOCTOR" | "HOSPITAL">("NEWEST");

  // Modals state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedApptForDetails, setSelectedApptForDetails] = useState<PatientAppointment | null>(null);
  const [selectedApptForReschedule, setSelectedApptForReschedule] = useState<PatientAppointment | null>(null);
  const [selectedApptForCancel, setSelectedApptForCancel] = useState<PatientAppointment | null>(null);
  const [selectedApptForQR, setSelectedApptForQR] = useState<PatientAppointment | null>(null);

  const hasPermission = canAccess("view_appointments");

  const loadData = async () => {
    if (!hasPermission) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      // If personFilter is specific, pass that; otherwise load all family if personFilter === "ALL"
      const patientIdParam = personFilter === "ALL" ? undefined : (personFilter === "SELF" ? (primaryProfile?.id || undefined) : personFilter);
      const allFamilyParam = personFilter === "ALL";

      const [apptsRes, hospsRes] = await Promise.all([
        api.patient.getAppointments({ 
          patient_id: patientIdParam,
          all_family: allFamilyParam
        }).catch(() => ({ success: true, data: [] })),
        api.patient.getHospitals(selectedPersonId || undefined).catch(() => ({ success: true, data: [] })),
      ]);
      setAppointments(apptsRes?.data || []);
      setHospitals(hospsRes?.data || []);
    } catch (err: any) {
      console.error("Failed to load appointments", err);
      setError(err?.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPersonId, hasPermission, personFilter]);

  const filtered = appointments.filter((a) => {
    if (statusFilter === "UPCOMING" && !["SCHEDULED", "CHECKED_IN", "WAITING"].includes(a.status)) return false;
    if (statusFilter === "COMPLETED" && a.status !== "COMPLETED") return false;
    if (statusFilter === "CANCELLED" && a.status !== "CANCELLED") return false;
    if (hospitalFilter !== "ALL" && a.hospital_id !== hospitalFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDoc = a.doctor_name?.toLowerCase().includes(q);
      const matchSpec = a.doctor_specialty?.toLowerCase().includes(q);
      const matchHosp = a.hospital_name?.toLowerCase().includes(q);
      const matchPatient = a.patient_name?.toLowerCase().includes(q);
      const matchReason = a.reason?.toLowerCase().includes(q);
      const matchId = a.id?.toLowerCase().includes(q);
      if (!matchDoc && !matchSpec && !matchHosp && !matchPatient && !matchReason && !matchId) return false;
    }
    return true;
  });

  // Client-side Sorting: DESC (Newest First) by default
  const sortedAppointments = [...filtered].sort((a, b) => {
    if (sortBy === "DOCTOR") {
      return (a.doctor_name || "").localeCompare(b.doctor_name || "");
    }
    if (sortBy === "HOSPITAL") {
      return (a.hospital_name || "").localeCompare(b.hospital_name || "");
    }

    const getSortTimestamp = (item: PatientAppointment) => {
      if (item.appointment_date) return new Date(item.appointment_date).getTime();
      if (item.slot && item.slot.match(/^\d{4}-\d{2}-\d{2}/)) {
        return new Date(item.slot.substring(0, 10)).getTime();
      }
      if (item.created_at) return new Date(item.created_at).getTime();
      return 0;
    };

    const timeA = getSortTimestamp(a);
    const timeB = getSortTimestamp(b);

    if (sortBy === "OLDEST") {
      if (timeA !== timeB) return timeA - timeB;
      const crA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const crB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return crA - crB;
    }

    // Default "NEWEST" (DESC - newest/latest first)
    if (timeB !== timeA) return timeB - timeA;
    const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (createdB !== createdA) return createdB - createdA;
    return (b.id || "").localeCompare(a.id || "");
  });

  const isSelf = activePerson?.isSelf ?? true;
  const currentName = activePerson?.name || "Patient";

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <Link
            href="/patient"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Health Overview</span>
          </Link>
          <span className="text-xs text-slate-400 font-mono">
            OH-ID: {activePerson?.onehealth_id || "OHID"}
          </span>
        </div>

        {/* Page Header with Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">
                {personFilter === "ALL" ? "Family Appointments" : (isSelf ? "My Appointments" : `${currentName}'s Appointments`)}
              </h1>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-full border border-blue-200">
                {sortedAppointments.length} {sortedAppointments.length === 1 ? "Appointment" : "Appointments"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Discovery-based appointment booking, schedule management, and verified hospital check-in passes.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            <button
              id="book-appointment-btn"
              onClick={() => setIsBookingOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Book Appointment</span>
            </button>
          </div>
        </div>

        {/* Permission Barrier */}
        {!hasPermission ? (
          <div className="p-8 bg-amber-50 border border-amber-200 rounded-3xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Appointment Access Restricted</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Viewing appointments for {currentName} requires authorized family permissions or guardian access.
            </p>
            <Link
              href="/patient/family"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <span>Manage Family Permissions</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <>
            {/* Multi-Filter Bar */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
              {/* Row 1: Search & Filter Selectors */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search doctor, hospital, specialty, reason, or appointment ID..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Patient Filter */}
                <div className="flex items-center gap-2 shrink-0">
                  <Users className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={personFilter}
                    onChange={(e) => setPersonFilter(e.target.value)}
                    aria-label="Filter by Patient"
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Family Members</option>
                    <option value="SELF">👤 Myself ({primaryProfile?.name || "Self"})</option>
                    {familyMembers.map((m) => (
                      <option key={m.member_patient_id} value={m.member_patient_id}>
                        {m.relationship === "Spouse" ? "👩" : m.relationship === "Son" || m.relationship === "Child" ? "👦" : m.relationship === "Mother" ? "👵" : "👤"} {m.relationship}: {m.member_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hospital Filter */}
                {hospitals.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Hospital className="w-4 h-4 text-slate-400 shrink-0" />
                    <select
                      value={hospitalFilter}
                      onChange={(e) => setHospitalFilter(e.target.value)}
                      aria-label="Filter by Hospital"
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALL">All Hospitals ({hospitals.length})</option>
                      {hospitals.map((h) => (
                        <option key={h.hospital_id} value={h.hospital_id}>
                          {h.hospital_name || h.name || "Hospital"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Row 2: Status Filter Tabs & Sort Selector */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                {/* Status Tabs */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
                  {(["ALL", "UPCOMING", "COMPLETED", "CANCELLED"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      data-testid={`status-filter-${st.toLowerCase()}`}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        statusFilter === st
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {st === "ALL" ? "All Appointments" : st.charAt(0) + st.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>

                {/* Sort Selector: DESC by default */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    data-testid="sort-by-select"
                    aria-label="Sort Appointments"
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="NEWEST">Sort: Newest First (Desc)</option>
                    <option value="OLDEST">Sort: Oldest First (Asc)</option>
                    <option value="DOCTOR">Sort: Doctor Name</option>
                    <option value="HOSPITAL">Sort: Hospital Name</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-700">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={loadData}
                  className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg font-semibold transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Appointments List */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : sortedAppointments.length > 0 ? (
              <div className="space-y-4">
                {sortedAppointments.map((appt) => {
                  const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.SCHEDULED;
                  const Icon = cfg.icon;
                  const isUpcoming = ["SCHEDULED", "CHECKED_IN", "WAITING"].includes(appt.status);

                  return (
                    <div
                      key={appt.id}
                      data-testid={`appointment-card-${appt.id}`}
                      className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-blue-300 hover:shadow-md transition space-y-4 group"
                    >
                      {/* Top Header Line: Patient Identity & Status Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            appt.relationship_context === "FAMILY" || (appt.patient_name && appt.patient_name !== primaryProfile?.name)
                              ? "bg-amber-50 text-amber-900 border border-amber-200"
                              : "bg-blue-50 text-blue-900 border border-blue-200"
                          }`}>
                            <User className="w-3.5 h-3.5" />
                            <span>
                              {appt.relationship_context === "FAMILY" && appt.booked_by_relationship
                                ? `${appt.booked_by_relationship}: ${appt.patient_name || "Family Member"}`
                                : (appt.patient_name || "Myself")}
                            </span>
                          </span>

                          {appt.appointment_type && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {appt.appointment_type}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border} flex items-center gap-1`}>
                            <Icon className="w-3 h-3" />
                            <span>{cfg.label}</span>
                          </span>
                          {(appt.token_number || appt.queue_number) && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                              Token #{appt.token_number || appt.queue_number}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Main Details Body - Clickable to open Details */}
                      <div 
                        onClick={() => setSelectedApptForDetails(appt)}
                        className="cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-2xl ${cfg.bg} ${cfg.color} border ${cfg.border} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition transform`}>
                            <Stethoscope className="w-6 h-6" />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition">
                                Dr. {appt.doctor_name}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                ({appt.doctor_specialty})
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Hospital className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="font-semibold text-slate-800">{appt.hospital_name}</span>
                              {appt.department_name && (
                                <>
                                  <span>•</span>
                                  <span>{appt.department_name}</span>
                                </>
                              )}
                            </div>

                            {appt.reason && (
                              <p className="text-xs text-slate-500 pt-0.5">
                                <strong className="text-slate-600">Reason:</strong> {appt.reason}
                              </p>
                            )}

                            {/* Booked by audit badge for family */}
                            {appt.booked_by_name && appt.relationship_context === "FAMILY" && (
                              <p className="text-[11px] text-slate-400">
                                Booked by {appt.booked_by_name} ({appt.booked_by_relationship || "Family"})
                              </p>
                            )}

                            {/* Cancellation Reason Note */}
                            {appt.status === "CANCELLED" && appt.cancellation_reason && (
                              <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 flex items-center gap-1.5 mt-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>Cancelled: {appt.cancellation_reason}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Date / Slot Box */}
                        <div className="text-left sm:text-right shrink-0 space-y-1 w-full sm:w-auto p-3 sm:p-0 bg-slate-50 sm:bg-transparent rounded-xl">
                          <div className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-900 shadow-xs inline-block">
                            {appt.slot}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            ID: {appt.id}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                        {/* Primary View Details Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedApptForDetails(appt)}
                          data-testid={`view-details-${appt.id}`}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>View Details</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {/* QR Pass Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedApptForQR(appt)}
                            data-testid={`show-qr-${appt.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition"
                          >
                            <QrCode className="w-3.5 h-3.5 text-slate-600" />
                            <span>Show QR Pass</span>
                          </button>

                          {/* Reschedule Button (for upcoming) */}
                          {isUpcoming && (
                            <button
                              type="button"
                              onClick={() => setSelectedApptForReschedule(appt)}
                              data-testid={`reschedule-${appt.id}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition"
                            >
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>Reschedule</span>
                            </button>
                          )}

                          {/* Cancel Button (for upcoming) */}
                          {isUpcoming && (
                            <button
                              type="button"
                              onClick={() => setSelectedApptForCancel(appt)}
                              data-testid={`cancel-${appt.id}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Cancel</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 bg-white border border-dashed border-slate-200 rounded-3xl text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Calendar className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-800">No Appointments Found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {statusFilter !== "ALL" || hospitalFilter !== "ALL" || searchQuery.trim()
                      ? "Try adjusting your search criteria or filter tags."
                      : `You have no scheduled consultations. Discover verified hospitals and book instantly.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBookingOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Book New Appointment</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Appointment Details Modal */}
        <AppointmentDetailsModal
          appointment={selectedApptForDetails}
          isOpen={!!selectedApptForDetails}
          onClose={() => setSelectedApptForDetails(null)}
          onShowQR={(appt) => setSelectedApptForQR(appt)}
          onReschedule={(appt) => setSelectedApptForReschedule(appt)}
          onCancel={(appt) => setSelectedApptForCancel(appt)}
        />

        {/* 9-Step Discovery Booking Modal */}
        <AppointmentBookingModal
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          onSuccess={() => {
            loadData();
          }}
        />

        {/* Reschedule Modal */}
        <RescheduleAppointmentModal
          appointment={selectedApptForReschedule}
          isOpen={!!selectedApptForReschedule}
          onClose={() => setSelectedApptForReschedule(null)}
          onSuccess={() => {
            loadData();
          }}
        />

        {/* Cancel Modal */}
        <CancelAppointmentModal
          appointment={selectedApptForCancel}
          isOpen={!!selectedApptForCancel}
          onClose={() => setSelectedApptForCancel(null)}
          onSuccess={() => {
            loadData();
          }}
        />

        {/* QR Code Pass Modal */}
        <AppointmentQRModal
          appointment={selectedApptForQR}
          isOpen={!!selectedApptForQR}
          onClose={() => setSelectedApptForQR(null)}
        />
      </div>
    </WorkspaceLayout>
  );
}

