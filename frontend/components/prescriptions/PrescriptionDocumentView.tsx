"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Hospital, ArrowLeft, Download, Printer, Share2, ShieldCheck,
  Clock, AlertTriangle, User, Stethoscope, ChevronRight, Check, XCircle
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
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
  const isActive = rx.computed_status === "ACTIVE" || rx.is_valid || rx.status === "ACTIVE";

  const handlePrint = () => {
    prescriptionsApi.recordAudit(rx.id, "PRINT").catch(() => {});
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      prescriptionsApi.recordAudit(rx.id, "DOWNLOAD_PDF").catch(() => {});
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const qrTargetUrl = typeof window !== "undefined"
    ? `${window.location.origin}/verify/prescription/${rx.verification_token || rx.id}`
    : `https://onehealthid.in/verify/prescription/${rx.verification_token || rx.id}`;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
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
              <span className="font-mono font-bold text-slate-900 text-sm md:text-base">
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
                {isActive && "● Currently Valid"}
                {isExpired && "● Expired"}
                {isSuperseded && "● Superseded"}
                {isCancelled && "● Cancelled"}
                {!isActive && !isExpired && !isSuperseded && !isCancelled && (rx.status_display || rx.status || "SIGNED")}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued: {rx.created_at ? new Date(rx.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExplainerOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition flex items-center gap-1.5"
            title="About validity"
          >
            <span className="hidden sm:inline">About Validity</span>
          </button>

          {!isSharedView && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          {allowDownload && (
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? "Preparing..." : "Download PDF"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Shared Recipient Notice */}
      {isSharedView && rx.share_metadata && (
        <div className="no-print p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Secure shared view for <strong>{rx.share_metadata.recipient_name || "Authorized Recipient"}</strong>.
              Access expires on {new Date(rx.share_metadata.expires_at || "").toLocaleString()}.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-indigo-200/60 font-mono text-[11px] font-semibold text-indigo-800 shrink-0">
            {rx.share_metadata.access_level || "VIEW_ONLY"}
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CANONICAL CLINICAL DIGITAL PRESCRIPTION DOCUMENT (A4 SHEET)               */}
      {/* ========================================================================= */}
      <div className="relative bg-white rounded-2xl shadow-xl border border-slate-300 overflow-hidden prescription-document-sheet">
        
        {/* NON-EDITABLE WATERMARKS */}
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

        {/* 1. OFFICIAL HEALTHCARE FACILITY HEADER (HOSPITAL FIRST) */}
        <div className="p-4 md:p-5 print:p-3 print:pb-2 border-b border-slate-300 bg-white">
          <div className="flex flex-col md:flex-row print:flex-row md:items-start print:items-start justify-between gap-3">
            {/* Hospital Identity First */}
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-900 text-white shrink-0 print:border print:border-slate-800">
                  <Hospital className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl print:text-lg font-black text-slate-900 tracking-tight leading-tight uppercase">
                    {rx.hospital_name || "Healthcare Facility"}
                  </h1>
                  <p className="text-[10px] font-semibold text-slate-600 tracking-wide uppercase">
                    Accredited Healthcare Facility · Facility Code: {rx.hospital_code || rx.hospital_id || "HOSP-001"}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 max-w-lg leading-tight pt-0.5">
                {rx.hospital_address || "Healthcare Facility Address, India"}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                <span>Phone: {rx.hospital_phone || "Not recorded"}</span>
                {rx.hospital_email && <span>Email: {rx.hospital_email}</span>}
                {rx.hospital_website && <span>Web: {rx.hospital_website}</span>}
              </div>
            </div>

            {/* Document Title & Stamp */}
            <div className="flex flex-col items-start md:items-end print:items-end text-left md:text-right print:text-right shrink-0">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-extrabold uppercase tracking-wider print:border print:border-slate-800">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>DIGITAL PRESCRIPTION</span>
              </div>
              <p className="font-mono text-xs font-bold text-slate-900 pt-0.5">
                RX ID: {rx.id}
              </p>
              <p className="text-[10px] text-slate-500">
                Issued: {rx.created_at ? new Date(rx.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
              </p>
            </div>
          </div>

          {/* Structured Prescription Metadata & Validity Panel */}
          <div className="mt-2.5 pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200/80">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Prescription Status</span>
              <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase mt-0.5 ${
                isActive ? "bg-emerald-100 text-emerald-800" :
                isExpired ? "bg-rose-100 text-rose-800" :
                isSuperseded ? "bg-amber-100 text-amber-800" :
                isCancelled ? "bg-red-100 text-red-800" : "bg-slate-200 text-slate-800"
              }`}>
                {isActive ? "ACTIVE" : isExpired ? "EXPIRED" : isSuperseded ? "SUPERSEDED" : isCancelled ? "CANCELLED" : rx.status || "SIGNED"}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Valid From</span>
              <span className="font-semibold text-slate-900 font-mono text-[11px]">
                {rx.valid_from ? new Date(rx.valid_from).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) :
                 rx.validity_period_not_specified ? "Not specified" :
                 rx.created_at ? new Date(rx.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Valid Until</span>
              <span className={`font-semibold font-mono text-[11px] ${isExpired ? "text-rose-600 font-bold" : "text-slate-900"}`}>
                {rx.valid_until ? new Date(rx.valid_until).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) :
                 "Validity period not specified"}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Validity Source</span>
              <span className="font-semibold text-slate-700 text-[11px]">
                {rx.valid_until ? "Prescribing Physician" : "Validity period not specified"}
              </span>
            </div>
          </div>
        </div>

        {/* EXPIRED BANNER ALERT */}
        {isExpired && (
          <div className="bg-rose-50 border-b border-rose-200 p-2.5 px-4 flex items-start gap-2">
            <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-rose-900 text-[10px] uppercase tracking-wider">
                Expired Digital Prescription
              </h4>
              <p className="text-[11px] text-rose-800 mt-0.5 leading-tight">
                This prescription is no longer valid according to its recorded validity period. It is preserved for clinical history but cannot be dispensed.
              </p>
            </div>
          </div>
        )}

        {/* SUPERSEDED BANNER ALERT */}
        {isSuperseded && (
          <div className="bg-amber-50 border-b border-amber-200 p-2.5 px-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <div>
                <h4 className="font-bold text-amber-900 text-[10px] uppercase tracking-wider">
                  Superseded Prescription
                </h4>
                <p className="text-[11px] text-amber-800 leading-tight">
                  This prescription has been replaced by a newer prescription ({rx.superseded_by_id || "Amended Prescription"}).
                </p>
              </div>
            </div>
            {rx.superseded_by_id && (
              <Link
                href={`/patient/prescriptions/${rx.superseded_by_id}`}
                className="no-print inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                <span>View Newer Prescription</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}

        {/* 2. PATIENT & PRESCRIBER TWO-COLUMN DIFFERENTIATED CARDS */}
        <div className="p-3.5 md:p-4 print:p-2.5 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3 border-b border-slate-300 patient-prescriber-section bg-slate-50/40">
          {/* PATIENT DETAILS CARD */}
          <div className="p-3 print:p-2 rounded-xl bg-white border border-slate-300 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-700" />
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Patient Details</h3>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                {rx.onehealth_id || rx.patient_ohid || "OHID-IND-2026-01001"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 text-[11px]">
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-semibold">Full Name</span>
                <span className="font-bold text-slate-900 text-xs">{rx.patient_name || "Patient"}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-semibold">Age / Gender</span>
                <span className="font-semibold text-slate-800">
                  {rx.patient_age ? `${rx.patient_age} yrs` : "N/A"} · {rx.patient_gender || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-semibold">Visit / Encounter Ref</span>
                <span className="font-mono text-slate-800 font-semibold">{rx.visit_id || rx.encounter_id || "VIS-OPD-01"}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-semibold">Medical Record (MRN)</span>
                <span className="font-mono text-slate-800">{rx.patient_mrn || rx.patient_id || "MRN-001"}</span>
              </div>
              {rx.vitals_snapshot && typeof rx.vitals_snapshot === "object" && (
                <div className="col-span-2 pt-0.5 border-t border-slate-100 text-[10px]">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold block">Recorded Vitals</span>
                  <div className="flex flex-wrap gap-2 text-slate-700 mt-0.5">
                    {rx.vitals_snapshot.bp && <span>BP: <strong>{rx.vitals_snapshot.bp}</strong></span>}
                    {rx.vitals_snapshot.pulse && <span>Pulse: <strong>{rx.vitals_snapshot.pulse}</strong></span>}
                    {rx.vitals_snapshot.temp && <span>Temp: <strong>{rx.vitals_snapshot.temp}</strong></span>}
                  </div>
                </div>
              )}
              <div className="col-span-2 pt-0.5 border-t border-slate-100">
                <span className="text-[9px] text-slate-400 block uppercase font-semibold">Allergies & Status</span>
                <div className="mt-0.5">
                  {rx.allergies_snapshot && Array.isArray(rx.allergies_snapshot) && rx.allergies_snapshot.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {rx.allergies_snapshot.map((al: any, i: number) => (
                        <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[9px] font-bold">
                          <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                          {typeof al === "string" ? al : al.allergen || al.substance || "Allergy"}
                        </span>
                      ))}
                    </div>
                  ) : rx.allergies_snapshot && Array.isArray(rx.allergies_snapshot) && rx.allergies_snapshot.length === 0 ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-semibold">
                      <Check className="w-2.5 h-2.5 text-emerald-600" />
                      No Known Drug Allergies (NKDA)
                    </span>
                  ) : (
                    <span className="text-slate-500 italic text-[10px]">Allergy history not recorded</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* PRESCRIBER DETAILS CARD */}
          <div className="p-3 print:p-2 rounded-xl bg-white border border-slate-300 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <div className="flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Prescriber Details</h3>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                {rx.signed_at || rx.digital_signature_hash ? "SIGNED & AUTHENTICATED" : "AUTHOR"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 text-[11px]">
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-semibold">Physician Name</span>
                <span className="font-bold text-slate-900 text-xs">{rx.doctor_name || "Consulting Physician"}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-semibold">Specialty / Title</span>
                <span className="font-semibold text-blue-700">{rx.doctor_specialty || "General Medicine"}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-semibold">Professional Reg No</span>
                <span className="font-mono text-slate-800 font-bold">{rx.doctor_registration || "Not recorded"}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-semibold">Registration Authority</span>
                <span className="text-slate-800 font-medium">{rx.doctor_registration_authority || "Not recorded"}</span>
              </div>
              <div className="col-span-2 pt-0.5 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-semibold">Facility & Department</span>
                  <span className="text-slate-800 font-medium text-[10px]">{rx.hospital_name || "Healthcare Facility"} · {rx.doctor_department || "Outpatient Consultation"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 block uppercase font-semibold">Signed Timestamp</span>
                  <span className="text-slate-700 font-mono text-[10px]">
                    {rx.signed_at || rx.created_at ? new Date(rx.signed_at || rx.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. CLINICAL DIAGNOSIS DEDICATED SECTION */}
        <div className="p-3 md:p-3.5 print:p-2 print:px-3 border-b border-slate-300 diagnosis-section bg-white">
          <div className="p-2.5 print:p-1.5 rounded-lg bg-blue-50/60 border border-blue-200/90 flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center justify-between gap-1.5">
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-800 block">
                Clinical Diagnosis
              </span>
              <h4 className="text-xs font-bold text-slate-900 mt-0.5">
                {rx.diagnosis || "Clinical Outpatient Evaluation"}
              </h4>
            </div>
            {rx.diagnosis_code && (
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono text-[10px] font-bold shrink-0 self-start sm:self-auto">
                ICD: {rx.diagnosis_code}
              </span>
            )}
          </div>
        </div>

        {/* 4. PRESCRIBED MEDICATION TABLE */}
        <div className="p-3 md:p-3.5 print:p-2 print:px-3 border-b border-slate-300 space-y-1.5 medications-section bg-white">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <span className="text-sm font-serif italic font-bold text-blue-700">℞</span>
              Prescribed Medicines ({rx.items?.length || 0})
            </h3>
            <span className="text-[9px] font-mono text-slate-400 uppercase">
              Prescriber Authorized Formulation
            </span>
          </div>

          <div className="border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs print:text-[10px] border-collapse">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 uppercase text-[9px] tracking-wider">
                <tr>
                  <th className="py-1.5 px-2 w-6 text-center">#</th>
                  <th className="py-1.5 px-2">Medicine</th>
                  <th className="py-1.5 px-2">Strength / Form</th>
                  <th className="py-1.5 px-2">Dose</th>
                  <th className="py-1.5 px-2">Route / Frequency</th>
                  <th className="py-1.5 px-2">Duration</th>
                  <th className="py-1.5 px-2 text-center">Qty</th>
                  <th className="py-1.5 px-2">Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rx.items && rx.items.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-1.5 px-2 text-center font-bold text-slate-400 text-[10px]">{idx + 1}</td>
                    <td className="py-1.5 px-2">
                      <span className="font-bold text-slate-900 block text-xs print:text-[10px] tracking-tight">{item.medicine_name}</span>
                      {item.generic_name && (
                        <span className="text-[9px] text-slate-500 block italic leading-tight">({item.generic_name})</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-slate-700 font-medium">
                      <span>{item.strength || "—"}</span>
                      {item.dosage_form && <span className="text-slate-400 block text-[9px]">{item.dosage_form}</span>}
                    </td>
                    <td className="py-1.5 px-2 text-slate-800 font-semibold">
                      {item.dose || "1 unit"}
                    </td>
                    <td className="py-1.5 px-2">
                      <span className="font-semibold text-blue-800 block text-[11px] print:text-[10px] leading-tight">{item.frequency || "As directed"}</span>
                      <span className="text-[9px] text-slate-500 block">Route: {item.route || "Oral"}</span>
                    </td>
                    <td className="py-1.5 px-2 text-slate-800 font-medium">
                      {item.duration_days ? `${item.duration_days} days` : item.duration || "—"}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold text-slate-900 font-mono">
                      {item.quantity || "—"}
                    </td>
                    <td className="py-1.5 px-2 text-slate-700 text-[11px] print:text-[10px]">
                      <span>{item.food_instruction || "—"}</span>
                      {item.specific_instructions && (
                        <span className="text-[9px] text-slate-500 block leading-tight">{item.specific_instructions}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. DOCTOR ADVICE & FOLLOW-UP SECTIONS */}
        <div className="p-3 md:p-3.5 print:p-2 print:px-3 border-b border-slate-300 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3 advice-followup-section bg-slate-50/30">
          <div className="p-2.5 print:p-2 rounded-lg bg-white border border-slate-200/90 space-y-0.5 shadow-2xs">
            <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-500">
              Doctor's Advice & Patient Instructions
            </h4>
            <p className="text-[11px] print:text-[10px] text-slate-800 leading-snug font-medium">
              {rx.doctor_notes || rx.instructions || "Adequate hydration, low-sodium balanced diet, and prescribed medication compliance advised."}
            </p>
          </div>

          <div className="p-2.5 print:p-2 rounded-lg bg-white border border-slate-200/90 space-y-0.5 shadow-2xs">
            <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-500">
              Follow-up Recommendation
            </h4>
            <p className="text-[11px] print:text-[10px] font-bold text-blue-900 leading-tight">
              {rx.follow_up_days
                ? `Recommended clinical follow-up in ${rx.follow_up_days} days`
                : rx.follow_up_date
                ? `Recommended review on: ${new Date(rx.follow_up_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}`
                : "Follow-up review as needed or if symptoms persist"}
            </p>
            <p className="text-[9px] text-slate-500 leading-tight">
              Note: This is a physician recommendation, not a confirmed appointment.
            </p>
            {rx.investigations_advised && (
              <div className="pt-0.5 text-[10px] text-slate-700">
                <span className="font-semibold text-slate-800">Advised Tests: </span>{rx.investigations_advised}
              </div>
            )}
          </div>
        </div>

        {/* 6. DEDICATED SIGNATURE & VERIFICATION AREA */}
        <div className="p-3 md:p-3.5 print:p-2 print:px-3 border-b border-slate-300 verification-section bg-white">
          <div className="flex flex-col sm:flex-row print:flex-row items-start sm:items-center print:items-center justify-between gap-4 p-2.5 rounded-lg bg-slate-50 border border-slate-300">
            {/* Left: QR Code & Verification Info */}
            <div className="flex items-center gap-3">
              <div className="p-1 bg-white border border-slate-300 rounded-lg shrink-0 shadow-2xs">
                <QRCodeCanvas
                  value={qrTargetUrl}
                  size={68}
                  level="M"
                  className="block"
                />
              </div>
              <div className="space-y-0.5 text-[11px] print:text-[10px]">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px] print:text-[10px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Authenticated Digital Prescription</span>
                </div>
                <p className="font-mono text-[10px] text-slate-800 font-bold">
                  Rx ID: {rx.id}
                </p>
                <p className="text-[9px] text-slate-500 font-mono">
                  Token: {rx.verification_token || rx.id}
                </p>
                <p className="text-[9px] text-slate-500 max-w-xs leading-tight">
                  Scan QR code or visit <span className="font-semibold text-blue-700">onehealthid.in/verify</span> to verify authenticity.
                </p>
              </div>
            </div>

            {/* Right: Prescriber Signature Block */}
            <div className="text-left sm:text-right print:text-right border-t sm:border-t-0 print:border-t-0 pt-2 sm:pt-0 print:pt-0 w-full sm:w-auto print:w-auto shrink-0">
              <div className="inline-block text-left sm:text-right print:text-right space-y-0.5">
                <div className="h-5 font-serif italic text-blue-900 font-bold text-xs tracking-wide">
                  {rx.doctor_name || "Authorized Clinician"}
                </div>
                <div className="border-t border-slate-400 pt-0.5">
                  <p className="text-[11px] print:text-[10px] font-bold text-slate-900">{rx.doctor_name || "Consulting Physician"}</p>
                  <p className="text-[10px] print:text-[9px] text-slate-600">{rx.doctor_specialty || "General Medicine"}</p>
                  <p className="text-[9px] text-slate-500 font-mono">Reg: {rx.doctor_registration || "Not recorded"}</p>
                  <p className="text-[9px] text-slate-400">
                    Signed: {rx.signed_at || rx.created_at ? new Date(rx.signed_at || rx.created_at).toLocaleDateString("en-IN") : "Signed electronically"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 7. DOCUMENT FOOTER */}
        <div className="px-4 py-2 print:py-1.5 bg-slate-100 text-[10px] print:text-[9px] text-slate-500 flex flex-col sm:flex-row print:flex-row items-center justify-between gap-1 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">{rx.hospital_name || "Healthcare Facility"}</span>
            <span>·</span>
            <span>OneHealth ID (OH-ID) Digital Health Document Standard</span>
          </div>
          <div className="font-mono text-slate-400 text-[9px]">
            Page 1 of 1 · Ref: {rx.id} · Confidential Medical Record
          </div>
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

      {/* Embedded A4 Print Styling */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print, nav, aside, header, footer:not(.prescription-document-sheet footer) {
            display: none !important;
          }
          .prescription-document-sheet {
            box-shadow: none !important;
            border: 1px solid #94a3b8 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .patient-prescriber-section {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
          }
          .advice-followup-section {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
          }
          .patient-prescriber-section,
          .diagnosis-section,
          .medications-section,
          .advice-followup-section,
          .verification-section {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .medications-section table tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
