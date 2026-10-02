/**
 * OneHealth OS (OH-ID) Design System — Animation & Motion Tokens
 * Single Source of Truth for micro-interactions, state transitions,
 * and clinical alert pulses.
 */

export const ANIMATIONS = {
  durations: {
    fast: "150ms",
    normal: "250ms",
    slow: "400ms",
    cinematic: "1000ms",
  },

  easings: {
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  },

  // Tailwind CSS Utility Classes
  classes: {
    fadeIn: "animate-fadeIn",
    pulse: "animate-pulse",
    ping: "animate-ping",
    spin: "animate-spin",
    spinSlow: "animate-spin [animation-duration:8s]",
    transitionAll: "transition-all duration-200 ease-out",
    transitionColors: "transition-colors duration-150 ease-out",
    transitionTransform: "transition-transform duration-200 ease-out",
    cardHover: "hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out",
    buttonPress: "active:scale-[0.98] transition-transform duration-100",
  },

  // Clinical Alert Motion Patterns
  alertPatterns: {
    emergencyFlash: "animate-pulse duration-700",
    callingTokenBounce: "animate-bounce duration-1000",
    liveIndicatorPulse: "relative flex h-2 w-2",
  },
} as const;
