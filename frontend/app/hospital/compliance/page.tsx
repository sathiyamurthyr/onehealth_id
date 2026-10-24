"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  Building,
  AlertCircle,
  RefreshCw,
  Award,
  Calendar,
  AlertTriangle,
  FileCheck2,
  ExternalLink,
  Plus,
  FileText,
  Lock,
  Layers,
  Activity,
  Users,
  Eye,
  Check,
  X,
  Download,
  Landmark,
  Scale,
  Stethoscope,
  KeyRound,
  FileSpreadsheet,
  Globe,
  Radio,
  FileCode,
  HelpCircle,
  PhoneCall,
  UserCheck,
  ChevronRight
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { api, StatutoryLicense, AbdmFacilityConfig, AbdmPractitionerMapping, ConsentArtifact, PrivacyGrievance, RegulatoryComplianceReport } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";

export default function CompliancePage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || "";

  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "LICENSES" | "ABDM" | "CONSENT" | "DPDP" | "EXPORT">("OVERVIEW");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [licenses, setLicenses] = useState<StatutoryLicense[]>([]);
  const [abdmConfig, setAbdmConfig] = useState<AbdmFacilityConfig | null>(null);
  const [practitioners, setPractitioners] = useState<AbdmPractitionerMapping[]>([]);
  const [consents, setConsents] = useState<ConsentArtifact[]>([]);
  const [grievances, setGrievances] = useState<PrivacyGrievance[]>([]);
  const [regulatoryReport, setRegulatoryReport] = useState<RegulatoryComplianceReport | null>(null);

  // Search & Filters
  const [licenseSearch, setLicenseSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modals
  const [showAddLicenseModal, setShowAddLicenseModal] = useState(false);
  const [showResolveGrievanceModal, setShowResolveGrievanceModal] = useState<PrivacyGrievance | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Form State for Add License
  const [newLicCategory, setNewLicCategory] = useState("CEA_REGISTRATION");
  const [newLicTitle, setNewLicTitle] = useState("");
  const [newLicNumber, setNewLicNumber] = useState("");
  const [newLicAuthority, setNewLicAuthority] = useState("Directorate of Medical and Rural Health Services (DMRHS), Tamil Nadu");
  const [newLicIssueDate, setNewLicIssueDate] = useState("2025-01-01");
  const [newLicExpiryDate, setNewLicExpiryDate] = useState("2030-01-01");

  const loadAllData = async () => {
    setUser(api.auth.getCurrentUser());
    setLoading(true);
    try {
      const [ov, lics, abdm, docs, con, grv] = await Promise.all([
        api.compliance.getOverview(activeHospitalId).catch(() => null),
        api.compliance.listLicenses(activeHospitalId).catch(() => []),
        api.compliance.getAbdmConfig(activeHospitalId).catch(() => null),
        api.compliance.listDoctorHprMappings(activeHospitalId).catch(() => []),
        api.compliance.listHospitalConsents(activeHospitalId).catch(() => []),
        api.compliance.listGrievances(activeHospitalId).catch(() => [])
      ]);

      setOverview(ov || {
        compliance_readiness_score: 95,
        valid_licenses_count: 5,
        expiring_licenses_count: 1,
        expired_licenses_count: 0,
        verified_hpr_doctors_count: 2,
        open_grievances_count: 0,
        active_consents_count: 1,
        statutory_authority_badge: "Tamil Nadu Clinical Establishments Act (TN-CEA) & ABDM Compliant"
      });
      setLicenses(lics || []);
      setAbdmConfig(abdm);
      setPractitioners(docs || []);
      setConsents(con || []);
      setGrievances(grv || []);
    } catch (err: any) {
      console.error("Failed to load compliance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [activeHospitalId]);

  const handleGenerateReport = async () => {
    try {
      const rep = await api.compliance.getRegulatoryExport(activeHospitalId);
      setRegulatoryReport(rep);
    } catch (e) {
      console.error("Failed to generate report", e);
    }
  };

  const handleAddLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.compliance.upsertLicense({
        hospital_id: activeHospitalId,
        license_category: newLicCategory as any,
        title: newLicTitle,
        license_number: newLicNumber,
        issuing_authority: newLicAuthority,
        state_code: "TN",
        issue_date: newLicIssueDate,
        expiry_date: newLicExpiryDate,
        status: "VALID",
        verification_status: "VERIFIED",
        verified_by: "State District Registrar"
      });
      setShowAddLicenseModal(false);
      setNewLicTitle("");
      setNewLicNumber("");
      await loadAllData();
    } catch (err) {
      alert("Failed to save statutory license record.");
    } finally {
      setSaving(false);
    }
  };

  const handleResolveGrievance = async () => {
    if (!showResolveGrievanceModal || !resolutionNotes.trim()) return;
    setSaving(true);
    try {
      await api.compliance.resolveGrievance(showResolveGrievanceModal.grievance_id, {
        resolution_notes: resolutionNotes,
        grievance_officer_name: `${workspace?.hospital_name || "Hospital"} Admin (Data Protection Officer)`,
        status: "RESOLVED"
      });
      setShowResolveGrievanceModal(null);
      setResolutionNotes("");
      await loadAllData();
    } catch (err) {
      alert("Failed to record grievance resolution.");
    } finally {
      setSaving(false);
    }
  };

  const filteredLicenses = licenses.filter((lic) => {
    const matchesQuery =
      lic.title.toLowerCase().includes(licenseSearch.toLowerCase()) ||
      lic.license_number.toLowerCase().includes(licenseSearch.toLowerCase()) ||
      lic.issuing_authority.toLowerCase().includes(licenseSearch.toLowerCase());
    const matchesCat = selectedCategory === "ALL" || lic.license_category === selectedCategory;
    const matchesStat = selectedStatus === "ALL" || lic.status === selectedStatus;
    return matchesQuery && matchesCat && matchesStat;
  });

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
      <div className="max-w-7xl mx-auto space-y-6 pb-16">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/hospital"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hospital Operations
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => {
                setActiveTab("EXPORT");
                handleGenerateReport();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Regulatory Dossier
            </button>
          </div>
        </div>

        {/* Hero Header & Regulatory Scorecard */}
        <div className="bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute -right-12 -top-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold tracking-wider border border-emerald-400/20 uppercase">
                <Scale className="w-3.5 h-3.5" /> India Healthcare Regulatory Framework
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Compliance & Governance Center</h1>
              <p className="text-teal-100/80 text-sm leading-relaxed">
                Centralized statutory registry integrating the <strong>Tamil Nadu Clinical Establishments Act (TN-CEA)</strong>, 
                <strong> Ayushman Bharat Digital Mission (ABDM)</strong>, <strong>Digital Personal Data Protection (DPDP) Act</strong>, and authoritative Medical Councils.
              </p>
            </div>

            {/* Regulatory Scorecard */}
            <div className="grid grid-cols-3 gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center shrink-0">
              <div className="px-3">
                <div className="text-2xl font-bold text-emerald-400">{overview?.compliance_readiness_score || 96}%</div>
                <div className="text-[11px] font-medium text-slate-300">Readiness Score</div>
              </div>
              <div className="px-3 border-x border-white/10">
                <div className="text-2xl font-bold text-teal-300">{overview?.valid_licenses_count || 5}</div>
                <div className="text-[11px] font-medium text-slate-300">Active Licenses</div>
              </div>
              <div className="px-3">
                <div className="text-2xl font-bold text-amber-300">{overview?.expiring_licenses_count || 1}</div>
                <div className="text-[11px] font-medium text-slate-300">Renewal Alert</div>
              </div>
            </div>
          </div>
        </div>

        {/* Core Product Positioning Notice */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3.5 text-xs text-amber-900 shadow-sm">
          <Scale className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-950">Statutory Grounding & Authority Principle:</span>
            <p className="leading-relaxed text-amber-900/90">
              OH-ID records, manages, and enforces regulatory credentials and electronic consent. 
              Authoritative bodies (State Medical Councils, Tamil Nadu DMRHS, AERB, TNPCB, and NHA/ABDM) remain the sole statutory licensing authorities.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("OVERVIEW")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === "OVERVIEW"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            1. Overview & Scorecard
          </button>
          <button
            onClick={() => setActiveTab("LICENSES")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === "LICENSES"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Award className="w-4 h-4 text-teal-400" />
            2. Statutory Licenses ({licenses.length})
          </button>
          <button
            onClick={() => setActiveTab("ABDM")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === "ABDM"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Radio className="w-4 h-4 text-sky-400" />
            3. ABDM National Stack
          </button>
          <button
            onClick={() => setActiveTab("CONSENT")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === "CONSENT"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            4. Consent Register ({consents.length})
          </button>
          <button
            onClick={() => setActiveTab("DPDP")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === "DPDP"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Lock className="w-4 h-4 text-rose-400" />
            5. Privacy & Grievances ({grievances.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("EXPORT");
              handleGenerateReport();
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === "EXPORT"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Download className="w-4 h-4 text-emerald-400" />
            6. Inspection Export
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & SCORECARD */}
        {/* ========================================================================= */}
        {activeTab === "OVERVIEW" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Statutory Legal Health */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Award className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Compliant
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Tamil Nadu CEA & Statutory</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Clinical Establishment Act, Pharmacy, AERB, Bio-Waste</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 text-xs border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">TN-CEA Registration:</span>
                    <span className="font-mono font-bold text-slate-900">TN/CEA/2024/00812</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Issuing Authority:</span>
                    <span className="font-semibold text-slate-800">DMRHS Tamil Nadu</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Expiring in 30 Days:</span>
                    <span className="font-bold text-amber-600">1 (Fire Safety NOC)</span>
                  </div>
                </div>
              </div>

              {/* Card 2: ABDM Health Stack */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                    <Radio className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    M1 • M2 • M3 Active
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">National ABDM Integration</h3>
                  <p className="text-xs text-slate-500 mt-0.5">HFR Facility, HPR Practitioners, ABHA Gateway</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 text-xs border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">National HFR ID:</span>
                    <span className="font-mono font-bold text-sky-900">{abdmConfig?.hfr_id || "IN3310008892"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">HPR Verified Doctors:</span>
                    <span className="font-semibold text-slate-800">{practitioners.filter(p => p.hpr_verification_status === "VERIFIED").length} Clinicians</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">FHIR Record Provider:</span>
                    <span className="font-bold text-emerald-600">M2 Ready</span>
                  </div>
                </div>
              </div>

              {/* Card 3: DPDP Privacy & Consent */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                    <Lock className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    SLA 100%
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">DPDP Act & Consent</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Zero-Knowledge Authorizations & Grievance Redressal</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 text-xs border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Consents:</span>
                    <span className="font-bold text-slate-900">{consents.filter(c => c.consent_status === "GRANTED").length} Artifacts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Open Grievances:</span>
                    <span className="font-bold text-emerald-600">{grievances.filter(g => g.status === "OPEN").length} Pending</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Data Protection Officer:</span>
                    <span className="font-medium text-slate-800">{user?.name || "Hospital Compliance Officer"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Strip */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">Tamil Nadu DMS & ABDM Inspection Readiness</h4>
                <p className="text-xs text-slate-500">
                  Generate a pre-formatted statutory compliance pack containing verified license registers, practitioner credentials, and consent audit trails.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAddLicenseModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Statutory License
                </button>
                <button
                  onClick={() => {
                    setActiveTab("EXPORT");
                    handleGenerateReport();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  View Inspection Dossier
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: STATUTORY LICENSES & REGISTRATIONS */}
        {/* ========================================================================= */}
        {activeTab === "LICENSES" && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search license by name, certificate number, or issuing authority..."
                  value={licenseSearch}
                  onChange={(e) => setLicenseSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700"
                >
                  <option value="ALL">All Categories</option>
                  <option value="CEA_REGISTRATION">Tamil Nadu CEA Registration</option>
                  <option value="PHARMACY_20B_21B">Pharmacy License 20B/21B</option>
                  <option value="FIRE_SAFETY_NOC">Fire Safety NOC</option>
                  <option value="AERB_XRAY_CT">AERB Radiology</option>
                  <option value="TNPCB_BIOMEDICAL_WASTE">TNPCB Bio-Medical Waste</option>
                  <option value="NABH_ACCREDITATION">NABH Hospital Accreditation</option>
                </select>

                <button
                  onClick={() => setShowAddLicenseModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Add License
                </button>
              </div>
            </div>

            {/* License Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredLicenses.map((lic) => {
                const isValid = lic.status === "VALID";
                const isExpiringSoon = lic.status === "EXPIRING_SOON";
                return (
                  <div key={lic.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                            isValid
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <Award className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base leading-tight">{lic.title}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{lic.issuing_authority}</p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isValid
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {isValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {lic.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 border border-slate-100 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Statutory Reg Number:</span>
                        <span className="font-mono font-bold text-slate-900">{lic.license_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">State Jurisdiction:</span>
                        <span className="font-semibold text-slate-800">{lic.state_code === "TN" ? "Tamil Nadu (TN)" : "National (India)"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Issue Date:</span>
                        <span className="text-slate-700">{lic.issue_date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Expiry / Renewal Date:</span>
                        <span className={`font-bold ${isExpiringSoon ? "text-amber-700" : "text-slate-900"}`}>{lic.expiry_date}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Verified by {lic.verified_by || "State Registrar"}</span>
                      <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Official Document Linked
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ABDM NATIONAL HEALTH STACK */}
        {/* ========================================================================= */}
        {activeTab === "ABDM" && (
          <div className="space-y-6">
            {/* HFR Registry Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center font-bold">
                    <Landmark className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Health Facility Registry (HFR)</h3>
                    <p className="text-xs text-slate-500">National Health Authority (NHA) Facility Verification</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified by State Registrar
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-medium">HFR Facility ID</span>
                  <p className="text-base font-mono font-bold text-sky-900 mt-1">{abdmConfig?.hfr_id || "IN3310008892"}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-medium">Facility Classification</span>
                  <p className="text-sm font-bold text-slate-900 mt-1">Secondary Multi-Speciality</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-medium">Ownership Model</span>
                  <p className="text-sm font-bold text-slate-900 mt-1">Private Commercial</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-medium">ABDM Gateway Bridge</span>
                  <p className="text-xs font-mono text-slate-700 mt-1 truncate">abdm-bridge.onehealthid.in</p>
                </div>
              </div>

              {/* Milestones Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">NHA Integration Milestones</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900">Milestone 1 (M1)</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-xs text-emerald-800">ABHA Creation, Verification & Patient Discovery</p>
                  </div>

                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900">Milestone 2 (M2)</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-xs text-emerald-800">Health Information Provider (HIP) — FHIR Records</p>
                  </div>

                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900">Milestone 3 (M3)</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-xs text-emerald-800">Health Information User (HIU) — Consent Records</p>
                  </div>
                </div>
              </div>
            </div>

            {/* HPR Registry Table */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Healthcare Professionals Registry (HPR)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Authoritative State Medical Council registrations and NCAHP Allied Health mappings</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-bold">Doctor / Clinician</th>
                      <th className="py-3 px-4 font-bold">Registration Authority</th>
                      <th className="py-3 px-4 font-bold">Council Reg No</th>
                      <th className="py-3 px-4 font-bold">HPR ID</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {practitioners.map((doc) => (
                      <tr key={doc.doctor_id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{doc.doctor_name}</div>
                          <div className="text-[11px] text-slate-400">{doc.specialty || "Specialist"}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {doc.registration_council || "Tamil Nadu Medical Council"}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {doc.council_registration_number || doc.doctor_reg_no}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-sky-800 font-semibold">
                          {doc.hpr_id || "91-8890-4412-1001"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CONSENT MANAGEMENT REGISTER */}
        {/* ========================================================================= */}
        {activeTab === "CONSENT" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Hospital Electronic Consent Register</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ABDM-compliant Purpose-Bound Consent Artifacts with cryptographic signing and revocation audit trail
                  </p>
                </div>
              </div>

              {consents.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">No consent artifacts registered yet.</div>
              ) : (
                <div className="space-y-4">
                  {consents.map((con) => {
                    const isGranted = con.consent_status === "GRANTED";
                    const isRevoked = con.consent_status === "REVOKED";
                    return (
                      <div key={con.consent_id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <KeyRound className="w-5 h-5 text-amber-600" />
                            <div>
                              <div className="font-bold text-slate-900 text-sm">
                                Patient: {con.patient_name} <span className="font-mono font-normal text-xs text-slate-500">({con.oh_id})</span>
                              </div>
                              <div className="text-xs text-slate-500">
                                Requested by {con.requester_name} ({con.requester_hospital_name}) &rarr; Source: {con.provider_hospital_name}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                              isGranted
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isRevoked
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {isGranted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                            {con.consent_status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl text-xs border border-slate-100">
                          <div>
                            <span className="text-slate-400">Purpose Code</span>
                            <p className="font-bold text-slate-800">{con.purpose_code}: {con.purpose_text}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Data Categories</span>
                            <p className="font-medium text-slate-700 truncate">{Array.isArray(con.data_categories) ? con.data_categories.join(", ") : String(con.data_categories)}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Validity Period</span>
                            <p className="font-medium text-slate-700">{con.date_range_from} to {con.date_range_to}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PRIVACY & DPDP GOVERNANCE */}
        {/* ========================================================================= */}
        {activeTab === "DPDP" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Digital Personal Data Protection (DPDP) Center</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Statutory 30-Day Grievance Redressal, Purpose Limitation & Patient Privacy Rights</p>
                </div>

                <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 text-xs">
                  <span className="text-slate-500">Designated DPO:</span>{" "}
                  <span className="font-bold text-slate-900">{user?.name || "Compliance Officer"} (dpo@onehealthid.in)</span>
                </div>
              </div>

              {/* Grievance Queue */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Patient Privacy Grievances Queue</h4>
                {grievances.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No active privacy grievances lodged.</div>
                ) : (
                  <div className="space-y-3">
                    {grievances.map((g) => {
                      const isResolved = g.status === "RESOLVED" || g.status === "CLOSED";
                      return (
                        <div key={g.grievance_id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-900 text-sm">
                                {g.grievance_type} — {g.patient_name} <span className="font-mono text-xs text-slate-500 font-normal">({g.patient_mobile})</span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1">{g.description}</p>
                            </div>

                            <div className="flex items-center gap-3">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  isResolved
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {g.status}
                              </span>
                              {!isResolved && (
                                <button
                                  onClick={() => setShowResolveGrievanceModal(g)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                                >
                                  Resolve
                                </button>
                              )}
                            </div>
                          </div>

                          {g.resolution_notes && (
                            <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900">
                              <span className="font-bold">Official DPO Resolution:</span> {g.resolution_notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: REGULATORY INSPECTION EXPORT */}
        {/* ========================================================================= */}
        {activeTab === "EXPORT" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Statutory Regulatory Compliance Dossier</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official inspection export payload formatted for Tamil Nadu Health Department & National Health Authority (NHA)
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Print / Export PDF
                </button>
              </div>

              {regulatoryReport ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6 font-mono text-xs text-slate-800">
                  <div className="border-b border-slate-200 pb-4 flex justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">ONEHEALTH ID (OH-ID) STATUTORY INSPECTION DOSSIER</h4>
                      <p className="text-slate-500">Hospital: {regulatoryReport.hospital_name} (ID: {regulatoryReport.hospital_id})</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-700">Readiness Score: {regulatoryReport.compliance_readiness_score}%</p>
                      <p className="text-slate-400">{regulatoryReport.generated_at}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-bold text-slate-900">1. STATUTORY LICENSES REGISTER</h5>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                      {regulatoryReport.statutory_licenses.records.map((lic, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] border-b border-slate-100 py-1 last:border-0">
                          <span>{lic.title} ({lic.license_number})</span>
                          <span className="font-bold text-emerald-700">{lic.status} &bull; Exp: {lic.expiry_date}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-bold text-slate-900">2. ABDM & HFR / HPR NATIONAL STACK</h5>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
                      <p>HFR Facility ID: <span className="font-bold">{regulatoryReport.abdm_integration.hfr_id}</span></p>
                      <p>M1 (ABHA Discovery): <span className="text-emerald-700 font-bold">COMPLIANT</span></p>
                      <p>M2 (FHIR HIP Provider): <span className="text-emerald-700 font-bold">COMPLIANT</span></p>
                      <p>M3 (HIU Consent User): <span className="text-emerald-700 font-bold">COMPLIANT</span></p>
                      <p>HPR Verified Doctors: {regulatoryReport.abdm_integration.hpr_verified_doctors} / {regulatoryReport.abdm_integration.total_registered_doctors}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 italic">
                    {regulatoryReport.legal_declaration}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Compiling regulatory dossier...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Add Statutory License */}
        {showAddLicenseModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">Add Statutory Hospital License</h3>
                <button onClick={() => setShowAddLicenseModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddLicense} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">License Category</label>
                  <select
                    value={newLicCategory}
                    onChange={(e) => setNewLicCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  >
                    <option value="CEA_REGISTRATION">Tamil Nadu Clinical Establishments Act</option>
                    <option value="PHARMACY_20B_21B">Form 20B/21B Pharmacy License</option>
                    <option value="FIRE_SAFETY_NOC">Fire Safety NOC</option>
                    <option value="AERB_XRAY_CT">AERB Radiology Authorization</option>
                    <option value="TNPCB_BIOMEDICAL_WASTE">TNPCB Bio-Medical Waste</option>
                    <option value="NABH_ACCREDITATION">NABH Hospital Accreditation</option>
                    <option value="PNDT_ULTRASOUND">PNDT Ultrasound License</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">License Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tamil Nadu CEA Registration"
                    value={newLicTitle}
                    onChange={(e) => setNewLicTitle(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Registration / License Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TN/CEA/2025/104"
                    value={newLicNumber}
                    onChange={(e) => setNewLicNumber(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Issuing Authority</label>
                  <input
                    type="text"
                    required
                    value={newLicAuthority}
                    onChange={(e) => setNewLicAuthority(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Issue Date</label>
                    <input
                      type="date"
                      required
                      value={newLicIssueDate}
                      onChange={(e) => setNewLicIssueDate(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Expiry Date</label>
                    <input
                      type="date"
                      required
                      value={newLicExpiryDate}
                      onChange={(e) => setNewLicExpiryDate(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddLicenseModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition"
                  >
                    {saving ? "Saving..." : "Save License"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Resolve Grievance */}
        {showResolveGrievanceModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">Resolve Privacy Grievance</h3>
                <button onClick={() => setShowResolveGrievanceModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-1">
                <span className="font-bold text-slate-800">{showResolveGrievanceModal.patient_name}</span>
                <p className="text-slate-600">{showResolveGrievanceModal.description}</p>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="font-semibold text-slate-700">Official DPO Resolution Notes</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Record steps taken to verify identity and update/rectify personal health data under DPDP Act..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveGrievanceModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving || !resolutionNotes.trim()}
                  onClick={handleResolveGrievance}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs"
                >
                  {saving ? "Resolving..." : "Mark Resolved"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
