"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  QrCode,
  Building2,
  ArrowRight,
  HeartPulse,
  Stethoscope,
  Clock,
  Users,
  User,
  LayoutDashboard,
  CheckCircle2,
  Activity,
  Layers,
  ChevronRight,
  Lock,
  FileCheck2,
  Sparkles,
  Info
} from "lucide-react";
import { api } from "@/lib/api";
import { ConnectedPatientJourneyVisual } from "@/components/landing/ConnectedPatientJourneyVisual";
import { HealthcareNetworkVisual } from "@/components/landing/HealthcareNetworkVisual";
import { FeatureDetailModal } from "@/components/landing/FeatureDetailModal";
import { FEATURE_DETAILS } from "@/components/landing/featureData";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const cardTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const user = api.auth.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const openFeatureModal = (featureId: string) => {
    setSelectedFeatureId(featureId);
  };

  const closeFeatureModal = () => {
    setSelectedFeatureId(null);
  };

  const selectedFeature = selectedFeatureId ? FEATURE_DETAILS[selectedFeatureId] : null;

  // Resolve target routes based on authentication state
  const patientLoginHref = currentUser ? "/patient" : "/login?redirect=/patient";
  const hospitalConsoleHref = currentUser ? "/hospital" : "/login?redirect=/hospital";
  const directDashboardHref = currentUser ? "/dashboard" : "/login?redirect=/dashboard";

  return (
    <div className="min-h-screen min-h-svh bg-white text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200/80 backdrop-blur-md bg-white/95 sticky top-0 z-40">
        <div className="w-full max-w-[min(96vw,1920px)] mx-auto px-4 sm:px-6 xl:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group focus:outline-hidden focus:ring-2 focus:ring-blue-500 rounded-xl p-1">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1 shrink-0 overflow-hidden group-hover:border-blue-300 transition-colors">
              <Image
                src="/images/oh-id-logo.png"
                alt="One Health ID"
                width={36}
                height={36}
                priority
                className="object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-slate-950">
                  ONEHEALTH ID
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate max-w-[190px] sm:max-w-none block">
                Unified Healthcare Network • Powered by Sathus Technology Pvt Ltd
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 hidden md:inline">
                  Signed in as <strong className="text-slate-900">{currentUser.name || currentUser.username}</strong>
                </span>
                <Link
                  href="/dashboard"
                  className="text-xs font-semibold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs flex items-center gap-1.5 min-h-[40px] focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Open Console</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/register"
                  className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-blue-400 transition-all min-h-[40px] flex items-center gap-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                >
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Register</span>
                </Link>
                <Link
                  href="/login"
                  className="text-xs font-semibold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm shadow-blue-600/25 min-h-[40px] flex items-center gap-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <span>Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative w-full max-w-[min(96vw,1920px)] mx-auto px-4 sm:px-6 xl:px-10 py-10 sm:py-16 lg:py-20 flex-1 flex flex-col items-center justify-center text-center">
        {/* Subtle decorative background accent */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none overflow-hidden">
          <div className="w-[clamp(300px,50vw,800px)] h-[clamp(180px,30vw,480px)] bg-blue-100/40 rounded-full blur-3xl opacity-70 transform -translate-y-10" />
        </div>

        {/* Hero Section */}
        <section aria-labelledby="hero-title" className="w-full flex flex-col items-center">
          {/* Release Badge */}
          <div className="animate-hero-fade inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs sm:text-sm font-medium mb-6 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Universal Digital Healthcare Identity &amp; Multi-Hospital Platform</span>
          </div>

          {/* Headline */}
          <h1
            id="hero-title"
            className="animate-hero-delay-1 font-extrabold tracking-tight text-slate-950 leading-tight sm:leading-none max-w-[min(92vw,72rem)]"
            style={{ fontSize: "clamp(1.75rem, 4.5vw, 4rem)" }}
          >
            One Digital Health Identity.{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 bg-clip-text text-transparent">
              A Connected Healthcare Journey.
            </span>
          </h1>

          {/* Supporting Text */}
          <p
            className="animate-hero-delay-2 mt-6 text-slate-600 font-normal leading-relaxed max-w-[min(92vw,42rem)]"
            style={{ fontSize: "clamp(0.875rem, 1.5vw, 1.125rem)" }}
          >
            Connect patient identity, hospital workflows, appointments, consultations, prescriptions, and authorized health records through an enterprise healthcare platform.
          </p>

          {/* Primary CTA Buttons */}
          <div className="animate-hero-delay-3 mt-8 sm:mt-10 flex flex-col sm:flex-row items-center gap-3 sm:gap-3.5 w-full sm:w-auto">
            {/* CTA 1: Register for OH-ID */}
            <Link
              href="/register"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold text-sm shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2.5 min-h-[48px] focus:outline-hidden focus:ring-4 focus:ring-blue-500/25 active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-white/90" />
              <span>Register for OH-ID</span>
              <ArrowRight className="w-4 h-4 text-white/90 transition-transform group-hover:translate-x-0.5" />
            </Link>

            {/* CTA 2: Patient Login */}
            <Link
              href={patientLoginHref}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 font-semibold text-sm shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2.5 min-h-[48px] focus:outline-hidden focus:ring-4 focus:ring-slate-200 active:scale-[0.98]"
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span>Patient Login</span>
              {!currentUser && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  Portal
                </span>
              )}
            </Link>

            {/* CTA 3: Launch Hospital Console */}
            <Link
              href={hospitalConsoleHref}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 font-medium text-xs transition-all flex items-center justify-center gap-2 min-h-[48px] focus:outline-hidden focus:ring-4 focus:ring-slate-200"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Hospital Console</span>
            </Link>
          </div>
        </section>

        {/* Polished Connected Patient Journey Visual */}
        <ConnectedPatientJourneyVisual />

        {/* Visual Healthcare Network Illustration */}
        <HealthcareNetworkVisual />

        {/* 4 Interactive Feature Cards */}
        <section aria-labelledby="features-title" className="w-full max-w-[min(94vw,1540px)] mt-6 sm:mt-10">
          <div className="flex items-center justify-between mb-4 px-1 text-left">
            <div>
              <h2 id="features-title" className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
                Core Architectural Capabilities
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Click any capability card to inspect technical workflows, encryption boundaries, and implementation status.
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
              Interactive Specification
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-left">
            {/* Card 1 — Zero-Knowledge QR */}
            <button
              ref={(el) => { cardTriggerRefs.current["zero-knowledge-qr"] = el; }}
              type="button"
              onClick={() => openFeatureModal("zero-knowledge-qr")}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 shadow-2xs hover:shadow-md transition-all text-left group flex flex-col justify-between focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              aria-haspopup="dialog"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Zero-Knowledge QR
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-normal">
                  Support privacy-conscious patient identification and verification without unnecessarily exposing sensitive medical information.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-blue-600 group-hover:text-blue-700">
                <span>Learn more & architecture</span>
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>

            {/* Card 2 — Live OPD Queue */}
            <button
              ref={(el) => { cardTriggerRefs.current["live-opd-queue"] = el; }}
              type="button"
              onClick={() => openFeatureModal("live-opd-queue")}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 shadow-2xs hover:shadow-md transition-all text-left group flex flex-col justify-between focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              aria-haspopup="dialog"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Live OPD Queue
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-normal">
                  Help hospital teams manage outpatient queues and patient flow with automated token calling and triage.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-700">
                <span>Learn more & architecture</span>
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>

            {/* Card 3 — Multi-Tenant Engine */}
            <button
              ref={(el) => { cardTriggerRefs.current["multi-tenant-engine"] = el; }}
              type="button"
              onClick={() => openFeatureModal("multi-tenant-engine")}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 shadow-2xs hover:shadow-md transition-all text-left group flex flex-col justify-between focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              aria-haspopup="dialog"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Enterprise
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Multi-Tenant Engine
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-normal">
                  Support hospital-specific workspaces and controlled access across participating healthcare organizations.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-emerald-600 group-hover:text-emerald-700">
                <span>Learn more & architecture</span>
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>

            {/* Card 4 — ABDM & GST Ready */}
            <button
              ref={(el) => { cardTriggerRefs.current["abdm-gst-ready"] = el; }}
              type="button"
              onClick={() => openFeatureModal("abdm-gst-ready")}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 shadow-2xs hover:shadow-md transition-all text-left group flex flex-col justify-between focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              aria-haspopup="dialog"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    Compliant
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                  ABDM & GST Ready
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-normal">
                  Present the platform&apos;s supported compliance integrations, FHIR R4 schema, and itemized billing capabilities.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-purple-600 group-hover:text-purple-700">
                <span>Learn more & architecture</span>
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          </div>
        </section>

        {/* Secondary Section: Intended Stakeholders & Audiences */}
        <section aria-labelledby="stakeholders-title" className="w-full max-w-[min(94vw,1540px)] mt-16 sm:mt-20 pt-12 border-t border-slate-200/80">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Ecosystem Roles
            </span>
            <h2 id="stakeholders-title" className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-3 tracking-tight">
              Designed for Every Healthcare Stakeholder
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 font-normal leading-relaxed">
              Purpose-built interfaces tailored to the distinct operational, clinical, and privacy needs of patients, doctors, hospitals, and system administrators.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-left">
            {/* Stakeholder 1: Patients */}
            <div className="p-5 rounded-2xl bg-slate-50/60 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">For Patients</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Persistent OneHealth ID, portable medical records, and privacy-shielded QR check-in across connected network hospitals.
                </p>
              </div>
              <ul className="mt-4 space-y-1.5 text-[11px] text-slate-600 pt-3 border-t border-slate-200/60">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Instant QR hospital check-in</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Digital prescriptions & receipts</span>
                </li>
              </ul>
            </div>

            {/* Stakeholder 2: Doctors */}
            <div className="p-5 rounded-2xl bg-slate-50/60 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">For Doctors</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Fast OPD consultation workspace, longitudinal patient timelines, FHIR prescription generation, and automated order dispatch.
                </p>
              </div>
              <ul className="mt-4 space-y-1.5 text-[11px] text-slate-600 pt-3 border-t border-slate-200/60">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Integrated FHIR R4 Rx builder</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Live patient queue calling</span>
                </li>
              </ul>
            </div>

            {/* Stakeholder 3: Hospitals */}
            <div className="p-5 rounded-2xl bg-slate-50/60 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">For Hospitals</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Centralized command console for OPD counters, IPD bed allocations, cashier billing counters, and staff rosters.
                </p>
              </div>
              <ul className="mt-4 space-y-1.5 text-[11px] text-slate-600 pt-3 border-t border-slate-200/60">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>GST-ready counter invoicing</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Department queue coordination</span>
                </li>
              </ul>
            </div>

            {/* Stakeholder 4: Administrators */}
            <div className="p-5 rounded-2xl bg-slate-50/60 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">For Administrators</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Multi-branch tenant provisioning, granular RBAC access controls, immutable audit trails, and platform compliance monitoring.
                </p>
              </div>
              <ul className="mt-4 space-y-1.5 text-[11px] text-slate-600 pt-3 border-t border-slate-200/60">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Granular 8-role RBAC security</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Audit logging & compliance</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Security & Standards Badges Strip */}
        <section aria-label="Security and Standards" className="w-full max-w-[min(94vw,1540px)] mt-12 sm:mt-16 py-4 px-6 rounded-2xl bg-white border border-slate-200/80 flex flex-wrap items-center justify-around gap-4 text-xs sm:text-sm text-slate-600 shadow-2xs">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-800">PostgreSQL Schema Isolation</span>
          </div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold text-slate-800">HL7 FHIR R4 Standard</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-800">HMAC-SHA256 Token Signing</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-600" />
            <span className="font-semibold text-slate-800">GST-Ready Invoicing</span>
          </div>
        </section>
      </main>

      {/* Accessible Feature Details Modal */}
      <FeatureDetailModal
        feature={selectedFeature}
        isOpen={Boolean(selectedFeatureId)}
        onClose={closeFeatureModal}
        triggerRef={{ current: selectedFeatureId ? cardTriggerRefs.current[selectedFeatureId] || null : null }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-slate-50/50 py-8 text-center text-xs sm:text-sm text-slate-500">
        <div className="w-full max-w-[min(96vw,1920px)] mx-auto px-4 sm:px-6 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 OneHealth ID (OH-ID) Unified Healthcare Network • <strong className="text-slate-700">Powered by Sathus Technology Pvt Ltd</strong></p>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <Link href="/login" className="hover:text-blue-600 transition-colors">Hospital Login</Link>
            <span>•</span>
            <Link href="/verify/prescription/demo" className="hover:text-blue-600 transition-colors">Document Verification</Link>
            <span>•</span>
            <span className="text-slate-400">ohid.online</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
