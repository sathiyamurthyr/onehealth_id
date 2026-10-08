import { apiClient } from "./client";
import {
  Integration,
  IntegrationEvent,
  ExternalHealthRecord,
  ConsentArtifact,
  AccessHistoryEntry,
  IdentityConflict,
  IntegrationHealthSummary,
} from "../types";

export const phase4Api = {
  // Integrations Registry & Health
  getIntegrations: async (hospitalId?: string) => {
    const url = hospitalId
      ? `/integrations?hospital_id=${encodeURIComponent(hospitalId)}`
      : "/integrations";
    const res = await apiClient.get<Integration[]>(url);
    return res.data;
  },

  getIntegration: async (id: string) => {
    const res = await apiClient.get<Integration>(`/integrations/${id}`);
    return res.data;
  },

  createIntegration: async (data: Partial<Integration> & { secret_key?: string }) => {
    const res = await apiClient.post<Integration>("/integrations", data);
    return res.data;
  },

  updateIntegration: async (id: string, data: Partial<Integration>) => {
    const res = await apiClient.put<Integration>(`/integrations/${id}`, data);
    return res.data;
  },

  testIntegrationPing: async (id: string) => {
    const res = await apiClient.post<{ status: string; latency_ms: number; timestamp: string }>(
      `/integrations/${id}/test-ping`
    );
    return res.data;
  },

  getIntegrationEvents: async (integrationId?: string, limit = 50) => {
    const url = integrationId
      ? `/integrations/events?integration_id=${encodeURIComponent(integrationId)}&limit=${limit}`
      : `/integrations/events?limit=${limit}`;
    const res = await apiClient.get<IntegrationEvent[]>(url);
    return res.data;
  },

  getIntegrationHealthSummary: async () => {
    const res = await apiClient.get<IntegrationHealthSummary>("/integrations/health/summary");
    return res.data;
  },

  getIdentityConflicts: async () => {
    const res = await apiClient.get<IdentityConflict[]>("/integrations/conflicts");
    return res.data;
  },

  resolveIdentityConflict: async (conflictId: string, resolution: "MERGED" | "NEW_PATIENT" | "REJECTED") => {
    const res = await apiClient.post(`/integrations/conflicts/${conflictId}/resolve`, { resolution });
    return res.data;
  },

  // Patient Consent & Connected Sharing
  getPatientConsents: async () => {
    const res = await apiClient.get<ConsentArtifact[]>("/me/data-sharing");
    return res.data;
  },

  requestConsent: async (data: {
    patient_id: string;
    requester_name: string;
    requester_type: string;
    purpose_of_use: string;
    data_categories: string[];
    date_range_from?: string;
    date_range_to?: string;
    expiry_days?: number;
  }) => {
    const res = await apiClient.post<ConsentArtifact>("/hospital/data-sharing/request", data);
    return res.data;
  },

  approveConsent: async (consentId: string) => {
    const res = await apiClient.post<{ message: string; consent: ConsentArtifact }>(
      `/me/data-sharing/${consentId}/approve`
    );
    return res.data;
  },

  denyConsent: async (consentId: string) => {
    const res = await apiClient.post<{ message: string; consent: ConsentArtifact }>(
      `/me/data-sharing/${consentId}/deny`
    );
    return res.data;
  },

  revokeConsent: async (consentId: string) => {
    const res = await apiClient.post<{ message: string; consent: ConsentArtifact }>(
      `/me/data-sharing/${consentId}/revoke`
    );
    return res.data;
  },

  // Patient Access History & External Records
  getPatientAccessHistory: async () => {
    const res = await apiClient.get<AccessHistoryEntry[]>("/me/access-history");
    return res.data;
  },

  getPatientExternalRecords: async () => {
    const res = await apiClient.get<ExternalHealthRecord[]>("/me/external-records");
    return res.data;
  },

  importExternalRecord: async (data: {
    patient_id: string;
    external_source_system: string;
    external_organization_name: string;
    external_facility_name?: string;
    external_record_id: string;
    record_type: string;
    record_date: string;
    clinical_summary?: string;
    raw_fhir_resource?: Record<string, any>;
  }) => {
    const res = await apiClient.post<ExternalHealthRecord>("/me/external-records", data);
    return res.data;
  },

  // Hospital Cross-Provider Data Fetch & Break-Glass
  hospitalFetchCrossProviderRecords: async (params: {
    patient_id: string;
    purpose_of_use?: string;
    data_categories?: string[];
  }) => {
    const res = await apiClient.post<{
      status: string;
      patient_id: string;
      access_basis: string;
      records: {
        consultations: any[];
        prescriptions: any[];
        diagnostic_reports: any[];
        external_records: any[];
      };
    }>("/hospital/data-sharing/fetch", params);
    return res.data;
  },

  hospitalBreakGlassFetch: async (params: {
    patient_id: string;
    emergency_reason: string;
    data_categories?: string[];
  }) => {
    const res = await apiClient.post<{
      status: string;
      patient_id: string;
      access_basis: string;
      emergency_reason: string;
      records: {
        consultations: any[];
        prescriptions: any[];
        diagnostic_reports: any[];
        external_records: any[];
      };
    }>("/hospital/data-sharing/break-glass", params);
    return res.data;
  },

  // FHIR R4 Bundle Export
  getFHIREverythingBundle: async (patientId: string) => {
    const res = await apiClient.get<any>(`/fhir/Patient/${patientId}/$everything`);
    return res.data;
  },

  // ABDM / ABHA Integration
  getABDMFacilityStatus: async (hospitalId: string) => {
    const res = await apiClient.get<{
      hospital_id: string;
      hospital_name: string;
      hfr_id?: string;
      abdm_registered: boolean;
      status: string;
      integration_type: string;
      capabilities: string[];
    }>(`/abdm/facilities/${hospitalId}/status`);
    return res.data;
  },

  getABDMDoctorStatus: async (doctorId: string) => {
    const res = await apiClient.get<{
      doctor_id: string;
      doctor_name: string;
      hpr_id?: string;
      abdm_registered: boolean;
      status: string;
    }>(`/abdm/practitioners/${doctorId}/status`);
    return res.data;
  },

  verifyAndLinkABHA: async (data: {
    patient_id: string;
    abha_number?: string;
    abha_address?: string;
  }) => {
    const res = await apiClient.post<{
      message: string;
      patient_id: string;
      onehealth_id: string;
      abha_number?: string;
      abha_address?: string;
      status: string;
    }>("/abdm/abha/link", data);
    return res.data;
  },
};
