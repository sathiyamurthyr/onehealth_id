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
  workspace_type: "SUPER_ADMIN" | "HOSPITAL_ADMIN" | "DOCTOR" | "NURSE" | "EMPLOYEE" | "PATIENT" | "OTHER" | string;
  category_title?: string;
  role_code: string;
  role_name: string;
  default_route: string;
  hospital_ref_id: string;
  hospital_name: string;
  hospital_code?: string;
  branch_ref_id?: string;
  branch_name?: string;
  department_id?: string;
  department_name?: string;
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
  role_code?: string;
  department_id?: string;
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
  dob?: string;
  critical_alerts?: string[];
  allergies?: any[];
  chronic_conditions?: string[];
  department?: string;
  primary_doctor?: string;
  last_visit?: string;
  next_visit?: string;
  current_encounter?: string;
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
  department?: string;
  hospital_name?: string;
  branch_name?: string;
  appointment_id?: string;
  appointment_slot?: string;
  priority?: string;
  called_at?: string;
  created_at?: string;
}

export type QueueItem = QueueEntry;

export interface PrescriptionItem {
  id?: string;
  medicine_name: string;
  generic_name?: string;
  brand_name?: string;
  strength?: string;
  dosage?: string;
  dosage_form?: string;
  route?: string;
  dose?: string;
  frequency?: string;
  timing_morning?: boolean;
  timing_afternoon?: boolean;
  timing_evening?: boolean;
  timing_night?: boolean;
  food_instruction?: string; // BEFORE_FOOD, AFTER_FOOD, WITH_FOOD, NO_INSTRUCTION
  duration_value?: number;
  duration_days?: number;
  duration_unit?: string;
  start_date?: string;
  end_date?: string;
  quantity?: number;
  expected_supply_duration?: any;
  refills?: number;
  is_prn?: boolean;
  prn_indication?: string;
  specific_instructions?: string;
  valid_from?: string;
  valid_until?: string;
  is_dispensed?: boolean;
  dispensed_quantity?: number;
  batch_number?: string;
  expiry_date?: string;
  status?: string;
}

export interface Prescription {
  id: string;
  consultation_id?: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  patient_age?: number;
  patient_gender?: string;
  doctor_id: string;
  doctor_name?: string;
  doctor_specialty?: string;
  hospital_name?: string;
  diagnosis?: string;
  instructions?: string;
  status: string; // DRAFT, SIGNED, ACTIVE, DISPENSED, PARTIALLY_DISPENSED, COMPLETED, CANCELLED, EXPIRED
  valid_from?: string;
  valid_until?: string;
  signed_by?: string;
  signed_at?: string;
  digital_signature_hash?: string;
  created_at?: string;
  updated_at?: string;
  version?: number;
  items: PrescriptionItem[];
}

export interface ChiefComplaint {
  reason?: string;
  reason_for_visit?: string;
  symptoms: string[];
  duration: string;
  severity: any;
  onset: any;
  relevant_history?: string;
}

export interface ClinicalExamination {
  general?: any;
  general_exam?: string;
  systems?: any;
  system_exam?: any;
  findings?: any;
  doctor_notes?: string;
}

export interface MedicalHistory {
  illnesses?: any;
  previous_illnesses?: any;
  surgeries?: any;
  chronic_conditions?: any;
  family_history?: any;
  social_history?: any;
  allergies?: any;
  current_medications?: any;
}

export interface DiagnosisItem {
  type: any;
  code?: string;
  name?: string;
  description?: string;
  status: any;
  clinical_notes?: string;
  notes?: string;
}

export interface ReferralPayload {
  patient_id: string;
  from_doctor_id?: string;
  referring_doctor_id?: string;
  receiving_doctor_id?: string;
  to_doctor_name?: string;
  referral_type: "INTERNAL" | "EXTERNAL";
  specialty: string;
  receiving_doctor_name?: string;
  reason: string;
  clinical_summary?: string;
  priority: "ROUTINE" | "URGENT" | "EMERGENCY";
  requested_evaluation?: string;
  attached_reports?: any[];
  attached_report_ids?: string[];
}

export interface FollowUpPayload {
  patient_id: string;
  doctor_id: string;
  department?: string;
  department_id?: string;
  scheduled_date?: string;
  follow_up_date?: string;
  scheduled_time?: string;
  follow_up_time?: string;
  duration_minutes?: number;
  reason?: string;
  required_tests?: string[];
  required_investigations?: string[];
  instructions?: string;
}

export interface DoctorScheduleItem {
  day_of_week: string;
  start_time?: string;
  end_time?: string;
  slot_type?: string;
  is_break?: boolean;
  max_patients?: number;
  working_start_time?: string;
  working_end_time?: string;
  break_start_time?: string;
  break_end_time?: string;
  appointment_duration_minutes?: number;
  buffer_time_minutes?: number;
  emergency_slots_count?: number;
  followup_slots_count?: number;
  new_patient_slots_count?: number;
  overbooking_allowed?: boolean;
  overbooking_max?: number;
}

export interface TimelineEvent {
  id: string;
  type: "CONSULTATION" | "PRESCRIPTION" | "LAB_REPORT" | "ADMISSION" | "REFERRAL" | "FOLLOW_UP";
  date: string;
  title: string;
  subtitle: string;
  doctor_name?: string;
  details?: any;
  status?: string;
}

export interface ReportsSummary {
  reports?: any[];
  orders?: LabOrder[];
  trends?: Record<string, Array<{
    date: string;
    value: string;
    unit?: string;
    is_abnormal?: boolean;
    reference_range?: string;
  }>>;
}

