"use client";

import React from "react";
import {
  X, Calendar, Clock, MapPin, User, Stethoscope, Building2,
  CheckCircle2, XCircle, AlertCircle, AlertTriangle, QrCode,
  Printer, Download, ShieldCheck, Tag, Phone, Activity, FileText,
  CreditCard, Share2, HelpCircle
} from "lucide-react";
import { PatientAppointment } from "@/lib/api";

interface AppointmentDetailsModalProps {
  appointment: PatientAppointment | null;
  isOpen: boolean;
  onClose: () => void;
  onShowQR?: (appointment: PatientAppointment) => void;
  onReschedule?: (appointment: PatientAppointment) => void;
  onCancel?: (appointment: PatientAppointment) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  SCHEDULED:        { label: "Scheduled",        color: "text-blue-700 dark:text-blue-300",   bg: "bg-blue-50 dark:bg-blue-950/40",   border: "border-blue-200 dark:border-blue-800",   icon: Clock },
  CHECKED_IN:       { label: "Checked In",       color: "text-cyan-700 dark:text-cyan-300",   bg: "bg-cyan-50 dark:bg-cyan-950/40",   border: "border-cyan-200 dark:border-cyan-800",   icon: CheckCircle2 },
  IN_CONSULTATION:  { label: "In Consultation",  color: "text-purple-700 dark:text-purple-300",bg: "bg-purple-50 dark:bg-purple-950/40",border: "border-purple-200 dark:border-purple-800",icon: Activity },
  COMPLETED:        { label: "Completed",        color: "text-emerald-700 dark:text-emerald-300",bg: "bg-emerald-50 dark:bg-emerald-950/40",border: "border-emerald-200 dark:border-emerald-800", icon: CheckCircle2 },
  CANCELLED:        { label: "Cancelled",        color: "text-rose-700 dark:text-rose-300",   bg: "bg-rose-50 dark:bg-rose-950/40",   border: "border-rose-200 dark:border-rose-800",   icon: XCircle },
  NO_SHOW:          { label: "No Show",          color: "text-amber-700 dark:text-amber-300",  bg: "bg-amber-50 dark:bg-amber-950/40",  border: "border-amber-200 dark:border-amber-800",  icon: AlertCircle },
};

