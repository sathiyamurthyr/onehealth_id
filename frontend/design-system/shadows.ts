/**
 * OneHealth OS (OH-ID) Design System — Elevation & Shadow Tokens
 * Single Source of Truth for depth, layered hierarchy, and clinical glow states.
 */

export const SHADOWS = {
  scale: {
    none: "shadow-none",
    xs: "shadow-xs",
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
    xl: "shadow-xl",
    "2xl": "shadow-2xl",
    inner: "shadow-inner",
  },

  // Colored Semantic Glows
  glow: {
    blue: "shadow-lg shadow-blue-500/20",
    emerald: "shadow-lg shadow-emerald-500/20",
    rose: "shadow-lg shadow-rose-500/20",
    amber: "shadow-lg shadow-amber-500/20",
    indigo: "shadow-lg shadow-indigo-500/20",
  },

  // Component Elevation Standard Presets
  component: {
    card: "shadow-sm hover:shadow-md transition-shadow",
    cardElevated: "shadow-md hover:shadow-lg transition-shadow",
    modal: "shadow-2xl",
    dropdown: "shadow-xl border border-slate-200",
    popover: "shadow-xl",
    toast: "shadow-xl",
    floatingButton: "shadow-lg shadow-blue-500/25 active:shadow-md",
  },
} as const;
