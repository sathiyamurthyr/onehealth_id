import { fetchJSON } from "./client";
import { HospitalConfig } from "../types";

export const hospitalApi = {
  getConfig: (hospitalId: string = "hosp-kedar") =>
    fetchJSON<HospitalConfig>(`/hospital/config?hospital_id=${hospitalId}`),

  getAuditLogs: (limit: number = 50) =>
    fetchJSON<any[]>(`/hospital/audit-logs?limit=${limit}`),
};
