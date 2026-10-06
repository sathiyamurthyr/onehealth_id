"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar, Clock, Pill, TestTube, FileText, Activity,
  CreditCard, ShieldCheck, QrCode, User, Hospital,
  Stethoscope, ChevronRight, AlertCircle, ArrowUpRight,
  Receipt, RefreshCw, CheckCircle2, Building2, Users,
  Baby, HeartHandshake, Lock, Plus, XCircle
} from "lucide-react";
import { api, PatientSummaryMetrics, PatientAppointment } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { useFamily } from "@/lib/patient/FamilyContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { AppointmentBookingModal } from "@/components/appointments/AppointmentBookingModal";
import { RescheduleAppointmentModal } from "@/components/appointments/RescheduleAppointmentModal";
import { CancelAppointmentModal } from "@/components/appointments/CancelAppointmentModal";
import { AppointmentQRModal } from "@/components/appointments/AppointmentQRModal";

export default function PatientOverviewPage() {
  const { user } = useWorkspace();
  const { 
    activePerson, 
    selectedPersonId, 
    primaryProfile, 
    familyMembers, 
    familyOverview, 
    switchPerson, 
    canAccess 
  } = useFamily();

  const [summary, setSummary] = useState<PatientSummaryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedApptForReschedule, setSelectedApptForReschedule] = useState<PatientAppointment | null>(null);
  const [selectedApptForCancel, setSelectedApptForCancel] = useState<PatientAppointment | null>(null);
  const [selectedApptForQR, setSelectedApptForQR] = useState<PatientAppointment | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.patient.getSummary(selectedPersonId || undefined);
      if (res?.data) {
        setSummary(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load patient summary", err);
      setError(err?.message || "Failed to load health summary. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedPersonId]);

  const counts = summary?.counts || {
    upcoming_appointments: 0,
    visits: 0,
    prescriptions: 0,
    lab_reports: 0,
    doctors: 0,
    hospitals: 0,
    documents: 0,
    pending_bills: 0,
    active_insurance: 0,
  };

  const upcomingEvents = summary?.upcoming_events || [];
  const recentVisits = summary?.recent_records?.visits || [];
  const recentRx = summary?.recent_records?.prescriptions || [];
  const recentLabs = summary?.recent_records?.lab_reports || [];

  const isSelf = activePerson?.isSelf ?? true;
  const currentName = activePerson?.name || primaryProfile?.name || user?.name || "Patient";
  const currentOhid = activePerson?.onehealth_id || primaryProfile?.onehealth_id || user?.username || "OHID-CITIZEN";

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* 1. Header / Patient Identity Greeting */}
        <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-xl text-white border transition-all ${
          isSelf 
            ? "bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 border-slate-800" 
            : "bg-gradient-to-br from-slate-900 via-amber-950 to-orange-950 border-amber-900/50"
        }`}>
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-cyan-300 text-xs font-semibold backdrop-blur-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  {isSelf 
                    ? "Verified Citizen Healthcare Identity • Personal Workspace" 
                    : `Authorized Family Health Profile • ${activePerson?.relationship}`}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {isSelf ? `Good Day, ${currentName} 👋` : `Viewing Health Record: ${currentName}`}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                {isSelf 
                  ? "Your personal healthcare overview across all accredited hospitals, clinics, and diagnostic centers."
                  : `Independent healthcare record for ${currentName}. Clinical data is strictly isolated and never merged with other family accounts.`}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                <span className="text-slate-400">OH-ID:</span>
                <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 font-mono font-bold text-cyan-300 tracking-wider">
                  {currentOhid}
                </span>
                <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Universal Record Connected
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap md:flex-col gap-2.5 shrink-0 w-full md:w-auto">
              <button
                type="button"
                id="header-book-appointment-btn"
                onClick={() => setIsBookingOpen(true)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition transform active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Book Appointment</span>
              </button>

              <Link
                href="/patient/qr"
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600/80 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                <QrCode className="w-4 h-4" />
                <span>View Citizen QR</span>
              </Link>

              <Link
                href={isSelf ? "/patient/profile" : "/patient/family"}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-sm transition"
              >
                {isSelf ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                <span>{isSelf ? "View Profile" : "Family Hub"}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Error State with Retry */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-700">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadDashboardData}
              className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg font-semibold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* 2. Upcoming Schedule Section (Enhanced with Patient Identity & Actions) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs">
                <Calendar className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isSelf ? "Upcoming Schedule" : `${currentName}'s Schedule`}
                </h3>
                <p className="text-xs text-slate-500">Upcoming clinical visits and consultations</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="dashboard-book-btn"
                onClick={() => setIsBookingOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Book Appointment</span>
              </button>

              <Link
                href="/patient/appointments"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition flex items-center gap-1"
              >
                <span>View All ({counts.upcoming_appointments})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
          ) : upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {upcomingEvents.map((evt: any, idx: number) => {
                // Determine patient badge
                const isEvtSelf = !evt.patient_name || evt.patient_name === primaryProfile?.name;
                const patientBadgeText = isEvtSelf ? "👤 Myself" : `👦 ${evt.patient_name}`;

                // Convert evt to PatientAppointment format for modals
                const apptObj: PatientAppointment = {
                  id: evt.id || `apt-${idx}`,
                  hospital_id: evt.hospital_id || "",
                  hospital_name: evt.hospital_name || "Hospital",
                  doctor_id: evt.doctor_id || "",
                  doctor_name: evt.doctor_name || "Doctor",
                  doctor_specialty: evt.doctor_specialty || "Specialist",
                  slot: evt.time || evt.date || "Scheduled",
                  status: (evt.status as any) || "SCHEDULED",
                  queue_number: evt.queue_number,
                  reason: evt.reason || evt.title,
                  patient_id: evt.patient_id,
                  patient_name: evt.patient_name,
                  relationship_context: evt.relationship_context,
                  booked_by_name: evt.booked_by_name,
                  booked_by_relationship: evt.booked_by_relationship,
                };

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/30 flex flex-col justify-between gap-3 shadow-xs hover:border-blue-300 transition"
                  >
                    <div>
                      {/* Patient Identity Tag */}
                      <div className="flex items-center justify-between pb-2 border-b border-blue-100/80">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                          {patientBadgeText}
                        </span>
                        <span className="text-[11px] font-bold text-blue-900 font-mono">
                          {evt.time || evt.date}
                        </span>
                      </div>

                      {/* Doctor & Hospital Details */}
                      <div className="pt-2 space-y-1">
                        <h4 className="text-sm font-bold text-slate-900">Dr. {evt.doctor_name}</h4>
                        <p className="text-xs text-slate-600 font-medium">{evt.doctor_specialty}</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                          <Hospital className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate">{evt.hospital_name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: QR, Reschedule, Cancel */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedApptForQR(apptObj)}
                        className="text-[11px] font-bold text-slate-700 hover:text-blue-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
                      >
                        <QrCode className="w-3.5 h-3.5 text-blue-600" />
                        <span>Pass</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedApptForReschedule(apptObj)}
                          className="text-[11px] font-semibold text-blue-600 hover:underline px-2 py-1"
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedApptForCancel(apptObj)}
                          className="text-[11px] font-semibold text-rose-600 hover:underline px-2 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">No upcoming appointments scheduled</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  {isSelf 
                    ? "Need a consultation? Search accredited hospitals by specialty, locality, or health need." 
                    : `${currentName} has no scheduled appointments.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBookingOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Book Appointment</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Family Health Schedule Quick View (Visible when viewing Self if family members have appointments) */}
        {isSelf && familyOverview && familyOverview.upcoming_family_appointments && familyOverview.upcoming_family_appointments.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-slate-50 border border-amber-200/80 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Upcoming Family Appointments ({familyOverview.upcoming_family_appointments.length})
                </h4>
              </div>
              <Link href="/patient/family" className="text-xs font-semibold text-amber-700 hover:underline">
                Manage Family Hub →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {familyOverview.upcoming_family_appointments.map((fEvt, i) => (
                <div key={i} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                      {fEvt.relationship}: {fEvt.patient_name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">{fEvt.slot}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 truncate">Dr. {fEvt.doctor_name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{fEvt.hospital_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Patient Summary Metric Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isSelf ? "My Health Summary Metrics" : `${currentName}'s Health Metrics`}
            </h3>
            <span className="text-[11px] text-slate-400">Live across network</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: "Upcoming", count: counts.upcoming_appointments, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", href: "/patient/appointments" },
              { label: "Visits", count: counts.visits, icon: Clock, color: "text-indigo-600", bg: "bg-indigo-50", href: "/patient/visits" },
              { label: "Prescriptions", count: counts.prescriptions, icon: Pill, color: "text-emerald-600", bg: "bg-emerald-50", href: "/patient/prescriptions" },
              { label: "Lab Reports", count: counts.lab_reports, icon: TestTube, color: "text-purple-600", bg: "bg-purple-50", href: "/patient/labs" },
              { label: "Doctors", count: counts.doctors, icon: Stethoscope, color: "text-cyan-600", bg: "bg-cyan-50", href: "/patient/doctors" },
              { label: "Hospitals", count: counts.hospitals, icon: Hospital, color: "text-sky-600", bg: "bg-sky-50", href: "/patient/hospitals" },
              { label: "Documents", count: counts.documents, icon: FileText, color: "text-amber-600", bg: "bg-amber-50", href: "/patient/documents" },
              { label: "Pending Bills", count: summary?.financials?.pending_bills_amount ? `₹${summary.financials.pending_bills_amount}` : `₹0`, icon: CreditCard, color: "text-rose-600", bg: "bg-rose-50", href: "/patient/bills" },
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <Link
                  key={idx}
                  href={card.href}
                  className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-sm transition group"
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-8 h-8 rounded-xl ${card.bg} ${card.color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition" />
                  </div>
                  <div className="mt-3">
                    <p className="text-lg font-bold text-slate-900 tracking-tight">
                      {loading ? "..." : card.count}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 truncate">{card.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 5. Recent Records 3-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Column A: Recent Visits */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Clinical Visits</h4>
                </div>
                <Link href="/patient/visits" className="text-[11px] font-semibold text-blue-600 hover:underline">
                  View All
                </Link>
              </div>

              <div className="divide-y divide-slate-100 mt-2">
                {recentVisits.length > 0 ? (
                  recentVisits.slice(0, 3).map((v, i) => (
                    <div key={i} className="py-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">{v.diagnosis || "Medical Consultation"}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {v.created_at ? new Date(v.created_at).toLocaleDateString("en-IN", { dateStyle: "short" }) : "Recent"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {v.doctor_name || "Physician"} • {v.hospital_name}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No recorded visits yet.</p>
                )}
              </div>
            </div>

            <Link
              href="/patient/visits"
              className="pt-2 text-xs font-semibold text-indigo-600 flex items-center justify-between hover:underline"
            >
              <span>Explore Medical History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Column B: Recent Prescriptions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Prescriptions</h4>
                </div>
                <Link href="/patient/prescriptions" className="text-[11px] font-semibold text-blue-600 hover:underline">
                  View All
                </Link>
              </div>

              <div className="divide-y divide-slate-100 mt-2">
                {recentRx.length > 0 ? (
                  recentRx.slice(0, 3).map((rx, i) => (
                    <div key={i} className="py-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{rx.doctor_name || "Physician"}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {rx.status || "ACTIVE"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {rx.hospital_name} • {rx.item_count || 1} Medication(s)
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No active prescriptions.</p>
                )}
              </div>
            </div>

            <Link
              href="/patient/prescriptions"
              className="pt-2 text-xs font-semibold text-emerald-600 flex items-center justify-between hover:underline"
            >
              <span>View All Medications</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Column C: Recent Lab Reports */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <TestTube className="w-4 h-4 text-purple-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Lab Reports</h4>
                </div>
                <Link href="/patient/labs" className="text-[11px] font-semibold text-blue-600 hover:underline">
                  View All
                </Link>
              </div>

              <div className="divide-y divide-slate-100 mt-2">
                {recentLabs.length > 0 ? (
                  recentLabs.slice(0, 3).map((lab, i) => (
                    <div key={i} className="py-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">{lab.test_name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{lab.status || "Completed"}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {lab.hospital_name} • {lab.test_category || "Diagnostic"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No lab diagnostic records.</p>
                )}
              </div>
            </div>

            <Link
              href="/patient/labs"
              className="pt-2 text-xs font-semibold text-purple-600 flex items-center justify-between hover:underline"
            >
              <span>View Diagnostic Vault</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 6. Universal Journey Banner */}
        <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">Universal Healthcare Timeline</h4>
            <p className="text-xs text-slate-600">
              View {isSelf ? "your" : `${currentName}'s`} unified multi-hospital clinical history, prescriptions, test reports, and billing events in one chronological timeline.
            </p>
          </div>
          <Link
            href="/patient/timeline"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shrink-0 shadow-sm flex items-center gap-1.5"
          >
            <span>Open Timeline</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 9-Step Discovery Booking Modal */}
        <AppointmentBookingModal
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          onSuccess={() => {
            loadDashboardData();
          }}
        />

        {/* Reschedule Modal */}
        <RescheduleAppointmentModal
          appointment={selectedApptForReschedule}
          isOpen={!!selectedApptForReschedule}
          onClose={() => setSelectedApptForReschedule(null)}
          onSuccess={() => {
            loadDashboardData();
          }}
        />

        {/* Cancel Modal */}
        <CancelAppointmentModal
          appointment={selectedApptForCancel}
          isOpen={!!selectedApptForCancel}
          onClose={() => setSelectedApptForCancel(null)}
          onSuccess={() => {
            loadDashboardData();
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
