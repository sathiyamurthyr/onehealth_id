"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, QrCode, Building2, ArrowRight, HeartPulse, Stethoscope, Clock, Users } from "lucide-react";
import { api } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = api.auth.getCurrentUser();
    if (user) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      {/* Top Bar */}
      <header className="border-b border-slate-800/80 backdrop-blur-md bg-slate-950/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  ONEHEALTH ID
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  HOS v2.4
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Enterprise Hospital Operating System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/30 min-h-[44px] flex items-center gap-1.5"
            >
              <span>Sign In to Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-700/40 text-blue-400 text-xs font-medium mb-6">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>Universal Digital Healthcare Identity & Multi-Hospital Platform</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl text-slate-100 leading-tight sm:leading-none">
          Unified Digital Identity for{" "}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
            Modern Healthcare
          </span>
        </h1>

        <p className="mt-6 text-sm sm:text-lg text-slate-400 max-w-2xl font-normal leading-relaxed">
          OneHealth ID delivers persistent patient identity, zero-knowledge QR verification, live OPD queue orchestration, and interoperable clinical workflows across hospital networks.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center gap-2 min-h-[48px]"
          >
            <span>Launch Hospital Console</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-sm transition-all flex items-center justify-center gap-2 min-h-[48px]"
          >
            <QrCode className="w-4 h-4 text-blue-400" />
            <span>Direct Dashboard View</span>
          </Link>
        </div>

        {/* Key Feature Badges */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-4xl text-left">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <QrCode className="w-6 h-6 text-blue-400 mb-2" />
            <h3 className="text-xs font-bold text-slate-200">Zero-Knowledge QR</h3>
            <p className="text-[11px] text-slate-400 mt-1">Inter-hospital patient token without exposing raw medical records.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <Clock className="w-6 h-6 text-indigo-400 mb-2" />
            <h3 className="text-xs font-bold text-slate-200">Live OPD Queue</h3>
            <p className="text-[11px] text-slate-400 mt-1">Real-time token calling, priority triage, and doctor consultation tracking.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <Building2 className="w-6 h-6 text-emerald-400 mb-2" />
            <h3 className="text-xs font-bold text-slate-200">Multi-Tenant Engine</h3>
            <p className="text-[11px] text-slate-400 mt-1">Single platform for private hospital clusters & public health networks.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <ShieldCheck className="w-6 h-6 text-purple-400 mb-2" />
            <h3 className="text-xs font-bold text-slate-200">ABDM & GST Ready</h3>
            <p className="text-[11px] text-slate-400 mt-1">India-first compliance, instant UPI invoicing, and complete audit trails.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>© 2026 OneHealth ID Hospital Operating System. Powered by FastAPI & PostgreSQL Views & Stored Procedures.</p>
      </footer>
    </div>
  );
}
