/**
 * ONEHEALTH ID (OH-ID) Mobile — Reception Desk & OPD Check-In Workspace
 * Sathus Technology Pvt Ltd
 *
 * Implements camera-based Zero-Knowledge QR scanning, manual patient lookup,
 * OPD queue token issuance, and walk-in citizen registration with strict RBAC masking.
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
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  QrCode,
  UserPlus,
  Ticket,
  Camera,
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  User,
  Clock,
  Printer,
  ChevronRight,
  Sparkles,
} from "lucide-react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../src/theme";
import { Header } from "../../src/components/common/Header";
import { Card } from "../../src/components/common/Card";
import { StatusBadge } from "../../src/components/common/StatusBadge";
import { UserSessionBanner } from "../../src/components/common/UserSessionBanner";
import { receptionApi } from "../../src/services/api/reception";
import {
  ScannedPatientSummary,
  OpdTokenConfirmation,
  QueuePriority,
  OPD_DEPARTMENTS,
  OpdDepartment,
  WalkInPatientPayload,
} from "../../src/types/reception";

export default function ReceptionHomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  // Scanning & Lookup States
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [scannedPatient, setScannedPatient] = useState<ScannedPatientSummary | null>(null);

  // OPD Check-In Modal States
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<OpdDepartment>("General Medicine");
  const [selectedPriority, setSelectedPriority] = useState<QueuePriority>("NORMAL");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [isIssuingToken, setIsIssuingToken] = useState(false);
  const [confirmedToken, setConfirmedToken] = useState<OpdTokenConfirmation | null>(null);

  // Walk-In Registration States
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInMobile, setWalkInMobile] = useState("");
  const [walkInAge, setWalkInAge] = useState("");
  const [walkInGender, setWalkInGender] = useState<"Male" | "Female" | "Other">("Male");
  const [walkInBlood, setWalkInBlood] = useState("O+");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  // Census Stats
  const [census, setCensus] = useState({
    tokens_issued: 42,
    waiting_count: 8,
    avg_wait_mins: 15,
  });

  useEffect(() => {
    receptionApi.getCounterCensus().then(setCensus).catch(() => {});
  }, []);

  // Handle QR resolution
  const handleResolve = async (code: string) => {
    if (!code || code.trim().length < 3 || isResolving) return;
    try {
      setIsResolving(true);
      setResolveError(null);
      const res = await receptionApi.scanAndVerifyQr(code.trim());
      setScannedPatient(res);
      setShowCameraModal(false);
      setManualCode("");
    } catch (err: any) {
      setResolveError(err.message || "Failed to resolve patient QR code.");
    } finally {
      setIsResolving(false);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedPatient || isResolving) return;
    handleResolve(data);
  };

  // Handle Token Issuance
  const handleConfirmCheckIn = async () => {
    if (!scannedPatient) return;
    try {
      setIsIssuingToken(true);
      const token = await receptionApi.issueOpdToken({
        patient_id: scannedPatient.patient_id,
        patient_name: scannedPatient.name,
        onehealth_id: scannedPatient.onehealth_id,
        department: selectedDepartment,
        priority: selectedPriority,
        chief_complaint: chiefComplaint.trim() || undefined,
      });
      setConfirmedToken(token);
      setShowCheckInModal(false);
      setCensus((prev) => ({
        ...prev,
        tokens_issued: prev.tokens_issued + 1,
        waiting_count: prev.waiting_count + 1,
      }));
    } catch (err: any) {
      Alert.alert("Token Issuance Error", err.message || "Failed to generate OPD queue token.");
    } finally {
      setIsIssuingToken(false);
    }
  };

  // Handle Walk-In Citizen Registration
  const handleRegisterWalkIn = async () => {
    const trimmedPhone = walkInMobile.trim();
    if (!/^\d{10}$/.test(trimmedPhone)) {
      setRegistrationError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!walkInName.trim()) {
      setRegistrationError("Please enter the patient's full name.");
      return;
    }
    const ageNum = parseInt(walkInAge, 10);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 125) {
      setRegistrationError("Please enter a valid age.");
      return;
    }

    try {
      setIsRegistering(true);
      setRegistrationError(null);
      const payload: WalkInPatientPayload = {
        name: walkInName.trim(),
        mobile: trimmedPhone,
        age: ageNum,
        gender: walkInGender,
        blood_group: walkInBlood,
        initial_department: selectedDepartment,
      };
      const res = await receptionApi.registerWalkInPatient(payload);
      setScannedPatient({
        patient_id: res.patient_id,
        onehealth_id: res.onehealth_id,
        name: res.name,
        age: ageNum,
        gender: walkInGender,
        blood_group: walkInBlood,
        verification_status: "VERIFIED",
        registered_phone: res.mobile,
      });
      setShowWalkInModal(false);
      setWalkInName("");
      setWalkInMobile("");
      setWalkInAge("");
      setShowCheckInModal(true); // Seamlessly proceed to check-in
    } catch (err: any) {
      setRegistrationError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  const resetIntake = () => {
    setScannedPatient(null);
    setConfirmedToken(null);
    setChiefComplaint("");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="reception-home-screen">
      <Header
        title="Reception Desk"
        subtitle="Universal QR Check-In, Registration & Token Issuance"
      />

      <UserSessionBanner />

      {/* Facility & Counter Status Card */}
      <Card style={styles.hospitalCard}>
        <View style={styles.hospitalHeader}>
          <Building size={18} color={COLORS.primary[600]} />
          <Text style={styles.hospitalName}>OneHealth Hospital — Front Desk</Text>
        </View>
        <Text style={styles.hospitalRole}>Counter: OPD-DESK-01 • Mode: Rapid Check-in</Text>
        <View style={styles.censusRow}>
          <View style={styles.censusItem}>
            <Text style={styles.censusVal}>{census.tokens_issued}</Text>
            <Text style={styles.censusLabel}>Issued Today</Text>
          </View>
          <View style={styles.censusItem}>
            <Text style={[styles.censusVal, { color: COLORS.warning[700] }]}>{census.waiting_count}</Text>
            <Text style={styles.censusLabel}>In Queue</Text>
          </View>
          <View style={styles.censusItem}>
            <Text style={styles.censusVal}>{census.avg_wait_mins}m</Text>
            <Text style={styles.censusLabel}>Avg Wait</Text>
          </View>
        </View>
      </Card>

      {/* Confirmed Token Display Card */}
      {confirmedToken && (
        <Card style={styles.tokenSuccessCard} testID="confirmed-token-card">
          <View style={styles.tokenSuccessHeader}>
            <CheckCircle2 size={24} color={COLORS.success[600]} />
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={styles.tokenSuccessTitle}>OPD Token Issued Successfully</Text>
              <Text style={styles.tokenSuccessSub}>Present token pass at clinic waiting area</Text>
            </View>
            <TouchableOpacity style={styles.resetButton} onPress={resetIntake}>
              <Text style={styles.resetButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tokenBadgeBox}>
            <Text style={styles.tokenNumberLarge}>#{confirmedToken.token_number}</Text>
            <Text style={styles.tokenCodeLarge}>{confirmedToken.token_str}</Text>
          </View>

          <View style={styles.tokenMetaGrid}>
            <View style={styles.tokenMetaItem}>
              <Text style={styles.metaLabel}>PATIENT</Text>
              <Text style={styles.metaValue}>{confirmedToken.patient_name}</Text>
            </View>
            <View style={styles.tokenMetaItem}>
              <Text style={styles.metaLabel}>ONEHEALTH ID</Text>
              <Text style={styles.metaValue}>{confirmedToken.onehealth_id}</Text>
            </View>
            <View style={styles.tokenMetaItem}>
              <Text style={styles.metaLabel}>DEPARTMENT</Text>
              <Text style={styles.metaValue}>{confirmedToken.department}</Text>
            </View>
            <View style={styles.tokenMetaItem}>
              <Text style={styles.metaLabel}>CONSULTATION ROOM</Text>
              <Text style={styles.metaValue}>{confirmedToken.room_number || "Room 101"}</Text>
            </View>
          </View>

          <View style={styles.tokenFooterRow}>
            <View style={styles.waitBadge}>
              <Clock size={12} color={COLORS.primary[700]} />
              <Text style={styles.waitBadgeText}>Est. Wait: ~{confirmedToken.estimated_wait_minutes} mins</Text>
            </View>
            <TouchableOpacity style={styles.printButton} onPress={() => Alert.alert("Print Pass", "OPD Token dispatched to kiosk thermal printer.")}>
              <Printer size={13} color={COLORS.neutral[700]} />
              <Text style={styles.printButtonText}>Print Slip</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Scanned Patient Identity Card */}
      {scannedPatient && !confirmedToken && (
        <Card style={styles.patientIdentCard} testID="scanned-patient-card">
          <View style={styles.patientIdentHeader}>
            <View style={styles.patientAvatar}>
              <User size={20} color={COLORS.primary[600]} />
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={styles.patientName}>{scannedPatient.name}</Text>
              <Text style={styles.patientOhid}>{scannedPatient.onehealth_id}</Text>
            </View>
            <StatusBadge label="VERIFIED" variant="VERIFIED" />
          </View>

          <View style={styles.patientMetaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>AGE / GENDER</Text>
              <Text style={styles.metaValue}>{scannedPatient.age} Yrs • {scannedPatient.gender}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>BLOOD GROUP</Text>
              <Text style={[styles.metaValue, { color: COLORS.danger[700] }]}>{scannedPatient.blood_group || "O+"}</Text>
            </View>
          </View>

          <View style={styles.patientActionRow}>
            <TouchableOpacity
              style={styles.issueTokenBtn}
              onPress={() => setShowCheckInModal(true)}
              testID="btn-open-checkin-modal"
            >
              <Ticket size={16} color={COLORS.neutral.white} style={{ marginRight: 6 }} />
              <Text style={styles.issueTokenBtnText}>Issue OPD Queue Token</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelScanBtn} onPress={() => setScannedPatient(null)}>
              <Text style={styles.cancelScanText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Primary Intake Trigger: Camera & Manual QR Scanner */}
      {!scannedPatient && !confirmedToken && (
        <Card style={styles.scannerTargetCard}>
          <View style={styles.scannerViewport}>
            <Camera size={36} color={COLORS.primary[600]} />
            <Text style={styles.scannerTitle}>OneHealth QR Code Scanner</Text>
            <Text style={styles.scannerSubtitle}>
              Scan Citizen Digital Card or ABHA Pass for instant front-desk verification
            </Text>
          </View>

          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setShowCameraModal(true)}
            testID="open-camera-scanner-btn"
            activeOpacity={0.8}
          >
            <QrCode size={18} color={COLORS.neutral.white} style={{ marginRight: 8 }} />
            <Text style={styles.scanButtonText}>Launch Camera Scanner</Text>
          </TouchableOpacity>

          {/* Manual Patient Lookup Input */}
          <View style={styles.manualSearchWrapper}>
            <TextInput
              style={styles.manualInput}
              placeholder="Or enter OH-ID (e.g. OHID-CITIZEN-001)"
              placeholderTextColor={COLORS.textMuted}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
              testID="manual-search-input"
            />
            <TouchableOpacity
              style={[styles.searchButton, (!manualCode.trim() || isResolving) && { opacity: 0.5 }]}
              onPress={() => handleResolve(manualCode)}
              disabled={!manualCode.trim() || isResolving}
              testID="manual-search-btn"
            >
              {isResolving ? (
                <ActivityIndicator size="small" color={COLORS.neutral.white} />
              ) : (
                <Search size={16} color={COLORS.neutral.white} />
              )}
            </TouchableOpacity>
          </View>

          {resolveError && (
            <View style={styles.errorBox}>
              <AlertCircle size={14} color={COLORS.danger[700]} />
              <Text style={styles.errorText}>{resolveError}</Text>
            </View>
          )}
        </Card>
      )}

      {/* Front Desk Secondary Actions */}
      <Text style={styles.sectionTitle}>Front Desk Services</Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShowWalkInModal(true)}
        testID="open-walkin-modal-btn"
      >
        <Card style={styles.actionCard}>
          <View style={styles.actionIcon}>
            <UserPlus size={20} color={COLORS.primary[600]} />
          </View>
          <View style={styles.actionDetails}>
            <Text style={styles.actionTitle}>Walk-In Citizen Registration</Text>
            <Text style={styles.actionDesc}>
              Issue new OneHealth ID with 10-digit mobile number verification
            </Text>
          </View>
          <ChevronRight size={18} color={COLORS.neutral[400]} />
        </Card>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          setManualCode("OHID-EMERGENCY");
          handleResolve("OHID-EMERGENCY");
        }}
      >
        <Card style={styles.actionCard}>
          <View style={[styles.actionIcon, { backgroundColor: COLORS.danger[50] }]}>
            <Ticket size={20} color={COLORS.danger[600]} />
          </View>
          <View style={styles.actionDetails}>
            <Text style={styles.actionTitle}>Emergency STAT Triage Token</Text>
            <Text style={styles.actionDesc}>
              Immediate priority bypass token for critical / trauma patients
            </Text>
          </View>
          <ChevronRight size={18} color={COLORS.neutral[400]} />
        </Card>
      </TouchableOpacity>

      {/* Security & RBAC Masking Notice */}
      <Card style={styles.securityNote}>
        <ShieldCheck size={18} color={COLORS.success[600]} />
        <Text style={styles.securityText}>
          Receptionist RBAC Protection: Clinical notes, detailed diagnoses, and prescription details
          are strictly masked to front-desk staff in compliance with Points 18 & 19 specifications.
        </Text>
      </Card>

      {/* MODAL 1: Interactive Camera Viewfinder */}
      <Modal
        visible={showCameraModal}
        animationType="slide"
        onRequestClose={() => setShowCameraModal(false)}
        testID="camera-scanner-modal"
      >
        <View style={styles.modalFullContainer}>
          <View style={styles.modalHeaderBar}>
            <Text style={styles.modalBarTitle}>Scan Citizen QR Pass</Text>
            <TouchableOpacity
              onPress={() => setShowCameraModal(false)}
              testID="close-camera-modal-btn"
            >
              <X size={24} color={COLORS.neutral.white} />
            </TouchableOpacity>
          </View>

          {!permission?.granted ? (
            <View style={styles.permissionBox}>
              <Camera size={48} color={COLORS.primary[400]} />
              <Text style={styles.permTitle}>Camera Permission Required</Text>
              <Text style={styles.permDesc}>
                Camera access is needed to scan patient QR cards and dynamic ZKP passes.
              </Text>
              <TouchableOpacity
                style={styles.permButton}
                onPress={requestPermission}
                testID="grant-camera-perm-btn"
              >
                <Text style={styles.permButtonText}>Grant Access</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraWrapper}>
              <CameraView
                style={styles.cameraView}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={handleBarcodeScanned}
              />
              <View style={styles.overlayFrame} pointerEvents="none">
                <View style={styles.scanTarget} />
                <Text style={styles.scanHint}>Align patient QR card within box</Text>
              </View>
            </View>
          )}

          {isResolving && (
            <View style={styles.resolvingBar}>
              <ActivityIndicator color={COLORS.neutral.white} size="small" />
              <Text style={styles.resolvingText}>Verifying Dynamic OneHealth Token...</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* MODAL 2: OPD Department & Priority Check-In Modal */}
      <Modal
        visible={showCheckInModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCheckInModal(false)}
        testID="checkin-department-modal"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalTitleRow}>
              <View>
                <Text style={styles.modalSheetTitle}>OPD Check-In & Token Issuance</Text>
                <Text style={styles.modalSheetSub}>Assign queue for {scannedPatient?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCheckInModal(false)}>
                <X size={20} color={COLORS.neutral[600]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldSectionLabel}>SELECT OPD SPECIALTY</Text>
            <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator>
              {OPD_DEPARTMENTS.map((dept) => {
                const isSelected = selectedDepartment === dept;
                return (
                  <TouchableOpacity
                    key={dept}
                    style={[styles.deptOption, isSelected && styles.deptOptionActive]}
                    onPress={() => setSelectedDepartment(dept)}
                    testID={`dept-option-${dept}`}
                  >
                    <Text style={[styles.deptOptionText, isSelected && styles.deptOptionTextActive]}>
                      {dept}
                    </Text>
                    {isSelected && <CheckCircle2 size={16} color={COLORS.primary[600]} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[styles.fieldSectionLabel, { marginTop: SPACING.md }]}>TRIAGE PRIORITY</Text>
            <View style={styles.priorityRow}>
              {(["NORMAL", "URGENT", "STAT"] as QueuePriority[]).map((p) => {
                const isSelected = selectedPriority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityChip, isSelected && styles.priorityChipActive]}
                    onPress={() => setSelectedPriority(p)}
                    testID={`priority-chip-${p}`}
                  >
                    <Text style={[styles.priorityText, isSelected && styles.priorityTextActive]}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.fieldSectionLabel, { marginTop: SPACING.md }]}>CHIEF COMPLAINT (OPTIONAL)</Text>
            <TextInput
              style={styles.complaintInput}
              placeholder="e.g. Cough for 3 days, routine follow-up"
              placeholderTextColor={COLORS.textMuted}
              value={chiefComplaint}
              onChangeText={setChiefComplaint}
              testID="complaint-input"
            />

            <TouchableOpacity
              style={styles.confirmTokenBtn}
              onPress={handleConfirmCheckIn}
              disabled={isIssuingToken}
              testID="confirm-issue-token-btn"
            >
              {isIssuingToken ? (
                <ActivityIndicator color={COLORS.neutral.white} size="small" />
              ) : (
                <>
                  <Ticket size={16} color={COLORS.neutral.white} style={{ marginRight: 6 }} />
                  <Text style={styles.confirmTokenText}>Issue Token & Notify Doctor</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Walk-In Citizen Registration */}
      <Modal
        visible={showWalkInModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWalkInModal(false)}
        testID="walkin-registration-modal"
      >
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.scrollModalCenter}>
            <View style={styles.modalCard}>
              <View style={styles.modalTitleRow}>
                <View>
                  <Text style={styles.modalSheetTitle}>Walk-In Registration</Text>
                  <Text style={styles.modalSheetSub}>Issue permanent OneHealth ID Pass</Text>
                </View>
                <TouchableOpacity onPress={() => setShowWalkInModal(false)}>
                  <X size={20} color={COLORS.neutral[600]} />
                </TouchableOpacity>
              </View>

              {registrationError && (
                <View style={styles.modalErrorBox}>
                  <AlertCircle size={14} color={COLORS.danger[700]} />
                  <Text style={styles.errorText}>{registrationError}</Text>
                </View>
              )}

              <Text style={styles.fieldSectionLabel}>CITIZEN FULL NAME</Text>
              <TextInput
                style={styles.modalInputField}
                placeholder="Full Legal Name"
                placeholderTextColor={COLORS.textMuted}
                value={walkInName}
                onChangeText={setWalkInName}
                testID="walkin-name-input"
              />

              <Text style={[styles.fieldSectionLabel, { marginTop: SPACING.sm }]}>10-DIGIT MOBILE NUMBER</Text>
              <TextInput
                style={styles.modalInputField}
                placeholder="10-digit Indian Mobile"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                value={walkInMobile}
                onChangeText={setWalkInMobile}
                testID="walkin-phone-input"
              />

              <View style={styles.formSplitRow}>
                <View style={{ flex: 1, marginRight: SPACING.sm }}>
                  <Text style={styles.fieldSectionLabel}>AGE</Text>
                  <TextInput
                    style={styles.modalInputField}
                    placeholder="e.g. 32"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    maxLength={3}
                    value={walkInAge}
                    onChangeText={setWalkInAge}
                    testID="walkin-age-input"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldSectionLabel}>BLOOD GROUP</Text>
                  <TextInput
                    style={styles.modalInputField}
                    placeholder="e.g. O+, A+, B+"
                    placeholderTextColor={COLORS.textMuted}
                    value={walkInBlood}
                    onChangeText={setWalkInBlood}
                    testID="walkin-blood-input"
                  />
                </View>
              </View>

              <Text style={[styles.fieldSectionLabel, { marginTop: SPACING.sm }]}>GENDER</Text>
              <View style={styles.priorityRow}>
                {(["Male", "Female", "Other"] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.priorityChip, walkInGender === g && styles.priorityChipActive]}
                    onPress={() => setWalkInGender(g)}
                  >
                    <Text style={[styles.priorityText, walkInGender === g && styles.priorityTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.confirmTokenBtn}
                onPress={handleRegisterWalkIn}
                disabled={isRegistering}
                testID="submit-walkin-btn"
              >
                {isRegistering ? (
                  <ActivityIndicator color={COLORS.neutral.white} size="small" />
                ) : (
                  <>
                    <Sparkles size={16} color={COLORS.neutral.white} style={{ marginRight: 6 }} />
                    <Text style={styles.confirmTokenText}>Register & Proceed to Check-In</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  hospitalCard: {
    marginBottom: SPACING.base,
  },
  hospitalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  hospitalName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.xs,
  },
  hospitalRole: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  censusRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    justifyContent: "space-around",
  },
  censusItem: {
    alignItems: "center",
  },
  censusVal: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary[700],
  },
  censusLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  tokenSuccessCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.success[300],
    borderWidth: 1.5,
    marginBottom: SPACING.base,
    padding: SPACING.base,
    ...SHADOWS.md,
  },
  tokenSuccessHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  tokenSuccessTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
  },
  tokenSuccessSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  resetButton: {
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  resetButtonText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary[700],
  },
  tokenBadgeBox: {
    backgroundColor: COLORS.primary[50],
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },
  tokenNumberLarge: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.primary[900],
  },
  tokenCodeLarge: {
    fontSize: 13,
    fontFamily: "monospace",
    color: COLORS.primary[700],
    fontWeight: "700",
    marginTop: 2,
  },
  tokenMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  tokenMetaItem: {
    width: "50%",
    marginBottom: SPACING.xs,
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  tokenFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  waitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  waitBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary[700],
  },
  printButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.neutral[100],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  printButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.neutral[700],
  },
  patientIdentCard: {
    marginBottom: SPACING.base,
    padding: SPACING.base,
    borderColor: COLORS.primary[300],
    borderWidth: 1.5,
  },
  patientIdentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  patientAvatar: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[50],
    justifyContent: "center",
    alignItems: "center",
  },
  patientName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
  },
  patientOhid: {
    ...TYPOGRAPHY.caption,
    fontFamily: "monospace",
    color: COLORS.primary[700],
    fontWeight: "600",
  },
  patientMetaRow: {
    flexDirection: "row",
    marginVertical: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  metaCol: {
    flex: 1,
  },
  patientActionRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  issueTokenBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary[600],
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  issueTokenBtnText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.neutral.white,
    fontSize: 13,
  },
  cancelScanBtn: {
    paddingHorizontal: SPACING.md,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelScanText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
  },
  scannerTargetCard: {
    marginBottom: SPACING.base,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    alignItems: "center",
  },
  scannerViewport: {
    width: "100%",
    height: 140,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary[50],
    borderWidth: 2,
    borderColor: COLORS.primary[200],
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  scannerTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary[900],
    marginTop: SPACING.xs,
  },
  scannerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[700],
    textAlign: "center",
    marginTop: 2,
  },
  scanButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary[600],
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
  },
  scanButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.neutral.white,
  },
  manualSearchWrapper: {
    width: "100%",
    flexDirection: "row",
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  manualInput: {
    flex: 1,
    height: 42,
    backgroundColor: COLORS.neutral[50],
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  searchButton: {
    width: 42,
    height: 42,
    backgroundColor: COLORS.primary[600],
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: SPACING.sm,
    padding: SPACING.xs,
    backgroundColor: COLORS.danger[50],
    borderRadius: RADIUS.sm,
    width: "100%",
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger[800],
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary[50],
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  actionDetails: {
    flex: 1,
  },
  actionTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
  },
  actionDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.success[50],
    borderColor: COLORS.success[200],
    marginTop: SPACING.sm,
  },
  securityText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success[800],
    marginLeft: SPACING.sm,
    flex: 1,
  },

  // Modal full camera
  modalFullContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  modalHeaderBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalBarTitle: {
    color: COLORS.neutral.white,
    ...TYPOGRAPHY.bodyBold,
    fontSize: 16,
  },
  permissionBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  permTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.neutral.white,
    marginTop: SPACING.md,
  },
  permDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.neutral[400],
    textAlign: "center",
    marginTop: SPACING.xs,
  },
  permButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  permButtonText: {
    color: COLORS.neutral.white,
    ...TYPOGRAPHY.bodyBold,
  },
  cameraWrapper: {
    flex: 1,
    position: "relative",
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
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: COLORS.accent[400],
    borderRadius: RADIUS.lg,
  },
  scanHint: {
    marginTop: SPACING.md,
    color: COLORS.neutral.white,
    ...TYPOGRAPHY.captionBold,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  resolvingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary[900],
    paddingVertical: SPACING.sm,
  },
  resolvingText: {
    color: COLORS.neutral.white,
    ...TYPOGRAPHY.captionBold,
  },

  // Modal sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.base,
  },
  scrollModalCenter: {
    flexGrow: 1,
    justifyContent: "center",
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  modalTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.base,
  },
  modalSheetTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  modalSheetSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  fieldSectionLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  deptOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: 4,
    backgroundColor: COLORS.neutral[50],
  },
  deptOptionActive: {
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },
  deptOptionText: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  deptOptionTextActive: {
    color: COLORS.primary[800],
    fontWeight: "700",
  },
  priorityRow: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  priorityChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.neutral[100],
  },
  priorityChipActive: {
    backgroundColor: COLORS.primary[600],
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  priorityTextActive: {
    color: COLORS.neutral.white,
    fontWeight: "700",
  },
  complaintInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    fontSize: 12,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.neutral[50],
  },
  confirmTokenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary[600],
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    marginTop: SPACING.base,
  },
  confirmTokenText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.neutral.white,
    fontSize: 13,
  },
  modalInputField: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    fontSize: 12,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.neutral[50],
    marginBottom: SPACING.xs,
  },
  formSplitRow: {
    flexDirection: "row",
    marginTop: SPACING.xs,
  },
  modalErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: SPACING.xs,
    backgroundColor: COLORS.danger[50],
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
});
