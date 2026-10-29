"use client";

import React, { useState } from "react";
import {
  QrCode,
  Clock,
  Stethoscope,
  FileCheck2,
  Database,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ChevronRight,
  Sparkles,
  Activity,
  Layers,
  FileText,
  UserCheck
} from "lucide-react";

interface JourneyStage {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badge: string;
  badgeColor: string;
  color: string;
  bgLight: string;
  borderColor: string;
  summary: string;
  cardPreview: {
    heading: string;
    subheading: string;
    metadata: { label: string; value: string; isPill?: boolean }[];
    highlightText: string;
    verifiedTag: string;
  };
}

const JOURNEY_STAGES: JourneyStage[] = [
  {
    id: "identity",
    step: "01",
    title: "Patient Identity",
    subtitle: "OneHealth ID & QR",
    icon: QrCode,
    badge: "ZK-QR Enabled",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    color: "text-blue-600",
    bgLight: "bg-blue-50/80",
    borderColor: "border-blue-200",
    summary: "Instant check-in with persistent OneHealth ID and zero-knowledge QR verification.",
    cardPreview: {
      heading: "OH-2026-CHE-7712",
      subheading: "Ananya Sharma • 29 Yrs • Female",
      metadata: [
        { label: "Blood Group", value: "B+ Positive", isPill: true },
        { label: "Verification", value: "ZK-QR Verified", isPill: true },
        { label: "Emergency Contact", value: "+91 98409 ••••" },
        { label: "Identity Type", value: "National Health ID" }
      ],
      highlightText: "Zero-Knowledge QR masks clinical diagnosis while verifying patient identity at reception.",
      verifiedTag: "Tamper-Evident Token"
    }
  },
  {
    id: "reception",
    step: "02",
    title: "Reception & OPD Queue",
    subtitle: "Token & Counter Flow",
    icon: Clock,
    badge: "Live Queue",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    color: "text-amber-600",
    bgLight: "bg-amber-50/80",
    borderColor: "border-amber-200",
    summary: "Automated counter assignment, sequential tokens, and wait-time coordination.",
    cardPreview: {
      heading: "Queue Token: A-014",
      subheading: "General OPD Counter 02 • Desk Assigned",
      metadata: [
        { label: "Triage Status", value: "Called to Consultation", isPill: true },
        { label: "Est. Wait Time", value: "< 6 mins" },
        { label: "Assigned Counter", value: "Counter 2 (Room 104)" },
        { label: "Department", value: "Internal Medicine" }
      ],
      highlightText: "Live token display synchronizes reception desk, nursing stations, and doctor cabins.",
      verifiedTag: "Real-Time OPD Sync"
    }
  },
  {
    id: "consultation",
    step: "03",
    title: "Doctor Consultation",
    subtitle: "Clinical Station",
    icon: Stethoscope,
    badge: "ICD-10 Coded",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    color: "text-indigo-600",
    bgLight: "bg-indigo-50/80",
    borderColor: "border-indigo-200",
    summary: "Longitudinal clinical timelines, vital signs tracking, and mandatory ICD-10 diagnosis.",
    cardPreview: {
      heading: "Dr. K. Senthil Nathan, MD",
      subheading: "Reg No: TN-MC-2018-8821 • Internal Medicine",
      metadata: [
        { label: "Diagnosis Code", value: "ICD-10 J06.9 (URTI)", isPill: true },
        { label: "Blood Pressure", value: "118/76 mmHg" },
        { label: "Pulse / SpO2", value: "74 bpm • 99%" },
        { label: "Clinical Encounter", value: "ENC-2026-9921" }
      ],
      highlightText: "Structured clinical encounter enforces diagnosis coding and longitudinal health recording.",
      verifiedTag: "Authorized Clinician"
    }
  },
  {
    id: "prescription",
    step: "04",
    title: "Digital Prescription",
    subtitle: "Cryptographic Signing",
    icon: FileCheck2,
    badge: "SHA-256 Signed",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    color: "text-emerald-600",
    bgLight: "bg-emerald-50/80",
    borderColor: "border-emerald-200",
    summary: "Cryptographically signed e-prescriptions with dosage schedules and tamper-evident QR.",
    cardPreview: {
      heading: "Rx: RX-2026-F78996",
      subheading: "Issued by City Healthcare Centre • Validated Schedule",
      metadata: [
        { label: "Digital Seal", value: "SHA-256 Cryptographic Hash", isPill: true },
        { label: "Medication 1", value: "Paracetamol 650 mg (1-0-1)" },
        { label: "Medication 2", value: "Azithromycin 500 mg (1-0-0)" },
        { label: "Validity", value: "5 Days • With Meals" }
      ],
      highlightText: "Cryptographic SHA-256 seal guarantees prescription integrity and prevents tampering.",
      verifiedTag: "Digitally Sealed"
    }
  },
  {
    id: "records",
    step: "05",
    title: "Health Records Locker",
    subtitle: "Consented Records",
    icon: Database,
    badge: "Patient-Owned",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    color: "text-purple-600",
    bgLight: "bg-purple-50/80",
    borderColor: "border-purple-200",
    summary: "Diagnostic lab reports, consultation summaries, and patient-consented sharing.",
    cardPreview: {
      heading: "Consolidated Health Locker",
      subheading: "HL7 FHIR R4 Standard • Portable Digital Records",
      metadata: [
        { label: "Access Policy", value: "Consented Access Only", isPill: true },
        { label: "Lab Diagnostic", value: "CBC & Metabolic Panel (Approved)" },
        { label: "Schema Isolation", value: "Multi-Tenant PostgreSQL" },
        { label: "Audit Logging", value: "Immutable Access Trail" }
      ],
      highlightText: "Patients retain full control over medical record sharing with authorized healthcare facilities.",
      verifiedTag: "Patient Consented"
    }
  }
];

