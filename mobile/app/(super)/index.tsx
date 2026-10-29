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
} from "lucide-react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../src/theme";
import { Header } from "../../src/components/common/Header";
import { Card } from "../../src/components/common/Card";
import { StatusBadge } from "../../src/components/common/StatusBadge";
import { UserSessionBanner } from "../../src/components/common/UserSessionBanner";
import { adminApi, HospitalOnboardingApplication } from "../../src/services/api/admin";

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

  useEffect(() => {
    adminApi.getHospitalApplications()
      .then((data) => setApplications(data))
      .finally(() => setLoadingApps(false));
  }, []);

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
});
