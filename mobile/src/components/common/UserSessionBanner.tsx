import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../../theme";
import { Card } from "./Card";
import { StatusBadge } from "./StatusBadge";
import { LogOut, User, Building2, RefreshCw } from "lucide-react-native";

export const UserSessionBanner: React.FC = () => {
  const router = useRouter();
  const { user, logout, availableRoles, switchRole } = useAuth();
  const [isSwitching, setIsSwitching] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const handleRoleSwitch = async (role: string) => {
    if (role === user?.role || isSwitching) return;
    setIsSwitching(true);
    try {
      const nextRoute = await switchRole(role);
      router.replace(nextRoute as any);
    } finally {
      setIsSwitching(false);
    }
  };

  const displayName = user?.name || user?.full_name || user?.username || "Authenticated User";
  const displayRole = user?.role || "STAFF";
  const displayFacility = user?.hospital_name || user?.tenant_name || "OneHealth Network";

  return (
    <Card style={styles.bannerCard} testID="user-session-banner">
      <View style={styles.topRow}>
        <View style={styles.userSection}>
          <View style={styles.avatar}>
            <User size={18} color={COLORS.primary[600]} />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
            <View style={styles.facilityRow}>
              <Building2 size={13} color={COLORS.textMuted} style={{ marginRight: 4 }} />
              <Text style={styles.facilityText} numberOfLines={1}>{displayFacility}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          testID="logout-button"
          style={styles.logoutButton}
          onPress={handleLogout}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <LogOut size={16} color={COLORS.danger[600]} style={{ marginRight: 4 }} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomRow}>
        <StatusBadge label={displayRole} variant="ACTIVE" />
        {user?.username && (
          <Text style={styles.identifierText}>
            ID: {user.username}
          </Text>
        )}
      </View>

      {/* Multi-role Workspace Switcher - Shown ONLY for authorized multi-role accounts */}
      {(availableRoles?.length ?? 0) > 1 && (
        <View style={styles.multiRoleSection}>
          <View style={styles.roleLabelRow}>
            <RefreshCw size={12} color={COLORS.primary[700]} style={{ marginRight: 4 }} />
            <Text style={styles.roleLabelText}>Switch Workspace Role:</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleScroll}>
            {(availableRoles || []).map((r) => {
              const isSelected = r === displayRole;
              return (
                <TouchableOpacity
                  key={r}
                  testID={`switch-role-${r}`}
                  style={[
                    styles.rolePill,
                    isSelected && styles.rolePillActive,
                  ]}
                  onPress={() => handleRoleSwitch(r)}
                  disabled={isSwitching}
                >
                  <Text
                    style={[
                      styles.rolePillText,
                      isSelected && styles.rolePillTextActive,
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  bannerCard: {
    padding: SPACING.md,
    marginBottom: SPACING.base,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primary[100],
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: SPACING.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
  },
  facilityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  facilityText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.danger[50],
    borderWidth: 1,
    borderColor: COLORS.danger[200],
  },
  logoutText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.danger[700],
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[100],
  },
  identifierText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontFamily: "Courier",
  },
  multiRoleSection: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[100],
  },
  roleLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  roleLabelText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary[800],
    fontSize: 11,
  },
  roleScroll: {
    flexDirection: "row",
  },
  rolePill: {
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginRight: SPACING.xs,
  },
  rolePillActive: {
    backgroundColor: COLORS.primary[600],
    borderColor: COLORS.primary[600],
  },
  rolePillText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  rolePillTextActive: {
    color: COLORS.neutral.white,
    fontWeight: "bold",
  },
});
