/**
 * ONEHEALTH ID (OH-ID) Mobile — Nurse Workspace Types
 * Sathus Technology Pvt Ltd
 */

export interface InpatientItem {
  id: string;
  patient_id: string;
  patient_name: string;
  onehealth_id: string;
  patient_gender?: string;
  patient_age?: number;
  bed_number?: string;
  ward_id?: string;
  status: string;
  reason_for_admission?: string;
  doctor_name?: string;
  admission_date?: string;
  latest_vitals?: {
    temperature?: number;
    blood_pressure?: string;
    heart_rate?: number;
    spo2?: number;
    recorded_at?: string;
  };
}

export interface VitalsBatchPayload {
  patient_id: string;
  encounter_id?: string;
  admission_id?: string;
  temperature?: number;
  heart_rate?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  respiratory_rate?: number;
  spo2?: number;
  pain_score?: number;
  notes?: string;
}

export interface MedicationAdminPayload {
  prescription_id?: string;
  patient_id: string;
  admission_id?: string;
  medicine_name: string;
  dose: string;
  route: string;
  status?: string;
  reason_not_administered?: string;
}

export interface NursingNotePayload {
  patient_id: string;
  admission_id?: string;
  note_type?: string;
  assessment: string;
  care_provided: string;
  patient_response?: string;
  concerns?: string;
}

