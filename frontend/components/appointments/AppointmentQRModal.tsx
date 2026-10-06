"use client";

import React, { useState, useEffect } from "react";
import {
  X, QrCode, Calendar, Clock, Hospital, Stethoscope,
  User, ShieldCheck, Download, Navigation, Share2,
  CheckCircle2, RefreshCw, AlertCircle
} from "lucide-react";
import { api, PatientAppointment } from "@/lib/api";

interface QRModalProps {
  appointment: PatientAppointment | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AppointmentQRModal({
  appointment,
  isOpen,
  onClose,
}: QRModalProps) {
  const [qrData, setQrData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !appointment) return;
    const fetchQR = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.patient.getAppointmentQR(appointment.id);
        if (res?.data) {
          setQrData(res.data);
        }
      } catch (err: any) {
        console.error("Failed to load appointment QR", err);
        setError(err?.message || "Failed to load check-in QR pass");
      } finally {
        setLoading(false);
      }
    };
    fetchQR();
  }, [isOpen, appointment]);

  if (!isOpen || !appointment) return null;

  // Generate .ics calendar invite
  const handleDownloadCalendar = () => {
    const title = `Medical Appointment: Dr. ${appointment.doctor_name} (${appointment.doctor_specialty})`;
    const desc = `Appointment at ${appointment.hospital_name}.\nDoctor: Dr. ${appointment.doctor_name}\nPatient: ${appointment.patient_name || "Patient"}\nToken ID: ${appointment.id}\nCheck-in Token: ${qrData?.token || appointment.id}`;
    const loc = appointment.hospital_name;
    const dateStr = appointment.slot?.split(" ")[0] || new Date().toISOString().split("T")[0];
    const icsDate = dateStr.replace(/-/g, "");

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//OneHealth ID//Appointment System//EN",
      "BEGIN:VEVENT",
      `SUMMARY:${title}`,
      `DESCRIPTION:${desc.replace(/\n/g, "\\n")}`,
      `LOCATION:${loc}`,
      `DTSTART:${icsDate}T090000Z`,
      `DTEND:${icsDate}T100000Z`,
      `STATUS:CONFIRMED`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Appointment-${appointment.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const mapsQuery = encodeURIComponent(`${appointment.hospital_name}, Chennai`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  const qrImageUrl = qrData?.qr_code_image || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData?.token || appointment.id)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Check-in QR Pass</h3>
              <p className="text-xs text-slate-300">Scan at hospital reception for fast-track queue</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs text-slate-500">Generating secure check-in pass...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* QR Code Container */}
              <div className="bg-gradient-to-b from-slate-50 to-blue-50/50 p-6 rounded-3xl border border-slate-200 flex flex-col items-center justify-center shadow-inner space-y-3 text-center">
                <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                  <img
                    src={qrImageUrl}
                    alt="Appointment Check-in QR"
                    className="w-44 h-44 object-contain rounded-lg"
                  />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-slate-900 tracking-wider">
                    {qrData?.appointment_id || appointment.id}
                  </div>
                  {appointment.queue_number && (
                    <div className="text-[11px] font-bold text-blue-700 mt-0.5">
                      Queue Token #{appointment.queue_number}
                    </div>
                  )}
                </div>
              </div>

              {/* Appointment Meta */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    {appointment.patient_name || "Patient"}
                  </span>
                </div>

                {appointment.booked_by_name && appointment.relationship_context === "FAMILY" && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 text-slate-600">
                    <span className="text-slate-500">Booked by:</span>
                    <span>
                      {appointment.booked_by_name} ({appointment.booked_by_relationship || "Family"})
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Doctor:</span>
                  <span className="font-bold text-slate-900">Dr. {appointment.doctor_name}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Specialty:</span>
                  <span className="font-semibold text-slate-800">{appointment.doctor_specialty}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Hospital:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                    {appointment.hospital_name}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Scheduled Time:</span>
                  <span className="font-bold text-blue-800 font-mono">{appointment.slot}</span>
                </div>
              </div>

              {/* Privacy / Security Badge */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-2 text-[11px] text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Secure Reception Pass:</strong> Scans securely at verified hospital kiosks without exposing private clinical notes or diagnoses.
                </span>
              </div>

              {/* Action Buttons: Add to Calendar & Get Directions */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadCalendar}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Add to Calendar</span>
                </button>

                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span>Get Directions</span>
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
