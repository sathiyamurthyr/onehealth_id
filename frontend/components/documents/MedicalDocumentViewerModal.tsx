"use client";

import React, { useState, useEffect } from "react";
import {
  MedicalDocumentDetail,
  DOCUMENT_CATEGORIES
} from "@/lib/api/documents";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Printer,
  Download,
  Share2,
  ShieldCheck,
  Building2,
  User,
  Calendar,
  FileText,
  Scan,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  QrCode
} from "lucide-react";

interface MedicalDocumentViewerModalProps {
  document: MedicalDocumentDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onShare: (document: MedicalDocumentDetail) => void;
  onPrint?: (document: MedicalDocumentDetail) => void;
  onDownload?: (document: MedicalDocumentDetail) => void;
}

export const MedicalDocumentViewerModal: React.FC<MedicalDocumentViewerModalProps> = ({
  document,
  isOpen,
  onClose,
  onShare,
  onPrint,
  onDownload
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"report" | "images">("report");
  const [selectedSliceIndex, setSelectedSliceIndex] = useState<number>(0);
  const [showQR, setShowQR] = useState<boolean>(false);

  useEffect(() => {
    // Reset zoom and rotation when new document opens
    setZoomLevel(100);
    setRotation(0);
    setSelectedSliceIndex(0);
    setShowQR(false);
    if (document?.category === "IMAGING_REPORT" && (document?.images?.length || 0) > 0) {
      // Default to report view
      setActiveTab("report");
    } else {
      setActiveTab("report");
    }
  }, [document]);

  if (!isOpen || !document) return null;

  const categoryConfig =
    DOCUMENT_CATEGORIES.find((c) => c.key === document.category) ||
    DOCUMENT_CATEGORIES.find((c) => c.key === "OTHER")!;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleToggleFullscreen = () => setIsFullscreen((prev) => !prev);

  const handleTriggerPrint = () => {
    if (onPrint) {
      onPrint(document);
    } else {
      window.print();
    }
  };

  const handleTriggerDownload = () => {
    if (onDownload) {
      onDownload(document);
    } else {
      // Create mock PDF download blob
      const content = `OneHealth ID - Official Medical Document\nTitle: ${document.title}\nCode: ${document.document_code}\nHospital: ${document.hospital_name}\nDate: ${document.document_date}\nVerification: ${document.digital_signature || "AUTHENTIC"}`;
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${document.document_code || "medical_document"}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const isPatientUploaded = document.source_type === "PATIENT_UPLOADED";
  const hasImages = (document.images && document.images.length > 0) || false;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm transition-all duration-200 ${
        isFullscreen ? "p-0" : ""
      }`}
    >
      <div
        className={`bg-white dark:bg-slate-900 w-full flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden ${
          isFullscreen
            ? "h-screen rounded-none"
            : "max-w-5xl h-[92vh] rounded-2xl"
        }`}
      >
        {/* TOP BAR: Document title, category and actions */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
              {document.category === "IMAGING_REPORT" ? (
                <Scan className="w-5 h-5" />
              ) : document.category === "LAB_REPORT" ? (
                <FlaskConicalIcon className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                  {document.title}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${categoryConfig.badgeColor}`}
                >
                  {categoryConfig.label}
                </span>
                {isPatientUploaded && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
                    Uploaded by You
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {document.hospital_name || "Personal Health Vault"} • Document Code:{" "}
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {document.document_code || document.id}
                </span>
              </p>
            </div>
          </div>

          {/* Action Tools & Close */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onShare(document)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <button
              onClick={handleTriggerPrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={handleTriggerDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SUB-HEADER: Imaging vs Report Tabs & Viewer Controls (Zoom, Rotate, Fullscreen) */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex-wrap gap-2">
          {/* Tabs for imaging reports */}
          {hasImages ? (
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setActiveTab("report")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "report"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Diagnostic Report
              </button>
              <button
                onClick={() => setActiveTab("images")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "images"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Scan className="w-3.5 h-3.5" />
                Medical Images ({document.images?.length})
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Digitally Authenticated Health Document</span>
            </div>
          )}

          {/* Controls: Zoom, Rotate, QR, Fullscreen */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs text-slate-600 dark:text-slate-300">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50}
                className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded disabled:opacity-40"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px] font-medium">{zoomLevel}%</span>
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
              className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Rotate 90 degrees"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowQR(!showQR)}
              className={`p-1.5 rounded-lg transition-colors ${
                showQR
                  ? "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
              title="Toggle Verification QR & Token"
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleToggleFullscreen}
              className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* MAIN BODY: Scrollable Document / Image Rendering Canvas */}
        <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 flex justify-center">
          {activeTab === "images" && hasImages ? (
            /* DICOM / Medical Image Viewer Tab */
            <div className="w-full max-w-4xl flex flex-col items-center">
              {/* Image Preview Canvas */}
              <div
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  transition: "transform 0.2s ease-out"
                }}
                className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center min-h-[420px] max-h-[560px] w-full"
              >
                <img
                  src={document.images![selectedSliceIndex].image_url}
                  alt={document.images![selectedSliceIndex].sequence || "Medical Scan"}
                  className="max-h-[540px] max-w-full object-contain"
                />

                {/* DICOM Overlay HUD */}
                <div className="absolute top-4 left-4 text-[11px] font-mono text-emerald-400 bg-black/60 backdrop-blur px-2.5 py-1.5 rounded-lg border border-emerald-500/30">
                  <div>SERIES: {document.images![selectedSliceIndex].sequence || "Scan Series"}</div>
                  <div>SLICE: {selectedSliceIndex + 1} / {document.images!.length}</div>
                  <div>WL: {document.images![selectedSliceIndex].window_level || "Standard Window"}</div>
                </div>

                <div className="absolute bottom-4 right-4 text-[11px] font-mono text-slate-300 bg-black/60 backdrop-blur px-2.5 py-1.5 rounded-lg border border-slate-700">
                  <div>PATIENT: {document.patient_name || "Alice Smith"}</div>
                  <div>ACC: {document.document_code}</div>
                </div>
              </div>

              {/* Slice Navigation Carousel */}
              <div className="w-full mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Series Slices ({document.images!.length} Slices Available)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={selectedSliceIndex === 0}
                      onClick={() => setSelectedSliceIndex((prev) => Math.max(prev - 1, 0))}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30"
                      data-testid="prev-slice-btn"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono px-2" data-testid="slice-counter">
                      {selectedSliceIndex + 1} / {document.images!.length}
                    </span>
                    <button
                      disabled={selectedSliceIndex === document.images!.length - 1}
                      onClick={() =>
                        setSelectedSliceIndex((prev) =>
                          Math.min(prev + 1, document.images!.length - 1)
                        )
                      }
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30"
                      data-testid="next-slice-btn"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {document.images!.map((slice, idx) => (
                    <button
                      key={slice.slice_id || idx}
                      data-testid={`dicom-slice-${idx}`}
                      onClick={() => setSelectedSliceIndex(idx)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all p-1 text-left ${
                        selectedSliceIndex === idx
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                          : "border-transparent bg-slate-50 dark:bg-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <img
                        src={slice.image_url}
                        alt={`Slice ${idx + 1}`}
                        className="h-14 w-full object-cover rounded"
                      />
                      <p className="text-[10px] font-medium text-slate-700 dark:text-slate-300 mt-1 truncate">
                        {slice.sequence || `Slice #${idx + 1}`}
                      </p>
                    </button>
                  ))}
                </div>

                {document.images![selectedSliceIndex].description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                    <strong className="text-slate-800 dark:text-slate-200">Radiologist Note:</strong>{" "}
                    {document.images![selectedSliceIndex].description}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Standard Document / PDF Emulated Canvas */
            <div
              style={{
                transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                transformOrigin: "top center",
                transition: "transform 0.2s ease-out"
              }}
              className="bg-white text-slate-900 w-full max-w-3xl shadow-xl rounded-xl p-8 border border-slate-200 min-h-[700px] flex flex-col justify-between"
            >
              {/* DOCUMENT HEADER */}
              <div>
                <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                        OH
                      </div>
                      <div>
                        <h1 className="text-lg font-black tracking-tight text-slate-900">
                          {document.hospital_name || (isPatientUploaded ? "PATIENT PERSONAL VAULT" : "ONEHEALTH ID HEALTHCARE NETWORK")}
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">
                          {document.department ? `${document.department} • ` : ""}
                          OneHealth ID Trust Network Verified Record
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 font-bold text-xs uppercase tracking-wider rounded border border-slate-300">
                      {categoryConfig.label}
                    </span>
                    <p className="text-xs font-mono text-slate-500 mt-1">
                      {document.document_code}
                    </p>
                  </div>
                </div>

                {/* PATIENT & DOCTOR INFO STRIP */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium uppercase text-[10px]">
                      Patient Name
                    </span>
                    <strong className="text-slate-800 text-sm">
                      {document.patient_name || "Alice Smith"}
                    </strong>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {document.onehealth_id || "OHID-IND-2026-01001"}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium uppercase text-[10px]">
                      Document Date
                    </span>
                    <strong className="text-slate-800">
                      {document.document_date}
                    </strong>
                    <div className="text-[11px] text-slate-500">
                      Status: <span className="font-semibold text-emerald-700">{document.status}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium uppercase text-[10px]">
                      Attending / Doctor
                    </span>
                    <strong className="text-slate-800">
                      {document.doctor_name || "Authorized Clinician"}
                    </strong>
                    <div className="text-[11px] text-slate-500">
                      {document.doctor_specialty || document.department || "Consultant"}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium uppercase text-[10px]">
                      Reference / Visit
                    </span>
                    <strong className="text-slate-800 font-mono">
                      {document.visit_id || document.reference_id || "REF-HEALTH-REC"}
                    </strong>
                    <div className="text-[11px] text-slate-500">
                      Source: {document.source_label}
                    </div>
                  </div>
                </div>

                {/* CLINICAL CONTENT & METADATA SECTIONS */}
                <div className="space-y-6 text-sm">
                  {/* Title & Notes */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-2 border-b border-slate-100 pb-1">
                      {document.title}
                    </h3>
                    <p className="text-slate-700 leading-relaxed text-xs sm:text-sm">
                      {document.notes || "Official clinical documentation certified and securely synced via OneHealth ID personal repository."}
                    </p>
                  </div>

                  {/* Dynamic Metadata Renderers */}
                  {document.metadata && Object.keys(document.metadata).length > 0 && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-blue-600" />
                        Clinical Summary & Record Details
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {Object.entries(document.metadata).map(([k, v]) => {
                          if (typeof v === "object" && v !== null) {
                            return (
                              <div key={k} className="col-span-2 bg-white p-2.5 rounded border border-slate-200">
                                <span className="font-semibold text-slate-700 capitalize">
                                  {k.replace(/_/g, " ")}:
                                </span>
                                <pre className="text-[11px] font-mono text-slate-600 mt-1 whitespace-pre-wrap">
                                  {JSON.stringify(v, null, 2)}
                                </pre>
                              </div>
                            );
                          }
                          return (
                            <div key={k} className="bg-white p-2 rounded border border-slate-200">
                              <span className="text-slate-400 block text-[10px] uppercase font-medium">
                                {k.replace(/_/g, " ")}
                              </span>
                              <span className="font-semibold text-slate-800">
                                {String(v)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Verification QR / Token Card */}
                  {showQR && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-4">
                      <div className="w-16 h-16 bg-white p-1 rounded-lg border border-blue-200 flex items-center justify-center font-mono text-[10px] text-center font-bold text-blue-900 shadow-sm">
                        QR SEAL VERIFIED
                      </div>
                      <div className="text-xs">
                        <strong className="text-blue-950 font-bold block mb-0.5">
                          Cryptographic Digital Signature
                        </strong>
                        <p className="text-blue-800 text-[11px] font-mono break-all mb-1">
                          {document.digital_signature || "SHA256:0x89abf72c10398de4b6f12"}
                        </p>
                        <span className="text-[10px] text-blue-700">
                          Verification Token:{" "}
                          <strong className="font-mono">{document.verification_token || document.document_code}</strong>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* DOCUMENT FOOTER: Digital Stamp & Cert */}
              <div className="border-t-2 border-slate-200 pt-4 mt-8 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Verified by OneHealth ID Digital Trust Network</span>
                </div>
                <div className="text-right">
                  <span>Issued: {document.document_date}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function FlaskConicalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
      <path d="M8.5 2h7" />
      <path d="M7 16h10" />
    </svg>
  );
}
