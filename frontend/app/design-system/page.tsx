"use client";

import React, { useState } from "react";
import {
  Palette,
  ShieldCheck,
  Stethoscope,
  Users,
  Activity,
  Calendar,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Info,
  Layers,
  Sparkles,
  HeartPulse,
  Type,
  Maximize2,
  Box,
  Sliders,
  Sun,
  Shield,
  FileText,
  UserCheck,
  UserCog,
  Check,
  ArrowRight,
  Droplet,
  Thermometer,
  Wind
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui/Card";
import {
  RoleType,
  ROLE_THEMES,
  ClinicalPriority,
  ClinicalStatus,
  RoleBadge,
  StatusBadge,
  PatientBanner,
  ClinicalVitalsGrid,
  MetricsWidget,
  QueueTokenCard,
  SearchFilterBar,
  Modal,
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ICONS,
  LAYOUTS,
  RESPONSIVE_RULES
} from "@/components/design-system";

export default function DesignSystemPage() {
  const [activeTab, setActiveTab] = useState<"architecture" | "tokens" | "components" | "primitives">("architecture");
  const [activeRole, setActiveRole] = useState<RoleType>("DOCTOR");
  const [isAbnormalVitals, setIsAbnormalVitals] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  const normalVitals = {
    bloodPressure: "120/80",
    heartRate: 74,
    spo2: 98,
    temperature: 98.6,
    respiratoryRate: 16,
  };

  const criticalVitals = {
    bloodPressure: "165/105", // Severe hypertension
    heartRate: 118,           // Tachycardia
    spo2: 91,                 // Hypoxia
    temperature: 102.4,       // High fever
    respiratoryRate: 28,      // Tachypnea
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-16">
        {/* Header Hero */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-blue-800/50">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>OneHealth OS Unified Design System (OHDS)</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">Single Source of Truth</span>
              </div>
              <h1 className="text-2xl sm:text-3xl 2xl:text-4xl font-extrabold tracking-tight">
                Enterprise Healthcare Design System
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
                Centralized design tokens and reusable clinical components ensuring Public, Patient,
                Doctor, and Hospital Admin screens share an identical, cohesive, accessible, and touch-friendly visual language.
              </p>
            </div>

            {/* Quick Stats Banner */}
            <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-xs text-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white">4 Core Application Scopes</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Box className="w-3.5 h-3.5 text-cyan-300" />
                <span>10 Modular Token Domains</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
                <span>Zero Role Confusion Standard</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/15 overflow-x-auto pb-1">
            {[
              { id: "architecture", label: "Healthcare Scopes & Architecture", icon: Building2 },
              { id: "tokens", label: "Design Tokens & Foundations", icon: Palette },
              { id: "components", label: "Clinical Healthcare Primitives", icon: HeartPulse },
              { id: "primitives", label: "Core UI Components & Controls", icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-white text-slate-900 shadow-md scale-[1.02]"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            TAB 1: HEALTHCARE SCOPES & ARCHITECTURE
           ════════════════════════════════════════════════════════════ */}
        {activeTab === "architecture" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Scope Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Public Scope */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">1. Public Scope</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Citizens, visitors, and patient registration</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs text-slate-600">
                  <div className="font-semibold text-slate-800">Primary Surfaces:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                    <li>Landing Page & About</li>
                    <li>Clinical Services & Specialties</li>
                    <li>Zero-Scroll Login Portal</li>
                    <li>Citizen Registration & Token</li>
                  </ul>
                </div>
                <div className="text-[10px] text-blue-700 bg-blue-50 p-2 rounded-xl border border-blue-200 font-medium">
                  Rule: Universal single-login portal with zero client role trust.
                </div>
              </div>

              {/* 2. Patient Scope */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">2. Patient Scope</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Citizen portal & medical timeline</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs text-slate-600">
                  <div className="font-semibold text-slate-800">Primary Surfaces:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                    <li>Digital OneHealth ID Card</li>
                    <li>Booked OPD Appointments</li>
                    <li>Active & Past Prescriptions</li>
                    <li>Diagnostic Lab Reports & Bills</li>
                  </ul>
                </div>
                <div className="text-[10px] text-purple-700 bg-purple-50 p-2 rounded-xl border border-purple-200 font-medium">
                  Rule: Mobile-first touch ergonomics (min 44px) & QR sharing.
                </div>
              </div>

              {/* 3. Doctor Scope */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">3. Doctor Scope</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Clinician consultation & diagnosis</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs text-slate-600">
                  <div className="font-semibold text-slate-800">Primary Surfaces:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                    <li>Personal Live OPD Queue</li>
                    <li>Consultation Split-Pane</li>
                    <li>Rx Drug Builder & Dosage</li>
                    <li>Diagnostic Investigations</li>
                  </ul>
                </div>
                <div className="text-[10px] text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200 font-medium">
                  Rule: Strict single-doctor identity. No mixing other doctors.
                </div>
              </div>

              {/* 4. Hospital Admin Scope */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">4. Hospital Admin</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Executive operations & multi-branch</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs text-slate-600">
                  <div className="font-semibold text-slate-800">Primary Surfaces:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                    <li>Facility Operations Dashboard</li>
                    <li>Doctor & Nurse Rostering</li>
                    <li>Patient Master Index (PMI)</li>
                    <li>RBAC Matrix & Audit Logs</li>
                  </ul>
                </div>
                <div className="text-[10px] text-sky-700 bg-sky-50 p-2 rounded-xl border border-sky-200 font-medium">
                  Rule: Real-time census telemetry & branch context switching.
                </div>
              </div>
            </div>

            {/* Directive Callout */}
            <div className="p-5 rounded-3xl bg-blue-50 border border-blue-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-slate-900 text-sm">
                    Design System Single Source of Truth Directive
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                  Every new page and component must import design tokens directly from <code>@/design-system</code>.
                  Hardcoded hex colors, ad-hoc font sizes, and custom border radiuses are prohibited to prevent visual fragmentation.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => setActiveTab("tokens")}
                className="gap-2 text-xs shrink-0 font-semibold"
              >
                <span>Explore Tokens</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 2: DESIGN TOKENS
           ════════════════════════════════════════════════════════════ */}
        {activeTab === "tokens" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Color Swatches */}
            <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-blue-600" />
                  <span>Clinical Color System</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scientifically calibrated medical color tokens ensuring immediate diagnostic clarity and contrast safety.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { name: "Primary Clinical Blue", bg: "bg-blue-600", text: "text-white", token: "COLORS.primary[600]", role: "Main brand actions & active states" },
                  { name: "Diagnostic Accent Cyan", bg: "bg-cyan-500", text: "text-white", token: "COLORS.accent[500]", role: "QR scan, telemetry & live badges" },
                  { name: "Clinical Success Sage", bg: "bg-emerald-600", text: "text-white", token: "COLORS.success[600]", role: "Normal vitals, settled bills, verified" },
                  { name: "Urgent Warning Amber", bg: "bg-amber-500", text: "text-slate-950", token: "COLORS.warning[500]", role: "Waiting queue, pending lab, urgent" },
                  { name: "Emergency Fast-Track", bg: "bg-rose-600", text: "text-white", token: "COLORS.danger[600]", role: "Critical alerts, abnormal vitals, ER" },
                  { name: "Clinical Slate Neutral", bg: "bg-slate-900", text: "text-white", token: "COLORS.neutral[900]", role: "Primary typography & deep elevation" },
                ].map((c) => (
                  <div key={c.name} className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className={`${c.bg} ${c.text} h-14 rounded-xl flex items-center justify-center font-bold text-xs shadow-inner`}>
                      {c.name.split(" ")[0]}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{c.name}</div>
                      <code className="text-[10px] text-blue-600 font-mono block mt-0.5">{c.token}</code>
                      <p className="text-[10px] text-slate-500 mt-1 leading-tight">{c.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Typography Scale */}
            <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Type className="w-5 h-5 text-indigo-600" />
                  <span>Typography Scale & Font Weights</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-legibility sans-serif scale with monospace tokens for OneHealth IDs, prescriptions, and dosages.
                </p>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/30 text-xs">
                {[
                  { level: "Display (40px/48px)", className: "text-2xl sm:text-3xl font-black text-slate-900", sample: "Universal Hospital OS", token: "TYPOGRAPHY.scale.display" },
                  { level: "Heading 1 (30px/36px)", className: "text-xl sm:text-2xl font-extrabold text-slate-900", sample: "Outpatient Consultation Room", token: "TYPOGRAPHY.scale.h1" },
                  { level: "Heading 2 (24px/32px)", className: "text-lg sm:text-xl font-bold text-slate-900", sample: "Clinical Vitals Telemetry", token: "TYPOGRAPHY.scale.h2" },
                  { level: "Heading 3 (20px/28px)", className: "text-base font-bold text-slate-900", sample: "Assigned Specialist Roster", token: "TYPOGRAPHY.scale.h3" },
                  { level: "Body Text (14px/20px)", className: "text-sm text-slate-700", sample: "Patient presents with acute chest discomfort radiating to left arm.", token: "TYPOGRAPHY.scale.body" },
                  { level: "Body Small (12px/16px)", className: "text-xs text-slate-500", sample: "Scheduled follow-up on 08-Oct-2026 at Mugalivakkam Main Branch", token: "TYPOGRAPHY.scale.bodySmall" },
                  { level: "Identifier / Monospace", className: "font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block", sample: "OHID-KEDAR-2026-09142A", token: "TYPOGRAPHY.scale.identifier" },
                ].map((t) => (
                  <div key={t.level} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="w-48 shrink-0">
                      <span className="font-semibold text-slate-800 block">{t.level}</span>
                      <code className="text-[10px] text-slate-400 font-mono">{t.token}</code>
                    </div>
                    <div className={`flex-1 ${t.className}`}>{t.sample}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Corner Radius & Shadows */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Box className="w-5 h-5 text-emerald-600" />
                  <span>Corner Radius Scale</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="font-bold text-slate-800">rounded-xl (12px)</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Buttons, Inputs & Dropdowns</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                    <span className="font-bold text-slate-800">rounded-2xl (16px)</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Badges & Toolbar containers</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-3xl text-center">
                    <span className="font-bold text-slate-800">rounded-3xl (24px)</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Standard Cards & Modals</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-full text-center">
                    <span className="font-bold text-slate-800">rounded-full</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Status Pills & Avatars</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sun className="w-5 h-5 text-amber-500" />
                  <span>Elevation & Diagnostic Glows</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
                    <span className="font-bold text-slate-800">shadow-sm</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Resting content cards</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-md text-center">
                    <span className="font-bold text-slate-800">shadow-md</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Hover & interactive focus</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-blue-500/15 text-center">
                    <span className="font-bold text-blue-700">Diagnostic Blue Glow</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Active consultation room</span>
                  </div>
                  <div className="p-3 bg-white border border-rose-200 rounded-2xl shadow-xl shadow-rose-500/15 text-center">
                    <span className="font-bold text-rose-700">Emergency Alert Glow</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Abnormal vitals flag</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 3: CLINICAL HEALTHCARE PRIMITIVES
           ════════════════════════════════════════════════════════════ */}
        {activeTab === "components" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Universal Patient Banner */}
            <section className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-rose-500" />
                    <span>Universal Clinical Patient Banner</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Shared identically across Doctor OPD, Nurse Triage, IPD Beds, and Billing screens to eliminate cognitive friction.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Sample Priority:</span>
                  {(["NORMAL", "URGENT", "EMERGENCY"] as ClinicalPriority[]).map((p) => (
                    <StatusBadge key={p} priority={p} />
                  ))}
                </div>
              </div>

              <PatientBanner
                id="sample-patient-01"
                name="Rajesh Sundaram"
                onehealthId="OHID-IND-2026-08821"
                age={42}
                gender="Male"
                phone="9840192837"
                bloodGroup="B+"
                priority="EMERGENCY"
                activeToken={14}
                roomNumber="ICU-Bed-04"
                allergies={["Penicillin (Anaphylaxis)", "Sulfa Drugs"]}
                primaryDiagnosis="Acute Coronary Syndrome — Scheduled for Emergency Angiogram"
                onOpenQR={() => setModalOpen(true)}
              />
            </section>

            {/* Vitals Grid with Live Alert Toggle */}
            <section className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    <span>Clinical Vitals Telemetry Grid</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Evaluates patient vitals against medical reference thresholds and automatically renders pulsing alert states.
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-white p-1.5 px-3 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-semibold text-slate-600">
                    Simulate Telemetry:
                  </span>
                  <button
                    onClick={() => setIsAbnormalVitals(!isAbnormalVitals)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
                      isAbnormalVitals
                        ? "bg-rose-600 text-white shadow-sm"
                        : "bg-emerald-600 text-white shadow-sm"
                    }`}
                  >
                    {isAbnormalVitals ? "⚠️ Critical Out-of-Range Active" : "✓ Normal Healthy Baseline"}
                  </button>
                </div>
              </div>

              <ClinicalVitalsGrid vitals={isAbnormalVitals ? criticalVitals : normalVitals} />
            </section>

            {/* Live OPD Queue Token Cards */}
            <section className="space-y-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  <span>OPD Queue Token Cards</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Standardized cards for live tokens across Waiting, Calling, and Active Consultation states with direct triage triggers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <QueueTokenCard
                  queueId="q-01"
                  tokenNumber="08"
                  patientId="p-01"
                  patientName="Ananya Natarajan"
                  onehealthId="OHID-IND-2026-04912"
                  doctorName="Senthil Nathan"
                  departmentName="Cardiology"
                  status="WAITING"
                  priority="NORMAL"
                  estimatedWaitMinutes={15}
                  onCallNext={() => alert("Action: CALL_NEXT executed")}
                />

                <QueueTokenCard
                  queueId="q-02"
                  tokenNumber="09"
                  patientId="p-02"
                  patientName="Vikramaditya Roy"
                  onehealthId="OHID-IND-2026-07743"
                  doctorName="Priya Balaji"
                  departmentName="Neurology"
                  status="CALLING"
                  priority="URGENT"
                  estimatedWaitMinutes={0}
                  onStartConsult={() => alert("Action: START_CONSULT executed")}
                />

                <QueueTokenCard
                  queueId="q-03"
                  tokenNumber="10"
                  patientId="p-03"
                  patientName="Kavitha Subramaniam"
                  onehealthId="OHID-IND-2026-01044"
                  doctorName="Arun Kumar"
                  departmentName="Orthopedics"
                  status="IN_CONSULTATION"
                  priority="EMERGENCY"
                  onComplete={() => alert("Action: COMPLETE executed")}
                />
              </div>
            </section>

            {/* Standard KPI Widgets */}
            <section className="space-y-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-sky-500" />
                  <span>Executive & Clinical KPI Metrics Widgets</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Telemetry metrics cards supporting trend deltas and persona-specific accent borders.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricsWidget
                  title="Daily Patient Footfall"
                  value="1,482"
                  subtitle="Registered across OPD & Emergency"
                  icon={Users}
                  roleAccent="HOSPITAL_ADMIN"
                  delta={{ value: "+12.4%", trend: "up", label: "vs yesterday" }}
                />
                <MetricsWidget
                  title="Average Wait Time"
                  value="14.2 min"
                  subtitle="OPD queue registration to consult"
                  icon={Activity}
                  roleAccent="NURSE_STAFF"
                  delta={{ value: "-3.8 min", trend: "up", label: "improved" }}
                />
                <MetricsWidget
                  title="IPD Bed Occupancy"
                  value="84.6%"
                  subtitle="148 / 175 total capacity beds"
                  icon={Building2}
                  roleAccent="DOCTOR"
                  delta={{ value: "+2.1%", trend: "down", label: "high load" }}
                />
                <MetricsWidget
                  title="Collected Revenue"
                  value="₹3,42,850"
                  subtitle="GST & UPI settled consultations"
                  icon={CreditCard}
                  roleAccent="SUPER_ADMIN"
                  delta={{ value: "+18.2%", trend: "up", label: "this week" }}
                />
              </div>
            </section>

            {/* Universal Search & Filter Toolbar */}
            <section className="space-y-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-purple-500" />
                  <span>Universal Search & Filter Toolbar</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Interactive filter bar with live search input, filter chips, counts, and action buttons.
                </p>
              </div>

              <SearchFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                placeholder="Search patients by name, OneHealth ID, phone, or diagnosis..."
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                filterOptions={[
                  { id: "ALL", label: "All Records", count: 148 },
                  { id: "EMERGENCY", label: "Emergency", count: 6 },
                  { id: "URGENT", label: "Urgent", count: 18 },
                  { id: "ROUTINE", label: "Routine", count: 124 },
                ]}
                rightAction={
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setModalOpen(true)}
                    className="gap-2 text-xs font-semibold"
                  >
                    <span>Demo Clinical Modal</span>
                  </Button>
                }
              />
            </section>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 4: CORE UI CONTROLS & PRIMITIVES
           ════════════════════════════════════════════════════════════ */}
        {activeTab === "primitives" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Buttons Showcase */}
            <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Button Primitives & Touch Targets</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standardized heights (min 40px desktop, min 44px mobile) with clinical contrast states.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="md">Primary Action</Button>
                <Button variant="secondary" size="md">Secondary Action</Button>
                <Button variant="outline" size="md">Outline Action</Button>
                <Button variant="danger" size="md">Danger / Terminate</Button>
                <Button variant="success" size="md">Success / Verify</Button>
                <Button variant="ghost" size="md">Ghost Button</Button>
                <Button variant="primary" size="md" disabled>Disabled State</Button>
              </div>
            </section>

            {/* Badges & Clinical Indicators */}
            <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Semantic Badges & Indicators</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Multi-tenant personas, triage priorities, and payment status indicators.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 w-28">Role Personas:</span>
                  {(["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE_STAFF", "PATIENT"] as RoleType[]).map((r) => (
                    <RoleBadge key={r} role={r} showIcon={true} />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 w-28">Triage Priority:</span>
                  {(["NORMAL", "URGENT", "EMERGENCY"] as ClinicalPriority[]).map((p) => (
                    <StatusBadge key={p} priority={p} />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 w-28">Billing Status:</span>
                  {(["PAID", "PARTIAL", "PENDING"] as ClinicalStatus[]).map((s) => (
                    <StatusBadge key={s} status={s} />
                  ))}
                </div>
              </div>
            </section>

            {/* Input & Form Control Standards */}
            <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Form Controls & Input States</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consistent 42px height, slate borders, and high-visibility focus rings.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Standard Text Input
                  </label>
                  <input
                    type="text"
                    defaultValue="Dr. Senthil Nathan"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[42px]"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Default resting state</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Focused / Active Input
                  </label>
                  <input
                    type="text"
                    defaultValue="OHID-KEDAR-2026-07235E"
                    className="w-full px-3.5 py-2 bg-white border border-blue-600 ring-2 ring-blue-500/20 rounded-xl text-xs text-slate-900 focus:outline-none min-h-[42px] font-mono"
                  />
                  <span className="text-[11px] text-blue-600 mt-1 block font-medium">Active focus glow</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invalid / Validation Error
                  </label>
                  <input
                    type="text"
                    defaultValue="9840"
                    className="w-full px-3.5 py-2 bg-rose-50/40 border border-rose-400 rounded-xl text-xs text-rose-900 focus:outline-none ring-2 ring-rose-500/20 min-h-[42px]"
                  />
                  <span className="text-[11px] text-rose-600 mt-1 block font-medium">Please enter a valid 10-digit number</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Demo Modal Dialog */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Zero-Knowledge QR Token Verification"
          subtitle="OneHealth Identity cryptographic handshake (M1 ABDM Standard)"
          icon={<ShieldCheck className="w-5 h-5 text-blue-600" />}
          footer={
            <>
              <Button
                variant="outline"
                size="md"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  alert("Identity Verified: Rajesh Sundaram (OHID-IND-2026-08821)");
                  setModalOpen(false);
                }}
                className="text-xs font-semibold"
              >
                Confirm Verification
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-xs text-slate-600">
            <p>
              This dialog demonstrates the accessible <strong>Modal</strong> component. It traps focus,
              listens to the <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border">Esc</kbd> key,
              and prevents background scrolling.
            </p>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Encrypted QR Payload
              </span>
              <code className="text-blue-600 font-mono text-xs break-all block">
                QR-OHID-2026-08821-zkp99182a7f019c
              </code>
            </div>
            <div className="flex items-center gap-2 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Zero medical records leaked in payload; identity resolved securely via backend stored procedure.</span>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