export function AppointmentDetailsModal({
  appointment,
  isOpen,
  onClose,
  onShowQR,
  onReschedule,
  onCancel
}: AppointmentDetailsModalProps) {
  if (!isOpen || !appointment) return null;

  const cfg = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.SCHEDULED;
  const StatusIcon = cfg.icon;
  const isUpcoming = ["SCHEDULED", "CHECKED_IN", "WAITING"].includes(appointment.status);

  // Generate iCalendar (.ics) download
  const handleDownloadICS = () => {
    const title = `Consultation with Dr. ${appointment.doctor_name} (${appointment.doctor_specialty})`;
    const location = `${appointment.hospital_name}, ${appointment.hospital_address || appointment.hospital_city || "Chennai"}`;
    const description = `OneHealth ID Appointment\\nDoctor: Dr. ${appointment.doctor_name} (${appointment.doctor_specialty})\\nHospital: ${appointment.hospital_name}\\nPatient: ${appointment.patient_name || "Self"}\\nAppointment ID: ${appointment.id}\\nToken: #${appointment.token_number || appointment.queue_number || "1"}\\nSlot: ${appointment.slot}`;

    // Estimate start and end times
    let dateStr = appointment.appointment_date || "";
    if (!dateStr && appointment.slot && appointment.slot.match(/^\d{4}-\d{2}-\d{2}/)) {
      dateStr = appointment.slot.substring(0, 10);
    }
    if (!dateStr) {
      dateStr = new Date().toISOString().substring(0, 10);
    }
    const cleanDate = dateStr.replace(/-/g, "");
    const startTime = "090000";
    const endTime = "100000";

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//OneHealth ID//Appointment Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${appointment.id}@onehealth-id.org`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART:${cleanDate}T${startTime}`,
      `DTEND:${cleanDate}T${endTime}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `appointment_${appointment.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
        data-testid="appointment-details-modal"
      >
        {/* Top Header Banner */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl ${cfg.bg} ${cfg.color} border ${cfg.border} flex items-center justify-center shadow-xs`}>
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Appointment Details
                </h2>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border} flex items-center gap-1`}>
                  <StatusIcon className="w-3 h-3" />
                  <span>{cfg.label}</span>
                </span>
                {(appointment.token_number || appointment.queue_number) && (
                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Token #{appointment.token_number || appointment.queue_number}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                ID: {appointment.id} {appointment.checkin_token ? `• Pass: ${appointment.checkin_token}` : ""}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            data-testid="close-appointment-details-modal"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Family Context Banner (if booked for family) */}
          {(appointment.relationship_context === "FAMILY" || (appointment.patient_name && appointment.booked_by_name)) && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Family Appointment:</strong> Booked for <strong>{appointment.patient_name}</strong>
                  {appointment.booked_by_relationship ? ` (${appointment.booked_by_relationship})` : ""}
                  {appointment.booked_by_name ? ` by ${appointment.booked_by_name}` : ""}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200/60 dark:bg-amber-900/60 rounded-full shrink-0">
                Family Context
              </span>
            </div>
          )}

          {/* Grid of Key Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Doctor & Specialization */}
            <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
                <span>Consulting Doctor</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Dr. {appointment.doctor_name}
                </h3>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {appointment.doctor_specialty}
                </p>
                {appointment.doctor_qualification && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {appointment.doctor_qualification}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 grid grid-cols-2 gap-2 text-xs">
                {appointment.room_number && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Room / Cabin</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{appointment.room_number}</span>
                  </div>
                )}
                {appointment.doctor_rating && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Doctor Rating</span>
                    <span className="font-semibold text-amber-600">★ {appointment.doctor_rating} / 5.0</span>
                  </div>
                )}
                {appointment.doctor_consultation_fee && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Consultation Fee</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">₹{appointment.doctor_consultation_fee}</span>
                  </div>
                )}
                {appointment.doctor_experience_years && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Experience</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{appointment.doctor_experience_years} Years</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Hospital & Location */}
            <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Hospital & Facility</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {appointment.hospital_name}
                  </h3>
                  {appointment.hospital_badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {appointment.hospital_badge}
                    </span>
                  )}
                </div>

                {appointment.department_name && (
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Dept: {appointment.department_name}
                  </p>
                )}

                <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {[
                      appointment.hospital_address,
                      appointment.hospital_area,
                      appointment.hospital_city,
                      appointment.hospital_pin_code
                    ].filter(Boolean).join(", ") || "Main Facility Center"}
                  </span>
                </div>
              </div>

              {appointment.hospital_rating && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">Hospital Rating</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">★ {appointment.hospital_rating}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Date, Time & Priority Details */}
          <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] text-blue-700 dark:text-blue-300 uppercase font-bold block flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Date & Slot
              </span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {appointment.slot}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-blue-700 dark:text-blue-300 uppercase font-bold block flex items-center gap-1">
                <Tag className="w-3 h-3" /> Consultation Type
              </span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {appointment.appointment_type || "General Consultation"}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-blue-700 dark:text-blue-300 uppercase font-bold block flex items-center gap-1">
                <Clock className="w-3 h-3" /> Priority Level
              </span>
              <span className={`font-bold text-xs uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                appointment.priority === "URGENT" || appointment.priority === "HIGH"
                  ? "bg-rose-100 text-rose-800"
                  : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              }`}>
                {appointment.priority || "NORMAL"}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-blue-700 dark:text-blue-300 uppercase font-bold block flex items-center gap-1">
                <QrCode className="w-3 h-3" /> Digital Check-in
              </span>
              <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300">
                {appointment.checkin_token ? "✓ Active Token" : "Available at Desk"}
              </span>
            </div>
          </div>

          {/* Card 4: Patient Details */}
          <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-500 uppercase tracking-wider text-[11px]">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Registered Patient Identity</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Patient Name</span>
                <span className="font-bold text-slate-900 dark:text-white">{appointment.patient_name || "Myself"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">OneHealth ID</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{appointment.onehealth_id || "OHID-PATIENT"}</span>
              </div>
              {appointment.patient_age && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Age / Gender</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{appointment.patient_age} yrs • {appointment.patient_gender || "N/A"}</span>
                </div>
              )}
              {appointment.patient_phone && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Contact Phone</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{appointment.patient_phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Clinical Reason & Symptoms */}
          {(appointment.reason || appointment.symptoms_notes || appointment.notes) && (
            <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Clinical Notes & Reason for Consultation</span>
              </div>
              {appointment.reason && (
                <p className="text-slate-700 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white">Primary Reason:</strong> {appointment.reason}
                </p>
              )}
              {appointment.symptoms_notes && (
                <p className="text-slate-600 dark:text-slate-400">
                  <strong className="text-slate-800 dark:text-slate-200">Reported Symptoms:</strong> {appointment.symptoms_notes}
                </p>
              )}
              {appointment.notes && (
                <p className="text-slate-500 dark:text-slate-400 text-[11px] italic">
                  Note: {appointment.notes}
                </p>
              )}
            </div>
          )}

          {/* Cancellation Info (if cancelled) */}
          {appointment.status === "CANCELLED" && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl space-y-2 text-xs text-rose-800 dark:text-rose-200">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px] text-rose-700 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Cancellation Information</span>
              </div>
              <p>
                <strong>Reason:</strong> {appointment.cancellation_reason || "Cancelled by patient request"}
              </p>
              {appointment.cancelled_at && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">
                  Cancelled on: {new Date(appointment.cancelled_at).toLocaleString("en-IN")} {appointment.cancelled_by ? `by ${appointment.cancelled_by}` : ""}
                </p>
              )}
            </div>
          )}

          {/* Reschedule History (if rescheduled) */}
          {appointment.reschedule_history && appointment.reschedule_history.length > 0 && (
            <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Reschedule History ({appointment.reschedule_history.length})</span>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {appointment.reschedule_history.map((rh, idx) => (
                  <div key={idx} className="py-2 text-[11px] flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 line-through mr-2">
                        {rh.previous_slot || `${rh.previous_date} ${rh.previous_time}`}
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        → {rh.new_slot || `${rh.new_date} ${rh.new_time}`}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[10px]">
                      {rh.changed_at ? new Date(rh.changed_at).toLocaleDateString("en-IN") : "Updated"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {/* Download Calendar .ics */}
            <button
              type="button"
              onClick={handleDownloadICS}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition shadow-xs"
              title="Add to Google / Apple / Outlook Calendar"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Add to Calendar</span>
            </button>

            {/* Print Slip */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition shadow-xs"
              title="Print Appointment Confirmation Slip"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Slip</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Show QR Pass */}
            {onShowQR && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onShowQR(appointment);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 rounded-xl text-xs font-bold transition shadow-xs"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Show QR Pass</span>
              </button>
            )}

            {/* Reschedule Button */}
            {isUpcoming && onReschedule && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReschedule(appointment);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300 rounded-xl text-xs font-semibold transition"
              >
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Reschedule</span>
              </button>
            )}

            {/* Cancel Button */}
            {isUpcoming && onCancel && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCancel(appointment);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300 rounded-xl text-xs font-semibold transition"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Cancel</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
