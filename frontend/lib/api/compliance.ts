/**
 * OH-ID India Healthcare Compliance & Regulatory Governance API SDK
 * =================================================================
 * Implements client bindings for:
 * 1. Statutory Hospital Licenses & Registrations (Tamil Nadu CEA, Pharmacy, AERB, Fire Safety, TNPCB, NABH/NABL)
 * 2. ABDM National Health Stack (HFR Facility Registry, HPR Doctor/Practitioner Registry, M1-M3 Milestones)
 * 3. Electronic Consent Artifacts & Purpose-Bound Cross-Hospital Sharing
 * 4. DPDP Act Privacy Governance & Patient Grievance Redressal
 * 5. Statutory Inspection Dossier & Regulatory Export
 */

import { fetchJSON } from "./client";

export type LicenseCategory =
  | "CEA_REGISTRATION"
  | "PHARMACY_20B_21B"
  | "FIRE_SAFETY_NOC"
  | "AERB_XRAY_CT"
  | "TNPCB_BIOMEDICAL_WASTE"
  | "NABH_ACCREDITATION"
  | "NABL_LAB"
  | "PNDT_ULTRASOUND"
  | "BLOOD_BANK_LICENSE"
  | "OTHER";

export type LicenseStatus = "VALID" | "EXPIRING_SOON" | "EXPIRED" | "UNDER_RENEWAL";

