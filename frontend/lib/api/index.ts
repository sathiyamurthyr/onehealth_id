export * from "./client";
export * from "./auth";
export * from "./patients";
export * from "./onehealth-id";
export * from "./appointments";
export * from "./queue";
export * from "./consultations";
export * from "./dashboard";
export * from "./hospital";
export * from "./workspace";

import { authApi } from "./auth";
import { patientsApi } from "./patients";
import { oneHealthIdApi } from "./onehealth-id";
import { appointmentsApi } from "./appointments";
import { queueApi } from "./queue";
import { consultationsApi } from "./consultations";
import { dashboardApi } from "./dashboard";
import { hospitalApi } from "./hospital";
import { workspaceApi } from "./workspace";
import { fetchJSON } from "./client";

export const api = {
  auth: authApi,
  workspace: workspaceApi,
  patients: patientsApi,
  oneHealthId: oneHealthIdApi,
  appointments: appointmentsApi,
  queue: queueApi,
  consultations: consultationsApi,
  dashboard: dashboardApi,
  hospital: hospitalApi,
  doctors: {
    list: (hospitalId?: string, departmentId?: string) => {
      const q = new URLSearchParams();
      if (hospitalId) q.set("hospital_id", hospitalId);
      if (departmentId) q.set("department_id", departmentId);
      const qs = q.toString();
      return fetchJSON<any[]>(`/doctors${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => fetchJSON<any>(`/doctors/${id}`),
    create: (data: any) => fetchJSON<any>("/doctors", { method: "POST", body: JSON.stringify(data) }),
  },
  clinical: {
    consultations: consultationsApi,
    opdEncounters: (patientId?: string, doctorId?: string) => {
      const q = new URLSearchParams();
      if (patientId) q.set("patient_id", patientId);
      if (doctorId) q.set("doctor_id", doctorId);
      const qs = q.toString();
      return fetchJSON<any[]>(`/clinical/opd/encounters${qs ? `?${qs}` : ""}`);
    },
    ipdAdmissions: () => fetchJSON<any[]>("/clinical/ipd/admissions"),
    wardsAndBeds: () => fetchJSON<any[]>("/clinical/ipd/wards-beds"),
    labOrders: () => fetchJSON<any[]>("/clinical/laboratory/orders"),
    pharmacyDispensary: () => fetchJSON<any[]>("/clinical/pharmacy/dispensary"),
  },
  billing: {
    invoices: () => fetchJSON<any[]>("/billing/invoices"),
    getInvoice: (id: string) => fetchJSON<any>(`/billing/invoices/${id}`),
    pay: (id: string, amount: number, paymentMode = "UPI", transactionRef?: string) =>
      fetchJSON<{ success: boolean; message: string; data: any }>(`/billing/invoices/${id}/pay`, {
        method: "POST",
        body: JSON.stringify({ amount, payment_mode: paymentMode, transaction_ref: transactionRef }),
      }),
  },
  admin: {
    departments: () => fetchJSON<any[]>("/admin/departments"),
    auditLogs: () => fetchJSON<any[]>("/admin/audit-logs"),
  },
};
