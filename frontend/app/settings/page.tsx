"use client";

import React, { useState } from "react";
import {
  Settings,
  Building2,
  Globe,
  ShieldCheck,
  Bell,
  Smartphone,
  CheckCircle2,
  Moon,
  Sun,
  Save,
  Radio,
  FileCheck2
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";

export default function SettingsPage() {
  const [hospitalSettings, setHospitalSettings] = useState({
    hospital_name: "Apollo Speciality Hospital Greams Road",
    facility_code: "APOLLO-CHE-01",
    gstin: "33AAAAA0000A1Z5",
    state_code: "33 (Tamil Nadu)",
    currency: "INR (₹)",
    timezone: "Asia/Kolkata (IST +05:30)",
    language: "English",
    abdm_m1: true,
    abdm_m2: true,
    abdm_m3: false,
    sms_alerts: true,
    whatsapp_notifications: true,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white  p-5 sm:p-6 rounded-3xl border border-slate-200  shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 ">
                Hospital Settings & Regional Config
              </h1>
              <Badge variant="primary" className="text-xs">
                System Parameters
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Facility profile, India-first GST & ABDM integrations, and communication gateways
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            className="gap-2 text-xs font-semibold w-full sm:w-auto"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </Button>
        </div>

        {saved && (
          <div className="p-4 bg-emerald-50  border border-emerald-200  rounded-2xl flex items-center gap-3 text-emerald-800  text-xs font-semibold animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Configuration parameters successfully committed to database store!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Facility Identification */}
          <Card>
            <CardHeader className="border-b border-slate-100 ">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>Facility Identification & Legal Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700  mb-1.5">
                    Hospital / Facility Name
                  </label>
                  <input
                    type="text"
                    value={hospitalSettings.hospital_name}
                    onChange={(e) => setHospitalSettings({ ...hospitalSettings, hospital_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50  border border-slate-200  rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700  mb-1.5">
                    Facility Node Code
                  </label>
                  <input
                    type="text"
                    value={hospitalSettings.facility_code}
                    onChange={(e) => setHospitalSettings({ ...hospitalSettings, facility_code: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50  border border-slate-200  rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700  mb-1.5">
                    GSTIN Identification Number
                  </label>
                  <input
                    type="text"
                    value={hospitalSettings.gstin}
                    onChange={(e) => setHospitalSettings({ ...hospitalSettings, gstin: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50  border border-slate-200  rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700  mb-1.5">
                    State Jurisdiction
                  </label>
                  <input
                    type="text"
                    value={hospitalSettings.state_code}
                    onChange={(e) => setHospitalSettings({ ...hospitalSettings, state_code: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50  border border-slate-200  rounded-xl text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* India-First Regional Configuration */}
          <Card>
            <CardHeader className="border-b border-slate-100 ">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-600" />
                <span>Regional & India-First Localization</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700  mb-1.5">
                    Currency Symbol
                  </label>
                  <select
                    value={hospitalSettings.currency}
                    onChange={(e) => setHospitalSettings({ ...hospitalSettings, currency: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50  border border-slate-200  rounded-xl text-xs min-h-[44px]"
                  >
                    <option value="INR (₹)">INR (₹ Indian Rupee)</option>
                    <option value="USD ($)">USD ($ US Dollar)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700  mb-1.5">
                    Standard Timezone
                  </label>
                  <select
                    value={hospitalSettings.timezone}
                    onChange={(e) => setHospitalSettings({ ...hospitalSettings, timezone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50  border border-slate-200  rounded-xl text-xs min-h-[44px]"
                  >
                    <option value="Asia/Kolkata (IST +05:30)">Asia/Kolkata (IST +05:30)</option>
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700  mb-1.5">
                    Interface Language
                  </label>
                  <select
                    value={hospitalSettings.language}
                    onChange={(e) => setHospitalSettings({ ...hospitalSettings, language: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50  border border-slate-200  rounded-xl text-xs min-h-[44px]"
                  >
                    <option value="English">English</option>
                    <option value="Tamil">தமிழ் (Tamil)</option>
                    <option value="Hindi">हिन्दी (Hindi)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ABDM Ayushman Bharat Digital Mission Readiness */}
          <Card>
            <CardHeader className="border-b border-slate-100 ">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                <span>Ayushman Bharat Digital Mission (ABDM) Readiness</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 text-xs">
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 bg-slate-50  rounded-xl border border-slate-200  cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-800  block text-xs">
                      ABDM Milestone 1: ABHA Number & Address Seeding
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Enables linking OneHealth ID with Government 14-digit ABHA ID and biometric eKYC.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hospitalSettings.abdm_m1}
                    onChange={(e) => setHospitalSettings({ ...hospitalSettings, abdm_m1: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-slate-50  rounded-xl border border-slate-200  cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-800  block text-xs">
                      ABDM Milestone 2: Health Information Provider (HIP)
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Publishes OP-Consult, Diagnostic Reports, and Discharge summaries to national health repository.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hospitalSettings.abdm_m2}
                    onChange={(e) => setHospitalSettings({ ...hospitalSettings, abdm_m2: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-slate-50  rounded-xl border border-slate-200  cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-800  block text-xs">
                      ABDM Milestone 3: Health Information User (HIU)
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Allows doctors to request patient consent and view longitudinal health records from external hospitals.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hospitalSettings.abdm_m3}
                    onChange={(e) => setHospitalSettings({ ...hospitalSettings, abdm_m3: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Notification Gateways */}
          <Card>
            <CardHeader className="border-b border-slate-100 ">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-600" />
                <span>Patient Communication Channels</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3 text-xs">
              <label className="flex items-center justify-between p-3.5 bg-slate-50  rounded-xl border border-slate-200  cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800  block text-xs">
                    SMS Gateway (DLT Registered Template)
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Automatic SMS dispatch on OneHealth ID registration, OPD token call, and payment receipts.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={hospitalSettings.sms_alerts}
                  onChange={(e) => setHospitalSettings({ ...hospitalSettings, sms_alerts: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 bg-slate-50  rounded-xl border border-slate-200  cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800  block text-xs">
                    WhatsApp Business API Dispatcher
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Delivers encrypted PDF diagnostic reports, doctor prescriptions, and appointment reminder alerts.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={hospitalSettings.whatsapp_notifications}
                  onChange={(e) => setHospitalSettings({ ...hospitalSettings, whatsapp_notifications: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
            </CardContent>
          </Card>
        </form>
      </div>
    </AppLayout>
  );
}
