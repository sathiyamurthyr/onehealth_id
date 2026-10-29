import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, TYPOGRAPHY, SPACING } from "../../theme";
import { Shield } from "lucide-react-native";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showShield?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showShield = true,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        {showShield && (
          <View style={styles.shieldWrapper}>
            <Shield size={20} color={COLORS.primary[600]} />
          </View>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingVertical: SPACING.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  shieldWrapper: {
    marginRight: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});
