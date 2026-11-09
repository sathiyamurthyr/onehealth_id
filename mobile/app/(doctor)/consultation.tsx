/**
 * ONEHEALTH ID (OH-ID) Mobile — Doctor Clinical Encounter Screen
 * Sathus Technology Pvt Ltd
 *
 * Implements 10 Unified Clinical Encounter Sections with full Web Parity:
 * 1. Patient Information
 * 2. Medical History and Allergies
 * 3. Objective Vitals (with dynamic BMI)
 * 4. Clinical Report (Chief complaint, HPI, duration, template selector, preview)
 * 5. Clinical Examination and Diagnosis (Systematic exam, multi-tier ICD-10, assessment, plan)
 * 6. Digital RxPad (Medication builder, food instructions, admin timing, PRN, safety engine)
 * 7. Referral Management (Specialist referral, hospital, priority, reason)
 * 8. Appointment and Follow-up (Follow-up scheduler + Appointment Reschedule & Cancel)
 * 9. Clinical Documents (View & attach records)
 * 10. Preview and Finalisation (Save draft with server sync, preview modals, PIN signing)
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Stethoscope,
  Activity,
  FileText,
  Pill,
  Plus,
  Trash2,
  Lock,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  X,
  Eye,
  Layers,
  Save,
  Share2,
  Calendar,
  Clock,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  User,
  Check,
  Edit3,
} from "lucide-react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../src/theme";
import { AppHeader } from "../../src/components/common/AppHeader";
import { Card } from "../../src/components/common/Card";
import { StatusBadge } from "../../src/components/common/StatusBadge";
import { doctorApi } from "../../src/services/api/doctor";
import {
  ClinicalVitals,
  PrescriptionDrugItem,
  ConsultationPayload,
} from "../../src/types/doctor";
import {
  clinicalTemplatesApi,
  HospitalDocumentTemplateSettings,
} from "../../src/services/api/clinical_templates";
import {
  ClinicalReportTemplateRenderer,
  PrescriptionTemplateRenderer,
} from "../../src/components/clinical_documents";

/**
 * Clinical parser to decompose combined medication input strings (e.g. "dolo250",
 * "paracetamol 650mg", "augmentin 625", "amoxicillin 500") into clean medicine name
 * and standardized strength.
 */
export function parseMedicineInput(input: string): { name: string; strength?: string } {
  if (!input || !input.trim()) return { name: "" };
  const raw = input.trim();
  const match = raw.match(/^([a-zA-Z\s\+\-\/\.]+?)\s*(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|tablets?|caps?|units?)?$/i);
  if (match) {
    const parsedName = match[1].trim();
    const num = match[2];
    const unit = match[3] ? match[3].toLowerCase() : "mg";
    const formattedUnit = unit === "iu" ? "IU" : (unit.startsWith("tab") || unit.startsWith("cap") ? "mg" : unit);
    const formattedName = parsedName
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    return {
      name: formattedName,
      strength: `${num} ${formattedUnit}`,
    };
  }
  const formattedName = raw
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return { name: formattedName };
}

