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
  HeartPulse
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
  Modal
} from "@/components/design-system";

export default function DesignSystemPage() {
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
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-blue-800/50">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>OHID Design System (OHDS) v1.0</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">Accessible & Responsive</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Healthcare Design System & UI Patterns
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                A single unified component library ensuring Admin, Hospital Executive, Doctor,
                Staff, and Patient screens share an identical visual language, clinical safety scales,
                and touch-friendly UX.
              </p>
            </div>

            {/* Role Context Quick Switcher */}
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex flex-col gap-1.5 shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                Preview Role Context
              </span>
              <div className="flex flex-wrap gap-1">
                {(["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE_STAFF", "PATIENT"] as RoleType[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setActiveRole(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                      activeRole === r
                        ? "bg-white text-slate-900 shadow-md"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {r === "SUPER_ADMIN" ? "Admin" : r === "HOSPITAL_ADMIN" ? "Hospital" : r === "DOCTOR" ? "Doctor" : r === "NURSE_STAFF" ? "Staff" : "Patient"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Role Themes & Personas */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900  flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <span>1. Multi-Tenant Role Personas & Visual Accents</span>
              </h2>
              <p className="text-xs text-slate-500">
                Each persona has a curated semantic accent preventing role confusion while adhering to the core design system.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {(Object.keys(ROLE_THEMES) as RoleType[]).map((roleKey) => {
              const theme = ROLE_THEMES[roleKey];
              const isSelected = activeRole === roleKey;
              return (
                <div
                  key={roleKey}
                  onClick={() => setActiveRole(roleKey)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-blue-500 bg-white  shadow-md"
                      : "bg-white  border-slate-200  hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <RoleBadge role={roleKey} showIcon={true} />
                    {isSelected && (
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500  mt-2 line-clamp-2">
                    {roleKey === "SUPER_ADMIN" && "Security audit trails, HIPAA & ABDM compliance, tenant isolation."}
                    {roleKey === "HOSPITAL_ADMIN" && "Hospital capacity, bed occupancy, revenue ops, and doctor rosters."}
                    {roleKey === "DOCTOR" && "Outpatient clinical notes, diagnostics, and e-prescriptions."}
                    {roleKey === "NURSE_STAFF" && "Patient intake, Zero-Knowledge QR scan, triage, and live queue."}
                    {roleKey === "PATIENT" && "Digital OneHealth ID card, appointments, and bill receipts."}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Universal Patient Banner */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900  flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-500" />
                <span>2. Universal Clinical Patient Banner</span>
              </h2>
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

        {/* Section 3: Clinical Vitals Telemetry with Out-of-Range Flagging */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900  flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                <span>3. Clinical Vitals Telemetry Grid</span>
              </h2>
              <p className="text-xs text-slate-500">
                Evaluates patient vitals against medical reference thresholds and automatically renders pulsing alert states.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white  p-1.5 px-3 rounded-2xl border border-slate-200 ">
              <span className="text-xs font-semibold text-slate-600 ">
                Simulate Vitals State:
              </span>
              <button
                onClick={() => setIsAbnormalVitals(!isAbnormalVitals)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all min-h-[36px] ${
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

        {/* Section 4: Live OPD Queue Token Cards */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900  flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              <span>4. OPD Queue Token Orchestration Primitives</span>
            </h2>
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
              onCallNext={() => alert("Action: CALL_NEXT executed via sp_manage_queue")}
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
              onStartConsult={() => alert("Action: START_CONSULT executed via sp_manage_queue")}
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
              onComplete={() => alert("Action: COMPLETE executed via sp_manage_queue")}
            />
          </div>
        </section>

        {/* Section 5: Standardized KPI Metrics Widgets */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900  flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-500" />
              <span>5. Standardized KPI Metric Widgets</span>
            </h2>
            <p className="text-xs text-slate-500">
              High-visibility clinical and financial telemetry cards supporting trend indicators and role-specific accents.
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

        {/* Section 6: Unified Search & Filter Toolbar */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900  flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-500" />
              <span>6. Universal Search & Filter Toolbar</span>
            </h2>
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

        {/* Demo Modal Dialog */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Zero-Knowledge QR Token Verification"
          subtitle="OneHealth Identity cryptographic handshake (M1 ABDM Standard)"
          icon={<ShieldCheck className="w-5 h-5" />}
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
          <div className="space-y-4 text-xs text-slate-600 ">
            <p>
              This dialog demonstrates the accessible <strong>Modal</strong> component. It traps focus,
              listens to the <kbd className="px-1.5 py-0.5 bg-slate-100  rounded border">Esc</kbd> key,
              and prevents background scrolling.
            </p>
            <div className="p-4 bg-slate-50  rounded-2xl border border-slate-200 ">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Encrypted QR Payload
              </span>
              <code className="text-blue-600  font-mono text-xs break-all block">
                QR-OHID-2026-08821-zkp99182a7f019c
              </code>
            </div>
            <div className="flex items-center gap-2 text-emerald-600  font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Zero medical records leaked in payload; identity resolved securely via backend stored procedure.</span>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
