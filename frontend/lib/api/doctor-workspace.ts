import { fetchJSON } from "./client";
import {
  PatientConsultationContext,
  LongitudinalHistoryEvent,
  PatientReportedIntake,
  InvestigationCatalogItem,
  InvestigationOrder,
  DoctorReferral,
  DoctorReferralDirectoryItem,
  ConsultationSummary,
} from "../types";
import { MedicalDocument, MedicalDocumentDetail, DocumentRequest } from "./documents";

export interface InvestigationOrderPayloadItem {
  test_id: string;
  priority?: "ROUTINE" | "URGENT" | "STAT";
  clinical_reason?: string;
  instructions?: string;
  fasting_required?: boolean;
  collection_type?: "Hospital" | "Lab" | "Home" | string;
  preferred_lab_name?: string;
}

export interface DoctorReferralPayload {
  receiving_doctor_id?: string;
  receiving_doctor_name?: string;
  specialty: string;
  referral_type?: "INTERNAL" | "EXTERNAL";
  reason: string;
  clinical_summary?: string;
  priority?: "ROUTINE" | "URGENT";
  requested_evaluation?: string;
  attached_reports?: {
    id: string;
    title: string;
    category?: string;
    date?: string;
  }[];
}

export interface ConsultationSavePayload {
  appointment_id?: string;
  diagnosis: string;
  symptoms?: string;
  clinical_notes?: string;
  vitals?: Record<string, any>;
  chief_complaint?: Record<string, any>;
  examination?: Record<string, any>;
  medical_history?: Record<string, any>;
  diagnoses?: Array<{
    code?: string;
    description: string;
    tier: "PRIMARY" | "SECONDARY" | "PROVISIONAL" | "CONFIRMED";
  }>;
  prescription?: {
    diagnosis?: string;
    instructions?: string;
    items: Array<{
      medicine_name: string;
      generic_name?: string;
      strength?: string;
      form?: string;
      dose?: string;
      frequency?: string;
      duration?: string;
      route?: string;
      instructions?: string;
      quantity?: number;
      refills?: number;
    }>;
  };
  referral?: DoctorReferralPayload;
  follow_up?: {
    required: boolean;
    date?: string;
    days?: number;
    department?: string;
    doctor_name?: string;
    notes?: string;
  };
  is_draft?: boolean;
}

