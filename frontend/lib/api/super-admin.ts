import { apiClient } from "./client";

export interface PlatformMetrics {
  total_hospitals: number;
  active_hospitals: number;
  pending_hospitals: number;
  suspended_hospitals: number;
  inactive_hospitals: number;
  total_clients: number;
  total_patients: number;
  total_doctors: number;
  total_staff: number;
  today_appointments: number;
  today_transactions: number;
  mrr: number;
  monthly_revenue: number;
  pending_payments_amount: number;
  failed_payments_count: number;
  active_subscriptions_count: number;
  open_support_tickets_count: number;
}

export interface PlatformHospital {
  id: string;
  name: string;
  code: string;
  hospital_ref_id: string;
  city: string;
  state: string;
  country: string;
  address: string;
  phone: string;
  email: string;
  is_active: boolean;
  lifecycle_status: "ACTIVE" | "SUSPENDED" | "INACTIVE" | "PENDING" | "UNDER_REVIEW" | "TERMINATED" | "ARCHIVED";
  is_verified: boolean;
  verification_status: string;
  rating: number;
  review_count: number;
  featured_badge?: string;
  suspension_reason?: string;
  suspension_ticket_ref?: string;
  suspended_at?: string;
  suspended_by?: string;
  onboarded_at?: string;
  created_at: string;
  client_id?: string;
  client_name?: string;
  client_code?: string;
  client_type?: string;
  subscription_id?: string;
  plan_name?: string;
  plan_tier?: string;
  plan_code?: string;
  billing_cycle?: string;
  mrr_amount?: number;
  subscription_status?: string;
  payment_status?: string;
  current_period_end?: string;
  doctor_count: number;
  staff_count: number;
  department_count: number;
  enabled_features_count: number;
  features?: FeatureEntitlement[];
  subscriptions?: any[];
  invoices?: SaaSInvoice[];
  audit_logs?: PlatformAuditLog[];
}

export interface PlatformClient {
  id: string;
  name: string;
  code: string;
  client_type: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  technical_contact_email?: string;
  billing_contact_email?: string;
  compliance_contact_email?: string;
  account_manager: string;
  contract_start_date: string;
  contract_end_date?: string;
  status: string;
  notes?: string;
  created_at: string;
  hospital_count: number;
  active_hospital_count: number;
  total_mrr: number;
  total_revenue_paid: number;
  outstanding_amount: number;
  open_tickets_count: number;
  hospitals?: PlatformHospital[];
  invoices?: SaaSInvoice[];
  support_tickets?: SupportTicket[];
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  tier: "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | "GOVERNMENT" | "CUSTOM";
  monthly_price: number;
  annual_price: number;
  currency: string;
  max_doctors: number;
  max_staff: number;
  max_storage_gb: number;
  monthly_patient_limit: number;
  description: string;
  features_included: string[];
  is_active: boolean;
}

export interface SaaSInvoice {
  id: string;
  invoice_number: string;
  hospital_id: string;
  hospital_name?: string;
  hospital_code?: string;
  hospital_city?: string;
  client_id?: string;
  client_name?: string;
  client_code?: string;
  subscription_id?: string;
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: "PAID" | "PENDING" | "OVERDUE" | "FAILED" | "REFUNDED" | "CANCELLED";
  due_date: string;
  paid_at?: string;
  payment_mode?: string;
  transaction_ref?: string;
  notes?: string;
  created_at: string;
}

export interface FeatureEntitlement {
  id: string;
  hospital_id: string;
  hospital_name?: string;
  hospital_code?: string;
  feature_key: string;
  feature_name: string;
  category: "CORE" | "CLINICAL" | "ADMINISTRATIVE" | "ADVANCED" | "COMPLIANCE";
  is_enabled: boolean;
  enabled_by?: string;
  configured_at: string;
  notes?: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  hospital_id?: string;
  hospital_name?: string;
  hospital_code?: string;
  hospital_city?: string;
  client_id?: string;
  client_name?: string;
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_PROGRESS" | "WAITING_FOR_CLIENT" | "RESOLVED" | "CLOSED";
  subject: string;
  description: string;
  reported_by_name?: string;
  reported_by_email?: string;
  reported_by_phone?: string;
  assigned_to?: string;
  resolution_notes?: string;
  sla_due_at?: string;
  resolved_at?: string;
  created_at: string;
}