export interface StatutoryLicense {
  id: string;
  hospital_id: string;
  license_category: LicenseCategory;
  title: string;
  license_number: string;
  issuing_authority: string;
  state_code: string;
  facility_branch_id?: string;
  issue_date: string;
  expiry_date: string;
  status: LicenseStatus;
  verification_status: "VERIFIED" | "PENDING_VERIFICATION" | "REJECTED";
  verified_by?: string;
  verified_at?: string;
  document_url?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface StatutoryLicensePayload {
  id?: string;
  hospital_id?: string;
  license_category: LicenseCategory;
  title: string;
  license_number: string;
  issuing_authority: string;
  state_code?: string;
  facility_branch_id?: string;
  issue_date: string;
  expiry_date: string;
  status?: LicenseStatus;
  verification_status?: string;
  verified_by?: string;
  document_url?: string;
  metadata?: Record<string, any>;
}

export interface AbdmFacilityConfig {
  facility_id: string;
  hospital_id: string;
  hfr_id: string;
  facility_name: string;
  facility_type: string;
  ownership_type: string;
  state_code?: string;
  district?: string;
  pincode?: string;
  abdm_m1_status: "ACTIVE" | "INACTIVE" | "PENDING";
  abdm_m2_status: "ACTIVE" | "INACTIVE" | "PENDING";
  abdm_m3_status: "ACTIVE" | "INACTIVE" | "PENDING";
  bridge_url?: string;
  client_id?: string;
  verification_status: string;
  verified_at?: string;
}

export interface AbdmPractitionerMapping {
  doctor_id: string;
  doctor_name: string;
  specialty?: string;
  doctor_reg_no?: string;
  hpr_mapping_id?: string;
  hpr_id?: string;
  council_registration_number: string;
  registration_council: string;
  hpr_verification_status: "VERIFIED" | "PENDING_VERIFICATION" | "UNLINKED";
  ncahp_enrolment_id?: string;
  ncahp_status_label?: string;
  verified_at?: string;
}

export interface AbhaProfile {
  patient_id: string;
  patient_name: string;
  oh_id: string;
  phone?: string;
  email?: string;
  gender?: string;
  dob?: string;
  abha_address?: string;
  abha_number?: string;
  link_status: "LINKED" | "PENDING_OTP" | "UNLINKED";
  auth_method?: "AADHAAR_OTP" | "MOBILE_OTP" | "DEMOGRAPHIC";
  kyc_status: "VERIFIED" | "PENDING" | "REJECTED";
  care_context_count?: number;
  linked_at?: string;
}

export interface ConsentArtifact {
  consent_id: string;
  patient_id: string;
  patient_name: string;
  oh_id: string;
  requester_hospital_id: string;
  requester_hospital_name: string;
  requester_doctor_id?: string;
  requester_name: string;
  provider_hospital_id?: string;
  provider_hospital_name: string;
  purpose_code: "CARETREAT" | "DSRCH" | "PATRQT" | "PUBHLTH";
  purpose_text: string;
  data_categories: string[];
  date_range_from: string;
  date_range_to: string;
  consent_status: "REQUESTED" | "GRANTED" | "DENIED" | "EXPIRED" | "REVOKED";
  granted_at?: string;
  expires_at: string;
  revoked_at?: string;
  revocation_reason?: string;
  digital_signature?: string;
  created_at: string;
}

export interface PrivacyGrievance {
  grievance_id: string;
  hospital_id: string;
  hospital_name: string;
  patient_id: string;
  patient_name: string;
  patient_mobile: string;
  oh_id?: string;
  grievance_type:
    | "DATA_CORRECTION"
    | "CONSENT_REVOCATION_DISPUTE"
    | "UNAUTHORIZED_ACCESS_REPORT"
    | "DATA_ERASURE_REQUEST"
    | "GENERAL_PRIVACY";
  description: string;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "CLOSED";
  grievance_officer_id?: string;
  grievance_officer_name?: string;
  resolution_notes?: string;
  sla_deadline: string;
  resolved_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface RegulatoryComplianceReport {
  report_id: string;
  hospital_id: string;
  hospital_name: string;
  generated_at: string;
  regulatory_framework: string;
  compliance_readiness_score: number;
  statutory_licenses: {
    total: number;
    valid: number;
    expiring_soon: number;
    expired: number;
    records: StatutoryLicense[];
  };
  abdm_integration: {
    hfr_id?: string;
    facility_type?: string;
    milestones: {
      m1_abha_creation_discovery: boolean;
      m2_hip_health_information_provider: boolean;
      m3_hiu_health_information_user: boolean;
    };
    hpr_verified_doctors: number;
    total_registered_doctors: number;
  };
  dpdp_privacy_and_consent: {
    active_consents: number;
    total_consent_artifacts: number;
    open_privacy_grievances: number;
    resolved_privacy_grievances: number;
    data_protection_officer: string;
  };
  legal_declaration: string;
}

const getHospitalId = (explicitId?: string): string => {
  if (explicitId) return explicitId;
  if (typeof window !== "undefined") {
    try {
      const ws = JSON.parse(localStorage.getItem("oh_workspace") || "{}");
      if (ws.hospital_ref_id) return ws.hospital_ref_id;
    } catch {
      // ignore
    }
  }
  return "";
};

export const complianceApi = {
  // 1. Hospital Overview & Scorecard
  getOverview: async (hospitalId?: string) => {
    return fetchJSON<any>(`/hospital/compliance/overview?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}`);
  },

  // 2. Statutory Licenses
  listLicenses: async (hospitalId?: string, category: string = "ALL", status: string = "ALL") => {
    return fetchJSON<StatutoryLicense[]>(
      `/hospital/compliance/licenses?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}&category=${encodeURIComponent(category)}&status=${encodeURIComponent(status)}`
    );
  },

  upsertLicense: async (payload: StatutoryLicensePayload) => {
    return fetchJSON<StatutoryLicense>("/hospital/compliance/licenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  verifyLicense: async (licenseId: string, verifierName: string) => {
    return fetchJSON<StatutoryLicense>(`/hospital/compliance/licenses/${encodeURIComponent(licenseId)}/verify`, {
      method: "POST",
      body: JSON.stringify({ verifier_name: verifierName }),
    });
  },

  // 3. ABDM HFR & HPR
  getAbdmConfig: async (hospitalId?: string) => {
    return fetchJSON<AbdmFacilityConfig>(`/hospital/compliance/abdm?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}`);
  },

  updateAbdmHfr: async (hospitalId?: string, payload?: Partial<AbdmFacilityConfig>) => {
    return fetchJSON<AbdmFacilityConfig>(
      `/hospital/compliance/abdm/hfr?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}`,
      {
        method: "POST",
        body: JSON.stringify(payload || {}),
      }
    );
  },

  listDoctorHprMappings: async (hospitalId?: string) => {
    return fetchJSON<AbdmPractitionerMapping[]>(
      `/hospital/compliance/abdm/practitioners?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}`
    );
  },

  syncDoctorHprMapping: async (
    doctorId: string,
    payload: {
      hpr_id?: string;
      council_registration_number: string;
      registration_council?: string;
      is_allied_health?: boolean;
      ncahp_enrolment_id?: string;
      ncahp_status_label?: string;
      hpr_verification_status?: string;
    },
    hospitalId?: string
  ) => {
    return fetchJSON<any>(
      `/hospital/compliance/abdm/practitioners/${encodeURIComponent(doctorId)}/sync?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  // 4. Hospital Consent Register
  listHospitalConsents: async (hospitalId?: string, status: string = "ALL") => {
    return fetchJSON<ConsentArtifact[]>(
      `/hospital/compliance/consents?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}&status=${encodeURIComponent(status)}`
    );
  },

  requestConsent: async (payload: {
    patient_id: string;
    requester_hospital_id?: string;
    requester_doctor_id?: string;
    requester_name?: string;
    provider_hospital_id?: string;
    provider_hospital_name?: string;
    purpose_code?: string;
    purpose_text?: string;
    data_categories?: string[];
    validity_days?: number;
  }) => {
    return fetchJSON<ConsentArtifact>("/hospital/compliance/consents/request", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // 5. Privacy Grievances
  listGrievances: async (hospitalId?: string, status: string = "ALL") => {
    return fetchJSON<PrivacyGrievance[]>(
      `/hospital/compliance/grievances?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}&status=${encodeURIComponent(status)}`
    );
  },

  resolveGrievance: async (
    grievanceId: string,
    payload: {
      grievance_officer_name?: string;
      resolution_notes: string;
      status?: string;
    }
  ) => {
    return fetchJSON<PrivacyGrievance>(
      `/hospital/compliance/grievances/${encodeURIComponent(grievanceId)}/resolve`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  // 6. Regulatory Inspection Export
  getRegulatoryExport: async (hospitalId?: string) => {
    return fetchJSON<RegulatoryComplianceReport>(
      `/hospital/compliance/reports/regulatory-export?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}`
    );
  },

  // --------------------------------------------------------------------------
  // PATIENT-FACING ABHA & CONSENT APIS
  // --------------------------------------------------------------------------
  getPatientAbha: async (patientId?: string) => {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
    const res = await fetchJSON<{ data?: any } | any>(`/me/abha${query}`);
    return res.data !== undefined ? res.data : res;
  },

  linkPatientAbha: async (
    payload: {
      abha_address: string;
      abha_number?: string;
      auth_method?: "AADHAAR_OTP" | "MOBILE_OTP" | "DEMOGRAPHIC";
    },
    patientId?: string
  ) => {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
    const res = await fetchJSON<{ data?: any } | any>(`/me/abha/link${query}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data !== undefined ? res.data : res;
  },

