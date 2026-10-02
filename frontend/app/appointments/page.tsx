"use client";

import React, { useState, useEffect, useRef } from "react";
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
  ArrowRight,
  ChevronDown,
  UserPlus,
  Phone,
  Droplet,
  Sparkles
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

  // Searchable Patient Dropdown State
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  // Quick Register Patient Sub-Modal State
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddError, setQuickAddError] = useState("");
  const [quickAddData, setQuickAddData] = useState({
    name: "",
    age: "",
    gender: "Male",
    phone: "",
    blood_group: "O+",
    complaint: "General Outpatient Consultation",
  });

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

  // Close patient dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        patientDropdownRef.current &&
        !patientDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPatientDropdownOpen(false);
      }
    }
    if (isPatientDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPatientDropdownOpen]);

  const [actionMessage, setActionMessage] = useState("");

  const selectedPatient = patients.find((p) => p.id === newAppt.patient_id);

  const filteredPatients = patients.filter((p) => {
    if (!patientSearchQuery.trim()) return true;
    const q = patientSearchQuery.toLowerCase();
    const nameMatch = p.name?.toLowerCase().includes(q);
    const idMatch = p.onehealth_id?.toLowerCase().includes(q);
    const phoneMatch = p.phone?.toLowerCase().includes(q);
    return Boolean(nameMatch || idMatch || phoneMatch);
  });

  const openQuickAddModal = (initialName: string = "") => {
    setQuickAddData((prev) => ({
      ...prev,
      name: initialName.trim(),
    }));
    setQuickAddError("");
    setShowQuickAddModal(true);
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickAddError("");

    if (!quickAddData.name.trim()) {
      setQuickAddError("Patient full name is required");
      return;
    }
    if (!quickAddData.phone.trim() || quickAddData.phone.trim().length < 10) {
      setQuickAddError("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!quickAddData.age || Number(quickAddData.age) <= 0) {
      setQuickAddError("Please enter a valid age");
      return;
    }

    setQuickAddLoading(true);
    try {
      const newPatient = await api.patients.register({
        name: quickAddData.name.trim(),
        age: Number(quickAddData.age),
        gender: quickAddData.gender,
        phone: quickAddData.phone.trim(),
        blood_group: quickAddData.blood_group,
        diagnosis: quickAddData.complaint.trim() || "General Outpatient Consultation",
      });

      // Prepend newly registered patient to state
      setPatients((prev) => [newPatient, ...prev]);

      // Automatically select in appointment booking form
      setNewAppt((prev) => ({ ...prev, patient_id: newPatient.id }));

      // Close modal and dropdown, reset query
      setShowQuickAddModal(false);
      setIsPatientDropdownOpen(false);
      setPatientSearchQuery("");
      setQuickAddData({
        name: "",
        age: "",
        gender: "Male",
        phone: "",
        blood_group: "O+",
        complaint: "General Outpatient Consultation",
      });

      setActionMessage(
        `Patient ${newPatient.name} (${newPatient.onehealth_id}) registered and selected for consultation!`
      );
    } catch (err: any) {
      setQuickAddError(err.message || "Failed to register patient. Please check details.");
    } finally {
      setQuickAddLoading(false);
    }
  };

  const handleCheckIn = async (id: string) => {
    try {
      const res = await api.appointments.checkIn(id);
      setActionMessage(res.message || "Patient checked in successfully! Assigned live OPD Queue Token.");
      await loadData();
    } catch (err: any) {
      setActionMessage("Check-in failed: " + (err.message || "Unknown error"));
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.appointments.updateStatus(id, status);
      setActionMessage(`Appointment status updated to ${status}`);
      // Refresh local list
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
    } catch (err: any) {
      setActionMessage("Status update failed: " + (err.message || "Unknown error"));
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
      const created = await api.appointments.book({
        ...newAppt,
        slot: `${newAppt.appointment_date} ${newAppt.appointment_time}`,
      });
      setBookSuccess(`Appointment booked successfully! Token #${created.token_number || "—"}`);
      setTimeout(() => {
        setShowBookModal(false);
        setBookSuccess("");
        loadData();
      }, 500);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white  p-5 sm:p-6 rounded-3xl border border-slate-200  shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 ">
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

        {actionMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50  border border-emerald-200  text-xs font-semibold text-emerald-800  flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionMessage}</span>
            </div>
            <button
              onClick={() => setActionMessage("")}
              className="text-slate-400 hover:text-slate-600"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white  p-4 rounded-2xl border border-slate-200  shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient, doctor, or specialty..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50  border border-slate-200  rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
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
                      : "bg-slate-100  text-slate-600  hover:bg-slate-200"
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
            <div className="hidden lg:block bg-white  rounded-3xl border border-slate-200  overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50  border-b border-slate-200  text-slate-500 uppercase tracking-wider font-semibold">
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
                <tbody className="divide-y divide-slate-100 ">
                  {filteredAppointments.map((appt) => (
                    <tr
                      key={appt.id}
                      className="hover:bg-slate-50/60  transition-colors"
                    >
                      <td className="py-4 px-6">
                        <Link
                          href={`/patients/${appt.patient_id}`}
                          className="font-bold text-slate-900  hover:text-blue-600  block"
                        >
                          {appt.patient_name}
                        </Link>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ID: {appt.patient_id.substring(0, 8)}...
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800 ">
                          Dr. {appt.doctor_name}
                        </div>
                        <div className="text-[11px] text-slate-500">{appt.department_name}</div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-700 ">
                          {appt.appointment_date}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {appt.appointment_time}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-50  text-blue-700  font-mono font-bold text-xs border border-blue-200 ">
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
                          {appt.status !== "checked_in" && appt.status !== "CHECKED_IN" && appt.status !== "completed" && appt.status !== "COMPLETED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCheckIn(appt.id)}
                              className="text-[11px] h-8 px-2.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                              title="Mark Patient Checked In & Assign Token"
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
                              className="text-[11px] h-8 px-2 text-rose-500 hover:bg-rose-50"
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
                  className="p-4 bg-white  border border-slate-200  rounded-2xl shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        href={`/patients/${appt.patient_id}`}
                        className="font-bold text-sm text-slate-900  hover:text-blue-600 block"
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

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 ">
                    <div className="flex items-center gap-2 text-slate-600 ">
                      <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{appt.appointment_date}</span>
                      <span className="font-mono text-slate-500 font-medium">({appt.appointment_time})</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-blue-600 px-2 py-0.5 bg-blue-50  rounded-md">
                        #{appt.token_number || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Actions (Min 44px touch targets) */}
                  <div className="pt-2 flex items-center gap-2">
                    {appt.status !== "checked_in" && appt.status !== "CHECKED_IN" && appt.status !== "completed" && appt.status !== "COMPLETED" && (
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => handleCheckIn(appt.id)}
                        className="flex-1 text-xs justify-center min-h-[44px]"
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
            <div className="bg-white  rounded-3xl border border-slate-200  w-full max-w-lg shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100  pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100  text-blue-600 flex items-center justify-center">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 ">
                    Book Outpatient Consultation
                  </h3>
                </div>
                <button
                  onClick={() => setShowBookModal(false)}
                  className="text-slate-400 hover:text-slate-600  p-1"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {bookError && (
                <div className="p-3 rounded-xl bg-rose-50  text-rose-700  text-xs font-medium">
                  {bookError}
                </div>
              )}

              {bookSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50  text-emerald-700  text-xs font-medium flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{bookSuccess}</span>
                </div>
              )}

              <form onSubmit={handleBookSubmit} className="space-y-4 text-xs">
                {/* Select Patient with Real-Time Search & Quick Add */}
                <div className="relative" ref={patientDropdownRef}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-semibold text-slate-700 text-xs">
                      Select Patient <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => openQuickAddModal(patientSearchQuery)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                      title="Quick register a new citizen"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Register New Patient</span>
                    </button>
                  </div>

                  {/* Trigger Box */}
                  <div
                    onClick={() => setIsPatientDropdownOpen(!isPatientDropdownOpen)}
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-2xl cursor-pointer transition-all flex items-center justify-between min-h-[50px] ${
                      isPatientDropdownOpen
                        ? "border-blue-500 ring-2 ring-blue-500/20 bg-white"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {selectedPatient ? (
                      <div className="flex items-center gap-3 overflow-hidden text-left">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                          {selectedPatient.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {selectedPatient.name}
                            </span>
                            <span className="font-mono text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                              {selectedPatient.onehealth_id}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>📞 {selectedPatient.phone}</span>
                            <span>•</span>
                            <span>{selectedPatient.age}y / {selectedPatient.gender}</span>
                            {selectedPatient.blood_group && (
                              <>
                                <span>•</span>
                                <span className="text-rose-600 font-medium">{selectedPatient.blood_group}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Search className="w-4 h-4" />
                        <span>Search and select a patient...</span>
                      </div>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-2 ${
                        isPatientDropdownOpen ? "rotate-180 text-blue-600" : ""
                      }`}
                    />
                  </div>

                  {/* Dropdown Menu Popup */}
                  {isPatientDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
                      {/* Search Bar & Stats */}
                      <div className="p-2.5 border-b border-slate-100 bg-slate-50/70 space-y-2">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={patientSearchQuery}
                            onChange={(e) => setPatientSearchQuery(e.target.value)}
                            placeholder="Search name, OH-ID, or phone number..."
                            autoFocus
                            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                          />
                          {patientSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setPatientSearchQuery("")}
                              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
                          <span>
                            {filteredPatients.length} patient{filteredPatients.length === 1 ? "" : "s"} found
                          </span>
                          <button
                            type="button"
                            onClick={() => openQuickAddModal(patientSearchQuery)}
                            className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>+ Quick Register</span>
                          </button>
                        </div>
                      </div>

                      {/* Patient List */}
                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {filteredPatients.length === 0 ? (
                          <div className="p-5 text-center space-y-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                              <Search className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-800">
                                No patients found matching "{patientSearchQuery}"
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Register this patient to proceed with OPD booking
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={() => openQuickAddModal(patientSearchQuery)}
                              className="text-xs mx-auto gap-1.5"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Register "{patientSearchQuery || 'New Patient'}"</span>
                            </Button>
                          </div>
                        ) : (
                          filteredPatients.map((p) => {
                            const isSelected = p.id === newAppt.patient_id;
                            return (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setNewAppt({ ...newAppt, patient_id: p.id });
                                  setIsPatientDropdownOpen(false);
                                }}
                                className={`p-3 text-left cursor-pointer transition-colors flex items-center justify-between group ${
                                  isSelected
                                    ? "bg-blue-50/80 text-blue-900 border-l-4 border-blue-600"
                                    : "hover:bg-slate-50 text-slate-800"
                                }`}
                              >
                                <div className="space-y-0.5 overflow-hidden">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                                      {p.name}
                                    </span>
                                    <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-medium border border-slate-200">
                                      {p.onehealth_id}
                                    </span>
                                    {p.blood_group && (
                                      <span className="text-[10px] text-rose-600 font-semibold">
                                        {p.blood_group}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                    <span>📞 {p.phone}</span>
                                    <span>•</span>
                                    <span>{p.age} yrs ({p.gender})</span>
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Select Doctor */}
                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Select Attending Specialist <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newAppt.doctor_id}
                    onChange={(e) => setNewAppt({ ...newAppt, doctor_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50  border border-slate-200  rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  >
                    {doctors.map((d) => {
                      const cleanName = d.name.replace(/^Dr\.?\s*/i, "");
                      return (
                        <option key={d.id} value={d.id}>
                          Dr. {cleanName} — {d.specialty} ({d.department_name})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Date & Time Slot */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700  mb-1">
                      Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newAppt.appointment_date}
                      onChange={(e) => setNewAppt({ ...newAppt, appointment_date: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50  border border-slate-200  rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700  mb-1">
                      Time Slot <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={newAppt.appointment_time}
                      onChange={(e) => setNewAppt({ ...newAppt, appointment_time: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50  border border-slate-200  rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                    >
                      {["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "02:00 PM", "02:30 PM", "03:00 PM", "04:00 PM"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block font-semibold text-slate-700  mb-1">
                    Triage Priority
                  </label>
                  <select
                    value={newAppt.priority}
                    onChange={(e) => setNewAppt({ ...newAppt, priority: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50  border border-slate-200  rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
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

        {/* Quick Register Patient Sub-Modal */}
        {showQuickAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-md shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Quick Patient Registration
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Instantly generate OneHealth ID & select for OPD
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {quickAddError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{quickAddError}</span>
                </div>
              )}

              <form onSubmit={handleQuickAddSubmit} className="space-y-3.5 text-xs">
                {/* Full Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={quickAddData.name}
                    onChange={(e) => setQuickAddData({ ...quickAddData, name: e.target.value })}
                    placeholder="e.g. Ramesh Kannan"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[42px]"
                  />
                </div>

                {/* Mobile Phone */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mobile Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={quickAddData.phone}
                    onChange={(e) => setQuickAddData({ ...quickAddData, phone: e.target.value })}
                    placeholder="10-digit mobile number (e.g. 9840123456)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[42px]"
                  />
                </div>

                {/* Age & Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Age <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="125"
                      value={quickAddData.age}
                      onChange={(e) => setQuickAddData({ ...quickAddData, age: e.target.value })}
                      placeholder="e.g. 35"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[42px]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={quickAddData.gender}
                      onChange={(e) => setQuickAddData({ ...quickAddData, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[42px]"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={quickAddData.blood_group}
                    onChange={(e) => setQuickAddData({ ...quickAddData, blood_group: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[42px]"
                  >
                    <option value="O+">O+ (Positive)</option>
                    <option value="O-">O- (Negative)</option>
                    <option value="A+">A+ (Positive)</option>
                    <option value="A-">A- (Negative)</option>
                    <option value="B+">B+ (Positive)</option>
                    <option value="B-">B- (Negative)</option>
                    <option value="AB+">AB+ (Positive)</option>
                    <option value="AB-">AB- (Negative)</option>
                    <option value="Unknown">Unknown / Not Tested</option>
                  </select>
                </div>

                {/* Chief Complaint / Notes */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Chief Complaint / Consultation Reason
                  </label>
                  <input
                    type="text"
                    value={quickAddData.complaint}
                    onChange={(e) => setQuickAddData({ ...quickAddData, complaint: e.target.value })}
                    placeholder="e.g. Chest pain, Routine Health Checkup"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[42px]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setShowQuickAddModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={quickAddLoading}
                    className="text-xs font-semibold gap-1.5"
                  >
                    {quickAddLoading ? (
                      <span>Registering Citizen...</span>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Register & Select</span>
                      </>
                    )}
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
