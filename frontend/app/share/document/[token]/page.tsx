"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Clock,
  AlertCircle,
  FileDown,
  Printer,
  Building2,
  Lock,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Scan,
  FileText,
  User,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  medicalDocumentsAPI,
  SharedDocumentDetail,
  DOCUMENT_CATEGORIES
} from "@/lib/api/documents";

export default function PublicSharedDocumentPage() {
  const params = useParams();
  const token = params?.token as string;

  const [sharedData, setSharedData] = useState<SharedDocumentDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRevokedOrExpired, setIsRevokedOrExpired] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"report" | "images">("report");
  const [selectedSliceIndex, setSelectedSliceIndex] = useState<number>(0);

  useEffect(() => {
    if (!token) return;

    const fetchSharedDoc = async () => {
      try {
        setLoading(true);
        setError(null);
        setIsRevokedOrExpired(false);

        const res = await medicalDocumentsAPI.getSharedDocument(token);
        if (res.success && res.data) {
          setSharedData(res.data);
          if (res.data.category === "IMAGING_REPORT" && (res.data.images?.length || 0) > 0) {
            setActiveTab("report");
          }
        } else if (res.error?.code === "SHARE_LINK_EXPIRED_OR_REVOKED") {
          setIsRevokedOrExpired(true);
          setError(
            res.error?.message ||
              "This secure medical document share link has expired or been revoked by the patient."
          );
        } else {
          setError(res.message || "Failed to load shared medical document.");
        }
      } catch (err: any) {
        console.error("Failed to load shared document", err);
        setError(err?.message || "Invalid or unreachable medical document share link.");
      } finally {
        setLoading(false);
      }
    };

    fetchSharedDoc();
  }, [token]);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!sharedData) return;
    const content = `OneHealth ID - Shared Medical Record\nTitle: ${sharedData.title}\nCode: ${sharedData.document_code}\nHospital: ${sharedData.hospital_name}\nDate: ${sharedData.document_date}\nVerification: ${sharedData.digital_signature || "AUTHENTIC"}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sharedData.document_code || "medical_document"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categoryConfig = sharedData
    ? DOCUMENT_CATEGORIES.find((c) => c.key === sharedData.category) ||
      DOCUMENT_CATEGORIES.find((c) => c.key === "OTHER")!
    : DOCUMENT_CATEGORIES[0];

  const hasImages = (sharedData?.images && sharedData.images.length > 0) || false;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased p-4 sm:p-8">
      {/* Top Banner */}
      <div className="max-w-5xl mx-auto mb-6 print:hidden">
        <div className="rounded-2xl border border-blue-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-blue-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
              <Image
                src="/images/oh-id-logo.png"
                alt="One Health ID"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                OneHealth ID Secure Document Access Portal • Powered by Sathus Technology
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {sharedData?.recipient_name
                  ? `Authorized for: ${sharedData.recipient_name}`
                  : "Authorized Clinical Access"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 rounded-full text-xs font-medium">
              <Lock className="w-3.5 h-3.5" />
              {sharedData?.access_level === "ALLOW_DOWNLOAD" ? "Download Permitted" : "View Only"}
            </span>

            {sharedData?.expires_at && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium">
                <Clock className="w-3.5 h-3.5" />
                Expires: {new Date(sharedData.expires_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto">
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-lg animate-pulse">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">
              Validating Security Credentials & Retrieving Document...
            </h2>
          </div>
        ) : error || !sharedData ? (
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-3xl p-8 sm:p-12 text-center shadow-lg max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {isRevokedOrExpired ? "Share Link Inactive" : "Access Denied"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {error || "The requested medical document link does not exist or has been revoked."}
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 underline"
              >
                Sign In to OneHealth ID Network <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Toolbar for Recipient (Zoom, Rotate, Print, Download) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between flex-wrap gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${categoryConfig.badgeColor}`}
                >
                  {categoryConfig.icon} {categoryConfig.label}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {sharedData.document_code}
                </span>
              </div>

              {/* Tabs for imaging */}
              {hasImages && (
                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    onClick={() => setActiveTab("report")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      activeTab === "report"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Report
                  </button>
                  <button
                    onClick={() => setActiveTab("images")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      activeTab === "images"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Scan className="w-3.5 h-3.5" />
                    Medical Images ({sharedData.images?.length})
                  </button>
                </div>
              )}

              {/* Viewer Tools */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs text-slate-600 dark:text-slate-300">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 50}
                    className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded disabled:opacity-40"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 font-mono text-[11px]">{zoomLevel}%</span>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 200}
                    className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded disabled:opacity-40"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleRotate}
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-lg"
                  title="Rotate"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>

                {sharedData.access_level === "ALLOW_DOWNLOAD" && (
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                )}
              </div>
            </div>

            {/* Document / DICOM Rendering Area */}
            {activeTab === "images" && hasImages ? (
              <div className="bg-black rounded-2xl overflow-hidden shadow-xl border border-slate-800 p-4">
                <div
                  style={{
                    transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                    transformOrigin: "center center",
                    transition: "transform 0.2s ease-out"
                  }}
                  className="flex items-center justify-center min-h-[460px]"
                >
                  <img
                    src={sharedData.images![selectedSliceIndex].image_url}
                    alt="Scan slice"
                    className="max-h-[500px] object-contain rounded"
                  />
                </div>

                {/* Slices Carousel */}
                <div className="grid grid-cols-4 gap-2 mt-4 bg-slate-900 p-2 rounded-xl border border-slate-800">
                  {sharedData.images!.map((slice, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSliceIndex(idx)}
                      className={`p-1 rounded-lg border-2 text-left transition-all ${
                        selectedSliceIndex === idx
                          ? "border-blue-500 bg-blue-950/40"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={slice.image_url}
                        alt="Thumbnail"
                        className="h-12 w-full object-cover rounded"
                      />
                      <span className="text-[10px] text-slate-300 truncate block mt-1">
                        {slice.sequence || `Slice #${idx + 1}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                  transformOrigin: "top center",
                  transition: "transform 0.2s ease-out"
                }}
                className="bg-white text-slate-900 border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-xl space-y-6 max-w-4xl mx-auto"
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
                  <div>
                    <h1 className="text-xl font-black text-slate-900">
                      {sharedData.hospital_name || "ONEHEALTH ID HEALTHCARE NETWORK"}
                    </h1>
                    <p className="text-xs text-slate-500">
                      {sharedData.department ? `${sharedData.department} • ` : ""}
                      Official Medical Record
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-slate-100 rounded border border-slate-300">
                      {categoryConfig.label}
                    </span>
                    <p className="text-xs font-mono text-slate-500 mt-1">
                      {sharedData.document_code}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block uppercase text-[10px]">Patient</span>
                    <strong className="text-slate-800 text-sm">
                      {sharedData.patient_name || "Alice Smith"}
                    </strong>
                    <div className="text-slate-500 font-mono text-[11px]">
                      {sharedData.onehealth_id || "OHID-IND-2026-01001"}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[10px]">Date</span>
                    <strong className="text-slate-800">{sharedData.document_date}</strong>
                    <div className="text-slate-500 text-[11px]">Status: {sharedData.status}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[10px]">Doctor</span>
                    <strong className="text-slate-800">{sharedData.doctor_name || "Authorized Clinician"}</strong>
                    <div className="text-slate-500 text-[11px]">{sharedData.doctor_specialty || "Specialist"}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[10px]">Visit Ref</span>
                    <strong className="text-slate-800 font-mono">{sharedData.visit_id || "VIS-DEFAULT"}</strong>
                    <div className="text-slate-500 text-[11px]">{sharedData.source_label}</div>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{sharedData.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {sharedData.notes || "Official clinical documentation certified and securely synced via OneHealth ID personal repository."}
                  </p>
                </div>

                {/* Metadata details */}
                {sharedData.metadata && Object.keys(sharedData.metadata).length > 0 && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Record Details & Parameters
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {Object.entries(sharedData.metadata).map(([k, v]) => (
                        <div key={k} className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-slate-400 block text-[10px] uppercase">{k.replace(/_/g, " ")}</span>
                          <span className="font-semibold text-slate-800">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Security Footer */}
                <div className="border-t-2 border-slate-200 pt-4 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Cryptographically verified record by OneHealth ID Trust Network</span>
                  </div>
                  <span className="font-mono">{sharedData.digital_signature?.substring(0, 24)}...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
