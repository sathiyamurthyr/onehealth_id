/**
 * ONEHEALTH ID (OH-ID) Mobile — Standardized App Header
 * Sathus Technology Pvt Ltd
 *
 * Implements the official Design Standard Header layout (Visual Reference):
 * [Card Container: White #FFFFFF, Rounded 16px, Border #E2E8F0, Shadow, on #F7F9FC]
 * [<- Back?] [OH-ID Brand Logo] | [Page Title / Subtitle]  [Outlined Bell] [Outlined Avatar]
 *
 * Requirements:
 * - Outer page contrast: #F7F9FC
 * - Header Card: #FFFFFF with subtle border (#E2E8F0) and soft shadow
 * - Official OH-ID cyan/blue cross & pulse mark with "OH-ID" brand text
 * - Subtle blue vertical divider (#BFDBFE) between logo and title
 * - Dark navy title (#0B1E40) + muted slate subtitle (#475569)
 * - Outlined circular action buttons for Notifications (with red badge) & Profile Photo
 * - Profile photo avatar dynamically reflects uploaded/updated user photo
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Bell, User as UserIcon } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const OH_ID_LOGO = require("../../../assets/ohid_logo.png");

export type AppHeaderProps = {
  title: string;
  subtitle?: string;
  titleFontSize?: number;
  showBackButton?: boolean;
  backButtonTestID?: string;
  showLogo?: boolean;
  showDivider?: boolean;
  rightAction?: React.ReactNode;
  showDefaultActions?: boolean;
  unreadNotificationsCount?: number;
  avatarUri?: string | null;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  onBackPress?: () => void;
  testID?: string;
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  titleFontSize,
  showBackButton = false,
  backButtonTestID = "back-to-patient-home",
  showLogo = true,
  showDivider = true,
  rightAction,
  showDefaultActions = true,
  unreadNotificationsCount = 3,
  avatarUri,
  onNotificationPress,
  onProfilePress,
  onBackPress,
  testID = "app-header",
}) => {
  const router = useRouter();
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  // Dynamically resolve active avatar from props, AuthContext, or user profile
  let activeAvatar = avatarUri ?? null;
  if (!activeAvatar) {
    try {
      const auth = typeof useAuth === "function" ? useAuth() : null;
      activeAvatar =
        auth?.patientAvatar ??
        (auth?.user as any)?.avatar_url ??
        (auth?.user as any)?.profile_photo_url ??
        (auth?.user as any)?.patient?.avatar_url ??
        (auth?.user as any)?.patient?.profile_photo_url ??
        null;
    } catch {
      activeAvatar = null;
    }
  }

  useEffect(() => {
    setAvatarLoadError(false);
  }, [activeAvatar]);

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    if (typeof router?.canGoBack === "function" ? router.canGoBack() : true) {
      router.back();
    } else {
      router.replace("/(patient)" as any);
    }
  };

  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      router.push("/(patient)/profile" as any);
    }
  };

  return (
    <View style={styles.headerWrapper}>
      <View style={styles.headerContainer} testID={testID}>
        {/* Left Area: Back Button + Logo */}
        <View style={styles.leftGroup}>
          {showBackButton && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              testID={backButtonTestID}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={19} color="#0F172A" strokeWidth={2.2} />
            </TouchableOpacity>
          )}

          {showLogo && (
            <Image
              source={OH_ID_LOGO}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="OH-ID Logo"
            />
          )}
        </View>

        {/* Subtle Blue Vertical Divider */}
        {showDivider && showLogo && <View style={styles.verticalDivider} />}

        {/* Center / Flexible Title Area */}
        <View style={styles.titleGroup}>
          <Text
            style={[styles.headerTitle, titleFontSize ? { fontSize: titleFontSize } : null]}
            numberOfLines={1}
            ellipsizeMode="tail"
            testID="header-title-text"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={styles.headerSubtitle}
              numberOfLines={1}
              ellipsizeMode="tail"
              testID="header-subtitle-text"
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right Area: Action Icon or Default Outlined Bell & Avatar */}
        <View style={styles.rightGroup}>
          {rightAction ? (
            rightAction
          ) : showDefaultActions ? (
            <View style={styles.defaultActionsRow}>
              {/* Outlined Notification Bell */}
              <TouchableOpacity
                style={styles.actionButtonOutlined}
                onPress={onNotificationPress}
                accessibilityRole="button"
                accessibilityLabel={`Notifications: ${unreadNotificationsCount} unread`}
                activeOpacity={0.7}
                testID="header-notification-btn"
              >
                <Bell size={18} color="#0F172A" strokeWidth={2} />
                {unreadNotificationsCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{unreadNotificationsCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Outlined Profile Avatar */}
              <TouchableOpacity
                style={styles.actionButtonOutlined}
                onPress={handleProfilePress}
                accessibilityRole="button"
                accessibilityLabel="Patient Profile"
                activeOpacity={0.7}
                testID="btn-patient-avatar"
              >
                {activeAvatar && !avatarLoadError ? (
                  <Image
                    source={{ uri: activeAvatar }}
                    style={styles.avatarHeaderImage}
                    testID="patient-header-avatar-image"
                    onError={() => setAvatarLoadError(true)}
                  />
                ) : (
                  <UserIcon size={18} color="#2563EB" strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.rightSpacer} />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: "#F7F9FC",
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "ios" ? 4 : 8,
    paddingBottom: 4,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    minHeight: 64,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 4,
    marginRight: 4,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 36,
    height: 36,
    backgroundColor: "transparent",
  },
  verticalDivider: {
    width: 1.5,
    height: 32,
    backgroundColor: "#BFDBFE",
    marginHorizontal: 8,
    borderRadius: 1,
  },
  titleGroup: {
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: "700",
    color: "#0B1E40",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "400",
    marginTop: 1,
    lineHeight: 15,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginLeft: 6,
  },
  defaultActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rightSpacer: {
    width: 6,
  },
  actionButtonOutlined: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
  },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  bellBadgeText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "700",
  },
  avatarHeaderImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
});
