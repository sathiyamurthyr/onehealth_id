"use client";

import React, { useState, useRef } from "react";
import {
  X,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Video,
  FileCheck,
  AlertCircle,
  Loader2,
  Camera,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import {
  OCRDocumentCategory,
  OCR_DOCUMENT_CATEGORIES,
  DocumentOCRJob,
  ocrApi,
} from "@/lib/api/ocr";
import { Button } from "@/components/ui/Card";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (job: DocumentOCRJob) => void;
  hospitalId?: string;
}

const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.pdf,.docx,.mp4,.mov";
const MAX_SIZES_MB = {
  PDF: 20,
  IMAGE: 10,
  DOCX: 10,
  VIDEO: 100,
};

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  hospitalId,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<OCRDocumentCategory>("DISCHARGE_SUMMARY");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    const validExts = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".pdf",
      ".docx",
      ".mp4",
      ".mov",
    ];

    if (!validExts.includes(ext)) {
      setErrorMessage(
        `Unsupported file type '${ext}'. Please upload JPG, PNG, WEBP, PDF, DOCX, or MP4/MOV.`
      );
      return;
    }

    let category = "IMAGE";
    if (ext === ".pdf") category = "PDF";
    else if (ext === ".docx") category = "DOCX";
    else if (ext === ".mp4" || ext === ".mov") category = "VIDEO";

    const maxMb = MAX_SIZES_MB[category as keyof typeof MAX_SIZES_MB] || 10;
    if (file.size > maxMb * 1024 * 1024) {
      setErrorMessage(
        `File exceeds maximum allowed size of ${maxMb} MB for ${category} format.`
      );
      return;
    }

    setSelectedFile(file);

    // Create thumbnail preview if image
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Please select a document or photo to upload.");
      return;
    }

    try {
      setUploading(true);
      setErrorMessage(null);
      setUploadProgress(25);

      const interval = setInterval(() => {
        setUploadProgress((p) => (p < 85 ? p + 15 : p));
      }, 300);

      const job = await ocrApi.uploadDocument(
        selectedFile,
        selectedCategory,
        hospitalId
      );

      clearInterval(interval);
      setUploadProgress(100);

      // Successfully processed -> hand over to human review screen
      setTimeout(() => {
        onUploadSuccess(job);
        onClose();
      }, 400);
    } catch (err: any) {
      console.error("Upload OCR Error:", err);
      setErrorMessage(
        err.message || "Failed to process document. Please try again."
      );
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 id="upload-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                Upload Supporting Document
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                OCR extracts hospital & patient identities for verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Document Category Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Document Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(e.target.value as OCRDocumentCategory)
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {OCR_DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {
                OCR_DOCUMENT_CATEGORIES.find(
                  (c) => c.value === selectedCategory
                )?.description
              }
            </p>
          </div>

          {/* Drag & Drop File Zone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Document File or Photos <span className="text-rose-500">*</span>
            </label>

            {!selectedFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                    : "border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Click to select file or drag and drop here
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Supported formats: PDF (≤20MB), JPG, PNG, WEBP, DOCX (≤10MB),
                  MP4/MOV (≤100MB)
                </p>

                {/* Mobile Camera Option */}
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cameraInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-blue-500" />
                    <span>Take Photo with Camera</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              /* Selected File Preview Box */
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50/60 dark:bg-slate-800/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  {filePreviewUrl ? (
                    <img
                      src={filePreviewUrl}
                      alt="Thumbnail"
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      {selectedFile.name.endsWith(".pdf") ? (
                        <FileText className="w-6 h-6" />
                      ) : selectedFile.name.endsWith(".mp4") ||
                        selectedFile.name.endsWith(".mov") ? (
                        <Video className="w-6 h-6" />
                      ) : (
                        <FileCheck className="w-6 h-6" />
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatFileSize(selectedFile.size)} •{" "}
                      {selectedFile.type || "Document"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={uploading}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors shrink-0"
                  title="Remove File"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Progress Bar when uploading */}
          {uploading && (
            <div className="space-y-1.5 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Extracting text and identifying patient/hospital details...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Data Minimization & Privacy Notice */}
          <div className="p-3 bg-slate-100/70 dark:bg-slate-800/40 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Data Minimization & Identity Policy:
            </p>
            <p>
              • Documents are quarantined in secure private storage. OCR text
              extraction does not establish a verified OneHealth ID identity
              without human confirmation.
            </p>
            <p>
              • You will be able to review and correct all extracted fields on
              the next screen before anything is saved.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!selectedFile || uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing OCR...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload & Extract OCR</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
