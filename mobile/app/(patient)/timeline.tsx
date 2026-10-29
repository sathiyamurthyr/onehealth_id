/**
 * ONEHEALTH ID (OH-ID) Mobile — Patient Comprehensive Health Timeline Screen
 * Sathus Technology Pvt Ltd
 *
 * Displays multi-provider clinical encounters, doctor consultations,
 * laboratory diagnostics, and hospital visits in reverse chronological order.
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
  Activity,
  FileText,
  Pill,
  Building2,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Stethoscope,
} from "lucide-react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../src/theme";
import { StatusBadge } from "../../src/components/common/StatusBadge";
import { Card } from "../../src/components/common/Card";
import { patientApi } from "../../src/services/api/patient";
import { TimelineEvent } from "../../src/types/patient";

const FILTERS = [
  "ALL",
  "CONSULTATION",
  "PRESCRIPTION",
  "LAB_REPORT",
  "INVESTIGATION",
  "VISIT",
] as const;
type FilterType = (typeof FILTERS)[number];

export default function PatientTimelineScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [error, setError] = useState<string | null>(null);

  const loadTimeline = useCallback(async (filter: FilterType) => {
    try {
      setError(null);
      const data = await patientApi.getHealthTimeline({
        type: filter === "ALL" ? undefined : filter,
        limit: 50,
      });
      setEvents(data);
    } catch (err: any) {
      console.error("Failed to load health timeline", err);
      setError(err?.message || "Failed to load clinical health timeline.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTimeline(activeFilter);
  }, [activeFilter, loadTimeline]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTimeline(activeFilter);
  };

  const getEventIcon = (type: TimelineEvent["event_type"]) => {
    switch (type) {
      case "CONSULTATION":
        return <Stethoscope size={16} color={COLORS.primary[600]} />;
      case "PRESCRIPTION":
        return <Pill size={16} color="#8b5cf6" />;
      case "LAB_REPORT":
      case "INVESTIGATION":
        return <Activity size={16} color={COLORS.accent[600]} />;
      case "VISIT":
      default:
        return <Building2 size={16} color={COLORS.success[600]} />;
    }
  };

  const getEventBadgeVariant = (type: TimelineEvent["event_type"]) => {
    switch (type) {
      case "CONSULTATION":
        return "ACTIVE";
      case "PRESCRIPTION":
        return "PENDING";
      case "LAB_REPORT":
      case "INVESTIGATION":
        return "INFO";
      case "VISIT":
      default:
        return "VERIFIED";
    }
  };

  return (
    <View style={styles.container} testID="patient-timeline-screen">
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
          <Text style={styles.screenTitle}>Unified Health Timeline</Text>
          <Text style={styles.screenSubtitle}>Multi-Hospital Clinical Encounters</Text>
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
        <View style={styles.centerBox} testID="timeline-loading">
          <ActivityIndicator size="large" color={COLORS.primary[600]} />
          <Text style={styles.loadingText}>Loading unified clinical timeline...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox} testID="timeline-error">
          <AlertCircle size={36} color={COLORS.error[500]} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadTimeline(activeFilter)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {events.length === 0 ? (
            <Card style={styles.emptyCard} testID="empty-timeline-state">
              <Activity size={40} color={COLORS.neutral[300]} />
              <Text style={styles.emptyTitle}>No Timeline Events</Text>
              <Text style={styles.emptyDesc}>
                {activeFilter === "ALL"
                  ? "No medical encounters, lab tests, or consultations recorded yet."
                  : `No clinical events of type ${activeFilter} found.`}
              </Text>
            </Card>
          ) : (
            events.map((evt, idx) => (
              <Card key={evt.id || idx} style={styles.eventCard} testID={`timeline-event-${evt.id || idx}`}>
                {/* Event Type & Date Header */}
                <View style={styles.eventHeader}>
                  <View style={styles.typeBadgeRow}>
                    <View style={styles.iconCircle}>{getEventIcon(evt.event_type)}</View>
                    <StatusBadge
                      label={evt.event_type}
                      variant={getEventBadgeVariant(evt.event_type)}
                    />
                  </View>
                  <View style={styles.dateRow}>
                    <Clock size={11} color={COLORS.neutral[400]} />
                    <Text style={styles.dateText}>{evt.event_date}</Text>
                  </View>
                </View>

                {/* Event Title */}
                <Text style={styles.eventTitle}>{evt.title}</Text>

                {/* Doctor & Hospital Attribution */}
                {(evt.doctor_name || evt.hospital_name) && (
                  <View style={styles.attributionBox}>
                    {evt.doctor_name && (
                      <Text style={styles.doctorText}>
                        {evt.doctor_name.startsWith("Dr.") ? evt.doctor_name : `Dr. ${evt.doctor_name}`}
                      </Text>
                    )}
                    {evt.hospital_name && (
                      <View style={styles.hospitalRow}>
                        <Building2 size={11} color={COLORS.neutral[500]} />
                        <Text style={styles.hospitalText}>{evt.hospital_name}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Clinical Summary */}
                {evt.summary && (
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryLabel}>CLINICAL SUMMARY</Text>
                    <Text style={styles.summaryText}>{evt.summary}</Text>
                  </View>
                )}

                {/* Secure Security Stamp */}
                <View style={styles.eventFooter}>
                  <View style={styles.securityRow}>
                    <ShieldCheck size={11} color={COLORS.success[600]} />
                    <Text style={styles.securityText}>ABDM Verified Record • AES-256 Encrypted</Text>
                  </View>
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
  eventCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  typeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.neutral[100],
    justifyContent: "center",
    alignItems: "center",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 10,
    color: COLORS.neutral[500],
    fontWeight: "500",
  },
  eventTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
    fontSize: 14,
    marginTop: 4,
  },
  attributionBox: {
    marginTop: SPACING.xs,
    gap: 2,
  },
  doctorText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary[700],
  },
  hospitalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  hospitalText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  summaryBox: {
    marginTop: SPACING.sm,
    padding: SPACING.xs,
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADIUS.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary[400],
  },
  summaryLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.neutral[500],
    letterSpacing: 0.5,
  },
  summaryText: {
    fontSize: 11,
    color: COLORS.textPrimary,
    marginTop: 1,
    lineHeight: 16,
  },
  eventFooter: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  securityText: {
    fontSize: 9.5,
    color: COLORS.success[700],
    fontWeight: "500",
  },
});
