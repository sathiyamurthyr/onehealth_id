"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Stethoscope,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Layers,
  HeartPulse,
  Baby,
  Activity,
  AlertTriangle,
  QrCode,
  FileCheck
} from "lucide-react";

interface ClinicalTemplate {
  id: string;
  type: "rx" | "report";
  number: number;
  name: string;
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  description: string;
  targetAudience: string;
  keyFeatures: string[];
  layoutStyle: string;
}

const TEMPLATES: ClinicalTemplate[] = [
  // 10 Prescription (Rx) Templates
  {
    id: "rx-classic",
    type: "rx",
    number: 1,
    name: "Classic Hospital Rx",
    badge: "Most Popular",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    icon: FileText,
    description: "Traditional structured hospital prescription format with organized medication tables, dosage frequency, and duration schedules.",
    targetAudience: "Multi-Specialty & General Hospitals",
    keyFeatures: ["Tabular Medicine Layout", "Allergy Status Banner", "Doctor Digital Signature"],
    layoutStyle: "Navy header with structured clinical grid"
  },
  {
    id: "rx-modern",
    type: "rx",
    number: 2,
    name: "Modern Clinical Rx",
    badge: "Clean & Modern",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: Sparkles,
    description: "Contemporary typography with high readability, distinct clinical sections, and compact medication chips for fast patient intake.",
    targetAudience: "Urban Clinics & Multispecialty Centers",
    keyFeatures: ["Compact Dosage Badges", "Meal Timing Highlights", "Bilingual Instructions"],
    layoutStyle: "Minimal borders with indigo accent cards"
  },
  {
    id: "rx-minimal-opd",
    type: "rx",
    number: 3,
    name: "Minimal OPD Rx",
    badge: "High Velocity",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    icon: Activity,
    description: "Streamlined single-page consultation prescription designed for high-volume outpatient departments and express consultations.",
    targetAudience: "OPD Counters & Day Clinics",
    keyFeatures: ["One-Page Compact Form", "Key Diagnosis Focus", "Instant Dispensing Codes"],
    layoutStyle: "Tight vertical layout for thermal & laser printing"
  },
  {
    id: "rx-paediatric",
    type: "rx",
    number: 4,
    name: "Paediatric Care Rx",
    badge: "Paediatric Certified",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    icon: Baby,
    description: "Prominent patient weight, height, gestational age, and weight-adjusted dosage calculations with clear syrup administration guidelines.",
    targetAudience: "Children's Hospitals & Paediatricians",
    keyFeatures: ["Weight/Age Prominence", "Liquid Dosage Syringe Guides", "Immunization Milestones"],
    layoutStyle: "Warm child-friendly accents with high safety margins"
  },
  {
    id: "rx-general-physician",
    type: "rx",
    number: 5,
    name: "General Physician Rx",
    badge: "Family Medicine",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Stethoscope,
    description: "Comprehensive primary care template with dedicated sections for dietary advice, lifestyle recommendations, and follow-up timeline.",
    targetAudience: "General Practitioners & Family Doctors",
    keyFeatures: ["Dietary Advice Section", "Follow-up Calendar", "Preventive Care Checks"],
    layoutStyle: "Balanced two-column layout with notes section"
  },
  {
    id: "rx-specialist",
    type: "rx",
    number: 6,
    name: "Specialist Consultation Rx",
    badge: "Super Specialty",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    icon: HeartPulse,
    description: "Advanced specialty layout highlighting provisional differential diagnosis, detailed treatment algorithms, and lab orders.",
    targetAudience: "Cardiology, Oncology, Neurology & Surgery",
    keyFeatures: ["Differential Diagnosis Grid", "Specialty Lab Requisitions", "Treatment Protocol Steps"],
    layoutStyle: "Executive purple theme with comprehensive metadata"
  },
  {
    id: "rx-chronic-care",
    type: "rx",
    number: 7,
    name: "Chronic Care Rx",
    badge: "Long-term Care",
    badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-200",
    icon: Layers,
    description: "Designed for diabetes, hypertension, and long-term care management with previous vs revised medication comparison tables.",
    targetAudience: "Endocrinology, Nephrology & Geriatrics",
    keyFeatures: ["Baseline vs Current Regimen", "Refill Schedule Tracker", "Target Metric Benchmarks"],
    layoutStyle: "Longitudinal tracking grid with pill-count reminders"
  },
  {
    id: "rx-emergency",
    type: "rx",
    number: 8,
    name: "Emergency STAT Rx",
    badge: "Critical Priority",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    icon: AlertTriangle,
    description: "High-contrast triage layout emphasizing emergency drug administration, critical drug allergies, route of delivery, and STAT orders.",
    targetAudience: "Emergency Departments & Trauma ICUs",
    keyFeatures: ["STAT Emergency Banner", "High-Risk Allergy Red Flag", "IV/IM Delivery Indicators"],
    layoutStyle: "High-visibility red warning perimeter"
  },
  {
    id: "rx-digital-eprescription",
    type: "rx",
    number: 9,
    name: "Digital E-Prescription",
    badge: "ABDM & QR Ready",
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    icon: QrCode,
    description: "Digital-first prescription featuring cryptographic QR verification, cryptographic doctor signature, and instant pharmacy fulfillment links.",
    targetAudience: "Telemedicine & Smart Digital Hospitals",
    keyFeatures: ["Zero-Knowledge QR Verification", "Cryptographic Signatures", "Instant Digital Pharmacy Pass"],
    layoutStyle: "Interactive digital card with dynamic verification code"
  },
  {
    id: "rx-detailed-clinical",
    type: "rx",
    number: 10,
    name: "Detailed Clinical Rx",
    badge: "Hospital Inpatient",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
    icon: FileCheck,
    description: "Exhaustive clinical prescription format including past surgical history, concurrent medications, contraindications, and pharmacist review sign-off.",
    targetAudience: "Inpatient Wards & Academic Medical Centres",
    keyFeatures: ["Complete History Matrix", "Pharmacist Verification Gate", "Full ICD-10 Coding"],
    layoutStyle: "Academic multi-tier clinical dossier format"
  },

  // 10 Clinical Consultation Report Templates
  {
    id: "rep-classic-hospital",
    type: "report",
    number: 1,
    name: "Classic Hospital Clinical Report",
    badge: "Comprehensive",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    icon: FileText,
    description: "Standard institutional consultation documentation covering chief complaint, history of present illness, examination, and treatment plan.",
    targetAudience: "Hospital Admission & Inpatient Consults",
    keyFeatures: ["Encounter Summary Table", "Systemic Physical Exam", "Structured Discharge Criteria"],
    layoutStyle: "Formal hospital letterhead format"
  },
  {
    id: "rep-modern-consultation",
    type: "report",
    number: 2,
    name: "Modern Clinical Consultation",
    badge: "Interactive",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: Sparkles,
    description: "Modular contemporary consultation dossier with clear visual breakdown of subjective history, objective vitals, and clinical reasoning.",
    targetAudience: "Private Practices & Polyclinics",
    keyFeatures: ["SOAP Note Structure", "Visual Vitals Summary", "Shared Care Team Notes"],
    layoutStyle: "Modular card-based report interface"
  },
  {
    id: "rep-minimal-opd",
    type: "report",
    number: 3,
    name: "Minimal OPD Consultation",
    badge: "Rapid Summary",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    icon: Activity,
    description: "Rapid single-page outpatient clinical encounter note summarizing key complaints, clinical impression, and agreed next steps.",
    targetAudience: "Walk-in Clinics & Follow-up Desks",
    keyFeatures: ["Quick Vitals Snapshot", "Impression & Plan Only", "Next Visit Date Counter"],
    layoutStyle: "Ultra-compact single-fold layout"
  },
  {
    id: "rep-paediatric",
    type: "report",
    number: 4,
    name: "Paediatric Clinical Report",
    badge: "Growth & Vitals",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    icon: Baby,
    description: "Dedicated child evaluation report featuring WHO growth percentiles, developmental milestones, head circumference, and dietary advice.",
    targetAudience: "Paediatric Specialists & Neonatologists",
    keyFeatures: ["Percentile Growth Plotting", "Developmental Milestone Checklist", "Vaccine Audit Timeline"],
    layoutStyle: "Child health passport visual layout"
  },
  {
    id: "rep-general-physician",
    type: "report",
    number: 5,
    name: "General Physician Consultation",
    badge: "Primary Health",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Stethoscope,
    description: "Holistic evaluation summary addressing acute complaints in conjunction with chronic comorbidities, lifestyle factors, and screening checks.",
    targetAudience: "Primary Health Clinics & Family Physicians",
    keyFeatures: ["Comorbidity Matrix", "Preventive Screening Checklist", "Actionable Lifestyle Protocol"],
    layoutStyle: "Balanced green accent clinical document"
  },
  {
    id: "rep-specialist",
    type: "report",
    number: 6,
    name: "Specialist Consultation Report",
    badge: "Tertiary Referral",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    icon: HeartPulse,
    description: "In-depth clinical report format specifically crafted for inter-departmental referrals, complex diagnoses, and multidisciplinary care reviews.",
    targetAudience: "Tertiary Referral Centers & Specialists",
    keyFeatures: ["Referring Doctor Summary", "Specialized Diagnostic Workup", "Multi-Phase Management Plan"],
    layoutStyle: "Executive tertiary healthcare template"
  },
  {
    id: "rep-chronic-disease",
    type: "report",
    number: 7,
    name: "Chronic Disease Review Report",
    badge: "Longitudinal",
    badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-200",
    icon: Layers,
    description: "Progressive monitoring record for tracking chronic markers (HbA1c, eGFR, lipid profile, blood pressure trends) over continuous 12-month spans.",
    targetAudience: "Cardiometabolic & Geriatric Clinics",
    keyFeatures: ["12-Month Biomarker Trends", "Target vs Achieved Metrics", "Lifestyle Adherence Score"],
    layoutStyle: "Chronological trend dashboard layout"
  },
  {
    id: "rep-emergency",
    type: "report",
    number: 8,
    name: "Emergency Clinical Assessment",
    badge: "STAT Triage",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    icon: AlertTriangle,
    description: "Time-critical emergency assessment documenting triage acuity level, Glasgow Coma Scale, trauma score, STAT resuscitation, and disposition.",
    targetAudience: "Trauma Centers & Emergency Medicine",
    keyFeatures: ["GCS & Triage Acuity Index", "Timestamped Resuscitation Log", "Final Disposition Decision"],
    layoutStyle: "High-contrast clinical trauma summary"
  },
  {
    id: "rep-digital",
    type: "report",
    number: 9,
    name: "Digital Clinical Report",
    badge: "FHIR R4 Native",
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    icon: QrCode,
    description: "Interoperable, machine-readable digital consultation report structured strictly to HL7 FHIR R4 Encounter and DiagnosticReport standards.",
    targetAudience: "Digital Health Networks & HIEs",
    keyFeatures: ["FHIR R4 DiagnosticReport Resource", "ABDM Care-Context Binding", "Tamper-Evident SHA-256 Stamp"],
    layoutStyle: "Clean digital dashboard with verified metadata"
  },
  {
    id: "rep-detailed-eval",
    type: "report",
    number: 10,
    name: "Detailed Clinical Evaluation",
    badge: "Academic Review",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
    icon: FileCheck,
    description: "Comprehensive clinical evaluation note designed for pre-operative fitness, complex inpatient admissions, and medicolegal audit trails.",
    targetAudience: "Surgeons, Anaesthetists & Medical Boards",
    keyFeatures: ["Pre-Op Risk Stratification", "System-by-System Review", "Audit Trail & Signatures"],
    layoutStyle: "Exhaustive legal & clinical grade dossier"
  }
];

