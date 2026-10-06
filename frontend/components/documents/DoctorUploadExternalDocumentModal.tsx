"use client";

import React, { useState } from "react";
import { X, UploadCloud, Building2, User, Calendar, FileText, CheckCircle2, AlertCircle, Tag } from "lucide-react";
import { doctorWorkspaceApi } from "@/lib/api/doctor-workspace";
import { DOCUMENT_CATEGORIES, DocumentCategory } from "@/lib/api/documents";

interface DoctorUploadExternalDocumentModalProps {
  patientId: string;
  patientName: string;
  isOpen: boolean;
  onClose: () => void;
  onDocumentUploaded: () => void;
}

export const DoctorUploadExternalDocumentModal: React.FC<DoctorUploadExternalDocumentModalProps> = ({
  patientId,
  patientName,
  isOpen,
  onClose,
  onDocumentUploaded
}) => {
  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<DocumentCategory>("IMAGING_REPORT");
  const [externalHospital, setExternalHospital] = useState<string>("");
  const [externalDoctor, setExternalDoctor] = useState<string>("");
  const [documentDate, setDocumentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [clinicalNote, setClinicalNote] = useState<string>(
    "Patient provided external diagnostic document for clinical review."
  );
  const [tagsInput, setTagsInput] = useState<string>("external, prior-history");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>("PDF");
  const [fileSizeKb, setFileSizeKb] = useState<number>(1024);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      const ext = f.name.split(".").pop()?.toUpperCase() || "PDF";
      setFileType(ext);
      setFileSizeKb(Math.round(f.size / 1024));
      if (!title) {
        setTitle(f.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a document title.");
      return;
    }
    if (!externalHospital.trim()) {
      setError("Please specify the external hospital or clinic name.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await doctorWorkspaceApi.uploadExternalDocument(patientId, {
        title: title.trim(),
        category,
        document_date: documentDate,
        external_hospital_name: externalHospital.trim(),
        external_doctor_name: externalDoctor.trim() || undefined,
        clinical_note: clinicalNote.trim() || undefined,
        file_type: fileType,
        file_size_kb: fileSizeKb,
        file_url: `/mock-storage/external/${Date.now()}_${title.replace(/\s+/g, "_")}.${fileType.toLowerCase()}`,
        tags
      });

      onDocumentUploaded();
      onClose();
    } catch (err: any) {
      console.error("Failed to upload external document:", err);
      setError(err.message || "Failed to record external medical document.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400">
                <UploadCloud className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Upload External Medical Document
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Record previous external hospital/lab reports brought by <strong className="text-slate-800 dark:text-slate-200">{patientName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Banner explaining the distinction */}
          <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 text-teal-900 dark:text-teal-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>Attributed External Record</span>
            </div>
            <p className="text-[11px] text-teal-700 dark:text-teal-300">
              This document will be categorized as <span className="font-mono font-semibold">Source: EXTERNAL_PROVIDER</span>, uploaded & certified by you as Attending Doctor.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Document Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
              >
                {DOCUMENT_CATEGORIES.filter(c => c.key !== "ALL").map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Document Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Document Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Brain MRI T1/T2 Contrast Study"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* External Hospital */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                External Hospital / Lab *
              </label>
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={externalHospital}
                  onChange={(e) => setExternalHospital(e.target.value)}
                  placeholder="e.g. Apollo Diagnostics"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                  required
                />
              </div>
            </div>

            {/* External Doctor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                External Doctor Name
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={externalDoctor}
                  onChange={(e) => setExternalDoctor(e.target.value)}
                  placeholder="e.g. Dr. K. Ramesh, MD"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                />
              </div>
            </div>

            {/* Document Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Document Date *
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                  required
                />
              </div>
            </div>
          </div>

          {/* Clinical Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Doctor Clinical Review Note
            </label>
            <textarea
              rows={2}
              value={clinicalNote}
              onChange={(e) => setClinicalNote(e.target.value)}
              placeholder="Clinical observations or relevance to current treatment plan..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
            />
          </div>

          {/* File Upload Attachment Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Document File (PDF, Image, DICOM)
            </label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:border-teal-500 transition bg-slate-50/50 dark:bg-slate-800/30">
              <input
                type="file"
                id="doctor-ext-file-input"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.dcm"
                className="hidden"
              />
              <label
                htmlFor="doctor-ext-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <UploadCloud className="w-7 h-7 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {selectedFile ? selectedFile.name : "Click to select or drop document file"}
                </span>
                <span className="text-[11px] text-slate-500">
                  Supported: PDF, JPEG, PNG, DICOM (Max 50MB)
                </span>
              </label>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Tags (comma separated)
            </label>
            <div className="relative">
              <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="mri, neuro, previous-hospital"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {submitting ? "Saving Record..." : "Save External Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
