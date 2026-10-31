"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  HeartPulse,
  Baby,
  Activity,
  AlertTriangle,
  Bone,
  Stethoscope,
  Building2,
  Clock,
  PhoneCall,
  BedDouble,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

interface Specialty {
  id: string;
  name: string;
  category: string;
  icon: React.ElementType;
  color: string;
  bgLight: string;
  description: string;
  commonTreatments: string[];
}

interface Facility {
  id: string;
  name: string;
  location: string;
  type: string;
  beds: string;
  opdHours: string;
  emergencyHotline: string;
  verifiedStatus: string;
  specialtiesCount: number;
  highlight: string;
}

const SPECIALTIES: Specialty[] = [
  {
    id: "cardiology",
    name: "Cardiology & Vascular",
    category: "Tertiary Care",
    icon: HeartPulse,
    color: "text-rose-600",
    bgLight: "bg-rose-50 border-rose-100",
    description: "Preventive heart screenings, coronary interventions, echocardiography, and longitudinal hypertension tracking via OH-ID.",
    commonTreatments: ["ECG & Echo Triaging", "Hypertension Regimens", "Post-PCI Follow-up"]
  },
  {
    id: "paediatrics",
    name: "Paediatrics & Neonatal",
    category: "Child Health",
    icon: Baby,
    color: "text-amber-600",
    bgLight: "bg-amber-50 border-amber-100",
    description: "Child developmental assessments, immunization passport synchronization, and weight-adjusted paediatric dosing safety.",
    commonTreatments: ["Vaccine Schedule Tracker", "Growth Percentiles", "Paediatric OPD"]
  },
  {
    id: "emergency",
    name: "Emergency & Critical Care",
    category: "24/7 STAT",
    icon: AlertTriangle,
    color: "text-red-600",
    bgLight: "bg-red-50 border-red-100",
    description: "Immediate trauma triage, zero-delay emergency ICE blood group resolution, and automated resuscitation documentation.",
    commonTreatments: ["STAT Trauma Triage", "Emergency ICE Scan", "ICU Bed Reservation"]
  },
  {
    id: "diagnostics",
    name: "Diagnostics & Pathology",
    category: "Automated Lab",
    icon: Activity,
    color: "text-teal-600",
    bgLight: "bg-teal-50 border-teal-100",
    description: "HL7/FHIR integrated diagnostic orders, tamper-evident lab test reports, and direct patient health locker sync.",
    commonTreatments: ["Digital Lab Reports", "Imaging & Radiology", "Biomarker Trends"]
  },
  {
    id: "orthopaedics",
    name: "Orthopaedics & Sports Care",
    category: "Surgical Care",
    icon: Bone,
    color: "text-blue-600",
    bgLight: "bg-blue-50 border-blue-100",
    description: "Joint preservation, fracture reductions, pre-operative fitness protocols, and physical therapy progression notes.",
    commonTreatments: ["Joint Reconstruction", "Post-Op Rehab Plans", "Fracture Management"]
  },
  {
    id: "general-medicine",
    name: "General & Family Medicine",
    category: "Primary Care",
    icon: Stethoscope,
    color: "text-emerald-600",
    bgLight: "bg-emerald-50 border-emerald-100",
    description: "Holistic multi-system checkups, routine health screenings, and unified care continuity across the whole family.",
    commonTreatments: ["Comprehensive Wellness", "Diabetes & Thyroid Care", "Preventive Screenings"]
  }
];

