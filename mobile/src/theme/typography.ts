/**
 * OneHealth ID (OH-ID) Mobile Design System — Typography
 */

import { TextStyle } from "react-native";

export const TYPOGRAPHY: Record<string, TextStyle> = {
  hero: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  callout: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  captionBold: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  mono: {
    fontSize: 13,
    fontWeight: "500",
    fontFamily: "Courier",
    lineHeight: 18,
  },
};