export interface PlatformAuditLog {
  id: string;
  admin_user_id?: string;
  admin_username: string;
  admin_full_name?: string;
  admin_email?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  previous_value?: any;
  new_value?: any;
  reason?: string;
  ticket_ref?: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

function unwrap<T>(res: any, fallback?: T): T {
  if (res && typeof res === "object") {
    const inner = res.data !== undefined ? res.data : res;
    if (inner && typeof inner === "object" && "data" in inner && "success" in inner) {
      return (inner.data ?? fallback) as T;
    }
    return (inner ?? fallback) as T;
  }
  return (res ?? fallback) as T;
}

export const superAdminApi = {
  getMetrics: async (): Promise<PlatformMetrics> => {
    const res = await apiClient.get<PlatformMetrics>("/api/v1/super-admin/metrics");
    return unwrap<PlatformMetrics>(res);
  },

  listHospitals: async (params?: {
    search?: string;
    status?: string;
    plan?: string;
    client_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlatformHospital[]> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append("search", params.search);
    if (params?.status) searchParams.append("status", params.status);
    if (params?.plan) searchParams.append("plan", params.plan);
    if (params?.client_id) searchParams.append("client_id", params.client_id);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());

    const res = await apiClient.get<PlatformHospital[]>(`/api/v1/super-admin/hospitals?${searchParams.toString()}`);
    return unwrap<PlatformHospital[]>(res, []);
  },

  getHospitalDetails: async (hospitalId: string): Promise<PlatformHospital> => {
    const res = await apiClient.get<PlatformHospital>(`/api/v1/super-admin/hospitals/${hospitalId}`);
    const data = unwrap<PlatformHospital>(res);
    if (data) {
      if (data.features && !Array.isArray(data.features) && typeof data.features === "object") {
        data.features = Object.entries(data.features).map(([key, val]) => ({
          id: `feat-${key}`,
          hospital_id: data.id || hospitalId,
          feature_key: key,
          feature_name: typeof val === "object" && val !== null && (val as any).feature_name
            ? (val as any).feature_name
            : key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          category: ((typeof val === "object" && val !== null && (val as any).category) || "CORE") as any,
          is_enabled: typeof val === "object" && val !== null ? Boolean((val as any).is_enabled) : Boolean(val),
          configured_at: new Date().toISOString(),
        }));
      } else if (!Array.isArray(data.features)) {
        data.features = [];
      }
      if (!Array.isArray(data.invoices)) data.invoices = [];
      if (!Array.isArray(data.audit_logs)) data.audit_logs = [];
      if (!Array.isArray(data.subscriptions)) data.subscriptions = [];
    }
    return data;
  },

  updateHospitalStatus: async (
    hospitalId: string,
    payload: { new_status: string; reason: string; ticket_ref?: string }
  ): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(
      `/api/v1/super-admin/hospitals/${hospitalId}/status`,
      payload
    );
    return unwrap<{ success: boolean; message: string }>(res);
  },

  onboardHospital: async (payload: {
    name: string;
    code?: string;
    client_id?: string;
    city: string;
    state?: string;
    address?: string;
    phone?: string;
    email?: string;
    plan_id: string;
    consultation_fee?: number;
  }): Promise<any> => {
    const res = await apiClient.post("/api/v1/super-admin/hospitals/onboard", payload);
    return unwrap<any>(res);
  },

  onboardHospitalWizard: async (payload: any): Promise<any> => {
    const res = await apiClient.post("/api/v1/super-admin/hospitals/wizard", payload);
    return unwrap<any>(res);
  },

  createHospitalMinimal: async (payload: {
    facility_type: string;
    legal_name: string;
    display_name?: string;
    code?: string;
    primary_contact_name?: string;
    primary_mobile: string;
    registered_email: string;
    country?: string;
    state?: string;
    city: string;
    address?: string;
    pin?: string;
    registration_number?: string;
    registration_authority?: string;
    registration_expiry?: string;
    admin_first_name: string;
    admin_last_name: string;
    admin_mobile?: string;
    admin_email?: string;
    plan_tier?: string;
  }): Promise<any> => {
    const res = await apiClient.post("/api/v1/super-admin/hospitals/create-minimal", payload);
    return unwrap<any>(res);
  },

