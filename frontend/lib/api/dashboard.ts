import { fetchJSON } from "./client";
import { DashboardSummary, DashboardMetrics } from "../types";

const getHospitalId = (explicitId?: string): string => {
  return explicitId || "";
};

export const dashboardApi = {
  getSummary: (hospitalId?: string) =>
    fetchJSON<DashboardSummary>(`/dashboard/summary?hospital_id=${getHospitalId(hospitalId)}`),

  getMetrics: () =>
    fetchJSON<DashboardMetrics>("/dashboard/metrics"),
};
