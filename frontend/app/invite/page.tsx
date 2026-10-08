"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  ShieldAlert,
  Building2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  KeyRound,
  RefreshCw,
  Sparkles,
  Phone,
  Mail,
  Award,
  Check
} from "lucide-react";
import { api } from "@/lib/api";

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [enableMfa, setEnableMfa] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setErrorMsg("Missing or invalid invitation token. Please check your invitation link.");
      setLoading(false);
      return;
    }

    // Validate token with backend
    api.auth
      .validateInvitation(token)
      .then((res: any) => {
        const payload = res?.data || res;
        if (payload && (payload.valid || payload.user_id || payload.email)) {
          setInvitationData(payload);
        } else {
          setErrorMsg(res?.message || payload?.message || "Invitation link is invalid, expired, or has already been used.");
        }
      })
      .catch((err) => {
        setErrorMsg(err?.message || "Failed to validate invitation token. It may have expired or been revoked.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  // Password validation rules
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && (hasNumber || hasSpecial);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!isPasswordValid) {
      setErrorMsg("Password does not satisfy enterprise healthcare security criteria.");
      return;
    }

    if (!passwordsMatch) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setAccepting(true);
    setErrorMsg(null);

    try {
      const res = await api.auth.acceptInvitation(token, {
        password: password,
        mfa_enabled: enableMfa,
      });

      setSuccess(true);
      setSuccessMsg(res?.message || "Account successfully activated! You can now log into your healthcare workspace.");
      setTimeout(() => {
        router.push("/login");
      }, 3500);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to activate account. The invitation may have expired.");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center animate-pulse">
            <RefreshCw className="w-7 h-7 text-blue-400 animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Verifying Healthcare Invitation</h2>
            <p className="text-xs text-slate-400 mt-1">Validating cryptographic single-use access token...</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg && !invitationData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-rose-900/40 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Invitation Invalid or Expired</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{errorMsg}</p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20"
            >
              Go to Unified Login
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-emerald-900/40 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Account Activated Successfully!</h2>
            <p className="text-xs text-slate-300 leading-relaxed">{successMsg}</p>
            <p className="text-[11px] text-slate-500 pt-2">Redirecting to Unified Healthcare Login in a few seconds...</p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20"
            >
              Log in Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand / Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-white p-1 border border-slate-700 shadow-xl overflow-hidden shrink-0 flex items-center justify-center">
            <Image
              src="/images/oh-id-logo.png"
              alt="One Health ID"
              width={38}
              height={38}
              className="object-contain"
            />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight block leading-tight">ONE HEALTH ID</span>
            <span className="text-[10px] text-cyan-400 block font-semibold">Powered by Sathus Technology Pvt Ltd</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Official Workspace Invitation
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Activate Your Account
            </h2>
            <p className="text-xs text-slate-400">
              Welcome to the ONE HEALTH ID Enterprise Clinical Network. Complete your credentials to begin.
            </p>
          </div>

          {/* User & Hospital Banner */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-base shrink-0">
                {invitationData?.first_name ? invitationData.first_name[0] : "U"}
              </div>
              <div className="truncate">
                <h4 className="text-sm font-bold text-white truncate">
                  {invitationData?.first_name || invitationData?.name || "Healthcare Professional"}{" "}
                  {invitationData?.last_name || ""}
                </h4>
                <p className="text-xs text-slate-400 truncate">{invitationData?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-700/60">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                  Hospital / Org
                </span>
                <span className="font-medium text-slate-200 truncate block">
                  {invitationData?.hospital_name || "Healthcare Organization"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                  Assigned Role
                </span>
                <span className="font-bold text-blue-400 truncate block">
                  {invitationData?.role || invitationData?.role_code || "HOSPITAL_ADMIN"}
                </span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAccept} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Create Secure Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter strong password"
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>

            {/* Password Strength Checklist */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-[11px]">
              <span className="text-slate-400 font-semibold block">Password Security Requirements:</span>
              <div className="grid grid-cols-2 gap-1 text-slate-400">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-400" : ""}`}>
                  {hasMinLength ? <Check className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
                  <span>8+ characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpperCase && hasLowerCase ? "text-emerald-400" : ""}`}>
                  {hasUpperCase && hasLowerCase ? <Check className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
                  <span>Upper & lowercase</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber || hasSpecial ? "text-emerald-400" : ""}`}>
                  {hasNumber || hasSpecial ? <Check className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
                  <span>Number / Symbol</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-400" : ""}`}>
                  {passwordsMatch ? <Check className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
                  <span>Passwords match</span>
                </div>
              </div>
            </div>

            {/* MFA Checkbox */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <input
                type="checkbox"
                id="mfa"
                checked={enableMfa}
                onChange={(e) => setEnableMfa(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500/20 bg-slate-900"
              />
              <label htmlFor="mfa" className="text-xs text-slate-300 cursor-pointer">
                <span className="font-bold text-white block">Enable Multi-Factor Authentication (MFA)</span>
                Recommended for clinical and administrative staff handling patient healthcare records.
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={accepting || !isPasswordValid || !passwordsMatch}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {accepting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Activating Account...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  Accept & Activate Workspace Access
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Protected by Sathus Technology Zero-Trust IAM &bull; HIPAA & NDHM Compliant
        </p>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
          <RefreshCw className="w-7 h-7 text-blue-400 animate-spin" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
