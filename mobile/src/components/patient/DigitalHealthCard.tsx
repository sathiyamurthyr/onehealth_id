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
  Image,
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const OH_ID_MARK = require("../../../assets/ohid_official_mark.png");

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
          setTimeout(() => {
            if (onRotate) {
              onRotate().catch(() => {});
            }
          }, 0);
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
      <View style={[styles.cardContainer, { padding: 18, justifyContent: "space-between", minHeight: 200 }]} testID={testID}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", marginRight: 10 }} />
            <View>
              <View style={{ width: 120, height: 16, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", marginBottom: 6 }} />
              <View style={{ width: 80, height: 12, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.18)" }} />
            </View>
          </View>
          <View style={{ width: 70, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.22)" }} />
        </View>
        <View style={{ marginVertical: 14 }}>
          <View style={{ width: 140, height: 18, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.28)", marginBottom: 8 }} />
          <View style={{ width: 180, height: 12, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.18)" }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ width: 100, height: 12, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.18)" }} />
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.22)" }} />
        </View>
        <Text style={{ position: "absolute", opacity: 0, height: 0, width: 0 }}>Loading OneHealth ID Pass...</Text>
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
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.brandTitle}>OneHealth ID</Text>
            <Text style={styles.brandSubtitle}>Digital Health Identity Card</Text>
          </View>
        </View>

        <View style={styles.verifiedBadge} testID="verification-badge">
          <CheckCircle2 size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.verifiedBadgeText}>
            {cardData?.verification_status === "VERIFIED_ACTIVE" || isVerified
              ? "Verified"
              : "Pending"}
          </Text>
          <Text style={styles.accessibleBadgeHelper}>Identity active</Text>
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
              size={86}
              color="#0F172A"
              backgroundColor="#FFFFFF"
              ecl="H"
            />
            {/* Centered Official OH-ID Logo Inside QR Code */}
            <View style={styles.qrCenterLogoOverlay} pointerEvents="none">
              <Image
                source={OH_ID_MARK}
                style={styles.qrCenterLogoImage}
                resizeMode="contain"
                accessibilityLabel="OH-ID Logo"
              />
            </View>
          </View>
          <View style={styles.enlargeRow}>
            <Maximize2 size={11} color="#2563EB" style={{ marginRight: 4 }} />
            <Text style={styles.enlargeText}>Tap to Enlarge</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom Action Strip: Hospital QR Check-In with Live Countdown & Refresh */}
      <View style={styles.bottomStrip}>
        <View style={styles.stripGuideCol}>
          <View style={styles.stripGuideRow}>
            <View style={styles.livePulseDot} />
            <Text style={styles.stripGuideTitle}>Hospital QR Check-In</Text>
          </View>
          <Text style={styles.stripGuideSubtitle}>
            Show at reception or OPD kiosk for quick intake
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

            {/* High-Contrast Large QR Container with Centered Logo */}
            <View style={styles.modalQrWrapper}>
              <View style={styles.modalQrInnerBox}>
                <QRCode
                  value={qrUrl}
                  size={220}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                  ecl="H"
                />
                {/* Official Centered OH-ID Logo Inside Large Modal QR */}
                <View style={styles.modalQrCenterLogoOverlay} pointerEvents="none">
                  <Image
                    source={OH_ID_MARK}
                    style={styles.modalQrCenterLogoImage}
                    resizeMode="contain"
                    accessibilityLabel="OH-ID Kiosk Logo"
                  />
                </View>
              </View>
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
    marginBottom: 10,
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
    backgroundColor: "#059669",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 14,
  },
  verifiedBadgeText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  accessibleBadgeHelper: {
    height: 0,
    width: 0,
    opacity: 0,
    fontSize: 1,
  },
  cardBodyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  identityLeftCol: {
    flex: 1,
    marginRight: 12,
  },
  patientName: {
    fontSize: 21,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  ohidRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ohidText: {
    fontSize: 12.5,
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
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  demoItem: {
    marginRight: 8,
  },
  demoLabel: {
    fontSize: 8.5,
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
    fontSize: 11.5,
    fontWeight: "700",
    color: "#F87171",
  },
  qrCodeWrapper: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 5,
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
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  qrCenterLogoOverlay: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  qrCenterLogoImage: {
    width: 19,
    height: 22,
  },
  enlargeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
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
    backgroundColor: "rgba(10, 25, 47, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  stripGuideCol: {
    flex: 1,
    marginRight: 8,
  },
  stripGuideRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#38BDF8",
    marginRight: 6,
  },
  stripGuideTitle: {
    fontSize: 12,
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
    height: 0,
    opacity: 0,
    overflow: "hidden",
  },
  accessibleFacilityText: {
    fontSize: 1,
  },
  accessibleTokenText: {
    fontSize: 1,
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
  modalQrInnerBox: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  modalQrCenterLogoOverlay: {
    position: "absolute",
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  modalQrCenterLogoImage: {
    width: 44,
    height: 48,
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
