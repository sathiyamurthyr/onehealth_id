/**
 * OH-ID Phase 7: Healthcare Network & Ecosystem API Client
 * Sathus Technology Pvt Ltd
 */

import { fetchJSON } from "./client";
import {
  NetworkProvider,
  NetworkFacility,
  CrossProviderIdentity,
  NetworkConsent,
  NetworkRecordExchange,
  NetworkReferral,
  NetworkPharmacyDispensation,
  NetworkDiagnosticOrder,
  EmergencyBreakGlassLog,
  NetworkServiceOffering,
  NetworkUnifiedTimelineEvent,
  NetworkTelemetry,
} from "../types";

export const networkApi = {
  // 1. Providers & Facilities
  listProviders: async (params?: { provider_type?: string; stage?: string; city?: string }) => {
    const query = new URLSearchParams();
    if (params?.provider_type) query.append("provider_type", params.provider_type);
    if (params?.stage) query.append("stage", params.stage);
    if (params?.city) query.append("city", params.city);
    return fetchJSON<NetworkProvider[]>(`/network/providers?${query.toString()}`);
  },

  getProvider: async (providerId: string) => {
    return fetchJSON<NetworkProvider>(`/network/providers/${providerId}`);
  },

  registerProvider: async (data: Partial<NetworkProvider>) => {
    return fetchJSON<NetworkProvider>("/network/providers/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateProviderStage: async (providerId: string, stage: string, verifiedBy?: string) => {
    return fetchJSON<NetworkProvider>(`/network/providers/${providerId}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage, verified_by: verifiedBy }),
    });
  },

  listFacilities: async (params?: { provider_id?: string; city?: string; emergency_only?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.provider_id) query.append("provider_id", params.provider_id);
    if (params?.city) query.append("city", params.city);
    if (params?.emergency_only) query.append("emergency_only", "true");
    return fetchJSON<NetworkFacility[]>(`/network/facilities?${query.toString()}`);
  },

  // 2. Cross-Provider Identity
  matchIdentity: async (identifier: string, providerId?: string) => {
    const query = new URLSearchParams({ identifier });
    if (providerId) query.append("provider_id", providerId);
    return fetchJSON<{ status: string; patient: any; patient_id?: string; onehealth_id?: string }>(
      `/network/identities/match?${query.toString()}`
    );
  },

  linkIdentity: async (data: {
    master_patient_id: string;
    onehealth_id: string;
    provider_id: string;
    external_mrn: string;
    match_confidence?: number;
    match_method?: string;
  }) => {
    return fetchJSON<CrossProviderIdentity>("/network/identities/link", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getPatientLinks: async (patientId: string) => {
    return fetchJSON<CrossProviderIdentity[]>(`/network/identities/patient/${patientId}/links`);
  },

  // 3. Granular Consent & Exchange
  grantConsent: async (data: {
    patient_id: string;
    grantee_provider_id: string;
    consent_scope?: string;
    purpose?: string;
    valid_days?: number;
    grantee_doctor_id?: string;
    grantor_provider_id?: string;
  }) => {
    return fetchJSON<NetworkConsent>("/network/consents/grant", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  revokeConsent: async (consentId: string, patientId: string, reason?: string) => {
    return fetchJSON<NetworkConsent>(`/network/consents/${consentId}/revoke?patient_id=${patientId}`, {
      method: "POST",
      body: JSON.stringify({ reason: reason || "Revoked by patient" }),
    });
  },

  verifyConsentAccess: async (data: {
    patient_id: string;
    requester_provider_id: string;
    record_type: string;
    purpose?: string;
  }) => {
    return fetchJSON<{
      is_authorized: boolean;
      reason?: string;
      consent_id?: string;
      consent_scope?: string;
      valid_until?: string;
    }>("/network/consents/verify", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listPatientConsents: async (patientId: string) => {
    return fetchJSON<NetworkConsent[]>(`/network/consents/patient/${patientId}`);
  },

  exchangeRecord: async (data: {
    patient_id: string;
    requester_provider_id: string;
    requester_user_id: string;
    record_type: string;
    record_id?: string;
    source_provider_id?: string;
    purpose?: string;
    is_emergency_break_glass?: boolean;
  }) => {
    return fetchJSON<{
      status: string;
      id?: string;
      patient_id: string;
      record_type: string;
      record_id?: string;
      records_count: number;
      records: any[];
      provenance_hash: string;
      consent_id?: string;
      is_break_glass?: boolean;
    }>("/network/exchange/record", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getUnifiedTimeline: async (patientId: string) => {
    return fetchJSON<NetworkUnifiedTimelineEvent[]>(`/network/exchange/unified-timeline/${patientId}`);
  },

  getExchangeAudit: async (patientId: string) => {
    return fetchJSON<NetworkRecordExchange[]>(`/network/exchange/audit/${patientId}`);
  },

  // 4. Digital Referrals
  createReferral: async (data: {
    patient_id: string;
    referring_provider_id: string;
    referring_doctor_id: string;
    referring_doctor_name?: string;
    target_provider_id: string;
    target_specialty: string;
    clinical_summary: string;
    referral_question?: string;
    urgency?: string;
    attached_record_ids?: string[];
  }) => {
    return fetchJSON<NetworkReferral>("/network/referrals/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listIncomingReferrals: async (providerId: string) => {
    return fetchJSON<NetworkReferral[]>(`/network/referrals/${providerId}/incoming`);
  },

  listOutgoingReferrals: async (providerId: string) => {
    return fetchJSON<NetworkReferral[]>(`/network/referrals/${providerId}/outgoing`);
  },

  updateReferralStatus: async (
    referralId: string,
    status: string,
    notes?: string,
    targetAppointmentId?: string
  ) => {
    return fetchJSON<NetworkReferral>(`/network/referrals/${referralId}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        response_notes: notes,
        target_appointment_id: targetAppointmentId,
      }),
    });
  },

  // 5. Pharmacy Network
  verifyPrescription: async (prescriptionId: string) => {
    return fetchJSON<{ status: string; prescription: any }>(
      `/network/pharmacy/verify-prescription/${prescriptionId}`
    );
  },

  dispensePrescription: async (data: {
    prescription_id: string;
    patient_id: string;
    prescribing_hospital_id: string;
    dispensing_pharmacy_id: string;
    dispensed_items: any[];
    dispensing_status?: string;
    dispensing_pharmacist_id?: string;
    dispensing_pharmacist_name?: string;
    batch_numbers?: Record<string, string>;
    notes?: string;
  }) => {
    return fetchJSON<NetworkPharmacyDispensation>("/network/pharmacy/dispense", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listDispensations: async (params?: { pharmacy_id?: string; patient_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.pharmacy_id) query.append("pharmacy_id", params.pharmacy_id);
    if (params?.patient_id) query.append("patient_id", params.patient_id);
    return fetchJSON<NetworkPharmacyDispensation[]>(`/network/pharmacy/dispensations?${query.toString()}`);
  },

  // 6. Diagnostic Network
  createDiagnosticOrder: async (data: {
    order_id: string;
    patient_id: string;
    ordering_provider_id: string;
    diagnostic_lab_id: string;
    test_codes: string[];
  }) => {
    return fetchJSON<NetworkDiagnosticOrder>("/network/diagnostics/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateDiagnosticStatus: async (
    orderId: string,
    status: string,
    criticalFlag: boolean = false,
    resultReportId?: string,
    turnaroundMinutes?: number
  ) => {
    return fetchJSON<NetworkDiagnosticOrder>(`/network/diagnostics/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        critical_flag: criticalFlag,
        result_report_id: resultReportId,
        turnaround_minutes: turnaroundMinutes,
      }),
    });
  },

  listDiagnosticOrders: async (params?: {
    diagnostic_lab_id?: string;
    patient_id?: string;
    critical_only?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params?.diagnostic_lab_id) query.append("diagnostic_lab_id", params.diagnostic_lab_id);
    if (params?.patient_id) query.append("patient_id", params.patient_id);
    if (params?.critical_only) query.append("critical_only", "true");
    return fetchJSON<NetworkDiagnosticOrder[]>(`/network/diagnostics/orders?${query.toString()}`);
  },

  // 7. Emergency Break-Glass
  executeBreakGlass: async (data: {
    patient_id: string;
    provider_id: string;
    clinician_id: string;
    clinician_name: string;
    reason: string;
    triage_level?: string;
    accessed_records?: string[];
  }) => {
    return fetchJSON<{
      status: string;
      emergency_log_id: string;
      authorized_window_minutes: number;
      patient_id: string;
      records_count: number;
      critical_records: any[];
      patient_notified: boolean;
      audit_warning: string;
    }>("/network/emergency/break-glass", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listBreakGlassLogs: async (params?: { provider_id?: string; patient_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.provider_id) query.append("provider_id", params.provider_id);
    if (params?.patient_id) query.append("patient_id", params.patient_id);
    return fetchJSON<EmergencyBreakGlassLog[]>(`/network/emergency/logs?${query.toString()}`);
  },

  // 8. Marketplace & Intelligence
  searchMarketplace: async (params?: {
    q?: string;
    specialty?: string;
    category?: string;
    city?: string;
    max_price?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.q) query.append("q", params.q);
    if (params?.specialty) query.append("specialty", params.specialty);
    if (params?.category) query.append("category", params.category);
    if (params?.city) query.append("city", params.city);
    if (params?.max_price) query.append("max_price", params.max_price.toString());
    return fetchJSON<NetworkServiceOffering[]>(`/network/marketplace/search?${query.toString()}`);
  },

  getNetworkTelemetry: async () => {
    return fetchJSON<NetworkTelemetry>("/network/intelligence/telemetry");
  },

  getAuthorizedPatientBrief: async (
    patientId: string,
    requesterProviderId: string,
    isEmergency: boolean = false
  ) => {
    const query = new URLSearchParams({
      requester_provider_id: requesterProviderId,
      is_emergency: isEmergency ? "true" : "false",
    });
    return fetchJSON<{
      patient_id: string;
      requester_provider_id: string;
      is_emergency_access: boolean;
      total_authorized_events: number;
      summary: {
        recent_consultations_count: number;
        recent_prescriptions_count: number;
        recent_diagnostic_investigations_count: number;
        participating_source_providers: string[];
      };
      authorized_timeline: any[];
      provenance_notice: string;
    }>(`/network/intelligence/patient-brief/${patientId}?${query.toString()}`);
  },
};
