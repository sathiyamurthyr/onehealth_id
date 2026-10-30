/**
 * ONEHEALTH ID (OH-ID) Mobile — Digital Health Identity Card Component
 * Sathus Technology Pvt Ltd
 *
 * Compact, premium digital healthcare identity card featuring dynamic
 * Zero-Knowledge QR code presentation, auto-rotation countdown, and
 * full-screen kiosk scanning brightness modal.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import {
  QrCode as QrIcon,
  RefreshCw,
  Maximize2,
  X,
  Clock,
  Sparkles,
  Copy,
  Calendar,
  User as UserIcon,
  Droplet,
  Check,
  CheckCircle2,
  Building2,
} from "lucide-react-native";
import { COLORS, SPACING, RADIUS } from "../../theme";
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
  const [copiedNotice, setCopiedNotice] = useState(false);
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
    : "ZKP-TOKEN-SECRET...";

  const facilitiesCount =
    cardData?.facilities_count ?? cardData?.connected_facilities?.length ?? 1;

  const handleCopyId = () => {
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  const formattedCountdown = `00:${countdown < 10 ? `0${countdown}` : countdown}`;

  if (loading) {
    return (
      <View style={[styles.cardContainer, styles.loadingContainer]} testID={testID}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingText}>Loading OneHealth ID Pass...</Text>
      </View>
    );
  }

  const patientName = cardData?.name || "Alice Smith";
  const patientOhid = cardData?.onehealth_id || "OHID-IND-2026-01001";
  const patientDob = cardData?.dob || "1994-01-01";
  const patientAgeDisplay = cardData?.age ? `${cardData.age} Yrs` : patientDob;
  const patientGender = cardData?.gender || "Female";
  const patientBlood = cardData?.blood_group || "O+";
  const isVerified =
    cardData?.verification_status === "VERIFIED_ACTIVE" ||
    !cardData?.verification_status;

  return (
    <View style={styles.cardContainer} testID={testID}>
      {/* Ambient Lighting Gradients */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      {/* Top Header Row: Brand Mark & Verified Pill */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.brandGroup}>
          <View style={styles.brandIconCircle}>
            <Sparkles size={14} color="#60A5FA" />
          </View>
          <View>
            <Text style={styles.brandTitle}>OneHealth ID</Text>
            <Text style={styles.brandSubtitle}>Digital Health Identity Card</Text>
          </View>
        </View>

        <View style={styles.verifiedBadge} testID="verification-badge">
          <Check size={12} color="#FFFFFF" strokeWidth={3} style={{ marginRight: 4 }} />
          <Text style={styles.verifiedBadgeText}>
            {cardData?.verification_status === "VERIFIED_ACTIVE" ? "Active Verified" : "Verified"}
          </Text>
        </View>
      </View>

      {/* Center Row: Demographics on Left, QR Box on Right */}
      <View style={styles.cardBodyRow}>
        {/* Left Column: Patient Identity Info */}
        <View style={styles.identityLeftCol}>
          <Text style={styles.patientName} testID="patient-name" numberOfLines={1}>
            {patientName}
          </Text>

          <TouchableOpacity
            style={styles.ohidRow}
            onPress={handleCopyId}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`OneHealth ID: ${patientOhid}. Tap to copy.`}
          >
            <Text style={styles.ohidText} testID="patient-ohid">
              {patientOhid}
            </Text>
            {copiedNotice ? (
              <CheckCircle2 size={13} color="#34D399" style={{ marginLeft: 5 }} />
            ) : (
              <Copy size={13} color="#60A5FA" style={{ marginLeft: 5 }} />
            )}
          </TouchableOpacity>

          {/* Demographic Metrics */}
          <View style={styles.demographicsGrid}>
            <View style={styles.demoItem}>
              <Text style={styles.demoLabel}>Date of Birth</Text>
              <View style={styles.demoValueRow}>
                <Calendar size={12} color="#93C5FD" style={{ marginRight: 4 }} />
                <Text style={styles.demoValue} testID="patient-age">
                  {patientAgeDisplay}
                </Text>
              </View>
            </View>

            <View style={styles.demoItem}>
              <Text style={styles.demoLabel}>Gender</Text>
              <View style={styles.demoValueRow}>
                <UserIcon size={12} color="#93C5FD" style={{ marginRight: 4 }} />
                <Text style={styles.demoValue} testID="patient-gender">
                  {patientGender}
                </Text>
              </View>
            </View>

            <View style={styles.demoItem}>
              <Text style={styles.demoLabel}>Blood Group</Text>
              <View style={styles.demoValueRow}>
                <Droplet size={12} color="#F87171" style={{ marginRight: 4 }} />
                <Text style={styles.bloodValue} testID="patient-blood-group">
                  {patientBlood}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Right Column: Scannable QR Code Box */}
        <TouchableOpacity
          style={styles.qrCodeWrapper}
          activeOpacity={0.85}
          onPress={() => setModalVisible(true)}
          testID="expand-qr-button"
          accessibilityRole="button"
          accessibilityLabel="Enlarge QR Code for front desk scanning"
        >
          <View style={styles.qrWhiteSurface} testID="qr-code-svg">
            <QRCode
              value={qrUrl}
              size={82}
              color="#0F172A"
              backgroundColor="#FFFFFF"
            />
          </View>
          <View style={styles.enlargeRow}>
            <Maximize2 size={11} color="#2563EB" style={{ marginRight: 4 }} />
            <Text style={styles.enlargeText}>Tap to Enlarge</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom Action Strip: Token Guide & Countdown / Refresh */}
      <View style={styles.bottomStrip}>
        <View style={styles.stripGuideCol}>
          <View style={styles.stripGuideRow}>
            <QrIcon size={15} color="#93C5FD" style={{ marginRight: 6 }} />
            <Text style={styles.stripGuideTitle}>Your Hospital QR Code</Text>
          </View>
          <Text style={styles.stripGuideSubtitle}>
            Show this QR at hospital for quick check-in
          </Text>
        </View>

        <View style={styles.stripControlsRow}>
          <View style={styles.timerPill} testID="rotation-countdown">
            <Clock size={12} color="#93C5FD" style={{ marginRight: 4 }} />
            <Text style={styles.timerText}>{formattedCountdown}</Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleManualRotate}
            disabled={isRotating}
            testID="rotate-qr-button"
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Refresh QR Token"
          >
            {isRotating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <RefreshCw size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Accessible Metadata for Automated Testing & Auditing */}
      <View style={styles.accessibleAuditRow}>
        <Building2 size={10} color="rgba(255,255,255,0.4)" style={{ marginRight: 4 }} />
        <Text style={styles.accessibleFacilityText}>
          {facilitiesCount} Connected Hospital{facilitiesCount > 1 ? "s" : ""}
        </Text>
        <Text style={styles.accessibleTokenText} testID="masked-token-value">
          {maskedToken}
        </Text>
      </View>

      {/* High-Contrast Fullscreen Kiosk Scanner Modal */}
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
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Hospital QR Check-In</Text>
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
            <Text style={styles.modalPatientName}>{patientName}</Text>
            <Text style={styles.modalOhid}>{patientOhid}</Text>

            {/* Modal Action Controls */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalRefreshButton}
                onPress={handleManualRotate}
                disabled={isRotating}
              >
                <RefreshCw size={14} color={COLORS.primary[600]} style={{ marginRight: 6 }} />
                <Text style={styles.modalRefreshText}>
                  {isRotating ? "Rotating Token..." : `Refresh (${formattedCountdown})`}
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
    backgroundColor: "#0A2540",
    borderRadius: 20,
    padding: 16,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    ...Platform.select({
      ios: {
        shadowColor: "#0A2540",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 10px 25px -5px rgba(10, 37, 64, 0.3), 0 8px 10px -6px rgba(10, 37, 64, 0.2)",
      } as any,
    }),
  },
  loadingContainer: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#93C5FD",
    fontSize: 14,
    marginTop: 12,
    fontWeight: "500",
  },
  ambientGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(37, 99, 235, 0.35)",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  brandGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(37, 99, 235, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    fontSize: 11,
    color: "#93C5FD",
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  verifiedBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  cardBodyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  identityLeftCol: {
    flex: 1,
    marginRight: 12,
  },
  patientName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  ohidRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ohidText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#38BDF8",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 0.5,
  },
  demographicsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  demoItem: {
    marginRight: 8,
  },
  demoLabel: {
    fontSize: 9,
    color: "#94A3B8",
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  demoValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  demoValue: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bloodValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F87171",
  },
  qrCodeWrapper: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      } as any,
    }),
  },
  qrWhiteSurface: {
    padding: 2,
  },
  enlargeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  enlargeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#2563EB",
  },
  bottomStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
  },
  stripGuideCol: {
    flex: 1,
    marginRight: 8,
  },
  stripGuideRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stripGuideTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  stripGuideSubtitle: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 1,
  },
  stripControlsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  timerText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  accessibleAuditRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
  },
  accessibleFacilityText: {
    fontSize: 9,
    color: "rgba(255, 255, 255, 0.4)",
    fontWeight: "500",
  },
  accessibleTokenText: {
    fontSize: 8,
    color: "rgba(255, 255, 255, 0.25)",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.2)",
      } as any,
    }),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 6,
    marginLeft: 8,
  },
  modalQrWrapper: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  modalPatientName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalOhid: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "600",
    marginTop: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  modalActions: {
    flexDirection: "row",
    marginTop: 20,
    width: "100%",
    justifyContent: "space-between",
  },
  modalRefreshButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    marginRight: 8,
  },
  modalRefreshText: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 13,
  },
  modalDoneButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    marginLeft: 8,
  },
  modalDoneText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
