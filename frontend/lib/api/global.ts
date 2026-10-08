/**
 * OH-ID Phase 8: Global Healthcare Platform & Autonomous Ecosystem API Client
 * Sathus Technology Pvt Ltd
 */

import { fetchJSON } from "./client";
import {
  CountryConfig,
  GlobalIdentity,
  DeveloperApp,
  DeveloperApiKey,
  WebhookSubscription,
  TelehealthSession,
  WearableObservation,
  GlobalPayerClaim,
  ResearchCohort,
  GlobalPlatformTelemetry,
} from "../types";

export const globalApi = {
  // 1. Countries & Sovereign Identifiers
  listCountries: async (isActive?: boolean) => {
    const query = new URLSearchParams();
    if (isActive !== undefined) query.append("is_active", String(isActive));
    return fetchJSON<CountryConfig[]>(`/global/countries?${query.toString()}`);
  },

  getCountry: async (countryCode: string) => {
    return fetchJSON<CountryConfig>(`/global/countries/${countryCode}`);
  },

  upsertCountry: async (data: Partial<CountryConfig>) => {
    return fetchJSON<CountryConfig>("/global/countries/upsert", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listGlobalIdentities: async (params?: { patient_id?: string; country_code?: string }) => {
    const query = new URLSearchParams();
    if (params?.patient_id) query.append("patient_id", params.patient_id);
    if (params?.country_code) query.append("country_code", params.country_code);
    return fetchJSON<GlobalIdentity[]>(`/global/identities?${query.toString()}`);
  },

  linkGlobalIdentity: async (data: Partial<GlobalIdentity>) => {
    return fetchJSON<GlobalIdentity>("/global/identities/link", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  lookupGlobalPatient: async (countryCode: string, identifierType: string, identifierValue: string) => {
    const query = new URLSearchParams({
      country_code: countryCode,
      identifier_type: identifierType,
      identifier_value: identifierValue,
    });
    return fetchJSON<any>(`/global/identities/lookup?${query.toString()}`);
  },

  // 2. Developer Ecosystem & Apps
  listDeveloperApps: async (params?: { organization_name?: string; app_category?: string }) => {
    const query = new URLSearchParams();
    if (params?.organization_name) query.append("developer_organization", params.organization_name);
    if (params?.app_category) query.append("app_type", params.app_category);
    return fetchJSON<DeveloperApp[]>(`/global/developer/apps?${query.toString()}`);
  },

  getDeveloperApp: async (appId: string) => {
    return fetchJSON<DeveloperApp>(`/global/developer/apps/${appId}`);
  },

  registerDeveloperApp: async (data: Partial<DeveloperApp>) => {
    return fetchJSON<DeveloperApp>("/global/developer/apps/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listApiKeys: async (appId: string) => {
    return fetchJSON<DeveloperApiKey[]>(`/global/developer/apps/${appId}/keys`);
  },

  createApiKey: async (appId: string, keyName: string) => {
    return fetchJSON<DeveloperApiKey>("/global/developer/apps/keys/create", {
      method: "POST",
      body: JSON.stringify({ app_id: appId, key_name: keyName, is_active: true }),
    });
  },

  revokeApiKey: async (keyId: string) => {
    return fetchJSON<DeveloperApiKey>(`/global/developer/apps/keys/${keyId}/revoke`, {
      method: "POST",
    });
  },

  // 3. Webhook Subscriptions
  listWebhooks: async (appId?: string) => {
    const query = new URLSearchParams();
    if (appId) query.append("app_id", appId);
    return fetchJSON<WebhookSubscription[]>(`/global/developer/webhooks?${query.toString()}`);
  },

  createWebhook: async (data: Partial<WebhookSubscription>) => {
    return fetchJSON<WebhookSubscription>("/global/developer/webhooks/subscribe", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 4. Telehealth & Virtual Consultations
  listTelehealthSessions: async (params?: { patient_id?: string; doctor_id?: string; session_status?: string }) => {
    const query = new URLSearchParams();
    if (params?.patient_id) query.append("patient_id", params.patient_id);
    if (params?.doctor_id) query.append("doctor_id", params.doctor_id);
    if (params?.session_status) query.append("session_status", params.session_status);
    return fetchJSON<TelehealthSession[]>(`/global/telehealth/sessions?${query.toString()}`);
  },

  getTelehealthSession: async (sessionId: string) => {
    return fetchJSON<TelehealthSession>(`/global/telehealth/sessions/${sessionId}`);
  },

  scheduleTelehealthSession: async (data: Partial<TelehealthSession>) => {
    return fetchJSON<TelehealthSession>("/global/telehealth/sessions/schedule", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateTelehealthSession: async (sessionId: string, data: { session_status?: string; consultation_notes?: string; recording_url?: string }) => {
    return fetchJSON<TelehealthSession>(`/global/telehealth/sessions/${sessionId}/update`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 5. Wearables & Remote Patient Monitoring (RPM)
  ingestWearableObservation: async (data: Partial<WearableObservation>) => {
    return fetchJSON<WearableObservation>("/global/wearables/observations/ingest", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listWearableObservations: async (patientId: string, metricType?: string, limit: number = 100) => {
    const query = new URLSearchParams({ limit: String(limit) });
    if (metricType) query.append("metric_type", metricType);
    return fetchJSON<WearableObservation[]>(`/global/wearables/observations/${patientId}?${query.toString()}`);
  },

  getWearableStreams: async (patientId?: string) => {
    const query = new URLSearchParams();
    if (patientId) query.append("patient_id", patientId);
    return fetchJSON<WearableObservation[]>(`/global/wearables/streams?${query.toString()}`);
  },

  // 6. Global Payer Network & Multi-Country Claims
  listPayerClaims: async (params?: { patient_id?: string; country_code?: string; adjudication_status?: string }) => {
    const query = new URLSearchParams();
    if (params?.patient_id) query.append("patient_id", params.patient_id);
    if (params?.country_code) query.append("country_code", params.country_code);
    if (params?.adjudication_status) query.append("adjudication_status", params.adjudication_status);
    return fetchJSON<GlobalPayerClaim[]>(`/global/payer/claims?${query.toString()}`);
  },

  submitPayerClaim: async (data: Partial<GlobalPayerClaim>) => {
    return fetchJSON<GlobalPayerClaim>("/global/payer/claims/submit", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  adjudicatePayerClaim: async (claimId: string, data: { status: string; approved_amount: number; adjudication_notes: string }) => {
    return fetchJSON<GlobalPayerClaim>(`/global/payer/claims/${claimId}/adjudicate`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 7. Research Cohorts & IRB Governance
  listResearchCohorts: async (params?: { lead_institution?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.lead_institution) query.append("lead_institution", params.lead_institution);
    if (params?.status) query.append("status", params.status);
    return fetchJSON<ResearchCohort[]>(`/global/research/cohorts?${query.toString()}`);
  },

  getResearchCohort: async (cohortId: string) => {
    return fetchJSON<ResearchCohort>(`/global/research/cohorts/${cohortId}`);
  },

  createResearchCohort: async (data: Partial<ResearchCohort>) => {
    return fetchJSON<ResearchCohort>("/global/research/cohorts/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 8. Multi-Language Localization
  getLocalizationDictionary: async (languageCode: string, category?: string) => {
    const query = new URLSearchParams();
    if (category) query.append("category", category);
    return fetchJSON<Record<string, string>>(`/global/localization/dictionary/${languageCode}?${query.toString()}`);
  },

  upsertLocalizationEntry: async (languageCode: string, resourceKey: string, resourceValue: string, category: string = "COMMON") => {
    return fetchJSON<any>("/global/localization/entries/upsert", {
      method: "POST",
      body: JSON.stringify({
        language_code: languageCode,
        resource_key: resourceKey,
        resource_value: resourceValue,
        category,
      }),
    });
  },

  // 9. Master Global Telemetry
  getGlobalTelemetry: async () => {
    return fetchJSON<GlobalPlatformTelemetry>("/global/telemetry");
  },
};
