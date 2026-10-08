import { fetchJSON } from "./client";
import { DashboardSummary, DashboardMetrics } from "../types";

const getHospitalId = (explicitId?: string): string => {
  if (explicitId) return explicitId;
  if (typeof window !== "undefined") {
    try {
      const ws = JSON.parse(localStorage.getItem("oh_workspace") || "{}");
      if (ws.hospital_ref_id) return ws.hospital_ref_id;
    } catch {
      // ignore
    }
  }
  return "";
};

export const dashboardApi = {
  getSummary: (hospitalId?: string) =>
    fetchJSON<DashboardSummary>(`/dashboard/summary?hospital_id=${getHospitalId(hospitalId)}`),

  getMetrics: () =>
    fetchJSON<DashboardMetrics>("/dashboard/metrics"),
};
