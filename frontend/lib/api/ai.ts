/**
 * OH-ID Frontend API Client: Phase 6 AI-Powered Healthcare Intelligence
 * Sathus Technology Pvt Ltd
 */

import { apiClient } from "./client";
import {
  AIProvider,
  AIModel,
  AIPrompt,
  AIGovernanceTelemetry,
  DoctorPatientBrief,
  ConsultationAssistDraft,
  LongitudinalSummaryResponse,
  LabTrendAnalysisResponse,
  PatientJourneyExplainResponse,
  OperationsRootCauseResponse,
  NoShowPredictionResponse,
  QueueWaitTimePredictionResponse,
  BedOccupancyForecastResponse,
  ManagementCopilotResponse,
  SemanticSearchResponse,
  KnowledgeDocument,
  KnowledgeQueryResponse,
  AIAgentTask
} from "../types";

const getHospitalId = (override?: string): string => {
  return override?.trim() || "";
};

export const aiApi = {
  // ---------------------------------------------------------------------------
  // 1. AI Gateway & Telemetry
  // ---------------------------------------------------------------------------
  async getProviders(): Promise<AIProvider[]> {
    const res = await apiClient.get<AIProvider[]>("/ai/providers");
    return res.data || [];
  },

  async getModels(): Promise<AIModel[]> {
    const res = await apiClient.get<AIModel[]>("/ai/models");
    return res.data || [];
  },

  async getPrompts(): Promise<AIPrompt[]> {
    const res = await apiClient.get<AIPrompt[]>("/ai/prompts");
    return res.data || [];
  },

  async getTelemetry(hospitalId?: string): Promise<AIGovernanceTelemetry[]> {
    const hId = getHospitalId(hospitalId);
    const url = hId ? `/ai/telemetry?hospital_id=${encodeURIComponent(hId)}` : "/ai/telemetry";
    const res = await apiClient.get<AIGovernanceTelemetry[]>(url);
    return res.data || [];
  },

  // ---------------------------------------------------------------------------
  // 2. Doctor Clinical AI Copilot
  // ---------------------------------------------------------------------------
  async generatePatientBrief(
    patientId: string,
    chiefComplaint?: string,
    hospitalId?: string
  ): Promise<DoctorPatientBrief> {
    const res = await apiClient.post<DoctorPatientBrief>(`/ai/clinical/patient-brief/${patientId}`, {
      hospital_id: getHospitalId(hospitalId),
      chief_complaint: chiefComplaint || "Scheduled OPD Review"
    });
    return res.data;
  },

  async assistConsultationDraft(
    patientId: string,
    rawNotes: string,
    vitals?: Record<string, any>,
    hospitalId?: string
  ): Promise<ConsultationAssistDraft> {
    const res = await apiClient.post<ConsultationAssistDraft>("/ai/clinical/consultation-assist", {
      patient_id: patientId,
      hospital_id: getHospitalId(hospitalId),
      raw_notes: rawNotes,
      vitals
    });
    return res.data;
  },

  async getLongitudinalSummary(
    patientId: string,
    hospitalId?: string
  ): Promise<LongitudinalSummaryResponse> {
    const res = await apiClient.get<LongitudinalSummaryResponse>(
      `/ai/clinical/longitudinal-summary/${patientId}?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}`
    );
    return res.data;
  },

  async getLabTrends(
    patientId: string,
    analyte: string = "Hemoglobin",
    hospitalId?: string
  ): Promise<LabTrendAnalysisResponse> {
    const res = await apiClient.get<LabTrendAnalysisResponse>(
      `/ai/clinical/lab-trends/${patientId}?analyte=${encodeURIComponent(analyte)}&hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}`
    );
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // 3. Patient AI Health Journey Assistant
  // ---------------------------------------------------------------------------
  async explainHealthTimeline(query: string, patientId?: string): Promise<PatientJourneyExplainResponse> {
    const res = await apiClient.post<PatientJourneyExplainResponse>("/ai/patient/explain-timeline", {
      query,
      patient_id: patientId
    });
    return res.data;
  },

  async explainPrescription(prescriptionId: string, patientId?: string): Promise<any> {
    const res = await apiClient.post<any>("/ai/patient/explain-prescription", {
      prescription_id: prescriptionId,
      patient_id: patientId
    });
    return res.data;
  },

  async explainLabReport(reportId: string): Promise<any> {
    const res = await apiClient.get<any>(`/ai/patient/explain-report/${reportId}`);
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // 4. Hospital Operations Intelligence & Predictive Flow
  // ---------------------------------------------------------------------------
  async getOperationsInsights(hospitalId?: string): Promise<OperationsRootCauseResponse> {
    const res = await apiClient.get<OperationsRootCauseResponse>(
      `/ai/operations/insights?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}`
    );
    return res.data;
  },

  async predictNoShow(appointmentId: string, hospitalId?: string): Promise<NoShowPredictionResponse> {
    const res = await apiClient.post<NoShowPredictionResponse>("/ai/operations/predict-no-show", {
      appointment_id: appointmentId,
      hospital_id: getHospitalId(hospitalId)
    });
    return res.data;
  },

  async predictWaitTime(
    hospitalId?: string,
    queuePosition: number = 5,
    doctorId?: string,
    departmentId?: string
  ): Promise<QueueWaitTimePredictionResponse> {
    let url = `/ai/operations/predict-wait-time?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}&queue_position=${queuePosition}`;
    if (doctorId) url += `&doctor_id=${encodeURIComponent(doctorId)}`;
    if (departmentId) url += `&department_id=${encodeURIComponent(departmentId)}`;
    const res = await apiClient.get<QueueWaitTimePredictionResponse>(url);
    return res.data;
  },

  async forecastBedOccupancy(
    hospitalId?: string,
    horizonHours: number = 24
  ): Promise<BedOccupancyForecastResponse> {
    const res = await apiClient.get<BedOccupancyForecastResponse>(
      `/ai/operations/forecast-occupancy?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}&horizon_hours=${horizonHours}`
    );
    return res.data;
  },

  async queryManagementCopilot(
    query: string,
    hospitalId?: string
  ): Promise<ManagementCopilotResponse> {
    const res = await apiClient.post<ManagementCopilotResponse>("/ai/operations/management-copilot", {
      query,
      hospital_id: getHospitalId(hospitalId)
    });
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // 5. Semantic Search
  // ---------------------------------------------------------------------------
  async searchSemantic(query: string, hospitalId?: string): Promise<SemanticSearchResponse> {
    const res = await apiClient.get<SemanticSearchResponse>(
      `/ai/search/semantic?q=${encodeURIComponent(query)}&hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}`
    );
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // 6. Enterprise Healthcare RAG & Knowledge Base
  // ---------------------------------------------------------------------------
  async listKnowledgeDocuments(hospitalId?: string): Promise<KnowledgeDocument[]> {
    const res = await apiClient.get<KnowledgeDocument[]>(
      `/ai/knowledge/documents?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}`
    );
    return res.data || [];
  },

  async ingestKnowledgeDocument(
    title: string,
    category: string,
    content: string,
    hospitalId?: string
  ): Promise<any> {
    const res = await apiClient.post<any>("/ai/knowledge/documents", {
      title,
      category,
      content,
      hospital_id: getHospitalId(hospitalId)
    });
    return res.data;
  },

  async queryKnowledgeBase(
    query: string,
    hospitalId?: string
  ): Promise<KnowledgeQueryResponse> {
    const res = await apiClient.post<KnowledgeQueryResponse>("/ai/knowledge/query", {
      query,
      hospital_id: getHospitalId(hospitalId)
    });
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // 7. Controlled AI Workflow Agents
  // ---------------------------------------------------------------------------
  async listAgentTasks(hospitalId?: string, status?: string): Promise<AIAgentTask[]> {
    let url = `/ai/agents/tasks?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    const res = await apiClient.get<AIAgentTask[]>(url);
    return res.data || [];
  },

  async approveAgentTask(taskId: string, hospitalId?: string): Promise<any> {
    const res = await apiClient.post<any>(`/ai/agents/tasks/${taskId}/approve?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}`, {});
    return res.data;
  },

  async rejectAgentTask(taskId: string, reason?: string, hospitalId?: string): Promise<any> {
    const res = await apiClient.post<any>(`/ai/agents/tasks/${taskId}/reject?hospital_id=${encodeURIComponent(getHospitalId(hospitalId))}`, {
      reason: reason || "Rejected"
    });
    return res.data;
  },

  async triggerFollowupAgent(hospitalId?: string): Promise<any> {
    const res = await apiClient.post<any>("/ai/agents/trigger/followup", { hospital_id: getHospitalId(hospitalId) });
    return res.data;
  },

  async triggerOperationsAgent(hospitalId?: string): Promise<any> {
    const res = await apiClient.post<any>("/ai/agents/trigger/operations", { hospital_id: getHospitalId(hospitalId) });
    return res.data;
  }
};
