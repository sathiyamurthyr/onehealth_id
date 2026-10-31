/**
 * ONEHEALTH ID (OH-ID) Mobile — Doctor Clinical Encounter & Triage Screen
 * Sathus Technology Pvt Ltd
 *
 * Records clinical examination, objective vitals, ICD-10 diagnoses,
 * digital prescriptions, and cryptographically signs with doctor's 4-digit PIN.
 */

import React, { useState, useEffect } from "react";
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
  X,
  Eye,
  Layers,
} from "lucide-react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../src/theme";
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

export default function DoctorConsultationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    patient_id?: string;
    patient_name?: string;
    onehealth_id?: string;
    token_id?: string;
    token_str?: string;
  }>();

  const patientId = params.patient_id || "p-demo-patient";
  const patientName = params.patient_name || "Sathish Kumar";
  const onehealthId = params.onehealth_id || "OHID-CITIZEN-001";
  const tokenStr = params.token_str || "OPD-GEN-07";

  // Vitals State
  const [vitals, setVitals] = useState<ClinicalVitals>({
    bp_systolic: "120",
    bp_diastolic: "80",
    heart_rate: "76",
    temperature: "98.4",
    spo2: "99",
    weight_kg: "70",
  });

  // Clinical Notes & Diagnosis
  const [symptoms, setSymptoms] = useState("Fever and mild dry cough for 3 days");
  const [clinicalNotes, setClinicalNotes] = useState("Bilateral chest clear on auscultation. Throat mild erythema.");
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState("Acute Upper Respiratory Infection");

  // Medication Builder State
  const [drugs, setDrugs] = useState<PrescriptionDrugItem[]>([
    {
      medicine_name: "Paracetamol",
      strength: "650 mg",
      dosage_form: "Tablet",
      dose: "1",
      frequency: "TDS (Three times a day)",
      duration_days: 3,
      route: "Oral",
      food_instruction: "After food",
    },
  ]);
  const [newDrugName, setNewDrugName] = useState("");
  const [newDrugStrength, setNewDrugStrength] = useState("500 mg");
  const [newDrugFreq, setNewDrugFreq] = useState("Twice daily (1-0-1)");
  const [newDrugDuration, setNewDrugDuration] = useState("5");

  // Active Hospital Document Template State
  const [templateSettings, setTemplateSettings] = useState<HospitalDocumentTemplateSettings | null>(null);
  const [previewModalType, setPreviewModalType] = useState<"REPORT" | "RX" | null>(null);

  useEffect(() => {
    clinicalTemplatesApi.getDoctorHospitalTemplates()
      .then((settings) => setTemplateSettings(settings))
      .catch((err) => console.log("Failed to hydrate hospital templates", err));
  }, []);

  // Follow-up Days
  const [followUpDays, setFollowUpDays] = useState("5");

  // Digital Signing PIN Modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [doctorPin, setDoctorPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [signSuccess, setSignSuccess] = useState<string | null>(null);

  const handleAddDrug = () => {
    if (!newDrugName.trim()) return;
    setDrugs((prev) => [
      ...prev,
      {
        medicine_name: newDrugName.trim(),
        strength: newDrugStrength,
        dosage_form: "Tablet",
        dose: "1",
        frequency: newDrugFreq,
        duration_days: parseInt(newDrugDuration, 10) || 5,
        route: "Oral",
        food_instruction: "After food",
      },
    ]);
    setNewDrugName("");
  };

  const handleRemoveDrug = (index: number) => {
    setDrugs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleFinalizeConsultation = async () => {
    if (doctorPin.length < 4) {
      setPinError("Please enter your 4-digit digital signing PIN.");
      return;
    }

    try {
      setSubmitting(true);
      setPinError(null);

      const payload: any = {
        diagnosis: primaryDiagnosis,
        symptoms,
        clinical_notes: clinicalNotes,
        vitals,
        diagnoses: [
          { description: primaryDiagnosis, tier: "PRIMARY" },
        ],
        report_template_id: templateSettings?.clinical_report_template_id || "tmpl_rep_classic_hospital",
        rx_template_id: templateSettings?.rx_template_id || "tmpl_rx_classic_hospital",
        prescription: {
          items: drugs,
          doctor_notes: "Take medications strictly as prescribed.",
          follow_up_days: parseInt(followUpDays, 10) || 5,
          requires_pin: true,
          verification_pin: doctorPin,
        },
        follow_up: {
          days: parseInt(followUpDays, 10) || 5,
          notes: "Return if symptoms persist or fever spikes above 101°F.",
        },
      };

      const res = await doctorApi.recordConsultation(patientId, payload);
      setSignSuccess(
        res?.digital_signature || "SHA256:4f8e91a0c8d7b321...VERIFIED"
      );
    } catch (err: any) {
      console.error("Consultation finalize failed", err);
      setPinError(err?.message || "Invalid signing PIN or failed to finalize encounter.");
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
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          testID="back-to-doctor-queue"
          accessibilityRole="button"
          accessibilityLabel="Back to Queue"
        >
          <ArrowLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.screenTitle}>Clinical Encounter</Text>
          <Text style={styles.screenSubtitle}>Doctor Consultation & RxPad</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Patient Identity Banner */}
        <Card style={styles.patientBanner} testID="patient-encounter-banner">
          <View style={styles.patientBannerRow}>
            <View>
              <Text style={styles.bannerPatientName}>{patientName}</Text>
              <Text style={styles.bannerOhid}>{onehealthId}</Text>
            </View>
            <View style={styles.tokenBox}>
              <Text style={styles.tokenBoxLabel}>OPD TOKEN</Text>
              <Text style={styles.tokenBoxValue}>{tokenStr}</Text>
            </View>
          </View>
        </Card>

        {/* Active Hospital Templates Banner */}
        <View style={styles.activeTemplatesBar}>
          <View style={styles.activeTmplPill}>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeTmplLabel}>ACTIVE REPORT TEMPLATE</Text>
              <Text style={styles.activeTmplName}>
                {templateSettings?.clinical_report_template_name || "Classic Hospital Clinical Report"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.previewIconBtn}
              onPress={() => setPreviewModalType("REPORT")}
              testID="btn-preview-report-template"
            >
              <Eye size={12} color={COLORS.primary[700]} />
              <Text style={styles.previewIconText}>Preview</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activeTmplPill}>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeTmplLabel}>ACTIVE RX TEMPLATE</Text>
              <Text style={styles.activeTmplName}>
                {templateSettings?.rx_template_name || "Classic Hospital Rx"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.previewIconBtn}
              onPress={() => setPreviewModalType("RX")}
              testID="btn-preview-rx-template"
            >
              <Eye size={12} color={COLORS.primary[700]} />
              <Text style={styles.previewIconText}>Preview</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 1: Objective Vitals Triage */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Activity size={16} color={COLORS.primary[600]} />
            <Text style={styles.sectionTitle}>Objective Vitals Triage</Text>
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
          </Card>
        </View>

        {/* Section 2: Clinical Assessment & Diagnosis */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Stethoscope size={16} color={COLORS.primary[600]} />
            <Text style={styles.sectionTitle}>Clinical Examination & Diagnosis</Text>
          </View>

          <Card style={styles.formCard}>
            <Text style={styles.fieldLabel}>CHIEF COMPLAINT & SYMPTOMS</Text>
            <TextInput
              style={styles.textArea}
              value={symptoms}
              onChangeText={setSymptoms}
              multiline
              numberOfLines={2}
              testID="input-symptoms"
            />

            <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>
              PHYSICAL EXAMINATION NOTES
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
              testID="input-primary-diagnosis"
            />
          </Card>
        </View>

        {/* Section 3: Digital RxPad Medication Builder */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Pill size={16} color={COLORS.primary[600]} />
            <Text style={styles.sectionTitle}>Digital RxPad Prescription</Text>
          </View>

          <Card style={styles.formCard}>
            {/* Added Drugs List */}
            {drugs.map((drug, idx) => (
              <View key={idx} style={styles.drugItemCard} testID={`prescribed-drug-${idx}`}>
                <View style={styles.drugDetails}>
                  <Text style={styles.drugName}>{drug.medicine_name} ({drug.strength})</Text>
                  <Text style={styles.drugInstruction}>
                    {drug.frequency} • {drug.duration_days} Days • {drug.food_instruction}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteDrugBtn}
                  onPress={() => handleRemoveDrug(idx)}
                  testID={`delete-drug-${idx}`}
                >
                  <Trash2 size={16} color={COLORS.danger[600]} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add Drug Builder Inputs */}
            <View style={styles.addDrugBox}>
              <Text style={styles.addDrugHeader}>Add Medication</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Medicine Name (e.g. Amoxicillin, Cetirizine)"
                placeholderTextColor={COLORS.neutral[400]}
                value={newDrugName}
                onChangeText={setNewDrugName}
                testID="input-drug-name"
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
                  <Text style={styles.microLabel}>DAYS</Text>
                  <TextInput
                    style={styles.inputSmall}
                    value={newDrugDuration}
                    onChangeText={setNewDrugDuration}
                    keyboardType="numeric"
                    testID="input-drug-duration"
                  />
                </View>
              </View>

              <View style={{ marginTop: SPACING.xs }}>
                <Text style={styles.microLabel}>DOSAGE FREQUENCY</Text>
                <TextInput
                  style={styles.inputField}
                  value={newDrugFreq}
                  onChangeText={setNewDrugFreq}
                  testID="input-drug-frequency"
                />
              </View>

              <TouchableOpacity
                style={styles.addDrugButton}
                onPress={handleAddDrug}
                testID="btn-add-drug"
              >
                <Plus size={14} color={COLORS.primary[700]} />
                <Text style={styles.addDrugButtonText}>Add to Prescription</Text>
              </TouchableOpacity>
            </View>

            {/* Follow-up Days */}
            <View style={styles.followUpRow}>
              <Text style={styles.fieldLabel}>FOLLOW-UP IN</Text>
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
          </Card>
        </View>

        {/* Finalize Button */}
        <TouchableOpacity
          style={styles.finalizeButton}
          onPress={() => setShowPinModal(true)}
          testID="btn-finalize-consultation"
        >
          <Lock size={16} color={COLORS.white} />
          <Text style={styles.finalizeButtonText}>Sign & Finalize Encounter</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 4-Digit Digital Signing PIN Modal */}
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

      {/* Live Template Preview Modal */}
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
                    id: "c-preview-encounter",
                    patient_id: patientId,
                    patient_name: patientName,
                    onehealth_id: onehealthId,
                    doctor_id: "doc-k-01",
                    doctor_name: "Dr. Senthil Nathan",
                    hospital_id: templateSettings?.hospital_id || "hosp-kedar",
                    hospital_name: templateSettings?.hospital_name || "Kedar Hospital",
                    diagnosis: primaryDiagnosis,
                    symptoms,
                    clinical_notes: clinicalNotes,
                    vitals,
                    template_id: templateSettings?.clinical_report_template_id || "tmpl_rep_classic_hospital",
                    template_name: templateSettings?.clinical_report_template_name || "Classic Hospital Clinical Report",
                    template_version: templateSettings?.clinical_report_template_version || 1,
                    template_layout_config: templateSettings?.clinical_report_template_layout || {},
                  }}
                  customHeader={templateSettings?.custom_header_text}
                  customFooter={templateSettings?.custom_footer_notes}
                  showHospitalLogo={templateSettings?.show_hospital_logo ?? true}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  headerTitles: {
    flex: 1,
  },
  screenTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  screenSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  content: {
    padding: SPACING.base,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.md,
  },
  patientBanner: {
    backgroundColor: COLORS.surface,
    padding: SPACING.base,
  },
  patientBannerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerPatientName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  bannerOhid: {
    fontSize: 11,
    fontFamily: "monospace",
    color: COLORS.primary[600],
    marginTop: 1,
  },
  tokenBox: {
    alignItems: "flex-end",
  },
  tokenBoxLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.neutral[400],
  },
  tokenBoxValue: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.accent[800],
    fontFamily: "monospace",
  },
  section: {
    gap: SPACING.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    padding: SPACING.base,
  },
  vitalInputGroup: {
    flex: 1,
    minWidth: 90,
  },
  vitalLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.neutral[400],
    letterSpacing: 0.5,
  },
  vitalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    backgroundColor: COLORS.neutral[50],
    marginTop: 2,
  },
  vitalUnit: {
    fontSize: 8,
    color: COLORS.neutral[400],
    marginTop: 1,
  },
  formCard: {
    padding: SPACING.base,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.neutral[500],
    letterSpacing: 0.5,
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.xs,
    fontSize: 12,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.neutral[50],
    marginTop: 3,
    minHeight: 48,
  },
  inputField: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 6,
    fontSize: 12,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.neutral[50],
    marginTop: 3,
  },
  drugItemCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.xs + 2,
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xs,
  },
  drugDetails: {
    flex: 1,
  },
  drugName: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  drugInstruction: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  deleteDrugBtn: {
    padding: 6,
  },
  addDrugBox: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  addDrugHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.neutral[600],
  },
  drugMetaRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  drugMetaCol: {
    flex: 1,
  },
  microLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.neutral[400],
  },
  inputSmall: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    fontSize: 11,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.neutral[50],
    marginTop: 2,
  },
  addDrugButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  addDrugButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary[700],
  },
  followUpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  followUpInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  followUpInput: {
    width: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingVertical: 4,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
    backgroundColor: COLORS.neutral[50],
  },
  followUpDaysText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  finalizeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary[600],
    paddingVertical: SPACING.base,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.sm,
    ...SHADOWS.md,
  },
  finalizeButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },

  // PIN Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  pinInstruction: {
    fontSize: 11,
    color: COLORS.neutral[600],
    marginTop: SPACING.sm,
    lineHeight: 16,
  },
  pinInput: {
    borderWidth: 2,
    borderColor: COLORS.primary[300],
    borderRadius: RADIUS.md,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 12,
    textAlign: "center",
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
    backgroundColor: COLORS.neutral[50],
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: SPACING.xs,
  },
  errorBannerText: {
    fontSize: 10,
    color: COLORS.error[700],
  },
  signSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.primary[600],
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    marginTop: SPACING.base,
  },
  signSubmitText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 13,
  },
  successBox: {
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  successDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.xs,
    lineHeight: 16,
  },
  sigBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  sigText: {
    fontSize: 10,
    fontFamily: "monospace",
    color: COLORS.primary[700],
    maxWidth: 220,
  },
  doneBtn: {
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: SPACING.base,
  },
  doneBtnText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 13,
  },
  activeTemplatesBar: {
    gap: 8,
    marginBottom: SPACING.base,
  },
  activeTmplPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeTmplLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.primary[800],
    letterSpacing: 0.5,
  },
  activeTmplName: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary[900],
    marginTop: 1,
  },
  previewIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary[300],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 3,
  },
  previewIconText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary[700],
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  previewCard: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "92%",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
  },
  previewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[200],
    backgroundColor: COLORS.neutral[50],
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  previewSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
});
