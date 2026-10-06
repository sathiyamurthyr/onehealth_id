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

export const hospitalApi = {
  // Overview & Operational Metrics
  getOverview: (hospitalId: string = "hosp-kedar") =>
    fetchJSON<any>(`/hospital/overview?hospital_id=${hospitalId}`),

  getConfig: (hospitalId: string = "hosp-kedar") =>
    fetchJSON<HospitalConfig>(`/hospital/config?hospital_id=${hospitalId}`),

  getAnalytics: (hospitalId: string = "hosp-kedar") =>
    fetchJSON<any>(`/hospital/analytics?hospital_id=${hospitalId}`),

  // ---------------------------------------------------------------------------
  // Central Users & Access Management (Administration -> Users & Access)
  // ---------------------------------------------------------------------------
  getUsers: (params?: UserFilterParams) => {
    const q = new URLSearchParams();
    q.set("hospital_id", params?.hospital_id || "hosp-kedar");
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

  getUserDetail: (userId: string, hospitalId: string = "hosp-kedar") =>
    fetchJSON<HospitalUser>(`/hospital/users/${userId}?hospital_id=${hospitalId}`),

  createUser: (payload: CreateHospitalUserPayload) =>
    fetchJSON<HospitalUser>("/hospital/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateUser: (userId: string, payload: UpdateHospitalUserPayload, hospitalId: string = "hosp-kedar") =>
    fetchJSON<HospitalUser>(`/hospital/users/${userId}?hospital_id=${hospitalId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  setUserStatus: (userId: string, status: string, reason?: string, hospitalId: string = "hosp-kedar") =>
    fetchJSON<HospitalUser>(`/hospital/users/${userId}/status?hospital_id=${hospitalId}`, {
      method: "POST",
      body: JSON.stringify({ status, reason }),
    }),

  manageUserSecurity: (userId: string, action: "TOGGLE_LOGIN" | "UNLOCK" | "RESET_PASSWORD" | "REVOKE_SESSIONS" | string, hospitalId: string = "hosp-kedar") =>
    fetchJSON<any>(`/hospital/users/${userId}/security?hospital_id=${hospitalId}`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),

  getAccessReview: (hospitalId: string = "hosp-kedar") =>
    fetchJSON<AccessReviewSummary>(`/hospital/users/access-review?hospital_id=${hospitalId}`),

  getRolesCatalog: () =>
    fetchJSON<{ roles: HospitalRoleOption[]; count: number }>("/hospital/users/roles-catalog"),

  getUserAuditTrail: (params?: { hospital_id?: string; target_user_id?: string; action_type?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    q.set("hospital_id", params?.hospital_id || "hosp-kedar");
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
  getStaffInvitations: (hospitalId: string = "hosp-kedar", status?: string) => {
    const q = new URLSearchParams({ hospital_id: hospitalId });
    if (status && status !== "ALL") q.set("status", status);
    return fetchJSON<{ invitations: StaffInvitation[]; count: number }>(`/hospital/users/invitations?${q.toString()}`);
  },

  resendInvitation: (invitationId: string, hospitalId: string = "hosp-kedar") =>
    fetchJSON<{ message: string; invitation_id: string; expires_at: string }>(`/hospital/users/invitations/${invitationId}/resend?hospital_id=${hospitalId}`, {
      method: "POST",
    }),

  cancelInvitation: (invitationId: string, hospitalId: string = "hosp-kedar") =>
    fetchJSON<{ message: string; invitation_id: string }>(`/hospital/users/invitations/${invitationId}/cancel?hospital_id=${hospitalId}`, {
      method: "POST",
    }),

  // Legacy & Helper Endpoints
  getDoctors: (hospitalId: string = "hosp-kedar") =>
    fetchJSON<any[]>(`/hospital/doctors?hospital_id=${hospitalId}`),

  registerDoctor: (payload: DoctorRegisterPayload) =>
    fetchJSON<any>("/hospital/doctors/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getNurses: (hospitalId: string = "hosp-kedar") =>
    fetchJSON<any[]>(`/hospital/nurses?hospital_id=${hospitalId}`),

  registerNurse: (payload: NurseRegisterPayload) =>
    fetchJSON<any>("/hospital/nurses/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getTrainees: (hospitalId: string = "hosp-kedar") =>
    fetchJSON<any[]>(`/hospital/trainees?hospital_id=${hospitalId}`),

  registerTrainee: (payload: TraineeRegisterPayload) =>
    fetchJSON<any>("/hospital/trainees/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getCounters: (hospitalId: string = "hosp-kedar") =>
    fetchJSON<any[]>(`/hospital/counters?hospital_id=${hospitalId}`),

  upsertCounter: (payload: OPDCounterUpsertPayload) =>
    fetchJSON<any>("/hospital/counters", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getRoster: (hospitalId: string = "hosp-kedar", staffType?: string) => {
    const q = new URLSearchParams({ hospital_id: hospitalId });
    if (staffType) q.set("staff_type", staffType);
    return fetchJSON<any[]>(`/hospital/roster?${q.toString()}`);
  },

  updateRosterStatus: (rosterId: string, data: { on_duty_status?: string; shift?: string; room_number?: string; opd_counter_id?: string }) =>
    fetchJSON<any>(`/hospital/roster/${rosterId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getServices: (hospitalId: string = "hosp-kedar") =>
    fetchJSON<any[]>(`/hospital/services?hospital_id=${hospitalId}`),

  upsertService: (payload: HospitalServiceUpsertPayload) =>
    fetchJSON<any>("/hospital/services", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getFacilities: (hospitalId: string = "hosp-kedar") =>
    fetchJSON<any[]>(`/hospital/facilities?hospital_id=${hospitalId}`),

  getCompliance: (hospitalId: string = "hosp-kedar") =>
    fetchJSON<any[]>(`/hospital/compliance?hospital_id=${hospitalId}`),

  getInvitations: (hospitalId: string = "hosp-kedar") =>
    fetchJSON<any[]>(`/hospital/invitations?hospital_id=${hospitalId}`),

  createInvitation: (payload: StaffInvitationPayload) =>
    fetchJSON<any>("/hospital/invitations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getAuditLogs: (limit: number = 100) =>
    fetchJSON<any[]>(`/hospital/audit-logs?limit=${limit}`),

  getAccessLogs: (hospitalId: string = "hosp-kedar", limit: number = 100) =>
    fetchJSON<any[]>(`/hospital/access-logs?hospital_id=${hospitalId}&limit=${limit}`),
};
