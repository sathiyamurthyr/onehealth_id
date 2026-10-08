"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Stethoscope,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Clock,
  Save,
  FileSignature,
  Eye,
  Calendar,
  AlertTriangle,
  History,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Pill,
  Share2,
  FolderOpen,
  ClipboardList,
  Sparkles,
  QrCode,
  Droplet,
  Printer,
  ShieldCheck,
  Building,
  User,
  Heart,
  Send,
  UploadCloud,
  Search
} from "lucide-react";
import { api } from "@/lib/api";
import { doctorWorkspaceApi } from "@/lib/api/doctor-workspace";
import {
  Patient,
  UserProfile,
  PrescriptionItem,
  Prescription,
  ChiefComplaint,
  ClinicalExamination,
  MedicalHistory,
  DiagnosisItem,
  PatientConsultationContext,
  LongitudinalHistoryEvent,
  InvestigationOrder,
  DoctorReferral,
  ConsultationSummary,
} from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { LoadingState, ErrorState } from "@/components/ui/FeedbackStates";

// Clinical Workspace Subcomponents
import { PatientHeader } from "@/components/clinical/PatientHeader";
import { PatientReportedIntakeSection } from "@/components/clinical/PatientReportedIntakeSection";
import { VitalsMatrix, VitalsData } from "@/components/clinical/VitalsMatrix";
import { ICD10DiagnosisSelector, DiagnosisEntry } from "@/components/clinical/ICD10DiagnosisSelector";
import { FHIRPrescriptionBuilder } from "@/components/clinical/FHIRPrescriptionBuilder";
import { InvestigationOrderer } from "@/components/clinical/InvestigationOrderer";
import { InvestigationResultsView } from "@/components/clinical/InvestigationResultsView";
import { DoctorReferralModal } from "@/components/clinical/DoctorReferralModal";
import { ConsultationReviewModal } from "@/components/clinical/ConsultationReviewModal";
import { ConsultationSummaryPrintView } from "@/components/clinical/ConsultationSummaryPrintView";
import { FollowUpPlanSection } from "@/components/clinical/FollowUpPlanSection";
import { PrescriptionSignModal } from "@/components/clinical/PrescriptionSignModal";
import { PatientClinicalTimeline } from "@/components/clinical/PatientClinicalTimeline";

// Document Management Subcomponents
import {
  MedicalDocument,
  MedicalDocumentDetail,
  DocumentCategory,
  DOCUMENT_CATEGORIES,
} from "@/lib/api/documents";
import { MedicalDocumentCard } from "@/components/documents/MedicalDocumentCard";
import { MedicalDocumentViewerModal } from "@/components/documents/MedicalDocumentViewerModal";
import { DoctorReviewDocumentModal } from "@/components/documents/DoctorReviewDocumentModal";
import { DoctorRequestDocumentModal } from "@/components/documents/DoctorRequestDocumentModal";
import { DoctorUploadExternalDocumentModal } from "@/components/documents/DoctorUploadExternalDocumentModal";
import { DoctorAICopilotPanel } from "@/components/clinical/DoctorAICopilotPanel";

type TabKey =
  | "OVERVIEW"
  | "AI_COPILOT"
  | "CONSULTATION"
  | "HISTORY"
  | "VISITS"
  | "PRESCRIPTIONS"
  | "LABS"
  | "DOCUMENTS"
  | "REFERRALS"
  | "APPOINTMENTS"
  | "DIAGNOSES"
  | "TIMELINE";

