import { fetchJSON } from "./client";

export interface PrescriptionItemPayload {
  medicine_name: string;
  strength?: string;
  dosage_form?: string;
  dose?: string;
  frequency?: string;
  duration_days?: number;
  route?: string;
  food_instruction?: string;
  quantity?: number;
  specific_instructions?: string;
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
  visit_id: string;
  patient_id: string;
  patient_name: string;
  onehealth_id: string;
  patient_age: number;
  patient_gender: string;
  patient_blood_group?: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string;
  doctor_registration: string;
  hospital_id: string;
  hospital_name: string;
  hospital_address?: string;
  hospital_phone?: string;
  diagnosis: string;
  instructions?: string;
  doctor_notes?: string;
  follow_up_days?: number;
  follow_up_date?: string;
  status: string;
  requires_pin?: boolean;
  verification_token?: string;
  signed_by?: string;
  signed_at?: string;
  digital_signature_hash?: string;
  version?: number;
  created_at: string;
  items: Array<{
    id: string;
    medicine_name: string;
    dosage?: string;
    dose?: string;
    strength?: string;
    dosage_form?: string;
    route?: string;
    frequency?: string;
    duration_days?: number;
    quantity?: number;
    food_instruction?: string;
    specific_instructions?: string;
  }>;
}

export const prescriptionsApi = {
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

  finalize: async (prescriptionId: string) => {
    return fetchJSON<PrescriptionRecord>(`/prescriptions/${prescriptionId}/finalize`, {
      method: "POST",
    });
  },

  verify: async (prescriptionId: string, verificationToken?: string, pin?: string) => {
    return fetchJSON<{
      verified: boolean;
      prescription_id: string;
      status: string;
      patient_name: string;
      doctor_name: string;
      doctor_registration: string;
      hospital_name: string;
      created_at: string;
      digital_signature_hash?: string;
    }>(`/prescriptions/${prescriptionId}/verify`, {
      method: "POST",
      body: JSON.stringify({ verification_token: verificationToken, pin }),
    });
  },

  getPrintLayout: async (prescriptionId: string) => {
    return fetchJSON<{
      layout: string;
      header: {
        hospital_name: string;
        hospital_address: string;
        hospital_phone: string;
        system_tag: string;
      };
      prescription: PrescriptionRecord;
    }>(`/prescriptions/${prescriptionId}/print`);
  },

  getPdf: async (prescriptionId: string) => {
    return fetchJSON<{
      download_url: string;
      filename: string;
      prescription: PrescriptionRecord;
    }>(`/prescriptions/${prescriptionId}/pdf`);
  },
};
