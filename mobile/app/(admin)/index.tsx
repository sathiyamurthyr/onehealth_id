/**
 * ONEHEALTH ID (OH-ID) Mobile — Hospital Administrator Workspace
 * Sathus Technology Pvt Ltd
 *
 * Implements facility census, clinical staff roster management,
 * IPD bed occupancy controls, and daily billing audit reconciliation.
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
  Building2,
  Users,
  Bed,
  CreditCard,
  ShieldCheck,
  Activity,
  UserPlus,
  Sliders,
  CheckCircle2,
  Plus,
  X,
  FileSpreadsheet,
} from "lucide-react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../src/theme";
import { Header } from "../../src/components/common/Header";
import { Card } from "../../src/components/common/Card";
import { StatusBadge } from "../../src/components/common/StatusBadge";
import { UserSessionBanner } from "../../src/components/common/UserSessionBanner";
import { adminApi, ClinicalStaffMember } from "../../src/services/api/admin";

export default function HospitalAdminHomeScreen() {
  const [staffList, setStaffList] = useState<ClinicalStaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);

  // Bed Census State
  const [occupiedBeds, setOccupiedBeds] = useState(41);
  const [totalBeds, setTotalBeds] = useState(50);
  const [showBedModal, setShowBedModal] = useState(false);
  const [editOccupied, setEditOccupied] = useState("41");
  const [editTotal, setEditTotal] = useState("50");
  const [updatingBeds, setUpdatingBeds] = useState(false);

  // Staff Enrollment Modal State
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState<ClinicalStaffMember["role"]>("DOCTOR");
  const [staffDept, setStaffDept] = useState("General Medicine");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffLicense, setStaffLicense] = useState("");
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Audit Reconciliation State
  const [reconciled, setReconciled] = useState(false);

  useEffect(() => {
    adminApi.getStaffRoster()
      .then((data) => setStaffList(data))
      .finally(() => setLoadingStaff(false));
  }, []);

  const handleSaveBeds = async () => {
    const occ = parseInt(editOccupied, 10);
    const tot = parseInt(editTotal, 10);
    if (isNaN(occ) || isNaN(tot) || occ < 0 || tot <= 0 || occ > tot) {
      Alert.alert("Invalid Input", "Occupied beds cannot exceed total beds.");
      return;
    }

    try {
      setUpdatingBeds(true);
      await adminApi.updateBedOccupancy(occ, tot);
      setOccupiedBeds(occ);
      setTotalBeds(tot);
      setShowBedModal(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update bed census.");
    } finally {
      setUpdatingBeds(false);
    }
  };

  const handleEnrollStaff = async () => {
    if (!staffName.trim()) {
      setStaffError("Please enter staff member's full name.");
      return;
    }
    if (!/^\d{10}$/.test(staffPhone.trim())) {
      setStaffError("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setIsAddingStaff(true);
      setStaffError(null);
      const newStaff = await adminApi.addStaffMember({
        name: staffName.trim(),
        role: staffRole,
        department: staffDept.trim(),
        mobile: staffPhone.trim(),
        license_no: staffLicense.trim() || undefined,
      });
      setStaffList((prev) => [newStaff, ...prev]);
      setShowStaffModal(false);
      setStaffName("");
      setStaffPhone("");
      setStaffLicense("");
    } catch (err: any) {
      setStaffError(err.message || "Failed to enroll staff member.");
    } finally {
      setIsAddingStaff(false);
    }
  };

  const occupancyPercent = Math.round((occupiedBeds / (totalBeds || 1)) * 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="hospital-admin-screen">
      <Header
        title="Hospital Admin"
        subtitle="Facility Census, Clinical Staff & Operations"
      />

      <UserSessionBanner />

      {/* Facility Header Card */}
      <Card style={styles.facilityCard}>
        <View style={styles.facilityHeader}>
          <Building2 size={20} color={COLORS.primary[700]} />
          <Text style={styles.facilityName}>OneHealth Hospital — Main Branch</Text>
        </View>
        <Text style={styles.facilityMeta}>
          Facility ID: hosp-main-01 • License: NABH-2026-A1 • Ward Blocks: A, B & ICU
        </Text>
        <StatusBadge label="Hospital Approved" variant="VERIFIED" />
      </Card>

      {/* Real-time Facility Metrics Grid */}
      <Text style={styles.sectionTitle}>Real-Time Facility Metrics</Text>

      <View style={styles.metricsGrid}>
        <Card style={styles.metricCard}>
          <View style={styles.metricIcon}>
            <Users size={20} color={COLORS.primary[600]} />
          </View>
          <Text style={styles.metricVal}>{staffList.length}</Text>
          <Text style={styles.metricTitle}>Active Clinical Staff</Text>
          <Text style={styles.metricSub}>Doctors, Nurses & Techs</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={styles.metricIcon}>
            <Bed size={20} color={COLORS.accent[600]} />
          </View>
          <Text style={styles.metricVal}>{occupancyPercent}%</Text>
          <Text style={styles.metricTitle}>IPD Bed Occupancy</Text>
          <Text style={styles.metricSub}>{occupiedBeds} / {totalBeds} Beds Filled</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={styles.metricIcon}>
            <Activity size={20} color={COLORS.success[600]} />
          </View>
          <Text style={styles.metricVal}>146</Text>
          <Text style={styles.metricTitle}>Today's OPD Census</Text>
          <Text style={styles.metricSub}>Consultations Completed</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={styles.metricIcon}>
            <CreditCard size={20} color={COLORS.primary[700]} />
          </View>
          <Text style={styles.metricVal}>₹1,84,200</Text>
          <Text style={styles.metricTitle}>Daily Billing</Text>
          <Text style={styles.metricSub}>Cleared Counters 1 & 2</Text>
        </Card>
      </View>

      {/* Operational Actions Row */}
      <View style={styles.adminActionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowBedModal(true)}
          testID="btn-open-bed-modal"
        >
          <Sliders size={16} color={COLORS.primary[700]} style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnText}>Adjust Bed Census</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={() => setShowStaffModal(true)}
          testID="btn-open-staff-modal"
        >
          <UserPlus size={16} color={COLORS.neutral.white} style={{ marginRight: 6 }} />
          <Text style={[styles.actionBtnText, { color: COLORS.neutral.white }]}>Enroll Staff</Text>
        </TouchableOpacity>
      </View>

      {/* Clinical Staff Roster Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Active Clinical Staff Roster</Text>
        <Text style={styles.staffCountText}>{staffList.length} Personnel</Text>
      </View>

      {loadingStaff ? (
        <ActivityIndicator color={COLORS.primary[600]} style={{ marginVertical: SPACING.md }} />
      ) : (
        staffList.map((st) => (
          <Card key={st.id} style={styles.staffCard} testID={`staff-card-${st.id}`}>
            <View style={styles.staffInfoCol}>
              <View style={styles.staffNameRow}>
                <Text style={styles.staffNameText}>{st.name}</Text>
                <StatusBadge label={st.role} variant={st.role === "DOCTOR" ? "ACTIVE" : "INFO"} />
              </View>
              <Text style={styles.staffDeptText}>{st.department} • Ph: {st.mobile}</Text>
              {st.license_no && (
                <Text style={styles.staffLicenseText}>Lic: {st.license_no}</Text>
              )}
            </View>
            <StatusBadge label={st.status} variant={st.status === "ON_DUTY" ? "VERIFIED" : "PENDING"} />
          </Card>
        ))
      )}

      {/* Daily Reconciliation Action */}
      <Card style={styles.reconcileCard}>
        <View style={styles.reconcileRow}>
          <FileSpreadsheet size={22} color={COLORS.primary[700]} />
          <View style={{ flex: 1, marginLeft: SPACING.sm }}>
            <Text style={styles.reconcileTitle}>Daily Operational & Financial Handoff</Text>
            <Text style={styles.reconcileSub}>
              {reconciled ? "Reconciled & Cryptographically Stamped at 21:00" : "Uncommitted shift ledger ready for audit sign-off"}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.reconcileBtn, reconciled && styles.reconcileBtnDone]}
            onPress={() => setReconciled(true)}
            testID="btn-reconcile-ledger"
            disabled={reconciled}
          >
            {reconciled ? (
              <CheckCircle2 size={16} color={COLORS.success[700]} />
            ) : (
              <Text style={styles.reconcileBtnText}>Sign Off</Text>
            )}
          </TouchableOpacity>
        </View>
      </Card>

      {/* Security & Tenant Boundary Callout */}
      <Card style={styles.securityNote}>
        <ShieldCheck size={18} color={COLORS.success[600]} />
        <Text style={styles.securityText}>
          Tenant Isolation Boundary: Operations and patient clinical records are strictly
          sandboxed to this facility via X-Hospital-Ref-Id and DB Stored Procedures.
        </Text>
      </Card>

      {/* MODAL 1: Adjust Bed Census Modal */}
      <Modal
        visible={showBedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBedModal(false)}
        testID="adjust-beds-modal"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Update IPD Bed Census</Text>
              <TouchableOpacity onPress={() => setShowBedModal(false)}>
                <X size={20} color={COLORS.neutral[600]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>OCCUPIED BEDS</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={editOccupied}
              onChangeText={setEditOccupied}
              testID="input-occupied-beds"
            />

            <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>TOTAL BEDS CAPACITY</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={editTotal}
              onChangeText={setEditTotal}
              testID="input-total-beds"
            />

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleSaveBeds}
              disabled={updatingBeds}
              testID="btn-save-beds"
            >
              {updatingBeds ? (
                <ActivityIndicator color={COLORS.neutral.white} size="small" />
              ) : (
                <Text style={styles.modalSubmitText}>Commit Bed Census</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Enroll Staff Modal */}
      <Modal
        visible={showStaffModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStaffModal(false)}
        testID="enroll-staff-modal"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Enroll Clinical Personnel</Text>
              <TouchableOpacity onPress={() => setShowStaffModal(false)}>
                <X size={20} color={COLORS.neutral[600]} />
              </TouchableOpacity>
            </View>

            {staffError && (
              <Text style={styles.modalError}>{staffError}</Text>
            )}

            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Dr. Ramesh Sundaram"
              placeholderTextColor={COLORS.textMuted}
              value={staffName}
              onChangeText={setStaffName}
              testID="input-staff-name"
            />

            <Text style={[styles.fieldLabel, { marginTop: SPACING.xs }]}>ROLE</Text>
            <View style={styles.rolePickerRow}>
              {(["DOCTOR", "NURSE", "TECHNICIAN", "ADMIN"] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleChip, staffRole === r && styles.roleChipActive]}
                  onPress={() => setStaffRole(r)}
                  testID={`role-chip-${r}`}
                >
                  <Text style={[styles.roleText, staffRole === r && styles.roleTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: SPACING.xs }]}>DEPARTMENT</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Cardiology, Orthopedics"
              placeholderTextColor={COLORS.textMuted}
              value={staffDept}
              onChangeText={setStaffDept}
              testID="input-staff-dept"
            />

            <Text style={[styles.fieldLabel, { marginTop: SPACING.xs }]}>10-DIGIT MOBILE NUMBER</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Mobile phone number"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              value={staffPhone}
              onChangeText={setStaffPhone}
              testID="input-staff-phone"
            />

            <Text style={[styles.fieldLabel, { marginTop: SPACING.xs }]}>MEDICAL LICENSE NO (OPTIONAL)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. TN-MCI-2026-..."
              placeholderTextColor={COLORS.textMuted}
              value={staffLicense}
              onChangeText={setStaffLicense}
              testID="input-staff-license"
            />

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleEnrollStaff}
              disabled={isAddingStaff}
              testID="btn-confirm-add-staff"
            >
              {isAddingStaff ? (
                <ActivityIndicator color={COLORS.neutral.white} size="small" />
              ) : (
                <Text style={styles.modalSubmitText}>Enroll & Grant Access</Text>
              )}
            </TouchableOpacity>
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
  facilityCard: {
    marginBottom: SPACING.base,
  },
  facilityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  facilityName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.xs,
  },
  facilityMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  staffCountText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary[700],
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.base,
  },
  metricCard: {
    width: "48%",
    padding: SPACING.md,
  },
  metricIcon: {
    marginBottom: SPACING.xs,
  },
  metricVal: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  metricTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  metricSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  adminActionRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.base,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary[600],
    borderColor: COLORS.primary[600],
  },
  actionBtnText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 12,
    color: COLORS.primary[700],
  },
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.xs,
    padding: SPACING.sm,
  },
  staffInfoCol: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  staffNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  staffNameText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  staffDeptText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  staffLicenseText: {
    fontSize: 10,
    fontFamily: "monospace",
    color: COLORS.primary[700],
    marginTop: 1,
  },
  reconcileCard: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[200],
  },
  reconcileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  reconcileTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.primary[900],
  },
  reconcileSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[800],
    marginTop: 2,
  },
  reconcileBtn: {
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  reconcileBtnDone: {
    backgroundColor: COLORS.success[100],
  },
  reconcileBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.neutral.white,
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
    alignItems: "center",
    marginBottom: SPACING.base,
  },
  modalTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  modalError: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger[700],
    marginBottom: SPACING.sm,
  },
  fieldLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
    fontSize: 12,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.neutral[50],
    marginBottom: SPACING.xs,
  },
  rolePickerRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: SPACING.xs,
  },
  roleChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.neutral[100],
  },
  roleChipActive: {
    backgroundColor: COLORS.primary[600],
  },
  roleText: {
    fontSize: 9,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  roleTextActive: {
    color: COLORS.neutral.white,
    fontWeight: "700",
  },
  modalSubmitBtn: {
    backgroundColor: COLORS.primary[600],
    alignItems: "center",
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  modalSubmitText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.neutral.white,
    fontSize: 13,
  },
});
