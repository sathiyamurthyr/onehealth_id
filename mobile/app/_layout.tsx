import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { COLORS } from "../src/theme";
import { AuthProvider } from "../src/context/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
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
              title: "OneHealth ID",
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="(auth)/login"
            options={{
              title: "Sign In",
              headerShown: true,
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
      </SafeAreaProvider>
    </AuthProvider>
  );
}
