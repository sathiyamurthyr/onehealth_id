import { fetchJSON } from "./client";
import { Appointment } from "../types";

export const appointmentsApi = {
  list: (params?: { patient_id?: string; doctor_id?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.patient_id) query.set("patient_id", params.patient_id);
    if (params?.doctor_id) query.set("doctor_id", params.doctor_id);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return fetchJSON<Appointment[]>(`/appointments${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => fetchJSON<Appointment>(`/appointments/${id}`),

  book: (data: Partial<Appointment>) =>
    fetchJSON<Appointment>("/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  checkIn: (appointmentId: string) =>
    fetchJSON<{ success: boolean; message: string; data: { appointment: Appointment; queue_id: string; token_number: number; status: string } }>(
      `/appointments/${appointmentId}/check-in`,
      { method: "POST" }
    ),

  updateStatus: (id: string, status: string) =>
    fetchJSON<Appointment>(`/appointments/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
