/**
 * OneHealth OS (OH-ID) Design System — Typography Tokens
 * Single Source of Truth for font families, scale, weights,
 * line-heights, and responsive text utility classes.
 */

export const TYPOGRAPHY = {
  fontFamily: {
    sans: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "var(--font-geist-mono), 'SFMono-Regular', Menlo, Monaco, Consolas, monospace",
  },

  // Font Sizes with corresponding Line Heights
  scale: {
    display: {
      fontSize: "2.5rem",    // 40px
      lineHeight: "3rem",     // 48px
      letterSpacing: "-0.025em",
      className: "text-3xl sm:text-4xl 2xl:text-5xl font-black tracking-tight",
    },
    h1: {
      fontSize: "1.875rem",  // 30px
      lineHeight: "2.25rem",  // 36px
      letterSpacing: "-0.02em",
      className: "text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900",
    },
    h2: {
      fontSize: "1.5rem",     // 24px
      lineHeight: "2rem",     // 32px
      letterSpacing: "-0.015em",
      className: "text-xl sm:text-2xl font-bold tracking-tight text-slate-900",
    },
    h3: {
      fontSize: "1.25rem",    // 20px
      lineHeight: "1.75rem",  // 28px
      letterSpacing: "-0.01em",
      className: "text-lg sm:text-xl font-bold text-slate-900",
    },
    h4: {
      fontSize: "1rem",       // 16px
      lineHeight: "1.5rem",   // 24px
      letterSpacing: "-0.005em",
      className: "text-sm sm:text-base font-semibold text-slate-800",
    },
    bodyLarge: {
      fontSize: "1rem",       // 16px
      lineHeight: "1.5rem",
      className: "text-base font-normal text-slate-700 leading-relaxed",
    },
    body: {
      fontSize: "0.875rem",   // 14px
      lineHeight: "1.25rem",  // 20px
      className: "text-sm font-normal text-slate-600 leading-normal",
    },
    bodySmall: {
      fontSize: "0.75rem",    // 12px
      lineHeight: "1rem",     // 16px
      className: "text-xs font-normal text-slate-500",
    },
    caption: {
      fontSize: "0.6875rem", // 11px
      lineHeight: "0.875rem", // 14px
      className: "text-[11px] font-medium text-slate-500",
    },
    micro: {
      fontSize: "0.625rem",  // 10px
      lineHeight: "0.75rem",  // 12px
      className: "text-[10px] font-semibold uppercase tracking-wider text-slate-400",
    },
    code: {
      fontFamily: "var(--font-geist-mono), monospace",
      fontSize: "0.75rem",    // 12px
      lineHeight: "1rem",
      className: "font-mono text-xs font-medium tracking-tight",
    },
    identifier: {
      fontFamily: "var(--font-geist-mono), monospace",
      fontSize: "0.6875rem",  // 11px
      lineHeight: "0.875rem",
      className: "font-mono text-[11px] font-bold tracking-normal px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700",
    },
  },

  weights: {
    regular: "font-normal",   // 400
    medium: "font-medium",     // 500
    semibold: "font-semibold", // 600
    bold: "font-bold",         // 700
    extrabold: "font-extrabold", // 800
    black: "font-black",       // 900
  },
} as const;
