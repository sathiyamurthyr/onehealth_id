export interface UserProfile {
  id: string;
  username: string;
  name?: string;
  email: string;
  role: string;
  tenant_id: string;
  hospital_id?: string;
  full_name?: string;
}

export interface Patient {
  id: string;
  tenant_id?: string;
  hospital_id?: string;
  onehealth_id: string;
  qr_token: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  blood_group?: string;
  diagnosis?: string;
  address?: string;
  emergency_contact?: string;
  hospital_name?: string;
  status?: string;
  created_at: string;
  updated_at?: string;
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
  contact_number?: string;
  email?: string;
  consultation_fee: number;
  available_days?: string[];
  start_time?: string;
  end_time?: string;
  is_available: boolean;
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
  doctor_name?: string;
  specialty?: string;
  room_number?: string;
  hospital_name?: string;
  department_name?: string;
  slot?: string;
  appointment_date?: string;
  appointment_time?: string;
  status: string; // scheduled, confirmed, checked_in, in_progress, completed, cancelled, no_show
  token_number?: number;
  priority?: string;
  notes?: string;
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
  doctor_id?: string;
  doctor_name?: string;
  doctor_specialty?: string;
  room_number?: string;
  department_name?: string;
  hospital_name?: string;
  appointment_slot?: string;
  priority?: string;
  called_at?: string;
}

export interface OPDEncounter {
  id: string;
  appointment_id?: string;
  patient_id?: string;
  patient_name?: string;
  onehealth_id?: string;
  patient_age?: number;
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
  status: string; // ORDERED, SAMPLE_COLLECTED, PROCESSING, COMPLETED, VERIFIED
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
  payment_status?: string; // PENDING, PARTIALLY_PAID, PAID
  created_at?: string;
  items_count?: number;
  last_payment_mode?: string;
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
