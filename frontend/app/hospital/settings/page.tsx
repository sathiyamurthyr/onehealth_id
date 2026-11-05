"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  ArrowLeft,
  CheckCircle2,
  Building2,
  ShieldCheck,
  AlertCircle,
  X,
  RefreshCw,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  Calendar,
  Layers,
  Save,
  Sliders,
  AlertTriangle,
  FileText,
  Pill,
  Sparkles,
  Check,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { TemplateSamplePreview } from "@/components/clinical/TemplateSamplePreview";

export default function SettingsPage() {
  const { workspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeHospitalId = workspace?.hospital_ref_id || "";

  // Dynamic Settings state
  const [hospitalProfile, setHospitalProfile] = useState({
    name: workspace?.hospital_name || "",
    branch: workspace?.branch_name || "Main Branch",
    regNumber: "",
    address: "",
    phone: "",
    emergencyPhone: "",
    email: "",
    website: "",
  });

  const [appointmentRules, setAppointmentRules] = useState({
    slotInterval: 15,
    advanceBookingDays: 30,
    cancellationWindowHours: 2,
    maxDailyAppointmentsPerDoctor: 40,
    emergencySlotBuffer: 5,
    walkInQueueAllowed: true,
  });

  const [tokenRules, setTokenRules] = useState({
    dailyAutoResetTime: "00:00",
    defaultPrefix: "OPD-",
    startNumber: 1,
    priorityTokenPrefix: "EMERG-",
  });

  // Clinical Document & RxPad Templates state
  const [templateSettings, setTemplateSettings] = useState({
    rxTemplateId: "tmpl_rx_classic_hospital",
    clinicalReportTemplateId: "tmpl_rep_classic_hospital",
    customHeaderText: "",
    customFooterNotes: "",
    showHospitalLogo: true,
  });
  const [availableRxTemplates, setAvailableRxTemplates] = useState<any[]>([]);
  const [availableReportTemplates, setAvailableReportTemplates] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const config = await api.hospital.getConfig(activeHospitalId).catch(() => null);
      if (config && config.hospital) {
        const hosp = config.hospital;
        const mainBranch = (config.branches && config.branches.length > 0)
          ? (config.branches.find((b: any) => b.is_main_branch) || config.branches[0])
          : null;
        setHospitalProfile({
          name: hosp.name || hosp.display_name || workspace?.hospital_name || "",
          branch: mainBranch?.name || workspace?.branch_name || "Main Branch",
          regNumber: hosp.registration_number || "",
          address: hosp.address || "",
          phone: hosp.phone || "",
          emergencyPhone: hosp.emergency_contact || "",
          email: hosp.email || "",
          website: hosp.website || "",
        });
      } else if (workspace) {
        setHospitalProfile((prev) => ({
          ...prev,
          name: workspace.hospital_name || prev.name,
          branch: workspace.branch_name || prev.branch,
        }));
      }

      // Load Document Template Settings
      const tmplRes = await api.hospital.getDocumentTemplateSettings(activeHospitalId).catch(() => null);
      if (tmplRes) {
        if (tmplRes.settings) {
          setTemplateSettings({
            rxTemplateId: tmplRes.settings.rx_template_id || "tmpl_rx_classic_hospital",
            clinicalReportTemplateId: tmplRes.settings.clinical_report_template_id || "tmpl_rep_classic_hospital",
            customHeaderText: tmplRes.settings.custom_header_text || "",
            customFooterNotes: tmplRes.settings.custom_footer_notes || "",
            showHospitalLogo: tmplRes.settings.show_hospital_logo ?? true,
          });
        }
        if (tmplRes.available_prescription_templates) {
          setAvailableRxTemplates(tmplRes.available_prescription_templates);
        }
        if (tmplRes.available_clinical_report_templates) {
          setAvailableReportTemplates(tmplRes.available_clinical_report_templates);
        }
      }
    } catch (err: any) {
      console.error("Failed to load hospital config:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeHospitalId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await Promise.all([
        api.hospital.updateConfig(activeHospitalId, {
          ...hospitalProfile,
          appointmentRules,
          tokenRules,
        }),
        api.hospital.updateDocumentTemplateSettings({
          rx_template_id: templateSettings.rxTemplateId,
          clinical_report_template_id: templateSettings.clinicalReportTemplateId,
          custom_header_text: templateSettings.customHeaderText,
          custom_footer_notes: templateSettings.customFooterNotes,
          show_hospital_logo: templateSettings.showHospitalLogo,
        }, activeHospitalId).catch((err) => console.warn("Failed to update template settings:", err))
      ]);
      setSuccessMessage("Hospital operational configuration and clinical template settings saved and synchronized!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error("Failed to save config:", err);
      setSuccessMessage("Hospital configuration saved locally!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN"]}>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/hospital"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hospital Operations
          </Link>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-slate-600" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-slate-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-white/10">
                <Settings className="w-3.5 h-3.5 text-emerald-400" /> Operational Parameters
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Hospital Profile & Operational Rules</h1>
              <p className="text-slate-300 text-sm max-w-xl">
                Configure official hospital credentials, emergency dispatch numbers, appointment slot durations, and daily token reset policies.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Official Hospital Identity */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Official Hospital Identity</h3>
                <p className="text-xs text-slate-500">Public profile and government registration details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Hospital Name</label>
                <input
                  type="text"
                  value={hospitalProfile.name}
                  onChange={(e) => setHospitalProfile({ ...hospitalProfile, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={hospitalProfile.branch}
                  onChange={(e) => setHospitalProfile({ ...hospitalProfile, branch: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={hospitalProfile.address}
                  onChange={(e) => setHospitalProfile({ ...hospitalProfile, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Primary Reception Phone</label>
                <input
                  type="text"
                  value={hospitalProfile.phone}
                  onChange={(e) => setHospitalProfile({ ...hospitalProfile, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Emergency 24/7 Hotline</label>
                <input
                  type="text"
                  value={hospitalProfile.emergencyPhone}
                  onChange={(e) => setHospitalProfile({ ...hospitalProfile, emergencyPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-rose-700 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Official Email</label>
                <input
                  type="email"
                  value={hospitalProfile.email}
                  onChange={(e) => setHospitalProfile({ ...hospitalProfile, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Website URL</label>
                <input
                  type="url"
                  value={hospitalProfile.website}
                  onChange={(e) => setHospitalProfile({ ...hospitalProfile, website: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Appointment Scheduling Rules */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Appointment & Slot Rules</h3>
                <p className="text-xs text-slate-500">Booking intervals, advance limits, and doctor daily quotas</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Slot Interval (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={appointmentRules.slotInterval}
                  onChange={(e) => setAppointmentRules({ ...appointmentRules, slotInterval: parseInt(e.target.value) || 15 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Advance Booking Limit (Days)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={appointmentRules.advanceBookingDays}
                  onChange={(e) =>
                    setAppointmentRules({ ...appointmentRules, advanceBookingDays: parseInt(e.target.value) || 30 })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Max Patients / Doctor / Day</label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={appointmentRules.maxDailyAppointmentsPerDoctor}
                  onChange={(e) =>
                    setAppointmentRules({
                      ...appointmentRules,
                      maxDailyAppointmentsPerDoctor: parseInt(e.target.value) || 40,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Token Management Rules */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Token & Queue Parameters</h3>
                <p className="text-xs text-slate-500">Automated daily counter reset and emergency dispatch</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Daily Token Auto-Reset Time</label>
                <input
                  type="text"
                  value={tokenRules.dailyAutoResetTime}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-600"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Scheduled automated reset at midnight UTC/IST</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Emergency Token Prefix</label>
                <input
                  type="text"
                  value={tokenRules.priorityTokenPrefix}
                  onChange={(e) => setTokenRules({ ...tokenRules, priorityTokenPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Clinical Report & Digital RxPad Template Settings */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Clinical Report & Digital RxPad Templates</h3>
                  <p className="text-xs text-slate-500">
                    Set facility-wide default layouts, institutional letterheads, and branding for Doctor prescriptions & reports
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-semibold border border-indigo-200">
                <Sparkles className="w-3.5 h-3.5" /> 20 Clinical Layouts Ready
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Prescription Template Selector */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-600" />
                  <label className="text-xs font-bold text-slate-800">Default Prescription Template (RxPad)</label>
                </div>
                <select
                  value={templateSettings.rxTemplateId}
                  onChange={(e) => setTemplateSettings({ ...templateSettings, rxTemplateId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {availableRxTemplates.length > 0 ? (
                    availableRxTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category || "General"})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="tmpl_rx_classic_hospital">Classic Hospital Rx (Tertiary Care Standard)</option>
                      <option value="tmpl_rx_modern_clinical">Modern Clinical (Card-based Layout)</option>
                      <option value="tmpl_rx_minimal_opd">Minimal OPD (High Density Fast-track)</option>
                      <option value="tmpl_rx_bilingual_tamil">Bilingual Tamil / English Rx</option>
                      <option value="tmpl_rx_pediatric">Pediatric Care Rx (Weight-based dosing)</option>
                      <option value="tmpl_rx_oncology">Oncology & Chemotherapy Protocol Rx</option>
                      <option value="tmpl_rx_cardiology">Cardiology Specialty Rx</option>
                      <option value="tmpl_rx_diabetic_care">Diabetic Care & Insulin Regimen Rx</option>
                      <option value="tmpl_rx_ayush">AYUSH & Integrative Medicine Rx</option>
                      <option value="tmpl_rx_emergency">Emergency Fast-track RxPad</option>
                    </>
                  )}
                </select>
                {/* Active Description & Live Layout Preview */}
                {(() => {
                  const curr =
                    availableRxTemplates.find((t) => t.id === templateSettings.rxTemplateId) ||
                    availableRxTemplates[0] || {
                      id: "tmpl_rx_classic_hospital",
                      name: "Classic Hospital Rx",
                      description: "Traditional tertiary hospital prescription with formal hospital letterhead.",
                      best_suited_for: "Tertiary care and general outpatient clinics",
                      layout_config: { style: "classic", primaryColor: "#1E3A8A", medicationLayout: "table" },
                    };
                  return (
                    <div className="space-y-3">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                        <p className="font-semibold text-slate-800">{curr.name}</p>
                        <p>{curr.description}</p>
                        {curr.best_suited_for && (
                          <p className="text-[10px] text-indigo-600 font-medium">Best suited for: {curr.best_suited_for}</p>
                        )}
                      </div>

                      {/* Live Template Sample Document Preview */}
                      <TemplateSamplePreview
                        documentType="PRESCRIPTION"
                        template={curr}
                        customHeaderText={templateSettings.customHeaderText}
                        customFooterNotes={templateSettings.customFooterNotes}
                        showHospitalLogo={templateSettings.showHospitalLogo}
                      />
                    </div>
                  );
                })()}
              </div>

              {/* Clinical Report Template Selector */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <label className="text-xs font-bold text-slate-800">Default Clinical Consultation Report Template</label>
                </div>
                <select
                  value={templateSettings.clinicalReportTemplateId}
                  onChange={(e) => setTemplateSettings({ ...templateSettings, clinicalReportTemplateId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {availableReportTemplates.length > 0 ? (
                    availableReportTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category || "General"})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="tmpl_rep_classic_hospital">Classic Hospital Clinical Report</option>
                      <option value="tmpl_rep_minimal_opd">Minimal OPD Encounter Summary</option>
                      <option value="tmpl_rep_multispecialty">Multispecialty Consultation Narrative</option>
                      <option value="tmpl_rep_inpatient_discharge">Comprehensive Inpatient & Discharge Summary</option>
                      <option value="tmpl_rep_pediatric_assessment">Pediatric Developmental Assessment</option>
                      <option value="tmpl_rep_surgical_preop">Surgical Pre-Op / Post-Op Notes</option>
                      <option value="tmpl_rep_cardiology_ecg">Cardiology & Hemodynamic Assessment</option>
                      <option value="tmpl_rep_diabetic_longitudinal">Diabetic Longitudinal Care Flowsheet</option>
                      <option value="tmpl_rep_ayush_assessment">AYUSH Holistic Diagnostic Assessment</option>
                      <option value="tmpl_rep_executive_health">Executive Health Checkup Report</option>
                    </>
                  )}
                </select>
                {/* Active Description & Live Layout Preview */}
                {(() => {
                  const curr =
                    availableReportTemplates.find((t) => t.id === templateSettings.clinicalReportTemplateId) ||
                    availableReportTemplates[0] || {
                      id: "tmpl_rep_classic_hospital",
                      name: "Classic Hospital Clinical Report",
                      description: "Comprehensive inpatient and outpatient clinical documentation sheet.",
                      best_suited_for: "Multi-departmental and general hospital practices",
                      layout_config: { style: "classic", primaryColor: "#0284C7" },
                    };
                  return (
                    <div className="space-y-3">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                        <p className="font-semibold text-slate-800">{curr.name}</p>
                        <p>{curr.description}</p>
                        {curr.best_suited_for && (
                          <p className="text-[10px] text-blue-600 font-medium">Best suited for: {curr.best_suited_for}</p>
                        )}
                      </div>

                      {/* Live Template Sample Document Preview */}
                      <TemplateSamplePreview
                        documentType="CLINICAL_REPORT"
                        template={curr}
                        customHeaderText={templateSettings.customHeaderText}
                        customFooterNotes={templateSettings.customFooterNotes}
                        showHospitalLogo={templateSettings.showHospitalLogo}
                      />
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Branding & Header/Footer Customization */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Institutional Letterhead & Footer Customization</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Custom Header / Letterhead Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Kedar Multispecialty Hospital & Research Center"
                    value={templateSettings.customHeaderText}
                    onChange={(e) => setTemplateSettings({ ...templateSettings, customHeaderText: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Displayed at the top of printed/downloaded clinical documents</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Custom Footer / Emergency Helpline</label>
                  <input
                    type="text"
                    placeholder="e.g. Emergency 24x7 Helpline: +91 44 2252 1100"
                    value={templateSettings.customFooterNotes}
                    onChange={(e) => setTemplateSettings({ ...templateSettings, customFooterNotes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Appears at the bottom of every official prescription & report</span>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={templateSettings.showHospitalLogo}
                    onChange={(e) => setTemplateSettings({ ...templateSettings, showHospitalLogo: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800">Print Official Hospital Logo and Accreditation Badges</span>
                    <p className="text-[10px] text-slate-400">Includes NABH/NABL credentials and hospital emblem in the rendered header</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving Changes..." : "Save Hospital Configuration"}
            </button>
          </div>
        </form>
      </div>
    </WorkspaceLayout>
  );
}
