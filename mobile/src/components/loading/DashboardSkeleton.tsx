/**
 * ONEHEALTH ID (OH-ID) Mobile — Dashboard Skeleton Loader (Concept 2)
 * Sathus Technology Pvt Ltd
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "./Skeleton";
import { ohidTheme } from "../../theme";

export const DashboardSkeleton: React.FC = () => {
  return (
    <View style={styles.container} testID="dashboard-skeleton">
      {/* Top Profile / Health Card Skeleton */}
      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <View style={styles.heroMeta}>
            <Skeleton width={140} height={16} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width={90} height={12} borderRadius={4} />
          </View>
        </View>
        <Skeleton width={70} height={24} borderRadius={12} />
      </View>

      {/* 6 Quick Action Grid Cards */}
      <View style={styles.gridContainer}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={`grid-skel-${i}`} style={styles.gridItem}>
            <Skeleton width={38} height={38} borderRadius={10} style={{ marginBottom: 10 }} />
            <Skeleton width="70%" height={12} borderRadius={4} />
          </View>
        ))}
      </View>

      {/* Recent Activity Section Header */}
      <View style={styles.sectionHeader}>
        <Skeleton width={120} height={16} borderRadius={4} />
        <Skeleton width={50} height={12} borderRadius={4} />
      </View>

      {/* Activity Item Skeletons */}
      {[1, 2].map((i) => (
        <View key={`activity-skel-${i}`} style={styles.activityCard}>
          <Skeleton width={40} height={40} borderRadius={8} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Skeleton width="60%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width="85%" height={12} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: ohidTheme.colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ohidTheme.colors.border,
    marginBottom: 20,
  },
  heroLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroMeta: {
    marginLeft: 12,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  gridItem: {
    width: "48%",
    backgroundColor: ohidTheme.colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: ohidTheme.colors.border,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ohidTheme.colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: ohidTheme.colors.border,
    marginBottom: 10,
  },
});

