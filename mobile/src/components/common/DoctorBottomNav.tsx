/**
 * ONEHEALTH ID (OH-ID) Mobile — Standardized Doctor Bottom Navigation
 * Sathus Technology Pvt Ltd
 *
 * Implements the 5 persistent doctor navigation tabs per the reference UI:
 * 1. Home      — Doctor Home / Triage Overview
 * 2. Patients  — Patient Directory & Search
 * 3. OPD Queue — Active Clinical Queue (Active tab in screenshot with #E11D48 crimson theme)
 * 4. RxPad     — Digital Prescription Pad
 * 5. Profile   — Doctor Profile, Credentials & Sign Out
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
  Users,
  Menu,
  SquarePen,
  User,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";

export type DoctorTab = "home" | "patients" | "queue" | "rxpad" | "profile";

export interface DoctorBottomNavProps {
  activeTab: DoctorTab;
  onSignOutPress?: () => void;
}

interface TabConfig {
  id: DoctorTab;
  label: string;
  route?: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  testID: string;
}

const TABS: TabConfig[] = [
  {
    id: "home",
    label: "Home",
    route: "/(doctor)",
    Icon: Home,
    testID: "doctor-tab-home",
  },
  {
    id: "patients",
    label: "Patients",
    route: "/(doctor)/scan",
    Icon: Users,
    testID: "doctor-tab-patients",
  },
  {
    id: "queue",
    label: "OPD Queue",
    route: "/(doctor)",
    Icon: Menu,
    testID: "doctor-tab-queue",
  },
  {
    id: "rxpad",
    label: "RxPad",
    route: "/(doctor)/rxpad",
    Icon: SquarePen,
    testID: "doctor-tab-rxpad",
  },
  {
    id: "profile",
    label: "Profile",
    Icon: User,
    testID: "doctor-tab-profile",
  },
];

export const DoctorBottomNav: React.FC<DoctorBottomNavProps> = ({
  activeTab,
  onSignOutPress,
}) => {
  const router = useRouter();
  const { logout } = useAuth();

  const handleTabPress = async (tab: TabConfig) => {
    if (tab.id === "profile") {
      if (onSignOutPress) {
        onSignOutPress();
      } else {
        await logout();
        router.replace("/(auth)/login");
      }
      return;
    }

    if (activeTab === tab.id && tab.route === "/(doctor)") return;
    if (tab.route) {
      router.replace(tab.route as any);
    }
  };

  return (
    <View style={styles.container} testID="doctor-bottom-nav">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const IconComponent = tab.Icon;
        const activeColor = tab.id === "queue" ? "#E11D48" : "#2563EB";
        const iconColor = isActive ? activeColor : "#64748B";

        return (
          <TouchableOpacity
            key={tab.id}
            testID={tab.testID}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            style={styles.tabButton}
            onPress={() => handleTabPress(tab)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <IconComponent
                size={22}
                color={iconColor}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                isActive && {
                  color: activeColor,
                  fontWeight: "700",
                },
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
    height: Platform.OS === "ios" ? 78 : 64,
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
    paddingTop: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 8,
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  iconWrapper: {
    marginBottom: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748B",
    textAlign: "center",
  },
});

