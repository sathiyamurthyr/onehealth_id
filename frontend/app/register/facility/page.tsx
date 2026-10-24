"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  ShieldCheck,
  Lock,
  ArrowRight,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  Clock,
  XCircle,
  AlertTriangle,
  Hospital,
  Stethoscope,
  Info,
  RefreshCw,
  Plus,
  Trash2
} from "lucide-react";
import { api } from "@/lib/api";

interface SupportingDoc {
  title: string;
  document_type: string;
  file_name: string;
  file_url: string;
}

export default function FacilityRegistrationPage() {
  const [activeTab, setActiveTab] = useState<"register" | "track">("register");

  // Registration Form State
  const [facilityType, setFacilityType] = useState<"HOSPITAL" | "CLINIC">("HOSPITAL");
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [ownershipType, setOwnershipType] = useState("PRIVATE");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [registrationAuthority, setRegistrationAuthority] = useState("State Health Directorate / DHS");
  const [registrationDate, setRegistrationDate] = useState("");
  const [registrationExpiry, setRegistrationExpiry] = useState("");

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Chennai");
  const [state, setState] = useState("Tamil Nadu");
  const [country, setCountry] = useState("India");
  const [pinCode, setPinCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  // Authorized Representative
  const [repName, setRepName] = useState("");
  const [repDesignation, setRepDesignation] = useState("Medical Superintendent / Managing Director");
  const [repEmail, setRepEmail] = useState("");
  const [repPhone, setRepPhone] = useState("");

  // Supporting Documents
  const [documents, setDocuments] = useState<SupportingDoc[]>([
    {
      title: "Clinical Establishment Registration Certificate",
      document_type: "REGISTRATION_LICENSE",
      file_name: "clinical_establishment_license.pdf",
      file_url: "https://documents.onehealth.in/uploads/license.pdf"
    }
  ]);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocType, setNewDocType] = useState("ACCREDITATION");
  const [newDocFileName, setNewDocFileName] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedApp, setSubmittedApp] = useState<{
    application_ref: string;
    hospital_id: string;
    name: string;
    facility_type: string;
    status: string;
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Status Tracking State
  const [searchRef, setSearchRef] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [trackedStatus, setTrackedStatus] = useState<any | null>(null);

  // Additional Information submission state
  const [updateAddress, setUpdateAddress] = useState("");
  const [updatePhone, setUpdatePhone] = useState("");
  const [updateDocTitle, setUpdateDocTitle] = useState("");
  const [updateDocType, setUpdateDocType] = useState("ADDITIONAL_INFO");
  const [updateDocFile, setUpdateDocFile] = useState("");
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState("");

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocFileName.trim()) {
      setError("Please specify document title and file name.");
      return;
    }
    setDocuments([
      ...documents,
      {
        title: newDocTitle.trim(),
        document_type: newDocType,
        file_name: newDocFileName.trim(),
        file_url: `https://documents.onehealth.in/uploads/${newDocFileName.trim().toLowerCase().replace(/\s+/g, "_")}`
      }
    ]);
    setNewDocTitle("");
    setNewDocFileName("");
    setError("");
  };

  const handleRemoveDoc = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || name.trim().length < 2) {
      setError("Please provide a valid facility or hospital name (minimum 2 characters).");
      return;
    }
    if (!registrationNumber.trim()) {
      setError("Statutory clinical registration / license number is mandatory.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("Please provide a valid 10-digit registered phone number.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please provide a valid official organization email.");
      return;
    }
    if (!repName.trim()) {
      setError("Authorized representative name is required.");
      return;
    }
    const cleanRepPhone = repPhone.replace(/\D/g, "");
    if (cleanRepPhone.length < 10) {
      setError("Authorized representative 10-digit phone number is required.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        facility_type: facilityType,
        legal_name: legalName.trim() || name.trim(),
        ownership_type: ownershipType,
        registration_number: registrationNumber.trim(),
        registration_authority: registrationAuthority.trim(),
        registration_date: registrationDate || undefined,
        registration_expiry: registrationExpiry || undefined,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        pin_code: pinCode.trim() || "600001",
        phone: cleanPhone.slice(-10),
        email: email.trim().toLowerCase(),
        website: website.trim() || undefined,
        emergency_contact: emergencyContact.trim() || undefined,
        rep_name: repName.trim(),
        rep_designation: repDesignation.trim(),
        rep_email: repEmail.trim().toLowerCase() || email.trim().toLowerCase(),
        rep_phone: cleanRepPhone.slice(-10),
        supporting_documents: documents
      };

      const res = await api.hospital.registerFacility(payload);
      if (res.data) {
        setSubmittedApp(res.data);
      } else {
        throw new Error(res.message || "Failed to submit facility application.");
      }
    } catch (err: any) {
      setError(err.message || "Submission failed. Please check details.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTrackError("");
    setUpdateSuccessMsg("");
    const ref = searchRef.trim();
    if (!ref) {
      setTrackError("Please enter your Application Reference Number (e.g. APP-2026-XXXXXX).");
      return;
    }

    try {
      setTrackLoading(true);
      const res = await api.hospital.getApplicationStatus(ref);
      if (res && res.data) {
        setTrackedStatus(res.data);
        setUpdateAddress(res.data.address || "");
        setUpdatePhone(res.data.phone || "");
      } else {
        setTrackError("Application reference not found. Please verify the code.");
        setTrackedStatus(null);
      }
    } catch (err: any) {
      setTrackError(err.message || "Failed to retrieve application status.");
      setTrackedStatus(null);
    } finally {
      setTrackLoading(false);
    }
  };

  const handleUpdateInformation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackedStatus) return;

    try {
      setUpdateSubmitting(true);
      setUpdateSuccessMsg("");
      const docsToAppend = updateDocTitle && updateDocFile ? [{
        title: updateDocTitle.trim(),
        document_type: updateDocType,
        file_name: updateDocFile.trim(),
        file_url: `https://documents.onehealth.in/uploads/${updateDocFile.trim().toLowerCase().replace(/\s+/g, "_")}`
      }] : [];

      const payload = {
        address: updateAddress,
        phone: updatePhone,
        supporting_documents: docsToAppend
      };

      const res = await api.hospital.updateApplication(trackedStatus.application_ref, payload);
      setUpdateSuccessMsg("Additional information and documents submitted! Application transitioned back for Super Admin review.");
      setUpdateDocTitle("");
      setUpdateDocFile("");
      // Refresh status
      await handleTrackSubmit();
    } catch (err: any) {
      setTrackError(err.message || "Failed to submit additional information.");
    } finally {
      setUpdateSubmitting(false);
    }
  };

  const copyRefToClipboard = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Hospital className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">ONEHEALTH ID</span>
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Hospital & Clinic Registration Portal</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Staff & Clinician Login
            </Link>
            <Link
              href="/register"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              Citizen Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Banner */}
        <div className="mb-8 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full mb-3 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Strict Regulatory Verification & Super Admin Approval</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Register Your Healthcare Organization
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Hospitals and clinics must register statutory credentials and await explicit Super Admin review and authorization before accessing protected clinical workspaces, staff provisioning, and patient health records.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 bg-slate-200/80 rounded-xl border border-slate-300 shadow-inner">
            <button
              onClick={() => setActiveTab("register")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "register"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-4 h-4" />
              New Organization Registration
            </button>
            <button
              onClick={() => setActiveTab("track")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "track"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Search className="w-4 h-4" />
              Track Application Status
            </button>
          </div>
        </div>

        {/* TAB 1: REGISTRATION FORM */}
        {activeTab === "register" && !submittedApp && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 p-6 sm:p-10">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block mb-0.5">Application Error</strong>
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-8">
              {/* Step 1: Facility Type & Basic Profile */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Organization Identity & Facility Type</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div
                    onClick={() => setFacilityType("HOSPITAL")}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                      facilityType === "HOSPITAL"
                        ? "border-blue-600 bg-blue-50/50 shadow-xs"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                      facilityType === "HOSPITAL" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      <Hospital className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Hospital / Medical Center</h4>
                      <p className="text-xs text-slate-500">Multi-department facility with IPD, ICU, OT & OPD</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setFacilityType("CLINIC")}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                      facilityType === "CLINIC"
                        ? "border-blue-600 bg-blue-50/50 shadow-xs"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                      facilityType === "CLINIC" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Clinic / Diagnostic Center</h4>
                      <p className="text-xs text-slate-500">Outpatient polyclinic or standalone clinical practice</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Organization Display Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apollo Healthcare / Kedar Clinic"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registered Legal Entity Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Apollo Hospitals Enterprise Ltd"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ownership Type
                    </label>
                    <select
                      value={ownershipType}
                      onChange={(e) => setOwnershipType(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                    >
                      <option value="PRIVATE">Private / Corporate</option>
                      <option value="TRUST">Trust / Non-Profit</option>
                      <option value="GOVERNMENT">Government / Public Health</option>
                      <option value="PARTNERSHIP">Partnership / Individual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Organization Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="admin@hospitaldomain.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Statutory Registration & Licensing Details */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Licensing & Regulatory Compliance</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Clinical Establishment / License Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TN-CEA-2024-8921"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Issuing Registration Authority
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Directorate of Medical Services (DMS)"
                      value={registrationAuthority}
                      onChange={(e) => setRegistrationAuthority(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      License Registration Date
                    </label>
                    <input
                      type="date"
                      value={registrationDate}
                      onChange={(e) => setRegistrationDate(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      License Expiry / Renewal Date
                    </label>
                    <input
                      type="date"
                      value={registrationExpiry}
                      onChange={(e) => setRegistrationExpiry(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Location & Contact Details */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Physical Address & Operations</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registered Facility Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Street address, building number, landmark"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Postal Code (PIN) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="600001"
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Official Phone (10-Digit) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Official Website
                      </label>
                      <input
                        type="url"
                        placeholder="https://hospital.org"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        24x7 Emergency Contact
                      </label>
                      <input
                        type="text"
                        placeholder="044-28290000 / 1066"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Authorized Representative */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Authorized Representative / Medical Director</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Representative Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Dr. Senthil Nathan"
                      value={repName}
                      onChange={(e) => setRepName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Designation
                    </label>
                    <input
                      type="text"
                      placeholder="Medical Superintendent / Hospital Administrator"
                      value={repDesignation}
                      onChange={(e) => setRepDesignation(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Representative Official Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="senthil.nathan@hospital.org"
                      value={repEmail}
                      onChange={(e) => setRepEmail(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Representative Mobile (10-Digit) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="9840123456"
                      value={repPhone}
                      onChange={(e) => setRepPhone(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Step 5: Supporting Documents */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    5
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Supporting Statutory Credentials & Documents</h2>
                </div>

                <div className="space-y-3 mb-4">
                  {documents.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{doc.title}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{doc.file_name} • {doc.document_type}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(idx)}
                        className="text-slate-400 hover:text-red-600 p-1.5 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 flex flex-col sm:flex-row gap-3 items-end">
                  <div className="w-full sm:w-1/3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Document Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. NABH Accreditation / Fire NOC"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none"
                    />
                  </div>

                  <div className="w-full sm:w-1/4">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Document Type
                    </label>
                    <select
                      value={newDocType}
                      onChange={(e) => setNewDocType(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none"
                    >
                      <option value="REGISTRATION_LICENSE">Registration License</option>
                      <option value="ACCREDITATION">NABH / NABL Accreditation</option>
                      <option value="STATUTORY_NOC">Fire / Safety NOC</option>
                      <option value="AUTHORIZED_REP_ID">Representative ID / Authorization</option>
                    </select>
                  </div>

                  <div className="w-full sm:w-1/3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      File Name / Attachment Reference
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. nabh_certificate_2025.pdf"
                      value={newDocFileName}
                      onChange={(e) => setNewDocFileName(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddDocument}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Attach
                  </button>
                </div>
              </div>

              {/* Security & Access Statement */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-semibold block mb-0.5">Mandatory Security Release Gate:</strong>
                  Submitting this application does <strong>not</strong> grant immediate access to hospital workspaces, doctor accounts, or patient health records. The organization remains strictly blocked until an authorized Super Admin independently verifies statutory documentation.
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    <>
                      Submit Application for Super Admin Review
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SUBMISSION CONFIRMATION SCREEN */}
        {submittedApp && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 sm:p-12 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
              Application Submitted Successfully!
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Your organization registration is recorded and has entered the <strong>SUBMITTED</strong> stage. It is now awaiting independent Super Admin credential and statutory verification.
            </p>

            {/* Reference Number Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 text-left">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Official Application Reference
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xl font-mono font-extrabold text-blue-700">
                  {submittedApp.application_ref}
                </span>
                <button
                  onClick={() => copyRefToClipboard(submittedApp.application_ref)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy Reference"}
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Facility Name</span>
                  <strong className="text-slate-800">{submittedApp.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Current Status</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                    <Clock className="w-3 h-3" />
                    SUBMITTED (Pending Review)
                  </span>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs text-left mb-6 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Next Steps:</strong>
                <p className="text-slate-600 mt-1">
                  A Super Admin will review your registration and supporting documents. Once approved, the authorized representative will receive activation instructions. You can use your application reference above to track progress at any time.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setSearchRef(submittedApp.application_ref);
                  setActiveTab("track");
                  setSubmittedApp(null);
                  handleTrackSubmit();
                }}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
              >
                Track Live Application Status
              </button>

              <button
                onClick={() => {
                  setSubmittedApp(null);
                  setName("");
                  setRegistrationNumber("");
                  setDocuments([]);
                }}
                className="px-6 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
              >
                Register Another Facility
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: TRACK APPLICATION STATUS */}
        {activeTab === "track" && (
          <div className="space-y-6">
            {/* Search Box */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
              <h3 className="text-base font-bold text-slate-900 mb-2">Track Your Organization Application</h3>
              <p className="text-xs text-slate-500 mb-4">
                Enter the reference number assigned when your application was submitted.
              </p>

              <form onSubmit={handleTrackSubmit} className="flex gap-3">
                <input
                  type="text"
                  placeholder="e.g. APP-2026-XXXXXX"
                  value={searchRef}
                  onChange={(e) => setSearchRef(e.target.value)}
                  className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none font-mono"
                />
                <button
                  type="submit"
                  disabled={trackLoading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {trackLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Check Status
                </button>
              </form>

              {trackError && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  {trackError}
                </div>
              )}
            </div>

            {/* Tracked Result Details */}
            {trackedStatus && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
                {/* Header with Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Application Reference
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 font-mono">
                      {trackedStatus.application_ref}
                    </h3>
                  </div>

                  <div>
                    {trackedStatus.lifecycle_status === "APPROVED" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        APPROVED & ACTIVATED
                      </span>
                    )}
                    {trackedStatus.lifecycle_status === "UNDER_REVIEW" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800">
                        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                        UNDER SUPER ADMIN REVIEW
                      </span>
                    )}
                    {trackedStatus.lifecycle_status === "SUBMITTED" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800">
                        <Clock className="w-4 h-4 text-amber-600" />
                        SUBMITTED (QUEUED)
                      </span>
                    )}
                    {trackedStatus.lifecycle_status === "NEEDS_INFORMATION" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-orange-100 text-orange-800">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        ADDITIONAL INFORMATION REQUIRED
                      </span>
                    )}
                    {trackedStatus.lifecycle_status === "REJECTED" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-red-100 text-red-800">
                        <XCircle className="w-4 h-4 text-red-600" />
                        APPLICATION REJECTED
                      </span>
                    )}
                    {trackedStatus.lifecycle_status === "SUSPENDED" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800">
                        <Lock className="w-4 h-4 text-rose-600" />
                        ORGANIZATION SUSPENDED
                      </span>
                    )}
                  </div>
                </div>

                {/* Lifecycle Progress Stepper */}
                <div className="py-2">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className={`p-3 rounded-xl border ${
                      ["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFORMATION", "APPROVED"].includes(trackedStatus.lifecycle_status)
                        ? "bg-blue-50 border-blue-200 text-blue-900 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <span>Step 1: Submitted</span>
                      </div>
                      <p className="text-[11px] font-normal text-slate-500">Credentials recorded</p>
                    </div>

                    <div className={`p-3 rounded-xl border ${
                      ["UNDER_REVIEW", "NEEDS_INFORMATION", "APPROVED"].includes(trackedStatus.lifecycle_status)
                        ? "bg-blue-50 border-blue-200 text-blue-900 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <RefreshCw className={`w-4 h-4 ${trackedStatus.lifecycle_status === "UNDER_REVIEW" ? "animate-spin text-blue-600" : "text-slate-400"}`} />
                        <span>Step 2: Under Review</span>
                      </div>
                      <p className="text-[11px] font-normal text-slate-500">Statutory audit</p>
                    </div>

                    <div className={`p-3 rounded-xl border ${
                      trackedStatus.lifecycle_status === "APPROVED"
                        ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                        : trackedStatus.lifecycle_status === "REJECTED"
                        ? "bg-red-50 border-red-200 text-red-900 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        {trackedStatus.lifecycle_status === "APPROVED" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : trackedStatus.lifecycle_status === "REJECTED" ? (
                          <XCircle className="w-4 h-4 text-red-600" />
                        ) : (
                          <Lock className="w-4 h-4 text-slate-400" />
                        )}
                        <span>Step 3: Decision</span>
                      </div>
                      <p className="text-[11px] font-normal text-slate-500">
                        {trackedStatus.lifecycle_status === "APPROVED" ? "Approved & Activated" : trackedStatus.lifecycle_status === "REJECTED" ? "Rejected" : "Pending Approval"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Facility Name</span>
                    <strong className="text-slate-800 text-sm">{trackedStatus.name}</strong>
                    <span className="text-slate-500 block mt-1">Type: {trackedStatus.hospital_type}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">License / Registration Number</span>
                    <strong className="text-slate-800 font-mono text-sm">{trackedStatus.registration_number}</strong>
                    <span className="text-slate-500 block mt-1">{trackedStatus.registration_authority}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Registered Location</span>
                    <span className="text-slate-700">{trackedStatus.address}, {trackedStatus.city}, {trackedStatus.state}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Representative Contact</span>
                    <span className="text-slate-700">{trackedStatus.rep_name} ({trackedStatus.rep_email})</span>
                  </div>
                </div>

                {/* Review Notes from Super Admin */}
                {trackedStatus.review_notes && (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                    <strong className="font-semibold block mb-1">Super Admin Review Notes:</strong>
                    <p className="text-slate-700">{trackedStatus.review_notes}</p>
                  </div>
                )}

                {/* Rejection Reason */}
                {trackedStatus.rejection_reason && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs">
                    <strong className="font-semibold block mb-1">Rejection Reason:</strong>
                    <p className="text-red-700">{trackedStatus.rejection_reason}</p>
                  </div>
                )}

                {/* Form to submit additional info when in NEEDS_INFORMATION status */}
                {trackedStatus.lifecycle_status === "NEEDS_INFORMATION" && (
                  <div className="p-5 rounded-xl border border-orange-200 bg-orange-50/50 space-y-4">
                    <div className="flex items-center gap-2 text-orange-900 font-bold text-sm">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      Submit Requested Information / Additional Documents
                    </div>

                    {updateSuccessMsg && (
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {updateSuccessMsg}
                      </div>
                    )}

                    <form onSubmit={handleUpdateInformation} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Clarified Address / Operational Details
                        </label>
                        <input
                          type="text"
                          value={updateAddress}
                          onChange={(e) => setUpdateAddress(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Additional Document Title
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Renewed Pharmacy License"
                            value={updateDocTitle}
                            onChange={(e) => setUpdateDocTitle(e.target.value)}
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            File Name / Attachment Reference
                          </label>
                          <input
                            type="text"
                            placeholder="pharmacy_license_renewed.pdf"
                            value={updateDocFile}
                            onChange={(e) => setUpdateDocFile(e.target.value)}
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={updateSubmitting}
                          className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {updateSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          Submit Requested Clarifications
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>© 2026 OneHealth ID (OH-ID) • Sathus Technology Pvt Ltd. Multi-Tenant Enterprise Health Platform.</p>
      </footer>
    </div>
  );
}