  listClients: async (params?: { search?: string; limit?: number; offset?: number }): Promise<PlatformClient[]> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append("search", params.search);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());

    const res = await apiClient.get<PlatformClient[]>(`/api/v1/super-admin/clients?${searchParams.toString()}`);
    return unwrap<PlatformClient[]>(res, []);
  },

  getClientDetails: async (clientId: string): Promise<PlatformClient> => {
    const res = await apiClient.get<PlatformClient>(`/api/v1/super-admin/clients/${clientId}`);
    return unwrap<PlatformClient>(res);
  },

  createClient: async (payload: {
    name: string;
    code?: string;
    client_type?: string;
    primary_contact_name?: string;
    primary_contact_email?: string;
    primary_contact_phone?: string;
    technical_contact_email?: string;
    billing_contact_email?: string;
    compliance_contact_email?: string;
    account_manager?: string;
  }): Promise<any> => {
    const res = await apiClient.post("/api/v1/super-admin/clients", payload);
    return unwrap<any>(res);
  },

  listSubscriptions: async (): Promise<{ plans: SubscriptionPlan[]; subscriptions: any[] }> => {
    const res = await apiClient.get<{ plans: SubscriptionPlan[]; subscriptions: any[] }>(
      "/api/v1/super-admin/subscriptions"
    );
    return unwrap<{ plans: SubscriptionPlan[]; subscriptions: any[] }>(res);
  },

  updateSubscription: async (
    hospitalId: string,
    payload: { plan_id: string; billing_cycle?: string; discount_percent?: number }
  ): Promise<any> => {
    const res = await apiClient.put(`/api/v1/super-admin/subscriptions/${hospitalId}`, payload);
    return unwrap<any>(res);
  },

  listPayments: async (params?: {
    status?: string;
    hospital_id?: string;
    client_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<SaaSInvoice[]> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append("status", params.status);
    if (params?.hospital_id) searchParams.append("hospital_id", params.hospital_id);
    if (params?.client_id) searchParams.append("client_id", params.client_id);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());

    const res = await apiClient.get<SaaSInvoice[]>(`/api/v1/super-admin/payments?${searchParams.toString()}`);
    return unwrap<SaaSInvoice[]>(res, []);
  },

  recordPayment: async (payload: {
    invoice_id: string;
    amount: number;
    payment_mode?: string;
    transaction_ref?: string;
  }): Promise<any> => {
    const res = await apiClient.post("/api/v1/super-admin/payments/record", payload);
    return unwrap<any>(res);
  },

  getFeatures: async (hospitalId: string): Promise<FeatureEntitlement[]> => {
    const res = await apiClient.get<any>(`/api/v1/super-admin/features/${hospitalId}`);
    const data = unwrap<any>(res, []);
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") {
      return Object.entries(data).map(([key, val]) => ({
        id: `feat-${key}`,
        hospital_id: hospitalId,
        feature_key: key,
        feature_name: typeof val === "object" && val !== null && (val as any).feature_name
          ? (val as any).feature_name
          : key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        category: ((typeof val === "object" && val !== null && (val as any).category) || "CORE") as any,
        is_enabled: typeof val === "object" && val !== null ? Boolean((val as any).is_enabled) : Boolean(val),
        configured_at: new Date().toISOString(),
      }));
    }
    return [];
  },

  updateFeature: async (
    hospitalId: string,
    payload: { feature_key: string; is_enabled: boolean }
  ): Promise<any> => {
    const res = await apiClient.put(`/api/v1/super-admin/features/${hospitalId}`, payload);
    return unwrap<any>(res);
  },

  listSupportTickets: async (params?: {
    status?: string;
    category?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<SupportTicket[]> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append("status", params.status);
    if (params?.category) searchParams.append("category", params.category);
    if (params?.priority) searchParams.append("priority", params.priority);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());

    const res = await apiClient.get<SupportTicket[]>(`/api/v1/super-admin/support?${searchParams.toString()}`);
    return unwrap<SupportTicket[]>(res, []);
  },

  createSupportTicket: async (payload: {
    hospital_id?: string;
    client_id?: string;
    category?: string;
    priority?: string;
    subject: string;
    description: string;
    reported_by_name?: string;
    reported_by_email?: string;
    reported_by_phone?: string;
  }): Promise<any> => {
    const res = await apiClient.post("/api/v1/super-admin/support", payload);
    return unwrap<any>(res);
  },

  updateSupportTicket: async (
    ticketId: string,
    payload: { status: string; resolution_notes?: string; assigned_to?: string }
  ): Promise<any> => {
    const res = await apiClient.put(`/api/v1/super-admin/support/${ticketId}`, payload);
    return unwrap<any>(res);
  },

  startImpersonation: async (payload: {
    hospital_id: string;
    target_role?: string;
    reason: string;
    ticket_ref?: string;
    duration_minutes?: number;
  }): Promise<any> => {
    const res = await apiClient.post("/api/v1/super-admin/impersonation/start", payload);
    return unwrap<any>(res);
  },

  endImpersonation: async (sessionToken: string): Promise<any> => {
    const res = await apiClient.post("/api/v1/super-admin/impersonation/end", {
      session_token: sessionToken,
    });
    return unwrap<any>(res);
  },

  listAuditLogs: async (params?: { entity_type?: string; limit?: number; offset?: number }): Promise<PlatformAuditLog[]> => {
    const searchParams = new URLSearchParams();
    if (params?.entity_type) searchParams.append("entity_type", params.entity_type);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());

    const res = await apiClient.get<PlatformAuditLog[]>(`/api/v1/super-admin/audit?${searchParams.toString()}`);
    return unwrap<PlatformAuditLog[]>(res, []);
  },

  getHealth: async (): Promise<any> => {
    const res = await apiClient.get<any>("/api/v1/super-admin/health");
    return unwrap<any>(res);
  },
};

