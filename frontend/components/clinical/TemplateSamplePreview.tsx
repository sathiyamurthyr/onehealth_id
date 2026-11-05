"use client";

import React, { useState } from "react";
import {
  FileText,
  Pill,
  Building2,
  CheckCircle2,
  Maximize2,
  X,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  Calendar,
  User,
  HeartPulse,
  Activity,
  Layers,
} from "lucide-react";

export interface TemplateSamplePreviewProps {
  documentType: "PRESCRIPTION" | "CLINICAL_REPORT";
  template: any;
  customHeaderText?: string;
  customFooterNotes?: string;
  showHospitalLogo?: boolean;
  branding?: any;
}

export function TemplateSamplePreview({
  documentType,
  template,
  customHeaderText,
  customFooterNotes,
  showHospitalLogo = true,
  branding,
}: TemplateSamplePreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!template) {
    return (
      <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center text-xs text-slate-400">
        Select a template to view live layout preview
      </div>
    );
  }

  const cfg = template.layout_config || {};
  const primaryColor = branding?.primary_color || cfg.primaryColor || (documentType === "PRESCRIPTION" ? "#1E3A8A" : "#0284C7");
  const secondaryColor = branding?.secondary_color || cfg.secondaryColor || "#0284C7";
  const headingColor = branding?.heading_color || cfg.headingColor || "#0F172A";
  const bodyTextColor = branding?.body_text_color || cfg.bodyTextColor || "#334155";
  const pageBackground = branding?.page_background || "#FFFFFF";
  const sectionBackground = branding?.section_background || "#F8FAFC";
  const borderColor = branding?.border_color || "#E2E8F0";
  const accentColor = branding?.accent_color || cfg.accentColor || "#4F46E5";
  const successColor = branding?.success_color || "#16A34A";
  const warningColor = branding?.warning_color || "#D97706";
  const errorColor = branding?.error_color || "#DC2626";
  const logoPlacement = branding?.logo_placement || "LEFT";
  const logoSize = branding?.logo_size || "MEDIUM";
  const hospitalLogoUrl = branding?.hospital_logo_url;
  const style = cfg.style || "classic";
  const headerStyle = cfg.headerStyle || "institutional_banner";
  const medLayout = cfg.medicationLayout || "table";

  const hospitalName =
    customHeaderText?.trim() || "Kedar Multispecialty Hospital & Research Center";
  const footerHelpline =
    customFooterNotes?.trim() || "Emergency 24x7 Helpline: +91 44 2252 1100";

  // Sample Medications for RxPad
  const sampleDrugs = [
    {
      name: "Metformin HCl 500mg",
      brand: "Glyciphage 500",
      strength: "500 mg",
      form: "Tablet",
      dose: "1 tablet",
      frequency: "Twice daily (1-0-1)",
      route: "Oral",
      timing: "Morning / Night",
      duration: "30 Days",
      qty: "60 tabs",
      food: "After Food",
      refills: 2,
      instructions: "Take with breakfast and dinner to minimize gastric irritation.",
    },
    {
      name: "Telmisartan 40mg",
      brand: "Telma 40",
      strength: "40 mg",
      form: "Tablet",
      dose: "1 tablet",
      frequency: "Once daily (1-0-0)",
      route: "Oral",
      timing: "Morning",
      duration: "30 Days",
      qty: "30 tabs",
      food: "After Food",
      refills: 3,
      instructions: "Regular BP monitoring. Avoid abrupt discontinuation.",
    },
    {
      name: "Pantoprazole 40mg",
      brand: "Pan 40",
      strength: "40 mg",
      form: "Tablet",
      dose: "1 tablet",
      frequency: "Once daily (1-0-0)",
      route: "Oral",
      timing: "Morning",
      duration: "15 Days",
      qty: "15 tabs",
      food: "Before Food",
      refills: 0,
      instructions: "Take 30 minutes before morning breakfast with water.",
    },
  ];

  // Render Prescription Sheet Body
  const renderRxBody = () => {
    return (
      <div className="space-y-4">
        {/* Vitals Summary Pill Bar */}
        {(cfg.showVitalsSummary || cfg.showFullVitals || style === "modern" || style === "gp_focus") && (
          <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px]">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Activity className="w-3 h-3 text-rose-500" /> Vitals:
            </span>
            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-semibold text-slate-800">
              BP: 128/84 mmHg
            </span>
            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-semibold text-slate-800">
              Pulse: 74 bpm
            </span>
            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-semibold text-slate-800">
              SpO2: 98%
            </span>
            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-semibold text-slate-800">
              Temp: 98.6°F
            </span>
            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-semibold text-slate-800">
              Weight: 68 kg
            </span>
          </div>
        )}

        {/* Allergy Alert */}
        {cfg.showAllergyAlert && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-800 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              <strong>Allergy Alert:</strong> Penicillins (Mild rash in 2021) • Ciprofloxacin: None
            </span>
          </div>
        )}

        {/* Chronic Care Targets */}
        {cfg.showClinicalTargets && (
          <div className="p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl text-[10px] text-cyan-900 space-y-1">
            <span className="font-bold flex items-center gap-1 text-cyan-800">
              <HeartPulse className="w-3.5 h-3.5 text-cyan-600" /> Chronic Disease Clinical Targets:
            </span>
            <div className="grid grid-cols-3 gap-2 pt-1 font-medium">
              <div>Target BP: &lt; 130/80 mmHg</div>
              <div>Target HbA1c: &lt; 7.0%</div>
              <div>LDL-C: &lt; 70 mg/dL</div>
            </div>
          </div>
        )}

        {/* Medication Layout Variations */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-emerald-600" /> Prescribed Medications (Rx)
            </span>
            <span className="text-[9px] font-mono text-slate-400 uppercase">
              Layout: {medLayout}
            </span>
          </div>

          {/* 1. TABLE LAYOUT (Classic, Detailed, GP, Specialist) */}
          {(medLayout === "table" || medLayout === "chronic_table") && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-[10px] text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2.5">#</th>
                    <th className="py-2 px-2.5">Medicine & Strength</th>
                    <th className="py-2 px-2.5">Dose</th>
                    <th className="py-2 px-2.5">Frequency</th>
                    <th className="py-2 px-2.5">Duration</th>
                    {medLayout === "chronic_table" && <th className="py-2 px-2.5">Refills</th>}
                    <th className="py-2 px-2.5">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {sampleDrugs.map((d, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="py-2 px-2.5 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-2.5">
                        <span className="font-bold text-slate-900">{d.name}</span>
                        <div className="text-[9px] text-slate-500">{d.brand} ({d.form})</div>
                      </td>
                      <td className="py-2 px-2.5 font-semibold text-indigo-700">{d.dose}</td>
                      <td className="py-2 px-2.5">{d.frequency}</td>
                      <td className="py-2 px-2.5">{d.duration}</td>
                      {medLayout === "chronic_table" && (
                        <td className="py-2 px-2.5 font-bold text-cyan-700">{d.refills} refills</td>
                      )}
                      <td className="py-2 px-2.5 text-slate-600">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[9px] mr-1">
                          {d.food}
                        </span>
                        {d.instructions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 2. MODERN CARDS LAYOUT */}
          {(medLayout === "cards" || medLayout === "dosing_cards") && (
            <div className="space-y-2">
              {sampleDrugs.map((d, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px]"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900 text-xs">{d.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 font-medium text-slate-600">
                        {d.brand}
                      </span>
                    </div>
                    <p className="text-slate-500 pl-7">{d.instructions}</p>
                  </div>
                  <div className="flex items-center gap-2 pl-7 sm:pl-0 shrink-0">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-semibold">
                      {d.frequency}
                    </span>
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md font-semibold">
                      {d.food}
                    </span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-medium">
                      {d.duration}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. CONDENSED ROWS LAYOUT (Minimal OPD) */}
          {medLayout === "condensed_rows" && (
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-[10px]">
              {sampleDrugs.map((d, idx) => (
                <div key={idx} className="flex items-start justify-between border-b border-slate-100 pb-1.5 last:border-b-0 last:pb-0">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900">
                      {idx + 1}. {d.name} ({d.form})
                    </span>
                    <span className="text-slate-500 block text-[9px]">{d.instructions}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-semibold text-slate-800">{d.frequency}</span>
                    <span className="text-slate-400 block text-[9px]">{d.duration} • {d.food}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. PRIORITY BLOCKS LAYOUT (Emergency) */}
          {medLayout === "priority_blocks" && (
            <div className="space-y-2">
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="text-[9px] font-bold uppercase text-rose-700 tracking-wider block mb-1">
                  Immediate / STAT Injections
                </span>
                <div className="text-[10px] text-slate-800 font-medium">
                  • <strong>Inj. Pantoprazole 40mg IV STAT</strong> — Administered in Emergency Bay 2
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[10px]">
                <span className="text-[9px] font-bold uppercase text-slate-600 tracking-wider block">
                  Discharge Oral Regimen
                </span>
                {sampleDrugs.slice(0, 2).map((d, idx) => (
                  <div key={idx} className="text-slate-800">
                    {idx + 1}. <strong>{d.name}</strong> — {d.dose} {d.frequency} for {d.duration} ({d.food})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Doctor Digital Signature & Verification Box */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-end justify-between gap-4 text-[10px]">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <ShieldCheck className="w-4 h-4" /> Cryptographically Verified Prescription
            </div>
            <div className="text-[9px] font-mono text-slate-400">
              Hash: SHA256:7b9a4c8f01e2...VERIFIED
            </div>
            <div className="text-[9px] text-slate-500">
              Valid for dispensing at any licensed hospital/retail pharmacy across India.
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="w-24 border-b border-slate-400 pb-1 font-bold text-slate-800 text-[11px]">
              Dr. Senthil Nathan
            </div>
            <div className="text-[9px] text-slate-500">MBBS, MD (General Medicine)</div>
            <div className="text-[9px] font-mono font-semibold text-slate-600">Reg: TMC-64829</div>
          </div>
        </div>
      </div>
    );
  };

  // Render Clinical Consultation Report Body
  const renderReportBody = () => {
    return (
      <div className="space-y-4">
        {/* Vitals Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Blood Pressure</span>
            <span className="font-bold text-slate-900 text-xs">128/84 mmHg</span>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Heart Rate</span>
            <span className="font-bold text-slate-900 text-xs">74 bpm</span>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Temperature</span>
            <span className="font-bold text-slate-900 text-xs">98.6°F</span>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[9px] text-slate-500 block uppercase font-semibold">SpO2</span>
            <span className="font-bold text-emerald-700 text-xs">99% Room Air</span>
          </div>
        </div>

        {/* Chief Complaint & HPI */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 text-[10px]">
          <span className="font-bold text-slate-900 uppercase text-[9px] tracking-wider block" style={{ color: primaryColor }}>
            1. Chief Complaint & History of Present Illness
          </span>
          <p className="text-slate-800 font-medium">
            Recurrent mild evening headaches, generalized fatigue, and postprandial glycemic spikes for 2 weeks.
          </p>
          <p className="text-slate-600 text-[9px]">
            HPI: Throbbing sensation localized to occipital region. Non-responsive to over-the-counter analgesics. Mild bilateral pedal fullness noted in evening hours.
          </p>
        </div>

        {/* Physical Examination */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 text-[10px]">
          <span className="font-bold text-slate-900 uppercase text-[9px] tracking-wider block" style={{ color: primaryColor }}>
            2. Systematic Physical Examination
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
            <div>• <strong>General:</strong> Alert, oriented, afebrile, well hydrated. No pallor/icterus.</div>
            <div>• <strong>CVS:</strong> S1, S2 heard normal rhythm. No murmurs or gallop.</div>
            <div>• <strong>Respiratory:</strong> Normal vesicular breath sounds. Bilateral lung bases clear.</div>
            <div>• <strong>Abdomen:</strong> Soft, non-tender, no organomegaly. Bowel sounds normal.</div>
          </div>
        </div>

        {/* Diagnoses */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-[10px]">
          <span className="font-bold text-slate-900 uppercase text-[9px] tracking-wider block" style={{ color: primaryColor }}>
            3. Clinical Impression & ICD-10 Diagnoses
          </span>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg font-bold">
              <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[9px]">PRIMARY</span>
              Essential (primary) hypertension [ICD-10: I10]
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-medium">
              <span className="px-1.5 py-0.2 bg-slate-400 text-white rounded text-[9px]">SECONDARY</span>
              Type 2 diabetes mellitus without complications [ICD-10: E11.9]
            </span>
          </div>
        </div>

        {/* Assessment & Treatment Plan */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 text-[10px]">
          <span className="font-bold text-slate-900 uppercase text-[9px] tracking-wider block" style={{ color: primaryColor }}>
            4. Clinical Management & Action Plan
          </span>
          <p className="text-slate-700">
            • Continue Metformin 500mg twice daily with meals. Added Telmisartan 40mg once daily for BP normalization.
          </p>
          <p className="text-slate-700">
            • Dietary counseling: DASH dietary protocol with &lt; 2g sodium intake daily.
          </p>
          <p className="text-slate-700">
            • Diagnostic investigation: Repeat fasting blood sugar and HbA1c in 12 weeks.
          </p>
        </div>

        {/* Clinician Signoff */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px]">
          <div>
            <span className="font-semibold text-slate-700">Next Follow-up Review:</span>
            <span className="text-slate-900 font-bold ml-1.5">05 Dec 2026 (4 Weeks)</span>
          </div>
          <div className="text-right">
            <span className="font-bold text-slate-900 block text-[11px]">Dr. Senthil Nathan</span>
            <span className="text-slate-500 text-[9px]">Attending Physician • Reg: TMC-64829</span>
          </div>
        </div>
      </div>
    );
  };

  // Full Sample Document Card
  const renderDocumentContent = (isFullModal = false) => {
    const logoSizeClass = logoSize === "SMALL" ? "w-8 h-8" : logoSize === "LARGE" ? "w-14 h-14" : "w-10 h-10";

    return (
      <div
        className={`border rounded-2xl p-5 shadow-xs space-y-4 text-xs font-sans transition-all duration-200 ${
          isFullModal ? "max-w-3xl mx-auto border-slate-300 p-8 shadow-xl" : "border-slate-200"
        }`}
        style={{ backgroundColor: pageBackground, color: bodyTextColor, borderColor: borderColor }}
      >
        {/* Dynamic Header with Institutional Logo & OH-ID Central Brand */}
        <div
          className="p-4 rounded-xl text-white shadow-2xs space-y-3"
          style={{ backgroundColor: primaryColor }}
        >
          {/* Top Bar: Official OH-ID Global Brand Indicator */}
          <div className="flex items-center justify-between border-b border-white/15 pb-2 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-white text-indigo-900 flex items-center justify-center font-extrabold text-[10px] shadow-xs">
                OH
              </span>
              <span className="font-bold tracking-wider uppercase text-white/95">OneHealth ID Verified Clinical Document</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-mono text-[9px] font-bold">
                {style.toUpperCase()}
              </span>
              <span className="text-[9px] text-white/80">NABH Accredited</span>
            </div>
          </div>

          {/* Hospital Identity Header with Configurable Placement & Size */}
          <div
            className={`flex items-center gap-3 ${
              logoPlacement === "CENTER"
                ? "flex-col justify-center text-center"
                : logoPlacement === "RIGHT"
                ? "flex-row-reverse justify-between text-left"
                : "flex-row justify-between text-left"
            }`}
          >
            <div
              className={`flex items-center gap-3 ${
                logoPlacement === "CENTER" ? "flex-col text-center" : "flex-row"
              }`}
            >
              {showHospitalLogo && (
                hospitalLogoUrl ? (
                  <img
                    src={hospitalLogoUrl}
                    alt="Hospital Logo"
                    className={`${logoSizeClass} object-contain rounded-xl bg-white p-1 border border-white/20 shadow-xs shrink-0`}
                  />
                ) : (
                  <div
                    className={`${logoSizeClass} rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center font-bold text-white shrink-0 border border-white/20 shadow-xs`}
                  >
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                )
              )}
              <div>
                <h4 className="font-bold text-sm tracking-tight text-white leading-tight">{hospitalName}</h4>
                <p className="text-[10px] text-white/80 mt-0.5">
                  {template.name} • {documentType === "PRESCRIPTION" ? "Digital RxPad Outpatient Record" : "Clinical Consultation Encounter Summary"}
                </p>
              </div>
            </div>

            {logoPlacement !== "CENTER" && (
              <div className="text-right text-[10px] text-white/80 shrink-0 hidden sm:block">
                <div className="font-semibold text-white">Facility ID: {template.id?.slice(0, 10)}</div>
                <div className="text-[9px] text-white/70">Department of Outpatient Services</div>
              </div>
            )}
          </div>
        </div>

        {/* Patient Demographic Strip */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 px-3 rounded-xl text-[10px] border text-slate-700"
          style={{ backgroundColor: sectionBackground, borderColor: borderColor }}
        >
          <div>
            <span className="text-slate-400 block text-[9px]">Patient Name</span>
            <span className="font-bold text-slate-900">Alice Smith</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px]">Age / Gender</span>
            <span className="font-semibold text-slate-800">32 Y / Female</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px]">OneHealth ID</span>
            <span className="font-mono font-bold text-indigo-700">OHID-IND-2026-01001</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px]">Encounter Date</span>
            <span className="font-semibold text-slate-800">05 Nov 2026</span>
          </div>
        </div>

        {/* Dynamic Body */}
        {documentType === "PRESCRIPTION" ? renderRxBody() : renderReportBody()}

        {/* Institutional Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-medium">
          <div>{footerHelpline}</div>
          <div className="flex items-center gap-1 font-mono">
            <QrCode className="w-3 h-3 text-slate-500" />
            <span>Scan QR for ABDM Health Record</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2 mt-3">
      {/* Mini Preview Header Controls */}
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 px-1">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          Live Sample Preview: <span className="font-bold text-slate-900">{template.name}</span>
        </span>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3 h-3" /> Expand Full View
        </button>
      </div>

      {/* Embedded Live Preview Canvas (Scrollable for compact space) */}
      <div className="max-h-[380px] overflow-y-auto rounded-2xl border border-slate-200 shadow-2xs bg-slate-100/50 p-2">
        {renderDocumentContent(false)}
      </div>

      {/* Full Modal Viewer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {documentType === "PRESCRIPTION" ? (
                    <Pill className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {template.name} ({template.category || "General"})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Full-scale sample preview of facility-wide default document formatting
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable A4 Canvas) */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60">
              {renderDocumentContent(true)}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  This layout will automatically format prescriptions & clinical reports for all doctors in this hospital.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

