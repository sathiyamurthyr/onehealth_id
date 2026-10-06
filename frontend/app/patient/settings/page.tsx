"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Settings, Bell, Globe, Lock, Shield, ArrowLeft,
  CheckCircle2, Save, LogOut, User
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function PatientSettingsPage() {
  const { user, logout } = useWorkspace();
  const [saved, setSaved] = useState(false);

  // Settings state
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [language, setLanguage] = useState("English");
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <Link
            href="/patient"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Health Overview</span>
          </Link>
          <span className="text-xs text-slate-400">Account Preferences</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Patient Settings</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage your personal communication preferences, language options, and security credentials.
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {saved && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Settings and notification preferences saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Notification Preferences */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <Bell className="w-4 h-4 text-blue-600" />
              <span>Communication & Alert Channels</span>
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-900">WhatsApp Clinical Updates</p>
                  <p className="text-[11px] text-slate-500">Receive prescription copies and test result alerts on WhatsApp.</p>
                </div>
                <input
                  type="checkbox"
                  checked={whatsappAlerts}
                  onChange={(e) => setWhatsappAlerts(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-900">SMS Appointment Reminders</p>
                  <p className="text-[11px] text-slate-500">Get text notifications 24 hours prior to scheduled hospital visits.</p>
                </div>
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-900">Email Summaries & Receipts</p>
                  <p className="text-[11px] text-slate-500">Receive digital invoices, tax receipts, and discharge summaries.</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          {/* Language & Regional */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Language & Regional Preferences</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Preferred Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="English">English</option>
                  <option value="Tamil">தமிழ் (Tamil)</option>
                  <option value="Hindi">हिन्दी (Hindi)</option>
                  <option value="Telugu">తెలుగు (Telugu)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Security & Access */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <Lock className="w-4 h-4 text-purple-600" />
              <span>Security & Identity Access</span>
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-900">Biometric & QR Fast-Track Check-in</p>
                  <p className="text-[11px] text-slate-500">Allow instant identity resolution when presenting QR code at hospital check-in.</p>
                </div>
                <input
                  type="checkbox"
                  checked={biometricEnabled}
                  onChange={(e) => setBiometricEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Sign Out of All Devices</p>
                  <p className="text-[11px] text-slate-500">Terminates active sessions across all web and mobile portals.</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              <span>Save Preferences</span>
            </button>
          </div>
        </form>
      </div>
    </WorkspaceLayout>
  );
}
