/**
 * ONEHEALTH ID (OH-ID) Mobile — Patient Appointments Screen
 * Sathus Technology Pvt Ltd
 *
 * Displays upcoming clinic bookings, OPD walk-in queue tokens,
 * consultation schedules, and front-desk check-in status.
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
  Calendar,
  Clock,
  Building2,
  User,
  Ticket,
  AlertCircle,
  QrCode,
} from "lucide-react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../src/theme";
import { StatusBadge } from "../../src/components/common/StatusBadge";
import { Card } from "../../src/components/common/Card";
import { patientApi } from "../../src/services/api/patient";
import { AppointmentItem } from "../../src/types/patient";

const FILTERS = ["ALL", "CONFIRMED", "CHECKED_IN", "COMPLETED"] as const;
type FilterType = (typeof FILTERS)[number];

export default function PatientAppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    try {
      setError(null);
      const data = await patientApi.getAppointments();
      setAppointments(data);
    } catch (err: any) {
      console.error("Failed to load appointments", err);
      setError(err?.message || "Failed to load clinic appointments.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  const filteredAppointments = appointments.filter((appt) => {
    if (activeFilter === "ALL") return true;
    return appt.status === activeFilter;
  });

  return (
    <View style={styles.container} testID="patient-appointments-screen">
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
          <Text style={styles.screenTitle}>Appointments & Queue</Text>
          <Text style={styles.screenSubtitle}>Clinic Consultations & OPD Tokens</Text>
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
        <View style={styles.centerBox} testID="appointments-loading">
          <ActivityIndicator size="large" color={COLORS.primary[600]} />
          <Text style={styles.loadingText}>Fetching clinic queue status...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox} testID="appointments-error">
          <AlertCircle size={36} color={COLORS.error[500]} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAppointments}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filteredAppointments.length === 0 ? (
            <Card style={styles.emptyCard} testID="empty-appointments-state">
              <Calendar size={40} color={COLORS.neutral[300]} />
              <Text style={styles.emptyTitle}>No Appointments Found</Text>
              <Text style={styles.emptyDesc}>
                {activeFilter === "ALL"
                  ? "You have no upcoming or past clinic appointments scheduled."
                  : `No appointments currently marked as ${activeFilter}.`}
              </Text>
            </Card>
          ) : (
            filteredAppointments.map((appt) => (
              <Card key={appt.id} style={styles.appointmentCard} testID={`appointment-card-${appt.id}`}>
                {/* Card Top: Department & Status */}
                <View style={styles.apptTopRow}>
                  <View style={styles.deptBadge}>
                    <Text style={styles.deptText}>{appt.department}</Text>
                  </View>
                  <StatusBadge
                    label={appt.status}
                    variant={
                      appt.status === "CONFIRMED"
                        ? "ACTIVE"
                        : appt.status === "CHECKED_IN"
                        ? "VERIFIED"
                        : appt.status === "COMPLETED"
                        ? "HOLD"
                        : "PENDING"
                    }
                  />
                </View>

                {/* Doctor & Hospital Info */}
                <View style={styles.doctorInfoRow}>
                  <View style={styles.doctorIcon}>
                    <User size={18} color={COLORS.primary[600]} />
                  </View>
                  <View style={styles.doctorMeta}>
                    <Text style={styles.doctorName}>{appt.doctor_name}</Text>
                    <View style={styles.hospitalRow}>
                      <Building2 size={11} color={COLORS.neutral[500]} />
                      <Text style={styles.hospitalName}>{appt.hospital_name}</Text>
                    </View>
                  </View>
                </View>

                {/* Schedule & Token Banner */}
                <View style={styles.scheduleBanner}>
                  <View style={styles.timeItem}>
                    <Calendar size={12} color={COLORS.primary[600]} />
                    <Text style={styles.timeText}>{appt.appointment_date}</Text>
                  </View>
                  {appt.appointment_time && (
                    <View style={styles.timeItem}>
                      <Clock size={12} color={COLORS.primary[600]} />
                      <Text style={styles.timeText}>{appt.appointment_time}</Text>
                    </View>
                  )}
                  {appt.token_number ? (
                    <View style={styles.tokenPill}>
                      <Ticket size={11} color={COLORS.accent[700]} />
                      <Text style={styles.tokenText}>
                        Token #{appt.token_number}
                        {appt.token_str ? ` (${appt.token_str})` : ""}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Chief Complaint if available */}
                {appt.chief_complaint && (
                  <View style={styles.complaintBox}>
                    <Text style={styles.complaintLabel}>REASON FOR VISIT</Text>
                    <Text style={styles.complaintText}>{appt.chief_complaint}</Text>
                  </View>
                )}

                {/* Check-In Action Callout */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.qrActionBtn}
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Present Health Pass at Kiosk"
                  >
                    <QrCode size={13} color={COLORS.primary[600]} />
                    <Text style={styles.qrActionText}>Present OH-ID Pass at Front Desk</Text>
                  </TouchableOpacity>
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
  appointmentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  apptTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deptBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: COLORS.primary[50],
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },
  deptText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary[700],
    textTransform: "uppercase",
  },
  doctorInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  doctorIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[50],
    justifyContent: "center",
    alignItems: "center",
  },
  doctorMeta: {
    flex: 1,
  },
  doctorName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
  },
  hospitalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  hospitalName: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  scheduleBanner: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.sm,
    backgroundColor: COLORS.neutral[50],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  timeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.neutral[700],
  },
  tokenPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.accent[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  tokenText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.accent[900],
    fontFamily: "monospace",
  },
  complaintBox: {
    marginTop: SPACING.sm,
    padding: SPACING.xs,
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADIUS.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.neutral[400],
  },
  complaintLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.neutral[500],
    letterSpacing: 0.5,
  },
  complaintText: {
    fontSize: 11,
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  actionRow: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  qrActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    backgroundColor: COLORS.primary[50],
    borderRadius: RADIUS.md,
  },
  qrActionText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary[700],
  },
});
