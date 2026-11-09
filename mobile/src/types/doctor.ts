/**
 * ONEHEALTH ID (OH-ID) Mobile — Doctor Workspace & Clinical Triage Types
 * Sathus Technology Pvt Ltd
 *
 * Grounded in Backend Doctor Consultation Workspace & FHIR Prescription models.
 */

export interface DoctorProfile {
  id: string;
  user_id: string;
  name: string;
  specialty: string;
  qualification?: string;
  registration_number?: string;
  phone?: string;
  email?: string;
  room_number?: string;
  opd_timings?: string;
  consultation_fee?: number;
  current_hospital_id: string;
  current_hospital_name: string;
  authorized_hospitals?: Array<{
    hospital_id: string;
    hospital_name: string;
    hospital_code?: string;
    is_current: boolean;
  }>;
}

export type QueuePriority = "NORMAL" | "URGENT" | "STAT";
export type QueueStatus = "WAITING" | "CALLED" | "IN_CONSULTATION" | "COMPLETED";

export interface DoctorQueueItem {
  id: string;
  token_number: number;
  token_str: string;
  patient_id: string;
  patient_name: string;
  onehealth_id?: string;
  age?: number;
  gender?: string;
  priority: QueuePriority;
  status: QueueStatus;
  chief_complaint?: string;
  department_name?: string;
  checked_in_at?: string;
  wait_time_minutes?: number;
}

export interface ClinicalVitals {
  bp_systolic?: string;
  bp_diastolic?: string;
  heart_rate?: string;
  temperature?: string;
  spo2?: string;
  respiratory_rate?: string;
  weight_kg?: string;
  height_cm?: string;
}

export interface PrescriptionDrugItem {
  medicine_name: string;
  generic_name?: string;
  brand_name?: string;
  strength?: string;
  dosage_form?: string; // Tablet, Capsule, Syrup, Injection, Ointment
  dose?: string;
  frequency?: string; // 1-0-1, Once daily, TDS, SOS
  duration_days?: number;
  quantity?: number | string;
  route?: string; // Oral, Sublingual, IV, Topical
  food_instruction?: string; // Before food, After food, With food
  timing_morning?: boolean;
  timing_afternoon?: boolean;
  timing_evening?: boolean;
  timing_night?: boolean;
  is_prn?: boolean;
  prn_indication?: string;
  specific_instructions?: string;
  additional_instructions?: string;
}

export interface ConsultationPayload {
  appointment_id?: string;
  consultation_id?: string;
  version?: number;
  diagnosis: string;
  symptoms?: string;
  clinical_notes?: string;
  vitals?: ClinicalVitals;
  chief_complaint?: Record<string, any>;
  examination?: Record<string, any>;
  medical_history?: Record<string, any>;
  diagnoses?: Array<{
    description: string;
    tier: "PRIMARY" | "SECONDARY";
    code?: string;
  }>;
  prescription?: {
    items: PrescriptionDrugItem[];
    doctor_notes?: string;
    follow_up_days?: number;
    follow_up_date?: string;
    requires_pin?: boolean;
    verification_pin?: string;
  };
  referral?: Record<string, any>;
  follow_up?: {
    days?: number;
    date?: string;
    scheduled_date?: string;
    instructions?: string;
    notes?: string;
    department?: string;
    department_id?: string;
  };
  report_template_id?: string;
  rx_template_id?: string;
  is_draft?: boolean;
}

export interface ConsultationResponse {
  message: string;
  consultation_id?: string;
  prescription_id?: string;
  encounter_id?: string;
  digital_signature?: string;
  summary?: Record<string, any>;
}

export interface QRWorkflowScanResult {
  patient_id: string;
  patient_name: string;
  onehealth_id: string;
  age?: number;
  gender?: string;
  blood_group?: string;
  phone?: string;
  workflow_type?: string;
  status?: string;
  message?: string;
}
