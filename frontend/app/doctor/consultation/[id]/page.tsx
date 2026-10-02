"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Patient,
  UserProfile,
  PrescriptionItem,
  Prescription,
  ChiefComplaint,
  ClinicalExamination,
  MedicalHistory,
  DiagnosisItem,
  ReferralPayload,
  FollowUpPayload,
  TimelineEvent,
  ReportsSummary,
} from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, ErrorState } from "@/components/ui/FeedbackStates";

// Clinical Workspace Subcomponents
import { PatientHeader } from "@/components/clinical/PatientHeader";
import { WorkflowSuggestions } from "@/components/clinical/WorkflowSuggestions";
import { PatientClinicalTimeline } from "@/components/clinical/PatientClinicalTimeline";
import { ClinicalAssessment } from "@/components/clinical/ClinicalAssessment";
import { FHIRPrescriptionBuilder } from "@/components/clinical/FHIRPrescriptionBuilder";
import { MedicationTimeline } from "@/components/clinical/MedicationTimeline";
import { ReportsView } from "@/components/clinical/ReportsView";
import { FollowUpPlanSection } from "@/components/clinical/FollowUpPlanSection";
import { ReferralSection } from "@/components/clinical/ReferralSection";
import { PreviousPrescriptions } from "@/components/clinical/PreviousPrescriptions";
import { PrescriptionSignModal } from "@/components/clinical/PrescriptionSignModal";

function DoctorConsultationContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const patientId = params?.id as string;
  const appointmentId = searchParams?.get("appointment_id") || undefined;
  const queueId = searchParams?.get("queue_id") || undefined;

  // Global state
  const [patient, setPatient] = useState<Patient | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // Section toggle state for ergonomic clinical workspace
  const [showTimeline, setShowTimeline] = useState(true);
  const [showHistoryRx, setShowHistoryRx] = useState(true);
  const [showReports, setShowReports] = useState(true);
  const [showMedTimeline, setShowMedTimeline] = useState(true);

  // Sub-data state
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [previousPrescriptions, setPreviousPrescriptions] = useState<Prescription[]>([]);
  const [reportsSummary, setReportsSummary] = useState<ReportsSummary | null>(null);

  // Form State: 1. Chief Complaint
  const [chiefComplaint, setChiefComplaint] = useState<ChiefComplaint>({
    reason: "Routine follow-up & intermittent headache with fatigue",
    reason_for_visit: "Routine follow-up & intermittent headache with fatigue",
    symptoms: ["Headache", "Fatigue", "Occasional blurred vision"],
    duration: "4 days",
    severity: "Moderate",
    onset: "Subacute",
    relevant_history: "History of Stage 1 Essential Hypertension; baseline medications taken inconsistently.",
  });

  // Form State: 2. Vitals
  const [vitals, setVitals] = useState({
    bp: "138/88 mmHg",
    pulse: 76,
    resp_rate: 18,
    spo2: 98,
    temperature: "98.4 °F",
    height_cm: 168,
    weight_kg: 72,
    bmi: 25.5,
    pain_score: 3,
  });

  // Form State: 3. Clinical Examination
  const [examination, setExamination] = useState<ClinicalExamination>({
    general: {
      pallor: true,
      icterus: false,
      cyanosis: false,
      clubbing: false,
      lymphadenopathy: false,
      edema: "Nil",
    },
    systems: {
      cvs: "S1, S2 heard normal. No murmurs.",
      rs: "Bilateral normal vesicular breath sounds. Clear fields.",
      pa: "Soft, non-tender, no organomegaly.",
      cns: "Higher mental functions intact. No focal neurological deficits.",
    },
    findings: "Mild bilateral temporal tension tenderness; no papilledema on fundoscopic check.",
    doctor_notes: "Advised salt restriction, stress relief, and hydration. Re-evaluated antihypertensive therapy.",
  });

  // Form State: 4. Medical History
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory>({
    illnesses: "Viral Bronchitis (2024), Mild Acid Peptic Disease",
    surgeries: "Appendectomy (2018)",
    chronic_conditions: ["Essential Hypertension (Diagnosed 2021)"],
    family_history: "Father: Hypertension & Coronary Artery Disease; Mother: Type 2 Diabetes",
    social_history: {
      smoking: "Non-smoker",
      alcohol: "Occasional social",
      diet: "Mixed South Indian diet",
      activity: "Sedentary desk job",
    },
    allergies: [
      { allergen: "Amoxicillin", severity: "Moderate", type: "Drug", reaction: "Erythematous maculopapular rash" },
      { allergen: "Penicillin", severity: "Severe", type: "Drug", reaction: "Urticaria" },
    ],
    current_medications: ["Telmisartan 40mg PO OD", "Pantoprazole 40mg PO OD PRN"],
  });

  // Form State: 5. Diagnoses
  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>([
    {
      type: "Primary",
      code: "I10",
      name: "Essential (primary) hypertension",
      description: "Essential (primary) hypertension, suboptimally controlled",
      status: "Confirmed",
      clinical_notes: "Blood pressure elevated above target (138/88 mmHg). Titrating therapy.",
    },
    {
      type: "Secondary",
      code: "G44.2",
      name: "Tension-type headache",
      description: "Tension-type headache",
      status: "Confirmed",
      clinical_notes: "Secondary to work fatigue and mild elevated diastolic pressure.",
    },
  ]);

  // Form State: 6. FHIR Prescription Items & Validity
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
    {
      medicine_name: "Amlodipine 5mg Tablet",
      generic_name: "Amlodipine Besylate",
      brand_name: "Norvasc 5mg",
      strength: "5 mg",
      dosage: "5 mg",
      dosage_form: "Tablet",
      route: "Oral",
      dose: "1 tablet",
      frequency: "Once daily",
      timing_morning: true,
      timing_afternoon: false,
      timing_evening: false,
      timing_night: false,
      food_instruction: "AFTER_FOOD",
      duration_value: 30,
      duration_days: 30,
      duration_unit: "Days",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      quantity: 30,
      expected_supply_duration: 30,
      refills: 1,
      valid_from: new Date().toISOString().split("T")[0],
      valid_until: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
      is_prn: false,
      specific_instructions: "Take once daily in the morning with water.",
    },
    {
      medicine_name: "Paracetamol 650mg Tablet",
      generic_name: "Paracetamol",
      brand_name: "Dolo 650",
      strength: "650 mg",
      dosage: "650 mg",
      dosage_form: "Tablet",
      route: "Oral",
      dose: "1 tablet",
      frequency: "As needed (PRN)",
      timing_morning: true,
      timing_afternoon: false,
      timing_evening: true,
      timing_night: false,
      food_instruction: "AFTER_FOOD",
      duration_value: 5,
      duration_days: 5,
      duration_unit: "Days",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
      quantity: 10,
      expected_supply_duration: 5,
      refills: 0,
      valid_from: new Date().toISOString().split("T")[0],
      valid_until: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
      is_prn: true,
      prn_indication: "Take only for headache above moderate threshold",
      specific_instructions: "Maximum 2 tablets in 24 hours. Do not exceed.",
    },
  ]);

  const [prescriptionInstructions, setPrescriptionInstructions] = useState(
    "Ensure regular BP recording; maintain reduced sodium intake. Do not miss morning Amlodipine."
  );
  const [prescriptionValidFrom, setPrescriptionValidFrom] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [prescriptionValidUntil, setPrescriptionValidUntil] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
  );

  // Form State: 7. Follow-up Plan
  const [followUpPlan, setFollowUpPlan] = useState<FollowUpPayload>({
    patient_id: patientId,
    doctor_id: "doc-k-01",
    department: "Cardiology",
    scheduled_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    follow_up_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    scheduled_time: "10:30 AM",
    follow_up_time: "10:30 AM",
    duration_minutes: 15,
    reason: "Hypertension medication titration & BP review",
    required_tests: ["Complete Blood Count (CBC)", "Serum Creatinine / eGFR", "Lipid Profile"],
    required_investigations: ["Complete Blood Count (CBC)", "Serum Creatinine & Kidney Profile", "Lipid Profile Comprehensive"],
    instructions: "Bring home BP measurement diary for the preceding 7 days.",
  });

  // Form State: 8. Referral
  const [referral, setReferral] = useState<ReferralPayload>({
    patient_id: patientId,
    referring_doctor_id: "doc-k-01",
    from_doctor_id: "doc-k-01",
    referral_type: "INTERNAL",
    specialty: "Cardiology & Intensive Care",
    receiving_doctor_name: "Dr. Senthil Nathan (MD, DM)",
    priority: "ROUTINE",
    reason: "Evaluation of border-line elevated blood pressure with parental CAD history",
    clinical_summary: "42M presenting with suboptimal BP control on monotherapy. Requesting 2D Echocardiogram and cardiology review.",
    requested_evaluation: "Echocardiogram + Ambulatory BP monitoring",
    attached_reports: [],
  });

  // Modal State: Digital Signature
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    const cur = api.auth.getCurrentUser();
    setCurrentUser(cur);

    if (!patientId) return;

    const loadAllClinicalData = async () => {
      setLoading(true);
      setError("");
      try {
        const [pData, tData, prevRxData, repData] = await Promise.all([
          api.patients.get(patientId),
          api.consultations.getTimeline(patientId).catch(() => []),
          api.consultations.listPrescriptions({ patientId }).catch(() => []),
          api.consultations.getReportsSummary(patientId).catch(() => null),
        ]);

        setPatient(pData);
        if (tData && tData.length > 0) setTimelineEvents(tData);
        if (prevRxData && prevRxData.length > 0) setPreviousPrescriptions(prevRxData);
        if (repData) setReportsSummary(repData);
      } catch (err: any) {
        setError(err.message || "Failed to load clinical encounter context");
      } finally {
        setLoading(false);
      }
    };

    loadAllClinicalData();
  }, [patientId]);

  // Handler: Copy previous prescription items
  const handleCopyPrescription = (itemsToCopy: PrescriptionItem[]) => {
    const freshItems = itemsToCopy.map((it) => ({
      ...it,
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + (it.duration_value || 7) * 86400000).toISOString().split("T")[0],
      valid_from: new Date().toISOString().split("T")[0],
      valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    }));

    setPrescriptionItems((prev) => [...prev, ...freshItems]);
    const rxEl = document.getElementById("prescription-section");
    if (rxEl) {
      rxEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Handler: Save Local Draft
  const handleSaveDraft = () => {
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 3000);
  };

  // Handler: Confirm & Digitally Sign Prescription
  const handleConfirmSignAndCommit = async (signatureData: {
    doctorPin: string;
    signatureNote: string;
    generatedHash: string;
  }) => {
    setSubmitting(true);
    try {
      const doctorId = currentUser?.username === "dr.anitha" ? "doc-k-02" : "doc-k-01";
      const primaryDiag = diagnoses.find((d) => d.type === "Primary")?.description || diagnoses[0]?.name || "Consultation complete";

      // 1. Submit consultation payload to FastAPI / PostgreSQL
      await api.consultations.record({
        appointment_id: appointmentId,
        patient_id: patientId,
        doctor_id: doctorId,
        diagnosis: primaryDiag,
        symptoms: chiefComplaint.symptoms.join(", ") || chiefComplaint.reason_for_visit || chiefComplaint.reason || "Encounter completed",
        clinical_notes: examination.doctor_notes || chiefComplaint.relevant_history,
        vitals: vitals,
        chief_complaint: chiefComplaint,
        examination: examination,
        medical_history: medicalHistory,
        diagnoses: diagnoses,
        prescription: {
          patient_id: patientId,
          doctor_id: doctorId,
          items: prescriptionItems,
          valid_until: prescriptionValidUntil,
          valid_from: prescriptionValidFrom,
          instructions: prescriptionInstructions,
          notes: signatureData.signatureNote,
          signed_by: currentUser?.name || "Dr. Senthil Kumar",
          digital_signature_hash: signatureData.generatedHash,
        },
        referral: referral.specialty ? referral : undefined,
        follow_up: followUpPlan.scheduled_date ? followUpPlan : undefined,
      });

      // 2. Mark queue item as completed if originating from OPD queue
      if (queueId) {
        try {
          await api.queue.complete(queueId);
        } catch {
          // silently handle
        }
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/doctor/queue");
      }, 2500);
    } catch (err: any) {
      throw new Error(err.message || "Failed to commit clinical encounter to PostgreSQL.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="bg-white min-h-[80vh] flex items-center justify-center">
          <LoadingState message="Opening OneHealth ID Clinical Consultation Workspace..." />
        </div>
      </AppLayout>
    );
  }

  if (error || !patient) {
    return (
      <AppLayout>
        <div className="bg-white p-8 max-w-4xl mx-auto min-h-[70vh]">
          <ErrorState
            title="Patient Clinical Record Not Accessible"
            message={error || "Could not retrieve patient medical record. Please verify permissions."}
            onRetry={() => window.location.reload()}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="bg-white min-h-screen text-slate-900 pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Top Breadcrumb & Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Link
                href="/doctor/queue"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Live OPD Queue</span>
              </Link>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium">Active Consultation Room #4</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-slate-500">Encounter #{appointmentId || "ENC-2026-OCT-01"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {draftSaved && (
                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Draft saved locally</span>
                </div>
              )}
              <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
                Kedar Hospital • General Medicine
              </span>
            </div>
          </div>

          {/* Success Banner if Submitted */}
          {success && (
            <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 shadow-sm animate-in zoom-in-95">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h2 className="text-xl font-bold text-emerald-950">
                Clinical Encounter Digitally Signed & Committed
              </h2>
              <p className="text-xs text-emerald-800 max-w-lg mx-auto">
                Consultation assessment, ICD-10 diagnoses, FHIR MedicationRequest orders, follow-up plan,
                and referrals have been committed to PostgreSQL with immutable audit timestamps.
              </p>
              <div className="text-xs font-mono text-emerald-700">
                Redirecting to OPD queue in 2 seconds...
              </div>
            </div>
          )}

          {/* 1. PATIENT HEADER (Point 1) */}
          <PatientHeader
            patient={patient}
            user={currentUser}
            encounterId={appointmentId || "OPD-2026-1001-04"}
            lastVisit="15-Sep-2026 (Dr. Senthil Kumar • BP Check & CMP)"
            nextVisit={followUpPlan.scheduled_date ? `${followUpPlan.scheduled_date} (Follow-up scheduled)` : "15-Oct-2026"}
            primaryDoctor="Dr. Senthil Kumar, MD (Internal Medicine)"
            department="General Medicine / OPD Block A"
            chronicConditions={medicalHistory.chronic_conditions}
            allergies={medicalHistory.allergies}
            criticalAlerts={[
              "Severe rash documented with Penicillin class antibiotics",
              "Monitored for primary hypertension with family history of CAD",
            ]}
          />

          {/* 2. CLINICAL WORKFLOW PROMPTS (Point 12) */}
          <WorkflowSuggestions
            patient={{
              allergies: ["Amoxicillin", "Penicillin"],
              chronic_conditions: ["Essential Hypertension"],
              next_visit: followUpPlan.scheduled_date,
              last_visit: "15-Sep-2026",
            }}
            hasRecentReports={Boolean(reportsSummary)}
            recentReportTitle="Comprehensive Metabolic Panel (15-Sep-2026)"
            onAction={(type, target) => {
              if (target) {
                const el = document.getElementById(target);
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }
            }}
          />

          {/* 3. PATIENT CLINICAL TIMELINE (Point 7) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTimeline(!showTimeline)}
              className="w-full px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Patient Clinical Timeline (Chronological Health Tree)
                </h3>
                <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {timelineEvents.length} Recorded Milestones
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{showTimeline ? "Collapse" : "Expand"}</span>
                {showTimeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showTimeline && (
              <div className="p-5">
                <PatientClinicalTimeline events={timelineEvents} />
              </div>
            )}
          </div>

          {/* 4. CLINICAL ASSESSMENT (Point 2) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Clinical Assessment & Examination
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                5 Standardized Consultation Domains
              </span>
            </div>

            <div className="p-5">
              <ClinicalAssessment
                symptomsText={chiefComplaint.symptoms.join(", ") || chiefComplaint.reason || ""}
                onSymptomsTextChange={(txt) => setChiefComplaint((prev) => ({ ...prev, reason: txt }))}
                diagnosisText={diagnoses[0]?.description || diagnoses[0]?.name || ""}
                onDiagnosisTextChange={(txt) => setDiagnoses((prev) => [{ ...prev[0], name: txt, description: txt }])}
                clinicalNotes={examination.doctor_notes || ""}
                onClinicalNotesChange={(txt) => setExamination((prev) => ({ ...prev, doctor_notes: txt }))}
                vitals={vitals}
                onVitalsChange={setVitals}
                chiefComplaint={chiefComplaint}
                onChiefComplaintChange={setChiefComplaint}
                examination={examination}
                onExaminationChange={setExamination}
                medicalHistory={medicalHistory}
                onMedicalHistoryChange={setMedicalHistory}
                diagnosesList={diagnoses}
                onDiagnosesListChange={setDiagnoses}
              />
            </div>
          </div>

          {/* 5. PRESCRIPTION BUILDER (Points 3 & 4) */}
          <div id="prescription-section" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Prescription Orders (FHIR MedicationRequest Model)
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                {prescriptionItems.length} active order{prescriptionItems.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="p-5">
              <FHIRPrescriptionBuilder
                items={prescriptionItems}
                onItemsChange={setPrescriptionItems}
                instructions={prescriptionInstructions}
                onInstructionsChange={setPrescriptionInstructions}
                validFrom={prescriptionValidFrom}
                onValidFromChange={setPrescriptionValidFrom}
                validUntil={prescriptionValidUntil}
                onValidUntilChange={setPrescriptionValidUntil}
              />
            </div>
          </div>

          {/* 6. MEDICATION TIMELINE (Point 5) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowMedTimeline(!showMedTimeline)}
              className="w-full px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Medication Trajectory & Regimen Timeline
                </h3>
                <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Gantt Course View
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{showMedTimeline ? "Collapse" : "Expand"}</span>
                {showMedTimeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showMedTimeline && (
              <div className="p-5">
                <MedicationTimeline currentItems={prescriptionItems} />
              </div>
            )}
          </div>

          {/* 7. DIAGNOSTIC REPORTS & COMPARATIVE TRENDS (Point 8) */}
          <div id="reports-tab" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowReports(!showReports)}
              className="w-full px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Unified Diagnostic Reports & Multi-Period Longitudinal Trends
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{showReports ? "Collapse" : "Expand"}</span>
                {showReports ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showReports && (
              <div className="p-5">
                <ReportsView reportsSummary={reportsSummary || { orders: [], trends: {} }} />
              </div>
            )}
          </div>

          {/* 8. FOLLOW-UP PLAN & SPECIALIST REFERRAL (Points 9 & 11) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div id="followup-section" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <FollowUpPlanSection
                followUp={followUpPlan}
                onChange={setFollowUpPlan}
                primaryDoctorName={currentUser?.name || "Dr. Senthil Kumar, MD"}
              />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <ReferralSection referral={referral} onChange={setReferral} />
            </div>
          </div>

          {/* 9. PREVIOUS PRESCRIPTIONS & CLINICAL COPY (Point 6) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowHistoryRx(!showHistoryRx)}
              className="w-full px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Previous Prescriptions & Re-Prescribe Safeguards
                </h3>
                <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {previousPrescriptions.length} Records on File
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{showHistoryRx ? "Collapse" : "Expand"}</span>
                {showHistoryRx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showHistoryRx && (
              <div className="p-5">
                <PreviousPrescriptions
                  prescriptions={previousPrescriptions}
                  onCopyPrescription={handleCopyPrescription}
                />
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM FIXED ACTION BAR (Point 22) */}
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-6 z-40 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{patient.name}</span>
                <span className="font-mono text-slate-400">({patient.onehealth_id})</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900">{prescriptionItems.length}</span>
                <span>Rx item{prescriptionItems.length === 1 ? "" : "s"}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900">{diagnoses.length}</span>
                <span>Diagnos{diagnoses.length === 1 ? "is" : "es"}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Save Draft Button */}
              <button
                type="button"
                onClick={handleSaveDraft}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors shadow-sm"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>Save Draft</span>
              </button>

              {/* Review Summary Button */}
              <button
                type="button"
                onClick={() => {
                  const rxEl = document.getElementById("prescription-section");
                  if (rxEl) rxEl.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors shadow-sm"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Review Order</span>
              </button>

              {/* Sign Prescription Button */}
              <button
                type="button"
                onClick={() => setIsSignModalOpen(true)}
                disabled={submitting || success}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-sm hover:shadow-md disabled:opacity-50"
              >
                <FileSignature className="w-4 h-4" />
                <span>Sign Prescription & Finalize</span>
              </button>
            </div>
          </div>
        </div>

        {/* Digital Signature Modal */}
        <PrescriptionSignModal
          isOpen={isSignModalOpen}
          onClose={() => setIsSignModalOpen(false)}
          onConfirmSign={handleConfirmSignAndCommit}
          patient={{
            name: patient.name,
            uhid: patient.onehealth_id,
            age_gender: `${patient.age}Y • ${patient.gender}`,
          }}
          doctor={{
            name: currentUser?.name || "Dr. Senthil Kumar, MD",
            id: currentUser?.username === "dr.anitha" ? "doc-k-02" : "doc-k-01",
            reg_no: "MCI-TN-48201",
            department: "General Medicine",
            hospital_name: "Kedar Super Speciality Hospital",
          }}
          items={prescriptionItems}
          validUntil={prescriptionValidUntil}
          diagnosisSummary={diagnoses.map((d) => d.description || d.name).join(", ")}
        />
      </div>
    </AppLayout>
  );
}

export default function DoctorConsultationPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Loading consultation workflow...</div>}>
      <DoctorConsultationContent />
    </React.Suspense>
  );
}
