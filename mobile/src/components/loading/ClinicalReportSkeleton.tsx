/**
 * ONEHEALTH ID (OH-ID) Mobile — Clinical Report Skeleton Loader (Concept 4)
 * Sathus Technology Pvt Ltd
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "./Skeleton";
import { ohidTheme } from "../../theme";

export const ClinicalReportSkeleton: React.FC = () => {
  return (
    <View style={styles.container} testID="clinical-report-skeleton">
      {/* Document Header Skeleton */}
      <View style={styles.headerCard}>
        <Skeleton width={44} height={44} borderRadius={10} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Skeleton width="70%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
          <Skeleton width="45%" height={12} borderRadius={4} />
        </View>
      </View>

      {/* Section 1 Skeleton */}
      <View style={styles.sectionCard}>
        <Skeleton width="35%" height={14} borderRadius={4} style={{ marginBottom: 14 }} />
        <Skeleton width="100%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
        <Skeleton width="92%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
        <Skeleton width="85%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={12} borderRadius={4} />
      </View>

      {/* Section 2 Skeleton */}
      <View style={styles.sectionCard}>
        <Skeleton width="40%" height={14} borderRadius={4} style={{ marginBottom: 14 }} />
        <Skeleton width="100%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
        <Skeleton width="90%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
        <Skeleton width="70%" height={12} borderRadius={4} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ohidTheme.colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ohidTheme.colors.border,
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: ohidTheme.colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ohidTheme.colors.border,
    marginBottom: 14,
  },
});

