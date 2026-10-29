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
   * Fetches digital clinical prescriptions for the active patient.
   */
  async getPrescriptions(status?: string): Promise<PrescriptionItem[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await fetchJSON<any>(`/me/prescriptions${query}`);
    const items = unwrap<any[]>(res);
    return Array.isArray(items) ? items : [];
  },

  /**
   * Fetches hospital appointments and clinic queue statuses.
   */
  async getAppointments(patientId?: string): Promise<AppointmentItem[]> {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
    const res = await fetchJSON<any>(`/appointments${query}`);
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
  }): Promise<TimelineEvent[]> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append("type", params.type);
    if (params?.limit) searchParams.append("limit", String(params.limit));
    if (params?.offset) searchParams.append("offset", String(params.offset));
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
};
