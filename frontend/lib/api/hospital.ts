import { fetchJSON } from "./client";
import {
  HospitalConfig,
  HospitalUser,
  CreateHospitalUserPayload,
  UpdateHospitalUserPayload,
  AccessReviewSummary,
  UserAuditRecord,
  StaffInvitation,
  HospitalRoleOption,
  DoctorRoster,
  NurseRoster,
  OPDCounter,
  OperationalAlert,
  PatientFlowHourlyItem,
  DepartmentQueueSummaryItem,
  HospitalOperationsDashboard,
  WalkInVisitPayload,
  WalkInVisitResponse,
  PatientFlowReport,
  AppointmentAnalyticsReport,
  DepartmentQueueReport,
  DoctorProductivityReport,
} from "../types";

export interface DoctorRegisterPayload {
  name: string;
  email: string;
  phone: string;
  gender?: string;
  specialty: string;
  qualification: string;
  registration_number: string;
  registration_authority?: string;
  department_id?: string;
  opd_counter_id?: string;
  room_number?: string;
  employment_type?: string;
  hospital_id?: string;
}

export interface NurseRegisterPayload {
  name: string;
  email: string;
  phone: string;
  qualification: string;
  registration_number: string;
  department_id?: string;
  ward?: string;
  shift?: string;
  hospital_id?: string;
}

export interface TraineeRegisterPayload {
  name: string;
  email: string;
  phone: string;
  training_type: string;
  institution: string;
  qualification: string;
  department_id?: string;
  supervisor_doctor_id?: string;
  supervisor_name?: string;
  start_date?: string;
  end_date?: string;
  hospital_id?: string;
}

export interface OPDCounterUpsertPayload {
  id?: string;
  counter_name: string;
  counter_number: string;
  department_id?: string;
  location?: string;
  token_prefix: string;
  token_start: number;
  status: string;
  assigned_doctor_id?: string;
  operating_hours?: string;
  hospital_id?: string;
}

export interface HospitalServiceUpsertPayload {
  id?: string;
  service_name: string;
  service_code: string;
  category: string;
  department_id?: string;
  duration_mins: number;
  fee: number;
  status: string;
  hospital_id?: string;
}

export interface StaffInvitationPayload {
  full_name: string;
  email: string;
  mobile: string;
  role_code: string;
  department_id?: string;
  branch_id?: string;
  designation?: string;
  employment_type?: string;
  hospital_id?: string;
}

