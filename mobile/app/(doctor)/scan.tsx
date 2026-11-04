/**
 * ONEHEALTH ID (OH-ID) Mobile — Doctor QR Scanner & Intake Screen
 * Sathus Technology Pvt Ltd
 *
 * Scans patient's dynamic Zero-Knowledge QR code via device camera
 * or manual OneHealth ID entry for instant triage and consultation intake.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  ArrowLeft,
  QrCode,
  Keyboard,
  Camera,
  CheckCircle2,
  AlertCircle,
  Play,
  ListPlus,
  ShieldCheck,
  User,
} from "lucide-react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../src/theme";
import { AppHeader } from "../../src/components/common/AppHeader";
import { Card } from "../../src/components/common/Card";
import { StatusBadge } from "../../src/components/common/StatusBadge";
import { doctorApi } from "../../src/services/api/doctor";
import { QRWorkflowScanResult } from "../../src/types/doctor";

export default function DoctorScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState<"camera" | "manual">("camera");
  const [manualInput, setManualInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<QRWorkflowScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResolveCode = async (code: string) => {
    if (!code || code.trim().length < 3 || scanning) return;
    try {
      setScanning(true);
      setError(null);
      const result = await doctorApi.resolveQrWorkflow(code.trim());
      setScannedResult(result);
    } catch (err: any) {
      console.warn("QR Resolution info:", err);
      setError(err?.message || "OneHealth ID or QR Token could not be verified");
    } finally {
      setScanning(false);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedResult || scanning) return;
    handleResolveCode(data);
  };

  const startConsultation = () => {
    if (!scannedResult) return;
    router.push({
      pathname: "/(doctor)/consultation",
      params: {
        patient_id: scannedResult.patient_id,
        patient_name: scannedResult.patient_name,
        onehealth_id: scannedResult.onehealth_id,
      },
    } as any);
  };

  const addToQueue = () => {
    // Navigates back to queue with resolved patient
    router.replace("/(doctor)");
  };

  return (
    <View style={styles.container} testID="doctor-scan-screen">
      {/* Global Standardized Header: White Card + Subtle Blue Divider + Outlined Notification & Profile */}
      <AppHeader
        title="Patient Intake Scanner"
        subtitle="Instant Zero-Knowledge QR Identification"
        showBackButton={true}
        backButtonTestID="back-to-doctor-home"
        showDivider={true}
        showDefaultActions={true}
      />

      {/* Mode Selector Tabs */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.tabButton, scanMode === "camera" && styles.tabButtonActive]}
          onPress={() => { setScanMode("camera"); setError(null); }}
          testID="tab-camera-mode"
        >
          <Camera size={15} color={scanMode === "camera" ? COLORS.primary[700] : COLORS.neutral[500]} />
          <Text style={[styles.tabText, scanMode === "camera" && styles.tabTextActive]}>
            Camera Scanner
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, scanMode === "manual" && styles.tabButtonActive]}
          onPress={() => { setScanMode("manual"); setError(null); }}
          testID="tab-manual-mode"
        >
          <Keyboard size={15} color={scanMode === "manual" ? COLORS.primary[700] : COLORS.neutral[500]} />
          <Text style={[styles.tabText, scanMode === "manual" && styles.tabTextActive]}>
            Manual Entry
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Error Banner displayed across Camera and Manual modes */}
        {error && (
          <View style={styles.errorBox} testID="scan-error-banner">
            <AlertCircle size={15} color={COLORS.error[500]} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Scanned Resolution Result Card */}
        {scannedResult ? (
          <Card style={styles.resultCard} testID="scan-result-card">
            <View style={styles.resultHeader}>
              <View style={styles.resultTitleCol}>
                <Text style={styles.resultBadgeText}>PATIENT IDENTIFIED</Text>
                <Text style={styles.patientName}>{scannedResult.patient_name}</Text>
                <Text style={styles.ohidText}>{scannedResult.onehealth_id}</Text>
              </View>
              <StatusBadge label="VERIFIED" variant="VERIFIED" />
            </View>

            <View style={styles.metaRow}>
              {scannedResult.age && (
                <View style={styles.metaChip}>
                  <Text style={styles.metaLabel}>AGE: </Text>
                  <Text style={styles.metaVal}>{scannedResult.age} Yrs</Text>
                </View>
              )}
              {scannedResult.gender && (
                <View style={styles.metaChip}>
                  <Text style={styles.metaLabel}>GENDER: </Text>
                  <Text style={styles.metaVal}>{scannedResult.gender}</Text>
                </View>
              )}
              {scannedResult.blood_group && (
                <View style={styles.metaChip}>
                  <Text style={styles.metaLabel}>BLOOD: </Text>
                  <Text style={styles.bloodVal}>{scannedResult.blood_group}</Text>
                </View>
              )}
            </View>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.startConsultBtn}
                onPress={startConsultation}
                testID="start-scanned-consultation-btn"
              >
                <Play size={14} color={COLORS.white} fill={COLORS.white} />
                <Text style={styles.startConsultText}>Start Consultation</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addQueueBtn}
                onPress={addToQueue}
                testID="add-to-queue-btn"
              >
                <ListPlus size={14} color={COLORS.primary[700]} />
                <Text style={styles.addQueueText}>Add to Queue</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.rescanButton}
              testID="rescan-patient-btn"
              onPress={() => {
                setScannedResult(null);
                setManualInput("");
              }}
            >
              <Text style={styles.rescanText}>Scan Another Patient</Text>
            </TouchableOpacity>
          </Card>
        ) : scanMode === "camera" ? (
          <View style={styles.cameraContainer}>
            {!permission?.granted ? (
              <Card style={styles.permissionCard}>
                <Camera size={44} color={COLORS.primary[600]} />
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionDesc}>
                  Please grant camera access to scan patient Zero-Knowledge QR passes at the clinic intake desk.
                </Text>
                <TouchableOpacity
                  style={styles.permissionButton}
                  onPress={requestPermission}
                  testID="grant-camera-permission-btn"
                >
                  <Text style={styles.permissionButtonText}>Enable Camera</Text>
                </TouchableOpacity>
              </Card>
            ) : (
              <View style={styles.viewfinderWrapper}>
                <CameraView
                  style={styles.cameraView}
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                  }}
                  onBarcodeScanned={handleBarcodeScanned}
                />
                <View style={styles.overlayFrame} pointerEvents="none">
                  <View style={styles.scanTarget} />
                  <Text style={styles.scanHint}>Align patient QR pass inside frame</Text>
                </View>
              </View>
            )}

            {scanning && (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="small" color={COLORS.primary[600]} />
                <Text style={styles.scanningText}>Verifying Zero-Knowledge Token...</Text>
              </View>
            )}
          </View>
        ) : (
          <Card style={styles.manualCard}>
            <Text style={styles.manualTitle}>Manual Patient Lookup</Text>
            <Text style={styles.manualSubtitle}>
              Enter Citizen OneHealth ID number or token string
            </Text>

            <TextInput
              style={styles.manualInput}
              placeholder="e.g. OHID-CITIZEN-001 or ZKP-TOKEN-..."
              placeholderTextColor={COLORS.neutral[400]}
              value={manualInput}
              onChangeText={setManualInput}
              autoCapitalize="characters"
              testID="manual-code-input"
            />

            {/* Quick Test Presets */}
            <View style={styles.sampleRow}>
              <Text style={styles.sampleTitle}>Quick Test Presets:</Text>
              <View style={styles.sampleButtons}>
                <TouchableOpacity
                  style={styles.sampleChip}
                  onPress={() => setManualInput("OHID-IND-2026-01001")}
                  testID="sample-valid-qr-btn"
                >
                  <Text style={styles.sampleChipText}>Alice Smith (Valid)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sampleChip}
                  onPress={() => setManualInput("INVALID_OR_EXPIRED_TOKEN")}
                  testID="sample-invalid-qr-btn"
                >
                  <Text style={styles.sampleChipText}>Invalid Token</Text>
                </TouchableOpacity>
              </View>
            </View>



            <TouchableOpacity
              style={styles.manualSubmitBtn}
              onPress={() => handleResolveCode(manualInput)}
              disabled={scanning || !manualInput.trim()}
              testID="submit-manual-code-btn"
            >
              {scanning ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <CheckCircle2 size={16} color={COLORS.white} />
                  <Text style={styles.manualSubmitText}>Verify & Lookup Patient</Text>
                </>
              )}
            </TouchableOpacity>
          </Card>
        )}

        {/* Security Compliance Stamp */}
        <View style={styles.securityFooter}>
          <ShieldCheck size={14} color={COLORS.success[600]} />
          <Text style={styles.securityFooterText}>
            Zero-Knowledge Proof (ZKP) Verification • Encrypted Token Exchange
          </Text>
        </View>
      </ScrollView>
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
  modeTabs: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.neutral[100],
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[300],
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.neutral[600],
  },
  tabTextActive: {
    color: COLORS.primary[700],
    fontWeight: "700",
  },
  content: {
    padding: SPACING.base,
    paddingBottom: SPACING.xxxl,
  },
  cameraContainer: {
    alignItems: "center",
  },
  viewfinderWrapper: {
    width: "100%",
    height: 360,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#000000",
  },
  cameraView: {
    flex: 1,
  },
  overlayFrame: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
  },
  scanTarget: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: COLORS.accent[400],
    borderRadius: RADIUS.lg,
    backgroundColor: "transparent",
  },
  scanHint: {
    marginTop: SPACING.base,
    fontSize: 11,
    color: COLORS.white,
    fontWeight: "600",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  scanningIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: SPACING.md,
  },
  scanningText: {
    fontSize: 12,
    color: COLORS.primary[700],
    fontWeight: "600",
  },
  permissionCard: {
    alignItems: "center",
    padding: SPACING.xl,
    marginTop: SPACING.lg,
  },
  permissionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginTop: SPACING.base,
  },
  permissionDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.xs,
    maxWidth: 280,
  },
  permissionButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  permissionButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 13,
  },
  manualCard: {
    padding: SPACING.base,
  },
  manualTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
  },
  manualSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  manualInput: {
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    fontSize: 13,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.neutral[50],
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: SPACING.xs,
    padding: SPACING.xs,
    backgroundColor: COLORS.error[50],
    borderRadius: RADIUS.sm,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.error[700],
  },
  manualSubmitBtn: {
    marginTop: SPACING.base,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.primary[600],
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  manualSubmitText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 13,
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.base,
    borderWidth: 1.5,
    borderColor: COLORS.primary[300],
    ...SHADOWS.md,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  resultTitleCol: {
    flex: 1,
  },
  resultBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.primary[600],
    letterSpacing: 0.8,
  },
  patientName: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  ohidText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.accent[600],
    fontFamily: "monospace",
    marginTop: 1,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.neutral[400],
  },
  metaVal: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  bloodVal: {
    fontSize: 11,
    fontWeight: "800",
    color: "#e11d48",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.base,
  },
  startConsultBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.primary[600],
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  startConsultText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
  addQueueBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  addQueueText: {
    color: COLORS.primary[700],
    fontSize: 12,
    fontWeight: "700",
  },
  rescanButton: {
    alignItems: "center",
    marginTop: SPACING.sm,
    paddingVertical: 6,
  },
  rescanText: {
    fontSize: 11,
    color: COLORS.neutral[500],
    fontWeight: "600",
  },
  securityFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: SPACING.xl,
  },
    sampleRow: {
    marginVertical: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sampleTitle: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.neutral[500],
    marginBottom: 6,
  },
  sampleButtons: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  sampleChip: {
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sampleChipText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.primary[800],
  },
  securityFooterText: {
    fontSize: 10,
    color: COLORS.neutral[500],
  },
});
