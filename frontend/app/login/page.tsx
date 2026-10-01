"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, ShieldCheck, Lock, User, ArrowRight,
  Building2, CheckCircle2, Sparkles, Eye, EyeOff,
  Stethoscope, HeartPulse, Users, UserCog, ShieldAlert, UserCircle
} from "lucide-react";
import { api } from "@/lib/api";

// Demo credential sets (for evaluation purposes)
const DEMO_USERS = [
  {
    label: "Super Admin",
    username: "admin",
    password: "admin123",
    icon: ShieldAlert,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  {
    label: "Hospital Admin",
    username: "hospadmin",
    password: "admin123",
    icon: UserCog,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  {
    label: "Doctor",
    username: "dr.senthil",
    password: "doctor123",
    icon: Stethoscope,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    label: "Nurse",
    username: "nurse",
    password: "nurse123",
    icon: HeartPulse,
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  {
    label: "Front Desk",
    username: "receptionist",
    password: "rec123",
    icon: Users,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  {
    label: "Patient",
    username: "patient",
    password: "patient123",
    icon: UserCircle,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    dot: "bg-cyan-500",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      // Auto-detect workspace — no role selection needed
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
        console.warn("Could not resolve workspace route, falling back to /dashboard", wsErr);
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
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        
        {/* ── Left Branding Panel ── */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 p-10 flex-col justify-between relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-white/5 blur-3xl -mr-12 -mb-12 pointer-events-none" />

          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white shadow">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-tight text-white">ONEHEALTH</span>
                  <span className="text-xs font-black text-blue-200 bg-white/10 px-2 py-0.5 rounded border border-white/20">
                    ID
                  </span>
                </div>
                <span className="text-xs text-blue-200">Hospital Operating System</span>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white leading-snug mb-3">
              Universal Healthcare Identity &amp; Clinical Platform
            </h1>
            <p className="text-xs text-blue-100 leading-relaxed mb-8">
              One sign-in for all roles — doctors, nurses, hospital staff, administrators, and patients — each accessing their dedicated, role-controlled workspace automatically.
            </p>

            <div className="space-y-3.5">
              {[
                "Automatic role detection & dynamic workspace routing",
                "Unified Patient Identity across hospital network facilities",
                "Zero client role trust — strict server-side RBAC security",
                "Multi-tenant isolation with cryptographic session tokens",
              ].map((feat, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-blue-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-white/20 flex items-center justify-between text-[11px] text-blue-200">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>Kedar Hospital Network</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Enterprise Hardened</span>
            </div>
          </div>
        </div>

        {/* ── Right Form Panel ── */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full">

            {/* Mobile Header */}
            <div className="lg:hidden flex items-center gap-2.5 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold text-slate-900">ONEHEALTH ID</span>
                <span className="block text-[11px] text-slate-500">Hospital Operating System</span>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Single Universal Portal — No Role Selection Required</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1.5">Sign In to OneHealth OS</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Enter your credentials. The system will automatically detect your role, hospital, and workspace.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 mb-5 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-username" className="text-xs font-semibold text-slate-700 block mb-1.5">
                  User ID / Username / OneHealth ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] transition"
                    placeholder="e.g. dr.senthil, nurse, hospadmin, patient"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] transition"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] min-h-[48px]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating & Loading Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to OneHealth OS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Demo Credentials — Role-Wise Quick Fill */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Pilot Evaluation — Role-wise Quick Login
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEMO_USERS.map((u) => {
                  const Icon = u.icon;
                  const isSelected = username === u.username;
                  return (
                    <button
                      key={u.username}
                      type="button"
                      onClick={() => fillDemo(u.username, u.password)}
                      className={`p-2.5 rounded-xl text-left border transition-all text-xs font-medium ${
                        isSelected
                          ? `${u.bg} ${u.border} ${u.color} ring-2 ring-offset-1 ring-blue-400`
                          : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${u.dot}`} />
                        <span className={`font-bold text-[11px] ${isSelected ? u.color : "text-slate-600"}`}>
                          {u.label}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-slate-500 truncate">ID: {u.username}</p>
                      <p className="font-mono text-[10px] text-slate-400 truncate">PW: {u.password}</p>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[10px] text-slate-400 leading-relaxed">
                Click any credential card to auto-fill. The system determines roles, forms, and navigation automatically — no manual selection.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
