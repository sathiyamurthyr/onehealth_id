import { fetchJSON } from "./client";

export interface PrescriptionItemPayload {
  medicine_name: string;
  generic_name?: string;
  brand_name?: string;
  strength?: string;
  dosage_form?: string;
  dose?: string;
  dosage?: string;
  frequency?: string;
  duration_days?: number;
  duration_value?: number;
  duration_unit?: string;
  route?: string;
  food_instruction?: string;
  quantity?: number;
  refills?: number;
  specific_instructions?: string;
  is_prn?: boolean;
}

export interface MedicationScheduleItem {
  medicine_name: string;
  strength?: string;
  dosage_form?: string;
  dose?: string;
  frequency?: string;
  food_instruction?: string;
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  has_schedule: boolean;
}

export interface CreatePrescriptionPayload {
  patient_id: string;
  doctor_id?: string;
  hospital_id?: string;
  visit_id?: string;
  diagnosis: string;
  doctor_notes?: string;
  follow_up_days?: number;
  follow_up_date?: string;
  requires_pin?: boolean;
  verification_pin?: string;
  items: PrescriptionItemPayload[];
}

export interface PrescriptionRecord {
  id: string;
  consultation_id?: string;
  visit_id?: string;
  encounter_id?: string;
  appointment_id?: string;
  patient_id: string;
  patient_name: string;
  onehealth_id?: string;
  patient_ohid?: string;
  patient_age?: number;
  patient_gender?: string;
  patient_dob?: string;
  patient_phone?: string;
  patient_blood_group?: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty?: string;
  doctor_qualification?: string;
  doctor_registration?: string;
  doctor_registration_authority?: string;
  doctor_department?: string;
  hospital_id: string;
  hospital_name: string;
  hospital_code?: string;
  hospital_address?: string;
  hospital_phone?: string;
  hospital_email?: string;
  hospital_website?: string;
  hospital_logo?: string;
  diagnosis: string;
  chief_complaint?: string;
  clinical_advice?: string;
  instructions?: string;
  doctor_notes?: string;
  vitals_snapshot?: {
    bp?: string;
    pulse?: string;
    weight_kg?: number;
    height_cm?: number;
    bmi?: number;
    temperature_f?: string;
    spo2?: string;
  };
  allergies_snapshot?: string[];
  follow_up_days?: number;
  follow_up_date?: string;
  follow_up_appointment_id?: string;
  follow_up_appointment?: {
    id: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
    doctor_name: string;
    hospital_name: string;
  };
  valid_from?: string;
  valid_until?: string;
  validity_type?: string;
  validity_source?: string;
  status: string;
  computed_status: "ACTIVE" | "EXPIRED" | "SUPERSEDED" | "COMPLETED" | "CANCELLED" | string;
  status_display: string;
  badge_color: string;
  is_valid: boolean;
  is_expired: boolean;
  watermark_text?: string | null;
  validity_narrative?: string;
  requires_pin?: boolean;
  verification_token?: string;
  verification_url?: string;
  qr_payload_url?: string;
  is_verified?: boolean;
  signed_by?: string;
  signed_at?: string;
  digital_signature_hash?: string;
  superseded_by_id?: string;
  superseded_by_prescription?: {
    id: string;
    created_at: string;
    doctor_id?: string;
    doctor_name?: string;
  };
  superseded_at?: string;
  supersession_reason?: string;
  parent_prescription_id?: string;
  parent_prescription?: {
    id: string;
    created_at: string;
    diagnosis?: string;
  };
  cancellation_reason?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  is_patient_visible?: boolean;
  version?: number;
  created_at: string;
  updated_at?: string;
  items: Array<{
    id?: string;
    medicine_name: string;
    generic_name?: string;
    brand_name?: string;
    dosage?: string;
    dose?: string;
    strength?: string;
    dosage_form?: string;
    route?: string;
    frequency?: string;
    duration_days?: number;
    duration_value?: number;
    duration_unit?: string;
    quantity?: number;
    refills?: number;
    food_instruction?: string;
    specific_instructions?: string;
    is_prn?: boolean;
    start_date?: string;
    end_date?: string;
  }>;
  medication_schedule?: MedicationScheduleItem[];
  share_metadata?: {
    recipient_name?: string;
    access_level?: string;
    expires_at?: string;
    access_count?: number;
  };
  is_shared_view?: boolean;
}

export interface PrescriptionShare {
  id: string;
  prescription_id: string;
  patient_id: string;
  share_token: string;
  share_url: string;
  recipient_label?: string;
  recipient_name?: string;
  recipient_contact?: string;
  access_level: "VIEW_ONLY" | "VIEW_AND_DOWNLOAD" | string;
  expires_at: string;
  is_revoked: boolean;
  is_active: boolean;
  access_count: number;
  last_accessed_at?: string;
  created_at: string;
}

export interface PrescriptionFilterParams {
  status?: string;
  hospital_id?: string;
  doctor_id?: string;
  date_range?: string;
  start_date?: string;
  end_date?: string;
  prescription_type?: string;
  search?: string;
  patient_id?: string;
  limit?: number;
}

