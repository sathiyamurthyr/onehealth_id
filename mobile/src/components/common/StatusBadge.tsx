import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../../theme";

export type StatusVariant =
  | "VERIFIED"
  | "PENDING"
  | "CRITICAL"
  | "ACTIVE"
  | "HOLD"
  | "INFO";

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
}

const BADGE_CONFIG: Record<
  StatusVariant,
  { bg: string; text: string; border: string; dot: string }
> = {
  VERIFIED: {
    bg: COLORS.success[50],
    text: COLORS.success[700],
    border: COLORS.success[200],
    dot: COLORS.success[500],
  },
  ACTIVE: {
    bg: COLORS.primary[50],
    text: COLORS.primary[700],
    border: COLORS.primary[200],
    dot: COLORS.primary[500],
  },
  PENDING: {
    bg: COLORS.warning[50],
    text: COLORS.warning[800],
    border: COLORS.warning[200],
    dot: COLORS.warning[500],
  },
  CRITICAL: {
    bg: COLORS.danger[50],
    text: COLORS.danger[700],
    border: COLORS.danger[200],
    dot: COLORS.danger[500],
  },
  HOLD: {
    bg: COLORS.warning[50],
    text: COLORS.warning[700],
    border: COLORS.warning[200],
    dot: COLORS.warning[500],
  },
  INFO: {
    bg: COLORS.accent[50],
    text: COLORS.accent[800],
    border: COLORS.accent[200],
    dot: COLORS.accent[500],
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = "ACTIVE",
}) => {
  const config = BADGE_CONFIG[variant] || BADGE_CONFIG.ACTIVE;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.text, { color: config.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    ...TYPOGRAPHY.captionBold,
  },
});
