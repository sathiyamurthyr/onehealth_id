"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Stethoscope,
  PlusCircle,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  ChevronRight,
  ShieldCheck,
  Check,
  ArrowRight
} from "lucide-react";
import { api } from "@/lib/api";
import { Appointment, Doctor, Patient } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/FeedbackStates";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState("");
  const [bookSuccess, setBookSuccess] = useState("");

  const [newAppt, setNewAppt] = useState({
    patient_id: "",
    doctor_id: "",
    appointment_date: new Date().toISOString().split("T")[0],
    appointment_time: "10:00 AM",
    priority: "NORMAL",
    notes: "Regular Consultation",
  });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [appts, docs, pats] = await Promise.all([
        api.appointments.list(),
        api.doctors.list(),
        api.patients.list(),
      ]);
      setAppointments(appts);
      setDoctors(docs);
      setPatients(pats);
      if (pats.length > 0 && !newAppt.patient_id) {
        setNewAppt((prev) => ({ ...prev, patient_id: pats[0].id }));
      }
      if (docs.length > 0 && !newAppt.doctor_id) {
        setNewAppt((prev) => ({ ...prev, doctor_id: docs[0].id }));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load appointment schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.appointments.updateStatus(id, status);
      // Refresh local list
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
    } catch (err: any) {
      alert("Status update failed: " + (err.message || "Unknown error"));
    }
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookError("");
    setBookSuccess("");

    if (!newAppt.patient_id || !newAppt.doctor_id) {
      setBookError("Please select both a patient and a doctor");
      return;
    }

    setBooking(true);
    try {
      const created = await api.appointments.book(newAppt);
      setBookSuccess(`Appointment booked successfully! Token #${created.token_number || "—"}`);
      setTimeout(() => {
        setShowBookModal(false);
        setBookSuccess("");
        loadData();
      }, 1500);
    } catch (err: any) {
      setBookError(err.message || "Booking failed. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    const matchesStatus = statusFilter === "ALL" || appt.status === statusFilter;
    const matchesSearch =
      !search ||
      appt.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      appt.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
      appt.department_name?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Appointments & Scheduling
              </h1>
              <Badge variant="primary" className="text-xs">
                OPD Scheduler
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Manage doctor consultations, token allocation, and patient check-ins
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setShowBookModal(true)}
            className="gap-2 text-xs font-semibold w-full sm:w-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Book New Appointment</span>
          </Button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient, doctor, or specialty..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            />
          </div>

          {/* Status Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {["ALL", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all min-h-[40px] ${
                    statusFilter === status
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {status}
                </button>
              )
            )}
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <LoadingState message="Loading hospital appointment roster..." />
        ) : error ? (
          <ErrorState
            title="Failed to Load Appointments"
            message={error}
            onRetry={loadData}
          />
        ) : filteredAppointments.length === 0 ? (
          <EmptyState
            title="No Appointments Found"
            message={
              search || statusFilter !== "ALL"
                ? "No appointments match your filter criteria."
                : "No consultations scheduled yet for today."
            }
            actionLabel="Schedule First Consultation"
            onAction={() => setShowBookModal(true)}
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View (>= 1024px) */}
            <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-4 px-6">Patient Name</th>
                    <th className="py-4 px-6">Attending Doctor</th>
                    <th className="py-4 px-6">Date & Time</th>
                    <th className="py-4 px-6">Token</th>
                    <th className="py-4 px-6">Priority</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAppointments.map((appt) => (
                    <tr
                      key={appt.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <Link
                          href={`/patients/${appt.patient_id}`}
                          className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 block"
                        >
                          {appt.patient_name}
                        </Link>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ID: {appt.patient_id.substring(0, 8)}...
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          Dr. {appt.doctor_name}
                        </div>
                        <div className="text-[11px] text-slate-500">{appt.department_name}</div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-700 dark:text-slate-300">
                          {appt.appointment_date}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {appt.appointment_time}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs border border-blue-200 dark:border-blue-800">
                          #{appt.token_number || "—"}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <Badge
                          variant={
                            appt.priority === "EMERGENCY"
                              ? "danger"
                              : appt.priority === "URGENT"
                              ? "warning"
                              : "outline"
                          }
                          className="text-[10px]"
                        >
                          {appt.priority}
                        </Badge>
                      </td>

                      <td className="py-4 px-6">
                        <Badge
                          variant={
                            appt.status === "COMPLETED"
                              ? "success"
                              : appt.status === "CHECKED_IN"
                              ? "primary"
                              : appt.status === "CANCELLED"
                              ? "danger"
                              : "warning"
                          }
                          className="text-[10px]"
                        >
                          {appt.status}
                        </Badge>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {appt.status !== "CHECKED_IN" && appt.status !== "COMPLETED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(appt.id, "CHECKED_IN")}
                              className="text-[11px] h-8 px-2.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                              title="Mark Patient Checked In"
                            >
                              Check-In
                            </Button>
                          )}
                          {appt.status === "CHECKED_IN" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(appt.id, "COMPLETED")}
                              className="text-[11px] h-8 px-2.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              title="Mark Consultation Completed"
                            >
                              Complete
                            </Button>
                          )}
                          {appt.status !== "CANCELLED" && appt.status !== "COMPLETED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusUpdate(appt.id, "CANCELLED")}
                              className="text-[11px] h-8 px-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Cancel Appointment"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Responsive Cards (< 1024px) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-3">
              {filteredAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        href={`/patients/${appt.patient_id}`}
                        className="font-bold text-sm text-slate-900 dark:text-white hover:text-blue-600 block"
                      >
                        {appt.patient_name}
                      </Link>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Dr. {appt.doctor_name} • {appt.department_name}
                      </div>
                    </div>
                    <Badge
                      variant={
                        appt.status === "COMPLETED"
                          ? "success"
                          : appt.status === "CHECKED_IN"
                          ? "primary"
                          : appt.status === "CANCELLED"
                          ? "danger"
                          : "warning"
                      }
                      className="text-[10px]"
                    >
                      {appt.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{appt.appointment_date}</span>
                      <span className="font-mono text-slate-500 font-medium">({appt.appointment_time})</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-blue-600 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded-md">
                        #{appt.token_number || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Actions (Min 44px touch targets) */}
                  <div className="pt-2 flex items-center gap-2">
                    {appt.status !== "CHECKED_IN" && appt.status !== "COMPLETED" && (
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => handleStatusUpdate(appt.id, "CHECKED_IN")}
                        className="flex-1 text-xs justify-center"
                      >
                        Check-In
                      </Button>
                    )}
                    {appt.status === "CHECKED_IN" && (
                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => handleStatusUpdate(appt.id, "COMPLETED")}
                        className="flex-1 text-xs justify-center text-emerald-600 border-emerald-200"
                      >
                        Complete
                      </Button>
                    )}
                    <Link href={`/patients/${appt.patient_id}`} className="flex-1">
                      <Button variant="outline" size="md" className="w-full text-xs justify-center">
                        View Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Book Appointment Modal */}
        {showBookModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Book Outpatient Consultation
                  </h3>
                </div>
                <button
                  onClick={() => setShowBookModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {bookError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium">
                  {bookError}
                </div>
              )}

              {bookSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{bookSuccess}</span>
                </div>
              )}

              <form onSubmit={handleBookSubmit} className="space-y-4 text-xs">
                {/* Select Patient */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Patient <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newAppt.patient_id}
                    onChange={(e) => setNewAppt({ ...newAppt, patient_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.onehealth_id}) — {p.phone}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Doctor */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Attending Specialist <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newAppt.doctor_id}
                    onChange={(e) => setNewAppt({ ...newAppt, doctor_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.name} — {d.specialty} ({d.department_name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & Time Slot */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newAppt.appointment_date}
                      onChange={(e) => setNewAppt({ ...newAppt, appointment_date: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Time Slot <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={newAppt.appointment_time}
                      onChange={(e) => setNewAppt({ ...newAppt, appointment_time: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                    >
                      {["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "02:00 PM", "02:30 PM", "03:00 PM", "04:00 PM"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Triage Priority
                  </label>
                  <select
                    value={newAppt.priority}
                    onChange={(e) => setNewAppt({ ...newAppt, priority: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  >
                    <option value="NORMAL">Normal Routine</option>
                    <option value="URGENT">Urgent Consultation</option>
                    <option value="EMERGENCY">Emergency Fast-Track</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setShowBookModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={booking}
                    className="text-xs font-semibold gap-2"
                  >
                    {booking ? "Generating Token..." : "Confirm & Issue Token"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
