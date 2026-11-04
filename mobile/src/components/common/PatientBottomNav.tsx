/**
 * ONEHEALTH ID (OH-ID) Mobile — Standardized Patient Bottom Navigation
 * Sathus Technology Pvt Ltd
 *
 * Implements the 5 standard persistent patient tabs:
 * 1. Home          (/(patient))
 * 2. Health        (/(patient)/timeline)
 * 3. Appointments  (/(patient)/appointments)
 * 4. Documents     (/(patient)/upload)
 * 5. Profile       (/(patient)/profile)
 *
 * Styled per OH-ID reference design tokens:
 * - Active: #155EEF
 * - Inactive: #667085
 * - Surface: #FFFFFF with subtle #E4EAF2 top border
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Home,
  Heart,
  Calendar,
  FileText,
  User,
} from "lucide-react-native";
import { ohidTheme } from "../../theme";

export type PatientTab = "home" | "health" | "appointments" | "documents" | "profile";

export interface PatientBottomNavProps {
  activeTab: PatientTab;
}

interface TabConfig {
  id: PatientTab;
  label: string;
  route: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  testID: string;
}

const TABS: TabConfig[] = [
  {
    id: "home",
    label: "Home",
    route: "/(patient)",
    Icon: Home,
    testID: "tab-home",
  },
  {
    id: "health",
    label: "Health",
    route: "/(patient)/timeline",
    Icon: Heart,
    testID: "tab-health",
  },
  {
    id: "appointments",
    label: "Appointments",
    route: "/(patient)/appointments",
    Icon: Calendar,
    testID: "tab-appointments",
  },
  {
    id: "documents",
    label: "Documents",
    route: "/(patient)/upload",
    Icon: FileText,
    testID: "tab-documents",
  },
  {
    id: "profile",
    label: "Profile",
    route: "/(patient)/profile",
    Icon: User,
    testID: "tab-profile",
  },
];

export const PatientBottomNav: React.FC<PatientBottomNavProps> = ({ activeTab }) => {
  const router = useRouter();

  const handleTabPress = (tab: TabConfig) => {
    if (activeTab === tab.id) return;
    router.replace(tab.route as any);
  };

  return (
    <View style={styles.container} testID="patient-bottom-nav">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const IconComponent = tab.Icon;
        const iconColor = isActive
          ? ohidTheme.colors.activeNavigation
          : ohidTheme.colors.inactiveNavigation;
        const textColor = isActive
          ? ohidTheme.colors.activeNavigation
          : ohidTheme.colors.inactiveNavigation;

        return (
          <TouchableOpacity
            key={`patient-tab-${tab.id}`}
            style={styles.tabButton}
            onPress={() => handleTabPress(tab)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${tab.label} tab${isActive ? " (active)" : ""}`}
            testID={tab.testID}
          >
            <IconComponent
              size={22}
              color={iconColor}
              strokeWidth={isActive ? 2.4 : 1.9}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: textColor },
                isActive && styles.activeTabLabel,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: ohidTheme.colors.bottomNavigation,
    borderTopWidth: 1,
    borderTopColor: ohidTheme.colors.border,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 22 : 10,
    minHeight: Platform.OS === "ios" ? 76 : 60,
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  activeTabLabel: {
    fontWeight: "600",
  },
});

