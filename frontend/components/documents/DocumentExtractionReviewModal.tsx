"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Edit3,
  Building2,
  User,
  Calendar,
  FileText,
  ShieldCheck,
  AlertCircle,
  Eye,
  Loader2,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ExternalLink,
  Ban,
} from "lucide-react";
import {
  DocumentOCRJob,
  ocrApi,
  DuplicatePatientMatch,
  DuplicateHospitalMatch,
} from "@/lib/api/ocr";
import { Button, Badge } from "@/components/ui/Card";

interface DocumentExtractionReviewModalProps {
  job: DocumentOCRJob | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmed: (persistedRecord: any) => void;
}

interface FieldDefinition {
  key: string;
  label: string;
  placeholder: string;
  category: "HOSPITAL" | "PATIENT" | "CLINICAL";
}

const REVIEW_FIELDS: FieldDefinition[] = [
  // Hospital fields
  { key: "hospital_name", label: "Hospital / Clinic Name", placeholder: "e.g. Kedar Hospital", category: "HOSPITAL" },
  { key: "hospital_reg_no", label: "Hospital Registration No", placeholder: "e.g. TN/MED/2026/0894", category: "HOSPITAL" },
  { key: "hospital_city", label: "City & Location", placeholder: "e.g. Chennai, Tamil Nadu", category: "HOSPITAL" },

  // Patient fields
  { key: "patient_name", label: "Patient Name", placeholder: "e.g. Alice Smith", category: "PATIENT" },
  { key: "patient_age", label: "Age", placeholder: "e.g. 45", category: "PATIENT" },
  { key: "patient_gender", label: "Sex / Gender", placeholder: "Male / Female / Other", category: "PATIENT" },
  { key: "patient_id_number", label: "Patient ID / MRN / UHID", placeholder: "e.g. MRN-88492", category: "PATIENT" },
  { key: "patient_phone", label: "Patient Phone", placeholder: "e.g. 9840123456", category: "PATIENT" },

  // Clinical Document fields
  { key: "document_type", label: "Document Type", placeholder: "e.g. Discharge Summary", category: "CLINICAL" },
  { key: "document_date", label: "Document Date", placeholder: "e.g. 12/10/2026", category: "CLINICAL" },
  { key: "doctor_name", label: "Treating Doctor", placeholder: "e.g. Dr. Senthil Nathan", category: "CLINICAL" },
  { key: "document_number", label: "Report / Prescription No", placeholder: "e.g. RX-2026-004", category: "CLINICAL" },
];

