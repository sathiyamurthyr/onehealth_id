"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Activity, ShieldCheck, Lock, User, ArrowRight,
  Building2, CheckCircle2, Sparkles, Eye, EyeOff,
  Stethoscope, HeartPulse, Users, UserCog, ShieldAlert,
  UserCircle, Hospital, QrCode, Cpu, KeyRound, Check,
  Zap, Globe, Shield, RefreshCw
} from "lucide-react";
import { api } from "@/lib/api";

// Comprehensive demo credential cards for pilot evaluation
const DEMO_USERS = [
  {
    label: "Dr. Senthil Nathan",
    role: "Doctor (Gen Med)",
    username: "dr.senthil",
    password: "doctor123",
    icon: Stethoscope,
    color: "text-emerald-700",
    bg: "bg-emerald-50/80",
    border: "border-emerald-200",
    ring: "ring-emerald-500",
    dot: "bg-emerald-500",
  },
  {
    label: "Dr. Rajesh Kumar",
    role: "Doctor (Ortho)",
    username: "dr.kumar",
    password: "doctor123",
    icon: Stethoscope,
    color: "text-teal-700",
    bg: "bg-teal-50/80",
    border: "border-teal-200",
    ring: "ring-teal-500",
    dot: "bg-teal-500",
  },
  {
    label: "Staff Nurse Priya",
    role: "Nurse & Triage",
    username: "nurse",
    password: "nurse123",
    icon: HeartPulse,
    color: "text-rose-700",
    bg: "bg-rose-50/80",
    border: "border-rose-200",
    ring: "ring-rose-500",
    dot: "bg-rose-500",
  },
  {
    label: "Sarah Jenkins",
    role: "Front Desk & OPD",
    username: "receptionist",
    password: "rec123",
    icon: Users,
    color: "text-amber-700",
    bg: "bg-amber-50/80",
    border: "border-amber-200",
    ring: "ring-amber-500",
    dot: "bg-amber-500",
  },
  {
    label: "Facility Admin",
    role: "Hospital Admin",
    username: "hospadmin",
    password: "admin123",
    icon: UserCog,
    color: "text-blue-700",
    bg: "bg-blue-50/80",
    border: "border-blue-200",
    ring: "ring-blue-500",
    dot: "bg-blue-500",
  },
  {
    label: "System Executive",
    role: "Super Admin",
    username: "admin",
    password: "admin123",
    icon: ShieldAlert,
    color: "text-purple-700",
    bg: "bg-purple-50/80",
    border: "border-purple-200",
    ring: "ring-purple-500",
    dot: "bg-purple-500",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter your User ID or Username.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.auth.login(username.trim(), password);

      // Auto-detect workspace — dynamic routing driven strictly by backend RBAC
      let targetRoute = "/dashboard";
      try {
        const wsRes = await api.workspace.getMyWorkspace();
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

      if (typeof window !== "undefined") {
        window.location.href = targetRoute;
      } else {
        router.push(targetRoute);
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your User ID and password.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setActivePreset(u);
    setError("");
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
                <div className="flex h-11 w-11 2xl:h-13 2xl:w-13 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white shadow-lg shadow-blue-900/40">
                  <Activity className="w-5 h-5 2xl:w-6 2xl:h-6 text-cyan-300 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg 2xl:text-xl font-black tracking-tight text-white drop-shadow-sm">
                      ONEHEALTH
                    </span>
                    <span className="text-[10px] font-black text-cyan-200 bg-cyan-950/70 px-1.5 py-0.2 rounded border border-cyan-400/40 tracking-wider">
                      v1.0
                    </span>
                  </div>
                  <span className="text-xs 2xl:text-sm text-cyan-200/90 font-medium">
                    Hospital Operating System
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
              One unified digital login identity across multi-hospital branches. Doctors, nurses, and hospital administration with zero client role trust.
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
                      Single Doctor Login Identity
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-blue-500/30 text-cyan-200 text-[9px] font-mono border border-cyan-400/30">
                      SECURE
                    </span>
                  </div>
                  <p className="text-[10px] 2xl:text-xs text-slate-300 mt-0.5">
                    Authorized across Mugalivakkam Main &amp; Iyyappanthangal
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
              <span className="font-semibold text-white text-[11px] 2xl:text-xs">Kedar Hospital Network</span>
              <span className="text-[10px] text-slate-400">• Chennai Pilot</span>
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
            RIGHT INTERACTIVE SIGN-IN PANEL (ZERO SCROLL)
           ════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 2xl:col-span-7 p-4 sm:p-6 2xl:p-8 flex flex-col justify-between bg-white h-full overflow-hidden">
          <div className="max-w-md 2xl:max-w-lg mx-auto w-full">

            {/* Mobile Header (Shown on < lg screens) */}
            <div className="lg:hidden flex items-center gap-2.5 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black text-slate-900">ONEHEALTH ID</span>
                  <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                    v1.0
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Kedar Hospital Network • Chennai Pilot</span>
              </div>
            </div>

            {/* Form Title & Context */}
            <div className="mb-2 sm:mb-3 2xl:mb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] sm:text-[11px] font-semibold mb-1.5">
                <Sparkles className="w-3 h-3 text-blue-600 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Single Universal Portal — Dynamic Role Detection</span>
              </div>
              <h2 className="text-xl sm:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
                Sign In to OneHealth OS
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                Enter clinician credentials. The platform scopes your facility practice automatically.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-2.5 mb-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 animate-in fade-in duration-200">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleLogin} className="space-y-2.5">
              <div>
                <label htmlFor="login-username" className="text-[11px] 2xl:text-xs font-bold text-slate-700 block mb-1">
                  User ID / Username / OneHealth ID
                </label>
                <div className="relative group">
                  <User className="w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-600 absolute left-3 top-2.5 transition-colors" />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setActivePreset(null);
                    }}
                    required
                    autoFocus
                    autoComplete="username"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs 2xl:text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[38px] transition"
                    placeholder="e.g. dr.senthil, dr.kumar, nurse, hospadmin"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="login-password" className="text-[11px] 2xl:text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <span className="text-[10px] text-slate-400">Enterprise Encrypted</span>
                </div>
                <div className="relative group">
                  <Lock className="w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-600 absolute left-3 top-2.5 transition-colors" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs 2xl:text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 min-h-[38px] transition"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1.5 py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs 2xl:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg transition-all active:scale-[0.98] min-h-[40px] 2xl:min-h-[44px]"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating &amp; Resolving Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to OneHealth OS</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* ── Demo Credentials & Quick Fill Switcher ── */}
            <div className="mt-2.5 sm:mt-3 pt-2.5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] 2xl:text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pilot Evaluation — Instant Role Quick-Fill
                </p>
                <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.2 rounded-full border border-blue-200">
                  1-Click Select
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {DEMO_USERS.map((u) => {
                  const Icon = u.icon;
                  const isSelected = activePreset === u.username || username === u.username;
                  return (
                    <button
                      key={u.username}
                      type="button"
                      onClick={() => fillDemo(u.username, u.password)}
                      className={`p-2 rounded-xl text-left border transition-all text-xs font-medium cursor-pointer relative group ${
                        isSelected
                          ? `${u.bg} ${u.border} ring-2 ${u.ring} shadow-xs scale-[1.01]`
                          : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? u.color : "text-slate-400"}`} />
                          <span className={`font-bold text-[11px] truncate ${isSelected ? u.color : "text-slate-800"}`}>
                            {u.label}
                          </span>
                        </div>
                        {isSelected && <Check className={`w-3 h-3 ${u.color}`} />}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{u.role}</p>
                      <div className="flex items-center justify-between mt-0.5 text-[9px] font-mono text-slate-400">
                        <span>{u.username}</span>
                        <span>{u.password}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="mt-1.5 text-[10px] text-slate-400 leading-tight">
                Click any credential card to auto-fill. The platform resolves the single-login doctor identity, authorized hospital branches, and permitted workflows automatically.
              </p>
            </div>

          </div>

          {/* Footer note */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Kedar Hospital Network © 2026</span>
            <span>OneHealth OS v1.0 Pilot</span>
          </div>
        </div>

      </div>

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
