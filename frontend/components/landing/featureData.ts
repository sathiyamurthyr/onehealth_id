import { QrCode, Clock, Building2, ShieldCheck } from "lucide-react";
import { FeatureDetail } from "./FeatureDetailModal";

export const FEATURE_DETAILS: Record<string, FeatureDetail> = {
  "zero-knowledge-qr": {
    id: "zero-knowledge-qr",
    title: "Zero-Knowledge QR",
    subtitle: "Privacy-Preserving Verification",
    icon: QrCode,
    themeColor: {
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      badgeBg: "bg-blue-50",
      badgeText: "text-blue-700",
      badgeBorder: "border-blue-200",
    },
    summary:
      "Patient identification and triage verification architecture designed to eliminate raw electronic health record exposure at reception counters.",
    sections: [
      {
        heading: "Verification Protocol & Workflow",
        content:
          "Upon arrival at an affiliated hospital counter, a patient presents an ephemeral OneHealth QR code generated from their mobile portal, card, or wristband. The admitting counter scanner reads the cryptographic token and requests authorized validation.",
        bulletPoints: [
          "Token verification via HMAC-SHA256 signature",
          "Zero raw diagnostic notes or test values in visual QR payload",
          "Time-bounded token expiration prevents replay attacks",
          "Instant patient identity matching with hospital demographics",
        ],
      },
      {
        heading: "Encoded Data Payload & Privacy Boundaries",
        content:
          "The QR payload consists strictly of an ephemeral signed token UUID, masked OneHealth ID (e.g. OHID-7842-****), tenant issuing facility hash, and expiration timestamp. Complete medical history remains securely vaulted in PostgreSQL database schemas and is accessible only with explicit practitioner privileges.",
      },
      {
        heading: "Who Can Access Verification Endpoints",
        content:
          "Public verify routes (/verify/prescription and /verify/document) validate authenticity of issued clinical documents for pharmacies and insurers without exposing patient longitudinal history.",
      },
    ],
    capabilities: [
      {
        status: "IMPLEMENTED",
        label: "HMAC-SHA256 Signed Verification Tokens",
        description: "Active cryptographic signing prevents forged patient identifiers and altered clinical tokens.",
      },
      {
        status: "IMPLEMENTED",
        label: "Public Document Verification Engine",
        description: "Dedicated endpoints at /verify/prescription/[token] and /verify/document/[token].",
      },
      {
        status: "IN_PROGRESS",
        label: "Dynamic Rotating QR Code Refresh",
        description: "Automated 60-second rolling token generation in mobile patient portal.",
      },
      {
        status: "PLANNED",
        label: "Zero-Knowledge Proofs (ZK-SNARKs)",
        description: "Planned cryptographic proof generation to verify insurance validity without disclosing identity.",
      },
    ],
    primaryAction: {
      label: "Open Patient QR Portal",
      href: "/login?redirect=/patient/qr",
      note: "Authentication required to generate or verify live patient tokens.",
    },
    secondaryAction: {
      label: "Verify Document Route",
      href: "/verify/prescription/demo",
    },
  },

  "live-opd-queue": {
    id: "live-opd-queue",
    title: "Live OPD Queue",
    subtitle: "Real-Time Patient Flow",
    icon: Clock,
    themeColor: {
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      badgeBg: "bg-indigo-50",
      badgeText: "text-indigo-700",
      badgeBorder: "border-indigo-200",
    },
    summary:
      "Automated queue orchestration system managing outpatient admissions, priority triage categories, and consultation progress.",
    sections: [
      {
        heading: "Queue Sequencing & Token Generation",
        content:
          "Tokens are automatically assigned upon patient check-in at reception or kiosk stations. The sequence incorporates department codes and priority indicators (e.g. CARD-101 for Cardiology, GEN-204 for General Medicine).",
        bulletPoints: [
          "Automated chronological token dispatch",
          "Dedicated priority handling for critical and elderly patients",
          "Multi-counter display sync with live consultation status",
          "Immediate handover to lab and pharmacy dispensaries",
        ],
      },
      {
        heading: "Priority Triage Levels",
        content:
          "Four operational categories: Emergency (immediate bypass to casualty), Vulnerable / Senior (priority acceleration), Scheduled (appointment slot priority), and Standard Walk-in.",
      },
      {
        heading: "Consultation Progression Tracking",
        content:
          "Doctor workspaces directly call the next token, track patient status (Waiting -> Called -> In Consultation -> Completed), and trigger seamless billing or admission orders.",
      },
    ],
    capabilities: [
      {
        status: "IMPLEMENTED",
        label: "Live OPD Queue API & Dispatch Desk",
        description: "Active database-backed queue tracking at /queue and /clinical/opd/encounters.",
      },
      {
        status: "IMPLEMENTED",
        label: "Doctor Room & Counter Assignment",
        description: "Dynamic routing of waiting patients to active doctor consultation cabins.",
      },
      {
        status: "IMPLEMENTED",
        label: "Departmental Triage Categorization",
        description: "Multi-tier priority tagging with emergency status overrides.",
      },
      {
        status: "IN_PROGRESS",
        label: "WebSocket Real-Time Token Board",
        description: "Sub-second digital signage updates for waiting area television displays.",
      },
    ],
    primaryAction: {
      label: "Launch OPD Queue Desk",
      href: "/login?redirect=/queue",
      note: "Requires staff, nurse, or doctor credentials.",
    },
    secondaryAction: {
      label: "Doctor Workspace",
      href: "/login?redirect=/doctor",
    },
  },

  "multi-tenant-engine": {
    id: "multi-tenant-engine",
    title: "Multi-Tenant Engine",
    subtitle: "Enterprise Isolation",
    icon: Building2,
    themeColor: {
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      badgeBg: "bg-emerald-50",
      badgeText: "text-emerald-700",
      badgeBorder: "border-emerald-200",
    },
    summary:
      "Enterprise healthcare multi-tenancy platform providing cryptographically isolated workspaces for private hospital groups and healthcare networks.",
    sections: [
      {
        heading: "Database & Schema Isolation",
        content:
          "Every hospital organization operates inside dedicated tenant scopes. Session requests strictly validate X-Hospital-Ref-Id headers against database stored procedure boundaries, preventing accidental cross-tenant data leaks.",
        bulletPoints: [
          "PostgreSQL schema isolation with strict UUID tenancy keys",
          "Zero cross-facility data leakage for financial and staff metrics",
          "Granular 8-tier role-based access control (RBAC)",
          "Seamless multi-role switching for doctors working across branches",
        ],
      },
      {
        heading: "Granular Role-Based Access Control (RBAC)",
        content:
          "Enforces strictly defined boundaries across Super Admin, Hospital Admin, Doctor, Nurse, Receptionist, Pharmacist, Lab Technician, and Patient portals.",
      },
      {
        heading: "Inter-Hospital Federation with Patient Consent",
        content:
          "When a patient visits a new hospital within the OneHealth ID network, previous clinical summaries are accessible only with patient consent authorization tokens.",
      },
    ],
    capabilities: [
      {
        status: "IMPLEMENTED",
        label: "Strict Database Tenant Isolation",
        description: "Enforced via database views and stored procedures with mandatory tenant verification.",
      },
      {
        status: "IMPLEMENTED",
        label: "Multi-Role Context Switcher",
        description: "Active modal allowing dual-role practitioners to switch branches without relogging.",
      },
      {
        status: "IMPLEMENTED",
        label: "Immutable Administrative Audit Trails",
        description: "Every role modification and context transition is cryptographically logged.",
      },
      {
        status: "IN_PROGRESS",
        label: "Cross-Tenant Federation Gateway",
        description: "Phase 7 network consent exchange architecture for inter-state hospital groups.",
      },
    ],
    primaryAction: {
      label: "Access Hospital Console",
      href: "/login?redirect=/hospital",
      note: "Requires Hospital Administrator or Operations role.",
    },
    secondaryAction: {
      label: "Role Governance",
      href: "/login?redirect=/hospital/users/roles",
    },
  },

  "abdm-gst-ready": {
    id: "abdm-gst-ready",
    title: "ABDM & GST Ready",
    subtitle: "Compliance & Invoicing",
    icon: ShieldCheck,
    themeColor: {
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      badgeBg: "bg-purple-50",
      badgeText: "text-purple-700",
      badgeBorder: "border-purple-200",
    },
    summary:
      "Interoperability framework aligning hospital clinical workflows with Ayushman Bharat Digital Mission (ABDM) standards and statutory GST tax compliance.",
    sections: [
      {
        heading: "Clinical Standards & FHIR R4 Compatibility",
        content:
          "Prescriptions, encounters, and diagnostic orders are modeled after HL7 FHIR Release 4 guidelines, ensuring cross-platform EHR interoperability across Indian healthcare networks.",
        bulletPoints: [
          "FHIR R4 compliant schema models for prescriptions and diagnostics",
          "Automated itemized GST tax calculation (CGST, SGST, IGST)",
          "Integrated instant UPI payment links and QR invoicing",
          "Immutable financial audit trail and cashier shift tracking",
        ],
      },
      {
        heading: "GST-Compliant Invoicing & UPI Settlement",
        content:
          "Generates compliant medical invoices with SAC codes, patient tax categorization, split tax rates, and digital verification signatures for insurance reimbursements.",
      },
      {
        heading: "National Health Authority (ABDM) Alignment",
        content:
          "Architecture incorporates ABHA address linking, consent-based health data exchange (HIP/HIU roles), and secure tokenized transfer protocols.",
      },
    ],
    capabilities: [
      {
        status: "IMPLEMENTED",
        label: "Itemized GST Billing & UPI Counter Settlement",
        description: "Fully active invoicing with tax breakdown at /billing and /hospital/billing.",
      },
      {
        status: "IMPLEMENTED",
        label: "FHIR R4 Structured Clinical Schemas",
        description: "Active digital prescription builder at /doctor/prescriptions/new.",
      },
      {
        status: "IN_PROGRESS",
        label: "ABDM Milestone 1 & 2 Integration Hooks",
        description: "ABHA creation interfaces and health information exchange bridge in staging.",
      },
      {
        status: "PLANNED",
        label: "Direct GSTIN Portal E-Invoice Auto-Filing",
        description: "Automated real-time IRN generation with the National Informatics Centre (NIC).",
      },
    ],
    primaryAction: {
      label: "View Billing & Invoicing",
      href: "/login?redirect=/hospital/billing",
      note: "Requires billing clerk or hospital administrator credentials.",
    },
    secondaryAction: {
      label: "Compliance Overview",
      href: "/login?redirect=/hospital/compliance",
    },
  },
};