const FACILITIES: Facility[] = [
  {
    id: "kedar-hospital",
    name: "Kedar Super Specialty Hospital",
    location: "Chennai Central • Multi-Tenant Branch 01",
    type: "Super Specialty Tertiary Center",
    beds: "450 Beds (64 ICU)",
    opdHours: "08:00 AM – 09:00 PM",
    emergencyHotline: "+91 44 2836 9000",
    verifiedStatus: "OH-ID Verified Hub",
    specialtiesCount: 32,
    highlight: "Paperless OPD Check-in & Cashless Insurance Triage"
  },
  {
    id: "ramachandra-center",
    name: "Sri Ramachandra Medical Centre",
    location: "Porur, Chennai • Teaching & Research",
    type: "Academic Medical Hospital",
    beds: "800 Beds (120 ICU)",
    opdHours: "07:30 AM – 08:30 PM",
    emergencyHotline: "+91 44 4592 8500",
    verifiedStatus: "OH-ID Verified Hub",
    specialtiesCount: 45,
    highlight: "Standard Clinical Report & Rx Integration Anchor"
  },
  {
    id: "apollo-central",
    name: "Apollo City Central Clinic",
    location: "Greams Road, Chennai • Network Partner",
    type: "Multispecialty OPD & Day Surgery",
    beds: "120 Beds (18 Daycare)",
    opdHours: "08:30 AM – 08:00 PM",
    emergencyHotline: "+91 44 2829 0200",
    verifiedStatus: "Network Hospital",
    specialtiesCount: 24,
    highlight: "Express ZK-QR Token Calling & Digital Dispensary"
  },
  {
    id: "bengaluru-diagnostic",
    name: "Bengaluru Healthcare & Diagnostic Hub",
    location: "Indiranagar, Bengaluru • Karnataka Hub",
    type: "Diagnostic & Ambulatory Center",
    beds: "50 Daycare Beds",
    opdHours: "06:30 AM – 10:00 PM",
    emergencyHotline: "+91 80 4120 7700",
    verifiedStatus: "Network Lab Partner",
    specialtiesCount: 18,
    highlight: "Direct FHIR R4 Diagnostic Sync to Patient Locker"
  }
];

export function SpecialtiesAndFacilities() {
  const [selectedFacility, setSelectedFacility] = useState<Facility>(FACILITIES[0]);

  return (
    <section aria-labelledby="clinical-network-title" className="w-full max-w-[min(96vw,1540px)] mx-auto mt-16 sm:mt-24 text-left">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Clinical Network &amp; Specialties
        </span>
        <h2 id="clinical-network-title" className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-3 tracking-tight">
          Comprehensive Clinical Specialties &amp; Network Hospitals
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-2 font-normal leading-relaxed">
          From express outpatient consultations to complex tertiary surgeries, OneHealth ID connects patient records and verified prescriptions seamlessly across premier healthcare institutions.
        </p>
      </div>

      {/* Part 1: Medical Specialties Grid (Medific / Lunira style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14">
        {SPECIALTIES.map((spec) => {
          const Icon = spec.icon;
          return (
            <div
              key={spec.id}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${spec.bgLight} ${spec.color} group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {spec.category}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {spec.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-normal">
                  {spec.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Common Clinical Workflows</span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {spec.commonTreatments.map((tr, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200">
                      {tr}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Part 2: Network Facilities & Hospitals (Lunira Map & Station Explorer) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white relative overflow-hidden">
        {/* Ambient glow accent */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold mb-2">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Multi-Tenant Network Topology</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Connected Healthcare Institutions
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Each hospital operates in its own schema-isolated environment while verifying patients instantly via the global OH-ID token protocol.
            </p>
          </div>

          <Link
            href="/hospital"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-xs shrink-0 self-start md:self-auto"
          >
            <span>Hospital Command Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Facility Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          {FACILITIES.map((fac) => {
            const isSelected = selectedFacility.id === fac.id;
            return (
              <button
                key={fac.id}
                type="button"
                onClick={() => setSelectedFacility(fac)}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-slate-800/90 border-blue-400/60 ring-2 ring-blue-500/30"
                    : "bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 hover:border-slate-600"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/60">
                      {fac.verifiedStatus}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {fac.specialtiesCount} Depts
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white leading-snug">
                    {fac.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {fac.location}
                  </p>

                  <div className="mt-3 space-y-1.5 text-[11px] text-slate-300">
                    <div className="flex items-center gap-2">
                      <BedDouble className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{fac.beds}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{fac.opdHours}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PhoneCall className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{fac.emergencyHotline}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                  <span className="text-blue-300 font-medium truncate max-w-[170px]">{fac.highlight}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

