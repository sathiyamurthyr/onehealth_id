/**
 * ONEHEALTH ID (OH-ID) Mobile — API Request Blocking Overlay (Concept 9)
 * Sathus Technology Pvt Ltd
 *
 * Displays a clean, hospital-grade processing modal for sensitive transactional actions
 * (e.g. appointment booking, cryptographically signed record generation).
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Image,
} from "react-native";
import { ohidTheme } from "../../theme";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const OH_ID_LOGO = require("../../../assets/icon.png");

export interface LoadingOverlayProps {
  visible: boolean;
  title?: string;
  message?: string;
  testID?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  title = "Processing Request...",
  message = "Please wait while we securely process your request.",
  testID = "loading-overlay",
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      testID={testID}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Image source={OH_ID_LOGO} style={styles.logo} resizeMode="contain" />
          <ActivityIndicator
            size="large"
            color={ohidTheme.colors.primary}
            style={styles.spinner}
          />
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(16, 42, 86, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: ohidTheme.colors.surface,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: ohidTheme.colors.border,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginBottom: 16,
  },
  spinner: {
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: ohidTheme.colors.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  message: {
    fontSize: 13,
    color: ohidTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});

