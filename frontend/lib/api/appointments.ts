import { fetchJSON } from "./client";
import { Appointment } from "../types";

export const appointmentsApi = {
  list: (params?: { patient_id?: string; doctor_id?: string; status?: string; hospital_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.patient_id) query.set("patient_id", params.patient_id);
    if (params?.doctor_id) query.set("doctor_id", params.doctor_id);
    if (params?.status) query.set("status", params.status);
    if (params?.hospital_id) query.set("hospital_id", params.hospital_id);
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

  reschedule: (id: string, data: { new_date: string; new_time: string; reason?: string }) =>
    fetchJSON<Appointment>(`/appointments/${id}/reschedule`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  cancel: (id: string, reason: string) =>
    fetchJSON<Appointment>(`/appointments/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  getAvailableSlots: (doctorId: string, date: string, hospitalId?: string, departmentId?: string) => {
    const q = new URLSearchParams();
    q.set("doctor_id", doctorId);
    q.set("date", date);
    if (hospitalId) q.set("hospital_id", hospitalId);
    if (departmentId) q.set("department_id", departmentId);
    return fetchJSON<{
      doctor_id: string;
      date: string;
      total_slots: number;
      available_slots: any[];
      slots: any[];
    }>(`/appointments/available-slots?${q.toString()}`);
  },
};
