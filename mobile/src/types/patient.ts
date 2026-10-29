/**
 * ONEHEALTH ID (OH-ID) Mobile — Patient Experience Types
 * Sathus Technology Pvt Ltd
 *
 * Grounded in Backend PII Masking, RBAC, and Unified Patient Workspace Models.
 */

export interface ConnectedFacility {
  hospital_id: string;
  hospital_name: string;
  hospital_code?: string;
  hospital_city?: string;
  branch_id?: string;
  branch_name?: string;
  local_uhid?: string;
  registered_at?: string;
  is_primary?: boolean;
}

export interface OhIdCardData {
  onehealth_id: string;
  qr_token: string;
  name: string;
  dob?: string;
  age?: number;
  gender?: string;
  blood_group?: string;
  emergency_contact?: string;
  verification_status: "VERIFIED_ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED";
  connected_facilities?: ConnectedFacility[];
  facilities_count?: number;
}

export interface PatientProfile {
  id: string;
  name: string;
  onehealth_id: string;
  age?: number;
  gender?: string;
  blood_group?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  diagnosis?: string;
  qr_token?: string;
  hospital_id?: string;
  branch_id?: string;
}

export interface MedicineItem {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
}

export interface PrescriptionItem {
  id: string;
  prescription_code?: string;
  date: string;
  doctor_name: string;
  hospital_name: string;
  department?: string;
  diagnosis?: string;
  medicines: MedicineItem[];
  status: "ACTIVE" | "COMPLETED" | "SUPERSEDED" | "EXPIRED" | "CANCELLED";
  download_url?: string;
}

export interface AppointmentItem {
  id: string;
  appointment_date: string;
  appointment_time?: string;
  doctor_id?: string;
  doctor_name: string;
  department: string;
  hospital_id?: string;
  hospital_name: string;
  token_number?: number;
  token_str?: string;
  status: "CONFIRMED" | "CHECKED_IN" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED";
  chief_complaint?: string;
  queue_status?: string;
}

export interface TimelineEvent {
  id: string;
  event_type: "CONSULTATION" | "PRESCRIPTION" | "LAB_REPORT" | "INVESTIGATION" | "DOCUMENT" | "REFERRAL" | "VISIT";
  event_date: string;
  title: string;
  summary?: string;
  doctor_name?: string;
  hospital_name?: string;
  department?: string;
  status?: string;
  metadata?: Record<string, any>;
}
