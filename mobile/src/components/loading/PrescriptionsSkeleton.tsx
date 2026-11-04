/**
 * ONEHEALTH ID (OH-ID) Mobile — Prescriptions List Skeleton Loader (Concept 5)
 * Sathus Technology Pvt Ltd
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "./Skeleton";
import { ohidTheme } from "../../theme";

export const PrescriptionsSkeleton: React.FC = () => {
  return (
    <View style={styles.container} testID="prescriptions-skeleton">
      {[1, 2, 3, 4].map((i) => (
        <View key={`rx-skel-${i}`} style={styles.card}>
          <Skeleton width={42} height={42} borderRadius={21} style={{ marginRight: 12 }} />
          <View style={styles.content}>
            <Skeleton width="60%" height={15} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width="80%" height={12} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width="45%" height={11} borderRadius={4} />
          </View>
          <Skeleton width={60} height={22} borderRadius={11} />
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

