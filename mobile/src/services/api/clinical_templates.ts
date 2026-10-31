/**
 * ONEHEALTH ID (OH-ID) Mobile — Clinical Document Templates API Service
 * Sathus Technology Pvt Ltd
 *
 * Implements 20-template catalogue operations (10 Rx + 10 Clinical Reports):
 * - Super Admin global catalogue management & publishing
 * - Hospital Admin dual template selection & branding configuration
 * - Doctor active template hydration for clinical authoring
 * - Patient and clinician immutable document presentation
 */

import { apiClient } from "./client";

export interface ClinicalDocumentTemplate {
  id: string;
  document_type: "PRESCRIPTION" | "CLINICAL_REPORT";
  name: string;
  description: string;
  category: string;
  version: number;
  layout_config: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  usage_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface HospitalDocumentTemplateSettings {
  hospital_id: string;
  hospital_name?: string;
  rx_template_id: string;
  rx_template_name?: string;
  rx_template_version?: number;
  rx_template_layout?: Record<string, any>;
  clinical_report_template_id: string;
  clinical_report_template_name?: string;
  clinical_report_template_version?: number;
  clinical_report_template_layout?: Record<string, any>;
  custom_header_text?: string;
  custom_footer_notes?: string;
  show_hospital_logo: boolean;
}

export interface UpdateHospitalTemplateSettingsPayload {
  hospital_id?: string;
  rx_template_id?: string;
  clinical_report_template_id?: string;
  custom_header_text?: string;
  custom_footer_notes?: string;
  show_hospital_logo?: boolean;
}

export interface ConsultationReportDetail {
  id: string;
  appointment_id?: string | null;
  patient_id: string;
  patient_name: string;
  onehealth_id: string;
  patient_age?: number;
  patient_gender?: string;
  patient_blood_group?: string;
  patient_phone?: string;
  patient_dob?: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty?: string;
  doctor_registration?: string;
  doctor_registration_authority?: string;
  doctor_qualification?: string;
  hospital_id: string;
  hospital_name: string;
  hospital_code?: string;
  hospital_address?: string;
  hospital_phone?: string;
  hospital_email?: string;
  symptoms?: string;
  diagnosis?: string;
  clinical_notes?: string;
  vitals?: Record<string, any>;
  signed_by?: string;
  signed_at?: string;
  digital_signature_hash?: string;
  created_at?: string;
  template_id: string;
  template_version: number;
  template_name: string;
  template_layout_config: Record<string, any>;
  linked_prescription_id?: string | null;
  linked_prescription_status?: string | null;
}

export const clinicalTemplatesApi = {
  /**
   * Super Admin: List all templates (or filtered by PRESCRIPTION / CLINICAL_REPORT)
   */
  async listTemplates(documentType?: "PRESCRIPTION" | "CLINICAL_REPORT"): Promise<ClinicalDocumentTemplate[]> {
    const qs = documentType ? `?document_type=${encodeURIComponent(documentType)}` : "";
    const res = await apiClient.get<ClinicalDocumentTemplate[]>(`/api/v1/super-admin/clinical-templates${qs}`);
    return res.data;
  },

  /**
   * Super Admin: Fetch template by ID
   */
  async getTemplateById(templateId: string): Promise<ClinicalDocumentTemplate> {
    const res = await apiClient.get<ClinicalDocumentTemplate>(`/api/v1/super-admin/clinical-templates/${templateId}`);
    return res.data;
  },

  /**
   * Super Admin: Toggle template active/inactive status
   */
  async toggleStatus(templateId: string, isActive: boolean): Promise<{ id: string; is_active: boolean }> {
    const res = await apiClient.patch(`/api/v1/super-admin/clinical-templates/${templateId}/status`, {
      is_active: isActive
    });
    return res.data;
  },

  /**
   * Super Admin: Set template as system default
   */
  async setDefault(templateId: string): Promise<{ id: string; is_default: boolean }> {
    const res = await apiClient.post(`/api/v1/super-admin/clinical-templates/${templateId}/set-default`);
    return res.data;
  },

  /**
   * Hospital Admin: Get facility's selected templates & branding
   */
  async getHospitalSettings(hospitalId?: string): Promise<HospitalDocumentTemplateSettings> {
    const qs = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : "";
    const res = await apiClient.get<HospitalDocumentTemplateSettings>(`/api/v1/hospital/document-template-settings${qs}`);
    return res.data;
  },

  /**
   * Hospital Admin: Update facility template selections
   */
  async updateHospitalSettings(payload: UpdateHospitalTemplateSettingsPayload): Promise<HospitalDocumentTemplateSettings> {
    const { hospital_id, ...body } = payload;
    const qs = hospital_id ? `?hospital_id=${encodeURIComponent(hospital_id)}` : "";
    const res = await apiClient.put<HospitalDocumentTemplateSettings>(
      `/api/v1/hospital/document-template-settings${qs}`,
      body
    );
    return res.data;
  },

  /**
   * Doctor: Hydrate active hospital templates for clinical workspace
   */
  async getDoctorHospitalTemplates(hospitalId?: string): Promise<HospitalDocumentTemplateSettings> {
    const qs = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : "";
    const res = await apiClient.get<HospitalDocumentTemplateSettings>(`/api/v1/doctor/hospital-document-templates${qs}`);
    return res.data;
  },

  /**
   * Patient & Clinician: Fetch finalised consultation report
   */
  async getConsultationReport(consultationId: string): Promise<ConsultationReportDetail> {
    const res = await apiClient.get<ConsultationReportDetail>(`/api/v1/consultations/${consultationId}/report`);
    return res.data;
  }
};
