"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  QrCode,
  HeartPulse,
  Building2,
  Calendar,
  Loader2,
  FileCheck2,
  Copy,
  Check
} from "lucide-react";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [email, setEmail] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consentGiven, setConsentGiven] = useState(true);

  // Interaction state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [successData, setSuccessData] = useState<{
    user_id: string;
    patient_id: string;
    onehealth_id: string;
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Format mobile to 10 digits
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "");
    if (digits.length <= 10) {
      setPhone(digits);
    }
  };

  const handleCopyOneHealthId = () => {
    if (successData?.onehealth_id) {
      navigator.clipboard.writeText(successData.onehealth_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsDuplicate(false);

    // Client-side validation
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      setError("Please enter your full name (minimum 2 characters).");
      return;
    }

    const cleanPhone = phone.trim();
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 125) {
      setError("Please enter a valid age between 0 and 125.");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters in length.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    if (!consentGiven) {
      setError("You must consent to the creation of your digital OneHealth ID to proceed.");
      return;
    }

    if (email.trim() && (!email.includes("@") || !email.includes("."))) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.auth.register({
        name: cleanName,
        phone: cleanPhone,
        password,
        age: parsedAge,
        gender,
        email: email.trim() || undefined,
        blood_group: bloodGroup || undefined,
        emergency_contact: emergencyContact.trim() || undefined,
        address: address.trim() || undefined,
        consent_given: consentGiven,
      });

      setSuccessData({
        user_id: res.user_id,
        patient_id: res.patient_id,
        onehealth_id: res.onehealth_id,
        message: res.message,
      });
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      const message = err?.message || err?.detail || "Registration failed. Please verify your details.";

      if (status === 409 || message.toLowerCase().includes("already registered")) {
        setIsDuplicate(true);
        setError("An account with this mobile number is already registered.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group focus:outline-hidden focus:ring-2 focus:ring-blue-500 rounded-xl p-1">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1 shrink-0 group-hover:border-blue-300 transition-colors">
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
                <span className="font-black text-lg tracking-tight text-slate-950">ONEHEALTH ID</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Citizen
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:block">
                Unified Healthcare Network • Powered by Sathus Technology Pvt Ltd
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">Already registered?</span>
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-blue-600 border border-slate-300 hover:border-blue-300 transition-all flex items-center gap-1.5 min-h-[38px] shadow-2xs"
            >
              <span>Sign In to Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Registration Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full">
        {successData ? (
          /* ── Registration Success View ── */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 text-center animate-fade-in">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 mb-6 shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block mb-3">
              Registration Successful
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              Welcome to OneHealth ID
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto mt-2">
              Your universal healthcare identity has been generated and securely persisted to the unified network registry.
            </p>

            {/* Generated OH-ID Card */}
            <div className="mt-8 max-w-md mx-auto p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 text-white shadow-lg text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between text-xs text-blue-300 mb-2">
                <span className="font-semibold uppercase tracking-wider">Universal Health Identifier</span>
                <span className="flex items-center gap-1 text-[11px] bg-blue-800/60 px-2 py-0.5 rounded-full border border-blue-700">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Active
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-mono font-bold tracking-wider text-white">
                  {successData.onehealth_id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyOneHealthId}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 text-xs shrink-0"
                  aria-label="Copy OneHealth ID"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-blue-400" />
                  <span>Zero-Knowledge QR Token Active</span>
                </div>
                <span>ABDM & DPDP Aligned</span>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/patient";
                }}
                className="w-full sm:w-auto flex-1 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <span>Enter Patient Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-sm transition-all text-center"
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        ) : (
          /* ── Registration Form View ── */
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10">
            {/* Header info */}
            <div className="mb-8 text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Self-Service Digital Health Registration</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                Create your OneHealth ID
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
                Register once to access your unified medical history, prescriptions, and cross-hospital consultations across the OH-ID Network.
              </p>
            </div>

            {/* Error / Alert banner */}
            {error && (
              <div
                role="alert"
                className={`mb-6 p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 ${
                  isDuplicate
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${isDuplicate ? "text-amber-600" : "text-rose-600"}`} />
                <div className="flex-1">
                  <p className="font-semibold">{error}</p>
                  {isDuplicate && (
                    <div className="mt-2">
                      <Link
                        href={`/login?mobile=${phone}`}
                        className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-800 underline underline-offset-2"
                      >
                        Click here to Sign In with this mobile number &rarr;
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information Group */}
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Personal Demographics</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="sm:col-span-2">
                    <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        id="reg-name"
                        type="text"
                        required
                        disabled={loading}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-hidden transition-all disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  {/* Registered Mobile Number */}
                  <div>
                    <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      10-Digit Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 text-slate-600 text-xs font-bold">
                        +91
                      </span>
                      <input
                        id="reg-phone"
                        type="tel"
                        required
                        disabled={loading}
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="9876543210"
                        className="w-full px-3.5 py-2.5 rounded-r-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-hidden transition-all disabled:bg-slate-50 font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">This will be your primary login identifier.</p>
                  </div>

                  {/* Age & Gender */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="reg-age" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Age <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="reg-age"
                        type="number"
                        min="0"
                        max="125"
                        required
                        disabled={loading}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="28"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-hidden transition-all disabled:bg-slate-50"
                      />
                    </div>

                    <div>
                      <label htmlFor="reg-gender" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Gender <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="reg-gender"
                        disabled={loading}
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-hidden transition-all bg-white disabled:bg-slate-50"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Unspecified">Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Credentials Group */}
              <div className="pt-2 border-t border-slate-100">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Security Credentials</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Password */}
                  <div>
                    <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Create Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        disabled={loading}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-hidden transition-all disabled:bg-slate-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="reg-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Confirm Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        id="reg-confirm-password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        disabled={loading}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-hidden transition-all disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Health Information Group */}
              <div className="pt-2 border-t border-slate-100">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-blue-600" />
                  <span>Clinical Profile (Optional)</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Blood Group */}
                  <div>
                    <label htmlFor="reg-blood" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Blood Group
                    </label>
                    <select
                      id="reg-blood"
                      disabled={loading}
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-hidden transition-all bg-white disabled:bg-slate-50"
                    >
                      <option value="">Select (Optional)</option>
                      <option value="O+">O positive (O+)</option>
                      <option value="O-">O negative (O-)</option>
                      <option value="A+">A positive (A+)</option>
                      <option value="A-">A negative (A-)</option>
                      <option value="B+">B positive (B+)</option>
                      <option value="B-">B negative (B-)</option>
                      <option value="AB+">AB positive (AB+)</option>
                      <option value="AB-">AB negative (AB-)</option>
                    </select>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      disabled={loading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="citizen@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-hidden transition-all disabled:bg-slate-50"
                    />
                  </div>

                  {/* Emergency Contact */}
                  <div>
                    <label htmlFor="reg-emergency" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Emergency Contact
                    </label>
                    <input
                      id="reg-emergency"
                      type="tel"
                      disabled={loading}
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="Family phone number"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-hidden transition-all disabled:bg-slate-50"
                    />
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-3">
                    <label htmlFor="reg-address" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Residential City / Area
                    </label>
                    <input
                      id="reg-address"
                      type="text"
                      disabled={loading}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. T. Nagar, Chennai, Tamil Nadu"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-hidden transition-all disabled:bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              {/* Mandatory DPDP Consent */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mt-0.5 border-slate-300"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    <strong>Digital Health Consent:</strong> I authorize OneHealth ID (OH-ID) to generate a unique digital health identifier and securely link my healthcare consultations, prescriptions, and lab investigations across participating network hospitals in compliance with the Digital Personal Data Protection (DPDP) Act.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed min-h-[48px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating OneHealth ID...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-blue-200" />
                      <span>Create OneHealth ID & Register</span>
                      <ArrowRight className="w-4 h-4 text-blue-200" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center text-xs text-slate-500">
                By registering, you agree to our{" "}
                <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 OneHealth ID (OH-ID) Unified Healthcare Network • Powered by Sathus Technology Pvt Ltd</p>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/terms" className="hover:text-blue-600">Terms of Service</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-blue-600">Privacy Policy</Link>
            <span>•</span>
            <Link href="/login" className="hover:text-blue-600">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
