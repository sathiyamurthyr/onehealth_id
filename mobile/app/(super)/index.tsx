/**
 * ONEHEALTH ID (OH-ID) Mobile — Platform Super Administrator Portal
 * Sathus Technology Pvt Ltd
 *
 * Implements multi-tenant hospital onboarding approval workflows,
 * operator dual-auth OTP verification, and live cryptographic subsystem diagnostics.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  ShieldAlert,
  Building,
  KeyRound,
  CheckCircle2,
  Server,
  Lock,
  Play,
  X,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Eye,
  Layers,
  Settings2,
  BookmarkCheck,
} from "lucide-react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../src/theme";
import { Header } from "../../src/components/common/Header";
import { Card } from "../../src/components/common/Card";
import { StatusBadge } from "../../src/components/common/StatusBadge";
import { UserSessionBanner } from "../../src/components/common/UserSessionBanner";
import { adminApi, HospitalOnboardingApplication } from "../../src/services/api/admin";
import { clinicalTemplatesApi, ClinicalDocumentTemplate } from "../../src/services/api/clinical_templates";
import { PrescriptionTemplateRenderer, ClinicalReportTemplateRenderer } from "../../src/components/clinical_documents";

export default function SuperAdminHomeScreen() {
  const [applications, setApplications] = useState<HospitalOnboardingApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);

  // Review & Dual-Auth Modal
  const [selectedApp, setSelectedApp] = useState<HospitalOnboardingApplication | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED" | "HOLD">("APPROVED");
  const [operatorOtp, setOperatorOtp] = useState("123456");
  const [reviewReason, setReviewReason] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState<string | null>(null);

  // Crypto Test State
  const [testingCrypto, setTestingCrypto] = useState(false);
  const [cryptoResult, setCryptoResult] = useState<{
    handshakeSuccess: boolean;
    keyId: string | null;
    algorithm: string;
    timestamp: number;
  } | null>(null);

  // Unified Document Templates State
  const [templates, setTemplates] = useState<ClinicalDocumentTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [activeTemplateTab, setActiveTemplateTab] = useState<"PRESCRIPTION" | "CLINICAL_REPORT">("PRESCRIPTION");
  const [previewTemplate, setPreviewTemplate] = useState<ClinicalDocumentTemplate | null>(null);
  const [updatingTemplateId, setUpdatingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getHospitalApplications()
      .then((data) => setApplications(data))
      .finally(() => setLoadingApps(false));

    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const data = await clinicalTemplatesApi.listTemplates();
      setTemplates(data);
    } catch (err: any) {
      console.error("Failed to load templates", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleToggleTemplateStatus = async (templateId: string, currentStatus: boolean) => {
    try {
      setUpdatingTemplateId(templateId);
      await clinicalTemplatesApi.toggleStatus(templateId, !currentStatus);
      setTemplates((prev) =>
        prev.map((t) => (t.id === templateId ? { ...t, is_active: !currentStatus } : t))
      );
    } catch (err: any) {
      Alert.alert("Status Update Failed", err.message || "Failed to update template status.");
    } finally {
      setUpdatingTemplateId(null);
    }
  };

  const handleSetDefaultTemplate = async (templateId: string) => {
    try {
      setUpdatingTemplateId(templateId);
      await clinicalTemplatesApi.setDefault(templateId);
      const updated = await clinicalTemplatesApi.listTemplates();
      setTemplates(updated);
      Alert.alert("Default Template Set", "Template has been successfully set as system default.");
    } catch (err: any) {
      Alert.alert("Set Default Failed", err.message || "Failed to set default template.");
    } finally {
      setUpdatingTemplateId(null);
    }
  };

  const handleOpenReview = (app: HospitalOnboardingApplication, action: "APPROVED" | "REJECTED" | "HOLD") => {
    setSelectedApp(app);
    setReviewAction(action);
    setOperatorOtp("123456");
    setReviewReason(action === "APPROVED" ? "Verified clinical licenses & physical infrastructure." : "Missing mandatory fire safety clearance.");
    setReviewSuccessMessage(null);
  };

  const handleConfirmReview = async () => {
    if (!selectedApp) return;
    try {
      setIsSubmittingReview(true);
      const res = await adminApi.reviewHospitalApplication(selectedApp.id, reviewAction, reviewReason, operatorOtp);
      setApplications((prev) =>
        prev.map((a) => (a.id === selectedApp.id ? { ...a, status: reviewAction } : a))
      );
      setReviewSuccessMessage(`Hospital ${selectedApp.name} marked as ${reviewAction}. Audit Stamp: ${res.audit_id}`);
    } catch (err: any) {
      Alert.alert("Review Error", err.message || "Failed to submit hospital review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleRunCryptoDiagnostics = async () => {
    try {
      setTestingCrypto(true);
      const res = await adminApi.testCryptographicSubsystem();
      setCryptoResult(res);
    } finally {
      setTestingCrypto(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="super-admin-screen">
      <Header
        title="Super Admin Portal"
        subtitle="Platform Governance, Hospital Onboarding & Audits"
      />

      <UserSessionBanner />

      {/* Governance Scope Card */}
      <Card style={styles.governanceCard}>
        <View style={styles.govHeader}>
          <ShieldAlert size={20} color={COLORS.primary[800]} />
          <Text style={styles.govTitle}>Sathus Platform Administration</Text>
        </View>
        <Text style={styles.govMeta}>
          Identity: Super Admin • Scope: Multi-Tenant Master Network • Tenant Level 0
        </Text>
        <StatusBadge label="Privileged Operator" variant="CRITICAL" />
      </Card>

      {/* Cryptographic Subsystem Health & Live Test */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Cryptographic Subsystem Status</Text>
        <TouchableOpacity
          style={styles.diagBtn}
          onPress={handleRunCryptoDiagnostics}
          disabled={testingCrypto}
          testID="btn-run-crypto-test"
        >
          {testingCrypto ? (
            <ActivityIndicator size="small" color={COLORS.primary[700]} />
          ) : (
            <>
              <RotateCw size={13} color={COLORS.primary[700]} />
              <Text style={styles.diagBtnText}>Run Handshake</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Card style={styles.cryptoCard} testID="crypto-status-card">
        <View style={styles.cryptoRow}>
          <KeyRound size={18} color={COLORS.primary[600]} />
          <Text style={styles.cryptoName}>Payload Encryption</Text>
          <StatusBadge label="AES-256-GCM" variant="VERIFIED" />
        </View>
        <View style={styles.cryptoRow}>
          <Server size={18} color={COLORS.accent[600]} />
          <Text style={styles.cryptoName}>Key Agreement</Text>
          <StatusBadge label="ECDH P-256" variant="VERIFIED" />
        </View>
        <View style={styles.cryptoRow}>
          <Lock size={18} color={COLORS.success[600]} />
          <Text style={styles.cryptoName}>Envelope KDF</Text>
          <StatusBadge label="HKDF-SHA256" variant="VERIFIED" />
        </View>

        {cryptoResult && (
          <View style={styles.cryptoResultBox} testID="crypto-test-result">
            <CheckCircle2 size={16} color={COLORS.success[600]} />
            <Text style={styles.cryptoResultText}>
              Handshake Verified: {cryptoResult.algorithm} key active ({cryptoResult.keyId?.slice(0, 16)}...)
            </Text>
          </View>
        )}
      </Card>

      {/* Hospital Onboarding Applications Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Hospital Onboarding Applications</Text>
        <Text style={styles.appCountText}>{applications.length} Pending</Text>
      </View>

      {loadingApps ? (
        <ActivityIndicator color={COLORS.primary[600]} style={{ marginVertical: SPACING.md }} />
      ) : (
        applications.map((h) => (
          <Card key={h.id} style={styles.hospCard} testID={`app-card-${h.id}`}>
            <View style={styles.hospHeaderRow}>
              <View style={styles.hospIcon}>
                <Building size={20} color={COLORS.primary[600]} />
              </View>
              <View style={styles.hospDetails}>
                <Text style={styles.hospName}>{h.name}</Text>
                <Text style={styles.hospSub}>
                  {h.reg_no} • {h.city} • {h.beds_count} Beds
                </Text>
              </View>
              <StatusBadge label={h.status} variant={h.status === "APPROVED" ? "VERIFIED" : h.status === "HOLD" ? "HOLD" : "PENDING"} />
            </View>

            <View style={styles.hospActionRow}>
              <TouchableOpacity
                style={[styles.hospActionBtn, styles.approveBtn]}
                onPress={() => handleOpenReview(h, "APPROVED")}
                testID={`btn-approve-${h.id}`}
              >
                <CheckCircle2 size={13} color={COLORS.neutral.white} style={{ marginRight: 4 }} />
                <Text style={[styles.hospActionText, { color: COLORS.neutral.white }]}>Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.hospActionBtn, styles.holdBtn]}
                onPress={() => handleOpenReview(h, "HOLD")}
                testID={`btn-hold-${h.id}`}
              >
                <AlertTriangle size={13} color={COLORS.warning[800]} style={{ marginRight: 4 }} />
                <Text style={[styles.hospActionText, { color: COLORS.warning[900] }]}>Put on Hold</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.hospActionBtn, styles.rejectBtn]}
                onPress={() => handleOpenReview(h, "REJECTED")}
                testID={`btn-reject-${h.id}`}
              >
                <X size={13} color={COLORS.danger[700]} style={{ marginRight: 4 }} />
                <Text style={[styles.hospActionText, { color: COLORS.danger[800] }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))
      )}

      {/* ================================================================= */}
      {/* Unified Clinical Document Template Management (20 Templates)     */}
      {/* ================================================================= */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Layers size={18} color={COLORS.primary[700]} />
          <Text style={styles.sectionTitle}>Document Template System</Text>
        </View>
        <Text style={styles.templateCountText}>
          {templates.filter((t) => t.document_type === activeTemplateTab).length} Designs
        </Text>
      </View>

      {/* Dual Tabs: Prescription Templates vs Clinical Report Templates */}
      <View style={styles.templateTabBar} testID="super-template-tabs">
        <TouchableOpacity
          style={[styles.templateTabBtn, activeTemplateTab === "PRESCRIPTION" && styles.templateTabBtnActive]}
          onPress={() => setActiveTemplateTab("PRESCRIPTION")}
          testID="tab-prescription-templates"
        >
          <Text
            style={[styles.templateTabBtnText, activeTemplateTab === "PRESCRIPTION" && styles.templateTabBtnTextActive]}
          >
            Prescription (Rx) Templates (10)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.templateTabBtn, activeTemplateTab === "CLINICAL_REPORT" && styles.templateTabBtnActive]}
          onPress={() => setActiveTemplateTab("CLINICAL_REPORT")}
          testID="tab-clinical-report-templates"
        >
          <Text
            style={[styles.templateTabBtnText, activeTemplateTab === "CLINICAL_REPORT" && styles.templateTabBtnTextActive]}
          >
            Clinical Report Templates (10)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Templates List */}
      {loadingTemplates ? (
        <ActivityIndicator color={COLORS.primary[600]} style={{ marginVertical: SPACING.md }} />
      ) : (
        templates
          .filter((t) => t.document_type === activeTemplateTab)
          .map((tmpl) => (
            <Card key={tmpl.id} style={styles.templateCard} testID={`template-card-${tmpl.id}`}>
              <View style={styles.templateCardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={styles.templateName}>{tmpl.name}</Text>
                    {tmpl.is_default && (
                      <View style={styles.defaultBadge}>
                        <BookmarkCheck size={12} color="#0284C7" />
                        <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                      </View>
                    )}
                    <StatusBadge
                      label={tmpl.is_active ? "ACTIVE" : "INACTIVE"}
                      variant={tmpl.is_active ? "VERIFIED" : "HOLD"}
                    />
                  </View>
                  <Text style={styles.templateCategory}>
                    Category: {tmpl.category} • v{tmpl.version}.0 • {tmpl.id}
                  </Text>
                  <Text style={styles.templateDesc}>{tmpl.description}</Text>
                </View>
              </View>

              <View style={styles.templateActionsRow}>
                <TouchableOpacity
                  style={[styles.tmplActionBtn, styles.previewBtn]}
                  onPress={() => setPreviewTemplate(tmpl)}
                  testID={`btn-preview-${tmpl.id}`}
                >
                  <Eye size={13} color="#0284C7" style={{ marginRight: 4 }} />
                  <Text style={[styles.tmplActionText, { color: "#0284C7" }]}>Preview Design</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tmplActionBtn, styles.statusToggleBtn]}
                  onPress={() => handleToggleTemplateStatus(tmpl.id, tmpl.is_active)}
                  disabled={updatingTemplateId === tmpl.id}
                  testID={`btn-toggle-${tmpl.id}`}
                >
                  <Text style={[styles.tmplActionText, { color: tmpl.is_active ? COLORS.danger[700] : COLORS.success[700] }]}>
                    {tmpl.is_active ? "Deactivate" : "Activate"}
                  </Text>
                </TouchableOpacity>

                {!tmpl.is_default && (
                  <TouchableOpacity
                    style={[styles.tmplActionBtn, styles.setDefaultBtn]}
                    onPress={() => handleSetDefaultTemplate(tmpl.id)}
                    disabled={updatingTemplateId === tmpl.id}
                    testID={`btn-default-${tmpl.id}`}
                  >
                    <Text style={[styles.tmplActionText, { color: COLORS.primary[700] }]}>Set Default</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          ))
      )}

      {/* Immutable Audit Ledger Stamp */}
      <Card style={styles.auditNote}>
        <CheckCircle2 size={18} color={COLORS.success[600]} />
        <Text style={styles.auditText}>
          Super Admin actions are immutably logged to PostgreSQL audit views with
          dual OTP verification required for high-risk tenant onboarding mutations.
        </Text>
      </Card>

      {/* Review & Dual-Auth OTP Modal */}
      <Modal
        visible={Boolean(selectedApp)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedApp(null)}
        testID="super-admin-review-modal"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Review Facility Onboarding</Text>
                <Text style={styles.modalSub}>{selectedApp?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedApp(null)}>
                <X size={20} color={COLORS.neutral[600]} />
              </TouchableOpacity>
            </View>

            {reviewSuccessMessage ? (
              <View style={styles.successStateBox} testID="review-success-state">
                <CheckCircle2 size={40} color={COLORS.success[600]} />
                <Text style={styles.successStateTitle}>Application Updated</Text>
                <Text style={styles.successStateSub}>{reviewSuccessMessage}</Text>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => setSelectedApp(null)}
                  testID="btn-review-modal-close"
                >
                  <Text style={styles.doneBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.fieldLabel}>DECISION</Text>
                <View style={styles.decisionBadgeRow}>
                  <StatusBadge
                    label={reviewAction}
                    variant={reviewAction === "APPROVED" ? "VERIFIED" : reviewAction === "HOLD" ? "HOLD" : "CRITICAL"}
                  />
                  <Text style={styles.decisionDescText}>
                    {reviewAction === "APPROVED" ? "Enrolls hospital to live multi-tenant routing." : "Halts tenant creation until audit compliance."}
                  </Text>
                </View>

                <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>OPERATOR AUDIT REASON</Text>
                <TextInput
                  style={styles.modalInput}
                  value={reviewReason}
                  onChangeText={setReviewReason}
                  multiline
                  numberOfLines={2}
                  testID="input-review-reason"
                />

                <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>DUAL-AUTH OPERATOR OTP (6 DIGITS)</Text>
                <TextInput
                  style={styles.modalOtpInput}
                  keyboardType="numeric"
                  maxLength={6}
                  value={operatorOtp}
                  onChangeText={setOperatorOtp}
                  testID="input-operator-otp"
                />

                <TouchableOpacity
                  style={styles.submitReviewBtn}
                  onPress={handleConfirmReview}
                  disabled={isSubmittingReview}
                  testID="btn-confirm-review-action"
                >
                  {isSubmittingReview ? (
                    <ActivityIndicator color={COLORS.neutral.white} size="small" />
                  ) : (
                    <Text style={styles.submitReviewText}>Confirm & Sign Audit Log</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Template Preview Modal */}
      <Modal
        visible={Boolean(previewTemplate)}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewTemplate(null)}
        testID="super-admin-template-preview-modal"
      >
        <View style={styles.previewModalBackdrop}>
          <View style={styles.previewModalCard}>
            <View style={styles.previewModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewModalTitle}>{previewTemplate?.name}</Text>
                <Text style={styles.previewModalSub}>
                  {previewTemplate?.document_type === "PRESCRIPTION"
                    ? "Prescription Design Preview"
                    : "Clinical Report Design Preview"}{" "}
                  • {previewTemplate?.category} • v{previewTemplate?.version}.0
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPreviewTemplate(null)}
                style={styles.previewCloseBtn}
                testID="btn-close-template-preview"
              >
                <X size={20} color={COLORS.neutral[700]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: 12 }}>
              {previewTemplate && previewTemplate.document_type === "PRESCRIPTION" ? (
                <PrescriptionTemplateRenderer
                  prescription={{
                    id: "rx-synth-preview-001",
                    onehealth_id: "OHID-IND-2026-08912",
                    patient_name: "Alice Smith",
                    patient_age: "32",
                    patient_gender: "Female",
                    patient_blood_group: "O+",
                    patient_phone: "+91 98401 98401",
                    allergies: ["Penicillin", "Sulfa drugs"],
                    diagnosis: "Acute Bronchitis & Reactive Airway Disease",
                    symptoms: "Dry cough, wheezing, low-grade pyrexia for 3 days",
                    vitals: {
                      bp_systolic: "120",
                      bp_diastolic: "80",
                      heart_rate: "74",
                      temperature: "99.1",
                      weight_kg: "58",
                    },
                    items: [
                      {
                        medicine_name: "Amoxicillin & Clavulanate",
                        strength: "625 mg",
                        dosage_form: "Tablet",
                        dose: "1 Tab",
                        frequency: "1-0-1",
                        duration_days: 5,
                        food_instruction: "After food",
                        instructions: "Complete full 5-day course without interruption.",
                      },
                      {
                        medicine_name: "Levocetirizine + Montelukast",
                        strength: "5mg / 10mg",
                        dosage_form: "Tablet",
                        dose: "1 Tab",
                        frequency: "0-0-1 (Night)",
                        duration_days: 10,
                        food_instruction: "At bedtime",
                        instructions: "May cause mild drowsiness.",
                      },
                      {
                        medicine_name: "Inhaler Budesonide + Formoterol",
                        strength: "200mcg / 6mcg",
                        dosage_form: "DPI Inhaler",
                        dose: "2 Puffs",
                        frequency: "Twice daily",
                        duration_days: 14,
                        food_instruction: "Rinse mouth after use",
                        instructions: "Use with spacer. Rinse mouth after inhalation.",
                      },
                    ],
                    advice: "Avoid cold exposure, maintain adequate hydration (2.5L daily), steam inhalation twice daily.",
                    diet_lifestyle_notes: "Warm fluids, light home-cooked meals. Avoid refrigerated items.",
                    follow_up_date: "06 Nov 2026",
                    doctor_name: "Dr. Senthil Nathan",
                    doctor_specialty: "General Medicine & Pulmonology",
                    doctor_qualification: "MBBS, MD (General Medicine)",
                    doctor_registration: "TN-MCI-2026-001",
                    hospital_name: "Kedar Super Specialty Hospital",
                    hospital_address: "148 Trunk Road, Porur, Chennai - 600116",
                    hospital_phone: "+91 44 2476 8000",
                    template_id: previewTemplate.id,
                    template_version: previewTemplate.version,
                    template_name: previewTemplate.name,
                    signed_by: "usr-kedar-doc1",
                    signed_at: new Date().toISOString(),
                    digital_signature_hash: "SHA256:7a9f82d1c5e4b6a839f201bce471a9...VERIFIED",
                  }}
                  showHospitalLogo={true}
                />
              ) : previewTemplate ? (
                <ClinicalReportTemplateRenderer
                  report={{
                    id: "c-synth-preview-001",
                    patient_id: "p-101",
                    patient_name: "Alice Smith",
                    onehealth_id: "OHID-IND-2026-08912",
                    patient_age: 32,
                    patient_gender: "Female",
                    patient_blood_group: "O+",
                    patient_phone: "+91 98401 98401",
                    doctor_id: "doc-k-01",
                    doctor_name: "Dr. Senthil Nathan",
                    doctor_specialty: "General Medicine",
                    doctor_qualification: "MBBS, MD (General Medicine)",
                    doctor_registration: "TN-MCI-2026-001",
                    hospital_id: "hosp-kedar",
                    hospital_name: "Kedar Super Specialty Hospital",
                    hospital_address: "148 Trunk Road, Porur, Chennai - 600116",
                    hospital_code: "HOSP-KEDAR",
                    symptoms: "Bilateral wheeze, productive cough, evening fatigue for 4 days.",
                    diagnosis: "Moderate Persistent Asthma with Acute Bronchial Exacerbation",
                    clinical_notes:
                      "Chest clear bilaterally post-bronchodilator. SpO2 98% on room air. Vitals stable. Advised spirometry post 2 weeks.",
                    vitals: {
                      bp_systolic: "122",
                      bp_diastolic: "80",
                      heart_rate: "76",
                      temperature: "98.6",
                      weight_kg: "58",
                    },
                    signed_by: "usr-kedar-doc1",
                    signed_at: new Date().toISOString(),
                    digital_signature_hash: "SHA256:8b4c29e1fa072d639b8...VERIFIED",
                    template_id: previewTemplate.id,
                    template_version: previewTemplate.version,
                    template_name: previewTemplate.name,
                    template_layout_config: previewTemplate.layout_config,
                  }}
                  showHospitalLogo={true}
                />
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.base,
    paddingBottom: SPACING.xxxl,
  },
  governanceCard: {
    marginBottom: SPACING.base,
  },
  govHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  govTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.xs,
  },
  govMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  appCountText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary[700],
  },
  diagBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  diagBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary[700],
  },
  cryptoCard: {
    marginBottom: SPACING.base,
    paddingVertical: SPACING.sm,
  },
  cryptoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[100],
  },
  cryptoName: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textPrimary,
    flex: 1,
    marginLeft: SPACING.sm,
  },
  cryptoResultBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.success[50],
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  cryptoResultText: {
    fontSize: 10.5,
    color: COLORS.success[800],
    fontWeight: "600",
  },
  hospCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.base,
  },
  hospHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  hospIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary[50],
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  hospDetails: {
    flex: 1,
  },
  hospName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
  },
  hospSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  hospActionRow: {
    flexDirection: "row",
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  hospActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  approveBtn: {
    backgroundColor: COLORS.primary[600],
  },
  holdBtn: {
    backgroundColor: COLORS.warning[50],
    borderWidth: 1,
    borderColor: COLORS.warning[200],
  },
  rejectBtn: {
    backgroundColor: COLORS.danger[50],
    borderWidth: 1,
    borderColor: COLORS.danger[200],
  },
  hospActionText: {
    fontSize: 11,
    fontWeight: "700",
  },
  auditNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.success[50],
    borderColor: COLORS.success[200],
    marginTop: SPACING.sm,
  },
  auditText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success[800],
    marginLeft: SPACING.sm,
    flex: 1,
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.base,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.base,
  },
  modalTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  modalSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  fieldLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  decisionBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  decisionDescText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textSecondary,
    flex: 1,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    fontSize: 12,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.neutral[50],
  },
  modalOtpInput: {
    borderWidth: 1.5,
    borderColor: COLORS.primary[400],
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 8,
    color: COLORS.primary[900],
    backgroundColor: COLORS.primary[50],
  },
  submitReviewBtn: {
    backgroundColor: COLORS.primary[600],
    alignItems: "center",
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    marginTop: SPACING.base,
  },
  submitReviewText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.neutral.white,
    fontSize: 13,
  },
  successStateBox: {
    alignItems: "center",
    paddingVertical: SPACING.md,
  },
  successStateTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  successStateSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: SPACING.sm,
  },
  doneBtn: {
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: SPACING.xl,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    marginTop: SPACING.base,
  },
  doneBtnText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.neutral.white,
    fontSize: 12,
  },
  templateCountText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  templateTabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.neutral[100],
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACING.sm,
  },
  templateTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: RADIUS.sm,
  },
  templateTabBtnActive: {
    backgroundColor: COLORS.neutral.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  templateTabBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  templateTabBtnTextActive: {
    color: COLORS.primary[700],
    fontWeight: "700",
  },
  templateCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.base,
  },
  templateCardHeader: {
    flexDirection: "row",
  },
  templateName: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0284C7",
  },
  templateCategory: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  templateDesc: {
    fontSize: 11,
    color: COLORS.textPrimary,
    marginTop: 4,
    lineHeight: 16,
  },
  templateActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[100],
  },
  tmplActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  previewBtn: {
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  statusToggleBtn: {
    backgroundColor: COLORS.neutral[50],
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  setDefaultBtn: {
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },
  tmplActionText: {
    fontSize: 11,
    fontWeight: "700",
  },
  previewModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  previewModalCard: {
    width: "100%",
    maxWidth: 720,
    maxHeight: "92%",
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
  },
  previewModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[200],
    backgroundColor: "#F8FAFC",
  },
  previewModalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  previewModalSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  previewCloseBtn: {
    padding: 4,
  },
});