export interface UserFilterParams {
  hospital_id?: string;
  role_code?: string;
  department_id?: string;
  branch_id?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

const getHospitalId = (explicitId?: string): string => {
  return explicitId || "";
};

export const hospitalApi = {
  // Overview & Operational Metrics
  getOverview: (hospitalId?: string) =>
    fetchJSON<any>(`/hospital/overview?hospital_id=${getHospitalId(hospitalId)}`),

  getConfig: (hospitalId?: string) =>
    fetchJSON<HospitalConfig>(getHospitalId(hospitalId) ? `/hospital/config?hospital_id=${getHospitalId(hospitalId)}` : `/hospital/config`),

  updateConfig: (hospitalId?: string, payload?: any) =>
    fetchJSON<any>(getHospitalId(hospitalId) ? `/hospital/config?hospital_id=${getHospitalId(hospitalId)}` : `/hospital/config`, {
      method: "PUT",
      body: JSON.stringify(payload || {}),
    }),

  getAnalytics: (hospitalId?: string) =>
    fetchJSON<any>(`/hospital/analytics?hospital_id=${getHospitalId(hospitalId)}`),

  // ---------------------------------------------------------------------------
  // Central Users & Access Management (Administration -> Users & Access)
  // ---------------------------------------------------------------------------
  getUsers: (params?: UserFilterParams) => {
    const q = new URLSearchParams();
    const hid = getHospitalId(params?.hospital_id);
    if (hid) q.set("hospital_id", hid);
    if (params?.role_code && params.role_code !== "ALL") q.set("role_code", params.role_code);
    if (params?.department_id && params.department_id !== "ALL") q.set("department_id", params.department_id);
    if (params?.branch_id && params.branch_id !== "ALL") q.set("branch_id", params.branch_id);
    if (params?.status && params.status !== "ALL") q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    return fetchJSON<{
      users: HospitalUser[];
      total_count: number;
      metrics: {
        total_users: number;
        active_users: number;
        inactive_users: number;
        suspended_users: number;
        locked_users: number;
        invited_users: number;
        pending_verification_count: number;
      };
      categories: {
        doctors_count: number;
        nurses_count: number;
        trainees_count: number;
        receptionists_count: number;
        diagnostic_staff_count: number;
        admin_staff_count: number;
      };
    }>(`/hospital/users?${q.toString()}`);
  },

  getUserDetail: (userId: string, hospitalId?: string) =>
    fetchJSON<HospitalUser>(`/hospital/users/${userId}?hospital_id=${getHospitalId(hospitalId)}`),

  createUser: (payload: CreateHospitalUserPayload) =>
    fetchJSON<HospitalUser>("/hospital/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateUser: (userId: string, payload: UpdateHospitalUserPayload, hospitalId?: string) =>
    fetchJSON<HospitalUser>(`/hospital/users/${userId}?hospital_id=${getHospitalId(hospitalId)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  setUserPassword: (userId: string, newPassword: string, hospitalId?: string) =>
    fetchJSON<{ user_id: string; status: string; message: string }>(`/hospital/users/${userId}/password?hospital_id=${getHospitalId(hospitalId)}`, {
      method: "POST",
      body: JSON.stringify({ new_password: newPassword }),
    }),

  deleteUser: (userId: string, hospitalId?: string) =>
    fetchJSON<{ user_id: string; status: string; message: string }>(`/hospital/users/${userId}?hospital_id=${getHospitalId(hospitalId)}`, {
      method: "DELETE",
    }),

  setUserStatus: (userId: string, status: string, reason?: string, hospitalId?: string) =>
    fetchJSON<HospitalUser>(`/hospital/users/${userId}/status?hospital_id=${getHospitalId(hospitalId)}`, {
      method: "POST",
      body: JSON.stringify({ status, reason }),
    }),

  manageUserSecurity: (userId: string, action: "TOGGLE_LOGIN" | "UNLOCK" | "RESET_PASSWORD" | "REVOKE_SESSIONS" | string, hospitalId?: string) =>
    fetchJSON<any>(`/hospital/users/${userId}/security?hospital_id=${getHospitalId(hospitalId)}`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),

  getAccessReview: (hospitalId?: string) =>
    fetchJSON<AccessReviewSummary>(`/hospital/users/access-review?hospital_id=${getHospitalId(hospitalId)}`),

  getRolesCatalog: () =>
    fetchJSON<{ roles: HospitalRoleOption[]; count: number }>("/hospital/users/roles-catalog"),

  getUserAuditTrail: (params?: { hospital_id?: string; target_user_id?: string; action_type?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    const hid = getHospitalId(params?.hospital_id);
    if (hid) q.set("hospital_id", hid);
    if (params?.target_user_id) q.set("target_user_id", params.target_user_id);
    if (params?.action_type && params.action_type !== "ALL") q.set("action_type", params.action_type);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    return fetchJSON<{
      audit_logs: UserAuditRecord[];
      total_count: number;
    }>(`/hospital/users/audit?${q.toString()}`);
  },

  // Invitations
  getStaffInvitations: (hospitalId?: string, status?: string) => {
    const q = new URLSearchParams({ hospital_id: getHospitalId(hospitalId) });
    if (status && status !== "ALL") q.set("status", status);
    return fetchJSON<{ invitations: StaffInvitation[]; count: number }>(`/hospital/users/invitations?${q.toString()}`);
  },

  resendInvitation: (invitationId: string, hospitalId?: string) =>
    fetchJSON<{ message: string; invitation_id: string; expires_at: string }>(`/hospital/users/invitations/${invitationId}/resend?hospital_id=${getHospitalId(hospitalId)}`, {
      method: "POST",
    }),

  cancelInvitation: (invitationId: string, hospitalId?: string) =>
    fetchJSON<{ message: string; invitation_id: string }>(`/hospital/users/invitations/${invitationId}/cancel?hospital_id=${getHospitalId(hospitalId)}`, {
      method: "POST",
    }),

  // Legacy & Helper Endpoints
  getDoctors: (hospitalId?: string) =>
    fetchJSON<any[]>(`/hospital/doctors?hospital_id=${getHospitalId(hospitalId)}`),

  registerDoctor: (payload: DoctorRegisterPayload) =>
    fetchJSON<any>("/hospital/doctors/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getNurses: (hospitalId?: string) =>
    fetchJSON<any[]>(`/hospital/nurses?hospital_id=${getHospitalId(hospitalId)}`),

  registerNurse: (payload: NurseRegisterPayload) =>
    fetchJSON<any>("/hospital/nurses/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getTrainees: (hospitalId?: string) =>
    fetchJSON<any[]>(`/hospital/trainees?hospital_id=${getHospitalId(hospitalId)}`),

  registerTrainee: (payload: TraineeRegisterPayload) =>
    fetchJSON<any>("/hospital/trainees/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getCounters: (hospitalId?: string) =>
    fetchJSON<any[]>(`/hospital/counters?hospital_id=${getHospitalId(hospitalId)}`),

  upsertCounter: (payload: OPDCounterUpsertPayload) =>
    fetchJSON<any>("/hospital/counters", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getRoster: (hospitalId?: string, staffType?: string) => {
    const q = new URLSearchParams({ hospital_id: getHospitalId(hospitalId) });
    if (staffType) q.set("staff_type", staffType);
    return fetchJSON<any[]>(`/hospital/roster?${q.toString()}`);
  },

  updateRosterStatus: (rosterId: string, data: { on_duty_status?: string; shift?: string; room_number?: string; opd_counter_id?: string }) =>
    fetchJSON<any>(`/hospital/roster/${rosterId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getServices: (hospitalId?: string) =>
    fetchJSON<any[]>(`/hospital/services?hospital_id=${getHospitalId(hospitalId)}`),

  upsertService: (payload: HospitalServiceUpsertPayload) =>
    fetchJSON<any>("/hospital/services", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getFacilities: (hospitalId?: string) =>
    fetchJSON<any[]>(`/hospital/facilities?hospital_id=${getHospitalId(hospitalId)}`),

  getCompliance: (hospitalId?: string) =>
    fetchJSON<any[]>(`/hospital/compliance?hospital_id=${getHospitalId(hospitalId)}`),

  getInvitations: (hospitalId?: string) =>
    fetchJSON<any[]>(`/hospital/invitations?hospital_id=${getHospitalId(hospitalId)}`),

  createInvitation: (payload: StaffInvitationPayload) =>
    fetchJSON<any>("/hospital/invitations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getAuditLogs: (limit: number = 100) =>
    fetchJSON<any[]>(`/hospital/audit-logs?limit=${limit}`),

  getAccessLogs: (hospitalId?: string, limit: number = 100) =>
    fetchJSON<any[]>(`/hospital/access-logs?hospital_id=${getHospitalId(hospitalId)}&limit=${limit}`),

  // Enterprise Workforce Wizard & Custom Roles
  createUserWizard: (payload: any, hospitalId?: string) =>
    fetchJSON<{ success: boolean; data: any; message?: string }>(`/hospital/users/wizard?hospital_id=${getHospitalId(hospitalId)}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getBranches: (hospitalId?: string) =>
    fetchJSON<any[]>(`/hospital/branches?hospital_id=${getHospitalId(hospitalId)}`),

  getDepartments: (hospitalId?: string) =>
    fetchJSON<any[]>(`/hospital/departments?hospital_id=${getHospitalId(hospitalId)}`),

  getRoles: (hospitalId?: string) =>
    fetchJSON<any[]>(`/hospital/roles?hospital_id=${getHospitalId(hospitalId)}`),

  createCustomRole: (payload: { code: string; name: string; description?: string; permissions: string[]; hospital_id?: string }) =>
    fetchJSON<any>("/hospital/roles", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getPermissionsCatalog: () =>
    fetchJSON<any[]>("/hospital/permissions"),

  // Hospital Admin 5-Step Configuration Setup
  getOnboardingStatus: (hospitalId?: string) =>
    fetchJSON<{ success: boolean; data: any; message?: string }>(`/hospital/onboarding/status?hospital_id=${getHospitalId(hospitalId)}`),

  saveOnboardingSetup: (payload: {
    hospital_id: string;
    profile?: any;
    branches?: any[];
    facilities?: any[];
    departments?: any[];
    staff?: any[];
  }) =>
    fetchJSON<{ success: boolean; data: any; message?: string }>("/hospital/onboarding/setup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ---------------------------------------------------------------------------
  // Phase 2: Hospital Operations, Real-Time Flow, Rosters, & Operational Reports
  // ---------------------------------------------------------------------------

  getHospitalDashboard: (hospitalId?: string, date?: string) => {
    const q = new URLSearchParams({ hospital_id: getHospitalId(hospitalId) });
    if (date) q.set("date", date);
    return fetchJSON<HospitalOperationsDashboard>(`/hospital/dashboard?${q.toString()}`);
  },

  getPatientFlowHourly: (hospitalId?: string, date?: string) => {
    const q = new URLSearchParams({ hospital_id: getHospitalId(hospitalId) });
    if (date) q.set("date", date);
    return fetchJSON<PatientFlowHourlyItem[]>(`/hospital/dashboard/patient-flow?${q.toString()}`);
  },

  getDepartmentQueueSummary: (hospitalId?: string) =>
    fetchJSON<DepartmentQueueSummaryItem[]>(`/hospital/dashboard/queues?hospital_id=${getHospitalId(hospitalId)}`),

  createWalkInVisit: (payload: WalkInVisitPayload) =>
    fetchJSON<WalkInVisitResponse>("/hospital/reception/walk-in", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getDoctorRosters: (hospitalId?: string, rosterDate?: string) => {
    const q = new URLSearchParams({ hospital_id: getHospitalId(hospitalId) });
    if (rosterDate) q.set("roster_date", rosterDate);
    return fetchJSON<DoctorRoster[]>(`/hospital/doctors/roster?${q.toString()}`);
  },

  saveDoctorRoster: (payload: Partial<DoctorRoster>) =>
    fetchJSON<{ success: boolean; data: DoctorRoster }>("/hospital/doctors/roster", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getNurseRosters: (hospitalId?: string, rosterDate?: string) => {
    const q = new URLSearchParams({ hospital_id: getHospitalId(hospitalId) });
    if (rosterDate) q.set("roster_date", rosterDate);
    return fetchJSON<NurseRoster[]>(`/hospital/nurses/roster?${q.toString()}`);
  },

  saveNurseRoster: (payload: Partial<NurseRoster>) =>
    fetchJSON<{ success: boolean; data: NurseRoster }>("/hospital/nurses/roster", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getOpdCounters: (hospitalId?: string, departmentName?: string, status?: string) => {
    const q = new URLSearchParams({ hospital_id: getHospitalId(hospitalId) });
    if (departmentName && departmentName !== "ALL") q.set("department_name", departmentName);
    if (status && status !== "ALL") q.set("status", status);
    return fetchJSON<OPDCounter[]>(`/hospital/counters?${q.toString()}`);
  },

  saveOpdCounter: (payload: Partial<OPDCounter>) =>
    fetchJSON<{ success: boolean; data: OPDCounter }>("/hospital/counters", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getOperationalAlerts: (hospitalId?: string, unacknowledgedOnly: boolean = false) => {
    const q = new URLSearchParams({ hospital_id: getHospitalId(hospitalId) });
    if (unacknowledgedOnly) q.set("unacknowledged_only", "true");
    return fetchJSON<OperationalAlert[]>(`/hospital/alerts?${q.toString()}`);
  },

  acknowledgeAlert: (alertId: string, hospitalId?: string) =>
    fetchJSON<{ success: boolean; message: string }>(`/hospital/alerts/${alertId}/ack?hospital_id=${getHospitalId(hospitalId)}`, {
      method: "POST",
    }),

  getPatientFlowReport: (params?: { hospital_id?: string; date_from?: string; date_to?: string }) => {
    const q = new URLSearchParams();
    const hid = getHospitalId(params?.hospital_id);
    if (hid) q.set("hospital_id", hid);
    if (params?.date_from) q.set("date_from", params.date_from);
    if (params?.date_to) q.set("date_to", params.date_to);
    return fetchJSON<PatientFlowReport>(`/hospital/reports/patient-flow?${q.toString()}`);
  },

  getAppointmentAnalyticsReport: (params?: { hospital_id?: string; date_from?: string; date_to?: string }) => {
    const q = new URLSearchParams();
    const hid = getHospitalId(params?.hospital_id);
    if (hid) q.set("hospital_id", hid);
    if (params?.date_from) q.set("date_from", params.date_from);
    if (params?.date_to) q.set("date_to", params.date_to);
    return fetchJSON<AppointmentAnalyticsReport>(`/hospital/reports/appointments?${q.toString()}`);
  },

  getDepartmentQueueReport: (params?: { hospital_id?: string; date_from?: string; date_to?: string }) => {
    const q = new URLSearchParams();
    const hid = getHospitalId(params?.hospital_id);
    if (hid) q.set("hospital_id", hid);
    if (params?.date_from) q.set("date_from", params.date_from);
    if (params?.date_to) q.set("date_to", params.date_to);
    return fetchJSON<DepartmentQueueReport>(`/hospital/reports/department-queues?${q.toString()}`);
  },

  getDoctorProductivityReport: (params?: { hospital_id?: string; date_from?: string; date_to?: string }) => {
    const q = new URLSearchParams();
    const hid = getHospitalId(params?.hospital_id);
    if (hid) q.set("hospital_id", hid);
    if (params?.date_from) q.set("date_from", params.date_from);
    if (params?.date_to) q.set("date_to", params.date_to);
    return fetchJSON<DoctorProductivityReport>(`/hospital/reports/doctor-productivity?${q.toString()}`);
  },

  registerFacility: async (payload: any) => {
    return fetchJSON<any>("/api/v1/hospitals/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getApplicationStatus: async (applicationRef: string) => {
    return fetchJSON<any>(`/api/v1/hospitals/applications/${applicationRef}`);
  },

  updateApplication: async (applicationRef: string, payload: any) => {
    return fetchJSON<any>(`/api/v1/hospitals/applications/${applicationRef}/update`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
