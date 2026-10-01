import { fetchJSON } from "./client";
import { ConsultationPayload, OPDEncounter } from "../types";

export const consultationsApi = {
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
};
