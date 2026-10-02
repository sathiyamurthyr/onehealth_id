/**
 * OneHealth OS (OH-ID) Design System — Icon Standards & Mapping
 * Single Source of Truth for Lucide icon sizes, stroke widths,
 * and semantic healthcare iconography.
 */

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  CreditCard,
  Droplet,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Flame,
  Heart,
  HeartPulse,
  Hospital,
  Layers,
  Lock,
  Pill,
  Plus,
  PlusCircle,
  QrCode,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
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
  Printer,
  Download,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  LogOut,
  SlidersHorizontal,
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
    dashboard: Activity,
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
