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
import { AppLaunchSplash } from "../src/components/loading";

function RouteGuardNavigator() {
  const { user, isLoading, isAuthenticated, isAppLocked, hasConfiguredPin } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const currentGroup = (segments[0] as string) || "";
    const inAuthGroup = currentGroup === "(auth)";
    const inProtectedGroup = [
      "(patient)",
      "(doctor)",
      "(nurse)",
      "(reception)",
      "(admin)",
      "(super)",
    ].includes(currentGroup);

    if (isAppLocked && hasConfiguredPin) {
      if (!inAuthGroup) {
        router.replace("/(auth)/login");
      }
      return;
    }

    if (!isAuthenticated && inProtectedGroup) {
      // Unauthenticated or locked access attempt to protected workspace -> Force redirect to login
      router.replace("/(auth)/login");
    } else if (isAuthenticated && !isAppLocked) {
      const userRole = (user?.role || "").toUpperCase().trim();
      const isDoctor = ["DOCTOR", "PHYSICIAN", "CLINICAL_STAFF"].includes(userRole);
      const isNurse = userRole === "NURSE";

      if (inAuthGroup || !segments[0]) {
        // Authenticated and unlocked user on login or gateway -> Route to authoritative workspace
        router.replace(resolveRoleRoute(user?.role) as any);
      } else if (currentGroup === "(doctor)" && !isDoctor) {
        // Patient or unauthorized role attempting to access doctor workspace -> Route to permitted workspace
        router.replace(resolveRoleRoute(user?.role) as any);
      } else if (currentGroup === "(nurse)" && !isNurse) {
        // Unauthorized role attempting to access nurse workspace -> Route to permitted workspace
        router.replace(resolveRoleRoute(user?.role) as any);
      } else if (currentGroup === "(patient)" && (isDoctor || isNurse)) {
        // Clinical staff attempting to access patient workspace directly -> Route to permitted clinical workspace
        router.replace(resolveRoleRoute(user?.role) as any);
      }
    }
  }, [isAuthenticated, isAppLocked, hasConfiguredPin, isLoading, segments, user, router]);

  if (isLoading) {
    return (
      <>
        <StatusBar style="dark" />
        <AppLaunchSplash />
      </>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
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
        name="(auth)/register"
        options={{
          title: "Create Account",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(auth)/forgot-password"
        options={{
          title: "Account Recovery",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(patient)/index"
        options={{
          title: "Patient Home",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(patient)/appointments"
        options={{
          title: "Appointments & Queue",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(patient)/prescriptions"
        options={{
          title: "Prescriptions",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(patient)/timeline"
        options={{
          title: "Health Timeline",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(patient)/upload"
        options={{
          title: "Upload Medical Document",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(patient)/profile"
        options={{
          title: "Patient Profile",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(patient)/family_member"
        options={{
          title: "Family Member Profile",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(doctor)/index"
        options={{
          title: "Doctor Workspace",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(doctor)/consultation"
        options={{
          title: "Clinical Encounter",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(doctor)/rxpad"
        options={{
          title: "Digital RxPad",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(doctor)/scan"
        options={{
          title: "Patient Intake Scanner",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(nurse)/index"
        options={{
          title: "Nursing Station",
          headerShown: false,
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
