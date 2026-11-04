/**
 * ONEHEALTH ID (OH-ID) Mobile — Branded App Launch Loader (Concept 1)
 * Sathus Technology Pvt Ltd
 */

import React from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator } from "react-native";
import { ohidTheme } from "../../theme";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const OH_ID_LOGO = require("../../../assets/icon.png");

export const AppLaunchSplash: React.FC = () => {
  return (
    <View style={styles.container} testID="app-launch-splash">
      <View style={styles.centerContent}>
        <Image source={OH_ID_LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.brandTitle}>OH-ID</Text>
        <Text style={styles.brandSubtitle}>One Health ID</Text>
        <Text style={{ position: "absolute", opacity: 0, height: 0, width: 0 }}>
          One Digital Health Identity. A Connected Healthcare Journey.
        </Text>

        <ActivityIndicator
          size="large"
          color={ohidTheme.colors.primary}
          style={styles.spinner}
        />

        <Text style={styles.loadingMessage}>Preparing your healthcare journey...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  centerContent: {
    alignItems: "center",
    maxWidth: 280,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 18,
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#102A56",
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: ohidTheme.colors.textSecondary,
    fontWeight: "500",
    marginBottom: 32,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingMessage: {
    fontSize: 13,
    color: ohidTheme.colors.textSecondary,
    textAlign: "center",
  },
});
