"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User, Phone, Mail, MapPin, Heart, Shield, ShieldCheck,
  AlertCircle, ArrowLeft, Edit3, Save, X, RefreshCw, CheckCircle2,
  Calendar, Lock, Globe
} from "lucide-react";
import { api, PatientProfile } from "@/lib/api";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function PatientProfilePage() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    emergency_contact: "",
    preferred_language: "English",
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.patient.getProfile();
      if (res?.data) {
        setProfile(res.data);
        setEditForm({
          phone: res.data.phone || "",
          email: res.data.email || "",
          address: res.data.address || "",
          city: res.data.city || "",
          state: res.data.state || "",
          emergency_contact: res.data.emergency_contact || "",
          preferred_language: res.data.preferred_language || "English",
        });
      }
    } catch (err: any) {
      console.error("Failed to load profile", err);
      setError(err?.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaveLoading(true);
      setSuccessMsg(null);
      const res = await api.patient.updateProfile(editForm);
      if (res?.data) {
        setProfile(res.data);
        setIsEditing(false);
        setSuccessMsg("Contact information updated successfully.");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to update profile.");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <Link
            href="/patient"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Health Overview</span>
          </Link>
          <div className="text-xs font-mono text-slate-500">
            OneHealth ID: <strong className="text-slate-900 font-bold">{profile?.onehealth_id || "OHID-CITIZEN"}</strong>
          </div>
        </div>

        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Personal Health Profile</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Verified identity, demographic details, and emergency contacts linked to your OneHealth ID.
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition shrink-0"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Contact Info</span>
            </button>
          )}
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{error}</span>
            </div>
            <button onClick={loadProfile} className="font-semibold underline">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
            <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
          </div>
        ) : profile ? (
          <>
            {/* Identity Hero Banner Card */}
            <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                {/* Avatar with Initials */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-white/10">
                    {profile.name?.charAt(0) || "P"}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white" title="Active Citizen Identity">
                    ✓
                  </span>
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold">{profile.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                      Verified Identity
                    </span>
                  </div>
                  <p className="text-xs font-mono text-cyan-300 font-bold">{profile.onehealth_id}</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-300 pt-1">
                    <span>Age: <strong>{profile.age} Yrs</strong></span>
                    <span>•</span>
                    <span>Gender: <strong>{profile.gender}</strong></span>
                    <span>•</span>
                    <span>Blood Group: <strong className="text-rose-300">{profile.blood_group || "O+"}</strong></span>
                  </div>
                </div>

                <Link
                  href="/patient/qr"
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold backdrop-blur-sm transition shrink-0"
                >
                  Show QR Pass
                </Link>
              </div>
            </div>

            {/* Profile Edit Form or Details View */}
            {isEditing ? (
              <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Edit Contact Information</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">Residential Address</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">City</label>
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">State</label>
                    <input
                      type="text"
                      value={editForm.state}
                      onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">Emergency Contact (Name & Number)</label>
                    <input
                      type="text"
                      value={editForm.emergency_contact}
                      onChange={(e) => setEditForm({ ...editForm, emergency_contact: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="e.g. John Smith (+91 98765 43210)"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saveLoading ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Contact & Demographics Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>Demographics & Contact</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Phone Number</span>
                      <span className="font-semibold text-slate-900 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {profile.phone}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Email Address</span>
                      <span className="font-semibold text-slate-900 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {profile.email || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Address</span>
                      <span className="font-semibold text-slate-900 text-right max-w-[200px] truncate">
                        {profile.address || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">City / State</span>
                      <span className="font-semibold text-slate-900">
                        {profile.city || "Chennai"}, {profile.state || "Tamil Nadu"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Preferred Language</span>
                      <span className="font-semibold text-slate-900">
                        {profile.preferred_language || "English"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Emergency & Clinical Highlights */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-600" />
                    <span>Clinical Profile & Emergency</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Emergency Contact</span>
                      <span className="font-semibold text-slate-900">{profile.emergency_contact || "Not provided"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Blood Group</span>
                      <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                        {profile.blood_group || "O+"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Known Allergies</span>
                      <span className="font-semibold text-slate-700">None on record</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Identity Document</span>
                      <span className="font-mono text-slate-700">
                        {profile.identity_type || "NATIONAL_ID"}: {profile.identity_number ? `••••${profile.identity_number.slice(-4)}` : "Verified"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Account Status</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                        {profile.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sensitive Information Privacy Notice */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">ABDM Consent & Security Assurance:</strong> Sensitive clinical records and demographic data are encrypted in accordance with National Digital Health standards. Only authorized healthcare professionals involved in your active care episodes can access medical history.
              </div>
            </div>
          </>
        ) : null}
      </div>
    </WorkspaceLayout>
  );
}
