/**
 * ONEHEALTH ID (OH-ID) Mobile — Patient Prescriptions Screen
 * Sathus Technology Pvt Ltd
 *
 * Displays doctor-prescribed medications, dosage instructions,
 * real-time calculated prescription statuses, and verified digital signatures.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Pill,
  Clock,
  Building2,
  User,
  CheckCircle2,
  FileCheck,
  AlertCircle,
} from "lucide-react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../src/theme";
import { StatusBadge } from "../../src/components/common/StatusBadge";
import { Card } from "../../src/components/common/Card";
import { patientApi } from "../../src/services/api/patient";
import { PrescriptionItem } from "../../src/types/patient";

const FILTERS = ["ALL", "ACTIVE", "COMPLETED", "SUPERSEDED"] as const;
type FilterType = (typeof FILTERS)[number];

export default function PatientPrescriptionsScreen() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [error, setError] = useState<string | null>(null);

  const loadPrescriptions = useCallback(async (filter: FilterType) => {
    try {
      setError(null);
      const statusParam = filter === "ALL" ? undefined : filter;
      const data = await patientApi.getPrescriptions(statusParam);
      setPrescriptions(data);
    } catch (err: any) {
      console.error("Failed to load prescriptions", err);
      setError(err?.message || "Failed to load prescriptions from clinical records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPrescriptions(activeFilter);
  }, [activeFilter, loadPrescriptions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPrescriptions(activeFilter);
  };

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (activeFilter === "ALL") return true;
    return rx.status === activeFilter;
  });

  return (
    <View style={styles.container} testID="patient-prescriptions-screen">
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          testID="back-to-patient-home"
          accessibilityRole="button"
          accessibilityLabel="Back to Patient Home"
        >
          <ArrowLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.screenTitle}>Clinical Prescriptions</Text>
          <Text style={styles.screenSubtitle}>Doctor RxPad & Medication Schedules</Text>
        </View>
      </View>

      {/* Filter Chips Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => {
            const isSelected = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setActiveFilter(f)}
                testID={`filter-chip-${f.toLowerCase()}`}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.centerBox} testID="prescriptions-loading">
          <ActivityIndicator size="large" color={COLORS.primary[600]} />
          <Text style={styles.loadingText}>Fetching active medications...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox} testID="prescriptions-error">
          <AlertCircle size={36} color={COLORS.error[500]} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadPrescriptions(activeFilter)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filteredPrescriptions.length === 0 ? (
            <Card style={styles.emptyCard} testID="empty-prescriptions-state">
              <Pill size={40} color={COLORS.neutral[300]} />
              <Text style={styles.emptyTitle}>No Prescriptions Found</Text>
              <Text style={styles.emptyDesc}>
                {activeFilter === "ALL"
                  ? "You have no recorded prescriptions across registered hospital facilities."
                  : `No prescriptions currently marked as ${activeFilter}.`}
              </Text>
            </Card>
          ) : (
            filteredPrescriptions.map((rx) => (
              <Card key={rx.id} style={styles.prescriptionCard} testID={`prescription-card-${rx.id}`}>
                {/* Rx Header */}
                <View style={styles.rxHeader}>
                  <View style={styles.rxDoctorInfo}>
                    <View style={styles.iconCircle}>
                      <Pill size={16} color={COLORS.primary[600]} />
                    </View>
                    <View>
                      <Text style={styles.rxDoctorName}>{rx.doctor_name}</Text>
                      <View style={styles.rxHospitalRow}>
                        <Building2 size={11} color={COLORS.neutral[500]} />
                        <Text style={styles.rxHospitalText}>{rx.hospital_name}</Text>
                      </View>
                    </View>
                  </View>
                  <StatusBadge
                    label={rx.status}
                    variant={
                      rx.status === "ACTIVE"
                        ? "ACTIVE"
                        : rx.status === "COMPLETED"
                        ? "VERIFIED"
                        : rx.status === "SUPERSEDED"
                        ? "PENDING"
                        : "HOLD"
                    }
                  />
                </View>

                {/* Date & Prescription Code Bar */}
                <View style={styles.rxMetaBar}>
                  <View style={styles.rxMetaItem}>
                    <Clock size={11} color={COLORS.neutral[400]} />
                    <Text style={styles.rxMetaText}>{rx.date}</Text>
                  </View>
                  {rx.prescription_code && (
                    <Text style={styles.rxCodeText}>{rx.prescription_code}</Text>
                  )}
                </View>

                {/* Diagnosis if available */}
                {rx.diagnosis && (
                  <View style={styles.diagnosisBox}>
                    <Text style={styles.diagnosisLabel}>DIAGNOSIS</Text>
                    <Text style={styles.diagnosisValue}>{rx.diagnosis}</Text>
                  </View>
                )}

                {/* Medicine Items List */}
                <View style={styles.medicineList}>
                  <Text style={styles.medicineSectionTitle}>Prescribed Medicines</Text>
                  {rx.medicines?.map((med, mIdx) => (
                    <View key={mIdx} style={styles.medicineItem}>
                      <View style={styles.medBullet} />
                      <View style={styles.medDetails}>
                        <Text style={styles.medName}>{med.name}</Text>
                        <Text style={styles.medDosage}>
                          {med.dosage} • {med.frequency}
                          {med.duration ? ` • ${med.duration}` : ""}
                        </Text>
                        {med.instructions && (
                          <Text style={styles.medInstructions}>{med.instructions}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>

                {/* Digital Signing Badge */}
                <View style={styles.rxFooter}>
                  <View style={styles.verifiedRow}>
                    <FileCheck size={12} color={COLORS.success[600]} />
                    <Text style={styles.verifiedText}>Digitally Signed by Clinician</Text>
                  </View>
                  <Text style={styles.abdmNotice}>ABDM Health Record</Text>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      )}
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
  filterBar: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.xs,
  },
  filterScroll: {
    paddingHorizontal: SPACING.base,
    gap: SPACING.xs,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.neutral[100],
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipActive: {
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[300],
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.neutral[600],
  },
  filterChipTextActive: {
    color: COLORS.primary[700],
    fontWeight: "700",
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  errorText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    color: COLORS.error[700],
    textAlign: "center",
  },
  retryButton: {
    marginTop: SPACING.base,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primary[600],
    borderRadius: RADIUS.md,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    padding: SPACING.base,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.md,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxl,
    marginTop: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginTop: SPACING.base,
  },
  emptyDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "center",
    maxWidth: 260,
    marginTop: SPACING.xs,
  },
  prescriptionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  rxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  rxDoctorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[50],
    justifyContent: "center",
    alignItems: "center",
  },
  rxDoctorName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
  },
  rxHospitalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  rxHospitalText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  rxMetaBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.neutral[50],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  rxMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rxMetaText: {
    fontSize: 10,
    color: COLORS.neutral[500],
    fontWeight: "500",
  },
  rxCodeText: {
    fontSize: 10,
    fontFamily: "monospace",
    color: COLORS.neutral[600],
    fontWeight: "600",
  },
  diagnosisBox: {
    marginTop: SPACING.sm,
    padding: SPACING.xs,
    backgroundColor: COLORS.primary[50],
    borderRadius: RADIUS.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary[500],
  },
  diagnosisLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.primary[700],
    letterSpacing: 0.5,
  },
  diagnosisValue: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary[900],
    marginTop: 1,
  },
  medicineList: {
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.xs,
  },
  medicineSectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.neutral[400],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  medicineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.xs,
    marginVertical: 4,
  },
  medBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary[400],
    marginTop: 5,
  },
  medDetails: {
    flex: 1,
  },
  medName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  medDosage: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  medInstructions: {
    fontSize: 10,
    fontStyle: "italic",
    color: COLORS.neutral[500],
    marginTop: 1,
  },
  rxFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: COLORS.success[700],
    fontWeight: "600",
  },
  abdmNotice: {
    fontSize: 9,
    color: COLORS.neutral[400],
  },
});
