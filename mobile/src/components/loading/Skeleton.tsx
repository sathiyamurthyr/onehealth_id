/**
 * ONEHEALTH ID (OH-ID) Mobile — Core Animated Skeleton Loader
 * Sathus Technology Pvt Ltd
 *
 * Implements smooth pulse shimmer animation using native Animated API.
 * Accessible, zero-dependency, works identically on Web, iOS and Android.
 */

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ViewStyle, DimensionValue } from "react-native";
import { ohidTheme } from "../../theme";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 16,
  borderRadius = 6,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
      accessibilityRole="none"
      accessibilityLabel="Loading..."
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#E2E8F0",
  },
});