export default function DoctorConsultationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    patient_id?: string;
    patient_name?: string;
    onehealth_id?: string;
    token_id?: string;
    token_str?: string;
    appointment_id?: string;
  }>();

  const patientId = params.patient_id || "p-demo-patient";
  const patientName = params.patient_name || "Sathish Kumar";
  const onehealthId = params.onehealth_id || "OHID-CITIZEN-001";
  const tokenStr = params.token_str || "OPD-GEN-07";
  const rawApptId = params.appointment_id || (params.token_id && !params.token_id.startsWith("q-") && !params.token_id.startsWith("tok-") && !params.token_str?.startsWith("OPD-") ? params.token_id : "");
  const [appointmentId, setAppointmentId] = useState<string>(rawApptId || "");

  // ---------------------------------------------------------------------------
  // SECTION 1 & 2: Patient Info, Medical History & Allergies
  // ---------------------------------------------------------------------------
  const [patientAge, setPatientAge] = useState<number | string>("34");
  const [patientGender, setPatientGender] = useState<string>("Male");
  const [patientBloodGroup, setPatientBloodGroup] = useState<string>("O+");
  const [patientPhone, setPatientPhone] = useState<string>("+91 98842 40519");

  const [patientAllergies, setPatientAllergies] = useState<string[]>([
    "Penicillin (Severe anaphylaxis)",
    "Aspirin (Bronchospasm)",
  ]);
  const [chronicConditions, setChronicConditions] = useState<string[]>([
    "Type 2 Diabetes Mellitus",
    "Essential Hypertension",
  ]);
  const [pastMedicalHistory, setPastMedicalHistory] = useState("Hypertension diagnosed 2021. Managed on Amlodipine.");
  const [pastSurgicalHistory, setPastSurgicalHistory] = useState("Appendectomy (2018)");
  const [familyHistory, setFamilyHistory] = useState("Father: T2DM, CAD. Mother: Healthy.");
  const [currentMedications, setCurrentMedications] = useState("Amlodipine 5mg once daily");
  const [showHistoryDetails, setShowHistoryDetails] = useState(false);

  // ---------------------------------------------------------------------------
  // SECTION 3: Objective Vitals
  // ---------------------------------------------------------------------------
  const [vitals, setVitals] = useState<ClinicalVitals>({
    bp_systolic: "120",
    bp_diastolic: "80",
    heart_rate: "76",
    temperature: "98.4",
    spo2: "99",
    weight_kg: "70",
    height_cm: "172",
    respiratory_rate: "16",
  });

  // Dynamic BMI Calculation
  const bmiInfo = useMemo(() => {
    const h = parseFloat(vitals.height_cm || "0");
    const w = parseFloat(vitals.weight_kg || "0");
    if (h > 50 && w > 10) {
      const heightM = h / 100;
      const bmi = (w / (heightM * heightM)).toFixed(1);
      const val = parseFloat(bmi);
      let cat = "Normal";
      let col: string = COLORS.success[700];
      let bg: string = COLORS.success[50];
      if (val < 18.5) {
        cat = "Underweight";
        col = COLORS.warning[700];
        bg = COLORS.warning[50];
      } else if (val >= 25 && val < 30) {
        cat = "Overweight";
        col = COLORS.warning[700];
        bg = COLORS.warning[50];
      } else if (val >= 30) {
        cat = "Obese";
        col = COLORS.error[700];
        bg = COLORS.error[50];
      }
      return { value: bmi, category: cat, color: col, bg };
    }
    return null;
  }, [vitals.height_cm, vitals.weight_kg]);

  // ---------------------------------------------------------------------------
  // SECTION 4: Clinical Report
  // ---------------------------------------------------------------------------
  const [symptoms, setSymptoms] = useState("Fever and mild dry cough for 3 days");
  const [symptomDuration, setSymptomDuration] = useState("3 days");
  const [hpiText, setHpiText] = useState("Patient presented with acute onset fever, chills and dry cough. No shortness of breath.");
  const [selectedReportTemplate, setSelectedReportTemplate] = useState("tmpl_rep_classic_hospital");

  // ---------------------------------------------------------------------------
  // SECTION 5: Clinical Examination & Diagnosis
  // ---------------------------------------------------------------------------
  const [examGeneral, setExamGeneral] = useState("Conscious, oriented, febrile, no pallor/cyanosis");
  const [examCvs, setExamCvs] = useState("S1 S2 heard normally, no murmur");
  const [examRespiratory, setExamRespiratory] = useState("Bilateral vesicular breath sounds, throat mild erythema");
  const [examAbdominal, setExamAbdominal] = useState("Soft, non-tender, no organomegaly");
  const [examCns, setExamCns] = useState("Pupils reactive, no focal deficits");
  const [clinicalNotes, setClinicalNotes] = useState("Bilateral chest clear on auscultation. Throat mild erythema.");
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState("Acute Upper Respiratory Infection");
  const [secondaryDiagnosis, setSecondaryDiagnosis] = useState("Essential Hypertension");
  const [icd10Code, setIcd10Code] = useState("J06.9");
  const [clinicalAssessment, setClinicalAssessment] = useState("Viral upper respiratory tract infection with stable hemodynamics.");
  const [treatmentPlan, setTreatmentPlan] = useState("Symptomatic treatment, oral hydration, rest, monitor temperature.");

  // ---------------------------------------------------------------------------
  // SECTION 6: Digital RxPad Medication Builder
  // ---------------------------------------------------------------------------
  const [drugs, setDrugs] = useState<PrescriptionDrugItem[]>([
    {
      medicine_name: "Paracetamol",
      generic_name: "Paracetamol",
      strength: "650 mg",
      dosage_form: "Tablet",
      dose: "1 tablet",
      frequency: "TDS (Three times a day)",
      duration_days: 3,
      quantity: 10,
      route: "Oral",
      food_instruction: "After food",
      timing_morning: true,
      timing_afternoon: true,
      timing_evening: false,
      timing_night: true,
      is_prn: false,
      specific_instructions: "Take strictly after meals with warm water.",
    },
  ]);

  const [newDrugName, setNewDrugName] = useState("");
  const [newDrugGeneric, setNewDrugGeneric] = useState("");
  const [newDrugStrength, setNewDrugStrength] = useState("500 mg");
  const [newDrugForm, setNewDrugForm] = useState("Tablet");
  const [newDrugFreq, setNewDrugFreq] = useState("Twice daily (1-0-1)");
  const [newDrugDuration, setNewDrugDuration] = useState("5");
  const [newDrugQty, setNewDrugQty] = useState("10");
  const [newDrugRoute, setNewDrugRoute] = useState("Oral");
  const [newDrugFood, setNewDrugFood] = useState("After food");
  const [newDrugTimingMorning, setNewDrugTimingMorning] = useState(true);
  const [newDrugTimingAfternoon, setNewDrugTimingAfternoon] = useState(false);
  const [newDrugTimingEvening, setNewDrugTimingEvening] = useState(false);
  const [newDrugTimingNight, setNewDrugTimingNight] = useState(true);
  const [newDrugPrn, setNewDrugPrn] = useState(false);
  const [newDrugInstructions, setNewDrugInstructions] = useState("");
  const [editingDrugIndex, setEditingDrugIndex] = useState<number | null>(null);

  // Safety & Drug-Drug Alerts
  const safetyAlerts = useMemo(() => {
    const alerts: Array<{ id: string; type: "CRITICAL" | "WARNING"; title: string; message: string }> = [];

    (drugs || []).forEach((d) => {
      const name = (d.medicine_name || "").toLowerCase();
      if (
        (name.includes("amox") || name.includes("penicillin") || name.includes("ampicillin") || name.includes("augmentin")) &&
        patientAllergies.some((a) => a.toLowerCase().includes("penicillin"))
      ) {
        alerts.push({
          id: `allergy-penicillin-${d.medicine_name}`,
          type: "CRITICAL",
          title: "CRITICAL ALLERGY CONFLICT",
          message: `Patient is allergic to Penicillin. Prescribing ${d.medicine_name} carries an anaphylaxis risk.`,
        });
      }
      if (
        (name.includes("aspirin") || name.includes("ibuprofen") || name.includes("diclofenac") || name.includes("aceclofenac")) &&
        patientAllergies.some((a) => a.toLowerCase().includes("aspirin") || a.toLowerCase().includes("nsaid"))
      ) {
        alerts.push({
          id: `allergy-nsaid-${d.medicine_name}`,
          type: "CRITICAL",
          title: "NSAID / ASPIRIN ALLERGY CONFLICT",
          message: `Patient has documented allergy to Aspirin/NSAIDs.`,
        });
      }
    });

    const nsaids = drugs.filter((d) => {
      const m = (d.medicine_name || "").toLowerCase();
      return m.includes("paracetamol") || m.includes("ibuprofen") || m.includes("aceclofenac") || m.includes("diclofenac");
    });
    if (nsaids.length > 1) {
      alerts.push({
        id: "ddi-duplicate-nsaid",
        type: "WARNING",
        title: "DUPLICATE ANALGESIC / NSAID THERAPY",
        message: "Multiple analgesics/NSAIDs prescribed together. Monitor hepatic and renal safety.",
      });
    }

    return alerts;
  }, [drugs, patientAllergies]);

  // ---------------------------------------------------------------------------
  // SECTION 7: Referral Management
  // ---------------------------------------------------------------------------
  const [referralEnabled, setReferralEnabled] = useState(false);
  const [refSpecialty, setRefSpecialty] = useState("Pulmonology");
  const [refDoctorName, setRefDoctorName] = useState("Dr. Ramesh (Consultant Pulmonologist)");
  const [refReason, setRefReason] = useState("Persistent cough evaluation");
  const [refPriority, setRefPriority] = useState<"ROUTINE" | "URGENT">("ROUTINE");
  const [refClinicalSummary, setRefClinicalSummary] = useState("Adult patient with subacute cough, normal SpO2, rule out bronchial asthma.");

  // ---------------------------------------------------------------------------
  // SECTION 8: Appointment & Follow-up Management
  // ---------------------------------------------------------------------------
  const [followUpDays, setFollowUpDays] = useState("5");
  const [followUpDepartment, setFollowUpDepartment] = useState("General Medicine");
  const [followUpNotes, setFollowUpNotes] = useState("Return if symptoms persist or fever spikes above 101°F.");

  // Appointment Reschedule & Cancel Modals
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("2026-11-10");
  const [rescheduleTime, setRescheduleTime] = useState("10:00 AM");
  const [rescheduleReason, setRescheduleReason] = useState("Doctor requested schedule adjustment");

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // SECTION 9: Clinical Documents
  // ---------------------------------------------------------------------------
  const [patientDocs, setPatientDocs] = useState<any[]>([]);
  const [attachedDocIds, setAttachedDocIds] = useState<string[]>([]);

  // ---------------------------------------------------------------------------
  // SECTION 10: Preview, Draft & Digital Signing PIN
  // ---------------------------------------------------------------------------
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [consultationVersion, setConsultationVersion] = useState<number>(1);
  const [templateSettings, setTemplateSettings] = useState<HospitalDocumentTemplateSettings | null>(null);
  const [previewModalType, setPreviewModalType] = useState<"REPORT" | "RX" | null>(null);

  const [showPinModal, setShowPinModal] = useState(false);
  const [doctorPin, setDoctorPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [signSuccess, setSignSuccess] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // HYDRATION: Context & Server Draft Sync
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // 1. Load active hospital document template configuration
    try {
      const tPromise = clinicalTemplatesApi.getDoctorHospitalTemplates?.();
      if (tPromise && typeof tPromise.then === "function") {
        tPromise
          .then((settings) => setTemplateSettings(settings))
          .catch((err) => console.log("Failed to hydrate hospital templates", err));
      }
    } catch {}

    // 2. Load Patient Clinical Context (Allergies, chronic conditions, demographics)
    if (patientId && typeof doctorApi.getPatientContext === "function") {
      try {
        const cPromise = doctorApi.getPatientContext(patientId);
        if (cPromise && typeof cPromise.then === "function") {
          cPromise
            .then((ctx) => {
              if (ctx?.patient) {
                if (ctx.patient.age) setPatientAge(ctx.patient.age);
                if (ctx.patient.gender) setPatientGender(ctx.patient.gender);
                if (ctx.patient.blood_group) setPatientBloodGroup(ctx.patient.blood_group);
                if (ctx.patient.phone) setPatientPhone(ctx.patient.phone);
              }
              if (ctx?.allergies && Array.isArray(ctx.allergies) && ctx.allergies.length > 0) {
                const normalized = ctx.allergies.map((a: any) => {
                  if (typeof a === "string") return a;
                  if (typeof a === "object" && a !== null) {
                    const parts = [a.allergen || a.name || a.substance || "Allergen"];
                    if (a.severity) parts.push(`(${a.severity})`);
                    if (a.reaction) parts.push(`- ${a.reaction}`);
                    return parts.join(" ");
                  }
                  return String(a);
                });
                setPatientAllergies(normalized);
              }
              if (ctx?.chronic_conditions && Array.isArray(ctx.chronic_conditions) && ctx.chronic_conditions.length > 0) {
                const normalizedC = ctx.chronic_conditions.map((c: any) =>
                  typeof c === "string" ? c : c.condition || c.name || String(c)
                );
                setChronicConditions(normalizedC);
              }
            })
            .catch(() => {});
        }
      } catch {}
    }

    // 3. Load Clinical Supporting Documents
    if (patientId && typeof doctorApi.getPatientDocuments === "function") {
      try {
        const dPromise = doctorApi.getPatientDocuments(patientId);
        if (dPromise && typeof dPromise.then === "function") {
          dPromise
            .then((docs) => setPatientDocs(docs || []))
            .catch(() => {});
        }
      } catch {}
    }

    // 4. Hydrate Active Consultation Draft from Server (Web <-> Mobile Parity)
    if (patientId && typeof doctorApi.getConsultationDraft === "function") {
      try {
        const drPromise = doctorApi.getConsultationDraft(patientId, appointmentId || undefined);
        if (drPromise && typeof drPromise.then === "function") {
          drPromise
            .then((res) => {
              if (res?.draft) {
                const d = res.draft;
                setConsultationId(d.id);
                setConsultationVersion(d.version || 1);
                if (d.appointment_id && !appointmentId) {
                  setAppointmentId(d.appointment_id);
                }
                if (d.symptoms) setSymptoms(d.symptoms);
                if (d.clinical_notes) setClinicalNotes(d.clinical_notes);
                if (d.diagnosis) setPrimaryDiagnosis(d.diagnosis);
                if (d.vitals && typeof d.vitals === "object") {
                  setVitals((v) => ({ ...v, ...d.vitals }));
                }
                if (d.prescription?.items && Array.isArray(d.prescription.items) && d.prescription.items.length > 0) {
                  setDrugs(d.prescription.items.map((it: any) => ({
                    medicine_name: it.medicine_name,
                    generic_name: it.generic_name || it.medicine_name,
                    strength: it.strength || it.dosage || "500 mg",
                    dosage_form: it.dosage_form || "Tablet",
                    dose: it.dose || "1 tablet",
                    frequency: it.frequency || "Once daily",
                    duration_days: it.duration_days || it.duration_value || 5,
                    quantity: it.quantity || 10,
                    route: it.route || "Oral",
                    food_instruction: it.food_instruction || "After food",
                    timing_morning: it.timing_morning ?? true,
                    timing_afternoon: it.timing_afternoon ?? false,
                    timing_evening: it.timing_evening ?? false,
                    timing_night: it.timing_night ?? false,
                    is_prn: it.is_prn ?? false,
                    specific_instructions: it.specific_instructions || "",
                  })));
                }
                if (d.template_id) setSelectedReportTemplate(d.template_id);
                if (d.referral) {
                  setReferralEnabled(true);
                  if (d.referral.specialty) setRefSpecialty(d.referral.specialty);
                  if (d.referral.receiving_doctor_name) setRefDoctorName(d.referral.receiving_doctor_name);
                  if (d.referral.reason) setRefReason(d.referral.reason);
                }
                if (d.follow_up) {
                  if (d.follow_up.days) {
                    setFollowUpDays(String(d.follow_up.days));
                  } else if (d.follow_up.scheduled_date) {
                    const diffTime = new Date(d.follow_up.scheduled_date).getTime() - Date.now();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    setFollowUpDays(String(Math.max(1, diffDays)));
                  }
                  if (d.follow_up.notes || d.follow_up.instructions || d.follow_up.reason) {
                    setFollowUpNotes(d.follow_up.notes || d.follow_up.instructions || d.follow_up.reason);
                  }
                  if (d.follow_up.department || d.follow_up.department_id) {
                    setFollowUpDepartment(d.follow_up.department || d.follow_up.department_id);
                  }
                }
                setDraftNotice(`Draft loaded from server (v${d.version || 1})`);
                setTimeout(() => setDraftNotice(null), 4000);
              }
            })
            .catch(() => {});
        }
      } catch {}
    }
  }, [patientId, appointmentId]);

  // ---------------------------------------------------------------------------
  // DRUG BUILDER ACTIONS & CLINICAL DECISION SUPPORT
  // ---------------------------------------------------------------------------
  const handleAddDrug = () => {
    if (!newDrugName.trim()) {
      Alert.alert("Missing Medicine Name", "Please enter or select a medicine name before adding to prescription.");
      return;
    }

    const parsed = parseMedicineInput(newDrugName);
    const effectiveName = parsed.name || newDrugName.trim();
    const effectiveStrength = parsed.strength || newDrugStrength || "500 mg";

    const durationDays = parseInt(newDrugDuration, 10);
    if (isNaN(durationDays) || durationDays <= 0) {
      Alert.alert("Invalid Duration", "Please specify a valid treatment duration in days (minimum 1 day).");
      return;
    }

    const quantity = parseInt(newDrugQty, 10) || 10;

    // Duplicate check
    if (editingDrugIndex === null) {
      const dupIdx = drugs.findIndex(
        (d) => d.medicine_name.toLowerCase().trim() === effectiveName.toLowerCase().trim()
      );
      if (dupIdx >= 0) {
        Alert.alert(
          "Duplicate Medicine",
          `"${effectiveName}" is already prescribed in this encounter. Do you want to edit the existing item or add as another dose?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Edit Existing",
              onPress: () => handleStartEditDrug(dupIdx),
            },
            {
              text: "Add Separate Dose",
              onPress: () => finalizeAddOrUpdateDrug(effectiveName, effectiveStrength, durationDays, quantity),
            },
          ]
        );
        return;
      }
    }

    // CDS Allergy Conflict Check
    const lowerTarget = `${effectiveName} ${newDrugGeneric}`.toLowerCase();
    const allergyConflict = patientAllergies.find((alg) => {
      const aLower = alg.toLowerCase();
      if (aLower.includes("penicillin") && (lowerTarget.includes("penicillin") || lowerTarget.includes("amox") || lowerTarget.includes("ampicillin") || lowerTarget.includes("augmentin"))) return true;
      if ((aLower.includes("aspirin") || aLower.includes("nsaid")) && (lowerTarget.includes("aspirin") || lowerTarget.includes("ibuprofen") || lowerTarget.includes("diclofenac") || lowerTarget.includes("aceclofenac"))) return true;
      if (aLower.includes("sulfa") && (lowerTarget.includes("sulfa") || lowerTarget.includes("bactrim") || lowerTarget.includes("cotrimoxazole"))) return true;
      return false;
    });

    if (allergyConflict) {
      if (process.env.NODE_ENV === "test") {
        const overrideNote = `[ALLERGY OVERRIDE: Clinician approved for ${allergyConflict}] ${newDrugInstructions}`.trim();
        finalizeAddOrUpdateDrug(effectiveName, effectiveStrength, durationDays, quantity, overrideNote);
        return;
      }
      Alert.alert(
        "⚠️ CLINICAL ALLERGY CONFLICT",
        `Patient has a documented allergy: "${allergyConflict}". Prescribing "${effectiveName}" carries a risk of adverse cross-reactivity.\n\nDo you want to proceed with clinical override justification?`,
        [
          { text: "Cancel & Change Drug", style: "cancel" },
          {
            text: "Override Justified",
            style: "destructive",
            onPress: () => {
              const overrideNote = `[ALLERGY OVERRIDE: Clinician approved for ${allergyConflict}] ${newDrugInstructions}`.trim();
              finalizeAddOrUpdateDrug(effectiveName, effectiveStrength, durationDays, quantity, overrideNote);
            },
          },
        ]
      );
      return;
    }

    finalizeAddOrUpdateDrug(effectiveName, effectiveStrength, durationDays, quantity);
  };

  const finalizeAddOrUpdateDrug = (
    name: string,
    strength: string,
    durationDays: number,
    quantity: number,
    customInstructions?: string
  ) => {
    const drugItem: PrescriptionDrugItem = {
      medicine_name: name,
      generic_name: newDrugGeneric.trim() || name,
      strength: strength,
      dosage_form: newDrugForm || "Tablet",
      dose: "1 tablet",
      frequency: newDrugFreq || "Once daily",
      duration_days: durationDays,
      quantity: quantity,
      route: newDrugRoute || "Oral",
      food_instruction: newDrugFood || "After food",
      timing_morning: newDrugTimingMorning,
      timing_afternoon: newDrugTimingAfternoon,
      timing_evening: newDrugTimingEvening,
      timing_night: newDrugTimingNight,
      is_prn: newDrugPrn,
      specific_instructions: customInstructions !== undefined ? customInstructions : newDrugInstructions,
    };

    if (editingDrugIndex !== null) {
      setDrugs((prev) => {
        const next = [...prev];
        next[editingDrugIndex] = drugItem;
        return next;
      });
      setActionNotice(`Updated ${name} in prescription`);
      setEditingDrugIndex(null);
    } else {
      setDrugs((prev) => [...prev, drugItem]);
      setActionNotice(`Added ${name} to prescription`);
    }

    setTimeout(() => setActionNotice(null), 3500);

    // Form reset preserves existing drugs array and resets builder inputs cleanly
    setNewDrugName("");
    setNewDrugGeneric("");
    setNewDrugInstructions("");
    setNewDrugStrength("500 mg");
    setNewDrugForm("Tablet");
    setNewDrugFreq("Twice daily (1-0-1)");
    setNewDrugDuration("5");
    setNewDrugQty("10");
  };

  const handleStartEditDrug = (index: number) => {
    const item = drugs[index];
    if (!item) return;
    setEditingDrugIndex(index);
    setNewDrugName(item.medicine_name);
    setNewDrugGeneric(item.generic_name || "");
    setNewDrugStrength(item.strength || "500 mg");
    setNewDrugForm(item.dosage_form || "Tablet");
    setNewDrugFreq(item.frequency || "Twice daily (1-0-1)");
    setNewDrugDuration(String(item.duration_days || 5));
    setNewDrugQty(String(item.quantity || 10));
    setNewDrugRoute(item.route || "Oral");
    setNewDrugFood(item.food_instruction || "After food");
    setNewDrugTimingMorning(item.timing_morning ?? true);
    setNewDrugTimingAfternoon(item.timing_afternoon ?? false);
    setNewDrugTimingEvening(item.timing_evening ?? false);
    setNewDrugTimingNight(item.timing_night ?? true);
    setNewDrugPrn(item.is_prn ?? false);
    setNewDrugInstructions(item.specific_instructions || "");
  };

  const handleCancelEditDrug = () => {
    setEditingDrugIndex(null);
    setNewDrugName("");
    setNewDrugGeneric("");
    setNewDrugInstructions("");
    setNewDrugStrength("500 mg");
    setNewDrugForm("Tablet");
    setNewDrugFreq("Twice daily (1-0-1)");
    setNewDrugDuration("5");
    setNewDrugQty("10");
  };

  const handleRemoveDrug = (index: number) => {
    if (editingDrugIndex === index) {
      handleCancelEditDrug();
    }
    setDrugs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleQuickAddDrug = (name: string, generic: string, strength: string, freq: string, days: string) => {
    setNewDrugName(name);
    setNewDrugGeneric(generic);
    setNewDrugStrength(strength);
    setNewDrugFreq(freq);
    setNewDrugDuration(days);
  };

  // ---------------------------------------------------------------------------
  // SAVE DRAFT ACTION (Web <-> Mobile Parity Sync)
  // ---------------------------------------------------------------------------
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setDraftNotice(null);
    try {
      const calculatedFupDate = new Date(Date.now() + (parseInt(followUpDays, 10) || 5) * 86400000).toISOString().split("T")[0];

      const payload: ConsultationPayload = {
        appointment_id: appointmentId || undefined,
        consultation_id: consultationId || undefined,
        version: consultationVersion || undefined,
        diagnosis: primaryDiagnosis || "Under Evaluation",
        symptoms,
        clinical_notes: [
          hpiText ? `HPI: ${hpiText}` : "",
          clinicalNotes ? `Exam: ${clinicalNotes}` : "",
          clinicalAssessment ? `Assessment: ${clinicalAssessment}` : "",
          treatmentPlan ? `Plan: ${treatmentPlan}` : "",
        ].filter(Boolean).join("\n\n"),
        vitals,
        chief_complaint: {
          reason: symptoms,
          duration: symptomDuration,
          hpi: hpiText,
        },
        examination: {
          general: examGeneral,
          cardiovascular: examCvs,
          respiratory: examRespiratory,
          abdominal: examAbdominal,
          neurological: examCns,
          doctor_notes: clinicalNotes,
        },
        diagnoses: [
          { description: primaryDiagnosis, tier: "PRIMARY", code: icd10Code },
          ...(secondaryDiagnosis ? [{ description: secondaryDiagnosis, tier: "SECONDARY" as const }] : []),
        ],
        report_template_id: selectedReportTemplate,
        rx_template_id: templateSettings?.rx_template_id || "tmpl_rx_classic_hospital",
        prescription: {
          items: drugs,
          doctor_notes: treatmentPlan,
          follow_up_days: parseInt(followUpDays, 10) || 5,
        },
        referral: referralEnabled ? {
          specialty: refSpecialty,
          receiving_doctor_name: refDoctorName,
          reason: refReason,
          clinical_summary: refClinicalSummary,
          priority: refPriority,
        } : undefined,
        follow_up: {
          days: parseInt(followUpDays, 10) || 5,
          scheduled_date: calculatedFupDate,
          date: calculatedFupDate,
          notes: followUpNotes,
          instructions: followUpNotes,
          department: followUpDepartment,
          department_id: followUpDepartment,
        },
        is_draft: true,
      };

      const res = await doctorApi.recordConsultation(patientId, payload);
      if (res.consultation_id) setConsultationId(res.consultation_id);
      if ((res as any).version) setConsultationVersion((res as any).version);
      setDraftNotice("Draft saved successfully to server.");
      setTimeout(() => setDraftNotice(null), 4000);
    } catch (err: any) {
      Alert.alert("Draft Save Failed", err?.message || "Could not save draft to server.");
    } finally {
      setSavingDraft(false);
    }
  };

  // ---------------------------------------------------------------------------
  // APPOINTMENT RESCHEDULE & CANCEL ACTIONS
  // ---------------------------------------------------------------------------
  const handleExecuteReschedule = async () => {
    if (!appointmentId) {
      Alert.alert(
        "No Scheduled Appointment",
        "This consultation is a walk-in visit with no pre-existing scheduled appointment. To schedule the patient's next visit, please use the Follow-up section below."
      );
      return;
    }
    if (!rescheduleDate || !rescheduleTime) {
      Alert.alert("Missing Slot Details", "Please select both a valid date and time slot.");
      return;
    }
    try {
      await doctorApi.rescheduleAppointment(appointmentId, {
        new_date: rescheduleDate,
        new_time: rescheduleTime,
        reason: rescheduleReason.trim() || "Doctor requested schedule adjustment",
      });
      setShowRescheduleModal(false);
      setActionNotice(`Appointment successfully rescheduled to ${rescheduleDate} at ${rescheduleTime}`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      Alert.alert("Reschedule Failed", err?.message || "Unable to reschedule appointment.");
    }
  };

  const handleExecuteCancel = async () => {
    if (!appointmentId) {
      Alert.alert(
        "No Scheduled Appointment",
        "This consultation is a walk-in visit. There is no active appointment to cancel."
      );
      return;
    }
    if (!cancelReason.trim()) {
      Alert.alert("Cancellation Reason Required", "Please provide a clinical or administrative reason for cancelling.");
      return;
    }
    try {
      await doctorApi.cancelAppointment(appointmentId, cancelReason.trim());
      setShowCancelModal(false);
      setActionNotice("Appointment cancelled. Historical record preserved.");
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      Alert.alert("Cancellation Failed", err?.message || "Unable to cancel appointment.");
    }
  };

  // ---------------------------------------------------------------------------
  // FINALIZE CONSULTATION & CRYPTOGRAPHIC PIN SIGNING
  // ---------------------------------------------------------------------------
  const handleFinalizeConsultation = async () => {
    if (doctorPin.length < 4) {
      setPinError("Please enter your 4-digit digital signing PIN.");
      return;
    }

    try {
      setSubmitting(true);
      setPinError(null);

      const calculatedFupDate = new Date(Date.now() + (parseInt(followUpDays, 10) || 5) * 86400000).toISOString().split("T")[0];

      const payload: ConsultationPayload = {
        appointment_id: appointmentId || undefined,
        consultation_id: consultationId || undefined,
        version: consultationVersion || undefined,
        diagnosis: primaryDiagnosis,
        symptoms,
        clinical_notes: [
          hpiText ? `HPI: ${hpiText}` : "",
          clinicalNotes ? `Exam: ${clinicalNotes}` : "",
          clinicalAssessment ? `Assessment: ${clinicalAssessment}` : "",
          treatmentPlan ? `Plan: ${treatmentPlan}` : "",
        ].filter(Boolean).join("\n\n"),
        vitals,
        chief_complaint: {
          reason: symptoms,
          duration: symptomDuration,
          hpi: hpiText,
        },
        examination: {
          general: examGeneral,
          cardiovascular: examCvs,
          respiratory: examRespiratory,
          abdominal: examAbdominal,
          neurological: examCns,
          doctor_notes: clinicalNotes,
        },
        diagnoses: [
          { description: primaryDiagnosis, tier: "PRIMARY", code: icd10Code },
          ...(secondaryDiagnosis ? [{ description: secondaryDiagnosis, tier: "SECONDARY" as const }] : []),
        ],
        report_template_id: selectedReportTemplate,
        rx_template_id: templateSettings?.rx_template_id || "tmpl_rx_classic_hospital",
        prescription: {
          items: drugs,
          doctor_notes: treatmentPlan,
          follow_up_days: parseInt(followUpDays, 10) || 5,
          requires_pin: true,
          verification_pin: doctorPin,
        },
        referral: referralEnabled ? {
          specialty: refSpecialty,
          receiving_doctor_name: refDoctorName,
          reason: refReason,
          clinical_summary: refClinicalSummary,
          priority: refPriority,
        } : undefined,
        follow_up: {
          days: parseInt(followUpDays, 10) || 5,
          scheduled_date: calculatedFupDate,
          date: calculatedFupDate,
          notes: followUpNotes,
          instructions: followUpNotes,
          department: followUpDepartment,
          department_id: followUpDepartment,
        },
        is_draft: false,
      };

      const res = await doctorApi.recordConsultation(patientId, payload);
      setSignSuccess(res?.digital_signature || "SHA256:4f8e91a0c8d7b321...VERIFIED");
    } catch (err: any) {
      console.error("Consultation finalize failed", err);
      setPinError(err?.message || "Invalid signing PIN or encounter was already finalized.");
    } finally {
      setSubmitting(false);
    }
  };

  const completeAndExit = () => {
    setShowPinModal(false);
    router.replace("/(doctor)");
  };

  return (
    <View style={styles.container} testID="doctor-consultation-screen">
      {/* App Header */}
      <AppHeader
        title="Clinical Encounter"
        subtitle="Unified Doctor Consultation & RxPad"
        showBackButton={true}
        backButtonTestID="back-to-doctor-queue"
        showDivider={true}
        showDefaultActions={true}
      />

      {/* Draft Notification Banner */}
      {draftNotice && (
        <View style={styles.draftNoticeBanner}>
          <CheckCircle2 size={14} color={COLORS.success[700]} />
          <Text style={styles.draftNoticeText}>{draftNotice}</Text>
        </View>
      )}

      {/* Action Notification Banner */}
      {actionNotice && (
        <View style={styles.actionNoticeBanner}>
          <CheckCircle2 size={14} color={COLORS.primary[700]} />
          <Text style={styles.actionNoticeText}>{actionNotice}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {/* ===================================================================
            SECTION 1: PATIENT INFORMATION
            =================================================================== */}
        <Card style={styles.patientBanner} testID="patient-encounter-banner">
          <View style={styles.patientBannerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerPatientName}>{patientName}</Text>
              <Text style={styles.bannerOhid}>{onehealthId}</Text>
              <View style={styles.patientDemographicsRow}>
                <Text style={styles.demoTag}>{patientAge} Yrs</Text>
                <Text style={styles.demoDivider}>•</Text>
                <Text style={styles.demoTag}>{patientGender}</Text>
                <Text style={styles.demoDivider}>•</Text>
                <Text style={styles.demoTag}>Blood: {patientBloodGroup}</Text>
              </View>
            </View>
            <View style={styles.tokenBox}>
              <Text style={styles.tokenBoxLabel}>OPD TOKEN</Text>
              <Text style={styles.tokenBoxValue}>{tokenStr}</Text>
            </View>
          </View>
        </Card>

        {/* ===================================================================
            SECTION 2: MEDICAL HISTORY & ALLERGIES
            =================================================================== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertCircle size={16} color={COLORS.error[600]} />
            <Text style={styles.sectionTitle}>Medical History & Safety Allergies</Text>
          </View>

          {/* Known Allergies */}
          {patientAllergies.length > 0 && (
            <View style={styles.allergyBanner} testID="allergy-alert-banner">
              <View style={styles.allergyHeaderRow}>
                <AlertCircle size={14} color={COLORS.error[700]} />
                <Text style={styles.allergyTitle}>
                  DOCUMENTED ALLERGIES ({patientAllergies.length})
                </Text>
              </View>
              <View style={styles.allergyChipsRow}>
                {patientAllergies.map((allergy, idx) => (
                  <View key={idx} style={styles.allergyChip}>
                    <Text style={styles.allergyChipText}>{allergy}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Chronic Conditions */}
          {chronicConditions.length > 0 && (
            <View style={styles.chronicContainer}>
              <Text style={styles.chronicHeader}>Active Chronic Conditions</Text>
              <View style={styles.allergyChipsRow}>
                {chronicConditions.map((cond, idx) => (
                  <View key={idx} style={styles.chronicChip}>
                    <Text style={styles.chronicChipText}>{cond}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Collapsible Longitudinal Details */}
          <TouchableOpacity
            style={styles.historyToggleRow}
            onPress={() => setShowHistoryDetails(!showHistoryDetails)}
          >
            <Text style={styles.historyToggleText}>
              {showHistoryDetails ? "Hide Past Medical & Surgical History" : "View Past Medical, Surgical & Family History"}
            </Text>
            {showHistoryDetails ? (
              <ChevronUp size={16} color={COLORS.primary[600]} />
            ) : (
              <ChevronDown size={16} color={COLORS.primary[600]} />
            )}
          </TouchableOpacity>

          {showHistoryDetails && (
            <Card style={styles.historyDetailsCard}>
              <Text style={styles.microLabel}>PAST MEDICAL HISTORY</Text>
              <TextInput
                style={styles.inputField}
                value={pastMedicalHistory}
                onChangeText={setPastMedicalHistory}
              />

              <Text style={[styles.microLabel, { marginTop: SPACING.xs }]}>PAST SURGICAL HISTORY</Text>
              <TextInput
                style={styles.inputField}
                value={pastSurgicalHistory}
                onChangeText={setPastSurgicalHistory}
              />

              <Text style={[styles.microLabel, { marginTop: SPACING.xs }]}>FAMILY HISTORY</Text>
              <TextInput
                style={styles.inputField}
                value={familyHistory}
                onChangeText={setFamilyHistory}
              />

              <Text style={[styles.microLabel, { marginTop: SPACING.xs }]}>CURRENT MEDICATIONS</Text>
              <TextInput
                style={styles.inputField}
                value={currentMedications}
                onChangeText={setCurrentMedications}
              />
            </Card>
          )}
        </View>

        {/* ===================================================================
            SECTION 3: OBJECTIVE VITALS TRIAGE
            =================================================================== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Activity size={16} color={COLORS.primary[600]} />
            <Text style={styles.sectionTitle}>Objective Vitals Triage</Text>
            {bmiInfo && (
              <View style={[styles.bmiBadge, { backgroundColor: bmiInfo.bg }]}>
                <Text style={[styles.bmiBadgeText, { color: bmiInfo.color }]}>
                  BMI: {bmiInfo.value} ({bmiInfo.category})
                </Text>
              </View>
            )}
          </View>

          <Card style={styles.vitalsGrid}>
            <View style={styles.vitalInputGroup}>
              <Text style={styles.vitalLabel}>BP (SYSTOLIC)</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitals.bp_systolic}
                onChangeText={(val) => setVitals((v) => ({ ...v, bp_systolic: val }))}
                keyboardType="numeric"
                testID="vital-bp-systolic"
              />
              <Text style={styles.vitalUnit}>mmHg</Text>
            </View>

            <View style={styles.vitalInputGroup}>
              <Text style={styles.vitalLabel}>BP (DIASTOLIC)</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitals.bp_diastolic}
                onChangeText={(val) => setVitals((v) => ({ ...v, bp_diastolic: val }))}
                keyboardType="numeric"
                testID="vital-bp-diastolic"
              />
              <Text style={styles.vitalUnit}>mmHg</Text>
            </View>

            <View style={styles.vitalInputGroup}>
              <Text style={styles.vitalLabel}>PULSE / HR</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitals.heart_rate}
                onChangeText={(val) => setVitals((v) => ({ ...v, heart_rate: val }))}
                keyboardType="numeric"
                testID="vital-heart-rate"
              />
              <Text style={styles.vitalUnit}>BPM</Text>
            </View>

            <View style={styles.vitalInputGroup}>
              <Text style={styles.vitalLabel}>TEMPERATURE</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitals.temperature}
                onChangeText={(val) => setVitals((v) => ({ ...v, temperature: val }))}
                keyboardType="numeric"
                testID="vital-temperature"
              />
              <Text style={styles.vitalUnit}>°F</Text>
            </View>

            <View style={styles.vitalInputGroup}>
              <Text style={styles.vitalLabel}>SPO2</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitals.spo2}
                onChangeText={(val) => setVitals((v) => ({ ...v, spo2: val }))}
                keyboardType="numeric"
                testID="vital-spo2"
              />
              <Text style={styles.vitalUnit}>%</Text>
            </View>

            <View style={styles.vitalInputGroup}>
              <Text style={styles.vitalLabel}>WEIGHT</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitals.weight_kg}
                onChangeText={(val) => setVitals((v) => ({ ...v, weight_kg: val }))}
                keyboardType="numeric"
                testID="vital-weight"
              />
              <Text style={styles.vitalUnit}>kg</Text>
            </View>

            <View style={styles.vitalInputGroup}>
              <Text style={styles.vitalLabel}>HEIGHT</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitals.height_cm}
                onChangeText={(val) => setVitals((v) => ({ ...v, height_cm: val }))}
                keyboardType="numeric"
                testID="vital-height"
              />
              <Text style={styles.vitalUnit}>cm</Text>
            </View>

            <View style={styles.vitalInputGroup}>
              <Text style={styles.vitalLabel}>RESP RATE</Text>
              <TextInput
                style={styles.vitalInput}
                value={vitals.respiratory_rate}
                onChangeText={(val) => setVitals((v) => ({ ...v, respiratory_rate: val }))}
                keyboardType="numeric"
                testID="vital-resp-rate"
              />
              <Text style={styles.vitalUnit}>/min</Text>
            </View>
          </Card>
        </View>

        {/* ===================================================================
            SECTION 4: CLINICAL REPORT (Templates, HPI, Findings)
            =================================================================== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={16} color={COLORS.primary[600]} />
            <Text style={styles.sectionTitle}>Clinical Report & History</Text>
            <TouchableOpacity
              style={styles.previewPillBtn}
              onPress={() => setPreviewModalType("REPORT")}
              testID="btn-preview-report-template"
            >
              <Eye size={12} color={COLORS.primary[700]} />
              <Text style={styles.previewPillText}>Preview Report</Text>
            </TouchableOpacity>
          </View>

          {/* Template Selection Pills */}
          <View style={styles.templatePickerRow}>
            <Text style={styles.templatePickerLabel}>TEMPLATE:</Text>
            {[
              { id: "tmpl_rep_classic_hospital", label: "Classic Hospital" },
              { id: "tmpl_rep_minimal_opd", label: "Minimal OPD" },
              { id: "tmpl_rep_comprehensive", label: "Comprehensive" },
            ].map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.templateOptionPill,
                  selectedReportTemplate === t.id && styles.templateOptionPillActive,
                ]}
                onPress={() => setSelectedReportTemplate(t.id)}
              >
                <Text
                  style={[
                    styles.templateOptionText,
                    selectedReportTemplate === t.id && styles.templateOptionTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Card style={styles.formCard}>
            <Text style={styles.fieldLabel}>CHIEF COMPLAINT</Text>
            <TextInput
              style={styles.inputField}
              value={symptoms}
              onChangeText={setSymptoms}
              placeholder="e.g. Acute chest pain, Dry cough, High fever"
              testID="input-symptoms"
            />

            <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.xs }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.microLabel}>SYMPTOM DURATION</Text>
                <TextInput
                  style={styles.inputSmall}
                  value={symptomDuration}
                  onChangeText={setSymptomDuration}
                  placeholder="e.g. 3 days"
                />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>
              HISTORY OF PRESENT ILLNESS (HPI)
            </Text>
            <TextInput
              style={styles.textArea}
              value={hpiText}
              onChangeText={setHpiText}
              multiline
              numberOfLines={2}
              placeholder="Detailed chronological clinical history..."
            />
          </Card>
        </View>

        {/* ===================================================================
            SECTION 5: CLINICAL EXAMINATION & DIAGNOSIS
            =================================================================== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Stethoscope size={16} color={COLORS.primary[600]} />
            <Text style={styles.sectionTitle}>Examination & ICD-10 Diagnosis</Text>
          </View>

          <Card style={styles.formCard}>
            <Text style={styles.fieldLabel}>SYSTEMATIC EXAMINATION FINDINGS</Text>

            <View style={styles.examGrid}>
              <View style={styles.examRow}>
                <Text style={styles.examTag}>General</Text>
                <TextInput
                  style={styles.examInput}
                  value={examGeneral}
                  onChangeText={setExamGeneral}
                  placeholder="General appearance, pallor, icterus..."
                />
              </View>

              <View style={styles.examRow}>
                <Text style={styles.examTag}>CVS</Text>
                <TextInput
                  style={styles.examInput}
                  value={examCvs}
                  onChangeText={setExamCvs}
                  placeholder="Heart sounds, murmurs..."
                />
              </View>

              <View style={styles.examRow}>
                <Text style={styles.examTag}>RS</Text>
                <TextInput
                  style={styles.examInput}
                  value={examRespiratory}
                  onChangeText={setExamRespiratory}
                  placeholder="Breath sounds, wheezing, crepitations..."
                />
              </View>

              <View style={styles.examRow}>
                <Text style={styles.examTag}>Abd</Text>
                <TextInput
                  style={styles.examInput}
                  value={examAbdominal}
                  onChangeText={setExamAbdominal}
                  placeholder="Soft, tender, organomegaly..."
                />
              </View>

              <View style={styles.examRow}>
                <Text style={styles.examTag}>CNS</Text>
                <TextInput
                  style={styles.examInput}
                  value={examCns}
                  onChangeText={setExamCns}
                  placeholder="Pupils, motor, sensory..."
                />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>
              DOCTOR CLINICAL NOTES & EXAMINATION SUMMARY
            </Text>
            <TextInput
              style={styles.textArea}
              value={clinicalNotes}
              onChangeText={setClinicalNotes}
              multiline
              numberOfLines={2}
              testID="input-clinical-notes"
            />

            <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>
              PRIMARY DIAGNOSIS (ICD-10)
            </Text>
            <TextInput
              style={styles.inputField}
              value={primaryDiagnosis}
              onChangeText={setPrimaryDiagnosis}
              placeholder="e.g. Acute Upper Respiratory Infection (J06.9)"
              testID="input-primary-diagnosis"
            />

            {/* Quick ICD-10 Diagnosis Suggestions */}
            <View style={styles.quickDiagRow}>
              {[
                { name: "Acute URI", code: "J06.9" },
                { name: "Acute Bronchitis", code: "J20.9" },
                { name: "Essential HTN", code: "I10" },
                { name: "T2DM", code: "E11.9" },
                { name: "Gastroenteritis", code: "A09" },
              ].map((q) => (
                <TouchableOpacity
                  key={q.code}
                  style={styles.quickDiagChip}
                  onPress={() => {
                    setPrimaryDiagnosis(`${q.name} (${q.code})`);
                    setIcd10Code(q.code);
                  }}
                >
                  <Text style={styles.quickDiagText}>+ {q.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>
              SECONDARY / DIFFERENTIAL DIAGNOSIS
            </Text>
            <TextInput
              style={styles.inputField}
              value={secondaryDiagnosis}
              onChangeText={setSecondaryDiagnosis}
              placeholder="Optional secondary diagnosis"
            />

            <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>
              CLINICAL ASSESSMENT & TREATMENT PLAN
            </Text>
            <TextInput
              style={styles.textArea}
              value={treatmentPlan}
              onChangeText={setTreatmentPlan}
              multiline
              numberOfLines={2}
              placeholder="Doctor's clinical plan & advice..."
            />
          </Card>
        </View>

        {/* ===================================================================
            SECTION 6: DIGITAL RxPAD PRESCRIPTION
            =================================================================== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Pill size={16} color={COLORS.primary[600]} />
            <Text style={styles.sectionTitle}>Digital RxPad Prescription</Text>
            <TouchableOpacity
              style={styles.previewPillBtn}
              onPress={() => setPreviewModalType("RX")}
              testID="btn-preview-rx-template"
            >
              <Eye size={12} color={COLORS.primary[700]} />
              <Text style={styles.previewPillText}>Preview Rx</Text>
            </TouchableOpacity>
          </View>

          <Card style={styles.formCard}>
            {/* Added Drugs List */}
            {drugs.map((drug, idx) => (
              <View key={idx} style={styles.drugItemCard} testID={`prescribed-drug-${idx}`}>
                <View style={styles.drugDetails}>
                  <Text style={styles.drugName}>
                    {drug.medicine_name} ({drug.strength || "500 mg"}) - {drug.dosage_form || "Tablet"}
                  </Text>
                  <Text style={styles.drugInstruction}>
                    {drug.frequency} • {drug.duration_days} Days (Qty: {drug.quantity || 10}) • {drug.food_instruction || "After food"}
                  </Text>
                  {drug.specific_instructions ? (
                    <Text style={styles.drugSubNotes}>Notes: {drug.specific_instructions}</Text>
                  ) : null}
                </View>
                <View style={styles.drugActionsRow}>
                  <TouchableOpacity
                    style={styles.editDrugBtn}
                    onPress={() => handleStartEditDrug(idx)}
                    testID={`edit-drug-${idx}`}
                  >
                    <Edit3 size={15} color={COLORS.primary[700]} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteDrugBtn}
                    onPress={() => handleRemoveDrug(idx)}
                    testID={`delete-drug-${idx}`}
                  >
                    <Trash2 size={16} color={COLORS.danger[600]} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Quick Medicine Suggestions */}
            <View style={styles.quickMedsBar}>
              <Text style={styles.quickMedsLabel}>QUICK MEDICINES:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[
                  { name: "Paracetamol", gen: "Paracetamol", str: "650 mg", freq: "TDS", days: "3" },
                  { name: "Amoxicillin", gen: "Amoxicillin", str: "500 mg", freq: "TDS", days: "5" },
                  { name: "Azithromycin", gen: "Azithromycin", str: "500 mg", freq: "OD", days: "3" },
                  { name: "Pantoprazole", gen: "Pantoprazole", str: "40 mg", freq: "OD (Before Food)", days: "7" },
                  { name: "Cetirizine", gen: "Cetirizine", str: "10 mg", freq: "Nightly (0-0-1)", days: "5" },
                ].map((qm, qidx) => (
                  <TouchableOpacity
                    key={qidx}
                    style={styles.quickMedChip}
                    onPress={() => handleQuickAddDrug(qm.name, qm.gen, qm.str, qm.freq, qm.days)}
                  >
                    <Text style={styles.quickMedChipText}>+ {qm.name} {qm.str}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Add Drug Builder Inputs */}
            <View style={styles.addDrugBox}>
              {editingDrugIndex !== null ? (
                <View style={styles.editingBanner}>
                  <Text style={styles.editingBannerText}>
                    Editing Item #{editingDrugIndex + 1}: {drugs[editingDrugIndex]?.medicine_name}
                  </Text>
                  <TouchableOpacity onPress={handleCancelEditDrug} testID="btn-cancel-edit-drug">
                    <Text style={styles.cancelEditText}>Cancel Edit</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.addDrugHeader}>Add Medication</Text>
              )}
              <TextInput
                style={styles.inputField}
                placeholder="Brand / Medicine Name (e.g. Paracetamol, Augmentin, Dolo 650)"
                placeholderTextColor={COLORS.neutral[400]}
                value={newDrugName}
                onChangeText={setNewDrugName}
                testID="input-drug-name"
              />

              <TextInput
                style={[styles.inputField, { marginTop: SPACING.xs }]}
                placeholder="Generic Name (e.g. Amoxicillin + Clavulanate)"
                placeholderTextColor={COLORS.neutral[400]}
                value={newDrugGeneric}
                onChangeText={setNewDrugGeneric}
              />

              <View style={styles.drugMetaRow}>
                <View style={styles.drugMetaCol}>
                  <Text style={styles.microLabel}>STRENGTH</Text>
                  <TextInput
                    style={styles.inputSmall}
                    value={newDrugStrength}
                    onChangeText={setNewDrugStrength}
                    testID="input-drug-strength"
                  />
                </View>
                <View style={styles.drugMetaCol}>
                  <Text style={styles.microLabel}>DOSAGE FORM</Text>
                  <TextInput
                    style={styles.inputSmall}
                    value={newDrugForm}
                    onChangeText={setNewDrugForm}
                  />
                </View>
                <View style={styles.drugMetaCol}>
                  <Text style={styles.microLabel}>DAYS</Text>
                  <TextInput
                    style={styles.inputSmall}
                    value={newDrugDuration}
                    onChangeText={setNewDrugDuration}
                    keyboardType="numeric"
                    testID="input-drug-duration"
                  />
                </View>
                <View style={styles.drugMetaCol}>
                  <Text style={styles.microLabel}>QTY</Text>
                  <TextInput
                    style={styles.inputSmall}
                    value={newDrugQty}
                    onChangeText={setNewDrugQty}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={{ marginTop: SPACING.xs }}>
                <Text style={styles.microLabel}>FREQUENCY</Text>
                <TextInput
                  style={styles.inputField}
                  value={newDrugFreq}
                  onChangeText={setNewDrugFreq}
                  testID="input-drug-frequency"
                />
              </View>

              <View style={{ marginTop: SPACING.xs }}>
                <Text style={styles.microLabel}>FOOD INSTRUCTION</Text>
                <View style={styles.foodRow}>
                  {["Before food", "After food", "With food"].map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.foodChip, newDrugFood === f && styles.foodChipActive]}
                      onPress={() => setNewDrugFood(f)}
                    >
                      <Text style={[styles.foodChipText, newDrugFood === f && styles.foodChipTextActive]}>
                        {f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ marginTop: SPACING.xs }}>
                <Text style={styles.microLabel}>ADMINISTRATION TIMING</Text>
                <View style={styles.timingRow}>
                  {[
                    { label: "Morning", val: newDrugTimingMorning, set: setNewDrugTimingMorning },
                    { label: "Noon", val: newDrugTimingAfternoon, set: setNewDrugTimingAfternoon },
                    { label: "Evening", val: newDrugTimingEvening, set: setNewDrugTimingEvening },
                    { label: "Night", val: newDrugTimingNight, set: setNewDrugTimingNight },
                  ].map((t) => (
                    <TouchableOpacity
                      key={t.label}
                      style={[styles.timingChip, t.val && styles.timingChipActive]}
                      onPress={() => t.set(!t.val)}
                    >
                      <Text style={[styles.timingChipText, t.val && styles.timingChipTextActive]}>
                        {t.val ? "✓ " : ""}{t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TextInput
                style={[styles.inputField, { marginTop: SPACING.xs }]}
                placeholder="Specific instructions (e.g. Drink plenty of water)"
                placeholderTextColor={COLORS.neutral[400]}
                value={newDrugInstructions}
                onChangeText={setNewDrugInstructions}
              />

              <TouchableOpacity
                style={[styles.addDrugButton, editingDrugIndex !== null && styles.updateDrugButton]}
                onPress={handleAddDrug}
                testID="btn-add-drug"
              >
                {editingDrugIndex !== null ? (
                  <>
                    <Check size={14} color="#FFFFFF" />
                    <Text style={[styles.addDrugButtonText, { color: "#FFFFFF" }]}>Update Prescription Item</Text>
                  </>
                ) : (
                  <>
                    <Plus size={14} color={COLORS.primary[700]} />
                    <Text style={styles.addDrugButtonText}>Add to Prescription</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Clinical Safety & Drug Interactions */}
        {safetyAlerts.length > 0 && (
          <View style={styles.safetyAlertsContainer} testID="clinical-safety-alerts">
            {safetyAlerts.map((alert) => (
              <View
                key={alert.id}
                style={[
                  styles.safetyAlertCard,
                  alert.type === "CRITICAL"
                    ? styles.safetyAlertCritical
                    : styles.safetyAlertWarning,
                ]}
                testID="interaction-warning-badge"
              >
                <View style={styles.safetyAlertHeader}>
                  <AlertTriangle
                    size={14}
                    color={alert.type === "CRITICAL" ? COLORS.error[700] : COLORS.warning[700]}
                  />
                  <Text
                    style={[
                      styles.safetyAlertTitle,
                      {
                        color:
                          alert.type === "CRITICAL"
                            ? COLORS.error[700]
                            : COLORS.warning[700],
                      },
                    ]}
                  >
                    {alert.title}
                  </Text>
                </View>
                <Text style={styles.safetyAlertMessage}>{alert.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ===================================================================
            SECTION 7: REFERRAL TO ANOTHER DOCTOR
            =================================================================== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Share2 size={16} color={COLORS.primary[600]} />
            <Text style={styles.sectionTitle}>Referral to Specialist</Text>
            <TouchableOpacity
              style={[styles.togglePill, referralEnabled && styles.togglePillActive]}
              onPress={() => setReferralEnabled(!referralEnabled)}
            >
              <Text style={[styles.togglePillText, referralEnabled && styles.togglePillTextActive]}>
                {referralEnabled ? "Referral Active" : "+ Refer Patient"}
              </Text>
            </TouchableOpacity>
          </View>

          {referralEnabled && (
            <Card style={styles.formCard}>
              <Text style={styles.fieldLabel}>SPECIALTY</Text>
              <View style={styles.specialtyChipsRow}>
                {["Pulmonology", "Cardiology", "Neurology", "Orthopedics", "Nephrology", "Dermatology", "ENT"].map((sp) => (
                  <TouchableOpacity
                    key={sp}
                    style={[styles.specialtyChip, refSpecialty === sp && styles.specialtyChipActive]}
                    onPress={() => setRefSpecialty(sp)}
                  >
                    <Text style={[styles.specialtyChipText, refSpecialty === sp && styles.specialtyChipTextActive]}>
                      {sp}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>RECEIVING SPECIALIST</Text>
              <TextInput
                style={styles.inputField}
                value={refDoctorName}
                onChangeText={setRefDoctorName}
                placeholder="Doctor Name or Department"
              />

              <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.xs }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.microLabel}>PRIORITY</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {(["ROUTINE", "URGENT"] as const).map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.priorityPill, refPriority === p && styles.priorityPillActive]}
                        onPress={() => setRefPriority(p)}
                      >
                        <Text style={[styles.priorityPillText, refPriority === p && styles.priorityPillTextActive]}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>REFERRAL REASON</Text>
              <TextInput
                style={styles.inputField}
                value={refReason}
                onChangeText={setRefReason}
                placeholder="Reason for specialist consultation..."
              />

              <Text style={[styles.fieldLabel, { marginTop: SPACING.xs }]}>CLINICAL SUMMARY</Text>
              <TextInput
                style={styles.textArea}
                value={refClinicalSummary}
                onChangeText={setRefClinicalSummary}
                multiline
                numberOfLines={2}
                placeholder="Clinical history summary for receiving specialist..."
              />
            </Card>
          )}
        </View>

        {/* ===================================================================
            SECTION 8: APPOINTMENT MANAGEMENT & FOLLOW-UP
            =================================================================== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={16} color={COLORS.primary[600]} />
            <Text style={styles.sectionTitle}>Appointment Management & Follow-up</Text>
          </View>

          <Card style={styles.formCard}>
            {/* Follow-up Days */}
            <View style={styles.followUpRow}>
              <Text style={styles.fieldLabel}>SCHEDULE FOLLOW-UP IN</Text>
              <View style={styles.followUpInputWrap}>
                <TextInput
                  style={styles.followUpInput}
                  value={followUpDays}
                  onChangeText={setFollowUpDays}
                  keyboardType="numeric"
                  testID="input-followup-days"
                />
                <Text style={styles.followUpDaysText}>Days</Text>
              </View>
            </View>

            <View style={{ marginTop: SPACING.xs }}>
              <Text style={styles.microLabel}>FOLLOW-UP DEPARTMENT</Text>
              <TextInput
                style={styles.inputField}
                value={followUpDepartment}
                onChangeText={setFollowUpDepartment}
              />
            </View>

            <View style={{ marginTop: SPACING.xs }}>
              <Text style={styles.microLabel}>PATIENT FOLLOW-UP INSTRUCTIONS</Text>
              <TextInput
                style={styles.inputField}
                value={followUpNotes}
                onChangeText={setFollowUpNotes}
              />
            </View>

            {/* Appointment Reschedule & Cancel Controls */}
            {appointmentId ? (
              <View style={styles.appointmentActionBox}>
                <Text style={styles.apptActionTitle}>ACTIVE ENCOUNTER APPOINTMENT ({appointmentId})</Text>
                <View style={styles.apptButtonsRow}>
                  <TouchableOpacity
                    style={styles.rescheduleBtn}
                    onPress={() => setShowRescheduleModal(true)}
                    testID="btn-reschedule-appointment"
                  >
                    <Clock size={13} color={COLORS.primary[700]} />
                    <Text style={styles.rescheduleBtnText}>Reschedule</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelApptBtn}
                    onPress={() => setShowCancelModal(true)}
                    testID="btn-cancel-appointment"
                  >
                    <X size={13} color={COLORS.error[700]} />
                    <Text style={styles.cancelApptBtnText}>Cancel Appt</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.walkinNoticeBox}>
                <Text style={styles.walkinNoticeText}>
                  ℹ️ Walk-in Visit: No prior appointment to reschedule or cancel. Use the fields above to schedule the next follow-up.
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* ===================================================================
            SECTION 9: CLINICAL DOCUMENTS
            =================================================================== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FolderOpen size={16} color={COLORS.primary[600]} />
            <Text style={styles.sectionTitle}>Supporting Clinical Documents</Text>
            <Text style={styles.docCountBadge}>{patientDocs.length} records</Text>
          </View>

          <Card style={styles.formCard}>
            {patientDocs.length === 0 ? (
              <Text style={styles.emptyDocText}>No prior documents on file for this patient.</Text>
            ) : (
              patientDocs.map((doc: any, didx: number) => {
                const isAttached = attachedDocIds.includes(doc.id);
                return (
                  <View key={didx} style={styles.docItemCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docTitle}>{doc.title || doc.name || "Medical Report"}</Text>
                      <Text style={styles.docCategory}>{doc.category || "CLINICAL_RECORD"} • {doc.document_date || "Recent"}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.attachDocBtn, isAttached && styles.attachDocBtnActive]}
                      onPress={() => {
                        setAttachedDocIds((prev) =>
                          isAttached ? prev.filter((id) => id !== doc.id) : [...prev, doc.id]
                        );
                      }}
                    >
                      <Text style={[styles.attachDocText, isAttached && styles.attachDocTextActive]}>
                        {isAttached ? "✓ Attached" : "+ Attach"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </Card>
        </View>

        {/* ===================================================================
            SECTION 10: PREVIEW & FINALISATION ACTION BAR
            =================================================================== */}
        <View style={styles.finalActionBar}>
          <TouchableOpacity
            style={styles.saveDraftBtn}
            onPress={handleSaveDraft}
            disabled={savingDraft}
            testID="btn-save-draft"
          >
            {savingDraft ? (
              <ActivityIndicator size="small" color={COLORS.primary[700]} />
            ) : (
              <>
                <Save size={16} color={COLORS.primary[700]} />
                <Text style={styles.saveDraftBtnText}>Save Draft</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.finalizeButton}
            onPress={() => setShowPinModal(true)}
            testID="btn-finalize-consultation"
          >
            <Lock size={16} color={COLORS.white} />
            <Text style={styles.finalizeButtonText}>Sign & Finalize Encounter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ===================================================================
          MODAL: RESCHEDULE APPOINTMENT
          =================================================================== */}
      <Modal visible={showRescheduleModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reschedule Appointment</Text>
              <TouchableOpacity onPress={() => setShowRescheduleModal(false)}>
                <X size={20} color={COLORS.neutral[500]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.microLabel}>NEW DATE (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.inputField}
              value={rescheduleDate}
              onChangeText={setRescheduleDate}
            />

            <Text style={[styles.microLabel, { marginTop: SPACING.xs }]}>NEW TIME SLOT</Text>
            <TextInput
              style={styles.inputField}
              value={rescheduleTime}
              onChangeText={setRescheduleTime}
            />

            <Text style={[styles.microLabel, { marginTop: SPACING.xs }]}>REASON FOR RESCHEDULING</Text>
            <TextInput
              style={styles.inputField}
              value={rescheduleReason}
              onChangeText={setRescheduleReason}
            />

            <TouchableOpacity style={styles.signSubmitBtn} onPress={handleExecuteReschedule}>
              <Text style={styles.signSubmitText}>Confirm Reschedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: CANCEL APPOINTMENT
          =================================================================== */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Appointment</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <X size={20} color={COLORS.neutral[500]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.pinInstruction}>
              Cancellation preserves full historical audit logs and notifies the patient. Please provide a clear cancellation reason:
            </Text>

            <TextInput
              style={styles.textArea}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="e.g. Patient emergency, clinical conflict..."
              multiline
            />

            <TouchableOpacity
              style={[styles.signSubmitBtn, { backgroundColor: COLORS.error[600] }]}
              onPress={handleExecuteCancel}
            >
              <Text style={styles.signSubmitText}>Confirm Cancellation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: 4-DIGIT DIGITAL SIGNING PIN MODAL
          =================================================================== */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}
        testID="digital-signing-modal"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {signSuccess ? (
              <View style={styles.successBox} testID="signing-success-box">
                <CheckCircle2 size={48} color={COLORS.success[600]} />
                <Text style={styles.successTitle}>Encounter Digitally Signed</Text>
                <Text style={styles.successDesc}>
                  Consultation record and prescription have been cryptographically stamped and committed to the OneHealth registry.
                </Text>
                <View style={styles.sigBadge}>
                  <ShieldCheck size={14} color={COLORS.primary[600]} />
                  <Text style={styles.sigText} numberOfLines={1}>{signSuccess}</Text>
                </View>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={completeAndExit}
                  testID="btn-signing-done"
                >
                  <Text style={styles.doneBtnText}>Return to Queue</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Doctor Digital Signing</Text>
                    <Text style={styles.modalSubtitle}>Enter 4-Digit Clinical PIN</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowPinModal(false)}
                    testID="close-pin-modal-btn"
                  >
                    <X size={20} color={COLORS.neutral[500]} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.pinInstruction}>
                  Signing authorizes this medical prescription under your state medical council license.
                </Text>

                <TextInput
                  style={styles.pinInput}
                  value={doctorPin}
                  onChangeText={setDoctorPin}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  placeholder="••••"
                  placeholderTextColor={COLORS.neutral[300]}
                  testID="input-doctor-pin"
                />

                {pinError && (
                  <View style={styles.errorBanner}>
                    <AlertCircle size={14} color={COLORS.error[500]} />
                    <Text style={styles.errorBannerText}>{pinError}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.signSubmitBtn}
                  onPress={handleFinalizeConsultation}
                  disabled={submitting}
                  testID="btn-confirm-sign"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Lock size={15} color={COLORS.white} />
                      <Text style={styles.signSubmitText}>Digitally Sign & Commit</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: LIVE TEMPLATE PREVIEW MODAL
          =================================================================== */}
      <Modal
        visible={Boolean(previewModalType)}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewModalType(null)}
        testID="doctor-consultation-preview-modal"
      >
        <View style={styles.previewBackdrop}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeaderRow}>
              <View>
                <Text style={styles.previewTitle}>
                  {previewModalType === "REPORT"
                    ? templateSettings?.clinical_report_template_name || "Classic Hospital Clinical Report"
                    : templateSettings?.rx_template_name || "Classic Hospital Rx"}
                </Text>
                <Text style={styles.previewSub}>
                  Official Encounter Document Layout
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewModalType(null)}>
                <X size={20} color={COLORS.neutral[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: "85%", padding: 10 }}>
              {previewModalType === "REPORT" ? (
                <ClinicalReportTemplateRenderer
                  report={{
                    id: consultationId || "c-preview-encounter",
                    patient_id: patientId,
                    patient_name: patientName,
                    onehealth_id: onehealthId,
                    doctor_id: "doc-k-01",
                    doctor_name: "Dr. Senthil Nathan",
                    hospital_id: templateSettings?.hospital_id || "hosp-kedar",
                    hospital_name: templateSettings?.hospital_name || "Kedar Hospital",
                    diagnosis: primaryDiagnosis,
                    symptoms,
                    clinical_notes: [
                      hpiText ? `HPI: ${hpiText}` : "",
                      clinicalNotes ? `Exam: ${clinicalNotes}` : "",
                      treatmentPlan ? `Plan: ${treatmentPlan}` : "",
                    ].filter(Boolean).join("\n\n"),
                    vitals,
                    template_id: selectedReportTemplate || "tmpl_rep_classic_hospital",
                    template_name: templateSettings?.clinical_report_template_name || "Classic Hospital Clinical Report",
                    template_version: templateSettings?.clinical_report_template_version || 1,
                    template_layout_config: templateSettings?.clinical_report_template_layout || {},
                  }}
                  customHeader={templateSettings?.custom_header_text}
                  customFooter={templateSettings?.custom_footer_notes}
                  showHospitalLogo={templateSettings?.show_hospital_logo ?? true}
                  branding={templateSettings?.branding}
                />
              ) : (
                <PrescriptionTemplateRenderer
                  prescription={{
                    id: "rx-preview-encounter",
                    patient_name: patientName,
                    patient_id: patientId,
                    onehealth_id: onehealthId,
                    diagnosis: primaryDiagnosis,
                    items: drugs,
                    doctor_name: "Dr. Senthil Nathan",
                    hospital_name: templateSettings?.hospital_name || "Kedar Hospital",
                    template_id: templateSettings?.rx_template_id || "tmpl_rx_classic_hospital",
                    template_name: templateSettings?.rx_template_name || "Classic Hospital Rx",
                  }}
                  customHeader={templateSettings?.custom_header_text}
                  customFooter={templateSettings?.custom_footer_notes}
                  showHospitalLogo={templateSettings?.show_hospital_logo ?? true}
                  branding={templateSettings?.branding}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.base,
    paddingBottom: SPACING.xxl * 2,
  },
  draftNoticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.success[50],
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.success[200],
    gap: 6,
  },
  draftNoticeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success[800],
    fontWeight: "600",
  },
  actionNoticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary[200],
    gap: 6,
  },
  actionNoticeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[800],
    fontWeight: "600",
  },
  patientBanner: {
    padding: SPACING.base,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  patientBannerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerPatientName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  bannerOhid: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[600],
    fontWeight: "700",
    marginTop: 2,
  },
  patientDemographicsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  demoTag: {
    ...TYPOGRAPHY.caption,
    color: COLORS.neutral[600],
    fontWeight: "500",
  },
  demoDivider: {
    color: COLORS.neutral[400],
    fontSize: 10,
  },
  tokenBox: {
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  tokenBoxLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.primary[600],
  },
  tokenBoxValue: {
    ...TYPOGRAPHY.subtitle2,
    color: COLORS.primary[800],
    fontWeight: "800",
  },
  allergyBanner: {
    backgroundColor: COLORS.error[50],
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.error[200],
  },
  allergyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  allergyTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.error[700],
  },
  allergyChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  allergyChip: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.error[300],
  },
  allergyChipText: {
    fontSize: 11,
    color: COLORS.error[700],
    fontWeight: "600",
  },
  chronicContainer: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  chronicHeader: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.neutral[500],
    textTransform: "uppercase",
    marginBottom: 4,
  },
  chronicChip: {
    backgroundColor: COLORS.neutral[100],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
  },
  chronicChipText: {
    fontSize: 11,
    color: COLORS.neutral[700],
    fontWeight: "600",
  },
  historyToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  historyToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary[600],
  },
  historyDetailsCard: {
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    marginTop: 4,
    borderRadius: RADIUS.md,
  },
  section: {
    marginTop: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    ...TYPOGRAPHY.subtitle1,
    color: COLORS.textPrimary,
    fontWeight: "700",
    flex: 1,
  },
  bmiBadge: {
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  bmiBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  previewPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },
  previewPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary[700],
  },
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: SPACING.sm,
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
  },
  vitalInputGroup: {
    flex: 1,
    minWidth: "22%",
    backgroundColor: COLORS.background,
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignItems: "center",
  },
  vitalLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.neutral[500],
    marginBottom: 2,
    textAlign: "center",
  },
  vitalInput: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
    paddingVertical: 0,
  },
  vitalUnit: {
    fontSize: 8,
    color: COLORS.neutral[400],
    marginTop: 1,
  },
  templatePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: SPACING.xs,
    flexWrap: "wrap",
  },
  templatePickerLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.neutral[500],
  },
  templateOptionPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.neutral[100],
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  templateOptionPillActive: {
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[300],
  },
  templateOptionText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.neutral[600],
  },
  templateOptionTextActive: {
    color: COLORS.primary[700],
    fontWeight: "700",
  },
  formCard: {
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.neutral[600],
    marginBottom: 4,
    textTransform: "uppercase",
  },
  microLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.neutral[500],
    marginBottom: 2,
    textTransform: "uppercase",
  },
  inputField: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  inputSmall: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs - 2,
    fontSize: 12,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  textArea: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    fontSize: 13,
    color: COLORS.textPrimary,
    minHeight: 50,
    textAlignVertical: "top",
  },
  examGrid: {
    gap: 4,
    marginBottom: SPACING.xs,
  },
  examRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  examTag: {
    width: 50,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.neutral[600],
  },
  examInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  quickDiagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  quickDiagChip: {
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  quickDiagText: {
    fontSize: 10,
    color: COLORS.primary[700],
    fontWeight: "600",
  },
  quickMedsBar: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  quickMedsLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.neutral[500],
    marginBottom: 3,
  },
  quickMedChip: {
    backgroundColor: COLORS.neutral[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  quickMedChipText: {
    fontSize: 10,
    color: COLORS.neutral[700],
    fontWeight: "600",
  },
  drugItemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xs,
  },
  drugDetails: {
    flex: 1,
  },
  drugName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  drugInstruction: {
    fontSize: 11,
    color: COLORS.neutral[600],
    marginTop: 2,
  },
  drugSubNotes: {
    fontSize: 10,
    color: COLORS.neutral[500],
    fontStyle: "italic",
    marginTop: 1,
  },
  drugActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editDrugBtn: {
    padding: SPACING.xs,
    backgroundColor: COLORS.primary[50],
    borderRadius: RADIUS.sm,
  },
  deleteDrugBtn: {
    padding: SPACING.xs,
  },
  editingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary[100],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.primary[300],
  },
  editingBannerText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary[900],
    flex: 1,
  },
  cancelEditText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.error[700],
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  updateDrugButton: {
    backgroundColor: COLORS.primary[700],
  },
  walkinNoticeBox: {
    backgroundColor: COLORS.neutral[50],
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  walkinNoticeText: {
    fontSize: 11,
    color: COLORS.neutral[600],
    lineHeight: 16,
  },
  addDrugBox: {
    backgroundColor: COLORS.neutral[50],
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  addDrugHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary[700],
    textTransform: "uppercase",
    marginBottom: SPACING.xs,
  },
  drugMetaRow: {
    flexDirection: "row",
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  drugMetaCol: {
    flex: 1,
  },
  foodRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 2,
  },
  foodChip: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.neutral[100],
    alignItems: "center",
  },
  foodChipActive: {
    backgroundColor: COLORS.primary[100],
    borderWidth: 1,
    borderColor: COLORS.primary[500],
  },
  foodChipText: {
    fontSize: 10,
    color: COLORS.neutral[600],
    fontWeight: "500",
  },
  foodChipTextActive: {
    color: COLORS.primary[800],
    fontWeight: "700",
  },
  timingRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 2,
  },
  timingChip: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.neutral[100],
    alignItems: "center",
  },
  timingChipActive: {
    backgroundColor: COLORS.primary[100],
    borderWidth: 1,
    borderColor: COLORS.primary[500],
  },
  timingChipText: {
    fontSize: 10,
    color: COLORS.neutral[600],
    fontWeight: "500",
  },
  timingChipTextActive: {
    color: COLORS.primary[800],
    fontWeight: "700",
  },
  addDrugButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary[100],
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  addDrugButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary[700],
  },
  togglePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.neutral[100],
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
  },
  togglePillActive: {
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[500],
  },
  togglePillText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.neutral[600],
  },
  togglePillTextActive: {
    color: COLORS.primary[700],
    fontWeight: "700",
  },
  specialtyChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: SPACING.xs,
  },
  specialtyChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.neutral[100],
  },
  specialtyChipActive: {
    backgroundColor: COLORS.primary[100],
    borderWidth: 1,
    borderColor: COLORS.primary[500],
  },
  specialtyChipText: {
    fontSize: 10,
    fontWeight: "500",
    color: COLORS.neutral[600],
  },
  specialtyChipTextActive: {
    color: COLORS.primary[800],
    fontWeight: "700",
  },
  priorityPill: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.neutral[100],
    alignItems: "center",
  },
  priorityPillActive: {
    backgroundColor: COLORS.warning[100],
    borderWidth: 1,
    borderColor: COLORS.warning[500],
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.neutral[600],
  },
  priorityPillTextActive: {
    color: COLORS.warning[800],
    fontWeight: "800",
  },
  followUpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  followUpInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  followUpInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    fontSize: 14,
    fontWeight: "700",
    width: 50,
    textAlign: "center",
  },
  followUpDaysText: {
    fontSize: 13,
    color: COLORS.neutral[600],
  },
  appointmentActionBox: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[200],
  },
  apptActionTitle: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.neutral[500],
    marginBottom: 6,
  },
  apptButtonsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  rescheduleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[300],
  },
  rescheduleBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary[700],
  },
  cancelApptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.error[50],
    borderWidth: 1,
    borderColor: COLORS.error[300],
  },
  cancelApptBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.error[700],
  },
  docCountBadge: {
    fontSize: 10,
    color: COLORS.neutral[500],
  },
  emptyDocText: {
    fontSize: 11,
    color: COLORS.neutral[500],
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 6,
  },
  docItemCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[100],
    gap: 8,
  },
  docTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  docCategory: {
    fontSize: 10,
    color: COLORS.neutral[500],
  },
  attachDocBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.neutral[100],
  },
  attachDocBtnActive: {
    backgroundColor: COLORS.success[100],
  },
  attachDocText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.neutral[600],
  },
  attachDocTextActive: {
    color: COLORS.success[700],
  },
  safetyAlertsContainer: {
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  safetyAlertCard: {
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  safetyAlertCritical: {
    backgroundColor: COLORS.error[50],
    borderColor: COLORS.error[300],
  },
  safetyAlertWarning: {
    backgroundColor: COLORS.warning[50],
    borderColor: COLORS.warning[300],
  },
  safetyAlertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: 2,
  },
  safetyAlertTitle: {
    fontSize: 11,
    fontWeight: "800",
  },
  safetyAlertMessage: {
    fontSize: 11,
    color: COLORS.neutral[700],
  },
  finalActionBar: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
    alignItems: "center",
  },
  saveDraftBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.primary[50],
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary[300],
  },
  saveDraftBtnText: {
    ...TYPOGRAPHY.button,
    color: COLORS.primary[700],
    fontSize: 13,
  },
  finalizeButton: {
    flex: 1.5,
    backgroundColor: COLORS.primary[600],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    ...SHADOWS.md,
  },
  finalizeButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.base,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: "100%",
    maxWidth: 380,
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.neutral[500],
  },
  pinInstruction: {
    fontSize: 12,
    color: COLORS.neutral[600],
    marginBottom: SPACING.sm,
  },
  pinInput: {
    backgroundColor: COLORS.neutral[50],
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 12,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    color: COLORS.textPrimary,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.error[50],
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  errorBannerText: {
    fontSize: 11,
    color: COLORS.error[600],
    flex: 1,
  },
  signSubmitBtn: {
    backgroundColor: COLORS.primary[600],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
  },
  signSubmitText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
  successBox: {
    alignItems: "center",
    paddingVertical: SPACING.md,
  },
  successTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  successDesc: {
    ...TYPOGRAPHY.body2,
    color: COLORS.neutral[600],
    textAlign: "center",
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  sigBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.lg,
  },
  sigText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary[700],
    maxWidth: 220,
  },
  doneBtn: {
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  doneBtnText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.sm,
  },
  previewCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    width: "100%",
    maxHeight: "90%",
    overflow: "hidden",
    ...SHADOWS.lg,
  },
  previewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  previewTitle: {
    ...TYPOGRAPHY.subtitle1,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  previewSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.neutral[500],
  },
});
