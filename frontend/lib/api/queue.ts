import { fetchJSON } from "./client";
import { QueueEntry } from "../types";

export const queueApi = {
  getLive: (doctorId?: string) =>
    fetchJSON<QueueEntry[]>(`/queue${doctorId ? `?doctor_id=${doctorId}` : ""}`),

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