export function ConnectedPatientJourneyVisual() {
  const [activeStageId, setActiveStageId] = useState<string>("identity");

  const currentStage = JOURNEY_STAGES.find((s) => s.id === activeStageId) || JOURNEY_STAGES[0];
  const IconComponent = currentStage.icon;

  return (
    <section
      id="journey"
      aria-label="Connected Healthcare Journey Architecture"
      className="w-full max-w-[min(94vw,1600px)] mx-auto my-10 sm:my-16 p-4 sm:p-6 lg:p-8 xl:p-10 rounded-3xl bg-slate-50/70 border border-slate-200/80 shadow-xs relative overflow-hidden transition-all text-left"
    >
      {/* Decorative background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-60" />

      {/* Visual Header */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200/70">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
            <span>INTEROPERABLE PATIENT WORKFLOW BUS</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Click any journey stage to inspect connected clinical transactions, security boundaries, and demonstration data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-600 shrink-0">
          <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Demonstration Clinical Data</span>
          </span>
        </div>
      </div>

      {/* Flow Steps Navigation Bar */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 lg:gap-4 mb-6">
        {JOURNEY_STAGES.map((stage) => {
          const StageIcon = stage.icon;
          const isActive = stage.id === activeStageId;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setActiveStageId(stage.id)}
              className={`p-3 sm:p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between min-h-[92px] sm:min-h-[100px] focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                isActive
                  ? "bg-white border-blue-500 shadow-sm ring-1 ring-blue-500/20"
                  : "bg-white/80 hover:bg-white border-slate-200/80 hover:border-slate-300 text-slate-700"
              }`}
              aria-pressed={isActive}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  isActive ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"
                }`}>
                  STEP {stage.step}
                </span>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive ? stage.bgLight + " " + stage.color : "bg-slate-100 text-slate-500"
                }`}>
                  <StageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                {stage.title}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 truncate">
                {stage.subtitle}
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Active Stage Showcase Card */}
      <div className="relative z-10 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Stage Overview & Description */}
          <div className="lg:col-span-5 space-y-3.5">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${currentStage.badgeColor}`}>
                {currentStage.badge}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Phase {currentStage.step} of 05
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-slate-950 flex items-center gap-2.5">
              <span className={`p-2 rounded-xl ${currentStage.bgLight} ${currentStage.color}`}>
                <IconComponent className="w-5 h-5" />
              </span>
              <span>{currentStage.title}</span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {currentStage.summary}
            </p>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
              <p className="font-medium flex items-center gap-1.5 text-blue-900 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Workflow Integrity</span>
              </p>
              <p className="text-[11px] text-slate-600 leading-normal">
                {currentStage.cardPreview.highlightText}
              </p>
            </div>
          </div>

          {/* Interactive Live Product Preview Mockup */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-slate-200 bg-slate-900 text-white p-4 sm:p-5 shadow-md relative overflow-hidden">
              {/* Terminal / Interface Top Bar */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 ml-2">
                    OH-ID Workflow Console • {currentStage.title}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>{currentStage.cardPreview.verifiedTag}</span>
                </span>
              </div>

              {/* Card Body */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="text-sm sm:text-base font-bold text-white font-mono">
                    {currentStage.cardPreview.heading}
                  </div>
                  <div className="text-xs text-slate-400">
                    {currentStage.cardPreview.subheading}
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {currentStage.cardPreview.metadata.map((meta, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-400 text-[11px]">{meta.label}</span>
                      <span className={`font-medium ${
                        meta.isPill
                          ? "px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono"
                          : "text-slate-200 text-xs font-mono"
                      }`}>
                        {meta.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bottom Verification Seal */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Schema Isolated PostgreSQL • HL7 FHIR R4</span>
                  </div>
                  <span className="text-slate-500 font-mono text-[10px]">
                    Enterprise Pilot Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
