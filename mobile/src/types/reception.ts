/**
 * ONEHEALTH ID (OH-ID) Mobile — Reception Desk Domain Types
 * Sathus Technology Pvt Ltd
 */

export type QueuePriority = "NORMAL" | "URGENT" | "STAT";

export const OPD_DEPARTMENTS = [
  "General Medicine",
  "Cardiology",
  "Orthopedics",
  "Pediatrics",
  "ENT & Pulmonology",
  "Dermatology",
  "Emergency Triage",
] as const;

export type OpdDepartment = (typeof OPD_DEPARTMENTS)[number];

export interface ScannedPatientSummary {
  patient_id: string;
  onehealth_id: string;
  name: string;
  age?: number;
  gender?: string;
  blood_group?: string;
  verification_status: "VERIFIED" | "PENDING" | "UNKNOWN";
  registered_phone?: string;
}

export interface OpdTokenConfirmation {
  token_id: string;
  token_number: number;
  token_str: string;
  patient_id: string;
  patient_name: string;
  onehealth_id: string;
  department: string;
  priority: QueuePriority;
  counter_name: string;
  assigned_doctor?: string;
  room_number?: string;
  estimated_wait_minutes: number;
  issued_at: string;
}

export interface WalkInPatientPayload {
  name: string;
  mobile: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  blood_group: string;
  initial_department?: string;
}

export interface WalkInRegistrationResult {
  patient_id: string;
  onehealth_id: string;
  qr_token: string;
  name: string;
  mobile: string;
  verification_status: string;
  issued_token?: OpdTokenConfirmation;
}

