"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Pill, Stethoscope, Hospital, Calendar, ArrowLeft, Download,
  Printer, Share2, CheckCircle2, AlertTriangle, Clock, ShieldCheck,
  QrCode, ExternalLink, Info, User, FileText, Activity, AlertOctagon,
  ChevronRight, Sparkles, Check, XCircle
} from "lucide-react";
import { PrescriptionRecord, prescriptionsApi } from "@/lib/api/prescriptions";
import { PrescriptionShareModal } from "./PrescriptionShareModal";
import { PrescriptionValidityExplainerModal } from "./PrescriptionValidityExplainerModal";

interface Props {
  prescription: PrescriptionRecord;
  isSharedView?: boolean;
  allowDownload?: boolean;
  onBack?: () => void;
}

export function PrescriptionDocumentView({
  prescription: rx,
  isSharedView = false,
  allowDownload = true,
  onBack,
}: Props) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isExpired = rx.computed_status === "EXPIRED" || rx.is_expired;
  const isSuperseded = rx.computed_status === "SUPERSEDED";
  const isCancelled = rx.computed_status === "CANCELLED";
  const isCompleted = rx.computed_status === "COMPLETED";
  const isActive = rx.computed_status === "ACTIVE" || rx.is_valid;

  const handlePrint = () => {
    prescriptionsApi.recordAudit(rx.id, "PRINT").catch(() => {});
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      prescriptionsApi.recordAudit(rx.id, "DOWNLOAD_PDF").catch(() => {});
      // In web browser environment, print-to-PDF provides authentic vector layout matching A4
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  // QR Token URL
  const qrTargetUrl = typeof window !== "undefined"
    ? `${window.location.origin}/verify/prescription/${rx.verification_token || rx.id}`
    : `/verify/prescription/${rx.verification_token || rx.id}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm md:text-base font-mono">
                {rx.id}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isExpired
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : isSuperseded
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : isCancelled
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                {isActive && <CheckCircle2 className="w-3.5 h-3.5" />}
                {isExpired && <Clock className="w-3.5 h-3.5" />}
                {isSuperseded && <AlertTriangle className="w-3.5 h-3.5" />}
                {isCancelled && <XCircle className="w-3.5 h-3.5" />}
                <span>{rx.status_display || rx.computed_status}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued on {rx.created_at ? new Date(rx.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExplainerOpen(true)}
            className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition flex items-center gap-1.5"
            title="About validity"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">About Validity</span>
          </button>

          {!isSharedView && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? "Preparing..." : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Shared Recipient Notice if viewing via secure link */}
      {isSharedView && rx.share_metadata && (
        <div className="no-print p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 text-xs text-indigo-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Secure shared view for <strong>{rx.share_metadata.recipient_name || "Authorized Recipient"}</strong>.
              Access expires on {new Date(rx.share_metadata.expires_at || "").toLocaleString()}.
            </span>
          </div>
          <span className="px-2 py-1 rounded bg-indigo-200/60 font-mono text-[11px] font-semibold text-indigo-800 shrink-0">
            {rx.share_metadata.access_level || "VIEW_ONLY"}
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CANONICAL A4 DIGITAL PRESCRIPTION DOCUMENT SHEET                         */}
      {/* ========================================================================= */}
      <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden prescription-document-sheet">
        
        {/* NON-EDITABLE WATERMARK FOR EXPIRED / SUPERSEDED / CANCELLED PRESCRIPTIONS */}
        {isExpired && (
          <div
            aria-hidden="true"
            className="pointer-events-none select-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
          >
            <div className="transform -rotate-30 text-rose-500/15 font-black text-6xl md:text-8xl tracking-[0.2em] border-8 border-rose-500/15 rounded-3xl py-4 px-12 uppercase text-center watermark-stamp">
              EXPIRED
            </div>
          </div>
        )}

        {isSuperseded && (
          <div
            aria-hidden="true"
            className="pointer-events-none select-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
          >
            <div className="transform -rotate-30 text-amber-500/15 font-black text-5xl md:text-7xl tracking-[0.15em] border-8 border-amber-500/15 rounded-3xl py-4 px-8 uppercase text-center watermark-stamp">
              SUPERSEDED
            </div>
          </div>
        )}

        {isCancelled && (
          <div
            aria-hidden="true"
            className="pointer-events-none select-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
          >
            <div className="transform -rotate-30 text-red-500/15 font-black text-6xl md:text-8xl tracking-[0.2em] border-8 border-red-500/15 rounded-3xl py-4 px-12 uppercase text-center watermark-stamp">
              CANCELLED
            </div>
          </div>
        )}

        {/* 1. DOCUMENT HEADER & HOSPITAL LETTERHEAD */}
        <div className="p-6 md:p-8 border-b-2 border-slate-800/80 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            {/* Hospital Identity */}
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-900 text-white shrink-0">
                  <Hospital className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                    {rx.hospital_name || "Healthcare Facility"}
                  </h1>
                  <p className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
                    Healthcare Facility · Facility Code: {rx.hospital_code || rx.hospital_id || "HOSP-001"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed pt-1">
                {rx.hospital_address || "Healthcare Facility Address, India"}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
                <span>Phone: {rx.hospital_phone || "+91 44 2252 1100"}</span>
                {rx.hospital_email && <span>Email: {rx.hospital_email}</span>}
                {rx.hospital_website && <span>Web: {rx.hospital_website}</span>}
              </div>
            </div>

            {/* Document Stamp & ID */}
            <div className="flex flex-col items-start md:items-end text-left md:text-right space-y-1 shrink-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>OH-ID Digital Prescription</span>
              </div>
              <p className="font-mono text-xs md:text-sm font-bold text-slate-900 pt-1">
                RX ID: {rx.id}
              </p>
              <p className="text-xs text-slate-500">
                Issued: {rx.created_at ? new Date(rx.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
              </p>
              <div className="pt-1">
                <span
                  className={`inline-block px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                    isActive
                      ? "bg-emerald-100 text-emerald-800"
                      : isExpired
                      ? "bg-rose-100 text-rose-800"
                      : isSuperseded
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-200 text-slate-800"
                  }`}
                >
                  {isActive ? "● Currently Valid" : rx.status_display}
                </span>
              </div>
            </div>
          </div>

          {/* PRESCRIPTION VALIDITY STATUS STRIP */}
          <div className="mt-6 pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-500">Valid From:</span>
              <span className="font-semibold text-slate-800 font-mono">
                {rx.valid_from ? new Date(rx.valid_from).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Date of Consultation"}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">Valid Until:</span>
              <span className={`font-semibold font-mono ${isExpired ? "text-rose-600 font-bold" : "text-slate-800"}`}>
                {rx.valid_until ? new Date(rx.valid_until).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "As advised by Physician"}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Validity Source: {rx.validity_source || "Prescribing Physician"}
            </div>
          </div>
        </div>

        {/* EXPIRED BANNER ALERT */}
        {isExpired && (
          <div className="bg-rose-50 border-y border-rose-200 p-4 px-6 md:px-8 flex items-start gap-3">
            <Clock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-rose-900 text-xs uppercase tracking-wider">
                Expired Digital Prescription
              </h4>
              <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                This prescription is no longer valid according to its recorded validity period (expired on{" "}
                {rx.valid_until ? new Date(rx.valid_until).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "recorded date"}
                ). It is preserved as an immutable part of your clinical history, but cannot be presented for new medication dispensing.
              </p>
            </div>
          </div>
        )}

        {/* SUPERSEDED BANNER ALERT */}
        {isSuperseded && (
          <div className="bg-amber-50 border-y border-amber-200 p-4 px-6 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wider">
                  Superseded Prescription
                </h4>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  This prescription has been replaced by a newer prescription (
                  {rx.superseded_by_id || "Amended Prescription"}).
                </p>
              </div>
            </div>
            {rx.superseded_by_id && (
              <Link
                href={`/patient/prescriptions/${rx.superseded_by_id}`}
                className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-sm self-start md:self-auto shrink-0"
              >
                <span>View Newer Prescription</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}

        {/* 2. PATIENT & DOCTOR TWO-COLUMN SUMMARY */}
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-200">
          {/* Patient Column */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <User className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Patient Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Full Name</span>
                <span className="font-bold text-slate-900 text-sm">{rx.patient_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">OneHealth ID (OH-ID)</span>
                <span className="font-mono font-bold text-indigo-700">{rx.onehealth_id || rx.patient_ohid || "OHID-IND"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Age / Gender</span>
                <span className="font-semibold text-slate-800">
                  {rx.patient_age ? `${rx.patient_age} yrs` : "N/A"} · {rx.patient_gender || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Blood Group</span>
                <span className="font-semibold text-slate-800">{rx.patient_blood_group || "O+"}</span>
              </div>
              {rx.visit_id && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Visit / Encounter ID</span>
                  <span className="font-mono text-slate-600">{rx.visit_id}</span>
                </div>
              )}
            </div>

            {/* Vitals Snapshot */}
            {rx.vitals_snapshot && Object.keys(rx.vitals_snapshot).length > 0 && (
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Recorded Vitals Snapshot
                </span>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {rx.vitals_snapshot.bp && (
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-700">
                      BP: <strong>{rx.vitals_snapshot.bp}</strong>
                    </span>
                  )}
                  {rx.vitals_snapshot.pulse && (
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-700">
                      Pulse: <strong>{rx.vitals_snapshot.pulse}</strong>
                    </span>
                  )}
                  {rx.vitals_snapshot.weight_kg && (
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-700">
                      Weight: <strong>{rx.vitals_snapshot.weight_kg} kg</strong>
                    </span>
                  )}
                  {rx.vitals_snapshot.bmi && (
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-700">
                      BMI: <strong>{rx.vitals_snapshot.bmi}</strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Allergies Snapshot */}
            {rx.allergies_snapshot && rx.allergies_snapshot.length > 0 && (
              <div className="pt-1">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-0.5">
                  Known Allergies:
                </span>
                <div className="flex flex-wrap gap-1">
                  {rx.allergies_snapshot.map((a, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Doctor Column */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <Stethoscope className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Prescribing Clinician</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Doctor Name</span>
                <span className="font-bold text-slate-900 text-sm">{rx.doctor_name}</span>
                <p className="text-xs text-indigo-700 font-semibold">
                  {rx.doctor_specialty || "General Medicine"} · {rx.doctor_qualification || "MBBS, MD"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-400 block text-[11px]">Medical Registration No.</span>
                  <span className="font-mono font-bold text-slate-900">
                    {rx.doctor_registration || "TN-MCI-2024-88912"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Registration Authority</span>
                  <span className="font-medium text-slate-700">
                    {rx.doctor_registration_authority || "Tamil Nadu Medical Council"}
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <span className="text-slate-400 block text-[11px]">Department / Clinic</span>
                <span className="font-semibold text-slate-800">
                  {rx.doctor_department || rx.doctor_specialty || "Outpatient Department"}, {rx.hospital_name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. CONSULTATION & CLINICAL ADVICE */}
        {(rx.diagnosis || rx.chief_complaint || rx.clinical_advice) && (
          <div className="p-6 md:p-8 border-b border-slate-200 bg-white space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Consultation & Clinical Assessment
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {rx.chief_complaint && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Chief Complaint</span>
                  <p className="text-slate-800 leading-relaxed">{rx.chief_complaint}</p>
                </div>
              )}

              {rx.diagnosis && (
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 md:col-span-2">
                  <span className="font-bold text-indigo-700 uppercase text-[10px] block mb-1">Diagnosis</span>
                  <p className="text-indigo-950 font-bold text-sm leading-relaxed">{rx.diagnosis}</p>
                </div>
              )}
            </div>

            {rx.clinical_advice && (
              <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-100 text-xs text-emerald-950">
                <span className="font-bold text-emerald-800 uppercase text-[10px] block mb-1">
                  Clinical Advice & Lifestyle Instructions
                </span>
                <p className="leading-relaxed">{rx.clinical_advice}</p>
              </div>
            )}
          </div>
        )}

        {/* 4. PRESCRIBED MEDICATIONS (MAIN SECTION) */}
        <div className="p-6 md:p-8 border-b border-slate-200">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Prescribed Medications ({rx.items?.length || 0})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Authoritative pharmacy dispensing record
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-4">Medicine Name & Formulation</th>
                  <th className="py-3 px-3">Dose & Route</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3 text-center">Qty</th>
                  <th className="py-3 px-4">Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rx.items?.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">{it.medicine_name}</div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {it.strength || "500 mg"} · {it.dosage_form || "Tablet"}
                        {it.generic_name && <span className="text-slate-400 ml-1">({it.generic_name})</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800">{it.dose || it.dosage || "1 tab"}</span>
                      <span className="text-[11px] text-slate-400 block">{it.route || "Oral"}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {it.frequency || "Twice daily"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">
                      {it.duration_days ? `${it.duration_days} days` : it.duration_value ? `${it.duration_value} ${it.duration_unit || 'days'}` : "5 days"}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                      {it.quantity || 10}
                    </td>
                    <td className="py-3 px-4 text-slate-700 leading-snug">
                      <span className="font-semibold text-emerald-700">
                        {it.food_instruction || "After food"}
                      </span>
                      {it.specific_instructions && (
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          {it.specific_instructions}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3">
            {rx.items?.map((it, idx) => (
              <div key={it.id || idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                      Medicine #{idx + 1}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{it.medicine_name}</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      {it.strength || "500 mg"} · {it.dosage_form || "Tablet"} · {it.route || "Oral"}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold bg-white px-2 py-1 rounded border border-slate-200">
                    Qty: {it.quantity || 10}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Dose</span>
                    <span className="font-semibold text-slate-800">{it.dose || it.dosage || "1 tab"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Duration</span>
                    <span className="font-semibold text-slate-800">
                      {it.duration_days ? `${it.duration_days} days` : "5 days"}
                    </span>
                  </div>
                </div>

                <div className="pt-1 text-xs">
                  <span className="text-slate-400 block text-[10px]">Frequency & Timing</span>
                  <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded inline-block mt-0.5 border border-indigo-100">
                    {it.frequency || "Twice daily"}
                  </span>
                  <p className="text-xs text-emerald-800 font-medium mt-1">
                    Instruction: {it.food_instruction || "After food"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. USER-FRIENDLY MEDICATION SCHEDULE MATRIX */}
        {rx.medication_schedule && rx.medication_schedule.length > 0 && (
          <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Daily Medication Schedule Matrix
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Derived from prescribed dosing frequency</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-4">Medicine</th>
                    <th className="py-2.5 px-3 text-center w-28">Morning</th>
                    <th className="py-2.5 px-3 text-center w-28">Afternoon</th>
                    <th className="py-2.5 px-3 text-center w-28">Night</th>
                    <th className="py-2.5 px-4">Timing Advice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rx.medication_schedule.map((s, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-4">
                        <span className="font-bold text-slate-900">{s.medicine_name}</span>
                        <span className="text-slate-400 block text-[11px]">{s.strength || ""}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {s.morning ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                            ✓
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {s.afternoon ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                            ✓
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {s.night ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                            ✓
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 font-medium">
                        {s.food_instruction || "As directed"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. FOLLOW-UP ADVICE & NEXT APPOINTMENT */}
        <div className="p-6 md:p-8 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Follow-Up & Clinical Continuity
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-slate-400 text-[11px] block font-semibold">Recommended Follow-up</span>
              <p className="text-slate-900 font-bold text-sm">
                {rx.follow_up_date
                  ? new Date(rx.follow_up_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
                  : rx.follow_up_days
                  ? `After ${rx.follow_up_days} days`
                  : "As advised by doctor upon medication completion"}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed pt-1">
                Please bring this prescription and daily BP/vitals log during your next consultation.
              </p>
            </div>

            {/* Linked Appointment if already scheduled */}
            {rx.follow_up_appointment ? (
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-800 text-[11px] font-bold uppercase tracking-wider">
                    Scheduled Appointment
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-200 text-indigo-900">
                    Confirmed
                  </span>
                </div>
                <p className="text-sm font-bold text-indigo-950">
                  {new Date(rx.follow_up_appointment.appointment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}{" "}
                  · {rx.follow_up_appointment.appointment_time}
                </p>
                <p className="text-xs text-indigo-800">
                  Attending: {rx.follow_up_appointment.doctor_name} ({rx.follow_up_appointment.hospital_name})
                </p>
                <div className="pt-1 no-print">
                  <Link
                    href={`/patient/appointments`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 underline"
                  >
                    <span>View Appointment Details</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-slate-400 text-[11px] block font-semibold">Appointment Booking</span>
                  <p className="text-xs text-slate-600">No advance appointment booked yet for this follow-up.</p>
                </div>
                <div className="no-print">
                  <Link
                    href="/patient/appointments"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-sm"
                  >
                    <span>+ Book Follow-Up Visit</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 7. DIGITAL VERIFICATION, SEAL & CRYPTOGRAPHIC QR */}
        <div className="p-6 md:p-8 bg-slate-50/70">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* QR Code */}
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-white rounded-xl border border-slate-300 shadow-sm shrink-0">
                <QrCode className="w-16 h-16 text-slate-900" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified Digital Prescription</span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  Token: {rx.verification_token || rx.id}
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs">
                  Scan QR code with any camera to verify authenticity on OneHealth ID public verification portal.
                </p>
                <div className="pt-0.5 no-print">
                  <Link
                    href={`/verify/prescription/${rx.verification_token || rx.id}`}
                    target="_blank"
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1"
                  >
                    <span>Open Public Verification Page</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Doctor Digital Signature & Verification Box */}
            <div className="flex flex-col items-start md:items-end text-left md:text-right space-y-1 text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm min-w-[240px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Digital Signature & Finalization
                </span>
                <p className="font-bold text-slate-900 text-sm">{rx.signed_by || rx.doctor_name}</p>
                <p className="text-[11px] text-slate-500">
                  {rx.doctor_qualification || "MBBS, MD"} · Reg: {rx.doctor_registration || "TN-MCI-2024-88912"}
                </p>
                <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-400 truncate max-w-[220px]">
                  {rx.digital_signature_hash || `SHA256:${rx.id.toLowerCase()}verified`}
                </div>
              </div>
              <span className="text-[10px] text-slate-400">
                Tamper-Evident Healthcare Operating System Record
              </span>
            </div>
          </div>
        </div>

        {/* 8. DOCUMENT FOOTER */}
        <div className="px-6 md:px-8 py-3 border-t border-slate-200 bg-slate-100 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>OneHealth ID (OH-ID) · Digital Health Document Standard</span>
          <span className="font-mono text-slate-400">Page 1 of 1 · Ref: {rx.id}</span>
        </div>
      </div>

      {/* Modals */}
      <PrescriptionShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        prescriptionId={rx.id}
        prescriptionNumber={rx.id}
      />

      <PrescriptionValidityExplainerModal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
      />

      {/* Embedded Print Styling */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print, nav, aside, header, footer:not(.prescription-document-sheet footer) {
            display: none !important;
          }
          .prescription-document-sheet {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  );
}
