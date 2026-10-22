/**
 * OneHealth OS (OH-ID) Design System — Icon Standards & Mapping
 * Single Source of Truth for Lucide icon sizes, stroke widths,
 * and semantic healthcare iconography.
 */

import React from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BedDouble,
  Bell,
  Briefcase,
  Building,
  Building2,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  CreditCard,
  Database,
  DoorClosed,
  Download,
  Droplet,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck2,
  FilePlus,
  FileText,
  Filter,
  Flame,
  FlaskConical,
  FolderOpen,
  Headphones,
  Heart,
  HeartPulse,
  HelpCircle,
  History,
  Hospital,
  KeyRound,
  Layers,
  LayoutDashboard,
  ListOrdered,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Pill,
  Plus,
  PlusCircle,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  Scan,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  TestTube,
  Thermometer,
  Trash2,
  User,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  Wind,
  X,
  XCircle,
} from "lucide-react";

export const ICON_SIZES = {
  xs: "w-3 h-3",       // 12px
  sm: "w-4 h-4",       // 16px (Default for buttons, table actions, inputs)
  md: "w-5 h-5",       // 20px (Default for card headers, modal titles)
  lg: "w-6 h-6",       // 24px (Default for hero cards, stat icons)
  xl: "w-8 h-8",       // 32px (Default for empty states, avatars)
  "2xl": "w-12 h-12",  // 48px (Default for large hero badges)
} as const;

export const ICON_STROKE_WIDTH = 2; // Modern clean healthcare stroke

export const ICONS = {
  // Navigation & Hierarchy
  nav: {
    dashboard: LayoutDashboard,
    patients: Users,
    patientRegistry: UserCheck,
    appointments: Calendar,
    queue: Clock,
    prescriptions: Pill,
    records: FileText,
    vitals: HeartPulse,
    billing: CreditCard,
    departments: Layers,
    hospital: Hospital,
    settings: Settings,
    logout: LogOut,
    audit: ShieldCheck,
  },

  // Clinical Vitals
  vitals: {
    bloodPressure: Activity,
    heartRate: HeartPulse,
    pulse: Heart,
    spo2: Droplet,
    temperature: Thermometer,
    respiratoryRate: Wind,
  },

  // Specialties
  specialty: {
    cardiology: HeartPulse,
    generalMedicine: Stethoscope,
    pediatrics: User,
    orthopedics: Activity,
    oncology: Flame,
    neurology: Cpu,
    radiology: Eye,
    pathology: Droplet,
  },

  // Roles
  roles: {
    superAdmin: ShieldAlert,
    hospitalAdmin: UserCog,
    doctor: Stethoscope,
    nurse: HeartPulse,
    receptionist: Users,
    patient: User,
  },

  // Triage & Diagnostics
  triage: {
    emergency: Flame,
    urgent: AlertTriangle,
    routine: CheckCircle2,
    observation: Eye,
    criticalAlert: ShieldAlert,
  },

  // UI Actions & Common
  action: {
    search: Search,
    filter: Filter,
    plus: Plus,
    plusCircle: PlusCircle,
    addPatient: UserPlus,
    check: Check,
    checkCircle: CheckCircle2,
    close: X,
    closeCircle: XCircle,
    chevronDown: ChevronDown,
    chevronRight: ChevronRight,
    arrowRight: ArrowRight,
    lock: Lock,
    shield: Shield,
    shieldCheck: ShieldCheck,
    qrCode: QrCode,
    sparkles: Sparkles,
    print: Printer,
    download: Download,
    share: Share2,
    phone: Phone,
    email: Mail,
    location: MapPin,
    refresh: RefreshCw,
    sliders: SlidersHorizontal,
  },
} as const;

/**
 * Comprehensive Canonical Icon Map supporting all role navigation,
 * workspace menus, clinical workflows, and dynamic identifiers.
 */
export const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BedDouble,
  Bell,
  Briefcase,
  Building,
  Building2,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  CreditCard,
  Database,
  DoorClosed,
  Download,
  Droplet,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck2,
  FilePlus,
  FileText,
  Filter,
  Flame,
  FlaskConical,
  FolderOpen,
  Headphones,
  Heart,
  HeartPulse,
  HelpCircle,
  History,
  Hospital,
  KeyRound,
  Layers,
  ListOrdered,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Pill,
  Plus,
  PlusCircle,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  Scan,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  TestTube,
  Thermometer,
  Trash2,
  User,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  Wind,
  X,
  XCircle,
};

/**
 * Case-insensitive, resilient icon resolver for navigation configs,
 * dynamic API responses, and custom string identifiers.
 */
export function resolveNavigationIcon(iconName?: string, defaultFallback: React.ElementType = LayoutDashboard): React.ElementType {
  if (!iconName || typeof iconName !== "string") {
    return defaultFallback;
  }

  // 1. Exact match
  if (ICON_MAP[iconName]) {
    return ICON_MAP[iconName];
  }

  // 2. Normalized match (handles kebab-case, snake_case, spaces, lowercase)
  const normalized = iconName.toLowerCase().replace(/[-_\s]/g, "");
  for (const [key, component] of Object.entries(ICON_MAP)) {
    if (key.toLowerCase().replace(/[-_\s]/g, "") === normalized) {
      return component;
    }
  }

  return defaultFallback;
}

/**
 * Dynamic Icon Component wrapper with fallback & accessibility
 */
export const DynamicIcon: React.FC<{
  name?: string;
  className?: string;
  fallback?: React.ElementType;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}> = ({ name, className = "w-4 h-4", fallback = LayoutDashboard, "aria-hidden": ariaHidden = true, "aria-label": ariaLabel }) => {
  const IconComponent = resolveNavigationIcon(name, fallback);
  return React.createElement(IconComponent, {
    className,
    "aria-hidden": ariaLabel ? undefined : (ariaHidden === true || ariaHidden === "true"),
    "aria-label": ariaLabel,
  });
};
