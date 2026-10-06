import { fetchJSON } from "./client";

export interface PatientProfile {
  id: string;
  onehealth_id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  emergency_contact: string;
  blood_group: string;
  allergies?: string[];
  preferred_language?: string;
  identity_type?: string;
  identity_number?: string;
  status: string;
  qr_token: string;
  user_id?: string;
}

export interface PatientSummaryMetrics {
  counts: {
    upcoming_appointments: number;
    visits: number;
    prescriptions: number;
    lab_reports: number;
    doctors: number;
    hospitals: number;
    documents: number;
    pending_bills: number;
    active_insurance: number;
  };
  financials: {
    pending_bills_amount: number;
    currency: string;
  };
  upcoming_events: Array<{
    type: string;
    id: string;
    title: string;
    doctor_name: string;
    doctor_specialty: string;
    hospital_name: string;
    date: string;
    time: string;
    status: string;
  }>;
  recent_records: {
    visits: any[];
    prescriptions: any[];
    lab_reports: any[];
  };
}

export interface PatientAppointment {
  id: string;
  patient_id: string;
  patient_name?: string;
  onehealth_id?: string;
  patient_phone?: string;
  patient_age?: number;
  patient_gender?: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string;
  doctor_qualification?: string;
  doctor_rating?: number;
  hospital_id: string;
  hospital_name: string;
  hospital_area?: string;
  hospital_city?: string;
  department_id?: string;
  department_name?: string;
  slot: string;
  appointment_type?: string;
  appointment_date?: string;
  appointment_time?: string;
  status: string;
  queue_number?: number;
  token_number?: number;
  priority?: string;
  reason?: string;
  symptoms_notes?: string;
  notes?: string;
  relationship_context?: string;
  booked_by_user_id?: string;
  booked_by_name?: string;
  booked_by_relationship?: string;
  checkin_token?: string;
  reschedule_history?: Array<{
    previous_date: string;
    previous_time: string;
    previous_slot?: string;
    new_date: string;
    new_time: string;
    new_slot?: string;
    changed_by: string;
    changed_at: string;
  }>;
  room_number?: string;
  doctor_consultation_fee?: number;
  doctor_experience_years?: number;
  hospital_address?: string;
  hospital_pin_code?: string;
  hospital_badge?: string;
  hospital_rating?: number;
  cancellation_reason?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PatientVisit {
  id: string;
  patient_id: string;
  hospital_id: string;
  hospital_name: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string;
  appointment_id?: string;
  chief_complaint?: string;
  diagnosis?: string;
  diagnoses?: any[];
  symptoms?: string;
  clinical_notes?: string;
  treatment_plan?: string;
  visit_type: string;
  status: string;
  created_at: string;
  prescriptions?: any[];
  lab_orders?: any[];
  invoices?: any[];
}

export interface PatientPrescription {
  id: string;
  consultation_id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name: string;
  hospital_id: string;
  hospital_name: string;
  instructions?: string;
  status: string;
  is_dispensed: boolean;
  item_count: number;
  created_at: string;
  items?: Array<{
    id: string;
    medicine_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
    is_dispensed: boolean;
  }>;
}

export interface PatientLabReport {
  id: string;
  order_number: string;
  patient_id: string;
  doctor_name: string;
  hospital_id: string;
  hospital_name: string;
  test_name: string;
  test_category: string;
  status: string;
  ordered_at: string;
  completed_at?: string;
  result_summary?: string;
  results?: Array<{
    parameter_name: string;
    observed_value: string;
    reference_range: string;
    unit: string;
    is_abnormal: boolean;
  }>;
}

export interface PatientMedicalDocument {
  id: string;
  patient_id: string;
  hospital_id: string;
  hospital_name: string;
  title: string;
  category: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  issued_date: string;
  issued_by?: string;
  created_at: string;
}

export interface PatientDiagnosesProcedures {
  diagnoses: Array<{
    encounter_id: string;
    name: string;
    code: string;
    type: string;
    status: string;
    hospital_name: string;
    doctor_name: string;
    diagnosed_date: string;
  }>;
  procedures: Array<{
    name: string;
    hospital_name: string;
    doctor_name: string;
    date: string;
    status: string;
  }>;
}

export interface PatientBill {
  id: string;
  invoice_number: string;
  hospital_id: string;
  hospital_name: string;
  appointment_id?: string;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  payment_mode?: string;
  created_at: string;
  items?: Array<{
    id: string;
    item_type: string;
    description: string;
    unit_price: number;
    quantity: number;
    total_price: number;
  }>;
}

export interface PatientInsurance {
  id: string;
  patient_id: string;
  provider_name: string;
  policy_number: string;
  policy_type: string;
  coverage_amount: number;
  valid_from: string;
  valid_until: string;
  status: string;
  tpa_name?: string;
}

export interface PatientConsent {
  id: string;
  patient_id: string;
  requestor_name: string;
  requestor_type: string;
  purpose: string;
  status: string;
  date_range_from?: string;
  date_range_to?: string;
  granted_at?: string;
  expires_at?: string;
}

export interface PatientNotification {
  id: string;
  patient_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface PatientVisitedDoctor {
  doctor_id: string;
  name?: string;
  doctor_name?: string;
  specialty: string;
  qualification?: string;
  hospitals?: string[];
  hospital_name?: string;
  department_name?: string;
  total_visits?: number;
  consultations_count?: number;
  last_visit_date?: string;
  room_number?: string;
  opd_timings?: string;
  rating?: number;
}

export interface PatientVisitedHospital {
  hospital_id: string;
  name?: string;
  hospital_name?: string;
  code?: string;
  hospital_code?: string;
  address?: string;
  hospital_address?: string;
  city?: string;
  hospital_city?: string;
  phone?: string;
  hospital_phone?: string;
  email?: string;
  hospital_email?: string;
  visit_count?: number;
  visits_count?: number;
  labs_count?: number;
  bills_count?: number;
  last_visit_date?: string;
}

export interface PatientTimelineEvent {
  id: string;
  event_type: "VISIT" | "PRESCRIPTION" | "LAB" | "BILL" | "DOCUMENT" | "APPOINTMENT";
  title: string;
  subtitle: string;
  date: string;
  hospital_name: string;
  doctor_name?: string;
  status: string;
  raw: any;
}

// --------------------------------------------------------------------------
// FAMILY HEALTHCARE TYPES
// --------------------------------------------------------------------------

export interface FamilyPermissions {
  view_appointments?: boolean;
  book_appointments?: boolean;
  view_records?: boolean;
  view_prescriptions?: boolean;
  view_lab_reports?: boolean;
  view_bills?: boolean;
  manage_profile?: boolean;
  receive_notifications?: boolean;
}

export interface FamilyMember {
  id: string; // relationship id
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
  member_phone: string;
  member_email: string;
  member_blood_group: string;
  member_city: string;
  member_state: string;
  member_emergency_contact?: string;
  member_qr_token: string;
  hospitals_count: number;
  prescriptions_count: number;
  lab_reports_count: number;
  upcoming_appointments_count: number;
  created_at: string;
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
  upcoming_family_appointments: Array<{
    id: string;
    patient_id: string;
    patient_name: string;
    patient_onehealth_id: string;
    relationship: string;
    doctor_name: string;
    doctor_specialty: string;
    hospital_name: string;
    slot: string;
    status: string;
    reason?: string;
  }>;
}

export interface FamilyAuditLog {
  id: string;
  actor_patient_id: string;
  target_patient_id: string;
  relationship_type: string;
  action: string;
  resource: string;
  authorization_basis: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface ExistingPersonCandidate {
  id: string;
  onehealth_id: string;
  name: string;
  age: number;
  gender: string;
  phone_masked: string;
  email_masked: string;
  city: string;
  state: string;
  blood_group: string;
}

export interface CheckExistingPersonResponse {
  found: boolean;
  matches_count: number;
  candidates: ExistingPersonCandidate[];
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

export interface UpdateFamilyPermissionsPayload {
  permissions: FamilyPermissions;
  consent_status?: string;
}

// --------------------------------------------------------------------------
// API CLIENT
// --------------------------------------------------------------------------

export const patientApi = {
  getMe: () => fetchJSON<{ success: boolean; data: any }>("/me"),
  
  getProfile: (patient_id?: string) => {
    const q = new URLSearchParams();
    if (patient_id) q.set("patient_id", patient_id);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: PatientProfile }>(`/me/profile${qs ? `?${qs}` : ""}`);
  },

