/**
 * ONEHEALTH ID (OH-ID) Mobile — Standardized Nurse Bottom Navigation
 * Sathus Technology Pvt Ltd
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
  Activity,
  Users,
  Pill,
  User,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";

export type NurseTab = "station" | "vitals" | "patients" | "mar" | "profile";

export interface NurseBottomNavProps {
  activeTab: NurseTab;
  onTabPress?: (tab: NurseTab) => void;
  onSignOutPress?: () => void;
}

interface TabConfig {
  id: NurseTab;
  label: string;
  route?: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  testID: string;
}

const TABS: TabConfig[] = [
  {
    id: "station",
    label: "Station",
    route: "/(nurse)",
    Icon: Home,
    testID: "nurse-tab-station",
  },
  {
    id: "vitals",
    label: "Record Vitals",
    Icon: Activity,
    testID: "nurse-tab-vitals",
  },
  {
    id: "patients",
    label: "Inpatients",
    Icon: Users,
    testID: "nurse-tab-patients",
  },
  {
    id: "mar",
    label: "MAR Log",
    Icon: Pill,
    testID: "nurse-tab-mar",
  },
  {
    id: "profile",
    label: "Profile",
    Icon: User,
    testID: "nurse-tab-profile",
  },
];

export const NurseBottomNav: React.FC<NurseBottomNavProps> = ({
  activeTab,
  onTabPress,
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

    if (onTabPress) {
      onTabPress(tab.id);
      return;
    }

    if (activeTab === tab.id && tab.route === "/(nurse)") return;
    if (tab.route) {
      router.replace(tab.route as any);
    }
  };

  return (
    <View style={styles.container} testID="nurse-bottom-nav">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const IconComponent = tab.Icon;
        const activeColor = "#E11D48";
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

