import { fetchJSON } from "./client";

export type DocumentCategory =
  | "ALL"
  | "DISCHARGE_SUMMARY"
  | "LAB_REPORT"
  | "PRESCRIPTION"
  | "MEDICAL_CERTIFICATE"
  | "IMAGING_REPORT"
  | "REFERRAL_LETTER"
  | "CLINICAL_DOCUMENT"
  | "INSURANCE_DOCUMENT"
  | "OTHER";

export interface DocumentCategoryConfig {
  key: DocumentCategory;
  label: string;
  icon: string;
  description: string;
  badgeColor: string;
}

export const DOCUMENT_CATEGORIES: DocumentCategoryConfig[] = [
  { key: "ALL", label: "All Documents", icon: "📁", description: "All healthcare records across providers", badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { key: "DISCHARGE_SUMMARY", label: "Discharge Summary", icon: "📄", description: "Inpatient admission & discharge records", badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800" },
  { key: "LAB_REPORT", label: "Lab Report", icon: "🧪", description: "Pathology, blood, microbiology diagnostic tests", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800" },
  { key: "PRESCRIPTION", label: "Prescription", icon: "💊", description: "Outpatient & discharge medication orders", badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800" },
  { key: "MEDICAL_CERTIFICATE", label: "Medical Certificate", icon: "📑", description: "Medical fitness, sick leave, disability certificates", badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800" },
  { key: "IMAGING_REPORT", label: "Imaging Report", icon: "🩻", description: "MRI, CT, X-Ray, Ultrasound diagnostic reports & series", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800" },
  { key: "REFERRAL_LETTER", label: "Referral Letter", icon: "↗️", description: "Specialist & inter-hospital referral notes", badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800" },
  { key: "CLINICAL_DOCUMENT", label: "Clinical Document", icon: "📋", description: "Consultation notes, procedure summaries, treatment plans", badgeColor: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800" },
  { key: "INSURANCE_DOCUMENT", label: "Insurance Document", icon: "🛡️", description: "Pre-authorization, claims, policy approval records", badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800" },
  { key: "OTHER", label: "Other", icon: "🗂️", description: "Miscellaneous personal and institutional health files", badgeColor: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700" }
];

export interface DocumentImageSlice {
  slice_id?: string;
  sequence?: string;
  image_url: string;
  description?: string;
  window_level?: string;
}

export type MedicalDocumentStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "AVAILABLE"
  | "REVIEWED"
  | "VERIFIED"
  | "REJECTED"
  | "SUPERSEDED"
  | "CANCELLED"
  | "PENDING"
  | "FINAL"
  | "CORRECTED"
  | "ARCHIVED"
  | "EXPIRED"
  | "VALID";

export type MedicalDocumentSourceType =
  | "HOSPITAL"
  | "DOCTOR"
  | "LAB"
  | "PATIENT"
  | "EXTERNAL_PROVIDER"
  | "SYSTEM_GENERATED"
  | "HOSPITAL_ISSUED"
  | "CLINIC_ISSUED"
  | "DIAGNOSTIC_ISSUED"
  | "PATIENT_UPLOADED";

export interface MedicalDocument {
  id: string;
  document_code: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  hospital_id?: string;
  hospital_name?: string;
  hospital_code?: string;
  doctor_id?: string;
  doctor_name?: string;
  doctor_specialty?: string;
  title: string;
  category: DocumentCategory;
  department?: string;
  status: MedicalDocumentStatus;
  source_type: MedicalDocumentSourceType;
  source_label: string;
  file_type: "PDF" | "DICOM" | "IMAGE" | "JPEG" | "PNG" | "DOCX" | string;
  file_size_kb?: number;
  document_date: string;
  reference_id?: string;
  visit_id?: string;
  notes?: string;
  images_count?: number;
  verification_token?: string;
  digital_signature?: string;
  uploaded_by?: string;
  created_by?: string;
  verified_by?: string;
  verified_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  reviewed_by_name?: string;
  review_notes?: string;
  related_request_id?: string;
  version?: number;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface DocumentRequest {
  id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  hospital_id?: string;
  hospital_name?: string;
  doctor_id?: string;
  doctor_name?: string;
  doctor_specialty?: string;
  document_type: string;
  title: string;
  instructions?: string;
  urgency: "ROUTINE" | "URGENT" | "STAT";
  status: "PENDING" | "FULFILLED" | "CANCELLED" | "EXPIRED";
  fulfilled_document_id?: string;
  created_at: string;
  fulfilled_at?: string;
}

export interface MedicalDocumentDetail extends MedicalDocument {
  metadata?: Record<string, any>;
  images?: DocumentImageSlice[];
}

export interface ConnectedHospitalSummary {
  hospital_id: string;
  hospital_name: string;
  doc_count: number;
}

export interface DocumentCountsSummary {
  total_documents: number;
  connected_hospitals_count: number;
  categories: Record<string, number>;
  hospitals: ConnectedHospitalSummary[];
}

export interface DocumentShare {
  id: string;
  document_id: string;
  share_token: string;
  recipient_name: string;
  access_level: "VIEW_ONLY" | "ALLOW_DOWNLOAD";
  expires_at: string;
  revoked_at?: string | null;
  revocation_reason?: string | null;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  created_at: string;
}

export interface DocumentShareCreatePayload {
  recipient_name?: string;
  access_level?: "VIEW_ONLY" | "ALLOW_DOWNLOAD";
  duration_hours?: number;
}

export interface PersonalDocumentUploadPayload {
  title: string;
  category: DocumentCategory;
  document_date?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size_kb?: number;
  notes?: string;
  hospital_id?: string;
  source_type?: string;
  source_label?: string;
  doctor_id?: string;
  related_request_id?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface PublicDocumentVerification {
  verified: boolean;
  document_code: string;
  title: string;
  category: DocumentCategory;
  hospital_name?: string;
  hospital_code?: string;
  department?: string;
  document_date: string;
  status: string;
  source_label: string;
  digital_signature?: string;
  verification_authority: string;
  verification_timestamp: string;
  privacy_notice: string;
}

export interface SharedDocumentDetail extends MedicalDocumentDetail {
  share_id: string;
  recipient_name: string;
  access_level: "VIEW_ONLY" | "ALLOW_DOWNLOAD";
  expires_at: string;
  revoked_at?: string | null;
  revocation_reason?: string | null;
  is_active: boolean;
}

export const medicalDocumentsAPI = {
  /**
   * List medical documents for patient/family member across all authorized healthcare facilities.
   */
  listDocuments: async (params?: {
    patient_id?: string;
    hospital_id?: string;
    category?: string;
    doctor_id?: string;
    department?: string;
    visit_id?: string;
    status?: string;
    from_date?: string;
    to_date?: string;
    search?: string;
    sort_by?: "newest" | "oldest" | "title" | "hospital" | "category";
  }): Promise<{ data: MedicalDocument[] }> => {
    const query = new URLSearchParams();
    if (params?.patient_id) query.append("patient_id", params.patient_id);
    if (params?.hospital_id && params.hospital_id !== "ALL") query.append("hospital_id", params.hospital_id);
    if (params?.category && params.category !== "ALL") query.append("category", params.category);
    if (params?.doctor_id) query.append("doctor_id", params.doctor_id);
    if (params?.department) query.append("department", params.department);
    if (params?.visit_id) query.append("visit_id", params.visit_id);
    if (params?.status && params.status !== "ALL") query.append("status", params.status);
    if (params?.from_date) query.append("from_date", params.from_date);
    if (params?.to_date) query.append("to_date", params.to_date);
    if (params?.search) query.append("search", params.search);
    if (params?.sort_by) query.append("sort_by", params.sort_by);

    const queryString = query.toString();
    const endpoint = `/me/documents${queryString ? `?${queryString}` : ""}`;
    return fetchJSON<{ data: MedicalDocument[] }>(endpoint);
  },

  /**
   * Get total document counts, category counters, and list of hospitals where patient has records.
   */
  getDocumentCounts: async (patient_id?: string): Promise<{ data: DocumentCountsSummary }> => {
    const query = patient_id ? `?patient_id=${encodeURIComponent(patient_id)}` : "";
    return fetchJSON<{ data: DocumentCountsSummary }>(`/me/documents/counts${query}`);
  },

  /**
   * Get single medical document detail including rich metadata and imaging slice series.
   */
  getDocumentDetail: async (document_id: string, patient_id?: string): Promise<{ data: MedicalDocumentDetail }> => {
    const query = patient_id ? `?patient_id=${encodeURIComponent(patient_id)}` : "";
    return fetchJSON<{ data: MedicalDocumentDetail }>(`/me/documents/${encodeURIComponent(document_id)}${query}`);
  },

  /**
   * List pending/fulfilled document requests for patient.
   */
  listDocumentRequests: async (patient_id?: string): Promise<{ data: DocumentRequest[] }> => {
    const query = patient_id ? `?patient_id=${encodeURIComponent(patient_id)}` : "";
    return fetchJSON<{ data: DocumentRequest[] }>(`/me/documents/requests${query}`);
  },

  /**
   * Upload a personal medical document into the patient's personal health repository.
   */
  uploadPersonalDocument: async (
    payload: PersonalDocumentUploadPayload,
    patient_id?: string
  ): Promise<{ data: MedicalDocumentDetail; message: string }> => {
    const query = patient_id ? `?patient_id=${encodeURIComponent(patient_id)}` : "";
    return fetchJSON<{ data: MedicalDocumentDetail; message: string }>(`/me/documents/upload${query}`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  /**
   * Create a time-limited secure share link for a medical document.
   */
  shareDocument: async (
    document_id: string,
    payload: DocumentShareCreatePayload,
    patient_id?: string
  ): Promise<{ data: DocumentShare; message: string }> => {
    const query = patient_id ? `?patient_id=${encodeURIComponent(patient_id)}` : "";
    return fetchJSON<{ data: DocumentShare; message: string }>(
      `/me/documents/${encodeURIComponent(document_id)}/share${query}`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );
  },

  /**
   * List all share links created for a specific document.
   */
  listDocumentShares: async (document_id: string, patient_id?: string): Promise<{ data: DocumentShare[] }> => {
    const query = patient_id ? `?patient_id=${encodeURIComponent(patient_id)}` : "";
    return fetchJSON<{ data: DocumentShare[] }>(
      `/me/documents/${encodeURIComponent(document_id)}/shares${query}`
    );
  },

  /**
   * Revoke an active document share link immediately.
   */
  revokeDocumentShare: async (
    share_id: string,
    patient_id?: string,
    reason?: string
  ): Promise<{ data: { share_id: string; revoked: boolean }; message: string }> => {
    const query = new URLSearchParams();
    if (patient_id) query.append("patient_id", patient_id);
    if (reason) query.append("reason", reason);
    const queryString = query.toString();

    return fetchJSON<{ data: { share_id: string; revoked: boolean }; message: string }>(
      `/me/document-shares/${encodeURIComponent(share_id)}/revoke${queryString ? `?${queryString}` : ""}`,
      { method: "POST" }
    );
  },

  /**
   * Record an audit trail event for document interaction (print, download, view).
   */
  logDocumentAudit: async (
    document_id: string,
    action: "VIEW" | "PRINT" | "DOWNLOAD" | "SHARE_CREATE",
    patient_id?: string
  ): Promise<{ success: boolean }> => {
    const query = patient_id ? `?patient_id=${encodeURIComponent(patient_id)}` : "";
    return fetchJSON<{ success: boolean }>(
      `/me/documents/${encodeURIComponent(document_id)}/audit${query}`,
      {
        method: "POST",
        body: JSON.stringify({ action })
      }
    );
  },

  /**
   * Public retrieval of a shared document via secure time-limited token.
   */
  getSharedDocument: async (share_token: string): Promise<{ data: SharedDocumentDetail; success: boolean; error?: any; message?: string }> => {
    return fetchJSON<{ data: SharedDocumentDetail; success: boolean; error?: any; message?: string }>(
      `/public/share/document/${encodeURIComponent(share_token)}`
    );
  },

  /**
   * Zero-knowledge public verification of document digital signature and authenticity.
   */
  verifyDocumentPublic: async (token: string): Promise<{ data: PublicDocumentVerification; success: boolean; message?: string }> => {
    return fetchJSON<{ data: PublicDocumentVerification; success: boolean; message?: string }>(
      `/public/verify/document/${encodeURIComponent(token)}`
    );
  }
};