export interface ConsultationPayload {
  appointment_id?: string;
  patient_id: string;
  doctor_id: string;
  symptoms?: string;
  diagnosis: string;
  clinical_notes?: string;
  vitals?: any;
  chief_complaint?: any;
  examination?: any;
  medical_history?: any;
  diagnoses?: any[];
  prescription?: any;
  referral?: any;
  follow_up?: any;
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
  chief_complaint?: ChiefComplaint;
  examination?: ClinicalExamination;
  medical_history?: MedicalHistory;
  diagnoses?: DiagnosisItem[];
  consultation_status?: string;
  prescription_id?: string;
  prescription_status?: string;
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
    display_name?: string;
    code: string;
    address: string;
    city?: string;
    state?: string;
    phone: string;
    emergency_contact?: string;
    email: string;
    website?: string;
    registration_number?: string;
    registration_authority?: string;
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

// -----------------------------------------------------------------------------
// Doctor Consultation Workspace & Patient Clinical Interfaces
// -----------------------------------------------------------------------------

export interface PatientReportedIntake {
  id?: string;
  patient_id?: string;
  patient_name?: string;
  onehealth_id?: string;
  reason_for_visit: string;
  duration?: string;
  main_concern?: string;
  description?: string;
  severity?: "Mild" | "Moderate" | "Severe";
  location?: string;
  relieving_factors?: string;
  aggravating_factors?: string;
  associated_symptoms?: string[];
  previous_treatments?: string;
  current_medications?: string;
  known_allergies?: string;
  appointment_id?: string;
  hospital_id?: string;
  created_at?: string;
}

export interface InvestigationCatalogItem {
  id: string;
  name: string;
  code: string;
  category: "Blood" | "Urine" | "Stool" | "Cardiac" | "Imaging" | "Respiratory" | "Endoscopy" | "Microbiology" | "Pathology" | "Other" | string;
  specimen_type?: string;
  normal_range?: string;
  price: number;
  is_active: boolean;
  tat_hours?: number;
  description?: string;
}

export interface InvestigationOrderItem {
  test_id: string;
  priority?: "ROUTINE" | "URGENT" | "STAT";
  clinical_reason?: string;
  instructions?: string;
  fasting_required?: boolean;
  collection_type?: "Hospital" | "Lab" | "Home" | string;
  preferred_lab_name?: string;
}

export interface InvestigationParameterResult {
  parameter_name: string;
  parameter_code?: string;
  value: string | number;
  unit?: string;
  reference_interval?: string;
  reference_low?: number;
  reference_high?: number;
  status: "NORMAL" | "HIGH" | "LOW" | "CRITICAL" | string;
  flag?: string;
}

export interface InvestigationOrder {
  id: string;
  order_number: string;
  patient_id: string;
  patient_name: string;
  onehealth_id: string;
  doctor_id?: string;
  doctor_name?: string;
  hospital_id?: string;
  hospital_name?: string;
  test_id: string;
  test_name: string;
  test_code?: string;
  category?: string;
  specimen_type?: string;
  priority: "ROUTINE" | "URGENT" | "STAT";
  clinical_reason?: string;
  instructions?: string;
  fasting_required: boolean;
  collection_type?: "Hospital" | "Lab" | "Home" | string;
  preferred_lab_name?: string;
  status: "ORDERED" | "SCHEDULED" | "SAMPLE_COLLECTED" | "PROCESSING" | "RESULT_AVAILABLE" | "REVIEWED" | "CANCELLED";
  results?: InvestigationParameterResult[];
  report_url?: string;
  is_abnormal?: boolean;
  doctor_reviewed_at?: string;
  doctor_review_notes?: string;
  ordered_at?: string;
  created_at?: string;
}

export interface DoctorReferral {
  id: string;
  referral_code: string;
  patient_id: string;
  patient_name: string;
  onehealth_id: string;
  referring_doctor_id?: string;
  referring_doctor_name?: string;
  receiving_doctor_id?: string;
  receiving_doctor_name?: string;
  hospital_id?: string;
  hospital_name?: string;
  specialty: string;
  referral_type: "INTERNAL" | "EXTERNAL";
  reason: string;
  clinical_summary?: string;
  priority: "ROUTINE" | "URGENT";
  requested_evaluation?: string;
  attached_reports?: {
    id: string;
    title: string;
    category?: string;
    date?: string;
  }[];
  status: "DRAFT" | "SENT" | "ACCEPTED" | "SCHEDULED" | "COMPLETED" | "DECLINED" | "CANCELLED";
  created_at?: string;
}

export interface DoctorReferralDirectoryItem {
  id: string;
  name: string;
  specialty: string;
  qualification?: string;
  hospital_id?: string;
  hospital_name?: string;
  consultation_fee?: number;
  rating?: number;
  is_available: boolean;
}

export interface LongitudinalHistoryEvent {
  event_id: string;
  record_type: "VISIT" | "PRESCRIPTION" | "LAB" | "IMAGING" | "DISCHARGE_SUMMARY" | "DOCUMENT" | "REFERRAL";
  title: string;
  subtitle: string;
  hospital_id?: string;
  hospital_name?: string;
  doctor_id?: string;
  doctor_name?: string;
  specialty?: string;
  date?: string;
  formatted_date?: string;
  status?: string;
  diagnosis?: string;
  instructions?: string;
  items?: any[];
  results?: any[];
  is_abnormal?: boolean;
  priority?: string;
  description?: string;
  tags?: string[];
  referral_code?: string;
  attached_reports?: any[];
}

export interface PatientConsultationContext {
  patient: Patient;
  allergies: any[];
  chronic_conditions: string[];
  active_medications: any[];
  recent_visits: any[];
  recent_prescriptions: any[];
  recent_lab_results: any[];
  upcoming_appointments: any[];
  patient_intake?: PatientReportedIntake;
  recent_clinical_summary: {
    last_visit_date?: string;
    last_prescription_date?: string;
    pending_lab_count: number;
    active_referrals_count: number;
    has_high_risk_allergy: boolean;
  };
}

export interface ConsultationSummary {
  consultation_id?: string;
  appointment_id?: string;
  patient: Patient;
  doctor_name: string;
  doctor_specialty: string;
  hospital_name: string;
  consultation_date: string;
  chief_complaint?: any;
  vitals?: any;
  examination?: any;
  diagnoses: any[];
  prescription?: any;
  investigations: any[];
  referral?: any;
  follow_up?: any;
  clinical_notes?: string;
  status: string;
}

// -----------------------------------------------------------------------------
// Hospital Administration -> Users & Access Management & Governance
// -----------------------------------------------------------------------------

export interface HospitalUser {
  user_id: string;
  membership_id?: string;
  hospital_id: string;
  hospital_name?: string;
  branch_id?: string;
  branch_name?: string;
  branch_code?: string;
  department_id?: string;
  department_name?: string;
  department_code?: string;
  employee_id?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  full_name: string;
  photo_url?: string;
  gender?: string;
  dob?: string;
  mobile: string;
  email: string;
  address?: string;
  emergency_contact?: string;
  joining_date?: string;
  employment_type: "FULL_TIME" | "PART_TIME" | "VISITING" | "CONSULTANT" | "CONTRACT" | "INTERN" | "VOLUNTEER" | string;
  designation: string;
  reporting_manager_id?: string;
  reporting_manager_name?: string;
  employment_status: "INVITED" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "LOCKED" | "TERMINATED" | "EXPIRED" | string;
  status_reason?: string;
  role_code: string;
  role_name?: string;
  role_description?: string;
  badge_color?: string;
  additional_roles?: string[];
  branch_ids?: string[];
  department_ids?: string[];
  custom_permissions?: string[];
  effective_permissions?: string[];
  shift_access: "ALL_SHIFTS" | "MORNING_ONLY" | "EVENING_ONLY" | "NIGHT_ONLY" | "ON_CALL" | string;
  login_enabled: boolean;
  mfa_enabled: boolean;
  mfa_status: "NOT_CONFIGURED" | "OPTIONAL" | "ENFORCED" | "ACTIVE" | string;
  failed_login_attempts?: number;
  locked_until?: string;
  last_login_at?: string;
  last_active_at?: string;
  role_metadata?: Record<string, any>;
  credential_number?: string;
  credential_authority?: string;
  credential_expiry_date?: string;
  verification_status: "VERIFIED" | "PENDING" | "REJECTED" | "EXPIRED" | "NOT_REQUIRED" | string;
  verified_by?: string;
  verified_at?: string;
  credential_documents?: Array<{
    id: string;
    title: string;
    document_type: string;
    file_url: string;
    uploaded_at: string;
  }>;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  recent_audits?: UserAuditRecord[];
  id?: string;
  is_active?: boolean;
  status?: string;
  username?: string;
  overview?: Record<string, any>;
  employment?: Record<string, any>;
  credentials?: Record<string, any>;
  all_credentials?: any[];
  roles?: any[];
  permissions?: any[];
  documents?: any[];
  security?: Record<string, any>;
  activity?: any[];
  audit_trail?: any[];
  active_invitation?: any;
  invitation?: {
    token: string;
    invite_url?: string;
    expires_at?: string;
    instructions?: string;
  };
}

export interface CreateHospitalUserPayload {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  mobile: string;
  gender?: string;
  dob?: string;
  address?: string;
  emergency_contact?: string;
  photo_url?: string;
  employee_id?: string;
  joining_date?: string;
  employment_type?: string;
  designation?: string;
  reporting_manager_id?: string;
  reporting_manager_name?: string;
  role_code: string;
  department_id?: string;
  branch_id?: string;
  additional_roles?: string[];
  branch_ids?: string[];
  department_ids?: string[];
  custom_permissions?: string[];
  shift_access?: string;
  login_enabled?: boolean;
  mfa_enabled?: boolean;
  employment_status?: string;
  status_reason?: string;
  send_invitation?: boolean;
  password?: string;
  credential_number?: string;
  credential_authority?: string;
  credential_expiry_date?: string;
  role_metadata?: Record<string, any>;
  hospital_id?: string;
}

export interface UpdateHospitalUserPayload {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  mobile?: string;
  gender?: string;
  dob?: string;
  address?: string;
  emergency_contact?: string;
  photo_url?: string;
  employee_id?: string;
  joining_date?: string;
  employment_type?: string;
  designation?: string;
  reporting_manager_id?: string;
  reporting_manager_name?: string;
  role_code?: string;
  department_id?: string;
  branch_id?: string;
  additional_roles?: string[];
  branch_ids?: string[];
  department_ids?: string[];
  custom_permissions?: string[];
  shift_access?: string;
  login_enabled?: boolean;
  credential_number?: string;
  credential_authority?: string;
  credential_expiry_date?: string;
  verification_status?: string;
  role_metadata?: Record<string, any>;
  hospital_id?: string;
}

export interface AccessReviewCategory {
  count: number;
  label: string;
  severity: "critical" | "warning" | "info";
  users: Array<{
    user_id: string;
    full_name: string;
    email: string;
    mobile?: string;
    role_code: string;
    department_name?: string;
    branch_name?: string;
    employment_status: string;
    credential_number?: string;
    credential_expiry_date?: string;
    failed_login_attempts?: number;
    last_login_at?: string;
    custom_permissions?: string[];
  }>;
}

export interface AccessReviewSummary {
  hospital_id: string;
  generated_at: string;
  total_users: number;
  active_users: number;
  summary: {
    expiring_credentials_count: number;
    expired_credentials_count: number;
    inactive_accounts_count: number;
    excessive_permissions_count: number;
    pending_invitations_count: number;
    locked_accounts_count: number;
  };
  details: {
    expiring_credentials_30d: AccessReviewCategory;
    expired_credentials: AccessReviewCategory;
    inactive_accounts_90d: AccessReviewCategory;
    excessive_permissions: AccessReviewCategory;
    pending_invitations: AccessReviewCategory;
    locked_or_suspended_accounts: AccessReviewCategory;
  };
}

export interface UserAuditRecord {
  id: string;
  hospital_id: string;
  target_user_id: string;
  target_user_name: string;
  target_email?: string;
  target_role?: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action_type: string;
  action_label?: string;
  badge_color?: string;
  previous_state?: Record<string, any>;
  new_state?: Record<string, any>;
  reason?: string;
  ip_address?: string;
  created_at: string;
}

export interface StaffInvitation {
  id: string;
  hospital_id: string;
  branch_id?: string;
  branch_name?: string;
  full_name: string;
  email: string;
  mobile: string;
  role_code: string;
  role_name?: string;
  department_id?: string;
  department_name?: string;
  designation?: string;
  employment_type?: string;
  invitation_token: string;
  status: "PENDING" | "ACCEPTED" | "CANCELLED" | "EXPIRED" | string;
  resend_count: number;
  invited_by?: string;
  expires_at: string;
  created_at: string;
}

export interface HospitalRoleOption {
  code: string;
  title: string;
  category: "CLINICAL" | "ADMINISTRATIVE" | "OPERATIONAL" | "DIAGNOSTIC" | "SUPPORT" | string;
  description: string;
  default_permissions: string[];
  badge_color: string;
  is_custom?: boolean;
}

// -----------------------------------------------------------------------------
// Phase 2: Hospital Operations, Patient Flow, Rosters & Operational Analytics
// -----------------------------------------------------------------------------

export interface DoctorRoster {
  id: string;
  hospital_id: string;
  doctor_id: string;
  doctor_name?: string;
  specialty?: string;
  department_name?: string;
  roster_date: string;
  shift: "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT" | "FULL_DAY" | string;
  opd_counter_id?: string;
  counter_name?: string;
  room_number?: string;
  max_patients?: number;
  is_available?: boolean;
  status: "SCHEDULED" | "ON_DUTY" | "OFF_DUTY" | "ON_LEAVE" | "EMERGENCY_ON_CALL" | string;
  notes?: string;
  created_at?: string;
}

export interface NurseRoster {
  id: string;
  hospital_id: string;
  nurse_id: string;
  nurse_name?: string;
  department_name?: string;
  roster_date: string;
  shift: "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT" | "FULL_DAY" | string;
  assigned_counter_id?: string;
  counter_name?: string;
  assigned_ward?: string;
  status: "SCHEDULED" | "ON_DUTY" | "OFF_DUTY" | "ON_LEAVE" | string;
  notes?: string;
  created_at?: string;
}

export interface OPDCounter {
  id: string;
  hospital_id: string;
  counter_number: string;
  counter_name: string;
  department_name?: string;
  token_prefix: string;
  current_token?: number;
  status: "ACTIVE" | "INACTIVE" | "PAUSED" | "CLOSED" | string;
  active_doctor_id?: string;
  active_doctor_name?: string;
  active_nurse_id?: string;
  active_nurse_name?: string;
  location?: string;
  operating_hours?: string;
  created_at?: string;
}

export interface OperationalAlert {
  id: string;
  hospital_id: string;
  alert_type: "WAIT_TIME_EXCEEDED" | "DOCTOR_OVERLOAD" | "NO_SHOW_SURGE" | "CAPACITY_WARNING" | string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  department_name?: string;
  message: string;
  threshold_value?: number;
  actual_value?: number;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
}

export interface PatientFlowHourlyItem {
  hour: string;
  registrations: number;
  consultations_started: number;
  consultations_completed: number;
}

export interface DepartmentQueueSummaryItem {
  department_name: string;
  waiting: number;
  in_consultation: number;
  completed: number;
  avg_wait_minutes: number;
}

export interface HospitalOperationsDashboard {
  hospital_id: string;
  hospital_name: string;
  date: string;
  waiting_today: number;
  in_consultation_today: number;
  completed_today: number;
  avg_wait_minutes: number;
  active_doctors_count: number;
  active_counters_count: number;
  hourly_flow: PatientFlowHourlyItem[];
  department_breakdown: DepartmentQueueSummaryItem[];
  active_alerts: OperationalAlert[];
  doctors_on_duty?: number;
  nurses_on_duty?: number;
  active_trainees?: number;
  department_count?: number;
  active_opd_counters?: number;
  total_registered_patients?: number;
  today_appointments?: number;
  checked_in_count?: number;
  completed_visits?: number;
  waiting_queue_count?: number;
  pending_tasks?: number;
}

export interface WalkInVisitPayload {
  hospital_id?: string;
  patient_id?: string;
  ohid?: string;
  department_name?: string;
  doctor_id?: string;
  opd_counter_id?: string;
  priority?: "NORMAL" | "EMERGENCY" | "SENIOR_CITIZEN" | "PEDIATRIC" | string;
  chief_complaint?: string;
}

export interface WalkInVisitResponse {
  success: boolean;
  message: string;
  data: {
    visit_id: string;
    queue_id: string;
    token_number: string | number;
    token_display: string;
    department_name: string;
    doctor_name?: string;
    counter_name?: string;
    priority: string;
    estimated_wait_minutes?: number;
    patient_id: string;
    patient_name: string;
    onehealth_id: string;
  };
}

export interface PatientFlowReport {
  hospital_id: string;
  date_from: string;
  date_to: string;
  total_registrations: number;
  total_consultations: number;
  avg_wait_time_minutes: number;
  hourly_distribution: Array<{
    hour: string;
    registrations: number;
    consultations_started: number;
    consultations_completed: number;
  }>;
}

export interface AppointmentAnalyticsReport {
  hospital_id: string;
  date_from: string;
  date_to: string;
  total_booked: number;
  total_checked_in: number;
  total_completed: number;
  total_no_shows: number;
  total_cancelled: number;
  conversion_rate_percentage: number;
  no_show_rate_percentage: number;
}

export interface DepartmentQueueReport {
  hospital_id: string;
  date_from: string;
  date_to: string;
  departments: Array<{
    department_name: string;
    total_tokens_issued: number;
    total_served: number;
    avg_service_time_minutes: number;
    avg_wait_time_minutes: number;
    max_wait_time_minutes: number;
  }>;
}

export interface DoctorProductivityReport {
  hospital_id: string;
  date_from: string;
  date_to: string;
  doctors: Array<{
    doctor_id: string;
    doctor_name: string;
    specialty: string;
    department_name: string;
    patients_seen: number;
    avg_consultation_time_minutes: number;
    prescriptions_generated: number;
    lab_orders_generated: number;
  }>;
}

// =============================================================================
// PHASE 3 — CLINICAL CARE ECOSYSTEM INTERFACES
// =============================================================================

export interface PharmacyPrescription {
  id: string;
  prescription_id?: string;
  patient_id: string;
  doctor_id: string;
  hospital_id: string;
  hospital_name?: string;
  patient_name: string;
  onehealth_id: string;
  patient_phone?: string;
  patient_age?: number;
  patient_gender?: string;
  doctor_name: string;
  doctor_specialty?: string;
  diagnosis?: string;
  instructions?: string;
  doctor_notes?: string;
  status: "RECEIVED" | "VERIFIED" | "PARTIALLY_DISPENSED" | "DISPENSED" | "CANCELLED" | "ACTIVE" | "FINALIZED";
  prescription_status?: string;
  created_at: string;
  prescription_date?: string;
  prescribed_at?: string;
  dispensed_items_count?: number;
  items: Array<{
    id?: string;
    medicine_name: string;
    dosage?: string;
    frequency?: string;
    duration_days?: number;
    quantity: number;
    specific_instructions?: string;
    instructions?: string;
    is_dispensed?: boolean;
    dispensed_quantity?: number;
  }>;
}

export interface PharmacyDispensation {
  id: string;
  hospital_id: string;
  prescription_id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  medicine_name: string;
  prescribed_quantity: number;
  dispensed_quantity: number;
  dosage_instructions?: string;
  batch_number?: string;
  expiry_date?: string;
  pharmacist_id?: string;
  pharmacist_name?: string;
  status: "DISPENSED" | "PARTIALLY_DISPENSED";
  dispensed_at: string;
}

export interface LabSample {
  id: string;
  order_id: string;
  patient_id: string;
  sample_type: string;
  accession_number: string;
  status: "ORDERED" | "REGISTERED" | "COLLECTED" | "RECEIVED" | "REJECTED" | "PROCESSING" | "COMPLETED";
  collected_by?: string;
  collected_at?: string;
  received_by?: string;
  received_at?: string;
  rejection_reason?: string;
  notes?: string;
}

export interface LabAnalyte {
  analyte_name: string;
  value: string;
  unit: string;
  reference_range?: string;
  abnormal_flag?: boolean;
  critical_flag?: boolean;
}

export interface LabResult {
  id: string;
  investigation_id: string;
  order_id?: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  test_name?: string;
  sample_id?: string;
  sample_type?: string;
  method?: string;
  analytes: LabAnalyte[];
  status: "PRELIMINARY" | "VERIFIED" | "CORRECTED";
  version: number;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  created_at: string;
}

export interface RadiologyOrder {
  id: string;
  hospital_id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  ordering_doctor_id: string;
  doctor_name?: string;
  modality: "XRAY" | "CT" | "MRI" | "ULTRASOUND" | "ECG" | "ECHO" | "OTHER";
  body_part: string;
  clinical_indication: string;
  priority: "ROUTINE" | "URGENT" | "STAT";
  status: "ORDERED" | "SCHEDULED" | "PERFORMED" | "REPORTING" | "FINALIZED" | "CANCELLED";
  scheduled_time?: string;
  performed_at?: string;
  dicom_study_uid?: string;
  pacs_accession_number?: string;
  created_at: string;
}

export interface RadiologyReport {
  id: string;
  order_id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  radiologist_id: string;
  radiologist_name?: string;
  findings: string;
  impression: string;
  recommendations?: string;
  modality?: string;
  body_part?: string;
  status: "DRAFT" | "FINALIZED" | "AMENDED";
  version: number;
  finalized_at?: string;
  created_at: string;
}

export interface NursingObservation {
  id: string;
  hospital_id: string;
  patient_id: string;
  admission_id?: string;
  nurse_id: string;
  nurse_name?: string;
  temperature_c?: number;
  heart_rate_bpm?: number;
  respiratory_rate?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  oxygen_saturation?: number;
  blood_glucose?: number;
  pain_score?: number;
  gcs_score?: number;
  notes?: string;
  observation_time: string;
}

export interface NursingNote {
  id: string;
  hospital_id: string;
  patient_id: string;
  admission_id?: string;
  nurse_id: string;
  nurse_name?: string;
  note_type: "ASSESSMENT" | "CARE_PLAN" | "PROGRESS" | "INCIDENT" | "HANDOVER";
  assessment: string;
  care_provided?: string;
  patient_response?: string;
  concerns?: string;
  is_finalized: boolean;
  created_at: string;
}

export interface MedicationAdministration {
  id: string;
  hospital_id: string;
  patient_id: string;
  admission_id?: string;
  prescription_id?: string;
  nurse_id: string;
  nurse_name?: string;
  medicine_name: string;
  prescribed_dose: string;
  administered_dose: string;
  route: string;
  status: "SCHEDULED" | "ADMINISTERED" | "HELD" | "REFUSED" | "MISSED" | "CANCELLED";
  reason_if_not_given?: string;
  administered_time: string;
}

export interface Ward {
  id: string;
  hospital_id: string;
  name: string;
  ward_type: "GENERAL" | "ICU" | "NICU" | "PICU" | "PRIVATE" | "SEMI_PRIVATE" | "ISOLATION" | "OTHER";
  floor_number?: string;
  capacity: number;
  occupied_count?: number;
  available_count?: number;
  status: string;
}

export interface Bed {
  id: string;
  ward_id: string;
  ward_name?: string;
  bed_number: string;
  bed_type: "STANDARD" | "ICU_VENTILATOR" | "OXYGEN" | "CARDIAC" | "ISOLATION" | "DELUXE";
  status: "AVAILABLE" | "RESERVED" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "BLOCKED";
  daily_charge: number;
  is_occupied: boolean;
  current_patient_id?: string;
  patient_name?: string;
  onehealth_id?: string;
  current_admission_id?: string;
  admission_date?: string;
  admitting_doctor_name?: string;
}

export interface InpatientAdmission {
  id: string;
  hospital_id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  patient_phone?: string;
  patient_age?: number;
  patient_gender?: string;
  attending_doctor_id: string;
  doctor_name?: string;
  specialty?: string;
  department?: string;
  ward_id?: string;
  ward_name?: string;
  bed_id?: string;
  bed_number?: string;
  admission_type: "ELECTIVE" | "EMERGENCY" | "TRANSFER" | "OTHER";
  admission_date: string;
  reason_for_admission: string;
  provisional_diagnosis?: string;
  status: "REQUESTED" | "ADMITTED" | "INPATIENT" | "DISCHARGED" | "TRANSFERRED";
  discharge_date?: string;
}

export interface EmergencyEncounter {
  id: string;
  hospital_id: string;
  patient_id?: string;
  patient_name?: string;
  onehealth_id?: string;
  is_anonymous_patient: boolean;
  temporary_identity_code?: string;
  arrival_time: string;
  arrival_mode: "AMBULANCE" | "WALK_IN" | "POLICE" | "TRANSFER" | "OTHER";
  emergency_category: "RED_RESUSCITATION" | "ORANGE_EMERGENT" | "YELLOW_URGENT" | "GREEN_LESS_URGENT" | "BLUE_NON_URGENT";
  presenting_complaint: string;
  triage_score: number;
  triage_nurse_id?: string;
  triage_nurse_name?: string;
  triage_notes?: string;
  attending_doctor_id?: string;
  doctor_name?: string;
  disposition?: "ADMITTED" | "DISCHARGED" | "TRANSFERRED" | "EXPIRED" | "LAMA" | "OBSERVATION";
  disposition_time?: string;
  status: "TRIAGED" | "IN_PROGRESS" | "ADMITTED" | "DISCHARGED" | "TRANSFERRED";
}

export interface ClinicalReferral {
  id: string;
  hospital_id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  source_doctor_id: string;
  source_doctor_name?: string;
  source_hospital_name?: string;
  destination_hospital_id?: string;
  destination_hospital_name?: string;
  destination_doctor_name?: string;
  destination_specialty?: string;
  specialty: string;
  reason: string;
  urgency: "ROUTINE" | "URGENT" | "EMERGENCY";
  clinical_summary?: string;
  status: "DRAFT" | "SENT" | "RECEIVED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "DECLINED" | "CANCELLED";
  created_at: string;
}

export interface DischargeSummary {
  id: string;
  hospital_id: string;
  admission_id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  attending_doctor_id: string;
  doctor_name?: string;
  primary_diagnosis: string;
  secondary_diagnoses?: string[];
  discharge_type: "ROUTINE" | "TRANSFER" | "REFERRAL" | "LAMA" | "DEATH" | "OTHER";
  condition_at_discharge: "RECOVERED" | "IMPROVED" | "STABLE" | "GUARDED" | "CRITICAL";
  hospital_course_summary: string;
  procedures_performed?: string[];
  investigations_summary?: string;
  discharge_medications?: Array<{
    medicine_name: string;
    dose: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  follow_up_instructions: string;
  status: "DRAFT" | "REVIEW" | "FINALIZED";
  version: number;
  finalized_at?: string;
  created_at: string;
}

// ============================================================
// PHASE 4: INTEROPERABILITY, FHIR & CONNECTED HEALTH NETWORK
// ============================================================

export type IntegrationType = "REST_API" | "FHIR_R4" | "HL7_V2" | "WEBHOOK" | "ABDM_GATEWAY" | "LIS_CONNECTOR" | "RIS_PACS";
export type IntegrationStatus = "CONFIGURED" | "ACTIVE" | "SUSPENDED" | "ERROR" | "DISCONNECTED";

export interface Integration {
  id: string;
  tenant_id: string;
  hospital_id?: string;
  integration_type: IntegrationType;
  provider_name: string;
  provider_code: string;
  endpoint_url?: string;
  auth_method: "NONE" | "API_KEY" | "BEARER_TOKEN" | "BASIC_AUTH" | "OAUTH2" | "HMAC_SHA256" | "MTLS";
  status: IntegrationStatus;
  environment: "DEVELOPMENT" | "STAGING" | "SANDBOX" | "PRODUCTION";
  capabilities: string[];
  config_json?: Record<string, any>;
  last_sync_at?: string;
  last_error_message?: string;
  created_at: string;
  updated_at?: string;
}

export interface IntegrationEvent {
  id: string;
  integration_id?: string;
  direction: "INBOUND" | "OUTBOUND";
  event_type: string;
  source_system: string;
  target_system: string;
  status: "RECEIVED" | "VALIDATING" | "PROCESSING" | "COMPLETED" | "FAILED" | "RETRY" | "DEAD_LETTER";
  attempt_count: number;
  payload_json?: Record<string, any>;
  error_code?: string;
  error_message?: string;
  created_at: string;
  processed_at?: string;
}

export interface ExternalHealthRecord {
  id: string;
  patient_id: string;
  onehealth_id?: string;
  external_source_system: string;
  external_organization_name: string;
  external_facility_name?: string;
  external_record_id: string;
  record_type: "CONSULTATION" | "PRESCRIPTION" | "LAB_REPORT" | "RADIOLOGY_REPORT" | "DISCHARGE_SUMMARY" | "ALLERGY" | "VITAL_SIGNS" | "OTHER";
  record_date: string;
  clinical_summary?: string;
  raw_fhir_resource?: Record<string, any>;
  provenance_json?: {
    source_system: string;
    organization: string;
    facility?: string;
    external_record_id: string;
    imported_at: string;
    mapping_version: string;
  };
  validation_status: "VALID" | "WARNING" | "INVALID" | "QUARANTINED";
  imported_at: string;
  created_at: string;
}

export interface ConsentArtifact {
  id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  requester_type: "HOSPITAL" | "CLINIC" | "LABORATORY" | "DOCTOR" | "EXTERNAL_ORGANIZATION" | "INSURANCE";
  requester_id: string;
  requester_name: string;
  receiver_id?: string;
  receiver_name?: string;
  purpose_of_use: "TREATMENT" | "REFERRAL" | "SECOND_OPINION" | "EMERGENCY" | "FOLLOW_UP" | "INSURANCE" | "PATIENT_REQUEST" | "OTHER";
  data_categories: Array<"OPConsultation" | "Prescription" | "DiagnosticReport" | "DischargeSummary" | "ImmunizationRecord" | "HealthDocumentRecord">;
  date_range_from?: string;
  date_range_to?: string;
  expiry_at: string;
  status: "REQUESTED" | "GRANTED" | "DENIED" | "EXPIRED" | "REVOKED";
  granted_at?: string;
  revoked_at?: string;
  digital_signature_hash?: string;
  created_at: string;
}

export interface AccessHistoryEntry {
  id: string;
  accessed_at: string;
  requester_name: string;
  requester_type: string;
  purpose_of_use: string;
  data_categories: string[];
  access_basis: "PATIENT_CONSENT" | "BREAK_GLASS_EMERGENCY" | "DIRECT_PATIENT_ACCESS";
  status: "AUTHORIZED" | "DENIED" | "REVOKED";
}

export interface IdentityConflict {
  id: string;
  source_system: string;
  external_patient_id: string;
  candidate_patient_id: string;
  onehealth_id?: string;
  conflict_reason: string;
  conflict_details: Record<string, any>;
  status: "PENDING_REVIEW" | "RESOLVED_MERGED" | "RESOLVED_NEW_PATIENT" | "REJECTED";
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface IntegrationHealthSummary {
  total_integrations: number;
  active_integrations: number;
  error_integrations: number;
  events_last_24h: number;
  successful_events_24h: number;
  failed_events_24h: number;
  success_rate_percentage: number;
  dead_letter_count: number;
}

// =============================================================================
// PHASE 5: ENTERPRISE HOSPITAL OPERATIONS, BILLING & INSURANCE TYPES
// =============================================================================

export interface HospitalService {
  id: string;
  hospital_id: string;
  code: string;
  name: string;
  description?: string;
  category: "CONSULTATION" | "PROCEDURE" | "SURGERY" | "LABORATORY" | "RADIOLOGY" | "PHARMACY" | "NURSING" | "ROOM_BED" | "PACKAGE" | "EMERGENCY" | "OTHER";
  department_id?: string;
  department_name?: string;
  taxable: boolean;
  tax_rate: number;
  base_price: number;
  currency: string;
  is_active: boolean;
  effective_from?: string;
  effective_until?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PriceListItem {
  id?: string;
  price_list_id?: string;
  service_id: string;
  service_code?: string;
  service_name?: string;
  category?: string;
  price: number;
  currency: string;
  effective_from?: string;
  effective_until?: string;
  is_active?: boolean;
}

export interface PriceList {
  id: string;
  hospital_id: string;
  code: string;
  name: string;
  description?: string;
  price_list_type: "GENERAL" | "CORPORATE" | "INSURANCE" | "GOVERNMENT_SCHEME" | "EMERGENCY" | "PACKAGE" | "SPECIAL";
  currency: string;
  is_default: boolean;
  is_active: boolean;
  items?: PriceListItem[];
  created_at?: string;
  updated_at?: string;
}

export interface MedicalPackage {
  id: string;
  hospital_id: string;
  code: string;
  name: string;
  description?: string;
  category: "HEALTH_CHECKUP" | "SURGERY" | "MATERNITY" | "PROCEDURE" | "CRITICAL_CARE" | "OTHER";
  total_package_price: number;
  currency: string;
  validity_days: number;
  inclusions: string[];
  exclusions: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BillingAccount {
  id: string;
  hospital_id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  encounter_id?: string;
  admission_id?: string;
  account_number: string;
  payer_id?: string;
  payer_name?: string;
  payer_type?: string;
  currency: string;
  total_charges: number;
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  status: "ACTIVE" | "SUSPENDED" | "SETTLED" | "CLOSED";
  created_at: string;
  updated_at?: string;
}

export interface ChargeItem {
  id: string;
  hospital_id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  encounter_id?: string;
  admission_id?: string;
  billing_account_id?: string;
  service_id?: string;
  service_code?: string;
  service_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  payer_responsibility: number;
  patient_responsibility: number;
  currency: string;
  status: "PENDING" | "POSTED" | "INVOICED" | "CANCELLED" | "ADJUSTED";
  source_type: "APPOINTMENT" | "OPD_CONSULTATION" | "EMERGENCY" | "LAB_TEST" | "RADIOLOGY_STUDY" | "PHARMACY_DISPENSATION" | "BED_OCCUPANCY" | "PROCEDURE" | "SURGERY" | "PACKAGE" | "NURSING" | "OTHER";
  source_reference_id?: string;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  charge_id?: string;
  service_id?: string;
  service_code?: string;
  description: string;
  category?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  net_amount: number;
  payer_responsibility: number;
  patient_responsibility: number;
}

export interface BillingInvoice {
  id: string;
  hospital_id: string;
  hospital_name?: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  encounter_id?: string;
  admission_id?: string;
  billing_account_id?: string;
  payer_id?: string;
  payer_name?: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  outstanding_balance: number;
  currency: string;
  payment_status: "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED" | "REFUNDED" | "ADJUSTED";
  issued_at?: string;
  issued_by?: string;
  cancelled_at?: string;
  items?: InvoiceItem[];
  payments?: PaymentRecord[];
  created_at: string;
  updated_at?: string;
}

export interface PaymentRecord {
  id: string;
  invoice_id: string;
  invoice_number?: string;
  patient_id: string;
  hospital_id: string;
  amount: number;
  currency: string;
  payment_mode: "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "ONLINE_GATEWAY" | "INSURANCE" | "OTHER";
  payment_status: "PENDING" | "VERIFIED" | "FAILED" | "REFUNDED" | "VOID";
  transaction_reference?: string;
  gateway_name?: string;
  gateway_transaction_id?: string;
  idempotency_key?: string;
  recorded_at: string;
  verified_at?: string;
  receipt_id?: string;
}

export interface PaymentReceipt {
  id: string;
  receipt_number: string;
  invoice_id: string;
  invoice_number?: string;
  payment_id: string;
  hospital_id: string;
  hospital_name?: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  amount_paid: number;
  currency: string;
  payment_mode: string;
  transaction_reference?: string;
  issued_at: string;
  digital_signature_hash?: string;
}

export interface BillingRefund {
  id: string;
  hospital_id: string;
  invoice_id: string;
  invoice_number?: string;
  payment_id: string;
  patient_id: string;
  patient_name?: string;
  refund_amount: number;
  currency: string;
  reason: string;
  status: "REQUESTED" | "APPROVED" | "PROCESSED" | "REJECTED" | "CANCELLED";
  requested_by: string;
  approved_by?: string;
  approved_at?: string;
  processed_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface BillingAdjustment {
  id: string;
  hospital_id: string;
  invoice_id: string;
  invoice_number?: string;
  charge_id?: string;
  adjustment_type: "DISCOUNT_APPROVAL" | "CORRECTION" | "WRITE_OFF" | "CREDIT_ADJUSTMENT" | "INSURANCE_COPAY_WAIVER";
  original_amount: number;
  adjustment_amount: number;
  adjusted_amount: number;
  reason: string;
  authorized_by: string;
  created_at: string;
}

export interface Payer {
  id: string;
  hospital_id: string;
  code: string;
  name: string;
  payer_type: "SELF_PAY" | "INSURANCE" | "CORPORATE" | "GOVERNMENT_SCHEME" | "TPA" | "OTHER";
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  is_active: boolean;
  created_at?: string;
}

export interface InsurancePolicy {
  id: string;
  hospital_id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  payer_id: string;
  payer_name?: string;
  policy_number: string;
  member_id: string;
  relationship: "SELF" | "SPOUSE" | "CHILD" | "PARENT" | "DEPENDENT" | "OTHER";
  coverage_amount: number;
  copay_percentage: number;
  effective_date: string;
  expiry_date: string;
  status: "ACTIVE" | "EXPIRED" | "SUSPENDED" | "TERMINATED";
  created_at?: string;
}

export interface Preauthorization {
  id: string;
  hospital_id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  payer_id: string;
  payer_name?: string;
  policy_id?: string;
  policy_number?: string;
  procedure_code?: string;
  procedure_name: string;
  requested_amount: number;
  approved_amount?: number;
  currency: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "PARTIALLY_APPROVED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  external_preauth_reference?: string;
  submission_notes?: string;
  adjudication_notes?: string;
  submitted_at?: string;
  decided_at?: string;
  created_at: string;
}

export interface ClaimItem {
  id?: string;
  claim_id?: string;
  charge_id?: string;
  service_code?: string;
  service_name?: string;
  quantity: number;
  claimed_amount: number;
  approved_amount?: number;
  rejected_amount?: number;
  rejection_reason?: string;
}

export interface InsuranceClaim {
  id: string;
  hospital_id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  payer_id: string;
  payer_name?: string;
  policy_id?: string;
  policy_number?: string;
  preauthorization_id?: string;
  encounter_id?: string;
  admission_id?: string;
  invoice_id?: string;
  invoice_number?: string;
  claim_number: string;
  claim_amount: number;
  approved_amount?: number;
  rejected_amount?: number;
  patient_responsibility?: number;
  currency: string;
  status: "DRAFT" | "READY" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "PARTIALLY_APPROVED" | "REJECTED" | "SETTLED" | "APPEALED" | "CLOSED";
  external_claim_reference?: string;
  rejection_reason?: string;
  items?: ClaimItem[];
  submitted_at?: string;
  settled_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface FinancialReconciliation {
  id: string;
  hospital_id: string;
  reconciliation_date: string;
  reconciliation_type: "PAYMENT_GATEWAY" | "BANK_STATEMENT" | "INSURANCE_SETTLEMENT" | "CASH_COUNTER";
  total_expected_amount: number;
  total_settled_amount: number;
  variance_amount: number;
  currency: string;
  status: "UNMATCHED" | "MATCHED" | "PARTIAL" | "EXCEPTION" | "RESOLVED";
  notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface HospitalFinancialAnalytics {
  hospital_id: string;
  hospital_name: string;
  total_invoices: number;
  total_gross_billed: number;
  total_discounts: number;
  total_taxes: number;
  total_net_billed: number;
  total_collected: number;
  total_outstanding: number;
  total_refunded: number;
  collection_rate_percentage: number;
  currency: string;
}

export interface HospitalOperationalKPIs {
  hospital_id: string;
  hospital_name: string;
  opd_consultation_volume: number;
  ipd_admission_volume: number;
  emergency_volume: number;
  active_ipd_occupancy: number;
  operational_beds: number;
  bed_occupancy_percentage: number;
  average_waiting_time_minutes: number;
  pending_lab_investigations: number;
  pending_radiology_studies: number;
  pending_claims_adjudication: number;
}

export interface DepartmentPerformanceSummary {
  hospital_id: string;
  department_name: string;
  appointment_count: number;
  consultation_count: number;
  procedure_count: number;
  lab_order_count: number;
  radiology_order_count: number;
  prescriptions_dispensed: number;
  department_revenue: number;
  currency: string;
}

// ==============================================================================
// PHASE 6: AI HEALTHCARE INTELLIGENCE & AUTONOMOUS OPERATIONS TYPES
// ==============================================================================

export interface AIProvider {
  id: string;
  name: "OFFLINE_MOCK" | "GEMINI" | "OPENAI" | "ANTHROPIC" | "OLLAMA" | string;
  display_name?: string;
  provider_code?: string;
  priority?: number;
  is_active: boolean;
  is_default?: boolean;
  api_base_url?: string;
  config?: Record<string, any>;
  created_at?: string;
}

export interface AIModel {
  id: string;
  provider_id: string;
  provider_name?: string;
  provider_display_name?: string;
  model_name: string;
  capability: "CLINICAL_SUMMARIZATION" | "REASONING" | "FAST_CHAT" | "PREDICTION" | "EMBEDDINGS" | string;
  cost_per_1k_input_tokens: number;
  cost_per_1k_output_tokens: number;
  max_context_tokens: number;
  is_active: boolean;
}

export interface AIPrompt {
  id: string;
  prompt_key: string;
  version: number;
  title: string;
  description?: string;
  system_prompt: string;
  user_prompt_template: string;
  temperature: number;
  is_active: boolean;
}

export interface AIAuditLog {
  id: string;
  hospital_id?: string;
  user_id?: string;
  patient_id?: string;
  module: "CLINICAL_COPILOT" | "PATIENT_ASSISTANT" | "OPS_INTELLIGENCE" | "AGENT" | "SEARCH" | "RAG" | string;
  model_name: string;
  prompt_key?: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  cost_estimated: number;
  safety_flags: string[];
  is_success: boolean;
  error_message?: string;
  created_at: string;
}

export interface AICitation {
  source_type?: "VISIT" | "CONSULTATION" | "PRESCRIPTION" | "LAB_REPORT" | "RADIOLOGY" | "SOP" | string;
  record_type?: string;
  hospital_id?: string;
  hospital_name?: string;
  record_id?: string;
  visit_id?: string;
  date?: string;
  description?: string;
}

export interface DoctorPatientBrief {
  insight_id?: string;
  patient_id?: string;
  patient_name?: string;
  overview_summary?: string;
  brief_markdown?: string;
  chronic_conditions?: string[];
  current_medications?: string[];
  known_allergies?: string[];
  important_lab_trends?: string[];
  recent_hospitalizations?: string[];
  pending_followups?: string[];
  citations?: AICitation[];
  is_draft?: boolean;
  requires_clinician_signoff?: boolean;
}

export interface ConsultationAssistDraft {
  insight_id?: string;
  subjective_hpi?: string;
  objective_exam?: string;
  assessment_summary?: string;
  patient_instructions_draft?: string;
  extracted_vitals?: Record<string, any>;
  draft_note_markdown?: string;
  structured_draft?: {
    hpi?: string;
    vitals_summary?: string;
    assessment_draft?: string;
    patient_instructions?: string;
    signoff_required?: boolean;
  };
  is_draft?: boolean;
  requires_clinician_signoff?: boolean;
}

export interface LongitudinalSummaryResponse {
  patient_id?: string;
  timeline_summary?: string;
  longitudinal_summary_markdown?: string;
  chronic_conditions?: string[];
  active_medications?: string[];
  previous_consultations?: Array<{
    hospital_name?: string;
    date?: string;
    diagnosis?: string;
    doctor_name?: string;
  }>;
  events_analyzed?: number;
  citations?: AICitation[];
}

export interface LabTrendAnalysisResponse {
  patient_id?: string;
  analyte?: string;
  analyte_name?: string;
  trend_direction?: "INCREASING" | "DECREASING" | "STABLE" | string;
  clinical_summary?: string;
  patient_explanation?: string;
  trend_analysis_markdown?: string;
  historical_points?: Array<{
    date: string;
    value: number | string;
    unit: string;
    reference_range?: string;
    is_abnormal?: boolean;
  }>;
  data_points_count?: number;
}

export interface PatientJourneyExplainResponse {
  patient_id?: string;
  query?: string;
  explanation?: string;
  answer_markdown?: string;
  recorded_facts?: string[];
  citations?: AICitation[];
  disclaimer?: string;
}

export interface OperationsRootCauseResponse {
  hospital_id?: string;
  overview?: string;
  bottleneck_department?: string;
  severity_level?: string;
  primary_contributors?: string[];
  recommended_actions?: string[];
  analysis_markdown?: string;
  structured_recommendations?: {
    bottlenecks?: string[];
    recommendations?: string[];
    confidence_score?: number;
  };
  operational_snapshot?: {
    opd_today?: number;
    bed_occupancy_percent?: number;
    active_admissions?: number;
  };
}

export interface NoShowPredictionResponse {
  prediction_id: string;
  appointment_id: string;
  no_show_probability: number;
  risk_tier: "LOW" | "MEDIUM" | "HIGH";
  confidence_score: number;
  feature_contributions: Record<string, any>;
  model_version: string;
  recommended_action: string;
}

export interface QueueWaitTimePredictionResponse {
  prediction_id?: string;
  queue_position?: number;
  predicted_wait_minutes?: number;
  estimated_wait_minutes?: number;
  confidence_interval_minutes?: string;
  confidence_score?: number;
  factors_breakdown?: Record<string, any>;
  model_version?: string;
}

export interface BedOccupancyForecastResponse {
  prediction_id?: string;
  hospital_id?: string;
  current_occupancy_percent?: number;
  projected_occupancy_percent?: number;
  forecasted_occupancy_percent?: number;
  expected_admissions?: number;
  expected_discharges?: number;
  alert_status?: string;
  icu_demand_percent?: number;
  surge_alert?: boolean;
  horizon_hours?: number;
  model_version?: string;
}

export interface ManagementCopilotResponse {
  hospital_id?: string;
  query?: string;
  executive_summary?: string;
  executive_narrative?: string;
  confidence_score?: number;
  relevant_metrics?: Record<string, any>;
  recommended_actions?: string[];
  underlying_kpis?: {
    gross_billed?: number;
    net_collected?: number;
    collection_rate_percent?: number;
    bed_occupancy_percent?: number;
    opd_today?: number;
  };
  departments_analyzed?: number;
}

export interface SemanticSearchResultItem {
  patient_id: string;
  onehealth_id: string;
  patient_name: string;
  gender: string;
  age: number;
  matched_condition: string;
  symptoms?: string;
  last_visit_date: string;
  relevance_score: number;
}

export interface SemanticSearchResponse {
  query: string;
  hospital_id: string;
  total_matches: number;
  results: SemanticSearchResultItem[];
  permission_scope_applied: string;
}

export interface KnowledgeDocument {
  id: string;
  hospital_id: string;
  title: string;
  category: "SOP" | "CLINICAL_PROTOCOL" | "HOSPITAL_POLICY" | "PATIENT_EDUCATION" | "DRUG_FORMULARY" | string;
  file_type?: string;
  content?: string;
  content_preview?: string;
  chunk_count?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface KnowledgeQueryResponse {
  query?: string;
  answer?: string;
  answer_markdown?: string;
  citations?: Array<{
    document_id?: string;
    document_title?: string;
    title?: string;
    category?: string;
    chunk_content?: string;
    similarity_score?: number;
    section?: number;
  }>;
  chunks_matched?: number;
}

export interface AIAgentTask {
  id: string;
  agent_id?: string;
  hospital_id: string;
  task_type: string;
  target_entity_type?: string;
  target_entity_id?: string;
  proposed_payload?: Record<string, any>;
  payload?: Record<string, any>;
  proposed_action?: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "EXECUTED" | "FAILED" | string;
  requires_human_approval?: boolean;
  approved_by?: string;
  approved_at?: string;
  execution_result?: Record<string, any>;
  created_at?: string;
}

export interface AIGovernanceTelemetry {
  hospital_id: string;
  hospital_name?: string;
  module?: string;
  operation_type?: string;
  model_name?: string;
  total_calls?: number;
  total_requests?: number;
  total_tokens?: number;
  total_prompt_tokens?: number;
  total_completion_tokens?: number;
  avg_latency_ms?: number;
  total_cost_usd?: number;
  total_cost_estimated?: number;
  failed_requests?: number;
  flagged_safety_events?: number;
  last_activity_at?: string;
}

// ==========================================
// Phase 7: Healthcare Network & Ecosystem Types
// ==========================================

export type ProviderType = 
  | "HOSPITAL"
  | "CLINIC"
  | "DIAGNOSTIC"
  | "LABORATORY"
  | "PHARMACY"
  | "SPECIALIST"
  | "EMERGENCY"
  | "OTHER";

export type OnboardingStage = 
  | "PENDING"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "ACTIVE"
  | "SUSPENDED"
  | "INACTIVE";

export type ConsentScope = 
  | "ALL_RECORDS"
  | "LABS_ONLY"
  | "PRESCRIPTIONS_ONLY"
  | "CONSULTATIONS_ONLY"
  | "EPISODE_ONLY";

export type ReferralUrgency = "ROUTINE" | "URGENT" | "STAT_EMERGENCY";
export type ReferralStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED" | "CANCELLED";
export type SpecimenStatus = "ORDERED" | "SPECIMEN_COLLECTED" | "PROCESSING" | "REPORT_READY" | "CANCELLED";

export interface NetworkProvider {
  id: string;
  organization_name: string;
  provider_type: ProviderType;
  registration_number: string;
  tax_id?: string;
  primary_contact_name: string;
  primary_email: string;
  primary_phone: string;
  city: string;
  state: string;
  country: string;
  onboarding_stage: OnboardingStage;
  verified_by?: string;
  verified_at?: string;
  verification_documents?: any[];
  rating?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface NetworkFacility {
  id: string;
  provider_id: string;
  facility_name: string;
  facility_type: string;
  address_line: string;
  city: string;
  state: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  emergency_capable: boolean;
  operating_hours?: Record<string, any>;
  contact_phone?: string;
  is_active: boolean;
  created_at?: string;
}

export interface CrossProviderIdentity {
  id: string;
  master_patient_id: string;
  onehealth_id: string;
  provider_id: string;
  organization_name?: string;
  provider_type?: string;
  external_mrn: string;
  match_confidence: number;
  match_method: string;
  is_verified: boolean;
  linked_at?: string;
}

export interface NetworkConsent {
  id: string;
  patient_id: string;
  grantee_provider_id: string;
  grantee_provider_name?: string;
  grantee_doctor_id?: string;
  grantee_doctor_name?: string;
  grantor_provider_id?: string;
  grantor_provider_name?: string;
  consent_scope: ConsentScope;
  purpose: string;
  status: "GRANTED" | "REVOKED" | "EXPIRED";
  valid_from: string;
  valid_until: string;
  revoked_at?: string;
  revoked_reason?: string;
  created_at?: string;
}

export interface NetworkRecordExchange {
  id: string;
  consent_id?: string;
  patient_id: string;
  source_provider_id: string;
  source_organization?: string;
  requester_provider_id: string;
  requester_organization?: string;
  requester_user_id: string;
  record_type: string;
  record_id: string;
  provenance_hash: string;
  purpose: string;
  is_emergency_break_glass: boolean;
  accessed_at?: string;
}

export interface NetworkReferral {
  id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  referring_provider_id: string;
  referring_provider_name?: string;
  referring_doctor_id: string;
  referring_doctor_name?: string;
  target_provider_id: string;
  target_provider_name?: string;
  target_specialty: string;
  urgency: ReferralUrgency;
  clinical_summary: string;
  referral_question?: string;
  attached_record_ids?: string[];
  status: ReferralStatus;
  target_appointment_id?: string;
  response_notes?: string;
  completed_at?: string;
  created_at?: string;
}

export interface NetworkPharmacyDispensation {
  id: string;
  prescription_id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  prescribing_hospital_id: string;
  prescribing_hospital_name?: string;
  dispensing_pharmacy_id: string;
  pharmacy_name?: string;
  dispensing_pharmacist_id?: string;
  dispensing_pharmacist_name?: string;
  dispensed_items: Array<{
    medicine_name: string;
    quantity: number;
    batch?: string;
    dosage?: string;
  }>;
  dispensing_status: "VERIFIED" | "PARTIALLY_DISPENSED" | "DISPENSED" | "REJECTED";
  batch_numbers?: Record<string, string>;
  notes?: string;
  dispensed_at?: string;
}

export interface NetworkDiagnosticOrder {
  id: string;
  order_id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  ordering_provider_id: string;
  ordering_provider_name?: string;
  diagnostic_lab_id: string;
  lab_name?: string;
  test_codes: string[];
  specimen_status: SpecimenStatus;
  critical_flag: boolean;
  result_report_id?: string;
  turnaround_minutes?: number;
  specimen_collected_at?: string;
  completed_at?: string;
  created_at?: string;
}

export interface EmergencyBreakGlassLog {
  id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  provider_id: string;
  provider_name?: string;
  clinician_id: string;
  clinician_name: string;
  reason: string;
  triage_level: "RESUSCITATION" | "EMERGENT" | "URGENT";
  accessed_records?: string[];
  authorized_window_minutes: number;
  patient_notified: boolean;
  created_at?: string;
}

export interface NetworkServiceOffering {
  id: string;
  provider_id: string;
  organization_name?: string;
  provider_type?: string;
  provider_city?: string;
  facility_id?: string;
  facility_name?: string;
  address_line?: string;
  emergency_capable?: boolean;
  service_name: string;
  category: string;
  specialty: string;
  description?: string;
  standard_rate: number;
  estimated_duration_minutes?: number;
  rating?: number;
  is_active: boolean;
}

export interface NetworkUnifiedTimelineEvent {
  event_id: string;
  patient_id: string;
  onehealth_id?: string;
  patient_name?: string;
  event_type: string;
  event_title: string;
  event_date: string;
  provider_id?: string;
  source_provider_name?: string;
  provider_type?: string;
  doctor_name?: string;
  department?: string;
  summary?: string;
  document_url?: string;
  is_external_provider?: boolean;
}

export interface NetworkTelemetry {
  active_providers_count: number;
  active_facilities_count: number;
  active_consents_count: number;
  total_record_exchanges_count: number;
  referral_analytics: Array<{
    referring_provider_id: string;
    referring_hospital: string;
    target_provider_id: string;
    target_hospital: string;
    urgency: string;
    status: string;
    total_referrals: number;
  }>;
}

// ----------------------------------------------------------------------------
// PHASE 8: GLOBAL HEALTHCARE PLATFORM & AUTONOMOUS ECOSYSTEM INTERFACES
// ----------------------------------------------------------------------------

export interface CountryConfig {
  country_code: string;
  country_name: string;
  currency_code: string;
  currency_symbol: string;
  default_timezone: string;
  supported_languages: string[];
  date_format: string;
  phone_prefix: string;
  national_health_id_name: string;
  interop_standard: string;
  data_residency_region: string;
  tax_rate: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GlobalIdentity {
  id: string;
  master_patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  country_code: string;
  identifier_type: string;
  identifier_value: string;
  issuing_authority?: string;
  is_verified: boolean;
  verified_at?: string;
  linked_at?: string;
}

export interface DeveloperApp {
  id: string;
  app_name: string;
  organization_name: string;
  developer_email: string;
  client_id: string;
  client_secret_plaintext?: string;
  app_category: string;
  permission_scopes: string[];
  environment: string;
  status: string;
  rate_limit_per_minute: number;
  created_at?: string;
  updated_at?: string;
}

export interface DeveloperApiKey {
  id: string;
  app_id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  raw_api_key?: string;
  last_used_at?: string;
  expires_at?: string;
  created_at?: string;
}

export interface WebhookSubscription {
  id: string;
  app_id: string;
  target_url: string;
  subscribed_events: string[];
  secret_signature_key: string;
  is_active: boolean;
  failure_count: number;
  last_triggered_at?: string;
  created_at?: string;
}

export interface TelehealthSession {
  id: string;
  session_token: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  doctor_id: string;
  doctor_name?: string;
  specialty?: string;
  hospital_id: string;
  hospital_name?: string;
  scheduled_start: string;
  actual_start?: string;
  actual_end?: string;
  duration_minutes?: number;
  session_status: string;
  room_url?: string;
  patient_join_url?: string;
  doctor_join_url?: string;
  recording_consent_granted: boolean;
  clinical_notes_draft?: string;
  consultation_notes?: string;
  created_at?: string;
}

export interface WearableObservation {
  id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  device_type: string;
  device_model?: string;
  metric_type: string;
  metric_value?: number;
  value_numeric?: number;
  unit: string;
  is_abnormal: boolean;
  recorded_at: string;
  synced_at?: string;
  source_provenance: string;
}

export interface GlobalPayerClaim {
  id: string;
  claim_number: string;
  patient_id: string;
  patient_name?: string;
  hospital_id: string;
  hospital_name?: string;
  payer_code: string;
  payer_name: string;
  currency_code: string;
  billed_amount: number;
  claim_amount?: number;
  approved_amount?: number;
  copay_amount: number;
  claim_status: string;
  adjudication_status?: string;
  preauth_reference?: string;
  adjudication_notes?: string;
  submitted_at?: string;
  settled_at?: string;
}

export interface ResearchCohort {
  id: string;
  cohort_name: string;
  study_title?: string;
  principal_investigator: string;
  institution_name: string;
  lead_institution?: string;
  irb_approval_number: string;
  inclusion_criteria: Record<string, any>;
  anonymization_method: string;
  patient_count: number;
  export_status: string;
  created_at?: string;
}

export interface GlobalPlatformTelemetry {
  active_countries_count: number;
  active_countries?: number;
  active_developer_apps_count: number;
  connected_apps?: number;
  total_telehealth_sessions_count: number;
  total_wearable_records_count: number;
  total_wearable_records?: number;
  total_claims_count: number;
  total_claims_submitted?: number;
  total_claims_volume_inr: number;
}




