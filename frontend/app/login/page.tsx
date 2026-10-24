"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Lock, ArrowRight, Sparkles,
  Eye, EyeOff, ShieldAlert, Hospital, Cpu,
  Phone, HelpCircle, X, KeyRound,
  Stethoscope, Building2, HeartPulse, User, Users, CheckCircle2, ChevronRight, Loader2
} from "lucide-react";
import { api } from "@/lib/api";
import { ContactSathusSection } from "@/components/login/ContactSathusSection";
import { getSathusContactConfig } from "@/lib/config/contactConfig";

export default function LoginPage() {
  const router = useRouter();
  const contactConfig = getSathusContactConfig();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successBanner, setSuccessBanner] = useState("");
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const isRegistered = params.get("registered");
        const mobileParam = params.get("mobile");
        if (mobileParam) {
          setUsername(mobileParam);
        }
        if (isRegistered === "true") {
          setSuccessBanner("Registration successful! Your OneHealth ID account is ready. Please sign in below.");
        }
      } catch (err) {
        // Non-blocking query param reading
      }
    }
  }, []);

  // Multi-Role Selection State
  const [multiRoleWorkspaces, setMultiRoleWorkspaces] = useState<any[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [selectedRoleIdx, setSelectedRoleIdx] = useState<number | null>(null);
  const [activeUser, setActiveUser] = useState<any>(null);

  const getRoleTheme = (roleCode: string) => {
    switch (roleCode?.toUpperCase()) {
      case "DOCTOR":
        return {
          icon: Stethoscope,
          bg: "bg-blue-50/70 hover:bg-blue-50 border-blue-200 hover:border-blue-400 hover:shadow-blue-500/10",
          iconBg: "bg-blue-600 text-white shadow-blue-500/30",
          tagBg: "bg-blue-100/80 text-blue-800 border-blue-200",
          tag: "CLINICAL CARE",
          badge: "Doctor OPD & IPD"
        };
      case "HOSPITAL_ADMIN":
      case "ADMIN":
        return {
          icon: Building2,
          bg: "bg-emerald-50/70 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-500/10",
          iconBg: "bg-emerald-600 text-white shadow-emerald-500/30",
          tagBg: "bg-emerald-100/80 text-emerald-800 border-emerald-200",
          tag: "EXECUTIVE CONSOLE",
          badge: "Hospital Administration"
        };
      case "SUPER_ADMIN":
        return {
          icon: ShieldCheck,
          bg: "bg-purple-50/70 hover:bg-purple-50 border-purple-200 hover:border-purple-400 hover:shadow-purple-500/10",
          iconBg: "bg-purple-600 text-white shadow-purple-500/30",
          tagBg: "bg-purple-100/80 text-purple-800 border-purple-200",
          tag: "PLATFORM GOVERNANCE",
          badge: "Super Administrator"
        };
      case "NURSE":
        return {
          icon: HeartPulse,
          bg: "bg-rose-50/70 hover:bg-rose-50 border-rose-200 hover:border-rose-400 hover:shadow-rose-500/10",
          iconBg: "bg-rose-600 text-white shadow-rose-500/30",
          tagBg: "bg-rose-100/80 text-rose-800 border-rose-200",
          tag: "NURSING & WARD",
          badge: "Staff Nurse Station"
        };
      case "PATIENT":
        return {
          icon: User,
          bg: "bg-sky-50/70 hover:bg-sky-50 border-sky-200 hover:border-sky-400 hover:shadow-sky-500/10",
          iconBg: "bg-sky-600 text-white shadow-sky-500/30",
          tagBg: "bg-sky-100/80 text-sky-800 border-sky-200",
          tag: "PERSONAL HEALTH",
          badge: "Patient Citizen"
        };
      default:
        return {
          icon: Users,
          bg: "bg-amber-50/70 hover:bg-amber-50 border-amber-200 hover:border-amber-400 hover:shadow-amber-500/10",
          iconBg: "bg-amber-600 text-white shadow-amber-500/30",
          tagBg: "bg-amber-100/80 text-amber-800 border-amber-200",
          tag: "STAFF DESK",
          badge: roleCode || "Staff Desk"
        };
    }
  };

  const getExplicitRedirect = () => {
    if (typeof window !== "undefined") {
      try {
        const red = new URLSearchParams(window.location.search).get("redirect");
        if (red && red.startsWith("/") && !red.startsWith("//")) {
          return red;
        }
      } catch {
        return null;
      }
    }
    return null;
  };

  const handleSelectWorkspace = async (ws: any, index: number) => {
    setSelectedRoleIdx(index);
    setSwitchingRole(true);
    try {
      const res = await api.workspace.switchContext({
        hospital_ref_id: ws.hospital_ref_id,
        usertype_ref_id: ws.usertype_ref_id,
        role_code: ws.role_code,
        department_id: ws.department_id,
      });

      const explicitRedirect = getExplicitRedirect();
      const targetRoute = explicitRedirect || res.workspace?.workspace?.default_route || ws.default_route || "/dashboard";
      if (typeof window !== "undefined") {
        localStorage.setItem("oh_workspace", JSON.stringify(res.workspace?.workspace || ws));
        window.location.href = targetRoute;
      } else {
        router.push(targetRoute);
      }
    } catch (err: any) {
      console.error("Failed to switch workspace context:", err);
      // Fallback direct navigate
      const explicitRedirect = getExplicitRedirect();
      const targetRoute = explicitRedirect || ws.default_route || "/dashboard";
      if (typeof window !== "undefined") {
        localStorage.setItem("oh_workspace", JSON.stringify(ws));
        window.location.href = targetRoute;
      } else {
        router.push(targetRoute);
      }
    } finally {
      setSwitchingRole(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMobile = username.replace(/[\s\-\+\(\)]/g, "");
    
    if (!cleanMobile && !username.trim()) {
      setError("Mobile number is required.");
      return;
    }
    const isMobile = /^\d{10}$/.test(cleanMobile);
    const isUsername = /^[a-zA-Z][a-zA-Z0-9._-]*$/.test(username.trim());
    if (!isMobile && !isUsername) {
      setError("Enter a valid 10-digit registered mobile number.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const loginIdentifier = isMobile ? cleanMobile : username.trim();
      await api.auth.login(loginIdentifier, password);

      // Auto-detect workspace — check if user has multiple roles
      let targetRoute = "/dashboard";
      try {
        const wsRes = await api.workspace.getMyWorkspace();
        
        if (wsRes?.available_workspaces && wsRes.available_workspaces.length > 1) {
          // Multiple roles detected! Pause and show role selection modal
          setMultiRoleWorkspaces(wsRes.available_workspaces);
          setActiveUser(wsRes.user || { name: wsRes.workspace?.role_name || "Practitioner" });
          setShowRoleModal(true);
          setLoading(false);
          return;
        }

        if (wsRes?.workspace) {
          if (typeof window !== "undefined") {
            localStorage.setItem("oh_workspace", JSON.stringify(wsRes.workspace));
          }
          if (wsRes.workspace.default_route) {
            targetRoute = wsRes.workspace.default_route;
          }
        }
      } catch (wsErr) {
        console.warn("Could not resolve workspace route, falling back to default", wsErr);
      }

      const explicitRedirect = getExplicitRedirect();
      const finalDestination = explicitRedirect || targetRoute;

      if (typeof window !== "undefined") {
        window.location.href = finalDestination;
      } else {
        router.push(finalDestination);
      }
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      if (status === 403) {
        setError("This account is inactive, locked, or suspended. Please contact hospital administration.");
      } else {
        setError("The mobile number or password is incorrect.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen max-h-screen overflow-hidden bg-slate-100/70 flex items-center justify-center p-2 sm:p-4 lg:p-6 2xl:p-10 relative selection:bg-blue-600 selection:text-white">
      {/* ── Background Ambient Light Orbs (Optimized for 4K / 8K Displays) ── */}
      <div className="absolute top-0 left-0 w-[500px] 2xl:w-[800px] h-[500px] 2xl:h-[800px] bg-blue-400/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[600px] 2xl:w-[900px] h-[600px] 2xl:h-[900px] bg-indigo-400/10 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3 animate-pulse" />

      {/* ── Main Responsive Container Card (Zero Scroll, 8K/4K/Laptop Adaptive) ── */}
      <div className="w-full max-w-5xl 2xl:max-w-6xl 3xl:max-w-7xl bg-white border border-slate-200/90 rounded-3xl 2xl:rounded-4xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-full max-h-[94vh] z-10">
        
        {/* ════════════════════════════════════════════════════════════
            LEFT BRANDING & CINEMATIC CLINICAL HERO PANEL
           ════════════════════════════════════════════════════════════ */}
        <div className="hidden lg:flex lg:col-span-5 2xl:col-span-5 relative overflow-hidden flex-col justify-between p-6 2xl:p-10 text-white h-full">
          {/* Hero Photorealistic Clinical Background Image */}
          <Image
            src="/images/kedar_smart_hospital_hero.jpg"
            alt="OneHealth Smart Clinical Command Center"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-center scale-105 hover:scale-100 transition-transform duration-1000 ease-out"
          />

          {/* High-fidelity Vignette & Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-blue-950/60 backdrop-blur-[1.5px]" />

          {/* Top Brand & Status */}
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 2xl:h-14 2xl:w-14 rounded-2xl bg-white/95 p-1.5 shadow-xl shadow-blue-950/60 border border-white/50 overflow-hidden shrink-0 flex items-center justify-center">
                  <Image
                    src="/images/oh-id-logo.png"
                    alt="OneHealth ID"
                    fill
                    sizes="56px"
                    priority
                    className="object-contain p-1"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg 2xl:text-xl font-black tracking-tight text-white drop-shadow-sm">
                      ONEHEALTH ID
                    </span>
                    <span className="text-[10px] font-black text-cyan-200 bg-cyan-950/70 px-1.5 py-0.2 rounded border border-cyan-400/40 tracking-wider">
                      v1.0
                    </span>
                  </div>
                  <span className="text-xs 2xl:text-sm text-cyan-200/90 font-medium block">
                    Universal Hospital Operating System
                  </span>
                  <span className="text-[10px] text-cyan-300 font-bold tracking-wide block mt-0.5">
                    Powered by Sathus Technology Pvt Ltd
                  </span>
                </div>
              </div>

              <div className="hidden xl:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-[10px] font-semibold text-emerald-300 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Pilot Active</span>
              </div>
            </div>

            <h1 className="text-xl 2xl:text-3xl 3xl:text-4xl font-black tracking-tight text-white leading-tight mt-2">
              Universal Clinical Operating System
            </h1>
            <p className="text-[11px] 2xl:text-xs 3xl:text-sm text-slate-200/90 leading-relaxed mt-1.5 max-w-md">
              One unified digital login identity across multi-hospital branches. Doctors, nurses, and hospital administration with Backend-enforced RBAC &amp; secure session controls.
            </p>
          </div>

          {/* Center Floating Glassmorphic Identity Hologram Card */}
          <div className="relative z-10 my-2 py-1">
            <div className="relative rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-3 2xl:p-4 shadow-2xl max-w-md overflow-hidden group hover:border-cyan-300/40 transition-all duration-300">
              {/* Scanline Animation */}
              <div className="scanbeam absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent pointer-events-none" />

              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 2xl:w-16 2xl:h-16 rounded-xl overflow-hidden border border-cyan-300/40 shrink-0 shadow-inner bg-slate-900">
                  <Image
                    src="/images/onehealth_secure_badge.jpg"
                    alt="Digital Medical Identity"
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-xs 2xl:text-sm font-bold text-white tracking-wide">
                      One Universal Login Identity
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-blue-500/30 text-cyan-200 text-[9px] font-mono border border-cyan-400/30">
                      SECURE
                    </span>
                  </div>
                  <p className="text-[10px] 2xl:text-xs text-slate-300 mt-0.5">
                    Authorized across registered healthcare facilities &amp; branches
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-[9px] 2xl:text-[10px] text-cyan-300 font-mono">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Cryptographic Session Tokens • RBAC</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Hospital Network Badges */}
          <div className="relative z-10 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Hospital className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
              <span className="font-semibold text-white text-[11px] 2xl:text-xs">OneHealth Network</span>
              <span className="text-[10px] text-slate-400">• Enterprise Multi-Tenant</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-medium border border-white/15">
                <Cpu className="w-3 h-3 text-cyan-300" />
                <span>Zero Scroll Engine</span>
              </span>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            RIGHT INTERACTIVE SIGN-IN PANEL (CLEAN ENTERPRISE UI)
           ════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 2xl:col-span-7 p-4 sm:p-6 2xl:p-10 flex flex-col justify-between bg-white h-full overflow-y-auto">
          <div className="max-w-md 2xl:max-w-lg mx-auto w-full my-auto py-1">

            {/* Mobile Header (Shown on < lg screens) */}
            <div className="lg:hidden flex items-center gap-2.5 mb-5">
              <div className="relative h-10 w-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1 shrink-0 overflow-hidden">
                <Image
                  src="/images/oh-id-logo.png"
                  alt="OneHealth ID"
                  fill
                  sizes="40px"
                  priority
                  className="object-contain p-0.5"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black text-slate-900">ONEHEALTH ID</span>
                  <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                    v1.0
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block">Unified Healthcare ID Network</span>
                <span className="text-[9px] text-blue-600 font-bold block">Powered by Sathus Technology Pvt Ltd</span>
              </div>
            </div>

            {/* Form Title & Context */}
            <div className="mb-4 sm:mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] sm:text-[11px] font-semibold mb-2">
                <Sparkles className="w-3 h-3 text-blue-600 animate-spin" style={{ animationDuration: '6s' }} />
                <span>One Login — Your Authorized Workspace</span>
              </div>
              <h2 className="text-2xl sm:text-3xl 2xl:text-4xl font-extrabold text-slate-900 tracking-tight">
                Sign In to OneHealth OS
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Enter your registered mobile number and password. Your authorized workspace and access are determined automatically.
              </p>
            </div>

            {/* Success Banner from Registration */}
            {successBanner && (
              <div className="p-3 mb-4 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="font-semibold leading-normal">{successBanner}</span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-3 mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200" id="login-error-banner">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="font-medium leading-normal">{error}</span>
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleLogin} noValidate className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-username" className="text-xs 2xl:text-sm font-bold text-slate-700">
                    Registered Mobile Number
                  </label>
                  <span className="text-[11px] text-blue-600 font-medium">Primary Login Identifier</span>
                </div>
                <div className="relative group">
                  <Phone className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 absolute left-3.5 top-3 transition-colors" />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (error) setError("");
                    }}
                    autoFocus
                    autoComplete="username tel"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs 2xl:text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[42px] transition font-medium"
                    placeholder="e.g. 9840111222"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="text-xs 2xl:text-sm font-bold text-slate-700">
                    Password
                  </label>
                  <span className="text-[11px] text-slate-400">Enterprise Encrypted</span>
                </div>
                <div className="relative group">
                  <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 absolute left-3.5 top-3 transition-colors" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs 2xl:text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[42px] transition"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs 2xl:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg transition-all active:scale-[0.98] min-h-[44px] 2xl:min-h-[48px] cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating &amp; Resolving Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to OneHealth OS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Register & Forgot Password Actions */}
              <div className="flex items-center justify-between pt-2 text-xs">
                <Link
                  href="/register"
                  className="text-blue-600 hover:text-blue-800 font-bold transition hover:underline inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>New to OH-ID? Register</span>
                </Link>

                <Link
                  href="/forgot-password"
                  className="text-slate-500 hover:text-slate-800 font-medium transition hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Forgot Password?</span>
                </Link>
              </div>

              {/* Facility Onboarding Prompt */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 leading-tight">Healthcare Facility?</p>
                    <p className="text-[11px] text-slate-600">Register hospital or clinic for Super Admin review</p>
                  </div>
                </div>
                <Link
                  href="/register/facility"
                  className="px-3 py-1.5 rounded-lg bg-white border border-blue-300 text-blue-700 font-bold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition shadow-xs text-[11px] shrink-0 inline-flex items-center gap-1"
                >
                  <span>Register</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </form>

            {/* ── Contact Sathus Technology Section ── */}
            <ContactSathusSection />

            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Hospital clinicians and administrative staff are authenticated using their registered primary mobile number. All access scopes and workspace roles are enforced server-side.
              </p>
            </div>

          </div>

          {/* Footer note */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <div>
              <span>OneHealth Network © 2026 • <strong className="text-slate-700">Powered by Sathus Technology Pvt Ltd</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              {contactConfig.privacyPolicyUrl && (
                <Link
                  href={contactConfig.privacyPolicyUrl}
                  className="hover:text-blue-600 transition-colors"
                >
                  Privacy Policy
                </Link>
              )}
              {contactConfig.privacyPolicyUrl && contactConfig.termsOfServiceUrl && <span>•</span>}
              {contactConfig.termsOfServiceUrl && (
                <Link
                  href={contactConfig.termsOfServiceUrl}
                  className="hover:text-blue-600 transition-colors"
                >
                  Terms of Service
                </Link>
              )}
              <span>•</span>
              <span className="text-slate-400">OneHealth OS v1.0</span>
            </div>
          </div>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition cursor-pointer p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-3">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Forgot Your Password?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              To reset your credentials, please contact your <strong>Hospital IT Administrator</strong> or reach out to the OneHealth Support Helpdesk with your registered mobile number.
            </p>
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
              <div className="font-semibold text-slate-800">Support Desk:</div>
              <div>📞 044-2476-0000 / Support</div>
              <div>✉️ support@onehealthid.in</div>
            </div>
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* ── Multi-Role Pre-Dashboard Workspace Selection Modal ("Select Your Workspace") ── */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 relative overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Top Glowing Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-emerald-500 to-indigo-600" />
            
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    Select Your Workspace
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your account has multiple authorized roles. Choose where you want to continue.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  api.auth.logout();
                  setShowRoleModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 transition p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
                title="Sign out & switch number"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Greeting Pill */}
            <div className="mb-4 py-2 px-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Authenticated User: <strong className="text-slate-800 font-semibold">{activeUser?.name || "Practitioner"}</strong>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {multiRoleWorkspaces.length} authorized workspaces
              </span>
            </div>

            {/* Workspace Cards List */}
            <div className="space-y-3 overflow-y-auto pr-1 flex-1 py-1">
              {multiRoleWorkspaces.map((ws, idx) => {
                const theme = getRoleTheme(ws.role_code || ws.workspace_type);
                const IconComponent = theme.icon;
                const isLaunchingThis = switchingRole && selectedRoleIdx === idx;
                const categoryTitle = ws.category_title || theme.tag;

                return (
                  <div
                    key={`${ws.hospital_ref_id}-${ws.usertype_ref_id}-${ws.role_code}-${idx}`}
                    className={`w-full p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
                      theme.bg
                    } ${
                      selectedRoleIdx === idx ? "ring-2 ring-blue-600 border-transparent shadow-md" : ""
                    } ${switchingRole && selectedRoleIdx !== idx ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform ${theme.iconBg}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {/* Category Title Header */}
                        <div className="text-xs font-semibold text-slate-500 mb-0.5 flex items-center gap-1.5">
                          <span>{categoryTitle}</span>
                        </div>

                        {/* Role Name */}
                        <h4 className="text-base font-bold text-slate-900 leading-snug">
                          {ws.role_name || ws.role_code}
                        </h4>

                        {/* Hospital / Department Context */}
                        <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-semibold text-slate-800">
                            {ws.hospital_name || "OneHealth Healthcare Facility"}
                          </span>
                          {ws.department_name && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-blue-700 font-medium">{ws.department_name}</span>
                            </>
                          )}
                          {ws.branch_name && !ws.department_name && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500">{ws.branch_name}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Action Button: Continue */}
                    <div className="shrink-0 flex items-center justify-end sm:pl-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50">
                      <button
                        type="button"
                        disabled={switchingRole}
                        onClick={() => handleSelectWorkspace(ws, idx)}
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                          isLaunchingThis
                            ? "bg-blue-600 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md hover:shadow-blue-500/20 active:scale-95"
                        }`}
                      >
                        {isLaunchingThis ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Loading Workspace...</span>
                          </>
                        ) : (
                          <>
                            <span>Continue</span>
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero-trust isolated healthcare workspace context</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  api.auth.logout();
                  setShowRoleModal(false);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition cursor-pointer"
              >
                Sign out
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Global CSS to lock scrolling and hide all scrollbars completely */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html, body {
              overflow: hidden !important;
              height: 100% !important;
              max-height: 100vh !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            ::-webkit-scrollbar {
              display: none !important;
              width: 0 !important;
              height: 0 !important;
            }
            * {
              scrollbar-width: none !important;
              -ms-overflow-style: none !important;
            }
            @keyframes scanbeam {
              0% { top: 0%; opacity: 0.2; }
              50% { opacity: 0.9; }
              100% { top: 96%; opacity: 0.2; }
            }
            .scanbeam {
              animation: scanbeam 4s ease-in-out infinite;
            }
          `,
        }}
      />
    </div>
  );
}