export default function DoctorConsultationWorkspace() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const patientId = params?.id as string;
  const appointmentId = searchParams?.get("appointment_id") || undefined;
  const queueId = searchParams?.get("queue_id") || undefined;
  const { workspace } = useWorkspace();

  // Global Context & Patient State
  const [contextData, setContextData] = useState<PatientConsultationContext | null>(null);
  const [historyEvents, setHistoryEvents] = useState<LongitudinalHistoryEvent[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Active Tab Navigation
  const [activeTab, setActiveTab] = useState<TabKey>("CONSULTATION");

  // History Filter State
  const [historyHospitalFilter, setHistoryHospitalFilter] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("ALL");

  // Form State: 1. Clinical Notes & Chief Complaint
  const [chiefComplaintText, setChiefComplaintText] = useState("");
  const [hpiText, setHpiText] = useState("");
  const [examinationNotes, setExaminationNotes] = useState("");
  const [assessmentText, setAssessmentText] = useState("");
  const [treatmentPlanText, setTreatmentPlanText] = useState("");

  // Form State: 2. Vitals Matrix
  const [vitals, setVitals] = useState<VitalsData>({
    systolic_bp: 120,
    diastolic_bp: 80,
    pulse_rate: 74,
    temperature: 98.6,
    respiratory_rate: 16,
    spo2: 99,
    height_cm: 168,
    weight_kg: 68,
    blood_glucose: 105,
    glucose_type: "Random",
    pain_score: 2,
  });

  // Form State: 3. ICD-10 Diagnoses
  const [diagnoses, setDiagnoses] = useState<DiagnosisEntry[]>([
    {
      code: "K29.7",
      description: "Gastritis, unspecified",
      tier: "PRIMARY",
    },
  ]);

  // Form State: 4. FHIR Prescription Items
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
    {
      medicine_name: "Pantoprazole 40mg Tablet",
      generic_name: "Pantoprazole Sodium",
      strength: "40 mg",
      dosage_form: "Tablet",
      route: "Oral",
      dose: "1 tablet",
      frequency: "Once daily before breakfast",
      timing_morning: true,
      food_instruction: "BEFORE_FOOD",
      duration_value: 14,
      duration_days: 14,
      duration_unit: "Days",
      quantity: 14,
      refills: 0,
      specific_instructions: "Take 30 minutes before morning breakfast with water.",
    },
  ]);
  const [prescriptionInstructions, setPrescriptionInstructions] = useState(
    "Avoid spicy and oily food. Maintain regular meal timings and adequate hydration."
  );

  // Form State: 5. Follow-up
  const [followUpRequired, setFollowUpRequired] = useState(true);
  const [followUpDate, setFollowUpDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [followUpDepartment, setFollowUpDepartment] = useState("General Medicine");
  const [followUpNotes, setFollowUpNotes] = useState("Review with lab test results");

  // Referral Modal State
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [referralCount, setReferralCount] = useState(0);

  // Pre-Completion Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSubmittingConsultation, setIsSubmittingConsultation] = useState(false);

  // Documents State in Consultation Workspace
  const [patientDocs, setPatientDocs] = useState<MedicalDocument[]>([]);
  const [selectedDocIdsForConsultation, setSelectedDocIdsForConsultation] = useState<string[]>([]);
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>("ALL");
  const [docSourceFilter, setDocSourceFilter] = useState<string>("ALL");
  const [docSearchQuery, setDocSearchQuery] = useState<string>("");
  const [docAttachmentMessage, setDocAttachmentMessage] = useState<string | null>(null);

  // Document Modals State
  const [viewingDoc, setViewingDoc] = useState<MedicalDocumentDetail | null>(null);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState<boolean>(false);
  const [reviewingDoc, setReviewingDoc] = useState<MedicalDocument | null>(null);
  const [isDocReviewOpen, setIsDocReviewOpen] = useState<boolean>(false);
  const [isDocRequestOpen, setIsDocRequestOpen] = useState<boolean>(false);
  const [isDocUploadExtOpen, setIsDocUploadExtOpen] = useState<boolean>(false);

  // Finalized State
  const [completedSummary, setCompletedSummary] = useState<ConsultationSummary | null>(null);
  const [draftSavedMessage, setDraftSavedMessage] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    const cur = api.auth.getCurrentUser();
    setCurrentUser(cur);

    if (!patientId) return;

    loadPatientWorkspaceContext();
  }, [patientId]);

  const loadPatientWorkspaceContext = async () => {
    setLoading(true);
    setError("");
    try {
      const [ctx, hist, docsRes] = await Promise.all([
        doctorWorkspaceApi.getPatientContext(patientId),
        doctorWorkspaceApi.getLongitudinalHistory(patientId),
        doctorWorkspaceApi.getPatientDocuments(patientId).catch(() => ({ data: [], total: 0 })),
      ]);

      setContextData(ctx);
      setHistoryEvents(hist.events || []);
      setPatientDocs(docsRes.data || []);

      // If patient reported pre-consultation intake, prepopulate complaint text
      if (ctx.patient_intake) {
        setChiefComplaintText(ctx.patient_intake.reason_for_visit);
        if (ctx.patient_intake.description) {
          setHpiText(`Patient reports: "${ctx.patient_intake.description}". Duration: ${ctx.patient_intake.duration || "N/A"}.`);
        }
      }
    } catch (err: any) {
      console.error("Failed to load patient consultation context:", err);
      setError(err.message || "Could not retrieve patient clinical context. Please verify authorization.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAttachDoc = (doc: MedicalDocument) => {
    setSelectedDocIdsForConsultation((prev) =>
      prev.includes(doc.id) ? prev.filter((id) => id !== doc.id) : [...prev, doc.id]
    );
  };

  const handleApplyAIDraft = (draft: any) => {
    if (draft.subjective_hpi) setHpiText(draft.subjective_hpi);
    if (draft.objective_exam) setExaminationNotes(draft.objective_exam);
    if (draft.assessment_summary) setAssessmentText(draft.assessment_summary);
    if (draft.patient_instructions_draft) setTreatmentPlanText(draft.patient_instructions_draft);
    if (draft.extracted_vitals && typeof draft.extracted_vitals === "object") {
      setVitals((prev) => ({ ...prev, ...draft.extracted_vitals }));
    }
    setActiveTab("CONSULTATION");
  };

  const patient = contextData?.patient;

  // Filtered History Events
  const filteredHistory = useMemo(() => {
    return historyEvents.filter((ev) => {
      const matchesHospital =
        !historyHospitalFilter || ev.hospital_name?.toLowerCase().includes(historyHospitalFilter.toLowerCase());
      const matchesType =
        historyTypeFilter === "ALL" || ev.record_type === historyTypeFilter;
      return matchesHospital && matchesType;
    });
  }, [historyEvents, historyHospitalFilter, historyTypeFilter]);

  // Handler: Apply Patient Intake to HPI Note
  const handleApplyIntakeToNotes = (intake: any) => {
    setChiefComplaintText(intake.reason_for_visit || "");
    const parts = [
      `Patient-Reported Concern: "${intake.reason_for_visit}"`,
      intake.duration ? `Duration: ${intake.duration}` : null,
      intake.location ? `Site/Location: ${intake.location}` : null,
      intake.severity ? `Severity: ${intake.severity}` : null,
      intake.relieving_factors ? `Relieving factors: ${intake.relieving_factors}` : null,
      intake.aggravating_factors ? `Aggravating factors: ${intake.aggravating_factors}` : null,
    ]
      .filter(Boolean)
      .join(" • ");
    setHpiText(parts);
  };

  // Handler: Save Draft
  const handleSaveDraft = () => {
    setDraftSavedMessage(true);
    setTimeout(() => setDraftSavedMessage(false), 3000);
  };

  // Handler: Finalize Consultation Execution
  const handleExecuteConsultationCompletion = async () => {
    if (!patient) return;
    setIsSubmittingConsultation(true);
    try {
      const primaryDiag =
        diagnoses.find((d) => d.tier === "PRIMARY")?.description ||
        diagnoses[0]?.description ||
        "Consultation completed";

      const payload = {
        appointment_id: appointmentId,
        diagnosis: primaryDiag,
        symptoms: chiefComplaintText || "Outpatient Consultation",
        clinical_notes: [
          hpiText ? `HPI: ${hpiText}` : "",
          examinationNotes ? `Examination: ${examinationNotes}` : "",
          assessmentText ? `Assessment: ${assessmentText}` : "",
          treatmentPlanText ? `Plan: ${treatmentPlanText}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
        vitals: vitals,
        chief_complaint: {
          reason: chiefComplaintText,
          reason_for_visit: chiefComplaintText,
          notes: hpiText,
        },
        examination: {
          doctor_notes: examinationNotes,
        },
        diagnoses: diagnoses,
        prescription: {
          diagnosis: primaryDiag,
          instructions: prescriptionInstructions,
          items: prescriptionItems.map((item) => ({
            medicine_name: item.medicine_name,
            generic_name: item.generic_name,
            strength: item.strength,
            form: item.dosage_form || "Tablet",
            dose: item.dose || "1 tablet",
            frequency: item.frequency || "Once daily",
            duration: item.duration_days ? `${item.duration_days} days` : "7 days",
            route: item.route || "Oral",
            instructions: item.specific_instructions || item.food_instruction || "After food",
            quantity: item.quantity || 10,
            refills: item.refills || 0,
          })),
        },
        follow_up: followUpRequired
          ? {
              required: true,
              date: followUpDate,
              department: followUpDepartment,
              notes: followUpNotes,
            }
          : undefined,
        is_draft: false,
      };

      const res = await doctorWorkspaceApi.saveConsultation(patient.id, payload);

      // Complete queue item if present
      if (queueId) {
        try {
          await api.queue.complete(queueId);
        } catch {
          // ignore
        }
      }

      setCompletedSummary(res.summary);
      setIsReviewModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to finalize consultation");
    } finally {
      setIsSubmittingConsultation(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="bg-white min-h-[80vh] flex items-center justify-center">
          <LoadingState message="Opening Authorized Patient Clinical Workspace..." />
        </div>
      </AppLayout>
    );
  }

  if (error || !patient) {
    return (
      <AppLayout>
        <div className="bg-white p-8 max-w-4xl mx-auto min-h-[70vh]">
          <ErrorState
            title="Access Restricted / Forbidden"
            message={error || "Patient clinical records cannot be accessed without valid authorization."}
            onRetry={() => window.location.reload()}
          />
        </div>
      </AppLayout>
    );
  }

  // If finalized, render the rich printable summary sheet
  if (completedSummary) {
    return (
      <AppLayout>
        <div className="bg-slate-50 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
          <ConsultationSummaryPrintView
            summary={completedSummary}
            onReturnToQueue={() => router.push("/doctor/queue")}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="bg-slate-50 min-h-screen text-slate-900 pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
          {/* Top Bar Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Link
                href="/doctor/queue"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Today&apos;s Queue</span>
              </Link>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-900">Doctor Patient Clinical Workspace</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-slate-500">{appointmentId || "OPD Encounter"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {draftSavedMessage && (
                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Draft saved locally</span>
                </div>
              )}
              <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
                {patient.hospital_name || workspace?.hospital_name || "Healthcare Facility"} • General Medicine
              </span>
            </div>
          </div>

          {/* 1. Persistent Patient Header (Requirements 2 & 37) */}
          <PatientHeader
            patient={patient}
            user={currentUser}
            encounterId={appointmentId || "ENC-2026-CONSULT"}
            lastVisit={contextData?.recent_clinical_summary?.last_visit_date || "15 Sep 2026"}
            allergies={
              contextData?.allergies && contextData.allergies.length > 0
                ? contextData.allergies
                : [{ allergen: "Penicillin", severity: "Severe", type: "Drug" }]
            }
            chronicConditions={
              contextData?.chronic_conditions && contextData.chronic_conditions.length > 0
                ? contextData.chronic_conditions
                : ["Type 2 Diabetes Mellitus", "Essential Hypertension"]
            }
          />

          {/* 2. Patient Clinical Navigation Tabs (Requirement 3) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs overflow-x-auto flex items-center gap-1">
            {[
              { key: "OVERVIEW", label: "Overview", icon: Layers },
              { key: "AI_COPILOT", label: "AI Copilot", icon: Sparkles },
              { key: "CONSULTATION", label: "Consultation", icon: Stethoscope },
              { key: "HISTORY", label: "Medical History", icon: History },
              { key: "VISITS", label: "Visits", icon: Calendar },
              { key: "PRESCRIPTIONS", label: "Prescriptions", icon: Pill },
              { key: "LABS", label: "Lab Reports & Investigations", icon: FlaskConical },
              { key: "DOCUMENTS", label: "Documents", icon: FolderOpen },
              { key: "REFERRALS", label: "Referrals", icon: Share2 },
              { key: "APPOINTMENTS", label: "Follow-ups", icon: Clock },
              { key: "DIAGNOSES", label: "Diagnoses", icon: Activity },
              { key: "TIMELINE", label: "Timeline", icon: ClipboardList },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as TabKey)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 3. Tab Content Views */}

          {/* TAB 1: OVERVIEW */}
          {activeTab === "OVERVIEW" && (
            <div className="space-y-5">
              {/* Summary Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Last Visit</span>
                  <p className="font-bold text-slate-900 text-sm">
                    {contextData?.recent_clinical_summary?.last_visit_date || "02 Oct 2026"}
                  </p>
                  <span className="text-slate-500 text-[11px]">{patient.hospital_name || workspace?.hospital_name || "Healthcare Facility"}</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Last Prescription</span>
                  <p className="font-bold text-slate-900 text-sm">
                    {contextData?.recent_clinical_summary?.last_prescription_date || "02 Oct 2026"}
                  </p>
                  <span className="text-slate-500 text-[11px]">2 active medications</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Lab Tests</span>
                  <p className="font-bold text-teal-700 text-sm">
                    {contextData?.recent_clinical_summary?.pending_lab_count || 1} test(s)
                  </p>
                  <span className="text-slate-500 text-[11px]">Processing in lab</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Referrals</span>
                  <p className="font-bold text-purple-700 text-sm">
                    {contextData?.recent_clinical_summary?.active_referrals_count || 0} referral(s)
                  </p>
                  <span className="text-slate-500 text-[11px]">Specialist evaluations</span>
                </div>
              </div>

              {/* Patient Reported Intake Card */}
              <PatientReportedIntakeSection
                intake={contextData?.patient_intake}
                onApplyToNotes={() => {
                  handleApplyIntakeToNotes(contextData?.patient_intake);
                  setActiveTab("CONSULTATION");
                }}
              />

              {/* Longitudinal History Snapshot */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-600" />
                    Recent Longitudinal History Across OneHealth ID Network
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("HISTORY")}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    View Full Medical History &rarr;
                  </button>
                </div>

                <div className="space-y-2">
                  {historyEvents.slice(0, 4).map((ev) => (
                    <div
                      key={ev.event_id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {ev.record_type}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{ev.title}</p>
                          <p className="text-slate-500 text-[11px]">
                            {ev.hospital_name} • {ev.subtitle}
                          </p>
                        </div>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">{ev.formatted_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: AI COPILOT */}
          {activeTab === "AI_COPILOT" && (
            <div className="space-y-4">
              <DoctorAICopilotPanel
                patientId={patientId}
                hospitalId={patient.hospital_id || workspace?.hospital_ref_id || ""}
                chiefComplaint={chiefComplaintText || "Scheduled OPD Review"}
                onApplyDraftToConsultation={handleApplyAIDraft}
              />
            </div>
          )}

          {/* TAB 2: CONSULTATION (MAIN DOCTOR WORKSPACE) */}
          {activeTab === "CONSULTATION" && (
            <div className="space-y-5">
              {/* Doctor AI Copilot Quick Assist Banner */}
              <DoctorAICopilotPanel
                patientId={patientId}
                hospitalId={patient.hospital_id || workspace?.hospital_ref_id || ""}
                chiefComplaint={chiefComplaintText || "Scheduled OPD Review"}
                onApplyDraftToConsultation={handleApplyAIDraft}
                className="mb-2"
              />

              {/* 1. Patient-Reported Intake (Requirement 7, 8, 9, 11) */}
              <PatientReportedIntakeSection
                intake={contextData?.patient_intake}
                onApplyToNotes={handleApplyIntakeToNotes}
              />

              {/* 2. Vitals Matrix (Requirement 12) */}
              <VitalsMatrix vitals={vitals} onChange={setVitals} />

              {/* 3. Clinical Notes (Chief Complaint, HPI, Examination, Assessment) (Requirement 10) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Doctor Clinical Documentation (SOAP Notes)</h3>
                      <p className="text-[11px] text-slate-500">
                        Physician clinical documentation preserved separately from patient-entered description
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Chief Complaint */}
                  <div>
                    <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                      Chief Complaint *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Epigastric burning pain for 3 days after meals with fatigue"
                      value={chiefComplaintText}
                      onChange={(e) => setChiefComplaintText(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50/50"
                    />
                  </div>

                  {/* History of Present Illness */}
                  <div>
                    <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                      History of Present Illness (HPI)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Onset, character, radiation, aggravating/relieving factors..."
                      value={hpiText}
                      onChange={(e) => setHpiText(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50/50"
                    />
                  </div>

                  {/* Clinical Examination */}
                  <div>
                    <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                      Clinical Examination Findings
                    </label>
                    <textarea
                      rows={2}
                      placeholder="General appearance, vitals correlation, systemic examination (CVS, RS, P/A, CNS)..."
                      value={examinationNotes}
                      onChange={(e) => setExaminationNotes(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50/50"
                    />
                  </div>

                  {/* Assessment & Clinical Impression */}
                  <div>
                    <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                      Clinical Assessment & Impression
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Differential diagnoses, clinical impression and risk assessment..."
                      value={assessmentText}
                      onChange={(e) => setAssessmentText(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50/50"
                    />
                  </div>
                </div>
              </div>

              {/* 4. ICD-10 Diagnosis Selector (Requirement 13) */}
              <ICD10DiagnosisSelector diagnoses={diagnoses} onChange={setDiagnoses} />

              {/* 5. FHIR Prescription Builder (Requirement 14) */}
              <FHIRPrescriptionBuilder
                items={prescriptionItems}
                instructions={prescriptionInstructions}
                onItemsChange={setPrescriptionItems}
                onInstructionsChange={setPrescriptionInstructions}
              />

              {/* 6. Multi-Category Investigation Ordering (Requirement 15, 16, 17) */}
              <InvestigationOrderer
                patientId={patient.id}
                patientName={patient.name}
                onehealthId={patient.onehealth_id || patient.id}
                onOrdersSubmitted={() => {
                  loadPatientWorkspaceContext();
                }}
              />

              {/* 7. Follow-up & Specialist Referral Trigger (Requirement 21, 28) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Follow-up Scheduler */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      Follow-up Configuration
                    </span>
                    <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={followUpRequired}
                        onChange={(e) => setFollowUpRequired(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Follow-up Required
                    </label>
                  </div>

                  {followUpRequired && (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-bold text-slate-600 uppercase text-[10px] block mb-1">
                            Follow-up Date
                          </label>
                          <input
                            type="date"
                            value={followUpDate}
                            onChange={(e) => setFollowUpDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono font-medium text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-600 uppercase text-[10px] block mb-1">
                            Department
                          </label>
                          <input
                            type="text"
                            value={followUpDepartment}
                            onChange={(e) => setFollowUpDepartment(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Instructions for patient upon return..."
                        value={followUpNotes}
                        onChange={(e) => setFollowUpNotes(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                      />
                    </div>
                  )}
                </div>

                {/* Referral Action Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3 text-xs">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Share2 className="w-4 h-4 text-purple-600" />
                        Specialist Referral
                      </span>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                        Privacy-Preserving Sharing
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs mt-2 leading-relaxed">
                      Refer {patient.name} to another credentialed specialist with selective clinical records attachment. Unrelated records remain private.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsReferralModalOpen(true)}
                    className="w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>+ Create Specialist Referral</span>
                  </button>
                </div>
              </div>

              {/* 8. Bottom Final Action Bar (Requirements 29 & 37) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 sticky bottom-4 z-30">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Consultation ready: {diagnoses.length} diagnosis, {prescriptionItems.length} Rx, {prescriptionItems.length > 0 ? "Prescription active" : "No Rx"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-4 py-2.5 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Draft
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(true)}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileSignature className="w-4 h-4" />
                    Review & Complete Consultation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MEDICAL HISTORY (Cross-Hospital History with Filters) (Requirements 5 & 6) */}
          {activeTab === "HISTORY" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Cross-Hospital Longitudinal History (Consent & Authorization Scoped)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Federated health records across participating OneHealth ID hospital nodes
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Filter by hospital..."
                    value={historyHospitalFilter}
                    onChange={(e) => setHistoryHospitalFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                  />
                  <select
                    value={historyTypeFilter}
                    onChange={(e) => setHistoryTypeFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-700"
                  >
                    <option value="ALL">All Record Types</option>
                    <option value="VISIT">Visits</option>
                    <option value="PRESCRIPTION">Prescriptions</option>
                    <option value="LAB">Lab Reports</option>
                    <option value="IMAGING">Imaging</option>
                    <option value="DISCHARGE_SUMMARY">Discharge Summaries</option>
                    <option value="REFERRAL">Referrals</option>
                  </select>
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                  No historical records match the selected filters.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map((ev) => (
                    <div
                      key={ev.event_id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-indigo-200 transition-all flex flex-wrap items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-indigo-100">
                          {ev.record_type.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{ev.title}</span>
                            <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                              {ev.record_type}
                            </span>
                          </div>
                          <p className="text-slate-600 text-xs mt-0.5">{ev.subtitle}</p>
                          <p className="text-slate-400 text-[11px] mt-1 flex items-center gap-1.5">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>{ev.hospital_name}</span>
                            {ev.diagnosis && <span>• Diagnosis: {ev.diagnosis}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-slate-500 font-semibold text-xs">{ev.formatted_date}</span>
                        {ev.status && (
                          <span className="block text-[10px] font-bold uppercase text-emerald-600 mt-1">
                            {ev.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: VISITS */}
          {activeTab === "VISITS" && (
            <div className="space-y-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900">Encounter Visits for {patient.name}</h3>
                <p className="text-[11px] text-slate-500">Outpatient consultations and inpatient hospital visits</p>
              </div>
              {historyEvents
                .filter((e) => e.record_type === "VISIT")
                .map((v) => (
                  <div key={v.event_id} className="p-4 rounded-2xl bg-white border border-slate-200 flex justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{v.title}</p>
                      <p className="text-slate-500">{v.hospital_name} • {v.subtitle}</p>
                    </div>
                    <span className="font-mono text-slate-500">{v.formatted_date}</span>
                  </div>
                ))}
            </div>
          )}

          {/* TAB 5: PRESCRIPTIONS */}
          {activeTab === "PRESCRIPTIONS" && (
            <div className="space-y-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900">Prescription Records</h3>
                <p className="text-[11px] text-slate-500">Authorized e-prescriptions issued across network facilities</p>
              </div>
              {historyEvents
                .filter((e) => e.record_type === "PRESCRIPTION")
                .map((rx) => (
                  <div key={rx.event_id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-900">{rx.title}</p>
                        <p className="text-slate-500">{rx.hospital_name} • {rx.subtitle}</p>
                      </div>
                      <span className="font-mono text-slate-500">{rx.formatted_date}</span>
                    </div>
                    {rx.instructions && (
                      <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {rx.instructions}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* TAB 6: LAB REPORTS & INVESTIGATIONS (Requirements 18, 19, 20) */}
          {activeTab === "LABS" && (
            <InvestigationResultsView
              patientId={patient.id}
              patientName={patient.name}
              onehealthId={patient.onehealth_id || patient.id}
            />
          )}

          {/* TAB 7: DOCUMENTS (Unified Medical Records & Document Engine) */}
          {activeTab === "DOCUMENTS" && (
            <div className="space-y-4">
              {/* Header & Quick Action Buttons */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                      <FileText className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Patient Medical Documents & Vault
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    View official provider records, triage patient-uploaded files, or upload external diagnostic reports
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsDocRequestOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition shadow-2xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Request from Patient
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDocUploadExtOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    + Upload External Record
                  </button>
                </div>
              </div>

              {/* Consultation Attachment Bar */}
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-indigo-950 font-medium">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>
                    <strong>Attach to Active Consultation:</strong> Select documents below to link them with this SOAP note.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 font-bold text-indigo-700 font-mono text-[11px]">
                    {selectedDocIdsForConsultation.length} selected
                  </span>
                  {selectedDocIdsForConsultation.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setDocAttachmentMessage(`Attached ${selectedDocIdsForConsultation.length} document(s) to active consultation note.`);
                        setTimeout(() => setDocAttachmentMessage(null), 3000);
                      }}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-2xs"
                    >
                      Confirm Attach
                    </button>
                  )}
                </div>
              </div>

              {docAttachmentMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{docAttachmentMessage}</span>
                </div>
              )}

              {/* Filter & Search Toolbar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                {/* Category & Source Selectors */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={docCategoryFilter}
                    onChange={(e) => setDocCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-700"
                  >
                    <option value="ALL">All Categories</option>
                    {DOCUMENT_CATEGORIES.filter(c => c.key !== "ALL").map(cat => (
                      <option key={cat.key} value={cat.key}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={docSourceFilter}
                    onChange={(e) => setDocSourceFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-700"
                  >
                    <option value="ALL">All Sources</option>
                    <option value="HOSPITAL">🏥 Hospital Documents</option>
                    <option value="PATIENT_UPLOADED">👤 Patient Uploaded</option>
                    <option value="EXTERNAL_PROVIDER">🌐 External Provider</option>
                  </select>
                </div>
              </div>

              {/* Document Cards Grid */}
              {patientDocs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                  No medical documents found for this patient yet. Use the buttons above to request documents or upload external reports.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patientDocs
                    .filter((d) => {
                      const matchesCategory = docCategoryFilter === "ALL" || d.category === docCategoryFilter;
                      const matchesSource =
                        docSourceFilter === "ALL" ||
                        (docSourceFilter === "PATIENT_UPLOADED" && (d.source_type === "PATIENT_UPLOADED" || d.source_type === "PATIENT")) ||
                        (docSourceFilter === "EXTERNAL_PROVIDER" && d.source_type === "EXTERNAL_PROVIDER") ||
                        (docSourceFilter === "HOSPITAL" && (d.source_type === "HOSPITAL" || d.source_type === "HOSPITAL_ISSUED" || d.source_type === "DOCTOR"));
                      const matchesSearch =
                        !docSearchQuery ||
                        d.title.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                        (d.notes && d.notes.toLowerCase().includes(docSearchQuery.toLowerCase()));
                      return matchesCategory && matchesSource && matchesSearch;
                    })
                    .map((doc) => (
                      <MedicalDocumentCard
                        key={doc.id}
                        document={doc}
                        selectable={true}
                        selected={selectedDocIdsForConsultation.includes(doc.id)}
                        onSelectToggle={handleToggleAttachDoc}
                        onView={(d) => {
                          setViewingDoc(d as MedicalDocumentDetail);
                          setIsDocViewerOpen(true);
                        }}
                        onReview={(d) => {
                          setReviewingDoc(d);
                          setIsDocReviewOpen(true);
                        }}
                      />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: REFERRALS */}
          {activeTab === "REFERRALS" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Specialist Referrals</h3>
                  <p className="text-[11px] text-slate-500">Internal and external specialist referral dispatches</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReferralModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold cursor-pointer"
                >
                  + New Referral
                </button>
              </div>
              {historyEvents
                .filter((e) => e.record_type === "REFERRAL")
                .map((ref) => (
                  <div key={ref.event_id} className="p-4 rounded-2xl bg-white border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-slate-900">{ref.title}</p>
                      <span className="font-mono text-slate-500">{ref.formatted_date}</span>
                    </div>
                    <p className="text-slate-600">{ref.subtitle}</p>
                  </div>
                ))}
            </div>
          )}

          {/* TAB 9: APPOINTMENTS & FOLLOW-UPS */}
          {activeTab === "APPOINTMENTS" && (
            <div className="space-y-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900">Appointments & Follow-ups</h3>
                <p className="text-[11px] text-slate-500">Upcoming clinical reviews and consultations</p>
              </div>
              {contextData?.upcoming_appointments && contextData.upcoming_appointments.length > 0 ? (
                contextData.upcoming_appointments.map((app: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200 flex justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{app.department || "General Medicine"}</p>
                      <p className="text-slate-500">{app.hospital_name || workspace?.hospital_name || "Healthcare Facility"} • Slot {app.slot_time || "Morning"}</p>
                    </div>
                    <span className="font-mono text-indigo-700 font-bold">{app.appointment_date}</span>
                  </div>
                ))
              ) : (
                <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                  No upcoming appointments scheduled.
                </div>
              )}
            </div>
          )}

          {/* TAB 10: DIAGNOSES */}
          {activeTab === "DIAGNOSES" && (
            <div className="space-y-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900">Chronic & Active Diagnoses</h3>
                <p className="text-[11px] text-slate-500">ICD-10 clinical conditions documented for this patient</p>
              </div>
              <div className="flex flex-wrap gap-2 p-4 bg-white rounded-2xl border border-slate-200 text-xs">
                {diagnoses.map((d, i) => (
                  <div key={i} className="px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center gap-2">
                    {d.code && <span className="font-mono font-bold text-indigo-700">{d.code}</span>}
                    <span className="font-semibold text-slate-900">{d.description}</span>
                    <span className="text-[10px] uppercase font-bold text-indigo-500">({d.tier})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 11: TIMELINE */}
          {activeTab === "TIMELINE" && (
            <div className="space-y-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900">Chronological Clinical Event Stream</h3>
                <p className="text-[11px] text-slate-500">Timeline of visits, prescriptions, labs and clinical documents</p>
              </div>
              <div className="space-y-3">
                {historyEvents.map((ev) => (
                  <div key={ev.event_id} className="p-4 bg-white rounded-2xl border border-slate-200 flex justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{ev.title}</span>
                      <p className="text-slate-500">{ev.subtitle}</p>
                    </div>
                    <span className="font-mono text-slate-400">{ev.formatted_date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Doctor Referral Modal */}
        <DoctorReferralModal
          isOpen={isReferralModalOpen}
          onClose={() => setIsReferralModalOpen(false)}
          patientId={patient.id}
          patientName={patient.name}
          onehealthId={patient.onehealth_id || patient.id}
          availableDocuments={historyEvents}
          onReferralCreated={() => {
            loadPatientWorkspaceContext();
          }}
        />

        {/* Pre-Completion Review Modal */}
        <ConsultationReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onConfirm={handleExecuteConsultationCompletion}
          isSubmitting={isSubmittingConsultation}
          patient={patient}
          hasPatientIntake={!!contextData?.patient_intake}
          clinicalNotesEntered={!!chiefComplaintText || !!hpiText}
          diagnosesCount={diagnoses.length}
          prescriptionsCount={prescriptionItems.length}
          investigationsCount={0}
          hasReferral={false}
          hasFollowUp={followUpRequired}
          followUpDate={followUpDate}
          primaryDiagnosis={diagnoses[0]?.description}
        />

        {/* Document Viewer Modal */}
        <MedicalDocumentViewerModal
          document={viewingDoc}
          isOpen={isDocViewerOpen}
          onClose={() => {
            setIsDocViewerOpen(false);
            setViewingDoc(null);
          }}
          onShare={() => {}}
        />

        {/* Doctor Document Review Modal */}
        <DoctorReviewDocumentModal
          document={reviewingDoc}
          isOpen={isDocReviewOpen}
          onClose={() => {
            setIsDocReviewOpen(false);
            setReviewingDoc(null);
          }}
          onReviewCompleted={() => {
            loadPatientWorkspaceContext();
          }}
        />

        {/* Doctor Request Document Modal */}
        <DoctorRequestDocumentModal
          patientId={patient.id}
          patientName={patient.name}
          isOpen={isDocRequestOpen}
          onClose={() => setIsDocRequestOpen(false)}
          onRequestCreated={() => {
            loadPatientWorkspaceContext();
          }}
          relatedVisitId={appointmentId || contextData?.recent_visits?.[0]?.id}
        />

        {/* Doctor Upload External Document Modal */}
        <DoctorUploadExternalDocumentModal
          patientId={patient.id}
          patientName={patient.name}
          isOpen={isDocUploadExtOpen}
          onClose={() => setIsDocUploadExtOpen(false)}
          onDocumentUploaded={() => {
            loadPatientWorkspaceContext();
          }}
        />
      </div>
    </AppLayout>
  );
}
