import {
  UserProfile,
  Patient,
  Doctor,
  Appointment,
  QueueEntry,
  OPDEncounter,
  IPDAdmission,
  WardBed,
  LabOrder,
  PharmacyItem,
  Invoice,
  DashboardMetrics,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8008/api/v1";

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("oh_access_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = "API Error";
    try {
      const err = await response.json();
      errorDetail = err.detail || err.message || JSON.stringify(err);
    } catch {
      errorDetail = `HTTP ${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  auth: {
    login: async (username: string, password: string) => {
      const res = await fetchJSON<{ access_token: string; user: UserProfile }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("oh_access_token", res.access_token);
        localStorage.setItem("oh_user", JSON.stringify(res.user));
      }
      return res;
    },
    logout: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("oh_access_token");
        localStorage.removeItem("oh_user");
      }
    },
    getCurrentUser: (): UserProfile | null => {
      if (typeof window !== "undefined") {
        const u = localStorage.getItem("oh_user");
        if (u) {
          try {
            return JSON.parse(u);
          } catch {
            return null;
          }
        }
      }
      return null;
    },
  },

  // Patients (Views & Stored Procedures)
  patients: {
    list: (search?: string) => fetchJSON<Patient[]>(`/patients${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    get: (id: string) => fetchJSON<Patient>(`/patients/${id}`),
    register: (data: Partial<Patient>) =>
      fetchJSON<Patient>("/patients", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    verifyQr: (token: string) => fetchJSON<Patient>(`/patients/verify-qr/${encodeURIComponent(token)}`),
    update: (id: string, data: Partial<Patient>) =>
      fetchJSON<Patient>(`/patients/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  // Doctors
  doctors: {
    list: () => fetchJSON<Doctor[]>("/doctors"),
    get: (id: string) => fetchJSON<Doctor>(`/doctors/${id}`),
    create: (data: Partial<Doctor>) =>
      fetchJSON<Doctor>("/doctors", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Appointments
  appointments: {
    list: () => fetchJSON<Appointment[]>("/appointments"),
    get: (id: string) => fetchJSON<Appointment>(`/appointments/${id}`),
    book: (data: Partial<Appointment>) =>
      fetchJSON<Appointment>("/appointments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: string) =>
      fetchJSON<Appointment>(`/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  },

  // Queue
  queue: {
    getLive: (doctorId?: string) =>
      fetchJSON<QueueEntry[]>(`/queue${doctorId ? `?doctor_id=${doctorId}` : ""}`),
    action: (queueId: string, action: string) =>
      fetchJSON<{ success: boolean; message: string; data: any }>(`/queue/${queueId}/action`, {
        method: "POST",
        body: JSON.stringify({ action }),
      }),
  },

  // Clinical
  clinical: {
    opdEncounters: () => fetchJSON<OPDEncounter[]>("/clinical/opd/encounters"),
    ipdAdmissions: () => fetchJSON<IPDAdmission[]>("/clinical/ipd/admissions"),
    wardsAndBeds: () => fetchJSON<WardBed[]>("/clinical/ipd/wards-beds"),
    labOrders: () => fetchJSON<LabOrder[]>("/clinical/laboratory/orders"),
    pharmacyDispensary: () => fetchJSON<PharmacyItem[]>("/clinical/pharmacy/dispensary"),
  },

  // Billing
  billing: {
    invoices: () => fetchJSON<Invoice[]>("/billing/invoices"),
    getInvoice: (id: string) => fetchJSON<Invoice>(`/billing/invoices/${id}`),
    pay: (id: string, amount: number, paymentMode = "UPI", transactionRef?: string) =>
      fetchJSON<{ success: boolean; message: string; data: any }>(`/billing/invoices/${id}/pay`, {
        method: "POST",
        body: JSON.stringify({ amount, payment_mode: paymentMode, transaction_ref: transactionRef }),
      }),
  },

  // Dashboard
  dashboard: {
    metrics: () => fetchJSON<DashboardMetrics>("/dashboard/metrics"),
  },

  // Administration
  admin: {
    departments: () => fetchJSON<any[]>("/admin/departments"),
    auditLogs: () => fetchJSON<any[]>("/admin/audit-logs"),
  },
};