export interface PrescriptionVerificationResponse {
  is_verified: boolean;
  prescription_id: string;
  status: string;
  status_display: string;
  is_valid: boolean;
  is_expired: boolean;
  watermark_text?: string | null;
  issue_date: string;
  valid_from: string;
  valid_until: string;
  doctor: {
    name: string;
    specialty?: string;
    registration_number?: string;
    registration_authority?: string;
  };
  hospital: {
    name: string;
    code?: string;
    address?: string;
    phone?: string;
    website?: string;
  };
  digital_signature: {
    is_signed: boolean;
    signature_hash?: string;
    signed_at?: string;
  };
  verification_note?: string;
}

export type PatientPrescriptionDetail = PrescriptionRecord;

export const prescriptionsApi = {
  // Clinician / Staff APIs
  list: async (params?: { patient_id?: string; doctor_id?: string; hospital_id?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.patient_id) q.set("patient_id", params.patient_id);
    if (params?.doctor_id) q.set("doctor_id", params.doctor_id);
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return fetchJSON<PrescriptionRecord[]>(`/prescriptions${qs ? `?${qs}` : ""}`);
  },

  create: async (payload: CreatePrescriptionPayload) => {
    return fetchJSON<PrescriptionRecord>("/prescriptions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  get: async (prescriptionId: string) => {
    return fetchJSON<PrescriptionRecord>(`/prescriptions/${prescriptionId}`);
  },

  getPdf: async (prescriptionId: string) => {
    return fetchJSON<{
      success: boolean;
      data: {
        prescription_id: string;
        filename: string;
        download_url: string;
        prescription: PrescriptionRecord;
      };
    }>(`/me/prescriptions/${prescriptionId}/pdf`);
  },

  verify: async (prescriptionId: string, token?: string) => {
    return fetchJSON<any>(`/public/verify/prescription/${token || prescriptionId}`);
  },

  finalize: async (prescriptionId: string) => {
    return fetchJSON<PrescriptionRecord>(`/prescriptions/${prescriptionId}/finalize`, {
      method: "POST",
    });
  },

  // Patient Self-Service Workspace APIs
  getMyPrescriptions: async (params?: PrescriptionFilterParams) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.doctor_id) q.set("doctor_id", params.doctor_id);
    if (params?.date_range) q.set("date_range", params.date_range);
    if (params?.start_date) q.set("start_date", params.start_date);
    if (params?.end_date) q.set("end_date", params.end_date);
    if (params?.prescription_type) q.set("prescription_type", params.prescription_type);
    if (params?.search) q.set("search", params.search);
    if (params?.patient_id) q.set("patient_id", params.patient_id);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: PrescriptionRecord[]; meta?: any }>(`/me/prescriptions${qs ? `?${qs}` : ""}`);
  },

  getMyPrescriptionDetail: async (prescriptionId: string, patientId?: string) => {
    const q = new URLSearchParams();
    if (patientId) q.set("patient_id", patientId);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: PrescriptionRecord }>(`/me/prescriptions/${prescriptionId}${qs ? `?${qs}` : ""}`);
  },

  getMyPrescriptionPdf: async (prescriptionId: string) => {
    return fetchJSON<{
      success: boolean;
      data: {
        prescription_id: string;
        filename: string;
        download_url: string;
        prescription: PrescriptionRecord;
      };
    }>(`/me/prescriptions/${prescriptionId}/pdf`);
  },

  createShare: async (
    prescriptionId: string,
    payload: {
      recipient_name?: string;
      recipient_contact?: string;
      access_level?: "VIEW_ONLY" | "VIEW_AND_DOWNLOAD" | string;
      duration_hours?: number;
    }
  ) => {
    return fetchJSON<{ success: boolean; data: PrescriptionShare; message: string }>(
      `/me/prescriptions/${prescriptionId}/share`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  listShares: async (prescriptionId: string) => {
    return fetchJSON<{ success: boolean; data: PrescriptionShare[] }>(`/me/prescriptions/${prescriptionId}/shares`);
  },

  revokeShare: async (shareId: string) => {
    return fetchJSON<{ success: boolean; data: PrescriptionShare; message: string }>(
      `/me/prescription-shares/${shareId}`,
      {
        method: "DELETE",
      }
    );
  },

  recordAudit: async (prescriptionId: string, action: string, details?: any) => {
    return fetchJSON<{ success: boolean; message: string }>(`/me/prescriptions/${prescriptionId}/audit`, {
      method: "POST",
      body: JSON.stringify({ action, details }),
    });
  },

  // Public Verification & Shared Links
  getPublicVerification: async (token: string) => {
    return fetchJSON<{ success: boolean; data: PrescriptionVerificationResponse; message: string }>(
      `/public/verify/prescription/${token}`
    );
  },

  getPublicShare: async (token: string) => {
    return fetchJSON<{ success: boolean; data: PrescriptionRecord; message?: string; error?: any }>(
      `/public/share/prescription/${token}`
    );
  },
};
