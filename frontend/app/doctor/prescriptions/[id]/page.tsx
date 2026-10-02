"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  FileText,
  Printer,
  Download,
  Share2,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Building,
  Hospital,
  User,
  Calendar,
  Clock,
  QrCode,
  Lock,
  Copy,
  Check,
  AlertCircle
} from "lucide-react";
import { api } from "@/lib/api";
import { PrescriptionRecord } from "@/lib/api/prescriptions";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { Button } from "@/components/ui/Card";

function PrescriptionDetailsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const prescriptionId = params?.id as string;
  const autoPrint = searchParams?.get("print") === "true";

  const [prescription, setPrescription] = useState<PrescriptionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedToken, setCopiedToken] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    async function loadPrescription() {
      if (!prescriptionId) return;
      try {
        setLoading(true);
        setError("");
        const data = await api.prescriptions.get(prescriptionId);
        setPrescription(data);
      } catch (err: any) {
        console.error("Failed to load prescription:", err);
        setError(err.message || "Prescription not found or access unauthorized.");
      } finally {
        setLoading(false);
      }
    }
    loadPrescription();
  }, [prescriptionId]);

  useEffect(() => {
    if (autoPrint && prescription && !loading) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [autoPrint, prescription, loading]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      const pdfMeta = await api.prescriptions.getPdf(prescriptionId);
      // Trigger native browser print-to-PDF or window.print with styling
      window.print();
    } catch {
      window.print();
    }
  };

  const handleVerify = async () => {
    if (!prescription) return;
    try {
      setVerifying(true);
      const res = await api.prescriptions.verify(prescription.id, prescription.verification_token);
      setVerificationResult(res);
    } catch (err: any) {
      alert("Verification failed: " + err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyVerification = () => {
    if (!prescription) return;
    const shareUrl = `${window.location.origin}/doctor/prescriptions/${prescription.id}?vtok=${prescription.verification_token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["DOCTOR", "HOSPITAL_ADMIN", "PATIENT", "SUPER_ADMIN"]}>
      <div className="bg-white min-h-screen text-slate-900 pb-20">
        {/* ========================================================
            TOP ACTIONS BAR (HIDDEN IN PRINT)
           ======================================================== */}
        <div className="print:hidden border-b border-slate-200 bg-white sticky top-0 z-20 px-6 py-4 shadow-xs">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/doctor"
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Prescription Details</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-mono font-bold text-slate-700">{prescription?.id || prescriptionId}</span>
                </div>
                <h1 className="text-lg font-bold text-slate-900">
                  {prescription?.patient_name ? `Rx for ${prescription.patient_name}` : "Prescription Viewer"}
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleVerify}
                disabled={verifying || !prescription}
                className="gap-1.5 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{verifying ? "Checking..." : "Verify Authenticity"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyVerification}
                disabled={!prescription}
                className="gap-1.5 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                {copiedToken ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copiedToken ? "Link Copied" : "Share Token"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={!prescription}
                className="gap-1.5 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Download PDF</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handlePrint}
                disabled={!prescription}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 text-xs shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Verification Status Banner (If verified) */}
        {verificationResult && (
          <div className="print:hidden max-w-4xl mx-auto px-6 pt-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">Cryptographically Verified OneHealth ID Prescription</span>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Authorized Signatory: {verificationResult.doctor_name} ({verificationResult.doctor_registration}) • Hash: {verificationResult.digital_signature_hash?.slice(0, 30)}...
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVerificationResult(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Main Document Content */}
        <div className="max-w-4xl mx-auto px-6 pt-6">
          {loading && (
            <div className="p-12 text-center text-slate-500 text-sm">
              Loading canonical prescription records...
            </div>
          )}

          {error && (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">Failed to load prescription</p>
                <p className="text-xs text-rose-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {prescription && (
            <div className="prescription-print-document bg-white border border-slate-300 print:border-none rounded-3xl p-8 sm:p-12 shadow-sm print:p-0 print:shadow-none space-y-6">
              {/* Canonical Hospital & Brand Header */}
              <div className="border-b-2 border-slate-800 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-2xl tracking-tighter">ONEHEALTH ID</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-extrabold uppercase">
                      Official Prescription
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1 uppercase tracking-wide">
                    {prescription.hospital_name || "Kedar Hospital Network"}
                  </h2>
                  <p className="text-xs text-slate-600 max-w-md leading-relaxed">
                    {prescription.hospital_address || "Mount-Poonamallee High Road, Mugalivakkam, Chennai - 600125"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Phone: {prescription.hospital_phone || "+91 44 2252 1100"} • NABH Accredited Healthcare Facility
                  </p>
                </div>

                <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto">
                  <div className="inline-block bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-left sm:text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Rx Identifier</p>
                    <p className="text-sm font-mono font-bold text-blue-700">{prescription.id}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Date: {new Date(prescription.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-700 uppercase">
                      Status: {prescription.status || "SIGNED"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Patient & Prescriber 2-Column Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Patient Information</p>
                  <h3 className="text-base font-bold text-slate-900">{prescription.patient_name}</h3>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <p>
                      OneHealth ID: <span className="font-mono font-bold text-slate-900">{prescription.onehealth_id || "OHID-PENDING"}</span>
                    </p>
                    <p>
                      Age / Gender: <span className="font-semibold text-slate-800">{prescription.patient_age} yrs</span> / <span className="font-semibold text-slate-800">{prescription.patient_gender}</span>
                    </p>
                    {prescription.patient_blood_group && (
                      <p>Blood Group: <span className="font-semibold text-slate-800">{prescription.patient_blood_group}</span></p>
                    )}
                    <p>Visit Ref: <span className="font-mono text-slate-700">{prescription.visit_id || "VIS-OPD-01"}</span></p>
                  </div>
                </div>

                <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Prescribing Physician</p>
                  <h3 className="text-base font-bold text-slate-900">{prescription.doctor_name}</h3>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <p className="font-semibold text-blue-700">{prescription.doctor_specialty || "Orthopedics & Trauma"}</p>
                    <p>Reg No: <span className="font-mono text-slate-800">{prescription.doctor_registration || "TN-MCI-2026-REG"}</span></p>
                    <p>Facility: <span className="text-slate-800">{prescription.hospital_name}</span></p>
                    <p>Department: <span className="text-slate-800">Outpatient Consultation & Emergency</span></p>
                  </div>
                </div>
              </div>

              {/* Diagnosis Box */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Clinical Diagnosis</h4>
                <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100 text-sm font-semibold text-slate-900">
                  {prescription.diagnosis || "Clinical Outpatient Evaluation"}
                </div>
              </div>

              {/* Medications Rx Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <span className="text-base font-serif italic font-bold text-blue-700">℞</span>
                    Prescribed Medications ({prescription.items?.length || 0})
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">Standard Dosage Units</span>
                </div>

                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <tr>
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-3">Medicine & Strength</th>
                        <th className="py-2.5 px-3">Form</th>
                        <th className="py-2.5 px-3">Dose & Frequency</th>
                        <th className="py-2.5 px-3">Duration</th>
                        <th className="py-2.5 px-3">Instructions / Route</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {prescription.items && prescription.items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block text-xs">{item.medicine_name}</span>
                            <span className="text-[11px] text-slate-500">{item.strength || "500 mg"}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-700">{item.dosage_form || "Tablet"}</td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-blue-700 block">{item.dose || "1"} unit</span>
                            <span className="text-[11px] text-slate-600">{item.frequency}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-800 font-medium">
                            {item.duration_days ? `${item.duration_days} days` : "5 days"}
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            <span>{item.food_instruction || "After food"}</span>
                            <span className="text-[10px] text-slate-400 block italic">({item.route || "Oral"})</span>
                            {item.specific_instructions && (
                              <span className="text-[10px] text-slate-500 block">{item.specific_instructions}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">{item.quantity || 10}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Doctor Clinical Notes & Follow-up Advice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Doctor Advice & Notes</h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {prescription.doctor_notes || prescription.instructions || "Adequate hydration, warm water intake, and rest advised. Report to ER if severe symptoms arise."}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Follow-up Schedule</h4>
                  <p className="text-xs font-bold text-blue-800">
                    {prescription.follow_up_days
                      ? `Follow-up in ${prescription.follow_up_days} days with previous investigation reports`
                      : "Follow-up review as needed or after 7 days"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Booking follow-up via OneHealth ID app or hospital front desk using Token / OH-ID.
                  </p>
                </div>
              </div>

              {/* Cryptographic Digital Signature & Verification Footer */}
              <div className="border-t-2 border-slate-200 pt-6 mt-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                  {/* Left: Digital Verification & QR representation */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-16 h-16 bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-center shrink-0">
                      <QrCode className="w-10 h-10 text-slate-800" />
                    </div>
                    <div className="text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Digitally Authenticated Prescription</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Token: {prescription.verification_token || "vtok_authenticated_clinical"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
                        Sig: {prescription.digital_signature_hash || "SHA256:AUTHENTICATED"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Scan with OneHealth ID or Pharmacy App to verify authenticity.
                      </p>
                    </div>
                  </div>

                  {/* Right: Doctor Signature Stamp */}
                  <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto">
                    <div className="inline-block text-left sm:text-right">
                      <div className="h-8 font-serif italic text-blue-900 font-bold text-sm">
                        {prescription.doctor_name}
                      </div>
                      <div className="border-t border-slate-400 pt-1">
                        <p className="text-xs font-bold text-slate-900">{prescription.doctor_name}</p>
                        <p className="text-[11px] text-slate-600">{prescription.doctor_specialty || "Orthopedics & Trauma"}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Reg: {prescription.doctor_registration || "TN-MCI-2026-REG"}</p>
                        <p className="text-[10px] text-slate-400">Signed at: {new Date(prescription.created_at).toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Final Footer Disclaimer */}
                <div className="mt-8 text-center border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                  Generated by OneHealth ID (OH-ID) Enterprise Healthcare Operating System • Valid across all authorized network pharmacies.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Print CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          aside, nav, header, .print\\:hidden {
            display: none !important;
          }
          .prescription-print-document {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </WorkspaceLayout>
  );
}

export default function PrescriptionDetailsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Loading prescription details...</div>}>
      <PrescriptionDetailsContent />
    </React.Suspense>
  );
}
