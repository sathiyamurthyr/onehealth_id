"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Lock, ArrowRight, Sparkles,
  Eye, EyeOff, ShieldAlert, Hospital, Cpu,
  Phone, HelpCircle, X, KeyRound
} from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMobile = username.replace(/[\s\-\+\(\)]/g, "");
    
    if (!cleanMobile) {
      setError("Mobile number is required.");
      return;
    }
    if (!/^\d{10}$/.test(cleanMobile)) {
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
      await api.auth.login(cleanMobile, password);

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
        <div className="lg:col-span-7 2xl:col-span-7 p-6 sm:p-8 2xl:p-12 flex flex-col justify-between bg-white h-full overflow-hidden">
          <div className="max-w-md 2xl:max-w-lg mx-auto w-full my-auto">

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

              {/* Forgot Password Action */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Forgot Password?</span>
                </button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Hospital clinicians and administrative staff are authenticated using their registered primary mobile number. All access scopes and workspace roles are enforced server-side.
              </p>
            </div>

          </div>

          {/* Footer note */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500">
            <span>OneHealth Network © 2026 • <strong className="text-slate-700">Powered by Sathus Technology Pvt Ltd</strong></span>
            <span className="text-slate-400">OneHealth OS v1.0</span>
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
