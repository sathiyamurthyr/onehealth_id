"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import {
  ShieldCheck,
  RefreshCw,
  QrCode,
  HeartPulse,
  AlertTriangle,
  Building2,
  Lock,
  Sparkles,
  CheckCircle2,
  FileText,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";

export function HeroIdentityCardSimulator() {
  const [activeTab, setActiveTab] = useState<"QR" | "ICE" | "RX">("QR");
  const [secondsLeft, setSecondsLeft] = useState(48);
  const [qrToken, setQrToken] = useState("OHID-LIVE-891A09-SECURE");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          handleRefresh();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
      setQrToken(`OHID-LIVE-${rand}-SECURE`);
      setSecondsLeft(60);
      setIsRefreshing(false);
    }, 400);
  };

  const formattedCountdown = `00:${secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}`;

  return (
    <div className="relative w-full max-w-xl mx-auto my-6 lg:my-0">
      {/* Decorative ambient glow orbs */}
      <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 via-indigo-500/20 to-teal-500/20 rounded-3xl blur-2xl -z-10 pointer-events-none" />

      {/* Floating Top Metric Pill */}
      <div className="absolute -top-4 -left-2 sm:-left-6 z-20 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 border border-slate-200/90 shadow-lg shadow-slate-900/5 text-xs font-semibold text-slate-800 backdrop-blur-md">
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
        <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-3" />
        <Zap className="w-3.5 h-3.5 text-blue-600" />
        <span>Contactless Check-in &lt; 30s</span>
      </div>

      {/* Floating Right Pill */}
      <div className="absolute -bottom-4 -right-2 sm:-right-6 z-20 hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 border border-slate-200/90 shadow-lg shadow-slate-900/5 text-xs font-semibold text-slate-800 backdrop-blur-md">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>100% Zero-Knowledge Privacy</span>
      </div>

      {/* Main Glassmorphic Identity Card Container */}
      <div className="relative rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white shadow-2xl border border-slate-800/80 overflow-hidden">
        {/* Subtle background card mesh pattern */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 p-1 flex items-center justify-center border border-white/20 shrink-0">
              <Image
                src="/images/oh-id-logo.png"
                alt="OneHealth ID"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white block">OneHealth ID</span>
              <span className="text-[10px] text-blue-300 font-medium tracking-wide">
                Digital Health Identity Card
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Identity Active</span>
          </div>
        </div>

        {/* Interactive Mode Switcher Tabs */}
        <div className="flex items-center justify-between bg-slate-900/80 p-1 rounded-xl my-4 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("QR")}
            className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "QR"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Identity QR</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ICE")}
            className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "ICE"
                ? "bg-red-600/90 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Emergency ICE</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("RX")}
            className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "RX"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Active Rx</span>
          </button>
        </div>

        {/* Tab 1: Identity QR Content */}
        {activeTab === "QR" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                    PATIENT NAME
                  </span>
                  <h3 className="text-lg font-bold text-white tracking-tight">Alice Smith</h3>
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                    UNIVERSAL OH-ID
                  </span>
                  <div className="font-mono text-xs font-bold text-blue-400 tracking-wider flex items-center gap-1.5 justify-center sm:justify-start">
                    <span>OHID-IND-2026-01001</span>
                    <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded text-[9px]">
                      VERIFIED
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">DOB</span>
                    <span className="font-semibold text-slate-300">1994-01-01</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">GENDER</span>
                    <span className="font-semibold text-slate-300">Female</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">BLOOD</span>
                    <span className="font-bold text-red-400">O+ Positive</span>
                  </div>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center bg-white p-3 rounded-2xl shadow-md shrink-0">
                <QRCodeSVG
                  value={`https://ohid.online/verify/identity/${qrToken}`}
                  size={108}
                  level="M"
                  includeMargin={false}
                />
                <span className="text-[9px] font-bold text-slate-700 mt-1 uppercase tracking-tight">
                  Hospital Scan
                </span>
              </div>
            </div>

            {/* Countdown & Refresh Bar */}
            <div className="flex items-center justify-between bg-slate-900/70 px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px]">QR Expiry:</span>
                <span className="font-mono font-bold text-amber-300">{formattedCountdown}</span>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Refresh Token</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Emergency ICE Content */}
        {activeTab === "ICE" && (
          <div className="space-y-3 bg-red-950/30 p-4 rounded-2xl border border-red-900/50">
            <div className="flex items-center gap-2 text-red-400 pb-2 border-b border-red-900/40">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Emergency In-Case-Of-Emergency (ICE) Data
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Critical Allergies</span>
                <span className="font-bold text-red-300">Penicillin, Sulfa</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Chronic Conditions</span>
                <span className="font-semibold text-white">Mild Asthma</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Emergency Contact</span>
                <span className="font-semibold text-white">Robert Smith (Spouse)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Emergency Phone</span>
                <span className="font-mono font-semibold text-blue-300">+91 98401 23456</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 italic">
              Emergency responders scan to access life-critical clinical allergy and contact data without full EHR exposure.
            </p>
          </div>
        )}

        {/* Tab 3: Active Prescription Content */}
        {activeTab === "RX" && (
          <div className="space-y-3 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-blue-400">
                <FileText className="w-4 h-4" />
                <span className="text-xs font-bold">Latest Signed Prescription</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                SRMC Classic Hospital Rx
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Diagnosis:</span>
                <span className="font-semibold text-white">Seasonal Allergic Rhinitis</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Prescribed by:</span>
                <span className="font-semibold text-white">Dr. Senthil Nathan (MBBS, MD)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Medication:</span>
                <span className="font-semibold text-emerald-400">Amoxicillin 625mg • 1-0-1</span>
              </div>
              <div className="flex justify-between text-[11px] pt-1 text-slate-400">
                <span>Hospital:</span>
                <span className="text-slate-300">Kedar Super Specialty Hospital</span>
              </div>
            </div>
          </div>
        )}

        {/* Card Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>HL7 FHIR R4 • Encrypted Ledger</span>
          </div>
          <span className="font-mono text-slate-500">Token: {qrToken.substring(0, 14)}...</span>
        </div>
      </div>
    </div>
  );
}

