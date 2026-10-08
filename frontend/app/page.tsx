"use client";

import Image from "next/image";
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
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Bar */}
      <header className="border-b border-slate-200/80 backdrop-blur-md bg-white/90 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1 shrink-0 overflow-hidden">
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
                <span className="font-black text-lg tracking-tight text-slate-950">
                  ONEHEALTH ID
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Unified Healthcare Network • Powered by Sathus Technology Pvt Ltd</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm shadow-blue-600/30 min-h-[44px] flex items-center gap-1.5"
            >
              <span>Sign In to Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex-1 flex flex-col items-center justify-center text-center">
        {/* Subtle decorative background accent */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[300px] bg-blue-100/50 rounded-full blur-3xl opacity-60 transform -translate-y-12" />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium mb-6 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Universal Digital Healthcare Identity & Multi-Hospital Platform</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl text-slate-950 leading-tight sm:leading-none">
          Unified Digital Identity for{" "}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 bg-clip-text text-transparent">
            Modern Healthcare
          </span>
        </h1>

        <p className="mt-6 text-sm sm:text-lg text-slate-600 max-w-2xl font-normal leading-relaxed">
          OneHealth ID delivers persistent patient identity, zero-knowledge QR verification, live OPD queue orchestration, and interoperable clinical workflows across hospital networks.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 min-h-[48px]"
          >
            <span>Launch Hospital Console</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 min-h-[48px]"
          >
            <QrCode className="w-4 h-4 text-blue-600" />
            <span>Direct Dashboard View</span>
          </Link>
        </div>

        {/* Key Feature Badges */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl text-left">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Zero-Knowledge QR</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Inter-hospital patient token without exposing raw medical records.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Live OPD Queue</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Real-time token calling, priority triage, and doctor consultation tracking.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Multi-Tenant Engine</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Single platform for private hospital clusters & public health networks.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-purple-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">ABDM & GST Ready</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">India-first compliance, instant UPI invoicing, and complete audit trails.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-slate-50/50 py-6 text-center text-xs text-slate-500">
        <p>© 2026 OneHealth ID (OH-ID) Unified Healthcare Network • <strong className="text-slate-700">Powered by Sathus Technology Pvt Ltd</strong></p>
      </footer>
    </div>
  );
}
