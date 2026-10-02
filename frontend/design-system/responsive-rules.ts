/**
 * OneHealth OS (OH-ID) Design System — Responsive Rules & Adaptive Scaling
 * Single Source of Truth for breakpoints, fluid scaling (Mobile to 8K),
 * and touch ergonomic standards.
 */

export const RESPONSIVE_RULES = {
  // Canonical Breakpoints
  breakpoints: {
    mobile: "max-width: 639px",
    tablet: "min-width: 640px and max-width: 1023px",
    desktop: "min-width: 1024px",
    wideDesktop: "min-width: 1536px",
    ultraWide: "min-width: 1920px",
    display4K: "min-width: 2560px",
    display8K: "min-width: 7680px",
  },

  // Touch Ergonomics (Clinical Tablets, Nurses on Carts, Mobile Citizens)
  touch: {
    minTargetSize: "44px", // Absolute minimum touch target size
    recommendedTargetSize: "48px",
    minSpacingBetweenTouchTargets: "8px",
  },

  // Viewport Guidelines
  viewport: {
    /**
     * Rule 1: Zero-Scroll Modals and Portals
     * Modals must not exceed 90vh on mobile or 85vh on desktop.
     * Inner scrolling must be scoped strictly to list containers, never the outer window.
     */
    modalMaxHeight: "max-h-[90vh]",
    modalBodyScroll: "max-h-[60vh] overflow-y-auto",

    /**
     * Rule 2: Full Viewport Command Center (Login, ER Triage)
     * Must fit into viewport with h-screen overflow-hidden on desktop.
     */
    zeroScrollContainer: "h-screen w-screen max-h-screen overflow-hidden",

    /**
     * Rule 3: Clinical Workspace Tables
     * Must maintain responsive horizontal scroll or card view on mobile screens (< 1024px).
     */
    responsiveTable: {
      desktop: "hidden lg:block",
      mobileCards: "block lg:hidden space-y-3",
    },
  },

  // Fluid Sizing Mappings for 8K / 4K / Ultra-wide displays
  ultraScale: {
    containerMaxWidth: "w-full max-w-7xl 3xl:max-w-[1680px] 4xl:max-w-[2100px]",
    titleScale: "text-2xl 2xl:text-4xl 3xl:text-5xl",
    bodyScale: "text-xs 2xl:text-sm 3xl:text-base",
  },
} as const;
