import { fetchJSON } from "./client";
import { DashboardSummary, DashboardMetrics } from "../types";

export const dashboardApi = {
  getSummary: (hospitalId: string = "hosp-kedar") =>
    fetchJSON<DashboardSummary>(`/dashboard/summary?hospital_id=${hospitalId}`),

  getMetrics: () =>
    fetchJSON<DashboardMetrics>("/dashboard/metrics"),
};
