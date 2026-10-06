import { fetchJSON } from "./client";

export interface LabTestParameter {
  parameter_name: string;
  category?: string;
  observed_value: string | number | null;
  unit?: string;
  reference_range?: string;
  reference_min?: number | null;
  reference_max?: number | null;
  is_abnormal?: boolean;
  abnormality_flag?: "NORMAL" | "HIGH" | "LOW" | "ABNORMAL" | "CRITICAL";
  is_critical?: boolean;
  test_method?: string;
  clinical_notes?: string;
}

export interface LaboratoryInfo {
  name: string;
  branch?: string;
  address?: string;
  phone?: string;
  email?: string;
  accreditation?: string;
}

export interface DoctorInfo {
  id?: string;
  name: string;
  specialty?: string;
  qualification?: string;
}

export interface PathologistInfo {
  name: string;
  qualification?: string;
  registration_number?: string;
}

export interface DigitalSignatureInfo {
  is_signed: boolean;
  signature_hash?: string;
  verification_token?: string;
  signed_at?: string;
}

export interface LabReport {
  id: string;
  order_number: string;
  patient_id: string;
  patient_name: string;
  onehealth_id?: string;
  patient_age?: number;
  patient_gender?: string;
  patient_dob?: string;
  patient_blood_group?: string;
  test_id?: string;
  test_name: string;
  test_code?: string;
  test_category?: string;
  normal_range?: string;
  status: "FINAL" | "CORRECTED" | "PROCESSING" | "PENDING" | "CANCELLED" | string;
  db_status?: string;
  status_display: string;
  is_abnormal: boolean;
  priority?: string;
  sample_type?: string;
  sample_id?: string;
  ordered_at?: string;
  collected_at?: string;
  received_at?: string;
  reported_at?: string;
  completed_at?: string;
  laboratory: LaboratoryInfo;
  hospital_id?: string;
  hospital_name?: string;
  laboratory_name?: string;
  doctor?: DoctorInfo | null;
  pathologist: PathologistInfo;
  digital_signature: DigitalSignatureInfo;
  verification_token: string;
  doctor_notes?: string;
  patient_summary?: string;
  results_count: number;
  out_of_range_count: number;
  normal_count: number;
  critical_count: number;
  results_data: LabTestParameter[];
  version: number;
  is_corrected: boolean;
  correction_reason?: string;
  superseded_by_id?: string;
  parent_report_id?: string;
  attachment_url?: string;
  attachment_type?: string;
  is_patient_visible?: boolean;
}

export interface LabParameterTrendPoint {
  report_id: string;
  order_number?: string;
  test_name: string;
  parameter_name: string;
  category?: string;
  observed_value: string | number;
  numeric_value: number | null;
  unit?: string;
  reference_range?: string;
  reference_min?: number | null;
  reference_max?: number | null;
  is_abnormal: boolean;
  abnormality_flag: string;
  laboratory_name: string;
  reported_at: string;
}

export interface LabReportShare {
  id: string;
  lab_order_id: string;
  patient_id: string;
  share_token: string;
  share_url: string;
  recipient_name?: string;
  recipient_contact?: string;
  access_level: "VIEW_ONLY" | "VIEW_AND_DOWNLOAD" | string;
  expires_at: string;
  revoked_at?: string;
  created_at: string;
  is_active: boolean;
}

export interface LabReportPublicVerification {
  is_valid: boolean;
  is_verified: boolean;
  report_id: string;
  order_number: string;
  test_name: string;
  test_category?: string;
  status: string;
  status_display: string;
  version: number;
  is_corrected: boolean;
  report_date: string;
  laboratory_name: string;
  laboratory_branch?: string;
  laboratory_accreditation?: string;
  pathologist: PathologistInfo;
  digital_signature: DigitalSignatureInfo;
  verification_note: string;
}

export interface SharedLabReportResponse {
  report: LabReport;
  share_metadata: {
    recipient_name?: string;
    access_level?: string;
    expires_at?: string;
  };
  is_valid_share: boolean;
  reason?: string;
}

export const labReportsAPI = {
  listMyLabReports: async (params?: {
    status?: string;
    test_type?: string;
    hospital_id?: string;
    search?: string;
    is_abnormal?: boolean;
    patient_id?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status && params.status !== "ALL") q.set("status", params.status);
    if (params?.test_type && params.test_type !== "ALL") q.set("test_type", params.test_type);
    if (params?.hospital_id && params.hospital_id !== "ALL") q.set("hospital_id", params.hospital_id);
    if (params?.search) q.set("search", params.search);
    if (params?.is_abnormal !== undefined) q.set("is_abnormal", String(params.is_abnormal));
    if (params?.patient_id) q.set("patient_id", params.patient_id);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: LabReport[]; meta?: any }>(
      `/me/lab-reports${qs ? `?${qs}` : ""}`
    );
  },

  getMyLabReportDetail: async (reportId: string, patientId?: string) => {
    const q = new URLSearchParams();
    if (patientId) q.set("patient_id", patientId);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: LabReport }>(
      `/me/lab-reports/${reportId}${qs ? `?${qs}` : ""}`
    );
  },

  getMyLabParameterTrends: async (parameterName: string, patientId?: string) => {
    const q = new URLSearchParams();
    q.set("parameter_name", parameterName);
    if (patientId) q.set("patient_id", patientId);
    return fetchJSON<{ success: boolean; data: LabParameterTrendPoint[]; meta?: any }>(
      `/me/lab-reports/trends?${q.toString()}`
    );
  },

  getMyLabReportPdf: async (reportId: string) => {
    return fetchJSON<{
      success: boolean;
      data: {
        report_id: string;
        filename: string;
        download_url: string;
        report: LabReport;
      };
    }>(`/me/lab-reports/${reportId}/pdf`);
  },

  createShare: async (
    reportId: string,
    payload: {
      recipient_name?: string;
      recipient_contact?: string;
      access_level?: "VIEW_ONLY" | "VIEW_AND_DOWNLOAD" | string;
      duration_hours?: number;
    }
  ) => {
    return fetchJSON<{ success: boolean; data: LabReportShare; message: string }>(
      `/me/lab-reports/${reportId}/share`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  listShares: async (reportId: string) => {
    return fetchJSON<{ success: boolean; data: LabReportShare[] }>(
      `/me/lab-reports/${reportId}/shares`
    );
  },

  revokeShare: async (shareId: string, reason?: string) => {
    return fetchJSON<{ success: boolean; data: LabReportShare; message: string }>(
      `/me/lab-report-shares/${shareId}/revoke`,
      {
        method: "POST",
        body: JSON.stringify({ action: "SHARE_REVOKED", details: { reason } }),
      }
    );
  },

  recordAudit: async (reportId: string, action: string, metadata?: any) => {
    return fetchJSON<{ success: boolean; message: string }>(
      `/me/lab-reports/${reportId}/audit`,
      {
        method: "POST",
        body: JSON.stringify({ action, metadata }),
      }
    );
  },

  // Public Verification & Shared Links
  getPublicVerification: async (token: string) => {
    return fetchJSON<{ success: boolean; data: LabReportPublicVerification; message: string }>(
      `/public/verify/lab-report/${token}`
    );
  },

  getPublicShare: async (token: string) => {
    return fetchJSON<{ success: boolean; data: SharedLabReportResponse; message?: string; error?: any }>(
      `/public/share/lab-report/${token}`
    );
  },
};