  updateProfile: (data: Partial<PatientProfile>) =>
    fetchJSON<{ success: boolean; data: PatientProfile }>("/me/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getSummary: (patient_id?: string) => {
    const q = new URLSearchParams();
    if (patient_id) q.set("patient_id", patient_id);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: PatientSummaryMetrics }>(`/me/summary${qs ? `?${qs}` : ""}`);
  },

  getAppointments: (params?: {
    status?: string;
    hospital_id?: string;
    doctor_id?: string;
    limit?: number;
    patient_id?: string;
    all_family?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.doctor_id) q.set("doctor_id", params.doctor_id);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.patient_id) q.set("patient_id", params.patient_id);
    if (params?.all_family) q.set("all_family", "true");
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: PatientAppointment[] }>(`/me/appointments${qs ? `?${qs}` : ""}`);
  },

  getAppointmentDetail: (appointmentId: string) =>
    fetchJSON<{ success: boolean; data: PatientAppointment }>(`/me/appointments/${appointmentId}`),

  bookAppointment: (payload: {
    patient_id?: string;
    hospital_id: string;
    department_id?: string;
    doctor_id: string;
    appointment_date: string;
    appointment_time: string;
    appointment_type?: string;
    slot?: string;
    reason?: string;
    symptoms_notes?: string;
    priority?: string;
  }) =>
    fetchJSON<{ success: boolean; data: PatientAppointment; message: string }>("/me/appointments/book", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  rescheduleAppointment: (appointmentId: string, payload: { new_date: string; new_time: string; new_slot?: string; reason?: string }) =>
    fetchJSON<{ success: boolean; data: PatientAppointment; message: string }>(`/me/appointments/${appointmentId}/reschedule`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  cancelAppointment: (appointmentId: string, payload: { reason: string }) =>
    fetchJSON<{ success: boolean; data: PatientAppointment; message: string }>(`/me/appointments/${appointmentId}/cancel`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getAppointmentQR: (appointmentId: string) =>
    fetchJSON<{ success: boolean; data: any }>(`/me/appointments/${appointmentId}/qr`),

  getVisits: (params?: {
    hospital_id?: string;
    doctor_id?: string;
    department?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    patient_id?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.doctor_id) q.set("doctor_id", params.doctor_id);
    if (params?.department) q.set("department", params.department);
    if (params?.start_date) q.set("start_date", params.start_date);
    if (params?.end_date) q.set("end_date", params.end_date);
    if (params?.search) q.set("search", params.search);
    if (params?.patient_id) q.set("patient_id", params.patient_id);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: PatientVisit[] }>(`/me/visits${qs ? `?${qs}` : ""}`);
  },

  getVisitDetail: (visitId: string) =>
    fetchJSON<{ success: boolean; data: PatientVisit }>(`/me/visits/${visitId}`),

  getPrescriptions: (params?: { status?: string; hospital_id?: string; patient_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.patient_id) q.set("patient_id", params.patient_id);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: PatientPrescription[] }>(`/me/prescriptions${qs ? `?${qs}` : ""}`);
  },

  getPrescriptionDetail: (id: string) =>
    fetchJSON<{ success: boolean; data: PatientPrescription }>(`/me/prescriptions/${id}`),

  getLabReports: (params?: { status?: string; hospital_id?: string; patient_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.patient_id) q.set("patient_id", params.patient_id);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: PatientLabReport[] }>(`/me/lab-reports${qs ? `?${qs}` : ""}`);
  },

