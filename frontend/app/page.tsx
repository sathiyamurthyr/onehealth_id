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
  PhoneCall,
  FileText,
  BadgeAlert,
  Calendar,
  Zap,
  ExternalLink
} from "lucide-react";
import { api } from "@/lib/api";
import { HeroIdentityCardSimulator } from "@/components/landing/HeroIdentityCardSimulator";
import { ConnectedPatientJourneyVisual } from "@/components/landing/ConnectedPatientJourneyVisual";
import { ClinicalTemplateShowcase } from "@/components/landing/ClinicalTemplateShowcase";
import { SpecialtiesAndFacilities } from "@/components/landing/SpecialtiesAndFacilities";
import { FaqAccordion } from "@/components/landing/FaqAccordion";
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

  return (
    <div className="min-h-screen min-h-svh bg-white text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white antialiased">
      {/* Top Emergency & Accreditation Bar (Medific style) */}
      <div className="bg-slate-950 text-white text-[11px] py-2 px-4 border-b border-slate-800">
        <div className="max-w-[min(96vw,1720px)] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>ABDM &amp; HL7 FHIR R4 Certified Healthcare Network • Powered by Sathus Technology Pvt Ltd</span>
          </div>
          <div className="flex items-center gap-4 text-slate-300">
            <div className="flex items-center gap-1.5 text-amber-300">
              <PhoneCall className="w-3 h-3 text-amber-400" />
              <span>24/7 Digital Health Helpline: <strong>1800-OHID-CARE</strong></span>
            </div>
            <span className="hidden md:inline text-slate-600">|</span>
            <Link href="/verify/prescription/demo" className="hidden md:inline hover:text-white transition-colors underline decoration-slate-600 underline-offset-2">
              Verify Clinical Document
            </Link>
          </div>
        </div>
      </div>

      {/* Main Glassmorphic Navigation Bar */}
      <header className="border-b border-slate-200/80 backdrop-blur-md bg-white/95 sticky top-0 z-40">
        <div className="w-full max-w-[min(96vw,1720px)] mx-auto px-4 sm:px-6 xl:px-10 h-16 sm:h-18 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <Link href="/" className="flex items-center gap-3 group focus:outline-hidden focus:ring-2 focus:ring-blue-500 rounded-xl p-1">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1.5 shrink-0 overflow-hidden group-hover:border-blue-300 transition-colors">
              <Image
                src="/images/oh-id-logo.png"
                alt="One Health ID"
                width={40}
                height={40}
                priority
                className="object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl tracking-tight text-slate-950">
                  ONEHEALTH ID
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  v2.0
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate max-w-[210px] sm:max-w-none block">
                Universal Healthcare Identity • Sathus Technology
              </p>
            </div>
          </Link>

          {/* Center Navigation Links (Lunira style) */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#journey" className="hover:text-blue-600 transition-colors">Patient Journey</a>
            <a href="#capabilities" className="hover:text-blue-600 transition-colors">Capabilities</a>
            <a href="#templates" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <span>20 Templates</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200">New</span>
            </a>
            <a href="#specialties" className="hover:text-blue-600 transition-colors">Specialties</a>
            <a href="#stakeholders" className="hover:text-blue-600 transition-colors">Ecosystem</a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">FAQ</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 hidden md:inline">
                  Signed in as <strong className="text-slate-900">{currentUser.name || currentUser.username}</strong>
                </span>
                <Link
                  href="/dashboard"
                  className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs flex items-center gap-1.5 min-h-[40px] focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Open Console</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/register"
                  className="text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-blue-400 transition-all min-h-[40px] flex items-center gap-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                >
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Register OH-ID</span>
                  <span className="sm:hidden">Register</span>
                </Link>
                <Link
                  href="/login"
                  className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm shadow-blue-600/25 min-h-[40px] flex items-center gap-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <span>Portal Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="w-full flex-1 flex flex-col items-center">
        {/* HERO SECTION — Lunira & Medific 3D Interactive Centerpiece */}
        <section aria-labelledby="hero-title" className="w-full max-w-[min(96vw,1720px)] mx-auto px-4 sm:px-6 xl:px-10 pt-10 sm:pt-16 pb-12 sm:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Value Proposition & CTAs */}
            <div className="lg:col-span-7 text-left flex flex-col items-start">
              {/* Release Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Universal Digital Healthcare Identity &amp; Multi-Hospital Platform</span>
              </div>

              {/* Bold Lunira Headline */}
              <h1
                id="hero-title"
                className="font-extrabold tracking-tight text-slate-950 leading-[1.1] max-w-2xl text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
              >
                One Digital Health Identity.{" "}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 bg-clip-text text-transparent">
                  A Connected Healthcare Journey.
                </span>
              </h1>

              {/* Supporting Copy */}
              <p className="mt-5 text-slate-600 font-normal leading-relaxed text-sm sm:text-base md:text-lg max-w-xl">
                Connect patient identity, hospital workflows, appointments, consultations, prescriptions, and authorized health records through an enterprise healthcare platform.
              </p>

              {/* Primary Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/register"
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold text-sm shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2.5 min-h-[48px] focus:outline-hidden focus:ring-4 focus:ring-blue-500/25"
                >
                  <Sparkles className="w-4 h-4 text-white/90" />
                  <span>Register for OH-ID</span>
                  <ArrowRight className="w-4 h-4 text-white/90" />
                </Link>

                <Link
                  href={patientLoginHref}
                  className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 font-semibold text-sm shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 min-h-[48px] focus:outline-hidden focus:ring-4 focus:ring-slate-200"
                >
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Patient Login</span>
                </Link>

                <Link
                  href={hospitalConsoleHref}
                  className="px-5 py-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 font-medium text-xs transition-all flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Hospital Console</span>
                </Link>
              </div>

              {/* Social Proof / Trust Line */}
              <div className="mt-8 pt-6 border-t border-slate-200/80 w-full flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <div className="flex -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white">P1</div>
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white">P2</div>
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white">P3</div>
                  <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white">+2M</div>
                </div>
                <span>Over <strong>2.4 Million</strong> verified digital patient profiles across network hospitals</span>
              </div>
            </div>

            {/* Right Column: Medific-style Interactive Digital Identity Simulator */}
            <div className="lg:col-span-5 flex justify-center">
              <HeroIdentityCardSimulator />
            </div>
          </div>
        </section>

        {/* TRUST METRICS STATS BAR (Lunira style) */}
        <section aria-label="Network Statistics" className="w-full bg-slate-50 border-y border-slate-200/80 py-8 px-4 sm:px-6 xl:px-10">
          <div className="max-w-[min(96vw,1720px)] mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-blue-600 tracking-tight">2.4M+</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 mt-1">Verified Patients</span>
              <span className="text-[11px] text-slate-500">Universal Digital ID Holders</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-indigo-600 tracking-tight">50+</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 mt-1">Connected Hospitals</span>
              <span className="text-[11px] text-slate-500">Multi-Specialty Healthcare Hubs</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-teal-600 tracking-tight">12,000+</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 mt-1">Consulting Doctors</span>
              <span className="text-[11px] text-slate-500">Digital OPD Workspaces</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-emerald-600 tracking-tight">&lt; 30s</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 mt-1">Contactless Check-in</span>
              <span className="text-[11px] text-slate-500">Zero-Knowledge QR Scan</span>
            </div>
          </div>
        </section>

        {/* SECTION: Connected Patient Journey (5-step progressive visual) */}
        <section id="journey" className="w-full max-w-[min(96vw,1720px)] mx-auto px-4 sm:px-6 xl:px-10 pt-16">
          <ConnectedPatientJourneyVisual />
        </section>

        {/* SECTION: Core Architectural Capabilities (4 Interactive Specification Cards) */}
        <section id="capabilities" aria-labelledby="features-title" className="w-full max-w-[min(96vw,1540px)] mx-auto px-4 sm:px-6 xl:px-10 mt-16 sm:mt-24 text-left">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Technical Specifications</span>
              </div>
              <h2 id="features-title" className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                Core Architectural Capabilities
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Click any capability card to inspect technical workflows, encryption boundaries, and implementation status.
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full shrink-0">
              Interactive Specification Modal
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <span>Inspect Architecture</span>
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
                <span>Inspect Architecture</span>
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
                <span>Inspect Architecture</span>
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
                <span>Inspect Architecture</span>
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          </div>
        </section>

        {/* SECTION: 20 Unified Clinical Document Templates Showcase */}
        <section id="templates" className="w-full">
          <ClinicalTemplateShowcase />
        </section>

        {/* SECTION: Clinical Specialties & Connected Hospitals */}
        <section id="specialties" className="w-full">
          <SpecialtiesAndFacilities />
        </section>

        {/* SECTION: Ecosystem Roles (Lunira / Medific style) */}
        <section id="stakeholders" aria-labelledby="stakeholders-title" className="w-full max-w-[min(96vw,1540px)] mx-auto px-4 sm:px-6 xl:px-10 mt-16 sm:mt-24 text-left">
          <div className="text-center max-w-2xl mx-auto mb-12">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stakeholder 1: Patients */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3.5 border border-blue-100">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">For Patients &amp; Families</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Persistent OneHealth ID, portable medical records, family member profile switching, and privacy-shielded QR check-in across connected network hospitals.
                </p>
              </div>
              <ul className="mt-5 space-y-2 text-xs text-slate-600 pt-3.5 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Instant QR hospital check-in</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Digital prescriptions &amp; lab results</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Multi-member family locker</span>
                </li>
              </ul>
            </div>

            {/* Stakeholder 2: Doctors */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3.5 border border-indigo-100">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">For Consulting Doctors</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Fast OPD consultation workspace, longitudinal patient timelines, FHIR prescription generation, and automated order dispatch.
                </p>
              </div>
              <ul className="mt-5 space-y-2 text-xs text-slate-600 pt-3.5 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Integrated FHIR R4 Rx builder</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>10 Approved clinical templates</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Live OPD queue token calling</span>
                </li>
              </ul>
            </div>

            {/* Stakeholder 3: Hospitals */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3.5 border border-emerald-100">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">For Hospitals &amp; Clinics</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Centralized command console for OPD counters, IPD bed allocations, cashier billing counters, and staff rosters.
                </p>
              </div>
              <ul className="mt-5 space-y-2 text-xs text-slate-600 pt-3.5 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>GST-ready counter invoicing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Department queue coordination</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Custom hospital letterhead</span>
                </li>
              </ul>
            </div>

            {/* Stakeholder 4: Administrators */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3.5 border border-purple-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">For Administrators</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Multi-branch tenant provisioning, granular RBAC access controls, immutable audit trails, and platform compliance monitoring.
                </p>
              </div>
              <ul className="mt-5 space-y-2 text-xs text-slate-600 pt-3.5 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Granular 8-role RBAC security</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>20 Template catalogue controls</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Audit logging &amp; DPDP compliance</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECURITY & ARCHITECTURAL STANDARDS STRIP */}
        <section aria-label="Security and Standards" className="w-full max-w-[min(96vw,1540px)] mx-auto px-4 sm:px-6 xl:px-10 mt-12 sm:mt-16">
          <div className="py-5 px-6 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-wrap items-center justify-around gap-6 text-xs sm:text-sm text-slate-600">
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
          </div>
        </section>

        {/* SECTION: Frequently Asked Questions (FaqAccordion) */}
        <section id="faq" className="w-full">
          <FaqAccordion />
        </section>

        {/* HIGH-IMPACT CONVERSION BANNER (Lunira style) */}
        <section aria-label="Get Started Banner" className="w-full max-w-[min(96vw,1540px)] mx-auto px-4 sm:px-6 xl:px-10 mt-16 sm:mt-24 mb-16">
          <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-8 sm:p-12 text-white text-center relative overflow-hidden shadow-xl">
            {/* Ambient shapes */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
              <span className="text-xs uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-white/15 text-blue-100 border border-white/20 mb-4">
                Join the Connected Healthcare Network
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-snug">
                Ready to Experience Seamless, Paperless Healthcare?
              </h2>
              <p className="text-sm sm:text-base text-blue-100/90 mt-3 max-w-xl font-normal leading-relaxed">
                Register for your personal OneHealth ID in less than 2 minutes, or connect your hospital to access our 20 clinical document templates and multi-tenant OPD suite.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-blue-900 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Create Free OneHealth ID</span>
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                </Link>
                <Link
                  href="/hospital"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Building2 className="w-4 h-4 text-white" />
                  <span>Hospital Onboarding</span>
                </Link>
              </div>
            </div>
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

      {/* COMPREHENSIVE ENTERPRISE FOOTER (Medific / Lunira style) */}
      <footer className="border-t border-slate-200/80 bg-slate-50 text-slate-600 text-xs sm:text-sm">
        <div className="w-full max-w-[min(96vw,1720px)] mx-auto px-4 sm:px-6 xl:px-10 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            {/* Col 1: Brand & Attribution */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1">
                  <Image
                    src="/images/oh-id-logo.png"
                    alt="One Health ID"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  ONEHEALTH ID (OH-ID)
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                India&apos;s universal digital health identity and multi-tenant hospital network platform. Connecting patients, doctors, and hospitals through interoperable FHIR standards and zero-knowledge verification.
              </p>
              <div className="pt-2">
                <p className="text-[11px] font-semibold text-slate-700">
                  Developed &amp; Powered by Sathus Technology Pvt Ltd
                </p>
                <p className="text-[11px] text-slate-400">
                  Registered Healthcare IT Provider • Support: support@ohid.online
                </p>
              </div>
            </div>

            {/* Col 2: Patient Services */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">For Patients</h4>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><Link href="/register" className="hover:text-blue-600 transition-colors">Register for OH-ID</Link></li>
                <li><Link href="/patient" className="hover:text-blue-600 transition-colors">Patient Health Locker</Link></li>
                <li><Link href="/verify/prescription/demo" className="hover:text-blue-600 transition-colors">Verify Digital Rx</Link></li>
                <li><a href="#specialties" className="hover:text-blue-600 transition-colors">Find Network Hospital</a></li>
                <li><a href="#journey" className="hover:text-blue-600 transition-colors">Emergency ICE Triage</a></li>
              </ul>
            </div>

            {/* Col 3: Hospital & Clinical Solutions */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Hospitals &amp; Doctors</h4>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><Link href="/hospital" className="hover:text-blue-600 transition-colors">Hospital Command Console</Link></li>
                <li><a href="#templates" className="hover:text-blue-600 transition-colors">20 Clinical Templates</a></li>
                <li><a href="#capabilities" className="hover:text-blue-600 transition-colors">Live OPD Queue Tokens</a></li>
                <li><Link href="/login" className="hover:text-blue-600 transition-colors">Clinical Doctor Login</Link></li>
                <li><a href="#capabilities" className="hover:text-blue-600 transition-colors">GST Invoicing Engine</a></li>
              </ul>
            </div>

            {/* Col 4: Governance & Emergency */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Compliance &amp; STAT</h4>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><span className="text-slate-700 font-medium">ABDM &amp; FHIR R4 Ready</span></li>
                <li><span className="text-slate-700 font-medium">ISO 27001 Certified Vault</span></li>
                <li><span className="text-slate-700 font-medium">DPDP Act Compliant</span></li>
                <li className="pt-2 text-rose-600 font-bold flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Trauma: 1800-OHID-CARE</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Terms Bar */}
          <div className="pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 OneHealth ID (OH-ID) Unified Healthcare Network. All rights reserved.</p>
            <div className="flex items-center gap-4 text-slate-500 text-[11px]">
              <Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link>
              <span>•</span>
              <Link href="/verify/prescription/demo" className="hover:text-blue-600 transition-colors">Public Document Verification</Link>
              <span>•</span>
              <span className="text-slate-400 font-mono">ohid.online</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