export function ClinicalTemplateShowcase() {
  const [activeTab, setActiveTab] = useState<"all" | "rx" | "report">("all");
  const [selectedTemplate, setSelectedTemplate] = useState<ClinicalTemplate>(TEMPLATES[0]);

  const filteredTemplates = TEMPLATES.filter(
    (t) => activeTab === "all" || t.type === activeTab
  );

  return (
    <section aria-labelledby="templates-showcase-title" className="w-full max-w-[min(96vw,1540px)] mx-auto mt-16 sm:mt-24 text-left">
      {/* Header and Value Proposition */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Standardized Healthcare Output • 20 Approved Designs</span>
          </div>
          <h2 id="templates-showcase-title" className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
            Unified Clinical Document Template System
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1.5 leading-relaxed">
            Every hospital selects its preferred prescription and consultation report templates from 20 standardized, medically compliant layouts.
            Doctors prescribe seamlessly and patients access clean, verified documents across the entire OH-ID network.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="inline-flex p-1 bg-slate-100/90 rounded-2xl border border-slate-200 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "all"
                ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Templates (20)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rx")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "rx"
                ? "bg-white text-blue-700 shadow-2xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Prescriptions (10)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("report")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "report"
                ? "bg-white text-indigo-700 shadow-2xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Clinical Reports (10)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left interactive browser, Right detailed preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Template Catalog Grid */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[640px] overflow-y-auto pr-1 pb-2">
          {filteredTemplates.map((tmpl) => {
            const Icon = tmpl.icon;
            const isSelected = selectedTemplate.id === tmpl.id;

            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => setSelectedTemplate(tmpl)}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-blue-50/50 border-blue-400 ring-2 ring-blue-500/20 shadow-sm"
                    : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-2xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        tmpl.type === "rx" ? "bg-blue-100/70 text-blue-700" : "bg-indigo-100/70 text-indigo-700"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">
                        {tmpl.type === "rx" ? `Rx #${tmpl.number}` : `Rep #${tmpl.number}`}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tmpl.badgeColor}`}>
                      {tmpl.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">
                    {tmpl.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {tmpl.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 truncate max-w-[170px]">{tmpl.targetAudience}</span>
                  <span className={`font-semibold ${isSelected ? "text-blue-700" : "text-slate-400"}`}>
                    {isSelected ? "Inspecting" : "Select"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Template Live Inspector Panel (Medific/Lunira Style) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between sticky top-24">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedTemplate.type === "rx" ? "bg-blue-50 text-blue-600" : "bg-indigo-50 text-indigo-600"
                }`}>
                  {React.createElement(selectedTemplate.icon, { className: "w-5 h-5" })}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {selectedTemplate.type === "rx" ? "Prescription Model (Rx)" : "Clinical Consultation Report"}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 leading-snug">
                    {selectedTemplate.name}
                  </h4>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedTemplate.badgeColor}`}>
                {selectedTemplate.badge}
              </span>
            </div>

            {/* Simulated Clinical Paper Outline */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-[11px] space-y-2.5">
              <div className="flex items-center justify-between text-slate-400 text-[10px] pb-1.5 border-b border-slate-200">
                <span>INSTITUTION HEADER / ACCREDITATION</span>
                <span>ISO 27001 / ABDM</span>
              </div>
              
              <div className="space-y-1">
                <div className="h-2 w-3/4 bg-slate-200 rounded"></div>
                <div className="h-2 w-1/2 bg-slate-200 rounded"></div>
              </div>

              {/* Medicine or Section mock */}
              <div className="p-2 rounded-xl bg-white border border-slate-200/80 space-y-1">
                <div className="flex justify-between items-center text-slate-600 font-bold text-[10px]">
                  <span>{selectedTemplate.type === "rx" ? "MEDICATION & REGIMEN" : "CLINICAL ASSESSMENT"}</span>
                  <span className="text-blue-600">Standardized</span>
                </div>
                <div className="h-1.5 w-full bg-blue-100 rounded"></div>
                <div className="h-1.5 w-4/5 bg-slate-100 rounded"></div>
              </div>

              <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                <span>Layout Style:</span>
                <span className="font-semibold text-slate-700">{selectedTemplate.layoutStyle}</span>
              </div>
            </div>

            {/* Key Features */}
            <div className="mt-4">
              <h5 className="text-xs font-bold text-slate-800 mb-2">Verified Template Standards</h5>
              <ul className="space-y-1.5">
                {selectedTemplate.keyFeatures.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href="/verify/prescription/demo"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verify Standardized Document</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>
            <p className="text-[10px] text-center text-slate-400">
              Approved by Hospital Super Admin • Cryptographically signed with SHA-256
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

