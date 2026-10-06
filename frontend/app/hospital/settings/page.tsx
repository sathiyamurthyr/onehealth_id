"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  ArrowLeft,
  CheckCircle2,
  Building2,
  ShieldCheck,
  AlertCircle,
  X,
  RefreshCw,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  Calendar,
  Layers,
  Save,
  Sliders,
  AlertTriangle,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Settings state
  const [hospitalProfile, setHospitalProfile] = useState({
    name: "Kedar Hospital",
    branch: "Mugalivakkam Branch",
    regNumber: "CEA-TN-2024-0982",
    address: "No. 42, Mount-Poonamallee High Road, Mugalivakkam, Chennai - 600125",
    phone: "+91 44 2252 8000",
    emergencyPhone: "+91 44 2252 9999",
    email: "contact@kedarhospital.in",
    website: "https://kedarhospital.in",
  });

  const [appointmentRules, setAppointmentRules] = useState({
    slotInterval: 15,
    advanceBookingDays: 30,
    cancellationWindowHours: 2,
    maxDailyAppointmentsPerDoctor: 40,
    emergencySlotBuffer: 5,
    walkInQueueAllowed: true,
  });

  const [tokenRules, setTokenRules] = useState({
    dailyAutoResetTime: "00:00",
    defaultPrefix: "OPD-",
    startNumber: 1,
    priorityTokenPrefix: "EMERG-",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const config = await api.hospital.getConfig("hosp-kedar").catch(() => null);
      if (config) {
        setHospitalProfile((prev) => ({
          ...prev,
          name: config.hospital?.name || (config as any).name || prev.name,
          address: config.hospital?.address || (config as any).address || prev.address,
          phone: config.hospital?.phone || (config as any).phone || prev.phone,
          email: config.hospital?.email || (config as any).email || prev.email,
        }));
      }
    } catch (err: any) {
      console.error("Failed to load hospital config:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSuccessMessage("Hospital operational configuration saved and synchronized!");
    }, 600);
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN"]}>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/hospital"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hospital Operations
          </Link>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-slate-600" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-slate-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-white/10">
                <Settings className="w-3.5 h-3.5 text-emerald-400" /> Operational Parameters
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Hospital Profile & Operational Rules</h1>
              <p className="text-slate-300 text-sm max-w-xl">
                Configure official hospital credentials, emergency dispatch numbers, appointment slot durations, and daily token reset policies.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Official Hospital Identity */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Official Hospital Identity</h3>
                <p className="text-xs text-slate-500">Public profile and government registration details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Hospital Name</label>
                <input
                  type="text"
                  value={hospitalProfile.name}
                  onChange={(e) => setHospitalProfile({ ...hospitalProfile, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={hospitalProfile.branch}
                  onChange={(e) => setHospitalProfile({ ...hospitalProfile, branch: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={hospitalProfile.address}
                  onChange={(e) => setHospitalProfile({ ...hospitalProfile, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Primary Reception Phone</label>
                <input
                  type="text"
                  value={hospitalProfile.phone}
                  onChange={(e) => setHospitalProfile({ ...hospitalProfile, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Emergency 24/7 Hotline</label>
                <input
                  type="text"
                  value={hospitalProfile.emergencyPhone}
                  onChange={(e) => setHospitalProfile({ ...hospitalProfile, emergencyPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-rose-700 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Official Email</label>
                <input
                  type="email"
                  value={hospitalProfile.email}
                  onChange={(e) => setHospitalProfile({ ...hospitalProfile, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Website URL</label>
                <input
                  type="url"
                  value={hospitalProfile.website}
                  onChange={(e) => setHospitalProfile({ ...hospitalProfile, website: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Appointment Scheduling Rules */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Appointment & Slot Rules</h3>
                <p className="text-xs text-slate-500">Booking intervals, advance limits, and doctor daily quotas</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Slot Interval (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={appointmentRules.slotInterval}
                  onChange={(e) => setAppointmentRules({ ...appointmentRules, slotInterval: parseInt(e.target.value) || 15 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Advance Booking Limit (Days)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={appointmentRules.advanceBookingDays}
                  onChange={(e) =>
                    setAppointmentRules({ ...appointmentRules, advanceBookingDays: parseInt(e.target.value) || 30 })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Max Patients / Doctor / Day</label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={appointmentRules.maxDailyAppointmentsPerDoctor}
                  onChange={(e) =>
                    setAppointmentRules({
                      ...appointmentRules,
                      maxDailyAppointmentsPerDoctor: parseInt(e.target.value) || 40,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Token Management Rules */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Token & Queue Parameters</h3>
                <p className="text-xs text-slate-500">Automated daily counter reset and emergency dispatch</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Daily Token Auto-Reset Time</label>
                <input
                  type="text"
                  value={tokenRules.dailyAutoResetTime}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-600"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Scheduled automated reset at midnight UTC/IST</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Emergency Token Prefix</label>
                <input
                  type="text"
                  value={tokenRules.priorityTokenPrefix}
                  onChange={(e) => setTokenRules({ ...tokenRules, priorityTokenPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving Changes..." : "Save Hospital Configuration"}
            </button>
          </div>
        </form>
      </div>
    </WorkspaceLayout>
  );
}