  unlinkPatientAbha: async (patientId?: string) => {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
    const res = await fetchJSON<{ data?: any } | any>(`/me/abha/unlink${query}`, {
      method: "POST",
    });
    return res.data !== undefined ? res.data : res;
  },

  listPatientConsents: async (status: string = "ALL", patientId?: string) => {
    const query = `?status=${encodeURIComponent(status)}${patientId ? `&patient_id=${encodeURIComponent(patientId)}` : ""}`;
    const res = await fetchJSON<{ data?: ConsentArtifact[] } | ConsentArtifact[]>(`/me/consents${query}`);
    return (Array.isArray(res) ? res : (res as any).data || []) as ConsentArtifact[];
  },

  grantConsent: async (consentId: string, digitalSignature?: string, patientId?: string) => {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
    const res = await fetchJSON<{ data?: any } | any>(`/me/consents/${encodeURIComponent(consentId)}/grant${query}`, {
      method: "POST",
      body: JSON.stringify({ digital_signature: digitalSignature }),
    });
    return res.data !== undefined ? res.data : res;
  },

  denyConsent: async (consentId: string, patientId?: string) => {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
    const res = await fetchJSON<{ data?: any } | any>(`/me/consents/${encodeURIComponent(consentId)}/deny${query}`, {
      method: "POST",
    });
    return res.data !== undefined ? res.data : res;
  },

  revokeConsent: async (consentId: string, reason?: string, patientId?: string) => {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
    const res = await fetchJSON<{ data?: any } | any>(`/me/consents/${encodeURIComponent(consentId)}/revoke${query}`, {
      method: "POST",
      body: JSON.stringify({ reason: reason || "Patient explicitly revoked consent" }),
    });
    return res.data !== undefined ? res.data : res;
  },

  lodgePatientGrievance: async (
    payload: {
      hospital_id?: string;
      grievance_type: string;
      description: string;
    },
    patientId?: string
  ) => {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
    const res = await fetchJSON<{ data?: any } | any>(`/me/privacy/grievances${query}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data !== undefined ? res.data : res;
  },

  listMyPrivacyGrievances: async (hospitalId?: string, patientId?: string) => {
    const query = `?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}${patientId ? `&patient_id=${encodeURIComponent(patientId)}` : ""}`;
    const res = await fetchJSON<{ data?: PrivacyGrievance[] } | PrivacyGrievance[]>(`/me/privacy/grievances${query}`);
    return (Array.isArray(res) ? res : (res as any).data || []) as PrivacyGrievance[];
  },
};
