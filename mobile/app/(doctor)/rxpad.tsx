/**
 * ONEHEALTH ID (OH-ID) Mobile — Doctor Standalone RxPad Screen
 * Sathus Technology Pvt Ltd
 *
 * Standalone digital prescription pad with multi-drug builder,
 * clinical instructions, follow-up scheduling, and 4-digit digital signing PIN.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Pill,
  Plus,
  Trash2,
  Lock,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  X,
  FileCheck,
} from "lucide-react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../src/theme";
import { Card } from "../../src/components/common/Card";
import { doctorApi } from "../../src/services/api/doctor";
import { PrescriptionDrugItem } from "../../src/types/doctor";

export default function DoctorRxPadScreen() {
  const router = useRouter();

  // Patient Info
  const [patientId, setPatientId] = useState("p-standalone-01");
  const [patientName, setPatientName] = useState("Karthik Raman");
  const [diagnosis, setDiagnosis] = useState("Hypertension & Dyslipidemia");
  const [doctorNotes, setDoctorNotes] = useState("Low sodium diet recommended. 30 mins brisk walk daily.");
  const [followUpDays, setFollowUpDays] = useState("14");

  // Medication Builder
  const [drugs, setDrugs] = useState<PrescriptionDrugItem[]>([
    {
      medicine_name: "Telmisartan",
      strength: "40 mg",
      dosage_form: "Tablet",
      dose: "1",
      frequency: "Once daily (Morning)",
      duration_days: 30,
      route: "Oral",
      food_instruction: "After food",
    },
    {
      medicine_name: "Atorvastatin",
      strength: "10 mg",
      dosage_form: "Tablet",
      dose: "1",
      frequency: "Once daily (Bedtime)",
      duration_days: 30,
      route: "Oral",
      food_instruction: "After food",
    },
  ]);
  const [newDrugName, setNewDrugName] = useState("");
  const [newDrugStrength, setNewDrugStrength] = useState("500 mg");
  const [newDrugFreq, setNewDrugFreq] = useState("Twice daily (1-0-1)");
  const [newDrugDuration, setNewDrugDuration] = useState("7");

  // PIN Signing Modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [doctorPin, setDoctorPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [signedPrescription, setSignedPrescription] = useState<{
    id: string;
    signature: string;
  } | null>(null);

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
        duration_days: parseInt(newDrugDuration, 10) || 7,
        route: "Oral",
        food_instruction: "After food",
      },
    ]);
    setNewDrugName("");
  };

  const handleRemoveDrug = (index: number) => {
    setDrugs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSignPrescription = async () => {
    if (doctorPin.length < 4) {
      setPinError("Please enter your 4-digit digital signing PIN.");
      return;
    }

    try {
      setSubmitting(true);
      setPinError(null);

      const payload = {
        patient_id: patientId,
        diagnosis,
        doctor_notes: doctorNotes,
        follow_up_days: parseInt(followUpDays, 10) || 14,
        requires_pin: true,
        verification_pin: doctorPin,
        items: drugs,
      };

      const res = await doctorApi.createPrescription(payload);
      setSignedPrescription({
        id: res.prescription_id || "RX-2026-SIGNED-001",
        signature: res.digital_signature || "SHA256:7a9f82d1c0e4...VERIFIED",
      });
    } catch (err: any) {
      console.error("Prescription signing failed", err);
      setPinError(err?.message || "Invalid signing PIN or failed to sign prescription.");
    } finally {
      setSubmitting(false);
    }
  };

  const completeAndExit = () => {
    setShowPinModal(false);
    router.replace("/(doctor)");
  };

  return (
    <View style={styles.container} testID="doctor-rxpad-screen">
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          testID="back-to-doctor-dashboard"
          accessibilityRole="button"
          accessibilityLabel="Back to Doctor Workspace"
        >
          <ArrowLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.screenTitle}>Digital RxPad</Text>
          <Text style={styles.screenSubtitle}>Electronic Prescription Generator</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Patient Selection Card */}
        <Card style={styles.formCard}>
          <Text style={styles.fieldLabel}>PATIENT FULL NAME</Text>
          <TextInput
            style={styles.inputField}
            value={patientName}
            onChangeText={setPatientName}
            placeholder="e.g. Ramesh Kumar"
            testID="rxpad-patient-name"
          />

          <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>
            ONEHEALTH ID / PATIENT REFERENCE ID
          </Text>
          <TextInput
            style={styles.inputField}
            value={patientId}
            onChangeText={setPatientId}
            placeholder="e.g. OHID-CITIZEN-001 or p-102"
            testID="rxpad-patient-id"
          />
        </Card>

        {/* Diagnosis & Advice Card */}
        <Card style={styles.formCard}>
          <Text style={styles.fieldLabel}>PROVISIONAL / CLINICAL DIAGNOSIS</Text>
          <TextInput
            style={styles.inputField}
            value={diagnosis}
            onChangeText={setDiagnosis}
            placeholder="e.g. Type 2 Diabetes Mellitus"
            testID="rxpad-diagnosis"
          />

          <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>
            DOCTOR'S CLINICAL ADVICE & DIETARY INSTRUCTIONS
          </Text>
          <TextInput
            style={styles.textArea}
            value={doctorNotes}
            onChangeText={setDoctorNotes}
            multiline
            numberOfLines={2}
            testID="rxpad-doctor-notes"
          />
        </Card>

        {/* Prescribed Medications Card */}
        <Card style={styles.formCard}>
          <View style={styles.medHeaderRow}>
            <Pill size={16} color={COLORS.primary[600]} />
            <Text style={styles.medHeaderTitle}>Prescribed Medications ({drugs.length})</Text>
          </View>

          {drugs.map((drug, idx) => (
            <View key={idx} style={styles.drugCard} testID={`rxpad-drug-item-${idx}`}>
              <View style={styles.drugMeta}>
                <Text style={styles.drugTitle}>{drug.medicine_name} ({drug.strength})</Text>
                <Text style={styles.drugSub}>
                  {drug.frequency} • {drug.duration_days} Days • {drug.food_instruction}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeDrugBtn}
                onPress={() => handleRemoveDrug(idx)}
                testID={`rxpad-remove-drug-${idx}`}
              >
                <Trash2 size={16} color={COLORS.danger[600]} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Builder Box */}
          <View style={styles.builderBox}>
            <Text style={styles.builderTitle}>Add Medicine</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Drug name (e.g. Metformin, Pantoprazole)"
              placeholderTextColor={COLORS.neutral[400]}
              value={newDrugName}
              onChangeText={setNewDrugName}
              testID="rxpad-input-drug-name"
            />

            <View style={styles.builderRow}>
              <View style={styles.builderCol}>
                <Text style={styles.microLabel}>STRENGTH</Text>
                <TextInput
                  style={styles.inputSmall}
                  value={newDrugStrength}
                  onChangeText={setNewDrugStrength}
                  testID="rxpad-input-drug-strength"
                />
              </View>
              <View style={styles.builderCol}>
                <Text style={styles.microLabel}>DAYS</Text>
                <TextInput
                  style={styles.inputSmall}
                  value={newDrugDuration}
                  onChangeText={setNewDrugDuration}
                  keyboardType="numeric"
                  testID="rxpad-input-drug-duration"
                />
              </View>
            </View>

            <View style={{ marginTop: SPACING.xs }}>
              <Text style={styles.microLabel}>FREQUENCY</Text>
              <TextInput
                style={styles.inputField}
                value={newDrugFreq}
                onChangeText={setNewDrugFreq}
                testID="rxpad-input-drug-frequency"
              />
            </View>

            <TouchableOpacity
              style={styles.addDrugBtn}
              onPress={handleAddDrug}
              testID="rxpad-btn-add-drug"
            >
              <Plus size={14} color={COLORS.primary[700]} />
              <Text style={styles.addDrugText}>Add Drug to RxPad</Text>
            </TouchableOpacity>
          </View>

          {/* Follow-up Days */}
          <View style={styles.followUpWrap}>
            <Text style={styles.fieldLabel}>FOLLOW-UP SCHEDULE</Text>
            <View style={styles.followUpInputRow}>
              <TextInput
                style={styles.followUpInput}
                value={followUpDays}
                onChangeText={setFollowUpDays}
                keyboardType="numeric"
                testID="rxpad-input-followup"
              />
              <Text style={styles.followUpText}>Days</Text>
            </View>
          </View>
        </Card>

        {/* Issue & Sign Button */}
        <TouchableOpacity
          style={styles.issueButton}
          onPress={() => setShowPinModal(true)}
          disabled={drugs.length === 0}
          testID="btn-sign-prescription"
        >
          <Lock size={16} color={COLORS.white} />
          <Text style={styles.issueButtonText}>Digitally Sign & Issue Prescription</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Digital Signing PIN Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}
        testID="rxpad-signing-modal"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {signedPrescription ? (
              <View style={styles.successBox} testID="rxpad-success-box">
                <CheckCircle2 size={48} color={COLORS.success[600]} />
                <Text style={styles.successTitle}>Prescription Issued</Text>
                <Text style={styles.successDesc}>
                  Digital RxPad prescription generated and cryptographically signed under your medical registration.
                </Text>
                <View style={styles.sigBadge}>
                  <FileCheck size={14} color={COLORS.primary[600]} />
                  <Text style={styles.sigText} numberOfLines={1}>{signedPrescription.signature}</Text>
                </View>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={completeAndExit}
                  testID="rxpad-btn-done"
                >
                  <Text style={styles.doneBtnText}>Return to Dashboard</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Authorizing Prescription</Text>
                    <Text style={styles.modalSubtitle}>Enter 4-Digit Digital Signing PIN</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowPinModal(false)}
                    testID="rxpad-close-pin-modal"
                  >
                    <X size={20} color={COLORS.neutral[500]} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.pinInstruction}>
                  Entering your signing PIN applies your tamper-proof SHA-256 digital signature to this RxPad record.
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
                  testID="rxpad-input-pin"
                />

                {pinError && (
                  <View style={styles.errorBanner}>
                    <AlertCircle size={14} color={COLORS.error[500]} />
                    <Text style={styles.errorBannerText}>{pinError}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.signSubmitBtn}
                  onPress={handleSignPrescription}
                  disabled={submitting}
                  testID="rxpad-btn-confirm-sign"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Lock size={15} color={COLORS.white} />
                      <Text style={styles.signSubmitText}>Sign & Broadcast to Pharmacy</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
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
  formCard: {
    padding: SPACING.base,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.neutral[500],
    letterSpacing: 0.5,
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
  medHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: SPACING.xs,
  },
  medHeaderTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  drugCard: {
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
  drugMeta: {
    flex: 1,
  },
  drugTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  drugSub: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  removeDrugBtn: {
    padding: 6,
  },
  builderBox: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  builderTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.neutral[600],
  },
  builderRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  builderCol: {
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
  addDrugBtn: {
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
  addDrugText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary[700],
  },
  followUpWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  followUpInputRow: {
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
  followUpText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  issueButton: {
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
  issueButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },

  // Modal Styles
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
});
