import { fetchJSON } from "./client";
import { Patient, DuplicateCheckResult } from "../types";

export const patientsApi = {
  list: (params?: string | { search?: string; hospital_id?: string; branch_id?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (typeof params === "string") {
      if (params) query.set("search", params);
    } else if (params) {
      if (params.search) query.set("search", params.search);
      if (params.hospital_id) query.set("hospital_id", params.hospital_id);
      if (params.branch_id) query.set("branch_id", params.branch_id);
      if (params.limit) query.set("limit", params.limit.toString());
      if (params.offset) query.set("offset", params.offset.toString());
    }
    const qs = query.toString();
    return fetchJSON<Patient[]>(`/patients${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => fetchJSON<Patient>(`/patients/${id}`),

  register: (data: Partial<Patient>) =>
    fetchJSON<Patient>("/patients", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  checkDuplicate: (data: { phone?: string; email?: string; identity_number?: string; name?: string; age?: number }) =>
    fetchJSON<DuplicateCheckResult>("/patients/check-duplicate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verifyQr: (token: string) => fetchJSON<Patient>(`/patients/verify-qr/${encodeURIComponent(token)}`),

  resolveQr: (qr_token: string, scanned_by?: string) =>
    fetchJSON<Patient>("/patients/qr/resolve", {
      method: "POST",
      body: JSON.stringify({ qr_token, scanned_by }),
    }),

  rotateQr: (patientId: string) =>
    fetchJSON<Patient>(`/patients/${patientId}/qr/rotate`, {
      method: "POST",
    }),

  update: (id: string, data: Partial<Patient>) =>
    fetchJSON<Patient>(`/patients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
