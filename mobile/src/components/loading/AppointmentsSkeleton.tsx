/**
 * ONEHEALTH ID (OH-ID) Mobile — Appointments List Skeleton Loader (Concept 3)
 * Sathus Technology Pvt Ltd
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "./Skeleton";
import { ohidTheme } from "../../theme";

export const AppointmentsSkeleton: React.FC = () => {
  return (
    <View style={styles.container} testID="appointments-skeleton">
      {[1, 2, 3, 4].map((i) => (
        <View key={`appt-skel-${i}`} style={styles.card}>
          <Skeleton width={44} height={44} borderRadius={10} style={{ marginRight: 12 }} />
          <View style={styles.content}>
            <Skeleton width="65%" height={15} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width="85%" height={12} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width="40%" height={11} borderRadius={4} />
          </View>
          <Skeleton width={55} height={22} borderRadius={11} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ohidTheme.colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ohidTheme.colors.border,
    marginBottom: 12,
  },
  content: {
    flex: 1,
  },
});

