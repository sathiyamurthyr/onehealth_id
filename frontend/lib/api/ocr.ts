/**
 * ONEHEALTH ID (OH-ID) — Document Upload & OCR API Client
 * Sathus Technology Pvt Ltd
 */

import { fetchJSON, apiClient, API_BASE } from "./client";

export type OCRDocumentCategory =
  | "HOSPITAL_REGISTRATION"
  | "PATIENT_ID"
  | "DISCHARGE_SUMMARY"
  | "PRESCRIPTION"
  | "LAB_REPORT"
  | "MEDICAL_RECORD"
  | "REFERRAL_LETTER"
  | "INSURANCE_DOCUMENT"
  | "OTHER";

export interface OCRCategoryOption {
  value: OCRDocumentCategory;
  label: string;
  description: string;
}

export const OCR_DOCUMENT_CATEGORIES: OCRCategoryOption[] = [
  {
    value: "HOSPITAL_REGISTRATION",
    label: "Hospital Registration Document",
    description: "Clinical Establishment Act (CEA) certificate, hospital registration or license",
  },
  {
    value: "PATIENT_ID",
    label: "Patient Identification Document",
    description: "National ID, Government Health Card, Aadhaar, Voter ID, or Smart Card",
  },
  {
    value: "DISCHARGE_SUMMARY",
    label: "Discharge Summary",
    description: "Hospital inpatient discharge summary, admission & discharge records",
  },
  {
    value: "PRESCRIPTION",
    label: "Prescription",
    description: "Doctor's clinical prescription with medicines, dosage, and doctor details",
  },
  {
    value: "LAB_REPORT",
    label: "Laboratory Report",
    description: "Diagnostic lab findings, pathology, biochemistry, or blood test reports",
  },
  {
    value: "MEDICAL_RECORD",
    label: "Medical Record",
    description: "OPD case sheet, clinical notes, treatment records, or diagnostic imaging",
  },
  {
    value: "REFERRAL_LETTER",
    label: "Referral Letter",
    description: "Inter-facility transfer letter or doctor referral document",
  },
  {
    value: "INSURANCE_DOCUMENT",
    label: "Insurance Document",
    description: "TPA pre-authorization, health insurance policy, or claim document",
  },
  {
    value: "OTHER",
    label: "Other Supporting Document",
    description: "Any other official medical or healthcare facility supporting document",
  },
];

export interface DuplicatePatientMatch {
  patient_id: string;
  name: string;
  onehealth_id?: string;
  age?: number;
  gender?: string;
  phone_masked?: string;
  match_score: number;
  match_reasons: string[];
  requires_manual_resolution: boolean;
}

export interface DuplicateHospitalMatch {
  hospital_id: string;
  hospital_name: string;
  hospital_code?: string;
  city?: string;
  match_reason: string;
  is_verified: boolean;
}

export interface DocumentOCRJob {
  id: string;
  uploader_user_id: string;
  hospital_id?: string;
  document_category: OCRDocumentCategory;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  status:
    | "UPLOADED"
    | "VALIDATING"
    | "QUARANTINED"
    | "PROCESSING"
    | "OCR_COMPLETED"
    | "REVIEW_REQUIRED"
    | "APPROVED"
    | "REJECTED"
    | "FAILED"
    | "DELETED";
  extracted_fields: Record<string, any>;
  confidence_scores: Record<string, number>;
  source_locations: Record<string, string>;
  corrected_fields?: Record<string, any>;
  duplicate_matches?: {
    patient_matches?: DuplicatePatientMatch[];
    hospital_match?: DuplicateHospitalMatch;
  };
  created_record_id?: string;
  rejection_reason?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export const ocrApi = {
  uploadDocument: async (
    file: File,
    category: OCRDocumentCategory,
    hospitalId?: string
  ): Promise<DocumentOCRJob> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_category", category);
    if (hospitalId) {
      formData.append("hospital_id", hospitalId);
    }

    const res = await apiClient.upload<{ success: boolean; data: DocumentOCRJob }>(
      "/documents/upload-ocr",
      formData
    );
    return res.data.data;
  },

  getJob: async (jobId: string): Promise<DocumentOCRJob> => {
    const res = await apiClient.get<{ success: boolean; data: DocumentOCRJob }>(
      `/documents/jobs/${jobId}`
    );
    return res.data.data;
  },

  correctFields: async (
    jobId: string,
    correctedFields: Record<string, any>
  ): Promise<DocumentOCRJob> => {
    const res = await apiClient.patch<{ success: boolean; data: DocumentOCRJob }>(
      `/documents/jobs/${jobId}/correct`,
      { corrected_fields: correctedFields }
    );
    return res.data.data;
  },

  retryJob: async (jobId: string): Promise<DocumentOCRJob> => {
    const res = await apiClient.post<{ success: boolean; data: DocumentOCRJob }>(
      `/documents/jobs/${jobId}/retry`
    );
    return res.data.data;
  },

  approveJob: async (
    jobId: string,
    payload: {
      final_fields: Record<string, any>;
      patient_id?: string;
      create_provisional_patient?: boolean;
    }
  ): Promise<{
    job_id: string;
    status: string;
    document_id: string;
    patient_id?: string;
    message: string;
  }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: {
        job_id: string;
        status: string;
        document_id: string;
        patient_id?: string;
        message: string;
      };
    }>(`/documents/jobs/${jobId}/approve`, payload);
    return res.data.data;
  },

  rejectJob: async (
    jobId: string,
    reason: string
  ): Promise<{ job_id: string; status: string; message: string }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { job_id: string; status: string; message: string };
    }>(`/documents/jobs/${jobId}/reject`, { reason });
    return res.data.data;
  },

  getFilePreviewUrl: (jobId: string): string => {
    return `${API_BASE}/documents/jobs/${jobId}/file`;
  },
};
