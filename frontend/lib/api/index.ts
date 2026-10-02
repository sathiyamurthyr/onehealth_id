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
export * from "./prescriptions";
export * from "./me";

import { authApi } from "./auth";
import { patientsApi } from "./patients";
import { oneHealthIdApi } from "./onehealth-id";
import { appointmentsApi } from "./appointments";
import { queueApi } from "./queue";
import { consultationsApi } from "./consultations";
import { dashboardApi } from "./dashboard";
import { hospitalApi } from "./hospital";
import { workspaceApi } from "./workspace";
import { prescriptionsApi } from "./prescriptions";
import { meApi } from "./me";
import { fetchJSON } from "./client";

export const api = {
  auth: authApi,
  me: meApi,
  workspace: workspaceApi,
  patients: patientsApi,
  oneHealthId: oneHealthIdApi,
  appointments: appointmentsApi,
  queue: queueApi,
  consultations: consultationsApi,
  dashboard: dashboardApi,
  hospital: hospitalApi,
  prescriptions: prescriptionsApi,
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
    getMe: () => fetchJSON<any>("/doctors/me"),
    getMyAppointments: (allHospitals = false) =>
      fetchJSON<any[]>(`/doctors/me/appointments${allHospitals ? "?all_hospitals=true" : ""}`),
    getMyPatients: () => fetchJSON<any[]>("/doctors/me/patients"),
    getMyQueue: () => fetchJSON<any[]>("/doctors/me/queue"),
    search: (params?: { name?: string; specialty?: string; department_id?: string; hospital_id?: string; is_available?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.name) q.set("name", params.name);
      if (params?.specialty) q.set("specialty", params.specialty);
      if (params?.department_id) q.set("department_id", params.department_id);
      if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
      if (params?.is_available !== undefined) q.set("is_available", String(params.is_available));
      const qs = q.toString();
      return fetchJSON<any[]>(`/doctors/search${qs ? `?${qs}` : ""}`);
    },
  },
  clinical: {
    consultations: consultationsApi,
    prescriptions: prescriptionsApi.list,
    getPrescription: prescriptionsApi.get,
    createPrescription: prescriptionsApi.create,
    signPrescription: prescriptionsApi.finalize,
    dispensePrescription: consultationsApi.dispensePrescription,
    timeline: consultationsApi.getTimeline,
    reportsSummary: consultationsApi.getReportsSummary,
    referrals: consultationsApi.listReferrals,
    createReferral: consultationsApi.createReferral,
    followUps: consultationsApi.listFollowUps,
    createFollowUp: consultationsApi.createFollowUp,
    doctorSchedule: consultationsApi.getDoctorSchedule,
    updateDoctorSchedule: consultationsApi.updateDoctorSchedule,
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
