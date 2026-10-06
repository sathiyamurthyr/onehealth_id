"use client";

import React, { useState } from "react";
import {
  DocumentCategory,
  DOCUMENT_CATEGORIES,
  DocumentRequest,
  medicalDocumentsAPI
} from "@/lib/api/documents";
import {
  X,
  UploadCloud,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Lock,
  Tag,
  Sparkles
} from "lucide-react";

interface AddPersonalDocumentModalProps {
  patientId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialRequest?: DocumentRequest | null;
}

export const AddPersonalDocumentModal: React.FC<AddPersonalDocumentModalProps> = ({
  patientId,
  isOpen,
  onClose,
  onSuccess,
  initialRequest
}) => {
  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<DocumentCategory>("OTHER");
  const [documentDate, setDocumentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [fileSizeKb, setFileSizeKb] = useState<number>(320);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialRequest) {
      setTitle(initialRequest.title);
      setCategory((initialRequest.document_type as DocumentCategory) || "OTHER");
      if (initialRequest.instructions) {
        setNotes(`Fulfilling request: ${initialRequest.instructions}`);
      }
    }
  }, [initialRequest]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setFileSizeKb(Math.round(file.size / 1024));
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a title for the document.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await medicalDocumentsAPI.uploadPersonalDocument(
        {
          title: title.trim(),
          category,
          document_date: documentDate,
          file_name: fileName || "patient_health_doc.pdf",
          file_type: "PDF",
          file_size_kb: fileSizeKb,
          notes: notes.trim() || undefined,
          related_request_id: initialRequest?.id,
          source_type: "PATIENT_UPLOADED",
          source_label: "Uploaded by Patient"
        },
        patientId
      );

      // Reset & notify
      setTitle("");
      setNotes("");
      setFileName("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to upload document to personal health vault.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Add Personal Document
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Store private health records in your OneHealth ID vault
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Privacy & Provenance Distinction Notice */}
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-300">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">
                Personal Document Provenance
              </strong>
              This record will be explicitly tagged as{" "}
              <span className="font-semibold underline">Source: Uploaded by You</span>. It is kept private to your vault and will not be mixed with hospital-issued certifications.
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Document Title *
            </label>
            <input
              type="text"
              required
              data-testid="personal-doc-title-input"
              placeholder="e.g. Previous 12-Lead ECG Strip / Blood Test 2025"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Document Category
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DOCUMENT_CATEGORIES.filter((c) => c.key !== "ALL").map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Document Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* File Upload Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              File Attachment (PDF, Image, Scan)
            </label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:border-blue-400 transition-colors bg-slate-50/50 dark:bg-slate-800/50">
              <input
                type="file"
                id="personal-doc-upload"
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg,.dcm"
                className="hidden"
              />
              <label
                htmlFor="personal-doc-upload"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <UploadCloud className="w-8 h-8 text-blue-500 mb-2" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {fileName ? fileName : "Click to select a medical file"}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Supported formats: PDF, JPEG, PNG, DICOM (Max 25MB)
                </span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Personal Notes / Doctor Comments (Optional)
            </label>
            <textarea
              rows={3}
              data-testid="personal-doc-notes-input"
              placeholder="e.g. Conducted during out-of-state trip, advised for cardiologist review."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              data-testid="personal-doc-submit-btn"
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? "Saving to Vault..." : "Save to Personal Vault"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
