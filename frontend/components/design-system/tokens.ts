/**
 * OneHealth ID (OH-ID) Healthcare Design System — Tokens & Semantic System
 * 
 * Provides unified design tokens ensuring that Admin, Hospital Executive,
 * Doctor, Staff, and Patient interfaces share an identical, cohesive,
 * accessible, and clinically safe visual language.
 */

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

export const ROLE_THEMES: Record<RoleType, {
  label: string;
  badgeClass: string;
  borderClass: string;
  bgLight: string;
  bgDark: string;
  accentText: string;
  iconColor: string;
}> = {
  SUPER_ADMIN: {
    label: "SuperAdmin & Governance",
    badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    borderClass: "border-indigo-500",
    bgLight: "bg-indigo-50/50",
    bgDark: "dark:bg-indigo-950/20",
    accentText: "text-indigo-600 dark:text-indigo-400",
    iconColor: "text-indigo-500",
  },
  HOSPITAL_ADMIN: {
    label: "Hospital Operations",
    badgeClass: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    borderClass: "border-sky-500",
    bgLight: "bg-sky-50/50",
    bgDark: "dark:bg-sky-950/20",
    accentText: "text-sky-600 dark:text-sky-400",
    iconColor: "text-sky-500",
  },
  DOCTOR: {
    label: "Doctor & Clinician",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    borderClass: "border-emerald-500",
    bgLight: "bg-emerald-50/50",
    bgDark: "dark:bg-emerald-950/20",
    accentText: "text-emerald-600 dark:text-emerald-400",
    iconColor: "text-emerald-500",
  },
  NURSE_STAFF: {
    label: "Nurse & Front Desk",
    badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    borderClass: "border-blue-500",
    bgLight: "bg-blue-50/50",
    bgDark: "dark:bg-blue-950/20",
    accentText: "text-blue-600 dark:text-blue-400",
    iconColor: "text-blue-500",
  },
  PATIENT: {
    label: "Citizen & Patient",
    badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    borderClass: "border-purple-500",
    bgLight: "bg-purple-50/50",
    bgDark: "dark:bg-purple-950/20",
    accentText: "text-purple-600 dark:text-purple-400",
    iconColor: "text-purple-500",
  },
};

export const CLINICAL_PRIORITY_THEMES: Record<ClinicalPriority, {
  label: string;
  badgeClass: string;
  pulseColor?: string;
  indicatorClass: string;
}> = {
  EMERGENCY: {
    label: "Emergency Fast-Track",
    badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    pulseColor: "bg-rose-500",
    indicatorClass: "text-rose-600 font-bold",
  },
  URGENT: {
    label: "Urgent Consultation",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    pulseColor: "bg-amber-500",
    indicatorClass: "text-amber-600 font-semibold",
  },
  NORMAL: {
    label: "Routine",
    badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    indicatorClass: "text-blue-600",
  },
  OBSERVATION: {
    label: "Clinical Observation",
    badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    indicatorClass: "text-purple-600",
  },
};

export const CLINICAL_STATUS_THEMES: Record<ClinicalStatus, {
  label: string;
  badgeClass: string;
  pulseColor?: string;
}> = {
  WAITING: {
    label: "In Waiting Area",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    pulseColor: "bg-amber-500",
  },
  CALLING: {
    label: "Token Calling",
    badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 animate-pulse",
    pulseColor: "bg-indigo-600",
  },
  IN_CONSULTATION: {
    label: "In Consultation",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    pulseColor: "bg-emerald-500",
  },
  COMPLETED: {
    label: "Completed",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  HOLD: {
    label: "On Hold",
    badgeClass: "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
  SKIPPED: {
    label: "Skipped / Absent",
    badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  ADMITTED: {
    label: "IPD Admitted",
    badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    pulseColor: "bg-blue-500",
  },
  DISCHARGED: {
    label: "Discharged",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  PAID: {
    label: "Fully Paid",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  PARTIAL: {
    label: "Partially Paid",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  PENDING: {
    label: "Payment Pending",
    badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  ABNORMAL: {
    label: "Abnormal Diagnostic Flag",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border-rose-300 dark:border-rose-700 font-bold",
    pulseColor: "bg-rose-600",
  },
  NORMAL_TEST: {
    label: "Within Normal Range",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
};
