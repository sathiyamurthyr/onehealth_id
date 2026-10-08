"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Building,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Award,
  Users,
  UserCheck,
  Info,
  Stethoscope,
  FlaskConical,
  Pill,
  HeartPulse,
  Activity
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { api } from "@/lib/api";

const FACILITY_CATEGORIES = [
  { id: "HOSPITAL", label: "Hospital", desc: "Multi-speciality / General Hospital", icon: Building2 },
  { id: "CLINIC", label: "Clinic", desc: "Polyclinic / Outpatient Consultation Center", icon: Stethoscope },
  { id: "DIAGNOSTIC_CENTRE", label: "Diagnostic Centre", desc: "Imaging & Radiology Diagnostic Facility", icon: Activity },
  { id: "LABORATORY", label: "Laboratory", desc: "Pathology & Clinical Testing Center", icon: FlaskConical },
  { id: "PHARMACY", label: "Pharmacy", desc: "Retail or Hospital Dispensing Pharmacy", icon: Pill },
  { id: "OTHER", label: "Other Healthcare Facility", desc: "Rehab, Nursing Home or Daycare Unit", icon: HeartPulse },
];

const STEPS = [
  { id: 1, title: "Facility Category & Identity", desc: "Healthcare type, legal name & location" },
  { id: 2, title: "Initial Hospital Admin", desc: "Admin contact & invitation provisioning" },
];

export default function SuperAdminNewHospitalPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Success Modal State
  const [createdHospitalResult, setCreatedHospitalResult] = useState<any>(null);

  // Form State (Minimal Onboarding)
  const [form, setForm] = useState({
    // Step 1: Facility Identity
    facility_type: "HOSPITAL",
    legal_name: "",
    display_name: "",
    code: "",
    primary_contact_name: "",
    primary_mobile: "+91 ",
    registered_email: "",
    country: "India",
    state: "Tamil Nadu",
    city: "Chennai",
    address: "",
    pin: "600125",
    registration_number: "",
    registration_authority: "Directorate of Medical Services (DMS)",
    registration_expiry: "2030-12-31",

    // Step 2: Initial Hospital Admin
    admin_first_name: "",
    admin_last_name: "",
    admin_mobile: "+91 ",
    admin_email: "",
    admin_designation: "Hospital Administrator / Medical Director",
  });

  const updateField = (field: string, val: any) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const validateStep = (step: number): boolean => {
    setErrorMsg(null);
    if (step === 1) {
      if (!form.legal_name.trim()) {
        setErrorMsg("Please enter the Legal Facility / Hospital Name.");
        return false;
      }
      if (!form.primary_mobile.trim() || form.primary_mobile.length < 8) {
        setErrorMsg("Please provide a valid Primary Contact Mobile Number.");
        return false;
      }
      if (!form.registered_email.trim() || !form.registered_email.includes("@")) {
        setErrorMsg("Please provide a valid Official Email Address.");
        return false;
      }
      if (!form.city.trim()) {
        setErrorMsg("Please enter the City.");
        return false;
      }
    } else if (step === 2) {
      if (!form.admin_first_name.trim() || !form.admin_last_name.trim()) {
        setErrorMsg("Please enter the Hospital Administrator's First and Last Name.");
        return false;
      }
      if (!form.admin_mobile.trim() || form.admin_mobile.length < 8) {
        setErrorMsg("Please enter the Hospital Administrator's Mobile Number.");
        return false;
      }
      if (!form.admin_email.trim() || !form.admin_email.includes("@")) {
        setErrorMsg("Please enter the Hospital Administrator's Registered Email.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      // Auto-populate admin email/phone from primary contact if not filled
      if (currentStep === 1) {
        setForm((prev) => ({
          ...prev,
          admin_email: prev.admin_email || prev.registered_email,
          admin_mobile: prev.admin_mobile && prev.admin_mobile.length > 5 ? prev.admin_mobile : prev.primary_mobile,
          admin_first_name: prev.admin_first_name || (prev.primary_contact_name.split(" ")[0] || "Admin"),
          admin_last_name: prev.admin_last_name || (prev.primary_contact_name.split(" ")[1] || "Officer"),
        }));
      }
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;
    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      facility_type: form.facility_type,
      legal_name: form.legal_name.trim(),
      display_name: form.display_name.trim() || form.legal_name.trim(),
      code: form.code.trim() || undefined,
      primary_contact_name: form.primary_contact_name.trim() || undefined,
      primary_mobile: form.primary_mobile.trim(),
      registered_email: form.registered_email.trim(),
      country: form.country.trim(),
      state: form.state.trim(),
      city: form.city.trim(),
      address: form.address.trim() || undefined,
      pin: form.pin.trim() || undefined,
      registration_number: form.registration_number.trim() || undefined,
      registration_authority: form.registration_authority.trim() || undefined,
      registration_expiry: form.registration_expiry || undefined,
      admin_first_name: form.admin_first_name.trim(),
      admin_last_name: form.admin_last_name.trim(),
      admin_mobile: form.admin_mobile.trim(),
      admin_email: form.admin_email.trim(),
      plan_tier: "ENTERPRISE",
    };

    try {
      const res = await api.superAdmin.createHospitalMinimal(payload);
      setCreatedHospitalResult(res);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create hospital facility account. Please review entries.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyInviteLink = () => {
    if (!createdHospitalResult?.invitation?.token) return;
    const url = `${window.location.origin}/invite?token=${createdHospitalResult.invitation.token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <WorkspaceLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/super-admin/hospitals"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Sathus Platform Administration &rarr; Hospital Account Creation
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Create Healthcare Facility Account
              </h1>
            </div>
          </div>
        </div>

        {/* Informational Guidance Banner */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-3 shadow-xs">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <span className="font-bold block">Minimal Super Admin Account Provisioning</span>
            <p>
              Super Admin creates the healthcare facility account and initial Hospital Admin credential invitation.
              Detailed configurations (Branches, Clinical Facilities, Departments, and Operational Workforce) are completed by the Hospital Admin upon first login.
            </p>
          </div>
        </div>

        {/* Stepper Progress */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            {STEPS.map((s) => {
              const isDone = currentStep > s.id;
              const isCurrent = currentStep === s.id;
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition shrink-0 ${
                      isDone
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                        ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <div>
                    <span
                      className={`text-xs font-bold block ${
                        isCurrent ? "text-blue-600" : isDone ? "text-slate-800" : "text-slate-400"
                      }`}
                    >
                      {s.title}
                    </span>
                    <span className="text-[11px] text-slate-400 hidden sm:block">{s.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Please Correct the Following</span>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Form Container */}
        <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          {/* STEP 1: Facility Category & Basic Identity */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">1. Healthcare Facility Category</h3>
                <p className="text-xs text-slate-500">
                  Select the type of healthcare facility being provisioned on ONE HEALTH ID.
                </p>
              </div>

              {/* Facility Category Picker */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {FACILITY_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = form.facility_type === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => updateField("facility_type", cat.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`w-5 h-5 ${isSelected ? "text-blue-600" : "text-slate-500"}`} />
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{cat.label}</span>
                        <span className="text-[10px] text-slate-500 line-clamp-1">{cat.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-200 pt-5 space-y-4">
                <h3 className="text-base font-bold text-slate-900">2. Facility Identity & Primary Contact</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Legal Facility Name *
                    </label>
                    <input
                      type="text"
                      value={form.legal_name}
                      onChange={(e) => updateField("legal_name", e.target.value)}
                      placeholder="e.g. City Care Hospital Pvt Ltd"
                      required
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Display / Trade Name
                    </label>
                    <input
                      type="text"
                      value={form.display_name}
                      onChange={(e) => updateField("display_name", e.target.value)}
                      placeholder="e.g. City Care Multispeciality Hospital"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Primary Contact Person Name
                    </label>
                    <input
                      type="text"
                      value={form.primary_contact_name}
                      onChange={(e) => updateField("primary_contact_name", e.target.value)}
                      placeholder="e.g. Dr. K. Ramesh"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Primary Mobile Number *
                    </label>
                    <input
                      type="text"
                      value={form.primary_mobile}
                      onChange={(e) => updateField("primary_mobile", e.target.value)}
                      placeholder="+91 98400 12345"
                      required
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Registered Official Email *
                    </label>
                    <input
                      type="email"
                      value={form.registered_email}
                      onChange={(e) => updateField("registered_email", e.target.value)}
                      placeholder="admin@hospital.org"
                      required
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={form.country}
                      onChange={(e) => updateField("country", e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Basic Facility Address
                    </label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      placeholder="e.g. 45, Healthcare Boulevard, Central District"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
                    />
                  </div>
                </div>
              </div>

              {/* Registration / License details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Statutory Registration Information (If Available)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Registration / License Number
                    </label>
                    <input
                      type="text"
                      value={form.registration_number}
                      onChange={(e) => updateField("registration_number", e.target.value)}
                      placeholder="e.g. CEA/TN/2020/9981"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Registration Authority
                    </label>
                    <input
                      type="text"
                      value={form.registration_authority}
                      onChange={(e) => updateField("registration_authority", e.target.value)}
                      placeholder="e.g. Directorate of Medical Services"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Initial Hospital Admin Provisioning */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Initial Clinical / Hospital Administrator</h3>
                <p className="text-xs text-slate-500">
                  Provision the primary administrator account for this hospital. A single-use invitation link will be dispatched to their registered email and mobile.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  Administrator Identity & Single-Use Invitation
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Admin First Name *
                    </label>
                    <input
                      type="text"
                      value={form.admin_first_name}
                      onChange={(e) => updateField("admin_first_name", e.target.value)}
                      placeholder="e.g. Ramesh"
                      required
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Admin Last Name *
                    </label>
                    <input
                      type="text"
                      value={form.admin_last_name}
                      onChange={(e) => updateField("admin_last_name", e.target.value)}
                      placeholder="e.g. Varma"
                      required
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Admin Registered Mobile Number *
                    </label>
                    <input
                      type="text"
                      value={form.admin_mobile}
                      onChange={(e) => updateField("admin_mobile", e.target.value)}
                      placeholder="+91 98400 12345"
                      required
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      This mobile number will be used for primary login authentication.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Admin Official Email *
                    </label>
                    <input
                      type="email"
                      value={form.admin_email}
                      onChange={(e) => updateField("admin_email", e.target.value)}
                      placeholder="admin@hospital.org"
                      required
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Invitation and activation link will be automatically emailed here.
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Official Designation
                    </label>
                    <input
                      type="text"
                      value={form.admin_designation}
                      onChange={(e) => updateField("admin_designation", e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-100/50 border border-blue-200 text-xs text-blue-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                    Zero-Trust Security & Role Scope
                  </div>
                  <p className="text-blue-900 leading-relaxed text-[11px]">
                    The Super Admin does NOT create or view passwords. The Hospital Admin receives a secure single-use token to verify their mobile number, set their password, and complete hospital configuration upon first login.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {currentStep === 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition"
              >
                Proceed to Admin Invitation
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-md transition disabled:opacity-50"
              >
                {submitting ? (
                  <>Creating Facility & Invitation...</>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Create Facility & Send Invitation
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* CREATION SUCCESS MODAL */}
        {createdHospitalResult && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-slate-900">Healthcare Facility Created!</h3>
                <p className="text-xs text-slate-500">
                  <strong>{createdHospitalResult.hospital_name}</strong> ({createdHospitalResult.facility_type}) has been registered.
                </p>
              </div>

              {/* Invitation Token Card */}
              {createdHospitalResult.invitation && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Hospital Admin Invitation Link
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      SINGLE-USE
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    An invitation was automatically dispatched to <strong>{createdHospitalResult.admin_user?.name}</strong> (
                    {createdHospitalResult.admin_user?.email} / {createdHospitalResult.admin_user?.mobile}). You can also copy the secure link:
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={
                        typeof window !== "undefined"
                          ? `${window.location.origin}/invite?token=${createdHospitalResult.invitation.token}`
                          : `/invite?token=${createdHospitalResult.invitation.token}`
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 font-mono text-slate-700 select-all"
                    />
                    <button
                      onClick={copyInviteLink}
                      className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1 shrink-0"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLink ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <Link
                  href="/super-admin/hospitals"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-center text-xs font-bold transition"
                >
                  Return to Hospitals Directory
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
