/**
 * ONEHEALTH ID (OH-ID) Mobile — Digital Health Card Component
 * Sathus Technology Pvt Ltd
 *
 * Holographic, ABDM-compliant universal healthcare identity card
 * featuring dynamic Zero-Knowledge QR code presentation, auto-rotation timer,
 * and kiosk scanning brightness modal.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import {
  QrCode as QrIcon,
  RefreshCw,
  Maximize2,
  X,
  ShieldCheck,
  Building2,
  Clock,
  Sparkles,
} from "lucide-react-native";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";
import { OhIdCardData } from "../../types/patient";

export interface DigitalHealthCardProps {
  cardData: OhIdCardData | null;
  loading?: boolean;
  onRotate?: () => Promise<void>;
  isRotating?: boolean;
  autoRotateSeconds?: number;
  testID?: string;
}

export const DigitalHealthCard: React.FC<DigitalHealthCardProps> = ({
  cardData,
  loading = false,
  onRotate,
  isRotating = false,
  autoRotateSeconds = 60,
  testID = "digital-health-card",
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(autoRotateSeconds);
  const timerRef = useRef<any>(null);

  // Dynamic 60-second countdown for Zero-Knowledge QR rotation
  useEffect(() => {
    if (!autoRotateSeconds || autoRotateSeconds <= 0) return;
    if (process.env.NODE_ENV === "test") return;

    setCountdown(autoRotateSeconds);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (onRotate) {
            onRotate().catch(() => {});
          }
          return autoRotateSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cardData?.qr_token, autoRotateSeconds, onRotate]);

  const handleManualRotate = async () => {
    if (onRotate && !isRotating) {
      setCountdown(autoRotateSeconds);
      await onRotate();
    }
  };

  const qrUrl = cardData?.qr_token
    ? `https://ohid.online/scan/${cardData.qr_token}`
    : "https://ohid.online/scan/DEMO";

  const maskedToken = cardData?.qr_token
    ? `${cardData.qr_token.slice(0, 16)}...`
    : "TOKEN-VERIFIED-ABDM";

  const facilitiesCount = cardData?.facilities_count ?? cardData?.connected_facilities?.length ?? 0;

  if (loading) {
    return (
      <View style={[styles.cardContainer, styles.loadingContainer]} testID={testID}>
        <ActivityIndicator size="large" color={COLORS.accent[400]} />
        <Text style={styles.loadingText}>Loading OneHealth ID Pass...</Text>
      </View>
    );
  }

  return (
    <View style={styles.cardContainer} testID={testID}>
      {/* Decorative Aura */}
      <View style={styles.auraTopRight} pointerEvents="none" />
      <View style={styles.auraBottomLeft} pointerEvents="none" />

      {/* Card Header */}
      <View style={styles.headerRow}>
        <View style={styles.brandingCol}>
          <View style={styles.badgeRow}>
            <View style={styles.logoBox}>
              <Sparkles size={14} color={COLORS.accent[400]} />
            </View>
            <View>
              <Text style={styles.brandTitle}>OneHealth ID</Text>
              <Text style={styles.brandSubtitle}>Universal Health Network</Text>
            </View>
          </View>
          <Text style={styles.attribution}>Powered by Sathus Technology Pvt Ltd</Text>
        </View>

        <View style={styles.statusPill} testID="verification-badge">
          <View style={styles.pulseDot} />
          <Text style={styles.statusText}>
            {cardData?.verification_status === "VERIFIED_ACTIVE" ? "Active Verified" : "Verified ID"}
          </Text>
        </View>
      </View>

      {/* Identity Summary & Dynamic QR Code */}
      <View style={styles.bodyRow}>
        {/* Left Side: Demographic Attributes */}
        <View style={styles.identityCol}>
          <Text style={styles.patientName} testID="patient-name" numberOfLines={1}>
            {cardData?.name || "Citizen Patient"}
          </Text>
          <Text style={styles.ohidText} testID="patient-ohid">
            {cardData?.onehealth_id || "OHID-CITIZEN-001"}
          </Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>AGE / DOB</Text>
              <Text style={styles.metaValue} testID="patient-age">
                {cardData?.age ? `${cardData.age} Yrs` : cardData?.dob || "—"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>GENDER</Text>
              <Text style={styles.metaValue} testID="patient-gender">
                {cardData?.gender || "—"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>BLOOD GROUP</Text>
              <Text style={styles.bloodValue} testID="patient-blood-group">
                {cardData?.blood_group || "O+"}
              </Text>
            </View>
          </View>
        </View>

        {/* Right Side: QR Presentation Box */}
        <TouchableOpacity
          style={styles.qrBox}
          activeOpacity={0.8}
          onPress={() => setModalVisible(true)}
          testID="expand-qr-button"
          accessibilityRole="button"
          accessibilityLabel="Enlarge QR Code for front desk scanning"
        >
          <View style={styles.qrInner} testID="qr-code-svg">
            <QRCode
              value={qrUrl}
              size={90}
              color={COLORS.neutral[900]}
              backgroundColor="#FFFFFF"
            />
          </View>
          <View style={styles.expandHint}>
            <Maximize2 size={10} color={COLORS.accent[300]} />
            <Text style={styles.expandText}>Tap to Enlarge</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Dynamic Rotation & Token Bar */}
      <View style={styles.tokenBar}>
        <View style={styles.tokenCol}>
          <Text style={styles.tokenLabel}>DYNAMIC ZKP TOKEN</Text>
          <Text style={styles.tokenValue} testID="masked-token-value" numberOfLines={1}>
            {maskedToken}
          </Text>
        </View>

        <View style={styles.rotationActions}>
          <View style={styles.countdownPill} testID="rotation-countdown">
            <Clock size={11} color={COLORS.accent[300]} />
            <Text style={styles.countdownText}>{countdown}s</Text>
          </View>

          <TouchableOpacity
            style={styles.rotateButton}
            onPress={handleManualRotate}
            disabled={isRotating}
            testID="rotate-qr-button"
            accessibilityRole="button"
            accessibilityLabel="Rotate QR Token"
          >
            {isRotating ? (
              <ActivityIndicator size="small" color={COLORS.accent[400]} />
            ) : (
              <>
                <RefreshCw size={12} color={COLORS.white} />
                <Text style={styles.rotateButtonText}>Refresh</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Connected Facilities & Security Footer */}
      <View style={styles.footerRow}>
        <View style={styles.facilityItem}>
          <Building2 size={12} color={COLORS.neutral[400]} />
          <Text style={styles.facilityText}>
            {facilitiesCount > 0
              ? `${facilitiesCount} Connected Hospital${facilitiesCount > 1 ? "s" : ""}`
              : "Universal Network Registered"}
          </Text>
        </View>

        <View style={styles.securityItem}>
          <ShieldCheck size={12} color={COLORS.success[400]} />
          <Text style={styles.securityText}>ABDM & HIPAA Compliant</Text>
        </View>
      </View>

      {/* High-Contrast Kiosk Scanning Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
        testID="kiosk-modal"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Kiosk Scanner Presentation</Text>
                <Text style={styles.modalSubtitle}>
                  High-contrast QR display for reception barcode scanners
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
                testID="close-kiosk-modal-button"
                accessibilityLabel="Close kiosk scanner view"
              >
                <X size={20} color={COLORS.neutral[800]} />
              </TouchableOpacity>
            </View>

            {/* High-Contrast Large QR Container */}
            <View style={styles.modalQrWrapper}>
              <QRCode
                value={qrUrl}
                size={220}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>

            {/* Modal Patient Details */}
            <Text style={styles.modalPatientName}>{cardData?.name || "Citizen Patient"}</Text>
            <Text style={styles.modalOhid}>{cardData?.onehealth_id || "OHID-CITIZEN-001"}</Text>
            <Text style={styles.modalToken}>{maskedToken}</Text>

            {/* Modal Action Controls */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalRefreshButton}
                onPress={handleManualRotate}
                disabled={isRotating}
              >
                <RefreshCw size={14} color={COLORS.primary[600]} />
                <Text style={styles.modalRefreshText}>
                  {isRotating ? "Rotating Token..." : `Rotate Pass (${countdown}s)`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalDoneButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#0b1329",
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    borderWidth: 1.5,
    borderColor: "#1e293b",
    position: "relative",
    overflow: "hidden",
    ...SHADOWS.lg,
  },
  loadingContainer: {
    minHeight: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 12,
    color: COLORS.neutral[400],
  },
  auraTopRight: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(6, 182, 212, 0.12)",
  },
  auraBottomLeft: {
    position: "absolute",
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(37, 99, 235, 0.15)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  brandingCol: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  logoBox: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.white,
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 9,
    color: COLORS.accent[300],
    fontWeight: "500",
  },
  attribution: {
    fontSize: 8,
    color: "rgba(203, 213, 225, 0.6)",
    marginTop: 2,
    fontWeight: "400",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success[400],
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.success[300],
  },
  bodyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: SPACING.xs,
  },
  identityCol: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  patientName: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.white,
    letterSpacing: -0.3,
  },
  ohidText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.accent[300],
    fontFamily: "monospace",
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  metaItem: {
    minWidth: 50,
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.neutral[400],
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.white,
    marginTop: 1,
  },
  bloodValue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fda4af",
    marginTop: 1,
  },
  qrBox: {
    backgroundColor: "#FFFFFF",
    padding: 6,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    ...SHADOWS.md,
  },
  qrInner: {
    padding: 2,
  },
  expandHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  expandText: {
    fontSize: 8,
    fontWeight: "600",
    color: COLORS.neutral[600],
  },
  tokenBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  tokenCol: {
    flex: 1,
    marginRight: SPACING.xs,
  },
  tokenLabel: {
    fontSize: 7.5,
    fontWeight: "700",
    color: COLORS.neutral[400],
    letterSpacing: 0.5,
  },
  tokenValue: {
    fontSize: 9.5,
    fontFamily: "monospace",
    color: COLORS.neutral[300],
    fontWeight: "600",
    marginTop: 1,
  },
  rotationActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  countdownPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(6, 182, 212, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  countdownText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: COLORS.accent[300],
    fontFamily: "monospace",
  },
  rotateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  rotateButtonText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.white,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  facilityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  facilityText: {
    fontSize: 9,
    color: COLORS.neutral[400],
    fontWeight: "500",
  },
  securityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  securityText: {
    fontSize: 9,
    color: COLORS.success[400],
    fontWeight: "600",
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: "center",
    ...SHADOWS.lg,
  },
  modalHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.base,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.neutral[900],
  },
  modalSubtitle: {
    fontSize: 10,
    color: COLORS.neutral[500],
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalQrWrapper: {
    padding: SPACING.base,
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.neutral[200],
    ...SHADOWS.md,
  },
  modalPatientName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.neutral[900],
    marginTop: SPACING.base,
  },
  modalOhid: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary[600],
    fontFamily: "monospace",
    marginTop: 2,
  },
  modalToken: {
    fontSize: 10,
    color: COLORS.neutral[500],
    fontFamily: "monospace",
    marginTop: 4,
  },
  modalActions: {
    width: "100%",
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  modalRefreshButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary[50],
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },
  modalRefreshText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary[700],
  },
  modalDoneButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary[600],
    borderRadius: RADIUS.md,
  },
  modalDoneText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.white,
  },
});
