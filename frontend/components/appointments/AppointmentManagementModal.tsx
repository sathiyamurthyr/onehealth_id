"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Stethoscope,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  QrCode,
  Printer,
  Download,
  Tag,
  Phone,
  FileText,
  Ticket,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Info,
  Check,
  Edit3,
  Repeat,
  ArrowLeft,
  CalendarPlus,
  ExternalLink,
} from "lucide-react";
import { PatientAppointment, api } from "@/lib/api";

export type AppointmentManagementViewMode =
  | "details"
  | "edit"
  | "reschedule"
  | "change_doctor"
  | "cancel"
  | "success"
  | "overview";

interface AppointmentManagementModalProps {
  isOpen: boolean;
  appointment: PatientAppointment | null;
  initialMode?: AppointmentManagementViewMode;
  onClose: () => void;
  onAppointmentUpdated?: (updated: PatientAppointment) => void;
}

export function AppointmentManagementModal({
  isOpen,
  appointment,
  initialMode = "details",
  onClose,
  onAppointmentUpdated,
}: AppointmentManagementModalProps) {
  const [currentMode, setCurrentMode] = useState<AppointmentManagementViewMode>(initialMode);
  const [activeAppt, setActiveAppt] = useState<PatientAppointment | null>(appointment);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Processing Request...");
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);

  // Mode 3: Edit Appointment Form State
  const [editReason, setEditReason] = useState<string>(
    appointment?.reason || "General Consultation"
  );
  const [editDepartment, setEditDepartment] = useState<string>(
    appointment?.department_name || "General Medicine"
  );
  const [editDoctorId, setEditDoctorId] = useState<string>(appointment?.doctor_id || "doc-01");
  const [editDate, setEditDate] = useState<string>(appointment?.appointment_date || "2026-11-10");
  const [editTime, setEditTime] = useState<string>("09:30 AM");

  // Mode 4: Reschedule State
  const [rescheduleStep, setRescheduleStep] = useState<number>(1);
  const [selectedMonth, setSelectedMonth] = useState<string>("November 2026");
  const [selectedDate, setSelectedDate] = useState<string>(
    appointment?.appointment_date || "2026-11-12"
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("10:30 AM");
  const [availableSlots, setAvailableSlots] = useState<string[]>([
    "09:00 AM",
    "09:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "02:00 PM",
    "02:30 PM",
    "03:00 PM",
  ]);

  // Mode 5: Change Doctor State
  const [doctorDeptFilter, setDoctorDeptFilter] = useState<string>("General Medicine");
  const [selectedNewDoctorId, setSelectedNewDoctorId] = useState<string>(
    appointment?.doctor_id || "doc-01"
  );
  const [doctorsList, setDoctorsList] = useState([
    {
      id: "doc-01",
      name: "Dr. Senthil Nathan",
      degree: "MBBS, MD (General Medicine)",
      department: "General Medicine",
      availabilityStr: "(Your current doctor)",
    },
    {
      id: "doc-02",
      name: "Dr. Aravind Kumar",
      degree: "MBBS, MD",
      department: "General Medicine",
      availabilityStr: "10 Nov • 10 slots available",
    },
    {
      id: "doc-03",
      name: "Dr. Priya Raman",
      degree: "MBBS, MD",
      department: "General Medicine",
      availabilityStr: "10 Nov • 6 slots available",
    },
    {
      id: "doc-04",
      name: "Dr. Karthik Vel",
      degree: "MBBS, MD",
      department: "General Medicine",
      availabilityStr: "10 Nov • 8 slots available",
    },
  ]);

  // Mode 6: Cancellation State
  const [cancelReason, setCancelReason] = useState<string>("Change in schedule");

  // Mode 7: Success State
  const [successTitle, setSuccessTitle] = useState<string>("Appointment Rescheduled");
  const [successSubtitle, setSuccessSubtitle] = useState<string>(
    "Your appointment has been successfully rescheduled."
  );
  const [successReferenceId, setSuccessReferenceId] = useState<string>("OHID-APT-000867-R1");

  useEffect(() => {
    if (appointment && appointment.id !== activeAppt?.id) {
      setActiveAppt(appointment);
      setEditReason(appointment.reason || "General Consultation");
      setEditDepartment(appointment.department_name || "General Medicine");
      setEditDoctorId(appointment.doctor_id || "doc-01");
      setEditDate(appointment.appointment_date || "2026-11-10");
      setSelectedDate(appointment.appointment_date || "2026-11-12");
      setSelectedNewDoctorId(appointment.doctor_id || "doc-01");
      setSuccessReferenceId(
        appointment.id.toUpperCase().startsWith("OHID-")
          ? `${appointment.id.toUpperCase()}-R1`
          : `OHID-APT-${appointment.id.substring(0, 6).toUpperCase()}-R1`
      );
    }
  }, [appointment, activeAppt]);

  useEffect(() => {
    setCurrentMode(initialMode);
  }, [initialMode, isOpen]);

  if (!isOpen || !activeAppt) return null;

  // Header Title Resolver
  const getHeaderTitle = () => {
    switch (currentMode) {
      case "details":
        return "Appointment Details";
      case "edit":
        return "Edit Appointment";
      case "reschedule":
        return "Reschedule Appointment";
      case "change_doctor":
        return "Change Doctor";
      case "cancel":
        return "Cancel Appointment";
      case "success":
        return "";
      case "overview":
        return "Appointment Management";
      default:
        return "Appointment";
    }
  };

  // Safe Back Navigation
  const handleBack = () => {
    if (currentMode === "details" || currentMode === "overview") {
      onClose();
    } else {
      setCurrentMode("details");
    }
  };

  // iCalendar (.ics) download
  const handleDownloadICS = () => {
    const title = `Consultation with Dr. ${activeAppt.doctor_name} (${activeAppt.doctor_specialty || "General Medicine"})`;
    const location = `${activeAppt.hospital_name}, ${activeAppt.hospital_address || "Chennai"}`;
    const description = `OneHealth ID Appointment\\nDoctor: Dr. ${activeAppt.doctor_name}\\nHospital: ${activeAppt.hospital_name}\\nPatient: ${activeAppt.patient_name || "Self"}\\nAppointment ID: ${activeAppt.id}\\nToken: #${activeAppt.token_number || "6"}`;

    const cleanDate = (activeAppt.appointment_date || "2026-11-10").replace(/-/g, "");
    const startTime = "093000";
    const endTime = "103000";

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//OneHealth ID//Appointment Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${activeAppt.id}@onehealth-id.org`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART:${cleanDate}T${startTime}`,
      `DTEND:${cleanDate}T${endTime}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `appointment_${activeAppt.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handlers
  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      setLoadingMessage("Updating appointment details...");
      const res = await api.patient.updateAppointment(activeAppt.id, {
        reason: editReason,
        department_id: editDepartment,
        doctor_id: editDoctorId,
        appointment_date: editDate,
        appointment_time: editTime,
      });

      const updated = res?.data || {
        ...activeAppt,
        reason: editReason,
        appointment_date: editDate,
      };

      setActiveAppt(updated);
      if (onAppointmentUpdated) onAppointmentUpdated(updated);

      setSuccessTitle("Appointment Details Updated");
      setSuccessSubtitle("Your updated appointment details have been successfully confirmed.");
      setSuccessReferenceId(
        updated.id.toUpperCase().startsWith("OHID-")
          ? `${updated.id.toUpperCase()}-E1`
          : `OHID-APT-${updated.id.substring(0, 6).toUpperCase()}-E1`
      );
      setCurrentMode("success");
    } catch (err: any) {
      alert(err?.message || "Failed to update appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReschedule = async () => {
    try {
      setLoading(true);
      setLoadingMessage("Rescheduling appointment with hospital...");
      const res = await api.patient.rescheduleAppointment(activeAppt.id, {
        new_date: selectedDate,
        new_time: selectedTimeSlot,
        doctor_id: selectedNewDoctorId !== activeAppt.doctor_id ? selectedNewDoctorId : undefined,
        reason: "Patient requested reschedule via web portal",
      });

      const targetDoctor = doctorsList.find((d) => d.id === (selectedNewDoctorId || activeAppt.doctor_id));
      const finalized: PatientAppointment = {
        ...activeAppt,
        appointment_date: selectedDate,
        slot: `${selectedDate} ${selectedTimeSlot}`,
        doctor_id: selectedNewDoctorId || activeAppt.doctor_id,
        doctor_name: targetDoctor ? targetDoctor.name : activeAppt.doctor_name,
        doctor_qualification: targetDoctor ? targetDoctor.degree : activeAppt.doctor_qualification,
        status: "RESCHEDULED",
      };

      setActiveAppt(finalized);
      if (onAppointmentUpdated) onAppointmentUpdated(finalized);

      setSuccessTitle("Appointment Rescheduled");
      setSuccessSubtitle("Your appointment has been successfully rescheduled.");
      setSuccessReferenceId(
        activeAppt.id.toUpperCase().startsWith("OHID-")
          ? `${activeAppt.id.toUpperCase()}-R1`
          : `OHID-APT-${activeAppt.id.substring(0, 6).toUpperCase()}-R1`
      );
      setCurrentMode("success");
    } catch (err: any) {
      alert(err?.message || "Rescheduling conflict. Please select another slot.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    try {
      setLoading(true);
      setLoadingMessage("Cancelling appointment record...");
      await api.patient.cancelAppointment(activeAppt.id, { reason: cancelReason });

      const cancelled: PatientAppointment = {
        ...activeAppt,
        status: "CANCELLED",
        cancellation_reason: cancelReason,
        cancelled_at: new Date().toISOString(),
      };

      setActiveAppt(cancelled);
      if (onAppointmentUpdated) onAppointmentUpdated(cancelled);

      setSuccessTitle("Appointment Cancelled");
      setSuccessSubtitle("Your appointment has been cancelled per hospital policy.");
      setSuccessReferenceId(
        activeAppt.id.toUpperCase().startsWith("OHID-")
          ? `${activeAppt.id.toUpperCase()}-C1`
          : `OHID-APT-${activeAppt.id.substring(0, 6).toUpperCase()}-C1`
      );
      setCurrentMode("success");
    } catch (err: any) {
      alert(err?.message || "Failed to cancel appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto"
      data-testid="appointment-management-modal"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-4 sm:my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* TOP APP HEADER: Back Arrow | OH-ID Cross Logo | Title | Close Button */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={handleBack}
            data-testid="btn-appointment-modal-back"
            aria-label="Go back"
            className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>

          <div className="flex items-center gap-2">
            {/* Official OneHealth ID Logo Icon */}
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {getHeaderTitle()}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            data-testid="btn-appointment-modal-close"
            aria-label="Close appointment window"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* SCREEN 2: APPOINTMENT DETAILS VIEW                                */}
        {/* ================================================================= */}
        {currentMode === "details" && (
          <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Top Badges */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:border-blue-900 dark:text-blue-300">
                {activeAppt.department_name || "GENERAL OPD"}
              </span>

              <div
                className={`text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border ${
                  activeAppt.status === "CANCELLED"
                    ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900"
                    : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    activeAppt.status === "CANCELLED" ? "bg-rose-600" : "bg-amber-600"
                  }`}
                />
                <span>{activeAppt.status === "CANCELLED" ? "Cancelled" : "Scheduled"}</span>
              </div>
            </div>

            {/* Doctor Profile Card */}
            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold shrink-0">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Dr. {activeAppt.doctor_name || "Dr. Senthil Nathan"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {activeAppt.doctor_qualification || "MBBS, MD (General Medicine)"}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 pt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>{activeAppt.hospital_name || "Hospital Alpha"}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>

            {/* Date, Time, Token & Room Card */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-xs">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>{activeAppt.appointment_date || "Tue, 10 Nov 2026"}</span>
                </div>
                <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>{activeAppt.slot || "09:30 AM"}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                  <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Token #{activeAppt.token_number || "6"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{activeAppt.room_number || "OPD - Room 102"}</span>
                </div>
              </div>
            </div>

            {/* Appointment Information Table */}
            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2.5 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Appointment Information</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Appointment ID</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{activeAppt.id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Reason for Visit</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {activeAppt.reason || "General Consultation"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Booking Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">28 Oct 2026, 04:15 PM</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Visit Type</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">OPD (In-person)</span>
                </div>
              </div>
            </div>

            {/* 6-Action Quick Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setCurrentMode("edit")}
                data-testid="btn-action-edit-details"
                className="p-3 bg-white dark:bg-slate-800 hover:bg-blue-50/60 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-1.5 transition shadow-xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-105 transition transform">
                  <Edit3 className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">Edit Details</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentMode("reschedule")}
                data-testid="btn-action-reschedule-appointment"
                className="p-3 bg-white dark:bg-slate-800 hover:bg-blue-50/60 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-1.5 transition shadow-xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-105 transition transform">
                  <Repeat className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block leading-tight">
                  Reschedule Appointment
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentMode("change_doctor")}
                data-testid="btn-action-change-doctor"
                className="p-3 bg-white dark:bg-slate-800 hover:bg-blue-50/60 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-1.5 transition shadow-xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-105 transition transform">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">Change Doctor</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentMode("cancel")}
                data-testid="btn-action-cancel-appointment"
                className="p-3 bg-white dark:bg-slate-800 hover:bg-rose-50/60 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-1.5 transition shadow-xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto group-hover:scale-105 transition transform">
                  <XCircle className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block leading-tight">
                  Cancel Appointment
                </span>
              </button>

              <button
                type="button"
                onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(activeAppt.hospital_name || "Hospital Alpha")}`, "_blank")}
                data-testid="btn-action-directions"
                className="p-3 bg-white dark:bg-slate-800 hover:bg-blue-50/60 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-1.5 transition shadow-xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-105 transition transform">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">Hospital Directions</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadICS}
                data-testid="btn-action-add-calendar"
                className="p-3 bg-white dark:bg-slate-800 hover:bg-blue-50/60 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-1.5 transition shadow-xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-105 transition transform">
                  <CalendarPlus className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">Add to Calendar</span>
              </button>
            </div>

            {/* Instructions Accordion */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => setInstructionsExpanded(!instructionsExpanded)}
                data-testid="btn-toggle-instructions"
                className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100/60 transition"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>Appointment Instructions</span>
                </div>
                {instructionsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {instructionsExpanded && (
                <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-300 space-y-2 border-t border-slate-100 dark:border-slate-700/50">
                  <p>• Please arrive 15 minutes prior to your allocated slot for vitals and reception check-in.</p>
                  <p>• Present your digital OH-ID pass or Token QR at the OPD kiosk desk.</p>
                  <p>• Bring previous medical documents and prescriptions in your OH-ID Health Locker.</p>
                </div>
              )}
            </div>

            {/* Link to Screen 8 Overview */}
            <button
              type="button"
              onClick={() => setCurrentMode("overview")}
              className="w-full py-2.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center justify-center gap-1.5 border border-dashed border-blue-200 dark:border-blue-900 rounded-2xl bg-blue-50/30 hover:bg-blue-50/80 transition"
            >
              <span>View Appointment Management Overview</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* SCREEN 3: EDIT APPOINTMENT VIEW                                   */}
        {/* ================================================================= */}
        {currentMode === "edit" && (
          <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update your appointment details below.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason for Visit <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    data-testid="input-edit-reason"
                    className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter consultation reason"
                  />
                  <Edit3 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="General Medicine">General Medicine</option>
                  <option value="Paediatrics">Paediatrics</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Orthopaedics">Orthopaedics</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Doctor <span className="text-rose-500">*</span>
                </label>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Dr. {activeAppt.doctor_name || "Dr. Senthil Nathan"}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {activeAppt.doctor_qualification || "MBBS, MD"}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Appointment Date <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCurrentMode("reschedule")}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-left flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <span>{editDate}</span>
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Appointment Time <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCurrentMode("reschedule")}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-left flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <span>{editTime}</span>
                    <Clock className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-2 text-xs text-blue-900 dark:text-blue-300">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>Note: Based on availability, your updated details will be confirmed instantly.</span>
            </div>

            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={loading}
              data-testid="btn-submit-edit-appointment"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
            >
              <span>Review Changes →</span>
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* SCREEN 4: RESCHEDULE APPOINTMENT VIEW                             */}
        {/* ================================================================= */}
        {currentMode === "reschedule" && (
          <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose a new date and time
            </p>

            {/* Stepper Header (1 Date, 2 Time, 3 Review, 4 Confirm) */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
              {[
                { step: 1, label: "Date" },
                { step: 2, label: "Time" },
                { step: 3, label: "Review" },
                { step: 4, label: "Confirm" },
              ].map((s, idx) => (
                <div key={s.step} className="flex items-center gap-1.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      rescheduleStep >= s.step
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {s.step}
                  </div>
                  <span
                    className={`text-[11px] font-semibold ${
                      rescheduleStep >= s.step
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                  {idx < 3 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-1" />}
                </div>
              ))}
            </div>

            {/* Month & Calendar Picker */}
            <div className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                <ChevronLeft className="w-4 h-4 text-slate-400 cursor-pointer" />
                <span>November 2026</span>
                <ChevronRight className="w-4 h-4 text-slate-400 cursor-pointer" />
              </div>

              {/* Calendar Grid Representation */}
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <span key={d} className="text-[10px] font-bold text-slate-400 py-1">
                    {d}
                  </span>
                ))}
                {[
                  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
                  22, 23, 24, 25, 26, 27, 28, 29, 30,
                ].map((day) => {
                  const dateStr = `2026-11-${day < 10 ? `0${day}` : day}`;
                  const isSelected = selectedDate === dateStr;
                  const isAvailable = day >= 10;
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setRescheduleStep(2);
                      }}
                      className={`h-8 rounded-lg font-bold text-xs transition flex items-center justify-center ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm"
                          : isAvailable
                          ? "hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                          : "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Available Time Slots */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Available Time Slots</span>
              </span>

              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map((slot) => {
                  const isSelected = selectedTimeSlot === slot;
                  const cleanSlotId = slot.replace(/[\s:]/g, "");
                  return (
                    <button
                      key={slot}
                      type="button"
                      data-testid={`reschedule-slot-${cleanSlotId}`}
                      onClick={() => {
                        setSelectedTimeSlot(slot);
                        setRescheduleStep(3);
                      }}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-300"
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmReschedule}
              disabled={loading}
              data-testid="btn-confirm-reschedule"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
            >
              <span>Next: Review & Confirm →</span>
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* SCREEN 5: CHANGE DOCTOR VIEW                                      */}
        {/* ================================================================= */}
        {currentMode === "change_doctor" && (
          <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a different doctor for your appointment
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Department
              </label>
              <select
                value={doctorDeptFilter}
                onChange={(e) => setDoctorDeptFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none"
              >
                <option value="General Medicine">General Medicine</option>
                <option value="Paediatrics">Paediatrics</option>
                <option value="Cardiology">Cardiology</option>
              </select>
            </div>

            <div className="space-y-2.5">
              {doctorsList.map((doc) => {
                const isSelected = selectedNewDoctorId === doc.id;
                return (
                  <div
                    key={doc.id}
                    data-testid={`select-doctor-${doc.id}`}
                    onClick={() => setSelectedNewDoctorId(doc.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-500 shadow-xs"
                        : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {doc.name}
                          </span>
                          {doc.id === activeAppt.doctor_id && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                              (Your current doctor)
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 block">{doc.degree}</span>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block pt-0.5">
                          {doc.availabilityStr}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-2 text-xs text-blue-900 dark:text-blue-300">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>Selecting a new doctor will reschedule your appointment based on availability.</span>
            </div>

            <button
              type="button"
              onClick={() => setCurrentMode("reschedule")}
              data-testid="btn-choose-time-for-new-doctor"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
            >
              <span>Next: Choose Time →</span>
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* SCREEN 6: CANCEL APPOINTMENT VIEW                                 */}
        {/* ================================================================= */}
        {currentMode === "cancel" && (
          <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Warning Circular Illustration */}
            <div className="text-center space-y-2 py-2">
              <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-sm">
                <XCircle className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cancel this appointment?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                You are about to cancel the following appointment:
              </p>
            </div>

            {/* Appointment Summary Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-900 dark:text-white">
                  Dr. {activeAppt.doctor_name}
                </span>
                <span className="text-slate-500">• {activeAppt.hospital_name}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <span>{activeAppt.appointment_date}</span>
                <span>•</span>
                <span>{activeAppt.slot}</span>
                <span>•</span>
                <span className="font-bold text-emerald-700">Token #{activeAppt.token_number || "6"}</span>
              </div>
            </div>

            {/* Reason for Cancellation */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Reason for Cancellation <span className="text-rose-500">*</span>
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none"
              >
                <option value="Change in schedule">Change in schedule</option>
                <option value="Doctor unavailable">Doctor unavailable</option>
                <option value="Booked by mistake">Booked by mistake</option>
                <option value="Personal emergency">Personal emergency</option>
                <option value="Symptoms resolved">Symptoms resolved</option>
              </select>
            </div>

            {/* Cancellation Policy */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>Cancellation Policy</span>
              </div>
              <p>• Free cancellation up to 24 hours before the appointment.</p>
              <p>• For late cancellation, please contact the hospital directly.</p>
            </div>

            {/* Actions: Keep vs Confirm */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentMode("details")}
                data-testid="btn-keep-appointment"
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition text-center"
              >
                Keep Appointment
              </button>

              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={loading}
                data-testid="btn-confirm-cancellation"
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-md text-center"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SCREEN 7: SUCCESS SCREEN VIEW                                     */}
        {/* ================================================================= */}
        {currentMode === "success" && (
          <div className="p-6 space-y-5 text-center max-h-[80vh] overflow-y-auto">
            {/* Big Green Checkmark with Confetti Accent */}
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {successTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {successSubtitle}
              </p>
            </div>

            {/* New Appointment Details Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-left space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700 font-bold text-emerald-700 dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Updated Details</span>
                </span>
                <span className="font-mono text-[11px]">{activeAppt.id}</span>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-900 dark:text-white block text-sm">
                  Dr. {activeAppt.doctor_name}
                </span>
                <span className="text-slate-500 block">{activeAppt.hospital_name}</span>
                <div className="flex items-center gap-3 pt-1 text-slate-700 dark:text-slate-300 font-semibold">
                  <span>{selectedDate || activeAppt.appointment_date}</span>
                  <span>•</span>
                  <span>{selectedTimeSlot || activeAppt.slot}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 uppercase font-bold">Reference ID</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {successReferenceId}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => setCurrentMode("details")}
                data-testid="btn-success-view-details"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                View Appointment Details
              </button>

              <button
                type="button"
                onClick={onClose}
                data-testid="btn-success-back-appointments"
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition"
              >
                Back to Appointments
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SCREEN 8: APPOINTMENT MANAGEMENT OVERVIEW VIEW                    */}
        {/* ================================================================= */}
        {currentMode === "overview" && (
          <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Appointment Management (OH-ID)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comprehensive patient self-service healthcare features.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {[
                { title: "View Appointment Details", desc: "Complete visit, hospital & token info" },
                { title: "Edit Appointment", desc: "Update reason, date, time or doctor" },
                { title: "Reschedule Appointment", desc: "Choose a new date and time" },
                { title: "Change Doctor", desc: "Select a different available doctor" },
                { title: "Cancel Appointment", desc: "Cancel with reason and policy" },
                { title: "Add to Calendar", desc: "Save to your device calendar" },
                { title: "Hospital Directions", desc: "Navigate to the hospital location" },
                { title: "Appointment Instructions", desc: "Pre-visit guidelines and documents" },
                { title: "Appointment History", desc: "View past, completed and cancelled appointments" },
              ].map((feat, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {feat.title}
                      </span>
                      <span className="text-[11px] text-slate-500">{feat.desc}</span>
                    </div>
                  </div>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              ))}
            </div>

            {/* Connected Facilities Art */}
            <div className="p-4 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl text-center space-y-2">
              <Building2 className="w-8 h-8 text-blue-600 mx-auto" />
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300 block">
                OneHealth ID Connected Care Facilities
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
