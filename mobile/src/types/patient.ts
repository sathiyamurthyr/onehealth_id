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
  avatar_url?: string;
  profile_photo_url?: string;
  connected_facilities?: ConnectedFacility[];
  facilities_count?: number;
}

export interface PatientProfile {
  id: string;
  name: string;
  onehealth_id: string;
  avatar_url?: string;
  profile_photo_url?: string;
  age?: number;
  gender?: string;
  dob?: string;
  blood_group?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  emergency_contact?: string;
  preferred_language?: string;
  allergies?: string[];
  identity_type?: string;
  identity_number?: string;
  status?: string;
  verification_status?: string;
  diagnosis?: string;
  primary_condition?: string;
  medical_notes?: string;
  primary_hospital?: string;
  qr_token?: string;
  hospital_id?: string;
  hospital_name?: string;
  branch_id?: string;
  branch_name?: string;
}

export interface FamilyPermissions {
  view_appointments?: boolean;
  book_appointments?: boolean;
  view_records?: boolean;
  view_prescriptions?: boolean;
  view_lab_reports?: boolean;
  manage_profile?: boolean;
}

export interface FamilyMember {
  id: string;
  primary_patient_id: string;
  member_patient_id: string;
  relationship: string;
  is_guardian: boolean;
  is_minor: boolean;
  consent_status: string;
  permissions: FamilyPermissions;
  notes?: string;
  member_name: string;
  member_onehealth_id: string;
  member_age: number;
  member_gender: string;
  member_phone?: string;
  member_status?: string;
  created_at?: string;
}

export interface FamilyOverview {
  primary_patient: PatientProfile;
  members: FamilyMember[];
  counts: {
    total_members: number;
    guardianships: number;
    minors: number;
    total_upcoming_appointments: number;
    total_family_prescriptions: number;
    total_family_lab_reports: number;
  };
}

export interface AddFamilyMemberPayload {
  relationship: string;
  is_guardian?: boolean;
  is_minor?: boolean;
  member_patient_id?: string;
  new_member?: {
    name: string;
    age: number;
    dob?: string;
    gender?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    blood_group?: string;
    emergency_contact?: string;
    diagnosis?: string;
    hospital_id?: string;
  };
  permissions?: FamilyPermissions;
  notes?: string;
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
  items?: any[];
  status: "ACTIVE" | "COMPLETED" | "SUPERSEDED" | "EXPIRED" | "CANCELLED" | string;
  computed_status?: string;
  is_expired?: boolean;
  follow_up_date?: string;
  follow_up_days?: number;
  clinical_advice?: string;
  instructions?: string;
  doctor_notes?: string;
  download_url?: string;
}

export interface AppointmentItem {
  id: string;
  appointment_date: string;
  appointment_time?: string;
  doctor_id?: string;
  doctor_name: string;
  doctor_specialty?: string;
  doctor_qualification?: string;
  department: string;
  hospital_id?: string;
  hospital_name: string;
  token_number?: number;
  token_str?: string;
  status: "CONFIRMED" | "CHECKED_IN" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED" | string;
  chief_complaint?: string;
  queue_status?: string;
  appointment_type?: string;
  checkin_token?: string;
  patient_id?: string;
  reason?: string;
  patient_name?: string;
  onehealth_id?: string;
  room_number?: string;
  created_at?: string;
  booking_date?: string;
  hospital_address?: string;
  hospital_city?: string;
  hospital_area?: string;
  doctor_consultation_fee?: number;
  reschedule_history?: any[];
  cancellation_reason?: string;
  cancelled_at?: string;
}

export interface DiscoveryHospital {
  id: string;
  name: string;
  city: string;
  address?: string;
  area?: string;
  category?: string;
  distance_km?: number | string;
  rating?: number;
  review_count?: number;
  consultation_fee?: number;
  departments?: { id: string; name: string }[];
}

export interface DiscoveryDoctor {
  id: string;
  name: string;
  specialty: string;
  qualification?: string;
  hospital_id?: string;
  hospital_name?: string;
  department_id?: string;
  experience_years?: number;
  consultation_fee?: number;
  rating?: number;
  availability_status?: "TODAY" | "TOMORROW" | "THIS_WEEK" | string;
}

export interface AppointmentSlot {
  time: string;
  period: "Morning" | "Afternoon" | "Evening";
  session?: string;
  date: string;
  slot_value: string;
  is_available: boolean;
  doctor_id: string;
}

export interface BookAppointmentPayload {
  patient_id?: string;
  hospital_id: string;
  doctor_id: string;
  department_id?: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type?: string;
  reason?: string;
  symptoms_notes?: string;
  priority?: "NORMAL" | "URGENT";
  slot?: string;
}

export interface TimelineEvent {
  id: string;
  event_type: "CONSULTATION" | "PRESCRIPTION" | "LAB_REPORT" | "INVESTIGATION" | "IMAGING" | "DOCUMENT" | "REFERRAL" | "VISIT" | string;
  event_date: string;
  title: string;
  summary?: string;
  doctor_name?: string;
  hospital_name?: string;
  department?: string;
  status?: string;
  metadata?: Record<string, any>;
}