export const DocumentExtractionReviewModal: React.FC<DocumentExtractionReviewModalProps> = ({
  job: initialJob,
  isOpen,
  onClose,
  onConfirmed,
}) => {
  const [currentJob, setCurrentJob] = useState<DocumentOCRJob | null>(initialJob);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>(() => ({
    ...(initialJob?.extracted_fields || {}),
    ...(initialJob?.corrected_fields || {}),
  }));
  const [editedKeys, setEditedKeys] = useState<Set<string>>(new Set());
  const [isEditingAll, setIsEditingAll] = useState<boolean>(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [createProvisional, setCreateProvisional] = useState<boolean>(true);

  // States
  const [saving, setSaving] = useState<boolean>(false);
  const [retrying, setRetrying] = useState<boolean>(false);
  const [rejecting, setRejecting] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [showRejectPrompt, setShowRejectPrompt] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Update when initialJob changes
  React.useEffect(() => {
    if (initialJob) {
      setCurrentJob(initialJob);
      setFieldValues({
        ...(initialJob.extracted_fields || {}),
        ...(initialJob.corrected_fields || {}),
      });
      setEditedKeys(new Set(Object.keys(initialJob.corrected_fields || {})));
    }
  }, [initialJob]);

  if (!isOpen || !currentJob) return null;

  const handleFieldChange = (key: string, val: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: val }));
    setEditedKeys((prev) => new Set(prev).add(key));
  };

  const handleSaveCorrections = async () => {
    try {
      setErrorMessage(null);
      const updated = await ocrApi.correctFields(currentJob.id, fieldValues);
      setCurrentJob(updated);
      setIsEditingAll(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update fields.");
    }
  };

  const handleRetryOCR = async () => {
    try {
      setRetrying(true);
      setErrorMessage(null);
      const retried = await ocrApi.retryJob(currentJob.id);
      setCurrentJob(retried);
      setFieldValues({
        ...(retried.extracted_fields || {}),
        ...(retried.corrected_fields || {}),
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Retry OCR failed.");
    } finally {
      setRetrying(false);
    }
  };

  const handleApprove = async () => {
    try {
      setSaving(true);
      setErrorMessage(null);

      const res = await ocrApi.approveJob(currentJob.id, {
        final_fields: fieldValues,
        patient_id: selectedPatientId || undefined,
        create_provisional_patient: !selectedPatientId && createProvisional,
      });

      onConfirmed(res);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to approve and save record.");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setErrorMessage("Please state a reason for rejecting the document.");
      return;
    }
    try {
      setRejecting(true);
      setErrorMessage(null);
      await ocrApi.rejectJob(currentJob.id, rejectionReason.trim());
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reject document.");
    } finally {
      setRejecting(false);
    }
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (confidence === undefined || confidence === null || confidence === 0) {
      return (
        <span className="text-[11px] font-mono text-slate-400">
          Not detected
        </span>
      );
    }
    const pct = Math.round(confidence * 100);
    if (pct >= 90) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle2 className="w-3 h-3" />
          {pct}%
        </span>
      );
    }
    if (pct >= 70) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          <AlertCircle className="w-3 h-3" />
          {pct}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
        <AlertTriangle className="w-3 h-3" />
        {pct}%
      </span>
    );
  };

  const filePreviewUrl = ocrApi.getFilePreviewUrl(currentJob.id);
  const patientDuplicates = currentJob.duplicate_matches?.patient_matches || [];
  const hospitalMatch = currentJob.duplicate_matches?.hospital_match;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="review-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  Document Extraction Review
                </h2>
                <Badge variant="primary" className="text-[10px]">
                  {currentJob.file_type}
                </Badge>
                <Badge variant={currentJob.status === "REVIEW_REQUIRED" ? "warning" : "neutral"} className="text-[10px]">
                  {currentJob.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                File: {currentJob.file_name} • Review extracted fields before saving to OneHealth ID
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingAll(!isEditingAll)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-500" />
              <span>{isEditingAll ? "Done Editing" : "Edit Fields"}</span>
            </button>
            <button
              onClick={handleRetryOCR}
              disabled={retrying}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors"
              title="Re-run OCR Engine"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${retrying ? "animate-spin" : ""}`} />
              <span>Retry OCR</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body (Side-by-Side: Left Document Preview, Right Extracted Fields) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {/* Left Panel: Document Preview (5 cols on Desktop) */}
          <div className="lg:col-span-5 bg-slate-900 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950/80 border-b border-slate-800 text-slate-300 text-xs shrink-0">
              <span className="font-semibold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                Original Document
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(60, z - 20))}
                  className="p-1 hover:text-white rounded"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono">{zoomLevel}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(200, z + 20))}
                  className="p-1 hover:text-white rounded"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <a
                  href={filePreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:text-white rounded"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-900/90">
              {currentJob.file_type === "PDF" ? (
                <iframe
                  src={`${filePreviewUrl}#zoom=${zoomLevel}`}
                  title="PDF Preview"
                  className="w-full h-full rounded-xl border border-slate-700 bg-white"
                />
              ) : ["JPG", "JPEG", "PNG", "WEBP"].includes(currentJob.file_type) ? (
                <img
                  src={filePreviewUrl}
                  alt="Original Document Scan"
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-lg transition-transform duration-200"
                />
              ) : (
                <div className="text-center p-8 text-slate-400 space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-slate-600" />
                  <p className="text-sm font-semibold">{currentJob.file_name}</p>
                  <p className="text-xs">
                    Office / Video preview not directly embeddable. Extracted text available on the right.
                  </p>
                  <a
                    href={filePreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-blue-400 rounded-lg text-xs hover:bg-slate-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Download / Open File
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Structured Review & Verification Table (7 cols on Desktop) */}
          <div className="lg:col-span-7 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Duplicate & Identity Matching Section */}
              {patientDuplicates.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Potential Existing Patient Identity Detected</span>
                  </div>
                  <p className="text-xs text-amber-900 dark:text-amber-200">
                    Existing OH-ID records match details in this document. Matching names alone do NOT prove identity.
                    Please verify before creating duplicates.
                  </p>

                  <div className="space-y-2">
                    {patientDuplicates.map((dup) => {
                      const isSelected = selectedPatientId === dup.patient_id;
                      return (
                        <div
                          key={dup.patient_id}
                          onClick={() => {
                            setSelectedPatientId(isSelected ? null : dup.patient_id);
                            if (!isSelected) setCreateProvisional(false);
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? "border-blue-500 bg-blue-50/80 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100"
                              : "border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 hover:border-amber-400"
                          }`}
                        >
                          <div>
                            <div className="font-bold flex items-center gap-2">
                              <span>{dup.name}</span>
                              <Badge variant="primary" className="text-[10px]">
                                {dup.onehealth_id || "OHID-LINKED"}
                              </Badge>
                              <span className="text-[11px] font-normal text-slate-500">
                                {dup.age} yrs • {dup.gender} • {dup.phone_masked}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                              Match reason: {dup.match_reasons.join(", ")}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <span className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }`}>
                              {isSelected ? "Selected to Link" : "Link to this ID"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!selectedPatientId && (
                    <div className="pt-1 flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        id="chk_provisional"
                        checked={createProvisional}
                        onChange={(e) => setCreateProvisional(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="chk_provisional" className="text-slate-700 dark:text-slate-300 font-medium">
                        Patient is distinct from matches. Register as a provisional patient identity.
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Verified Hospital Facility Recognized */}
              {hospitalMatch && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Recognized Hospital in Registry: {hospitalMatch.hospital_name}
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Code: {hospitalMatch.hospital_code || "N/A"} • {hospitalMatch.city || "Tamil Nadu"} • {hospitalMatch.match_reason}
                    </p>
                  </div>
                  <Badge variant="success" className="text-[10px]">
                    Verified Facility
                  </Badge>
                </div>
              )}

              {/* Extraction Review Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px] text-slate-500 font-bold">
                    <tr>
                      <th className="py-3 px-4 w-1/3">Field</th>
                      <th className="py-3 px-4">Extracted Value</th>
                      <th className="py-3 px-4 w-28 text-center">Confidence</th>
                      <th className="py-3 px-4 w-20 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {REVIEW_FIELDS.map((field) => {
                      const value = fieldValues[field.key] || "";
                      const confidence = currentJob.confidence_scores?.[field.key];
                      const isEdited = editedKeys.has(field.key);

                      return (
                        <tr key={field.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {field.label}
                          </td>
                          <td className="py-3 px-4">
                            {isEditingAll ? (
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                placeholder={field.placeholder}
                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${value ? "text-slate-900 dark:text-white" : "text-slate-400 italic"}`}>
                                  {value || "Not detected"}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {getConfidenceBadge(confidence)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isEdited ? (
                              <Badge variant="warning" className="text-[9px]">
                                Edited
                              </Badge>
                            ) : value ? (
                              <Badge variant="neutral" className="text-[9px]">
                                Extracted
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Rejection Prompt Box */}
              {showRejectPrompt && (
                <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-900 dark:text-rose-300">
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>Reject Uploaded Document</span>
                  </div>
                  <p className="text-xs text-rose-800 dark:text-rose-300">
                    Specify the reason for rejection (e.g. illegible scan, irrelevant document, unauthorized entity).
                    Quarantined files will be purged.
                  </p>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter rejection reason..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRejectPrompt(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={rejecting}
                      onClick={handleReject}
                    >
                      {rejecting ? "Rejecting..." : "Confirm Rejection"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-2">
                {!showRejectPrompt && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => setShowRejectPrompt(true)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Reject Document</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={onClose}
                  disabled={saving || rejecting}
                >
                  Cancel
                </Button>

                {isEditingAll ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleSaveCorrections}
                  >
                    Save Field Edits
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    disabled={saving || rejecting}
                    onClick={handleApprove}
                    className="gap-2 font-bold"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Persisting Records...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Confirm & Save to Records</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
