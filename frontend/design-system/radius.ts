/**
 * OneHealth OS (OH-ID) Design System — Corner Radius Tokens
 * Single Source of Truth for geometric curve tokens ensuring seamless visual rhythm.
 */

export const RADIUS = {
  scale: {
    none: "rounded-none",
    xs: "rounded-sm",    // 2px
    sm: "rounded",       // 4px
    md: "rounded-md",    // 6px
    lg: "rounded-lg",    // 8px
    xl: "rounded-xl",    // 12px
    "2xl": "rounded-2xl",// 16px
    "3xl": "rounded-3xl",// 24px
    "4xl": "rounded-4xl",// 32px
    full: "rounded-full",// 9999px
  },

  // Component Specific Radius Guidelines
  component: {
    badge: "rounded-full",
    badgeSquare: "rounded-lg",
    button: "rounded-xl",
    buttonPill: "rounded-full",
    input: "rounded-xl",
    cardSmall: "rounded-2xl",
    cardStandard: "rounded-3xl",
    cardLarge: "rounded-3xl 2xl:rounded-4xl",
    modal: "rounded-3xl",
    table: "rounded-3xl",
    dropdown: "rounded-2xl",
    toast: "rounded-2xl",
  },
} as const;
