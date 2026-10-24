"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Lock, ArrowRight, ArrowLeft, Mail,
  CheckCircle2, AlertCircle, HelpCircle, X, KeyRound,
  RefreshCw, Clock, Building2, ShieldAlert, Sparkles, Loader2,
  Eye, EyeOff, Search
} from "lucide-react";
import { api } from "@/lib/api";

type ResetStep = "EMAIL_INPUT" | "OTP_INPUT" | "NEW_PASSWORD" | "SUCCESS";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Multi-step state
  const [step, setStep] = useState<ResetStep>("EMAIL_INPUT");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Countdown timer for 5 minutes (300 seconds)
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Super Admin Assistance Modal State
  const [showAssistanceModal, setShowAssistanceModal] = useState(false);
  const [assistanceCategory, setAssistanceCategory] = useState("OTP_DELIVERY");
  const [assistanceDescription, setAssistanceDescription] = useState("");
  const [assistancePhone, setAssistancePhone] = useState("");
  const [assistanceLoading, setAssistanceLoading] = useState(false);
  const [assistanceReference, setAssistanceReference] = useState("");
  const [assistanceError, setAssistanceError] = useState("");

  // Assistance Status Tracker tab
  const [activeTab, setActiveTab] = useState<"REQUEST" | "LOOKUP">("REQUEST");
  const [lookupRef, setLookupRef] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  // Countdown timer effect
  useEffect(() => {
    let interval: any = null;
    if (step === "OTP_INPUT") {
      interval = setInterval(() => {
        setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Step 1: Submit Email for OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.auth.forgotPassword(cleanEmail);
      setSuccessMsg(
        "If an active account is associated with this email, a 6-digit verification code has been dispatched. Please check your inbox and spam folder."
      );
      setStep("OTP_INPUT");
      setTimerSeconds(300);
      setCooldownSeconds(60);
      setCanResend(false);
    } catch (err: any) {
      setError(err?.message || "Failed to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d+$/.test(cleanOtp)) {
      setError("Please enter the complete 6-digit numeric verification code.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await api.auth.verifyResetOtp(email.trim(), cleanOtp);
      const token = res?.data?.reset_token;
      if (!token) {
        throw new Error("Verification response did not return a valid session token.");
      }
      setResetToken(token);
      setStep("NEW_PASSWORD");
      setError("");
    } catch (err: any) {
      setError(err?.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setLoading(true);
    setError("");
    try {
      await api.auth.resendResetOtp(email.trim());
      setSuccessMsg("A new verification code has been dispatched to your email address.");
      setTimerSeconds(300);
      setCooldownSeconds(60);
      setCanResend(false);
      setOtp("");
    } catch (err: any) {
      setError(err?.message || "Unable to resend verification code right now. Please wait.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasDigitOrSpecial = /[\d\W]/.test(newPassword);
    if (!hasLetter || !hasDigitOrSpecial) {
      setError("Password must contain both letters and numbers or symbols.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.auth.resetPassword({
        email: email.trim(),
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setStep("SUCCESS");
    } catch (err: any) {
      setError(err?.message || "Failed to update password. Please request a new code.");
    } finally {
      setLoading(false);
    }
  };

  // Submit Assistance Request
  const handleSubmitAssistance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setAssistanceError("Please enter your registered email address.");
      return;
    }

    setAssistanceLoading(true);
    setAssistanceError("");
    try {
      const res = await api.auth.requestAssistance({
        email: email.trim(),
        category: assistanceCategory,
        description: assistanceDescription.trim() || undefined,
        contact_phone: assistancePhone.trim() || undefined,
      });
      setAssistanceReference(res.data.reference_number);
    } catch (err: any) {
      setAssistanceError(err?.message || "Failed to submit assistance request.");
    } finally {
      setAssistanceLoading(false);
    }
  };

  // Lookup Assistance Status
  const handleLookupStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupRef.trim()) {
      setLookupError("Please enter your reference number.");
      return;
    }

    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);
    try {
      const res = await api.auth.getAssistanceStatus(lookupRef.trim());
      setLookupResult(res.data);
    } catch (err: any) {
      setLookupError(err?.message || "Assistance request not found. Please verify the reference code.");
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-100/70 flex items-center justify-center p-3 sm:p-6 lg:p-10 relative selection:bg-blue-600 selection:text-white font-sans">
      {/* Background Ambient Orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />

      {/* Main Container Card */}
      <div className="w-full max-w-4xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 z-10">
        
        {/* Left Healthcare Brand Panel */}
        <div className="hidden lg:flex lg:col-span-5 relative bg-gradient-to-br from-[#155EEF] via-[#123B75] to-[#0A2540] p-8 text-white flex-col justify-between overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-md">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-white">OneHealth ID</span>
                <span className="block text-[11px] text-blue-200 font-semibold tracking-wider uppercase">Security Center</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-100 text-xs font-semibold">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Zero-Trust Recovery</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white leading-snug">
                Secure Password Recovery &amp; Email Verification
              </h2>
              <p className="text-xs text-blue-100/80 leading-relaxed">
                OneHealth ID enforces cryptographic verification codes delivered exclusively to your registered email address. Authentication bypass is strictly forbidden for all accounts.
              </p>
            </div>
          </div>

          <div className="relative z-10 space-y-3 pt-6 border-t border-white/10 text-xs text-blue-100/70">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Privileged accounts require Super Admin assistance if OTP fails</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Codes expire in 5 minutes with strict rate limits</span>
            </div>
          </div>
        </div>

        {/* Right Form Area */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Top Navigation & Status */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Login</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowAssistanceModal(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Super Admin Assistance</span>
              </button>
            </div>

            {/* Error & Info Alerts */}
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
            )}

            {successMsg && step === "OTP_INPUT" && (
              <div className="mb-5 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{successMsg}</span>
              </div>
            )}

            {/* STEP 1: ENTER REGISTERED EMAIL */}
            {step === "EMAIL_INPUT" && (
              <form onSubmit={handleRequestOtp} className="space-y-5">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Forgot Password?</h1>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Enter your verified registered email address to receive a secure 6-digit verification code.
                  </p>
                </div>

                <div>
                  <label htmlFor="reset-email" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Registered Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative group">
                    <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 absolute left-3.5 top-3 transition-colors" />
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="e.g. physician@apollo.org or patient@gmail.com"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[44px] transition font-medium"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Enterprise Security Policy:</strong> Password reset OTPs are dispatched strictly by email. Mobile SMS OTP is not supported for password recovery. Responses do not reveal account existence.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-60 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg transition cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Verification Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: ENTER 6-DIGIT EMAIL OTP */}
            {step === "OTP_INPUT" && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Enter Verification Code</h1>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Enter the 6-digit code dispatched to <strong className="text-slate-800">{email}</strong>.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="reset-otp" className="text-xs font-bold text-slate-700">
                      6-Digit Security Code
                    </label>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Expires in {formatTimer(timerSeconds)}</span>
                    </div>
                  </div>
                  <input
                    id="reset-otp"
                    type="text"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setOtp(val);
                      if (error) setError("");
                    }}
                    placeholder="123456"
                    className="w-full text-center tracking-[8px] sm:tracking-[12px] text-xl sm:text-2xl font-mono font-bold py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>

                {/* Resend & Support Action Row */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs">
                  <button
                    type="button"
                    disabled={!canResend || loading}
                    onClick={handleResendOtp}
                    className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-800 disabled:text-slate-400 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    <span>
                      {canResend ? "Resend Verification Code" : `Resend available in ${cooldownSeconds}s`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAssistanceCategory("OTP_DELIVERY");
                      setShowAssistanceModal(true);
                    }}
                    className="text-slate-600 hover:text-blue-600 font-semibold underline underline-offset-2 transition"
                  >
                    Code not arriving? Request Assistance
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-60 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg transition cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm &amp; Proceed</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 3: SET NEW PASSWORD */}
            {step === "NEW_PASSWORD" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Create New Password</h1>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Choose a strong, unique password for your account. All prior active sessions will be revoked.
                  </p>
                </div>

                <div>
                  <label htmlFor="new-password" className="block text-xs font-bold text-slate-700 mb-1">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 absolute left-3.5 top-3 transition-colors" />
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="At least 8 characters"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[44px] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 absolute left-3.5 top-3 transition-colors" />
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="Confirm your password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[44px] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password strength checks */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                  <div className={`flex items-center gap-1.5 ${newPassword.length >= 8 ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Minimum 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[a-zA-Z]/.test(newPassword) && /[\d\W]/.test(newPassword) ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Contains letters and numbers or symbols</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${newPassword && newPassword === confirmPassword ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Passwords match</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-60 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg transition cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password &amp; Revoking Sessions...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 4: SUCCESS CONFIRMATION */}
            {step === "SUCCESS" && (
              <div className="text-center py-6 space-y-5 animate-in fade-in">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Password Successfully Reset</h1>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                    Your password has been securely updated using salted bcrypt encryption. All active sessions have been invalidated.
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 max-w-sm mx-auto">
                  <span>MFA protection remains active on privileged accounts.</span>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="pt-6 border-t border-slate-100 mt-6 text-center text-[11px] text-slate-400">
            OneHealth OS Enterprise Security • Powered by Sathus Technology Pvt Ltd
          </div>
        </div>

      </div>

      {/* SUPER ADMIN ASSISTANCE MODAL */}
      {showAssistanceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full p-6 relative overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Top Glowing Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Super Admin Support Assistance</h3>
                  <p className="text-[11px] text-slate-500">Official channel for password recovery difficulties</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAssistanceModal(false);
                  setAssistanceReference("");
                  setAssistanceError("");
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation: Submit New Request vs Check Status */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("REQUEST")}
                className={`py-1.5 rounded-lg transition ${activeTab === "REQUEST" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Request Assistance
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("LOOKUP")}
                className={`py-1.5 rounded-lg transition ${activeTab === "LOOKUP" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Track Request Status
              </button>
            </div>

            <div className="overflow-y-auto pr-1">
              {activeTab === "REQUEST" ? (
                assistanceReference ? (
                  /* Success reference display */
                  <div className="text-center py-4 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Request Submitted Successfully</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Your request has been routed to the Super Admin platform security team.
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[11px] text-slate-500 block">Your Tracking Reference:</span>
                      <span className="font-mono text-base font-extrabold text-blue-700 tracking-wider">
                        {assistanceReference}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Please note this reference number. Support personnel will review your registered account details and contact you according to verified identity protocols.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAssistanceModal(false);
                        setAssistanceReference("");
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  /* Form */
                  <form onSubmit={handleSubmitAssistance} className="space-y-3.5">
                    {assistanceError && (
                      <div className="p-2.5 rounded-lg bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{assistanceError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Issue Category</label>
                      <select
                        value={assistanceCategory}
                        onChange={(e) => setAssistanceCategory(e.target.value)}
                        className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                      >
                        <option value="OTP_DELIVERY">OTP Verification Code Never Arrived</option>
                        <option value="OTP_VERIFICATION">OTP Verification Code Failed / Expired</option>
                        <option value="ACCOUNT_RECOVERY">Privileged Account Recovery (Hospital Admin / Staff)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Registered Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. user@example.com"
                        className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Alternative Contact Phone (Optional)</label>
                      <input
                        type="tel"
                        value={assistancePhone}
                        onChange={(e) => setAssistancePhone(e.target.value)}
                        placeholder="e.g. 9840111222"
                        className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes</label>
                      <textarea
                        rows={3}
                        value={assistanceDescription}
                        onChange={(e) => setAssistanceDescription(e.target.value)}
                        placeholder="Describe the issue encountered..."
                        className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div className="p-2.5 bg-blue-50 rounded-xl text-[11px] text-blue-900">
                      <strong>Security Notice:</strong> Support staff cannot reset credentials merely upon receipt of an email. Strict identity verification will be conducted.
                    </div>

                    <button
                      type="submit"
                      disabled={assistanceLoading}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                    >
                      {assistanceLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Submitting Request...</span>
                        </>
                      ) : (
                        <span>Submit Assistance Request</span>
                      )}
                    </button>
                  </form>
                )
              ) : (
                /* Track status */
                <form onSubmit={handleLookupStatus} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tracking Reference Number</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={lookupRef}
                        onChange={(e) => setLookupRef(e.target.value)}
                        placeholder="e.g. REQ-2026-ABC123"
                        className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                      />
                      <button
                        type="submit"
                        disabled={lookupLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shrink-0"
                      >
                        {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {lookupError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{lookupError}</span>
                    </div>
                  )}

                  {lookupResult && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-500">Reference:</span>
                        <span className="font-mono font-bold text-blue-700">{lookupResult.ticket_number}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-500">Status:</span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          lookupResult.status === "RESOLVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : lookupResult.status === "IN_PROGRESS"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {lookupResult.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-500">Category:</span>
                        <span className="text-slate-800">{lookupResult.request_category || lookupResult.category}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-500">Logged At:</span>
                        <span className="text-slate-600">
                          {lookupResult.created_at ? new Date(lookupResult.created_at).toLocaleDateString() : "Recent"}
                        </span>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
