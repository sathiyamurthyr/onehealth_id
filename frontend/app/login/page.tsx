"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ShieldCheck, Lock, User, ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.auth.login(username, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your username and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Container */}
      <div className="w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        {/* Left Branding Panel (Desktop Only) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 p-10 flex-col justify-between relative overflow-hidden border-r border-slate-800">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black tracking-tight text-white">ONEHEALTH</span>
                  <span className="text-xs font-black tracking-wider text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                    ID
                  </span>
                </div>
                <span className="text-xs text-slate-400">Hospital Operating System</span>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white leading-snug mb-3">
              Next-Generation Healthcare Identity & Hospital Platform
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Empowering healthcare networks, private hospital groups, and government health institutions with secure OneHealth QR identities, real-time token queues, and interoperable clinical records.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Unified Patient Identity across network hospitals</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Direct DB Stored Procedures & Views architecture</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero-Knowledge QR Token with strict access controls</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Apollo Hospital Cluster 01</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Enterprise Ready</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel (Desktop & Mobile) */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-slate-900">
          <div className="max-w-md mx-auto w-full">
            {/* Mobile Branding Header */}
            <div className="lg:hidden flex items-center gap-2.5 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold text-white">ONEHEALTH ID</span>
                <span className="block text-[11px] text-slate-400">Hospital Operating System</span>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Sign In to Hospital Portal</h2>
            <p className="text-xs sm:text-sm text-slate-400 mb-6">
              Enter your staff credentials to access patient records and clinical workflows.
            </p>

            {error && (
              <div className="p-3.5 mb-5 text-xs text-rose-300 bg-rose-950/40 border border-rose-800 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Username / Staff ID</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                    placeholder="e.g. admin or doctor"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={loading}
                  className="w-full gap-2 text-sm font-semibold"
                >
                  {loading ? "Authenticating Staff..." : "Sign In to Hospital OS"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>

            {/* Quick Demo Credentials */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
                Quick Test Credentials:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill("admin", "admin123")}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 transition-colors"
                >
                  <span className="text-xs font-bold text-blue-400 block">Admin</span>
                  <span className="text-[10px] text-slate-400 font-mono">admin123</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("doctor", "doctor123")}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 transition-colors"
                >
                  <span className="text-xs font-bold text-emerald-400 block">Doctor</span>
                  <span className="text-[10px] text-slate-400 font-mono">doctor123</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("receptionist", "rec123")}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 transition-colors"
                >
                  <span className="text-xs font-bold text-amber-400 block">Reception</span>
                  <span className="text-[10px] text-slate-400 font-mono">rec123</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("patient", "patient123")}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 transition-colors"
                >
                  <span className="text-xs font-bold text-purple-400 block">Patient</span>
                  <span className="text-[10px] text-slate-400 font-mono">patient123</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
