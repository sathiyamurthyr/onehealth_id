/**
 * ONEHEALTH ID (OH-ID) Mobile — QR Scanning Verification Loader (Concept 8)
 * Sathus Technology Pvt Ltd
 */

import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, ActivityIndicator } from "react-native";
import { QrCode } from "lucide-react-native";
import { ohidTheme } from "../../theme";

export interface QrScanningLoaderProps {
  title?: string;
  subtitle?: string;
  testID?: string;
}

export const QrScanningLoader: React.FC<QrScanningLoaderProps> = ({
  title = "Verifying QR Code...",
  subtitle = "Checking hospital, patient and appointment details",
  testID = "qr-scanning-loader",
}) => {
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [scanAnim]);

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 130],
  });

  return (
    <View style={styles.container} testID={testID}>
      {/* Target QR Scanner Frame */}
      <View style={styles.frame}>
        {/* 4 Corner Brackets */}
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />

        {/* Center QR Icon Placeholder */}
        <View style={styles.qrIconWrap}>
          <QrCode size={90} color="#155EEF" strokeWidth={1.4} />
        </View>

        {/* Animated Laser Scanning Line */}
        <Animated.View
          style={[
            styles.scanLine,
            {
              transform: [{ translateY }],
            },
          ]}
        />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <ActivityIndicator size="small" color={ohidTheme.colors.primary} style={styles.spinner} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  frame: {
    width: 170,
    height: 170,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 24,
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#155EEF",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 6,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 6,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 6,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 6,
  },
  qrIconWrap: {
    opacity: 0.9,
  },
  scanLine: {
    position: "absolute",
    top: 15,
    left: 10,
    right: 10,
    height: 3,
    backgroundColor: "#00E5FF",
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
    borderRadius: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: ohidTheme.colors.textPrimary,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: ohidTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
    maxWidth: 260,
  },
  spinner: {
    marginTop: 4,
  },
});

