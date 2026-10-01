export interface UserProfile {
  id?: string;
  user_ref_id?: string;
  username: string;
  name?: string;
  full_name?: string;
  email: string;
  role: string;
  usertype_ref_id?: string;
  hospital_id?: string;
  hospital_ref_id?: string;
  hospital_name?: string;
  tenant_name?: string;
  roles?: string[];
  permissions?: string[];
}

export interface NavigationItem {
  title: string;
  href: string;
  icon?: string;
  section?: string;
  badge?: string;
  permission?: string;
}

export interface WorkspaceDefinition {
  id: string;
  workspace_type: "SUPER_ADMIN" | "HOSPITAL_ADMIN" | "DOCTOR" | "NURSE" | "EMPLOYEE" | "PATIENT" | "OTHER";
  role_code: string;
  role_name: string;
  default_route: string;
  hospital_ref_id: string;
  hospital_name: string;
  hospital_code?: string;
  branch_ref_id?: string;
  branch_name?: string;
  tenant_id?: string;
  tenant_name?: string;
  is_primary?: boolean;
}

export interface DashboardConfig {
  layout: string[];
  widgets: any[];
}

export interface WorkspaceResponse {
  user: UserProfile;
  workspace: WorkspaceDefinition;
  navigation: NavigationItem[];
  permissions: string[];
  dashboard: DashboardConfig;
  available_workspaces: any[];
  available_hospitals: any[];
}

export interface SwitchContextRequest {
  hospital_ref_id?: string;
  usertype_ref_id?: string;
}

export interface SwitchContextResponse {
  access_token: string;
  token_type?: string;
  workspace: WorkspaceResponse;
}

export interface Patient {
  id: string;
  tenant_id?: string;
  hospital_id?: string;
  branch_id?: string;
  branch_name?: string;
  onehealth_id: string;
  qr_token: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email?: string;
  blood_group?: string;
  diagnosis?: string;
  address?: string;
  emergency_contact?: string;
  hospital_name?: string;
  identity_type?: string;
  identity_number?: string;
  is_demo_data?: boolean;
  status?: string;
  created_at: string;
  updated_at?: string;
  total_appointments?: number;
  pending_bills_count?: number;
}

export interface DuplicateCheckResult {
  duplicate_found: boolean;
  matches: Patient[];
}

export interface Doctor {
  id: string;
  tenant_id?: string;
  hospital_id?: string;
  department_id?: string;
  name: string;
  specialty: string;
  department_name?: string;
  room_number?: string;
  phone?: string;
  contact_number?: string;
  email?: string;
  consultation_fee: number;
  available_days?: string[];
  opd_timings?: string;
  start_time?: string;
  end_time?: string;
  is_available: boolean;
  rating?: number;
  hospital_name?: string;
  created_at?: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  patient_name?: string;
  onehealth_id?: string;
  patient_phone?: string;
  patient_age?: number;
  patient_gender?: string;
  patient_diagnosis?: string;
  doctor_name?: string;
  doctor_specialty?: string;
  room_number?: string;
  hospital_id?: string;
  hospital_name?: string;
  branch_id?: string;
  branch_name?: string;
  department_id?: string;
  department_name?: string;
  slot?: string;
  appointment_date?: string;
  appointment_time?: string;
  status: string; // scheduled, confirmed, checked_in, in_progress, completed, cancelled, no_show
  token_number?: number;
  priority?: string;
  notes?: string;
  is_demo_data?: boolean;
  created_at?: string;
}

export interface QueueEntry {
  id: string;
  token_number: number;
  status: string; // WAITING, CALLING, IN_CONSULTATION, COMPLETED, ON_HOLD, SKIPPED
  estimated_wait_minutes?: number;
  patient_id?: string;
  patient_name?: string;
  onehealth_id?: string;
  patient_phone?: string;
  patient_age?: number;
  patient_gender?: string;
  patient_is_demo_data?: boolean;
  doctor_id?: string;
  doctor_name?: string;
  doctor_specialty?: string;
  room_number?: string;
  department_name?: string;
  hospital_name?: string;
  branch_name?: string;
  appointment_id?: string;
  appointment_slot?: string;
  priority?: string;
  called_at?: string;
  created_at?: string;
}

