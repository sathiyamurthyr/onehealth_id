import { fetchJSON } from "./client";
import { QueueEntry } from "../types";

export const queueApi = {
  getLive: (doctorId?: string) =>
    fetchJSON<QueueEntry[]>(`/queue${doctorId ? `?doctor_id=${doctorId}` : ""}`),

  list: (params?: { doctor_id?: string; hospital_id?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.doctor_id) q.set("doctor_id", params.doctor_id);
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return fetchJSON<QueueEntry[]>(`/queue${qs ? `?${qs}` : ""}`);
  },

  issueToken: (data: { patient_id: string; hospital_id?: string; doctor_id?: string; department_name?: string; priority?: string }) =>
    fetchJSON<any>("/queue/issue", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  call: (queueId: string) =>
    fetchJSON<{ success: boolean; message: string; data: any }>(`/queue/${queueId}/call`, {
      method: "POST",
    }),

  recall: (queueId: string) =>
    fetchJSON<{ success: boolean; message: string; data: any }>(`/queue/${queueId}/recall`, {
      method: "POST",
    }),

  skip: (queueId: string) =>
    fetchJSON<{ success: boolean; message: string; data: any }>(`/queue/${queueId}/skip`, {
      method: "POST",
    }),

  hold: (queueId: string) =>
    fetchJSON<{ success: boolean; message: string; data: any }>(`/queue/${queueId}/hold`, {
      method: "POST",
    }),

  complete: (queueId: string) =>
    fetchJSON<{ success: boolean; message: string; data: any }>(`/queue/${queueId}/complete`, {
      method: "POST",
    }),

  action: (queueId: string, action: string) =>
    fetchJSON<{ success: boolean; message: string; data: any }>(`/queue/${queueId}/action`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),
};
