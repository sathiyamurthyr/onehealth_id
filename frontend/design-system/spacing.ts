/**
 * OneHealth OS (OH-ID) Design System — Spacing Tokens
 * Single Source of Truth for spacing, padding presets, margin rules,
 * grid gaps, and touch target minimums.
 */

export const SPACING = {
  // Base 4px Geometric Scale
  scale: {
    none: "0",
    "3xs": "0.125rem", // 2px
    "2xs": "0.25rem",  // 4px
    xs: "0.375rem",    // 6px
    sm: "0.5rem",      // 8px
    md: "0.75rem",     // 12px
    base: "1rem",      // 16px
    lg: "1.25rem",     // 20px
    xl: "1.5rem",      // 24px
    "2xl": "2rem",     // 32px
    "3xl": "2.5rem",   // 40px
    "4xl": "3rem",     // 48px
    "5xl": "4rem",     // 64px
    "6xl": "5rem",     // 80px
  },

  // Component Padding Presets
  component: {
    badge: {
      sm: "px-2 py-0.5",
      md: "px-2.5 py-1",
      lg: "px-3 py-1.5",
    },
    button: {
      sm: "px-2.5 py-1.5 min-h-[36px]",
      md: "px-3.5 py-2 min-h-[40px]",
      lg: "px-5 py-2.5 min-h-[44px]",
      touch: "min-h-[44px] min-w-[44px]", // Mobile ergonomic standard
    },
    input: {
      sm: "px-3 py-1.5 text-xs min-h-[36px]",
      md: "px-3.5 py-2 text-xs min-h-[40px]",
      lg: "px-4 py-2.5 text-sm min-h-[44px]",
    },
    card: {
      compact: "p-3 sm:p-4",
      standard: "p-4 sm:p-6",
      relaxed: "p-6 sm:p-8 2xl:p-10",
    },
    modal: {
      body: "p-5 sm:p-6 space-y-4",
      header: "pb-3 border-b border-slate-100",
      footer: "pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5",
    },
    table: {
      cell: "py-3.5 px-4 sm:px-6",
      headerCell: "py-3 px-4 sm:px-6 text-xs uppercase font-semibold tracking-wider",
    },
    page: {
      wrapper: "space-y-6 pb-12",
      header: "p-5 sm:p-6 rounded-3xl",
      filterBar: "p-4 rounded-2xl",
    },
  },

  // Layout Gaps
  gap: {
    xs: "gap-1.5",
    sm: "gap-2.5",
    md: "gap-4",
    lg: "gap-6",
    xl: "gap-8",
  },
} as const;