export interface ConsultationPayload {
  appointment_id?: string;
  patient_id: string;
  doctor_id: string;
  symptoms?: string;
  diagnosis: string;
  clinical_notes?: string;
  vitals?: {
    bp?: string;
    pulse?: number;
    spo2?: number;
    temperature?: string;
    weight_kg?: number;
  };
}

export interface OPDEncounter {
  id: string;
  appointment_id?: string;
  patient_id?: string;
  patient_name?: string;
  onehealth_id?: string;
  patient_age?: number;
  patient_gender?: string;
  doctor_id?: string;
  doctor_name?: string;
  doctor_specialty?: string;
  department_name?: string;
  token_number?: number;
  diagnosis?: string;
  symptoms?: string;
  chief_complaints?: string;
  clinical_notes?: string;
  vitals?: Record<string, any>;
  medicines_count?: number;
  created_at?: string;
}

export interface DashboardSummary {
  hospital_id: string;
  hospital_name: string;
  branch_name: string;
  branch_area: string;
  total_patients: number;
  total_appointments: number;
  checked_in_count: number;
  waiting_count: number;
  in_consultation_count: number;
  completed_count: number;
  available_doctors: number;
}

export interface DashboardMetrics {
  total_patients: number;
  active_appointments: number;
  active_queue_count: number;
  available_doctors: number;
  admitted_ipd_patients: number;
  available_beds: number;
  pending_labs: number;
  total_revenue: number;
  outstanding_balance: number;
}

export interface HospitalConfig {
  hospital: {
    id: string;
    name: string;
    code: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    email: string;
  };
  branches: Array<{
    id: string;
    name: string;
    code: string;
    address: string;
    area: string;
    city: string;
    is_main_branch: boolean;
  }>;
  departments: Array<{
    id: string;
    name: string;
    code: string;
    floor_number: string;
    doctors_count: number;
  }>;
  doctors: Doctor[];
}

export interface IPDAdmission {
  id: string;
  patient_id?: string;
  patient_name?: string;
  onehealth_id?: string;
  patient_phone?: string;
  bed_number?: string;
  ward_name?: string;
  ward_type?: string;
  doctor_name?: string;
  admission_date?: string;
  status: string;
  reason_for_admission?: string;
  daily_charge?: number;
}

export interface WardBed {
  id?: string;
  bed_id?: string;
  bed_number: string;
  daily_rate?: number;
  daily_charge?: number;
  status?: string;
  is_occupied?: boolean;
  current_patient_name?: string;
  patient_name?: string;
  admission_date?: string;
  doctor_name?: string;
  ward_name: string;
  ward_type?: string;
  bed_type?: string;
  floor_number?: string;
}

export interface LabOrder {
  id: string;
  patient_id?: string;
  patient_name?: string;
  onehealth_id?: string;
  test_name?: string;
  test_code?: string;
  test_category?: string;
  specimen_type?: string;
  test_price?: number;
  normal_range?: string;
  doctor_name?: string;
  status: string;
  priority?: string;
  result_value?: string;
  result_unit?: string;
  is_abnormal?: boolean;
  ordered_at?: string;
}

export interface PharmacyItem {
  id?: string;
  prescription_id?: string;
  name?: string;
  medicine_name?: string;
  generic_name?: string;
  batch_number?: string;
  expiry_date?: string;
  manufacturer?: string;
  patient_name?: string;
  onehealth_id?: string;
  doctor_name?: string;
  dosage?: string;
  frequency?: string;
  quantity?: number;
  is_dispensed?: boolean;
  stock_quantity?: number;
  unit_price?: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  patient_id?: string;
  patient_name?: string;
  onehealth_id?: string;
  patient_phone?: string;
  subtotal?: number;
  tax_gst?: number;
  tax_amount?: number;
  discount?: number;
  total_amount: number;
  paid_amount: number;
  balance_due?: number;
  balance_amount?: number;
  status?: string;
  payment_status?: string;
  created_at?: string;
  items_count?: number;
  last_payment_mode?: string;
}
