/**
 * ONEHEALTH ID (OH-ID) Mobile — Patient API Service
 * Sathus Technology Pvt Ltd
 *
 * Implements native endpoints for OneHealth ID card metadata,
 * Zero-Knowledge QR token rotation, prescriptions, appointments,
 * and unified multi-provider health timeline.
 */

import { fetchJSON } from "./client";
import {
  OhIdCardData,
  PatientProfile,
  PrescriptionItem,
  AppointmentItem,
  TimelineEvent,
  FamilyMember,
  FamilyOverview,
  AddFamilyMemberPayload,
  FamilyPermissions,
  DiscoveryHospital,
  DiscoveryDoctor,
  AppointmentSlot,
  BookAppointmentPayload,
} from "../../types/patient";

function unwrap<T>(res: any): T {
  if (res && typeof res === "object" && "data" in res) {
    return res.data as T;
  }
  return res as T;
}

export const patientApi = {
  /**
   * Fetches official OneHealth ID card data including Zero-Knowledge QR token,
   * demographic attributes, verification status, and connected facilities.
   */
  async getOhIdCard(patientId?: string): Promise<OhIdCardData> {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
    const res = await fetchJSON<any>(`/me/oh-id${query}`);
    return unwrap<OhIdCardData>(res);
  },

  /**
   * Fetches Zero-Knowledge QR pass directly.
   */
  async getQrPass(patientId?: string): Promise<{
    onehealth_id: string;
    qr_token: string;
    name: string;
    dob?: string;
    gender?: string;
    blood_group?: string;
  }> {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
    const res = await fetchJSON<any>(`/me/qr${query}`);
    return unwrap(res);
  },

  /**
   * Rotates the Zero-Knowledge QR token to prevent replay attacks or stale code reuse.
   */
  async rotateQrToken(patientId?: string): Promise<{ onehealth_id: string; qr_token: string }> {
    if (patientId) {
      const res = await fetchJSON<any>(`/patients/${encodeURIComponent(patientId)}/qr/rotate`, {
        method: "POST",
      });
      return unwrap(res);
    }
    const res = await fetchJSON<any>("/me/qr/rotate", {
      method: "POST",
    });
    return unwrap(res);
  },

  /**
   * Fetches digital clinical prescriptions for the active patient or authorized family member.
   */
  async getPrescriptions(status?: string, patientId?: string): Promise<PrescriptionItem[]> {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (patientId) params.append("patient_id", patientId);
    const qs = params.toString();
    const res = await fetchJSON<any>(`/me/prescriptions${qs ? `?${qs}` : ""}`);
    const items = unwrap<any[]>(res);
    return Array.isArray(items) ? items : [];
  },

  /**
   * Fetches hospital appointments and clinic queue statuses.
   */
  async getAppointments(patientId?: string): Promise<AppointmentItem[]> {
    const endpoint = patientId
      ? `/me/appointments?patient_id=${encodeURIComponent(patientId)}`
      : "/me/appointments";
    try {
      const res = await fetchJSON<any>(endpoint);
      const items = unwrap<any[]>(res);
      return Array.isArray(items) ? items : [];
    } catch {
      // Fallback for staff role or legacy endpoint
      const fallback = await fetchJSON<any>("/appointments");
      const fallbackItems = unwrap<any[]>(fallback);
      return Array.isArray(fallbackItems) ? fallbackItems : [];
    }
  },

  /**
   * Fetches aggregated unified health timeline (consultations, prescriptions, labs, visits).
   */
  async getHealthTimeline(params?: {
    type?: string;
    limit?: number;
    offset?: number;
    patient_id?: string;
  }): Promise<TimelineEvent[]> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append("type", params.type);
    if (params?.limit) searchParams.append("limit", String(params.limit));
    if (params?.offset) searchParams.append("offset", String(params.offset));
    if (params?.patient_id) searchParams.append("patient_id", params.patient_id);
    const qs = searchParams.toString();
    const endpoint = `/me/health-timeline${qs ? `?${qs}` : ""}`;
    const res = await fetchJSON<any>(endpoint);
    const items = unwrap<any[]>(res);
    return Array.isArray(items) ? items : [];
  },

  /**
   * Fetches the patient's full demographic profile by ID.
   */
  async getProfile(patientId: string): Promise<PatientProfile> {
    const res = await fetchJSON<any>(`/patients/${encodeURIComponent(patientId)}`);
    return unwrap<PatientProfile>(res);
  },

  /**
   * Fetches the authenticated patient or authorized family member's comprehensive profile.
   */
  async getMyProfile(patientId?: string): Promise<PatientProfile> {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
    const res = await fetchJSON<any>(`/me/profile${query}`);
    return unwrap<PatientProfile>(res);
  },

  /**
   * Updates the authenticated patient or authorized family member's profile details.
   */
  async updateMyProfile(
    data: Partial<PatientProfile>,
    patientId?: string
  ): Promise<PatientProfile> {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
    const res = await fetchJSON<any>(`/me/profile${query}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return unwrap<PatientProfile>(res);
  },

  /**
   * Fetches linked family members for the authenticated patient.
   */
  async getFamilyMembers(): Promise<FamilyMember[]> {
    const res = await fetchJSON<any>("/me/family");
    const items = unwrap<any[]>(res);
    return Array.isArray(items) ? items : [];
  },

  /**
   * Fetches aggregate family overview with cross-member metrics.
   */
  async getFamilyOverview(): Promise<FamilyOverview> {
    const res = await fetchJSON<any>("/me/family/overview");
    return unwrap<FamilyOverview>(res);
  },

  /**
   * Links or registers a new family member under this patient's care.
   */
  async addFamilyMember(payload: AddFamilyMemberPayload): Promise<FamilyMember> {
    const res = await fetchJSON<any>("/me/family/add", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return unwrap<FamilyMember>(res);
  },

  /**
   * Unlinks a family member relationship without deleting their clinical records.
   */
  async removeFamilyMember(relationshipId: string): Promise<boolean> {
    await fetchJSON<any>(`/me/family/${encodeURIComponent(relationshipId)}`, {
      method: "DELETE",
    });
    return true;
  },

  /**
   * Updates permissions and consent for a family member.
   */
  /**
   * Searches participating OH-ID hospitals by name, area or location.
   */
  async searchHospitals(query?: string, location?: string): Promise<DiscoveryHospital[]> {
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (location) params.append("location", location);
    const qs = params.toString();
    const res = await fetchJSON<any>(`/discovery/providers${qs ? `?${qs}` : ""}`);
    const items = unwrap<any[]>(res);
    return Array.isArray(items) ? items : [];
  },

  /**
   * Fetches available clinical specialties.
   */
  async getSpecialties(category?: string, search?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (search) params.append("search", search);
    const qs = params.toString();
    const res = await fetchJSON<any>(`/discovery/specialties${qs ? `?${qs}` : ""}`);
    const items = unwrap<any[]>(res);
    return Array.isArray(items) ? items : [];
  },

  /**
   * Fetches registered doctors matching hospital and/or specialty.
   */
  async getDoctors(hospitalId?: string, specialty?: string, departmentId?: string): Promise<DiscoveryDoctor[]> {
    const params = new URLSearchParams();
    if (hospitalId) params.append("hospital_id", hospitalId);
    if (specialty) params.append("specialty", specialty);
    if (departmentId) params.append("department_id", departmentId);
    const qs = params.toString();
    const res = await fetchJSON<any>(`/discovery/doctors${qs ? `?${qs}` : ""}`);
    const items = unwrap<any[]>(res);
    return Array.isArray(items) ? items : [];
  },

  /**
   * Computes verified real-time appointment time slots for a doctor and date.
   */
  async getAvailableSlots(doctorId: string, date: string, hospitalId?: string): Promise<AppointmentSlot[]> {
    const params = new URLSearchParams({ doctor_id: doctorId, date });
    if (hospitalId) params.append("hospital_id", hospitalId);
    const res = await fetchJSON<any>(`/discovery/slots?${params.toString()}`);
    const items = unwrap<any[]>(res);
    return Array.isArray(items) ? items : [];
  },

  /**
   * Books an appointment for self or authorized family member.
   */
  async bookAppointment(payload: BookAppointmentPayload): Promise<AppointmentItem> {
    const res = await fetchJSON<any>("/me/appointments/book", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return unwrap<AppointmentItem>(res);
  },

  /**
   * Fetches detailed information for a single appointment.
   */
  async getAppointmentDetails(appointmentId: string): Promise<AppointmentItem> {
    try {
      const res = await fetchJSON<any>(`/me/appointments/${encodeURIComponent(appointmentId)}`);
      return unwrap<AppointmentItem>(res);
    } catch {
      const fallback = await fetchJSON<any>(`/appointments/${encodeURIComponent(appointmentId)}`);
      return unwrap<AppointmentItem>(fallback);
    }
  },

  /**
   * Updates permitted appointment details (reason, department, doctor, date, time, notes).
   */
  async updateAppointment(
    appointmentId: string,
    payload: {
      reason?: string;
      department_id?: string;
      doctor_id?: string;
      appointment_date?: string;
      appointment_time?: string;
      notes?: string;
    }
  ): Promise<AppointmentItem> {
    try {
      const res = await fetchJSON<any>(`/me/appointments/${encodeURIComponent(appointmentId)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      return unwrap<AppointmentItem>(res);
    } catch {
      const fallback = await fetchJSON<any>(`/appointments/${encodeURIComponent(appointmentId)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      return unwrap<AppointmentItem>(fallback);
    }
  },

  /**
   * Cancels a scheduled appointment.
   */
  async cancelAppointment(appointmentId: string, reason: string): Promise<any> {
    try {
      const res = await fetchJSON<any>(`/me/appointments/${encodeURIComponent(appointmentId)}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      return unwrap(res);
    } catch {
      const fallback = await fetchJSON<any>(`/appointments/${encodeURIComponent(appointmentId)}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      return unwrap(fallback);
    }
  },

  /**
   * Reschedules an appointment to a new date and time (with optional new doctor).
   */
  async rescheduleAppointment(
    appointmentId: string,
    newDate: string,
    newTime: string,
    doctorId?: string,
    reason?: string
  ): Promise<any> {
    try {
      const res = await fetchJSON<any>(`/me/appointments/${encodeURIComponent(appointmentId)}/reschedule`, {
        method: "POST",
        body: JSON.stringify({
          new_date: newDate,
          new_time: newTime,
          doctor_id: doctorId,
          reason,
        }),
      });
      return unwrap(res);
    } catch {
      const fallback = await fetchJSON<any>(`/appointments/${encodeURIComponent(appointmentId)}/reschedule`, {
        method: "POST",
        body: JSON.stringify({
          new_date: newDate,
          new_time: newTime,
          doctor_id: doctorId,
          notes: reason,
        }),
      });
      return unwrap(fallback);
    }
  },

  /**
   * Fetches zero-knowledge check-in QR pass for this appointment.
   */
  async getAppointmentQrPass(appointmentId: string): Promise<any> {
    const res = await fetchJSON<any>(`/me/appointments/${encodeURIComponent(appointmentId)}/qr`);
    return unwrap(res);
  },

  /**
   * Fetches real-time live OPD queue tracking status for the checked-in patient today.
   */
  async getLiveQueueStatus(patientId?: string): Promise<{ active: boolean; data?: any }> {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
    const res = await fetchJSON<any>(`/queue/patient/status${query}`);
    return res;
  },
};
