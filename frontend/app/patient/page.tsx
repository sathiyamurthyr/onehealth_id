"use client";

import React, { useState, useEffect } from "react";
import {
  QrCode, Calendar, FileText, Activity, Receipt,
  ShieldCheck, Building2, Heart, ChevronRight, ArrowLeft,
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { DynamicDashboard } from "@/components/workspace/DynamicDashboard";
import Link from "next/link";

export default function PatientWorkspacePage() {
  const { workspace, user } = useWorkspace();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPatientData() {
      try {
        setLoading(true);
        const appts = await api.appointments.list().catch(() => []);
        setAppointments(appts || []);
      } catch (err) {
        console.error("Failed to load patient personal records", err);
      } finally {
        setLoading(false);
      }
    }
    loadPatientData();
  }, []);

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Patient Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-3xl -mr-12 -mb-12 pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Citizen Healthcare Identity</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Welcome, {user?.name || "Patient Portal"}
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
                Your universal OneHealth ID unites your medical history across Kedar Hospital and all accredited network providers.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2 text-xs text-blue-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Primary Hospital: <strong className="text-white">{workspace?.hospital_name || "Kedar Hospital"}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <span>OneHealth ID:</span>
                  <strong className="text-cyan-300 font-bold">{user?.username || "OH-2026-PATIENT"}</strong>
                </div>
              </div>
            </div>

            {/* QR Pass */}
            <div className="bg-white p-4 rounded-2xl shadow-xl flex flex-col items-center shrink-0 border-2 border-blue-300/40">
              <div className="w-28 h-28 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 mb-2">
                <QrCode className="w-20 h-20 text-slate-800" />
              </div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-600 uppercase">Zero-Knowledge Pass</span>
              <span className="text-[9px] text-slate-400">Scan at Hospital Reception</span>
            </div>
          </div>
        </div>

        {/* Dynamic Patient Widgets */}
        <DynamicDashboard
          title="My Health Dashboard"
          subtitle="Real-time access to your outpatient appointments, prescriptions, and lab diagnostic history."
        />

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { href: "/patient/id-card", icon: QrCode, label: "My OneHealth ID Card", desc: "Download your digital health pass and QR code.", color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-200", meta: "View Card" },
            { href: "/patient/appointments", icon: Calendar, label: "My Appointments", desc: "View upcoming clinical visits or book follow-up slots.", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", meta: `${appointments.length} Scheduled` },
            { href: "/patient/records", icon: FileText, label: "Medical Records", desc: "View your visit history, lab results, and prescriptions.", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", meta: "View Records" },
            { href: "/billing", icon: Receipt, label: "Bills & Receipts", desc: "Hospital bills, consultation receipts, and insurance claims.", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", meta: "View Bills" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`bg-white border ${item.border} rounded-2xl p-5 space-y-3 hover:shadow-md transition group`}
              >
                <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">{item.label}</h4>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <div className={`pt-2 border-t border-slate-100 flex justify-between text-xs ${item.color} font-medium`}>
                  <span>{item.meta}</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Privacy Notice */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3 text-xs text-blue-700">
          <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
          <span>
            <strong>Patient Data Privacy Guarantee:</strong> Your medical records are encrypted and protected by ABDM consent framework. No third party or hospital staff may access your diagnostic history without an active consultation episode or explicit authorization.
          </span>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
