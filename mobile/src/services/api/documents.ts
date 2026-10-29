/**
 * ONEHEALTH ID (OH-ID) Mobile — Document Upload & Validation API Service
 * 
 * Implements client-side pre-flight file validation, multi-stage upload progress,
 * and structured validation decision handling for enterprise medical workflows.
 * Sathus Technology Pvt Ltd - Enterprise Mobile Architecture
 */

import { fetchJSON } from "./client";

export type DocumentCategory =
  | "LAB_REPORT"
  | "PRESCRIPTION"
  | "DISCHARGE_SUMMARY"
  | "MEDICAL_CERTIFICATE"
  | "DIAGNOSTIC_REPORT"
  | "CLINICAL_DOCUMENT"
  | "REFERRAL_LETTER";

export interface CategoryInfo {
  key: DocumentCategory;
  label: string;
  icon: string;
  description: string;
  maxSizeMb: number;
}

export const SUPPORTED_DOCUMENT_CATEGORIES: CategoryInfo[] = [
  {
    key: "LAB_REPORT",
    label: "Laboratory Report",
    icon: "🧪",
    description: "Pathology, blood tests, biochemistry, and microbiology diagnostics",
    maxSizeMb: 20,
  },
  {
    key: "PRESCRIPTION",
    label: "Prescription",
    icon: "💊",
    description: "Doctor medication orders, dosages, and prescription slips",
    maxSizeMb: 10,
  },
  {
    key: "DISCHARGE_SUMMARY",
    label: "Discharge Summary",
    icon: "📄",
    description: "Inpatient hospitalization course and discharge instructions",
    maxSizeMb: 20,
  },
  {
    key: "MEDICAL_CERTIFICATE",
    label: "Medical Certificate",
    icon: "📑",
    description: "Fitness certificates, illness validation, and sick leave documents",
    maxSizeMb: 10,
  },
  {
    key: "DIAGNOSTIC_REPORT",
    label: "Diagnostic Imaging Report",
    icon: "🩻",
    description: "Radiology, X-Ray, Ultrasound, CT, MRI, and ECG scans",
    maxSizeMb: 20,
  },
  {
    key: "CLINICAL_DOCUMENT",
    label: "Clinical Consultation",
    icon: "📋",
    description: "Physician consultation encounter notes and treatment plans",
    maxSizeMb: 10,
  },
  {
    key: "REFERRAL_LETTER",
    label: "Referral Letter",
    icon: "↗️",
    description: "Specialist and inter-hospital patient transfer notes",
    maxSizeMb: 10,
  },
];

export type ValidationOutcome =
  | "ACCEPTED"
  | "REJECTED_UNSUPPORTED_TYPE"
  | "REJECTED_TOO_LARGE"
  | "REJECTED_INVALID_FILE"
  | "REJECTED_MALWARE"
  | "REJECTED_LOW_OCR_CONFIDENCE"
  | "REJECTED_IRRELEVANT"
  | "REVIEW_REQUIRED"
  | "PROCESSING_FAILED";

export interface DocumentValidationResponse {
  id: string;
  status: ValidationOutcome;
  validation_decision?: ValidationOutcome;
  file_name: string;
  document_category: string;
  file_size_bytes: number;
  rejection_reason?: string | null;
  actionable_remedy?: string | null;
  extracted_fields?: Record<string, any>;
  confidence_scores?: Record<string, number>;
  validation_metrics?: {
    relevance_score?: number;
    confidence?: number;
    detected_category?: string;
    ocr_character_count?: number;
    readable_word_count?: number;
    matched_signals?: string[];
  };
}

export interface SelectedFile {
  uri: string;
  name: string;
  type?: string;
  size?: number;
}

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".docx"];

export const documentsApi = {
  /**
   * Client-side pre-flight check before uploading.
   * Returns null if valid, or an actionable error message if invalid.
   */
  validateFileClientSide(file: SelectedFile, category: DocumentCategory): { valid: boolean; error?: string; remedy?: string } {
    if (!file || !file.name) {
      return { valid: false, error: "Please select a file to upload.", remedy: "Choose a document from your device." };
    }

    const dotIdx = file.name.lastIndexOf(".");
    const ext = dotIdx !== -1 ? file.name.substring(dotIdx).toLowerCase() : "";

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: `File format '${ext || "unknown"}' is not supported.`,
        remedy: `Supported formats are: ${ALLOWED_EXTENSIONS.join(", ")}`,
      };
    }

    const categoryConfig = SUPPORTED_DOCUMENT_CATEGORIES.find((c) => c.key === category);
    const maxBytes = (categoryConfig?.maxSizeMb || 20) * 1024 * 1024;

    if (file.size && file.size > maxBytes) {
      const mbSize = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `File size (${mbSize} MB) exceeds maximum allowed limit of ${categoryConfig?.maxSizeMb} MB.`,
        remedy: "Please compress or select a smaller scan before uploading.",
      };
    }

    return { valid: true };
  },

  /**
   * Uploads and validates a clinical document through the multi-stage pipeline.
   */
  async uploadAndValidateDocument(
    file: SelectedFile,
    category: DocumentCategory,
    hospitalId?: string
  ): Promise<DocumentValidationResponse> {
    const formData = new FormData();

    // Map file object for React Native FormData
    const filePayload = {
      uri: file.uri,
      name: file.name,
      type: file.type || "application/octet-stream",
    } as any;

    formData.append("file", filePayload);
    formData.append("document_category", category);
    if (hospitalId) {
      formData.append("hospital_id", hospitalId);
    }

    const response = await fetchJSON<{ data: DocumentValidationResponse; message?: string }>(
      "/documents/upload-ocr",
      {
        method: "POST",
        body: formData,
        skipEncryption: true, // Binary multipart bypasses JSON application-layer crypto
      }
    );

    return response.data;
  },
};

