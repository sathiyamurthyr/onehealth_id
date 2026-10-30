/**
 * ONEHEALTH ID (OH-ID) Mobile — Root Navigation & Route Guard
 * 
 * Enforces session-gated access control across all native route groups:
 * - Unauthenticated users are strictly guarded and redirected to /(auth)/login.
 * - Authenticated users are directed exclusively to their permitted role workspace.
 * - Displays a neutral, branded loading state during SecureStore session restoration.
 *
 * Sathus Technology Pvt Ltd - Enterprise DevSecOps Architecture
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { COLORS, TYPOGRAPHY, SPACING } from "../src/theme";
import { AuthProvider, useAuth, resolveRoleRoute } from "../src/context/AuthContext";

function RouteGuardNavigator() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const currentGroup = (segments[0] as string) || "";
    const inAuthGroup = currentGroup === "(auth)";
    const inProtectedGroup = [
      "(patient)",
      "(doctor)",
      "(reception)",
      "(admin)",
      "(super)",
    ].includes(currentGroup);

    if (!isAuthenticated && inProtectedGroup) {
      // Unauthenticated access attempt to protected workspace -> Force redirect to login
      router.replace("/(auth)/login");
    } else if (isAuthenticated && (inAuthGroup || !segments[0])) {
      // Authenticated user on login or gateway -> Route to authoritative workspace
      router.replace(resolveRoleRoute(user?.role) as any);
    }
  }, [isAuthenticated, isLoading, segments, user, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <View style={styles.loadingContent}>
          <Text style={styles.brandTitle}>OneHealth ID</Text>
          <Text style={styles.brandSubtitle}>
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

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.surface,
        },
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 17,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: COLORS.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(auth)/login"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(patient)/index"
        options={{
          title: "Patient Portal",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="(doctor)/index"
        options={{
          title: "Doctor Workspace",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="(reception)/index"
        options={{
          title: "Reception Desk",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="(admin)/index"
        options={{
          title: "Hospital Admin",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="(super)/index"
        options={{
          title: "Super Admin",
          headerShown: true,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <RouteGuardNavigator />
      </SafeAreaProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  loadingContent: {
    alignItems: "center",
    maxWidth: 320,
  },
  brandTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary[900],
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  brandSubtitle: {
    ...TYPOGRAPHY.callout,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },
  spinner: {
    marginTop: SPACING.base,
  },
});