  getDocuments: (params?: { category?: string; hospital_id?: string; patient_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.patient_id) q.set("patient_id", params.patient_id);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: PatientMedicalDocument[] }>(`/me/documents${qs ? `?${qs}` : ""}`);
  },

  getDiagnoses: (patient_id?: string) => {
    const q = new URLSearchParams();
    if (patient_id) q.set("patient_id", patient_id);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: PatientDiagnosesProcedures }>(`/me/diagnoses${qs ? `?${qs}` : ""}`);
  },

  getBills: (params?: { status?: string; hospital_id?: string; patient_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.patient_id) q.set("patient_id", params.patient_id);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: PatientBill[] }>(`/me/bills${qs ? `?${qs}` : ""}`);
  },

  getInsurance: (patient_id?: string) => {
    const q = new URLSearchParams();
    if (patient_id) q.set("patient_id", patient_id);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: PatientInsurance[] }>(`/me/insurance${qs ? `?${qs}` : ""}`);
  },

  getConsents: (patient_id?: string) => {
    const q = new URLSearchParams();
    if (patient_id) q.set("patient_id", patient_id);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: PatientConsent[] }>(`/me/consent${qs ? `?${qs}` : ""}`);
  },

  revokeConsent: (consentId: string) =>
    fetchJSON<{ success: boolean; message: string }>(`/me/consent/${consentId}/revoke`, { method: "POST" }),

  getNotifications: (patient_id?: string) => {
    const q = new URLSearchParams();
    if (patient_id) q.set("patient_id", patient_id);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: PatientNotification[] }>(`/me/notifications${qs ? `?${qs}` : ""}`);
  },

  markNotificationRead: (notificationId: string) =>
    fetchJSON<{ success: boolean; message: string }>(`/me/notifications/${notificationId}/read`, { method: "POST" }),

  getHospitals: (patient_id?: string) => {
    const q = new URLSearchParams();
    if (patient_id) q.set("patient_id", patient_id);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: PatientVisitedHospital[] }>(`/me/hospitals${qs ? `?${qs}` : ""}`);
  },

  getDoctors: (patient_id?: string) => {
    const q = new URLSearchParams();
    if (patient_id) q.set("patient_id", patient_id);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: PatientVisitedDoctor[] }>(`/me/doctors${qs ? `?${qs}` : ""}`);
  },

  getTimeline: (params?: { event_type?: string; hospital_id?: string; patient_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.event_type) q.set("event_type", params.event_type);
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.patient_id) q.set("patient_id", params.patient_id);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: PatientTimelineEvent[] }>(`/me/timeline${qs ? `?${qs}` : ""}`);
  },

  getQrToken: (patient_id?: string) => {
    const q = new URLSearchParams();
    if (patient_id) q.set("patient_id", patient_id);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: { onehealth_id: string; qr_token: string; qr_format: string; instructions: string } }>(
      `/me/qr${qs ? `?${qs}` : ""}`
    );
  },

  // ------------------------------------------------------------------------
  // FAMILY HEALTHCARE APIS
  // ------------------------------------------------------------------------

  getFamilyMembers: () =>
    fetchJSON<{ success: boolean; data: FamilyMember[] }>("/me/family"),

  getFamilyOverview: () =>
    fetchJSON<{ success: boolean; data: FamilyOverview }>("/me/family/overview"),

  checkExistingFamilyMember: (payload: {
    identifier?: string;
    phone?: string;
    email?: string;
    name?: string;
    dob?: string;
  }) =>
    fetchJSON<{ success: boolean; data: CheckExistingPersonResponse; message: string }>("/me/family/check-existing", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  addFamilyMember: (payload: AddFamilyMemberPayload) =>
    fetchJSON<{ success: boolean; data: FamilyMember; message: string }>("/me/family/add", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateFamilyPermissions: (relationshipId: string, payload: UpdateFamilyPermissionsPayload) =>
    fetchJSON<{ success: boolean; data: FamilyMember; message: string }>(`/me/family/${relationshipId}/permissions`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  removeFamilyMember: (relationshipId: string) =>
    fetchJSON<{ success: boolean; message: string }>(`/me/family/${relationshipId}`, {
      method: "DELETE",
    }),

  getFamilyAuditLogs: (limit = 50) =>
    fetchJSON<{ success: boolean; data: FamilyAuditLog[] }>(`/me/family/audit-logs?limit=${limit}`),
};
