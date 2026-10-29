"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  ShieldCheck,
  Lock,
  ArrowRight,
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
  Trash2,
  MessageSquare,
  KeyRound,
  Send,
  Sparkles
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

  // Live Dual Verification (Mobile WhatsApp + Email OTP)
  const [sessionId, setSessionId] = useState<string>("");
  const [mobileOtp, setMobileOtp] = useState<string>("");
  const [emailOtp, setEmailOtp] = useState<string>("");
  const [mobileVerified, setMobileVerified] = useState<boolean>(false);
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [mobileOtpSent, setMobileOtpSent] = useState<boolean>(false);
  const [emailOtpSent, setEmailOtpSent] = useState<boolean>(false);
  const [mobileCooldown, setMobileCooldown] = useState<number>(0);
  const [emailCooldown, setEmailCooldown] = useState<number>(0);
  const [otpLoading, setOtpLoading] = useState<"mobile_send" | "mobile_verify" | "email_send" | "email_verify" | null>(null);
  const [otpNotice, setOtpNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
  const [searchContact, setSearchContact] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [trackedStatus, setTrackedStatus] = useState<any | null>(null);

  // Additional Information submission state (when ON_HOLD)
  const [updateAddress, setUpdateAddress] = useState("");
  const [updatePhone, setUpdatePhone] = useState("");
  const [updateDocTitle, setUpdateDocTitle] = useState("");
  const [updateDocType, setUpdateDocType] = useState("ADDITIONAL_INFO");
  const [updateDocFile, setUpdateDocFile] = useState("");
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState("");

  // Deep-linking from notification emails & WhatsApp links
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const refParam = params.get("ref");
      if (tabParam === "status" || tabParam === "track") {
        setActiveTab("track");
      }
      if (refParam) {
        setSearchRef(refParam);
        api.hospital.getApplicationStatus(refParam).then((res) => {
          if (res?.data) {
            setTrackedStatus(res.data);
            setUpdateAddress(res.data.address || "");
            setUpdatePhone(res.data.phone || "");
          }
        }).catch(() => {});
      }
    }
  }, []);

  // Cooldown timer countdowns
  useEffect(() => {
    if (mobileCooldown <= 0) return;
    const timer = setInterval(() => setMobileCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [mobileCooldown]);

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const timer = setInterval(() => setEmailCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [emailCooldown]);

  // Input Handlers with Security Invalidation of Verification
  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (mobileVerified || mobileOtpSent) {
      setMobileVerified(false);
      setMobileOtpSent(false);
      setMobileOtp("");
      setOtpNotice({
        type: "error",
        text: "Mobile number changed. Please re-verify via WhatsApp OTP."
      });
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (emailVerified || emailOtpSent) {
      setEmailVerified(false);
      setEmailOtpSent(false);
      setEmailOtp("");
      setOtpNotice({
        type: "error",
        text: "Organization email changed. Please re-verify via Email OTP."
      });
    }
  };

  // Secure Onboarding Session Initialization
  const ensureSession = async (): Promise<string> => {
    if (sessionId) return sessionId;
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    const cleanEmail = email.trim().toLowerCase();
    const res = await api.hospital.createOnboardingSession({
      mobile_number: cleanPhone || undefined,
      email_address: cleanEmail || undefined,
    });
    if (res?.data?.session_id) {
      setSessionId(res.data.session_id);
      return res.data.session_id;
    }
    throw new Error("Unable to initialize secure onboarding session.");
  };

  // WhatsApp OTP handlers
  const handleSendMobileOtp = async () => {
    setOtpNotice(null);
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      setOtpNotice({
        type: "error",
        text: "Please enter a valid 10-digit registered mobile number before requesting WhatsApp OTP."
      });
      return;
    }
    try {
      setOtpLoading("mobile_send");
      const sid = await ensureSession();
      const res = await api.hospital.requestMobileOtp(sid, cleanPhone);
      setMobileOtpSent(true);
      setMobileCooldown(60);
      setOtpNotice({
        type: "success",
        text: res.message || "OTP code dispatched to your WhatsApp number. Valid for 10 minutes."
      });
    } catch (err: any) {
      setOtpNotice({ type: "error", text: err.message || "Failed to dispatch WhatsApp OTP." });
    } finally {
      setOtpLoading(null);
    }
  };

  const handleVerifyMobileOtp = async () => {
    setOtpNotice(null);
    if (!mobileOtp.trim() || mobileOtp.trim().length !== 6) {
      setOtpNotice({ type: "error", text: "Please enter the 6-digit OTP code received on WhatsApp." });
      return;
    }
    try {
      setOtpLoading("mobile_verify");
      const sid = sessionId || (await ensureSession());
      await api.hospital.verifyMobileOtp(sid, mobileOtp.trim());
      setMobileVerified(true);
      setOtpNotice({ type: "success", text: "Mobile number verified successfully via WhatsApp!" });
    } catch (err: any) {
      setOtpNotice({ type: "error", text: err.message || "Invalid or expired WhatsApp OTP code." });
    } finally {
      setOtpLoading(null);
    }
  };

  // Email OTP handlers
  const handleSendEmailOtp = async () => {
    setOtpNotice(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setOtpNotice({
        type: "error",
        text: "Please enter a valid official registered organization email before requesting Email OTP."
      });
      return;
    }
    try {
      setOtpLoading("email_send");
      const sid = await ensureSession();
      const res = await api.hospital.requestEmailOtp(sid, cleanEmail, name.trim() || "Healthcare Organization");
      setEmailOtpSent(true);
      setEmailCooldown(60);
      setOtpNotice({
        type: "success",
        text: res.message || "OTP code dispatched to your email address. Valid for 10 minutes."
      });
    } catch (err: any) {
      setOtpNotice({ type: "error", text: err.message || "Failed to dispatch Email OTP." });
    } finally {
      setOtpLoading(null);
    }
  };

  const handleVerifyEmailOtp = async () => {
    setOtpNotice(null);
    if (!emailOtp.trim() || emailOtp.trim().length !== 6) {
      setOtpNotice({ type: "error", text: "Please enter the 6-digit OTP code received in your email." });
      return;
    }
    try {
      setOtpLoading("email_verify");
      const sid = sessionId || (await ensureSession());
      await api.hospital.verifyEmailOtp(sid, emailOtp.trim());
      setEmailVerified(true);
      setOtpNotice({ type: "success", text: "Official organization email verified successfully!" });
    } catch (err: any) {
      setOtpNotice({ type: "error", text: err.message || "Invalid or expired Email OTP code." });
    } finally {
      setOtpLoading(null);
    }
  };

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

    if (!mobileVerified || !emailVerified) {
      setError("Mandatory security check: Both Mobile (WhatsApp) and Official Email must be verified before submission.");
      return;
    }

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
        supporting_documents: documents,
        session_id: sessionId || undefined
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
      setTrackError("Please enter your Application Tracking Identifier (e.g. OHID-ORG-2026-XXXXXXXX).");
      return;
    }

    try {
      setTrackLoading(true);
      let res;
      if (searchContact.trim()) {
        res = await api.hospital.getSecureApplicationStatus(ref, searchContact.trim());
      } else {
        res = await api.hospital.getApplicationStatus(ref);
      }

      if (res && res.data) {
        setTrackedStatus(res.data);
        setUpdateAddress(res.data.address || "");
        setUpdatePhone(res.data.phone || "");
      } else {
        setTrackError("Application reference not found. Please verify the identifier and official contact details.");
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

      await api.hospital.updateApplication(trackedStatus.application_ref, payload);
      setUpdateSuccessMsg("Corrections and supporting documents submitted successfully! Application transitioned back for Super Admin review.");
      setUpdateDocTitle("");
      setUpdateDocFile("");
      await handleTrackSubmit();
    } catch (err: any) {
      setTrackError(err.message || "Failed to submit corrections.");
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
              <p className="text-[11px] text-slate-500 font-medium">Hospital &amp; Clinic Registration Portal</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Staff &amp; Clinician Login
            </Link>
            <Link
              href="/verify"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Verify Patient Pass
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {activeTab === "register" ? "Healthcare Organization Registration" : "Application Status & Compliance"}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === "register"
                ? "Self-registration workflow with live dual-channel verification for hospital and clinic networks."
                : "Real-time audit status tracking for submitted healthcare organization applications."}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("register")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "register"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Register Facility
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("track")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "track"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Track Application
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
              {/* Step 1: Organization Identity & Facility Type */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Organization Identity &amp; Classification</h2>
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
                      <p className="text-xs text-slate-500">Multi-department facility with IPD, ICU, OT &amp; OPD</p>
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
                      placeholder="e.g. Example Healthcare Centre"
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
                      placeholder="e.g. Example Healthcare Services Pvt. Ltd."
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
                      <option value="PRIVATE">Private Limited / Commercial</option>
                      <option value="TRUST">Charitable Trust / NGO</option>
                      <option value="GOVERNMENT">Government / Autonomous Body</option>
                      <option value="CORPORATE">Corporate Healthcare Chain</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Clinical Establishment / License Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TN-CEA-2026-REG-8492"
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

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Issue Date
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
                        Expiry Date
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
              </div>

              {/* Step 2: Contact Verification & Live Dual-Channel OTP Authentication */}
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <h2 className="text-base font-bold text-slate-900">
                      Live Verification (WhatsApp &amp; Email Authentication)
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold ${
                      mobileVerified ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                    }`}>
                      {mobileVerified ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-slate-400" />}
                      Mobile {mobileVerified ? "Verified" : "Unverified"}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold ${
                      emailVerified ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                    }`}>
                      {emailVerified ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-slate-400" />}
                      Email {emailVerified ? "Verified" : "Unverified"}
                    </span>
                  </div>
                </div>

                {otpNotice && (
                  <div className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                    otpNotice.type === "success"
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                      : "bg-red-50 border border-red-200 text-red-700"
                  }`}>
                    {otpNotice.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{otpNotice.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Channel A: WhatsApp Mobile OTP Card */}
                  <div className={`p-5 rounded-2xl border-2 transition-all ${
                    mobileVerified
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-slate-200 bg-white"
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">WhatsApp Mobile Verification</h4>
                          <p className="text-[11px] text-slate-500">Official registered 10-digit mobile</p>
                        </div>
                      </div>
                      {mobileVerified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Official Registered Mobile (10-Digit) <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            required
                            placeholder="e.g. 9876543210"
                            value={phone}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            className="flex-1 text-xs px-3.5 py-2 rounded-lg border border-slate-300 focus:border-blue-600 outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleSendMobileOtp}
                            disabled={mobileCooldown > 0 || otpLoading === "mobile_send"}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 shrink-0 flex items-center gap-1 cursor-pointer"
                          >
                            {otpLoading === "mobile_send" ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            {mobileCooldown > 0 ? `Resend (${mobileCooldown}s)` : "Send OTP"}
                          </button>
                        </div>
                      </div>

                      {mobileOtpSent && !mobileVerified && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Enter 6-Digit WhatsApp Code
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="123456"
                              value={mobileOtp}
                              onChange={(e) => setMobileOtp(e.target.value)}
                              className="flex-1 text-sm tracking-widest text-center px-3 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 outline-none font-mono font-bold"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyMobileOtp}
                              disabled={otpLoading === "mobile_verify"}
                              className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition cursor-pointer"
                            >
                              {otpLoading === "mobile_verify" ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                "Verify"
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Channel B: Official Email OTP Card */}
                  <div className={`p-5 rounded-2xl border-2 transition-all ${
                    emailVerified
                      ? "border-blue-300 bg-blue-50/30"
                      : "border-slate-200 bg-white"
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Official Organization Email</h4>
                          <p className="text-[11px] text-slate-500">Official registered domain email</p>
                        </div>
                      </div>
                      {emailVerified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Official Registered Email <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            required
                            placeholder="e.g. admin@example.org"
                            value={email}
                            onChange={(e) => handleEmailChange(e.target.value)}
                            className="flex-1 text-xs px-3.5 py-2 rounded-lg border border-slate-300 focus:border-blue-600 outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleSendEmailOtp}
                            disabled={emailCooldown > 0 || otpLoading === "email_send"}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 shrink-0 flex items-center gap-1 cursor-pointer"
                          >
                            {otpLoading === "email_send" ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            {emailCooldown > 0 ? `Resend (${emailCooldown}s)` : "Send OTP"}
                          </button>
                        </div>
                      </div>

                      {emailOtpSent && !emailVerified && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Enter 6-Digit Email Code
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="123456"
                              value={emailOtp}
                              onChange={(e) => setEmailOtp(e.target.value)}
                              className="flex-1 text-sm tracking-widest text-center px-3 py-1.5 rounded-lg border border-slate-300 focus:border-blue-600 outline-none font-mono font-bold"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyEmailOtp}
                              disabled={otpLoading === "email_verify"}
                              className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition cursor-pointer"
                            >
                              {otpLoading === "email_verify" ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                "Verify"
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Location & Premises Operations */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Physical Address &amp; Premises</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registered Premises Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 100 Health Avenue, Anna Salai"
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
                        className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
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
                        placeholder="https://example.org"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        24x7 Emergency Contact Telephone
                      </label>
                      <input
                        type="text"
                        placeholder="044-28290000"
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
                      placeholder="e.g. Dr. Jane Doe"
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
                      Representative Work Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. jane.doe@example.org"
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
                      placeholder="e.g. 9840123456"
                      value={repPhone}
                      onChange={(e) => setRepPhone(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none font-mono"
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
                  <h2 className="text-base font-bold text-slate-900">Supporting Statutory Credentials &amp; Documents</h2>
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
                        className="text-slate-400 hover:text-red-600 p-1.5 transition-colors cursor-pointer"
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
                      placeholder="e.g. nabh_certificate_2026.pdf"
                      value={newDocFileName}
                      onChange={(e) => setNewDocFileName(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddDocument}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Attach
                  </button>
                </div>
              </div>

              {/* Security Release Gate & Access Notice */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-semibold block mb-0.5">Mandatory Security Release Gate:</strong>
                  Submitting this application does <strong>not</strong> grant immediate access to hospital workspaces, doctor accounts, or patient health records. The organization remains strictly blocked until an authorized Super Admin independently verifies statutory documentation.
                </div>
              </div>

              {/* Verification Gate & Submit Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
                <div className="text-xs">
                  {(!mobileVerified || !emailVerified) ? (
                    <div className="flex items-center gap-2 text-amber-700 font-semibold">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Submission locked: Complete Mobile &amp; Email OTP verification in Step 2.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Security checks passed: Verified Mobile &amp; Email. Ready for submission.</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !mobileVerified || !emailVerified}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

            {/* Tracking ID Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 text-left">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Official Application Tracking Identifier
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xl font-mono font-extrabold text-blue-700">
                  {submittedApp.application_ref}
                </span>
                <button
                  onClick={() => copyRefToClipboard(submittedApp.application_ref)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy Tracking ID"}
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

            {/* Security Notice & Timeline */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs text-left mb-6 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Audit &amp; Review Timeline:</strong>
                <p className="text-slate-600 mt-1">
                  A Super Admin will review your registration and supporting credentials within 24 to 48 business hours. Once approved, the authorized representative will receive single-use workspace activation instructions via verified email and WhatsApp.
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
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Track Live Application Status
              </button>

              <button
                onClick={() => {
                  setSubmittedApp(null);
                  setName("");
                  setRegistrationNumber("");
                  setMobileVerified(false);
                  setEmailVerified(false);
                  setDocuments([]);
                }}
                className="px-6 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
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
                Enter your Tracking Identifier (e.g. OHID-ORG-2026-XXXXXXXX) and your verified contact to review live audit progress.
              </p>

              <form onSubmit={handleTrackSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Tracking Identifier <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. OHID-ORG-2026-XXXXXXXX"
                      value={searchRef}
                      onChange={(e) => setSearchRef(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Verified Contact (Email or Mobile)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. admin@example.org or 9876543210"
                      value={searchContact}
                      onChange={(e) => setSearchContact(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={trackLoading}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {trackLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Check Live Status
                  </button>
                </div>
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
                      Application Tracking Identifier
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 font-mono">
                      {trackedStatus.application_ref}
                    </h3>
                  </div>

                  <div>
                    {trackedStatus.lifecycle_status === "APPROVED" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        APPROVED &amp; ACTIVATED
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
                    {(trackedStatus.lifecycle_status === "ON_HOLD" || trackedStatus.lifecycle_status === "NEEDS_INFORMATION") && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-orange-100 text-orange-800">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        ACTION REQUIRED (ON HOLD)
                      </span>
                    )}
                    {trackedStatus.lifecycle_status === "REJECTED" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-red-100 text-red-800">
                        <XCircle className="w-4 h-4 text-red-600" />
                        APPLICATION REJECTED
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Stepper */}
                <div className="py-2">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className={`p-3 rounded-xl border ${
                      ["SUBMITTED", "UNDER_REVIEW", "ON_HOLD", "NEEDS_INFORMATION", "APPROVED"].includes(trackedStatus.lifecycle_status)
                        ? "bg-blue-50 border-blue-200 text-blue-900 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <span>1. Verified &amp; Submitted</span>
                      </div>
                      <p className="text-[11px] font-normal text-slate-500">Contact verified</p>
                    </div>

                    <div className={`p-3 rounded-xl border ${
                      ["UNDER_REVIEW", "ON_HOLD", "NEEDS_INFORMATION", "APPROVED"].includes(trackedStatus.lifecycle_status)
                        ? "bg-blue-50 border-blue-200 text-blue-900 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <RefreshCw className={`w-4 h-4 ${trackedStatus.lifecycle_status === "UNDER_REVIEW" ? "animate-spin text-blue-600" : "text-slate-400"}`} />
                        <span>2. Admin Review</span>
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
                          <Clock className="w-4 h-4 text-slate-400" />
                        )}
                        <span>3. Decision &amp; Activation</span>
                      </div>
                      <p className="text-[11px] font-normal text-slate-500">Workspace ready</p>
                    </div>
                  </div>
                </div>

                {/* ON_HOLD Alert & Update Section */}
                {(trackedStatus.lifecycle_status === "ON_HOLD" || trackedStatus.lifecycle_status === "NEEDS_INFORMATION") && (
                  <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-950">Action Required: Application Placed On Hold</h4>
                        <p className="text-xs text-amber-800 mt-1">
                          The reviewing Super Admin has requested additional details or updated statutory proof:
                        </p>
                        <div className="mt-2 p-3 bg-white rounded-xl border border-amber-200 text-xs font-medium text-slate-800">
                          {trackedStatus.review_notes || "Please supply clearer copies of clinical establishment license and statutory certificates."}
                        </div>
                      </div>
                    </div>

                    {updateSuccessMsg && (
                      <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{updateSuccessMsg}</span>
                      </div>
                    )}

                    <form onSubmit={handleUpdateInformation} className="pt-2 border-t border-amber-200/60 space-y-3">
                      <h5 className="text-xs font-bold text-amber-950">Submit Requested Corrections or Documents</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Updated Address (if requested)
                          </label>
                          <input
                            type="text"
                            value={updateAddress}
                            onChange={(e) => setUpdateAddress(e.target.value)}
                            placeholder="Updated address"
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Updated Phone (if requested)
                          </label>
                          <input
                            type="tel"
                            value={updatePhone}
                            onChange={(e) => setUpdatePhone(e.target.value)}
                            placeholder="Updated phone"
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Document Title
                          </label>
                          <input
                            type="text"
                            value={updateDocTitle}
                            onChange={(e) => setUpdateDocTitle(e.target.value)}
                            placeholder="e.g. Renewed Clinical Establishment License"
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            File Attachment Name
                          </label>
                          <input
                            type="text"
                            value={updateDocFile}
                            onChange={(e) => setUpdateDocFile(e.target.value)}
                            placeholder="e.g. license_renewal_2026.pdf"
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={updateSubmitting}
                          className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          {updateSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          Submit Corrections for Review
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* APPROVED Banner */}
                {trackedStatus.lifecycle_status === "APPROVED" && (
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-emerald-950">Congratulations! Organization Officially Approved</h4>
                        <p className="text-xs text-emerald-800 mt-1">
                          A single-use workspace activation link (valid for 72 hours) has been dispatched to your verified email ({trackedStatus.rep_email || trackedStatus.email}) and WhatsApp.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* REJECTED Banner */}
                {trackedStatus.lifecycle_status === "REJECTED" && (
                  <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-900 space-y-2">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-red-950">Application Not Approved</h4>
                        <p className="text-xs text-red-800 mt-1">
                          Reason: {trackedStatus.rejection_reason || "Application does not meet platform regulatory requirements."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Facility Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Facility Information
                    </span>
                    <p><strong>Name:</strong> {trackedStatus.name}</p>
                    <p><strong>Type:</strong> {trackedStatus.hospital_type || trackedStatus.facility_type}</p>
                    <p><strong>License:</strong> {trackedStatus.registration_number}</p>
                    <p><strong>Authority:</strong> {trackedStatus.registration_authority}</p>
                    <p><strong>Address:</strong> {trackedStatus.address}, {trackedStatus.city}, {trackedStatus.state}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Authorized Representative
                    </span>
                    <p><strong>Name:</strong> {trackedStatus.rep_name || "—"}</p>
                    <p><strong>Designation:</strong> {trackedStatus.rep_designation || "—"}</p>
                    <p><strong>Email:</strong> {trackedStatus.rep_email || trackedStatus.email}</p>
                    <p><strong>Phone:</strong> {trackedStatus.rep_phone || trackedStatus.phone}</p>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> WhatsApp Verified
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" /> Email Verified
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <p>© 2026 OneHealth ID (OH-ID) Enterprise Hospital Operating System. All rights reserved.</p>
      </footer>
    </div>
  );
}
