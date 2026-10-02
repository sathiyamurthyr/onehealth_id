import { fetchJSON } from "./client";
import {
  ConsultationPayload,
  OPDEncounter,
  Prescription,
  TimelineEvent,
  ReportsSummary,
  ReferralPayload,
  FollowUpPayload,
  DoctorScheduleItem
} from "../types";

export const consultationsApi = {
  // Clinical Encounters
  record: (data: ConsultationPayload) =>
    fetchJSON<OPDEncounter>("/clinical/consultations", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  get: (id: string) => fetchJSON<OPDEncounter>(`/clinical/consultations/${id}`),

  listByPatient: (patientId: string) =>
    fetchJSON<OPDEncounter[]>(`/clinical/opd/encounters?patient_id=${patientId}`),

  listByDoctor: (doctorId: string) =>
    fetchJSON<OPDEncounter[]>(`/clinical/opd/encounters?doctor_id=${doctorId}`),

  // Prescriptions (FHIR MedicationRequest)
  listPrescriptions: (params?: { patientId?: string; doctorId?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.patientId) q.append("patient_id", params.patientId);
    if (params?.doctorId) q.append("doctor_id", params.doctorId);
    if (params?.status) q.append("status", params.status);
    return fetchJSON<Prescription[]>(`/clinical/prescriptions?${q.toString()}`);
  },

  getPrescription: (id: string) => fetchJSON<Prescription>(`/clinical/prescriptions/${id}`),

  signPrescription: (id: string, signedBy: string, digitalSignatureHash?: string) =>
    fetchJSON<Prescription>(`/clinical/prescriptions/${id}/sign`, {
      method: "POST",
      body: JSON.stringify({ signed_by: signedBy, digital_signature_hash: digitalSignatureHash }),
    }),

  dispensePrescription: (id: string, items: any[], dispensedBy: string = "Pharmacist") =>
    fetchJSON<Prescription>(`/clinical/prescriptions/${id}/dispense`, {
      method: "POST",
      body: JSON.stringify({ items, dispensed_by: dispensedBy }),
    }),

  // Patient Clinical Timeline
  getTimeline: (patientId: string) =>
    fetchJSON<TimelineEvent[]>(`/clinical/patients/${patientId}/timeline`),

  // Reports Summary with Trends
  getReportsSummary: (patientId: string) =>
    fetchJSON<ReportsSummary>(`/clinical/patients/${patientId}/reports-summary`),

  // Referrals
  listReferrals: (params?: { patientId?: string; doctorId?: string }) => {
    const q = new URLSearchParams();
    if (params?.patientId) q.append("patient_id", params.patientId);
    if (params?.doctorId) q.append("doctor_id", params.doctorId);
    return fetchJSON<any[]>(`/clinical/referrals?${q.toString()}`);
  },

  createReferral: (data: ReferralPayload) =>
    fetchJSON<any>("/clinical/referrals", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Follow-up Plans
  listFollowUps: (params?: { patientId?: string; doctorId?: string }) => {
    const q = new URLSearchParams();
    if (params?.patientId) q.append("patient_id", params.patientId);
    if (params?.doctorId) q.append("doctor_id", params.doctorId);
    return fetchJSON<any[]>(`/clinical/follow-ups?${q.toString()}`);
  },

  createFollowUp: (data: FollowUpPayload) =>
    fetchJSON<any>("/clinical/follow-ups", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Doctor Scheduling
  getDoctorSchedule: (doctorId: string = "doc-k-01") =>
    fetchJSON<DoctorScheduleItem[]>(`/clinical/doctor/schedule?doctor_id=${doctorId}`),

  updateDoctorSchedule: (doctorId: string, items: DoctorScheduleItem[]) =>
    fetchJSON<DoctorScheduleItem[]>(`/clinical/doctor/schedule?doctor_id=${doctorId}`, {
      method: "POST",
      body: JSON.stringify(items),
    }),
};
