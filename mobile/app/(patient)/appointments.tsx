/**
 * ONEHEALTH ID (OH-ID) Mobile — Patient Appointments Screen
 * Sathus Technology Pvt Ltd
 *
 * Displays upcoming clinic bookings, OPD walk-in queue tokens,
 * consultation schedules, and front-desk check-in status.
 * Integrates the complete 7-step Book Appointment flow.
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
  Platform,
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
  ChevronRight,
  Plus,
  MoreVertical,
  Edit3,
  Repeat,
  XCircle,
  Info,
} from "lucide-react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../src/theme";
import { StatusBadge } from "../../src/components/common/StatusBadge";
import { Card } from "../../src/components/common/Card";
import { AppHeader, PatientBottomNav } from "../../src/components/common";
import { patientApi } from "../../src/services/api/patient";
import { AppointmentItem } from "../../src/types/patient";
import {
  BookAppointmentModal,
  AppointmentManagementModal,
  AppointmentManagementViewMode,
} from "../../src/components/patient";
import { AppointmentsSkeleton } from "../../src/components/loading";

interface FilterOption {
  label: string;
  value: string;
}

const FILTERS: FilterOption[] = [
  { label: "ALL", value: "ALL" },
  { label: "CONFIRMED", value: "CONFIRMED" },
  { label: "CHECKED IN", value: "CHECKED_IN" },
  { label: "COMPLETED", value: "COMPLETED" },
];

export default function PatientAppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);

  // 8-Screen Appointment Management Modal State
  const [managementModalVisible, setManagementModalVisible] = useState(false);
  const [managementMode, setManagementMode] = useState<AppointmentManagementViewMode>("details");
  const [selectedAppt, setSelectedAppt] = useState<AppointmentItem | null>(null);
  const [activeMenuApptId, setActiveMenuApptId] = useState<string | null>(null);

  const handleOpenDetails = (appt: AppointmentItem) => {
    setSelectedAppt(appt);
    setManagementMode("details");
    setActiveMenuApptId(null);
    setManagementModalVisible(true);
  };

  const handleOpenAction = (appt: AppointmentItem, mode: AppointmentManagementViewMode) => {
    setSelectedAppt(appt);
    setManagementMode(mode);
    setActiveMenuApptId(null);
    setManagementModalVisible(true);
  };

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
    const normApptStatus = (appt.status || "").replace(/[-\s]/g, "_").toUpperCase();
    const normFilter = activeFilter.replace(/[-\s]/g, "_").toUpperCase();
    return normApptStatus === normFilter;
  });

  return (
    <View style={styles.container} testID="patient-appointments-screen">
      {/* Global Standardized Header: White Card + Subtle Blue Divider + Outlined Notification & Profile */}
      <AppHeader
        title="Appointments & Queue"
        subtitle="Clinic Consultations & OPD Tokens"
        showBackButton={true}
      />

      {/* Filter Chips Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => {
            const isSelected = activeFilter === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.value)}
                testID={`filter-chip-${f.value.toLowerCase().replace('_', '-')}`}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity
          style={styles.headerRightAction}
          onPress={() => {
            setSelectedAppt(appointments[0] || null);
            setManagementMode("overview");
            setManagementModalVisible(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Appointment Features Overview"
          testID="btn-appointment-management-overview"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Info size={16} color="#155EEF" />
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View testID="appointments-loading" style={{ flex: 1 }}>
          <AppointmentsSkeleton />
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
          {/* Top Action Card: Book Appointment (Matching Reference Screen 1) */}
          <TouchableOpacity
            style={styles.bookActionCard}
            onPress={() => setBookingModalVisible(true)}
            testID="btn-book-appointment-card"
            activeOpacity={0.85}
          >
            <View style={styles.bookActionIconContainer}>
              <Calendar size={22} color={COLORS.primary[600]} />
              <View style={styles.plusBadge}>
                <Plus size={10} color={COLORS.white} strokeWidth={3} />
              </View>
            </View>
            <View style={styles.bookActionTextContainer}>
              <Text style={styles.bookActionTitle}>Book Appointment</Text>
              <Text style={styles.bookActionSubtitle}>
                Find a hospital, choose a doctor and book your next consultation.
              </Text>
            </View>
            <ChevronRight size={18} color={COLORS.neutral[400]} />
          </TouchableOpacity>

          {/* Empty State vs Appointment Cards List */}
          {filteredAppointments.length === 0 ? (
            <View style={styles.emptyContainer} testID="empty-appointments-state">
              <View style={styles.emptyDashedBox}>
                <Calendar size={44} color={COLORS.neutral[300]} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No Appointments Found</Text>
              <Text style={styles.emptyDesc}>
                {activeFilter === "ALL"
                  ? "You have no upcoming or past clinic appointments scheduled."
                  : `No appointments currently marked as ${activeFilter.replace('_', ' ')}.`}
              </Text>
              <TouchableOpacity
                style={styles.bookFirstButton}
                onPress={() => setBookingModalVisible(true)}
                testID="btn-book-first-appointment"
                activeOpacity={0.85}
              >
                <Text style={styles.bookFirstButtonText}>Book Your First Appointment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredAppointments.map((appt) => (
              <Card key={appt.id} style={styles.appointmentCard} testID={`appointment-card-${appt.id}`}>
                {/* Card Top: Department & Status */}
                <View style={styles.apptTopRow}>
                  <View style={styles.deptBadge}>
                    <Text style={styles.deptText}>{appt.department || "General OPD"}</Text>
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
                    {appt.doctor_qualification && (
                      <Text style={styles.doctorQualification}>{appt.doctor_qualification}</Text>
                    )}
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

                {/* Chief Complaint / Notes if available */}
                {(appt.chief_complaint || appt.reason) && (
                  <View style={styles.complaintBox}>
                    <Text style={styles.complaintLabel}>REASON FOR VISIT</Text>
                    <Text style={styles.complaintText}>{appt.chief_complaint || appt.reason}</Text>
                  </View>
                )}

                {/* Screen 1 Actions Row: View Details + 3-Dots Dropdown */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => handleOpenDetails(appt)}
                    testID={`btn-view-details-${appt.id}`}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewDetailsButtonText}>View Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.moreOptionsButton}
                    onPress={() => setActiveMenuApptId(activeMenuApptId === appt.id ? null : appt.id)}
                    testID={`btn-appointment-more-${appt.id}`}
                    activeOpacity={0.7}
                    accessibilityLabel="More appointment options"
                  >
                    <MoreVertical size={18} color="#344054" />
                  </TouchableOpacity>
                </View>

                {/* 3-Dots Popup Dropdown Menu */}
                {activeMenuApptId === appt.id && (
                  <View style={styles.dropdownMenu} testID={`dropdown-menu-${appt.id}`}>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleOpenAction(appt, "edit")}
                      testID={`menu-edit-${appt.id}`}
                      activeOpacity={0.7}
                    >
                      <Edit3 size={15} color="#344054" style={{ marginRight: 8 }} />
                      <Text style={styles.menuItemText}>Edit Appointment</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleOpenAction(appt, "reschedule")}
                      testID={`menu-reschedule-${appt.id}`}
                      activeOpacity={0.7}
                    >
                      <Calendar size={15} color="#344054" style={{ marginRight: 8 }} />
                      <Text style={styles.menuItemText}>Reschedule</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleOpenAction(appt, "change_doctor")}
                      testID={`menu-change-doctor-${appt.id}`}
                      activeOpacity={0.7}
                    >
                      <Repeat size={15} color="#344054" style={{ marginRight: 8 }} />
                      <Text style={styles.menuItemText}>Change Doctor</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.menuItem, { borderBottomWidth: 0 }]}
                      onPress={() => handleOpenAction(appt, "cancel")}
                      testID={`menu-cancel-${appt.id}`}
                      activeOpacity={0.7}
                    >
                      <XCircle size={15} color="#D92D20" style={{ marginRight: 8 }} />
                      <Text style={[styles.menuItemText, { color: "#D92D20" }]}>Cancel Appointment</Text>
                    </TouchableOpacity>
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

      {/* Guided 7-Step Book Appointment Modal */}
      <BookAppointmentModal
        visible={bookingModalVisible}
        onClose={() => setBookingModalVisible(false)}
        onBookingSuccess={(newAppt) => {
          loadAppointments();
        }}
      />

      {/* Official 8-Screen Appointment Management Modal */}
      <AppointmentManagementModal
        visible={managementModalVisible}
        appointment={selectedAppt}
        initialMode={managementMode}
        onClose={() => {
          setManagementModalVisible(false);
          setSelectedAppt(null);
        }}
        onAppointmentUpdated={() => {
          loadAppointments();
        }}
      />

      {/* Persistent Bottom Navigation */}
      <PatientBottomNav activeTab="appointments" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
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
    marginRight: SPACING.xs,
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
  headerRightAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
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

  /* Top Action Card */
  bookActionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  bookActionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[100],
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  plusBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[600],
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  plusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.white,
    lineHeight: 11,
  },
  bookActionTextContainer: {
    flex: 1,
    marginHorizontal: SPACING.sm,
  },
  bookActionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  bookActionSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
    marginTop: 2,
  },

  /* Empty State */
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.base,
  },
  emptyDashedBox: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: COLORS.neutral[200],
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.neutral[50],
    marginBottom: SPACING.base,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  emptyDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "center",
    maxWidth: 280,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  bookFirstButton: {
    backgroundColor: COLORS.primary[600],
    paddingVertical: 12,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    ...SHADOWS.sm,
  },
  bookFirstButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },

  /* Appointment Card */
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
    width: 38,
    height: 38,
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
  doctorQualification: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: "500",
    marginTop: 1,
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
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
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
  /* Screen 1 Actions & Dropdown */
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F2F4F7",
  },
  viewDetailsButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#155EEF",
  },
  viewDetailsButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#155EEF",
  },
  moreOptionsButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E4EAF2",
    paddingVertical: 4,
    marginTop: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F4F7",
  },
  menuItemText: {
    fontSize: 12,
    color: "#344054",
    fontWeight: "600",
  },
});
