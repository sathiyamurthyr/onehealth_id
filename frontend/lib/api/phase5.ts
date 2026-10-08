/**
 * OH-ID Phase 5: Enterprise Hospital Operations, Billing, Insurance & Operational Intelligence API Client
 * Sathus Technology Pvt Ltd
 */

import { apiClient } from "./client";
import {
  HospitalService,
  PriceList,
  PriceListItem,
  MedicalPackage,
  ChargeItem,
  BillingInvoice,
  PaymentRecord,
  PaymentReceipt,
  BillingRefund,
  BillingAdjustment,
  Payer,
  InsurancePolicy,
  Preauthorization,
  InsuranceClaim,
  HospitalFinancialAnalytics,
  HospitalOperationalKPIs,
  DepartmentPerformanceSummary
} from "../types";

export const phase5Api = {
  // ---------------------------------------------------------------------------
  // 1. SERVICES & PRICE LISTS
  // ---------------------------------------------------------------------------
  listServices: async (params?: { hospital_id?: string; category?: string; is_active?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.category) q.set("category", params.category);
    if (params?.is_active !== undefined) q.set("is_active", String(params.is_active));
    const qs = q.toString();
    const res = await apiClient.get<HospitalService[]>(`/hospital/services${qs ? `?${qs}` : ""}`);
    return res.data;
  },

  createService: async (data: Partial<HospitalService>) => {
    const res = await apiClient.post<{ success: boolean; data: HospitalService }>("/hospital/services", data);
    return res.data;
  },

  updateService: async (serviceId: string, data: Partial<HospitalService>) => {
    const res = await apiClient.put<{ success: boolean; message: string }>(`/hospital/services/${serviceId}`, data);
    return res.data;
  },

  deleteService: async (serviceId: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/hospital/services/${serviceId}`);
    return res.data;
  },

  listPriceLists: async (hospitalId?: string) => {
    const qs = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : "";
    const res = await apiClient.get<PriceList[]>(`/hospital/price-lists${qs}`);
    return res.data;
  },

  createPriceList: async (data: Partial<PriceList>) => {
    const res = await apiClient.post<{ success: boolean; data: PriceList }>("/hospital/price-lists", data);
    return res.data;
  },

  getPriceListItems: async (priceListId: string) => {
    const res = await apiClient.get<PriceListItem[]>(`/hospital/price-lists/${priceListId}/items`);
    return res.data;
  },

  updatePriceListItems: async (priceListId: string, items: PriceListItem[]) => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/hospital/price-lists/${priceListId}/items`, items);
    return res.data;
  },

  listPackages: async (hospitalId?: string) => {
    const qs = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : "";
    const res = await apiClient.get<MedicalPackage[]>(`/hospital/packages${qs}`);
    return res.data;
  },

  createPackage: async (data: Partial<MedicalPackage>) => {
    const res = await apiClient.post<{ success: boolean; data: MedicalPackage }>("/hospital/packages", data);
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // 2. CHARGES & INVOICES
  // ---------------------------------------------------------------------------
  listCharges: async (params?: { hospital_id?: string; patient_id?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.patient_id) q.set("patient_id", params.patient_id);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    const res = await apiClient.get<ChargeItem[]>(`/hospital/billing/charges${qs ? `?${qs}` : ""}`);
    return res.data;
  },

  createCharge: async (data: Partial<ChargeItem>) => {
    const res = await apiClient.post<{ success: boolean; data: ChargeItem }>("/hospital/billing/charges", data);
    return res.data;
  },

  listInvoices: async (params?: { hospital_id?: string; payment_status?: string; patient_id?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.payment_status) q.set("payment_status", params.payment_status);
    if (params?.patient_id) q.set("patient_id", params.patient_id);
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    const res = await apiClient.get<BillingInvoice[]>(`/hospital/billing/invoices${qs ? `?${qs}` : ""}`);
    return res.data;
  },

  getInvoiceDetails: async (invoiceId: string) => {
    const res = await apiClient.get<BillingInvoice>(`/hospital/billing/invoices/${invoiceId}`);
    return res.data;
  },

  createInvoiceFromCharges: async (data: {
    hospital_id: string;
    patient_id: string;
    charge_ids: string[];
    billing_account_id?: string;
    payer_id?: string;
    discount?: number;
    due_days?: number;
  }) => {
    const res = await apiClient.post<{ success: boolean; data: BillingInvoice }>("/hospital/billing/invoices", data);
    return res.data;
  },

  issueInvoice: async (invoiceId: string) => {
    const res = await apiClient.post<{ success: boolean; message: string; data: any }>(`/hospital/billing/invoices/${invoiceId}/issue`);
    return res.data;
  },

  cancelInvoice: async (invoiceId: string, reason?: string) => {
    const qs = reason ? `?reason=${encodeURIComponent(reason)}` : "";
    const res = await apiClient.post<{ success: boolean; message: string }>(`/hospital/billing/invoices/${invoiceId}/cancel${qs}`);
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // 3. PAYMENTS, REFUNDS & ADJUSTMENTS
  // ---------------------------------------------------------------------------
  listPayments: async (params?: { hospital_id?: string; invoice_id?: string; payment_status?: string }) => {
    const q = new URLSearchParams();
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.invoice_id) q.set("invoice_id", params.invoice_id);
    if (params?.payment_status) q.set("payment_status", params.payment_status);
    const qs = q.toString();
    const res = await apiClient.get<PaymentRecord[]>(`/hospital/billing/payments${qs ? `?${qs}` : ""}`);
    return res.data;
  },

  recordPayment: async (data: {
    invoice_id: string;
    amount: number;
    payment_mode: string;
    transaction_ref?: string;
    gateway_name?: string;
    idempotency_key?: string;
  }) => {
    const res = await apiClient.post<{ success: boolean; message: string; data: any }>("/hospital/billing/payments", data);
    return res.data;
  },

  listReceipts: async (params?: { hospital_id?: string; patient_id?: string; invoice_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.patient_id) q.set("patient_id", params.patient_id);
    if (params?.invoice_id) q.set("invoice_id", params.invoice_id);
    const qs = q.toString();
    const res = await apiClient.get<PaymentReceipt[]>(`/hospital/billing/receipts${qs ? `?${qs}` : ""}`);
    return res.data;
  },

  listRefunds: async (params?: { hospital_id?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    const res = await apiClient.get<BillingRefund[]>(`/hospital/billing/refunds${qs ? `?${qs}` : ""}`);
    return res.data;
  },

  requestRefund: async (data: {
    invoice_id: string;
    payment_id: string;
    refund_amount: number;
    reason: string;
    hospital_id?: string;
  }) => {
    const res = await apiClient.post<{ success: boolean; data: BillingRefund }>("/hospital/billing/refunds", data);
    return res.data;
  },

  approveRefund: async (refundId: string) => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/hospital/billing/refunds/${refundId}/approve`);
    return res.data;
  },

  processRefund: async (refundId: string) => {
    const res = await apiClient.post<{ success: boolean; message: string; data: any }>(`/hospital/billing/refunds/${refundId}/process`);
    return res.data;
  },

  listAdjustments: async (params?: { hospital_id?: string; invoice_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.invoice_id) q.set("invoice_id", params.invoice_id);
    const qs = q.toString();
    const res = await apiClient.get<BillingAdjustment[]>(`/hospital/billing/adjustments${qs ? `?${qs}` : ""}`);
    return res.data;
  },

  createAdjustment: async (data: {
    hospital_id: string;
    invoice_id: string;
    charge_id?: string;
    adjustment_type: string;
    adjustment_amount: number;
    reason: string;
  }) => {
    const res = await apiClient.post<{ success: boolean; data: BillingAdjustment }>("/hospital/billing/adjustments", data);
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // 4. INSURANCE & PAYERS
  // ---------------------------------------------------------------------------
  listPayers: async (hospitalId?: string) => {
    const qs = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : "";
    const res = await apiClient.get<Payer[]>(`/hospital/insurance/payers${qs}`);
    return res.data;
  },

  createPayer: async (data: Partial<Payer>) => {
    const res = await apiClient.post<{ success: boolean; data: Payer }>("/hospital/insurance/payers", data);
    return res.data;
  },

  listPolicies: async (params?: { hospital_id?: string; patient_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.patient_id) q.set("patient_id", params.patient_id);
    const qs = q.toString();
    const res = await apiClient.get<InsurancePolicy[]>(`/hospital/insurance/policies${qs ? `?${qs}` : ""}`);
    return res.data;
  },

  createPolicy: async (data: Partial<InsurancePolicy>) => {
    const res = await apiClient.post<{ success: boolean; data: InsurancePolicy }>("/hospital/insurance/policies", data);
    return res.data;
  },

  listPreauthorizations: async (params?: { hospital_id?: string; patient_id?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.patient_id) q.set("patient_id", params.patient_id);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    const res = await apiClient.get<Preauthorization[]>(`/hospital/insurance/preauthorizations${qs ? `?${qs}` : ""}`);
    return res.data;
  },

  createPreauthorization: async (data: Partial<Preauthorization>) => {
    const res = await apiClient.post<{ success: boolean; data: Preauthorization }>("/hospital/insurance/preauthorizations", data);
    return res.data;
  },

  adjudicatePreauthorization: async (preauthId: string, data: { status: string; approved_amount?: number; notes?: string }) => {
    const res = await apiClient.post<{ success: boolean; message: string; data: any }>(`/hospital/insurance/preauthorizations/${preauthId}/adjudicate`, data);
    return res.data;
  },

  listClaims: async (params?: { hospital_id?: string; status?: string; patient_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.status) q.set("status", params.status);
    if (params?.patient_id) q.set("patient_id", params.patient_id);
    const qs = q.toString();
    const res = await apiClient.get<InsuranceClaim[]>(`/hospital/insurance/claims${qs ? `?${qs}` : ""}`);
    return res.data;
  },

  createClaim: async (data: {
    hospital_id: string;
    patient_id: string;
    payer_id: string;
    policy_id?: string;
    preauthorization_id?: string;
    invoice_id?: string;
    claim_amount: number;
    items?: any[];
  }) => {
    const res = await apiClient.post<{ success: boolean; data: InsuranceClaim }>("/hospital/insurance/claims", data);
    return res.data;
  },

  adjudicateClaim: async (claimId: string, data: { status: string; approved_amount?: number; rejected_amount?: number; rejection_reason?: string }) => {
    const res = await apiClient.post<{ success: boolean; message: string; data: any }>(`/hospital/insurance/claims/${claimId}/adjudicate`, data);
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // 5. OPERATIONAL INTELLIGENCE & ANALYTICS
  // ---------------------------------------------------------------------------
  getFinancialAnalytics: async (hospitalId?: string) => {
    const qs = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : "";
    const res = await apiClient.get<HospitalFinancialAnalytics>(`/hospital/analytics/financial${qs}`);
    return res.data;
  },

  getOperationalKPIs: async (hospitalId?: string) => {
    const qs = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : "";
    const res = await apiClient.get<HospitalOperationalKPIs>(`/hospital/analytics/operational-kpis${qs}`);
    return res.data;
  },

  getDepartmentPerformance: async (hospitalId?: string) => {
    const qs = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : "";
    const res = await apiClient.get<DepartmentPerformanceSummary[]>(`/hospital/analytics/departments${qs}`);
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // 6. PATIENT SELF-SERVICE BILLS & RECEIPTS
  // ---------------------------------------------------------------------------
  getMyBills: async () => {
    const res = await apiClient.get<BillingInvoice[]>("/me/bills");
    return res.data;
  },

  getMyBillDetails: async (invoiceId: string) => {
    const res = await apiClient.get<BillingInvoice>(`/me/bills/${invoiceId}`);
    return res.data;
  },

  getMyReceipts: async () => {
    const res = await apiClient.get<PaymentReceipt[]>("/me/receipts");
    return res.data;
  },

  verifyMyPayment: async (data: {
    invoice_id: string;
    amount: number;
    payment_mode: string;
    gateway_name?: string;
    gateway_transaction_id: string;
    gateway_signature: string;
    idempotency_key?: string;
  }) => {
    const res = await apiClient.post<{ success: boolean; message: string; data: any }>("/me/payments/verify", data);
    return res.data;
  }
};