export const doctorWorkspaceApi = {
  /**
   * Get complete patient clinical context (scoped to selected patient).
   */
  async getPatientContext(patientId: string): Promise<PatientConsultationContext> {
    return fetchJSON<PatientConsultationContext>(`/doctor/patients/${patientId}/context`);
  },

  /**
   * Get longitudinal medical history across hospitals for the selected patient.
   */
  async getLongitudinalHistory(
    patientId: string,
    filters?: {
      hospital_id?: string;
      doctor_id?: string;
      record_type?: string;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<{ events: LongitudinalHistoryEvent[]; count: number }> {
    const params = new URLSearchParams();
    if (filters?.hospital_id) params.append("hospital_id", filters.hospital_id);
    if (filters?.doctor_id) params.append("doctor_id", filters.doctor_id);
    if (filters?.record_type) params.append("record_type", filters.record_type);
    if (filters?.start_date) params.append("start_date", filters.start_date);
    if (filters?.end_date) params.append("end_date", filters.end_date);

    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchJSON<{ events: LongitudinalHistoryEvent[]; count: number }>(
      `/doctor/patients/${patientId}/history${query}`
    );
  },

  /**
   * Get patient-reported pre-consultation intake.
   */
  async getPatientIntake(patientId: string, appointmentId?: string): Promise<{ intake?: PatientReportedIntake }> {
    const query = appointmentId ? `?appointment_id=${encodeURIComponent(appointmentId)}` : "";
    return fetchJSON<{ intake?: PatientReportedIntake }>(`/doctor/patients/${patientId}/intake${query}`);
  },

  /**
   * Submit or update patient-reported pre-consultation intake.
   */
  async submitPatientIntake(
    patientId: string,
    intake: PatientReportedIntake
  ): Promise<{ message: string; intake: PatientReportedIntake }> {
    return fetchJSON<{ message: string; intake: PatientReportedIntake }>(
      `/doctor/patients/${patientId}/intake`,
      {
        method: "POST",
        body: JSON.stringify(intake),
      }
    );
  },

  /**
   * List multi-category investigation catalog (Blood, Urine, Stool, Cardiac, Imaging, etc.).
   */
  async listInvestigationCatalog(category?: string, search?: string): Promise<{ catalog: InvestigationCatalogItem[]; count: number }> {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (search) params.append("search", search);
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchJSON<{ catalog: InvestigationCatalogItem[]; count: number }>(
      `/doctor/investigations/catalog${query}`
    );
  },

  /**
   * Order a batch of investigations for the selected patient.
   */
  async orderInvestigations(
    patientId: string,
    orders: InvestigationOrderPayloadItem[]
  ): Promise<{ message: string; orders: InvestigationOrder[] }> {
    return fetchJSON<{ message: string; orders: InvestigationOrder[] }>(
      `/doctor/patients/${patientId}/investigations`,
      {
        method: "POST",
        body: JSON.stringify({ orders }),
      }
    );
  },

  /**
   * Get investigation orders and results for the selected patient.
   */
  async getPatientInvestigations(
    patientId: string,
    status?: string
  ): Promise<{ investigations: InvestigationOrder[]; count: number }> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return fetchJSON<{ investigations: InvestigationOrder[]; count: number }>(
      `/doctor/patients/${patientId}/investigations${query}`
    );
  },

  /**
   * Record doctor review on an investigation result.
   */
  async reviewInvestigation(
    orderId: string,
    reviewNotes: string
  ): Promise<{ message: string; order: InvestigationOrder }> {
    return fetchJSON<{ message: string; order: InvestigationOrder }>(
      `/doctor/investigations/${orderId}/review`,
      {
        method: "POST",
        body: JSON.stringify({ review_notes: reviewNotes }),
      }
    );
  },

  /**
   * Create a specialist referral with selective document sharing.
   */
  async createReferral(
    patientId: string,
    payload: DoctorReferralPayload
  ): Promise<{ message: string; referral: DoctorReferral }> {
    return fetchJSON<{ message: string; referral: DoctorReferral }>(
      `/doctor/patients/${patientId}/referrals`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * Get all specialist referrals for the selected patient.
   */
  async getPatientReferrals(patientId: string): Promise<{ referrals: DoctorReferral[]; count: number }> {
    return fetchJSON<{ referrals: DoctorReferral[]; count: number }>(
      `/doctor/patients/${patientId}/referrals`
    );
  },

  /**
   * Search credentialed, active doctor referral directory.
   */
  async listReferralDirectory(
    specialty?: string,
    hospitalId?: string
  ): Promise<{ directory: DoctorReferralDirectoryItem[]; count: number }> {
    const params = new URLSearchParams();
    if (specialty) params.append("specialty", specialty);
    if (hospitalId) params.append("hospital_id", hospitalId);
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchJSON<{ directory: DoctorReferralDirectoryItem[]; count: number }>(
      `/doctor/referrals/directory${query}`
    );
  },

  /**
   * Save consultation as draft or complete it.
   */
  async saveConsultation(
    patientId: string,
    payload: ConsultationSavePayload
  ): Promise<{
    message: string;
    consultation_id?: string;
    prescription_id?: string;
    summary: ConsultationSummary;
  }> {
    return fetchJSON<{
      message: string;
      consultation_id?: string;
      prescription_id?: string;
      summary: ConsultationSummary;
    }>(`/doctor/patients/${patientId}/consultation`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get finalized consultation summary sheet.
   */
  async getConsultationSummary(
    patientId: string,
    consultationId?: string
  ): Promise<{ summary: ConsultationSummary }> {
    const query = consultationId ? `?consultation_id=${encodeURIComponent(consultationId)}` : "";
    return fetchJSON<{ summary: ConsultationSummary }>(
      `/doctor/patients/${patientId}/consultation-summary${query}`
    );
  },

  /**
   * Get Doctor Document Inbox for triage (🔴 Awaiting Review, 🟡 Patient Uploaded, 🟢 Verified).
   */
  async getDoctorDocumentInbox(params?: {
    status?: string;
    source_type?: string;
    category?: string;
    search?: string;
    limit?: number;
  }): Promise<{
    data: MedicalDocument[];
    summary: {
      awaiting_review_count: number;
      patient_uploaded_count: number;
      verified_count: number;
      total_inbox_count: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== "ALL") query.append("status", params.status);
    if (params?.source_type && params.source_type !== "ALL") query.append("source_type", params.source_type);
    if (params?.category && params.category !== "ALL") query.append("category", params.category);
    if (params?.search) query.append("search", params.search);
    if (params?.limit) query.append("limit", params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : "";
    return fetchJSON<{
      data: MedicalDocument[];
      summary: {
        awaiting_review_count: number;
        patient_uploaded_count: number;
        verified_count: number;
        total_inbox_count: number;
      };
    }>(`/doctor/documents/inbox${qs}`);
  },

  /**
   * Get patient medical documents with clinical scoping and filters.
   */
  async getPatientDocuments(
    patientId: string,
    params?: {
      category?: string;
      source_type?: string;
      status?: string;
      from_date?: string;
      to_date?: string;
      search?: string;
      sort_by?: string;
    }
  ): Promise<{ data: MedicalDocument[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.category && params.category !== "ALL") query.append("category", params.category);
    if (params?.source_type && params.source_type !== "ALL") query.append("source_type", params.source_type);
    if (params?.status && params.status !== "ALL") query.append("status", params.status);
    if (params?.from_date) query.append("from_date", params.from_date);
    if (params?.to_date) query.append("to_date", params.to_date);
    if (params?.search) query.append("search", params.search);
    if (params?.sort_by) query.append("sort_by", params.sort_by);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return fetchJSON<{ data: MedicalDocument[]; total: number }>(
      `/doctor/patients/${patientId}/documents${qs}`
    );
  },

  /**
   * Upload an external medical document (brought by patient from another hospital/lab).
   */
  async uploadExternalDocument(
    patientId: string,
    payload: {
      title: string;
      category: string;
      document_date?: string;
      external_hospital_name?: string;
      external_doctor_name?: string;
      clinical_note?: string;
      file_type?: string;
      file_size_kb?: number;
      file_url?: string;
      tags?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<{ message: string; document: MedicalDocumentDetail }> {
    return fetchJSON<{ message: string; document: MedicalDocumentDetail }>(
      `/doctor/patients/${patientId}/documents/upload-external`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * Formally request a medical document from the patient.
   */
  async requestDocumentFromPatient(
    patientId: string,
    payload: {
      title: string;
      document_type: string;
      instructions?: string;
      urgency?: "ROUTINE" | "URGENT" | "STAT";
      related_visit_id?: string;
    }
  ): Promise<{ message: string; request: DocumentRequest }> {
    return fetchJSON<{ message: string; request: DocumentRequest }>(
      `/doctor/patients/${patientId}/documents/request`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * Clinically review a patient-uploaded or external document.
   */
  async reviewDocument(
    documentId: string,
    payload: {
      review_notes: string;
      mark_verified?: boolean;
    }
  ): Promise<{ message: string; document: MedicalDocumentDetail }> {
    return fetchJSON<{ message: string; document: MedicalDocumentDetail }>(
      `/doctor/documents/${documentId}/review`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * Attach previous/external documents to consultation SOAP note.
   */
  async attachDocumentsToConsultation(
    consultationId: string,
    documentIds: string[],
    notes?: string
  ): Promise<{ message: string; attached_count: number }> {
    return fetchJSON<{ message: string; attached_count: number }>(
      `/doctor/consultations/${consultationId}/attach-documents`,
      {
        method: "POST",
        body: JSON.stringify({ document_ids: documentIds, notes }),
      }
    );
  },

  /**
   * Get documents attached to a specific consultation.
   */
  async getConsultationAttachedDocuments(
    consultationId: string
  ): Promise<{ data: MedicalDocument[]; count: number }> {
    return fetchJSON<{ data: MedicalDocument[]; count: number }>(
      `/doctor/consultations/${consultationId}/attached-documents`
    );
  },
};
