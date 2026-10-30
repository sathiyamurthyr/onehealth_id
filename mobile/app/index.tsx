/**
 * ONEHEALTH ID (OH-ID) Mobile — Entry Gateway
 * 
 * Clean, lightweight session gateway. Checks authenticated state:
 * - If unauthenticated -> routes immediately to /(auth)/login.
 * - If authenticated -> routes to the user's authoritative workspace.
 * 
 * Contains NO internal development badges or foundation workspaces.
 *
 * Sathus Technology Pvt Ltd - Enterprise DevSecOps Architecture
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth, resolveRoleRoute } from "../src/context/AuthContext";
import { COLORS, TYPOGRAPHY, SPACING } from "../src/theme";

export default function EntryGatewayScreen() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      router.replace(resolveRoleRoute(user.role) as any);
    } else {
      router.replace("/(auth)/login");
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>OneHealth ID</Text>
        <Text style={styles.subtitle}>
          One Digital Health Identity. A Connected Healthcare Journey.
        </Text>
        <ActivityIndicator
          size="large"
          color={COLORS.primary[600]}
          style={styles.spinner}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  content: {
    alignItems: "center",
    maxWidth: 320,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary[900],
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  subtitle: {
    ...TYPOGRAPHY.callout,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },
  spinner: {
    marginTop: SPACING.base,
  },
});
