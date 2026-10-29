import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../src/theme";
import { Header } from "../src/components/common/Header";
import { StatusBadge } from "../src/components/common/StatusBadge";
import { Card } from "../src/components/common/Card";
import {
  User,
  Stethoscope,
  QrCode,
  Building2,
  ShieldCheck,
  LogIn,
  ChevronRight,
  Info,
} from "lucide-react-native";

interface RoleLink {
  title: string;
  subtitle: string;
  route: string;
  badge: "VERIFIED" | "ACTIVE" | "INFO" | "HOLD";
  icon: React.ReactNode;
}

export default function HomeScreen() {
  const router = useRouter();

  const links: RoleLink[] = [
    {
      title: "Authentication (Sign In)",
      subtitle: "Universal entrypoint for Citizen and Clinical Staff",
      route: "/(auth)/login",
      badge: "ACTIVE",
      icon: <LogIn size={22} color={COLORS.primary[600]} />,
    },
    {
      title: "Patient Portal",
      subtitle: "Digital OH-ID Identity Card, Timeline & PHR",
      route: "/(patient)",
      badge: "VERIFIED",
      icon: <User size={22} color={COLORS.success[600]} />,
    },
    {
      title: "Doctor Workspace",
      subtitle: "OPD Triage, Consultations & Digital RxPad",
      route: "/(doctor)",
      badge: "ACTIVE",
      icon: <Stethoscope size={22} color={COLORS.primary[600]} />,
    },
    {
      title: "Reception Desk",
      subtitle: "Universal QR Scanner, Token Check-in & Registration",
      route: "/(reception)",
      badge: "INFO",
      icon: <QrCode size={22} color={COLORS.accent[600]} />,
    },
    {
      title: "Hospital Administrator",
      subtitle: "Facility Census, Staff Management & Ward Roster",
      route: "/(admin)",
      badge: "HOLD",
      icon: <Building2 size={22} color={COLORS.warning[600]} />,
    },
    {
      title: "Super Administrator",
      subtitle: "Hospital Approvals, Multi-Tenant Audits & Security",
      route: "/(super)",
      badge: "INFO",
      icon: <ShieldCheck size={22} color={COLORS.primary[800]} />,
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Header
        title="OneHealth ID"
        subtitle="Universal Healthcare Identity & Clinical OS"
      />

      <Card style={styles.bannerCard}>
        <View style={styles.bannerRow}>
          <Info size={18} color={COLORS.primary[600]} />
          <Text style={styles.bannerTitle}>Phase A: Foundation Workspace</Text>
        </View>
        <Text style={styles.bannerText}>
          React Native New Architecture & Expo Router foundation. All 6 platform
          areas are scaffolded below with strict security boundaries.
        </Text>
        <View style={styles.badgeRow}>
          <StatusBadge label="ISO 27001 Ready" variant="VERIFIED" />
          <View style={{ width: 8 }} />
          <StatusBadge label="Zero PHI Cache" variant="ACTIVE" />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Platform Role Spaces</Text>

      {links.map((link) => (
        <TouchableOpacity
          key={link.route}
          style={styles.cardTouch}
          activeOpacity={0.7}
          onPress={() => router.push(link.route as any)}
        >
          <Card style={styles.linkCard}>
            <View style={styles.iconWrapper}>{link.icon}</View>
            <View style={styles.textWrapper}>
              <View style={styles.titleLine}>
                <Text style={styles.linkTitle}>{link.title}</Text>
                <StatusBadge label={link.badge} variant={link.badge} />
              </View>
              <Text style={styles.linkSubtitle}>{link.subtitle}</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </Card>
        </TouchableOpacity>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by Sathus Technology Pvt Ltd
        </Text>
        <Text style={styles.footerSub}>
          Enterprise DevSecOps & Healthcare Operating System
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.base,
    paddingBottom: SPACING.xxxl,
  },
  bannerCard: {
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[200],
    marginBottom: SPACING.lg,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  bannerTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary[900],
    marginLeft: SPACING.sm,
  },
  bannerText: {
    ...TYPOGRAPHY.callout,
    color: COLORS.primary[800],
    marginBottom: SPACING.sm,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  cardTouch: {
    marginBottom: SPACING.sm,
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  textWrapper: {
    flex: 1,
    marginRight: SPACING.xs,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  linkTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: SPACING.xs,
  },
  linkSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  footer: {
    marginTop: SPACING.xl,
    alignItems: "center",
    paddingVertical: SPACING.md,
  },
  footerText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
  },
  footerSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
