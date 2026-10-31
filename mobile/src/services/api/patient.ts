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
      : "/appointments";
    const res = await fetchJSON<any>(endpoint);
    const items = unwrap<any[]>(res);
    return Array.isArray(items) ? items : [];
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
  async updateFamilyPermissions(
    relationshipId: string,
    permissions: FamilyPermissions
  ): Promise<FamilyMember> {
    const res = await fetchJSON<any>(
      `/me/family/${encodeURIComponent(relationshipId)}/permissions`,
      {
        method: "PUT",
        body: JSON.stringify({ permissions }),
      }
    );
    return unwrap<FamilyMember>(res);
  },
};
