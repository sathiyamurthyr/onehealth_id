/**
 * OneHealth OS (OH-ID) Design System — Color Tokens
 * Single Source of Truth for all color palettes, semantic statuses,
 * clinical triage indicators, and role-based themes across Public, Patient,
 * Doctor, and Hospital Admin surfaces.
 */

export const COLORS = {
  // Brand Primary — Hygienic Clinical Blue
  primary: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
    950: "#172554",
  },

  // Secondary Accent — Electric Cyan / Diagnostic Glow
  accent: {
    50: "#ecfeff",
    100: "#cffafe",
    200: "#a5f3fc",
    300: "#67e8f9",
    400: "#22d3ee",
    500: "#06b6d4",
    600: "#0891b2",
    700: "#0e7490",
    800: "#155e75",
    900: "#164e63",
  },

  // Clinical Success / Verified — Sage & Emerald
  success: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
  },

  // Clinical Warning / Urgent Consultation — Warm Amber & Ochre
  warning: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
  },

  // Clinical Danger / Emergency Fast-Track / Abnormal Vitals — Crimson & Rose
  danger: {
    50: "#fff1f2",
    100: "#ffe4e6",
    200: "#fecdd3",
    300: "#fda4af",
    400: "#fb7185",
    500: "#f43f5e",
    600: "#e11d48",
    700: "#be123c",
    800: "#9f1239",
    900: "#881337",
  },

  // Observation / Specialty / Governance — Amethyst & Indigo
  specialty: {
    50: "#faf5ff",
    100: "#f3e8ff",
    200: "#e9d5ff",
    300: "#d8b4fe",
    400: "#c084fc",
    500: "#a855f7",
    600: "#9333ea",
    700: "#7e22ce",
    800: "#6b21a8",
    900: "#581c87",
  },

  // Neutral — Clean Clinical Slate
  neutral: {
    0: "#ffffff",
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },
} as const;

export type RoleType = "SUPER_ADMIN" | "HOSPITAL_ADMIN" | "DOCTOR" | "NURSE_STAFF" | "PATIENT";
export type ClinicalPriority = "NORMAL" | "URGENT" | "EMERGENCY" | "OBSERVATION";
export type ClinicalStatus = 
  | "WAITING" 
  | "CALLING" 
  | "IN_CONSULTATION" 
  | "COMPLETED" 
  | "HOLD" 
  | "SKIPPED"
  | "ADMITTED"
  | "DISCHARGED"
  | "PAID"
  | "PARTIAL"
  | "PENDING"
  | "ABNORMAL"
  | "NORMAL_TEST";

/**
 * Role Theme Semantic Mappings
 */
export const ROLE_THEMES: Record<RoleType, {
  label: string;
  badgeClass: string;
  borderClass: string;
  bgLight: string;
  bgDark?: string;
  accentText: string;
  iconColor: string;
  dotColor: string;
}> = {
  SUPER_ADMIN: {
    label: "SuperAdmin & Governance",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    borderClass: "border-indigo-500",
    bgLight: "bg-indigo-50/50",
    accentText: "text-indigo-600",
    iconColor: "text-indigo-500",
    dotColor: "bg-indigo-500",
  },
  HOSPITAL_ADMIN: {
    label: "Hospital Operations",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    borderClass: "border-sky-500",
    bgLight: "bg-sky-50/50",
    accentText: "text-sky-600",
    iconColor: "text-sky-500",
    dotColor: "bg-sky-500",
  },
  DOCTOR: {
    label: "Doctor & Specialist",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    borderClass: "border-emerald-500",
    bgLight: "bg-emerald-50/50",
    accentText: "text-emerald-600",
    iconColor: "text-emerald-500",
    dotColor: "bg-emerald-500",
  },
  NURSE_STAFF: {
    label: "Nursing & Front Desk",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    borderClass: "border-blue-500",
    bgLight: "bg-blue-50/50",
    accentText: "text-blue-600",
    iconColor: "text-blue-500",
    dotColor: "bg-blue-500",
  },
  PATIENT: {
    label: "Citizen & Patient",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    borderClass: "border-purple-500",
    bgLight: "bg-purple-50/50",
    accentText: "text-purple-600",
    iconColor: "text-purple-500",
    dotColor: "bg-purple-500",
  },
};

/**
 * Clinical Priority Triage Color Scales
 */
export const CLINICAL_PRIORITY_THEMES: Record<ClinicalPriority, {
  label: string;
  badgeClass: string;
  pulseColor?: string;
  indicatorClass: string;
}> = {
  EMERGENCY: {
    label: "Emergency Fast-Track",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
    pulseColor: "bg-rose-500",
    indicatorClass: "text-rose-600 font-bold",
  },
  URGENT: {
    label: "Urgent Consultation",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 font-semibold",
    pulseColor: "bg-amber-500",
    indicatorClass: "text-amber-600 font-semibold",
  },
  NORMAL: {
    label: "Routine",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    indicatorClass: "text-blue-600",
  },
  OBSERVATION: {
    label: "Clinical Observation",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    indicatorClass: "text-purple-600",
  },
};

/**
 * Clinical Status Themes
 */
export const CLINICAL_STATUS_THEMES: Record<ClinicalStatus, {
  label: string;
  badgeClass: string;
  pulseColor?: string;
}> = {
  WAITING: {
    label: "In Waiting Area",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    pulseColor: "bg-amber-500",
  },
  CALLING: {
    label: "Token Calling",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse font-bold",
    pulseColor: "bg-indigo-600",
  },
  IN_CONSULTATION: {
    label: "In Consultation",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold",
    pulseColor: "bg-emerald-500",
  },
  COMPLETED: {
    label: "Completed",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  HOLD: {
    label: "On Hold",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
  },
  SKIPPED: {
    label: "Skipped / Absent",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
  ADMITTED: {
    label: "IPD Admitted",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    pulseColor: "bg-blue-500",
  },
  DISCHARGED: {
    label: "Discharged",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  PAID: {
    label: "Fully Settled",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  PARTIAL: {
    label: "Partially Paid",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  PENDING: {
    label: "Payment Pending",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
  ABNORMAL: {
    label: "Abnormal Diagnostic Flag",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
    pulseColor: "bg-rose-600",
  },
  NORMAL_TEST: {
    label: "Within Normal Range",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};
