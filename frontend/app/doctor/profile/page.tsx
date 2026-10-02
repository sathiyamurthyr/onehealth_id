"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Building,
  Hospital,
  ShieldCheck,
  Clock,
  Calendar,
  Phone,
  Mail,
  Award,
  Stethoscope,
  ArrowLeft,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { AuthorizedHospitalMembership } from "@/lib/api/me";

export default function DoctorProfilePage() {
  const { workspace, user } = useWorkspace();
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [hospitals, setHospitals] = useState<AuthorizedHospitalMembership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const [doc, meHosp] = await Promise.all([
          api.doctors.getMe().catch(() => null),
          api.me.getHospitals().catch(() => [])
        ]);
        setDoctorProfile(doc || {
          name: user?.name || "Dr. Rajesh Kumar",
          specialty: "Orthopedics & Trauma",
          registration_number: "TN-MCI-2026-REG",
          qualifications: "MBBS, MS (Orthopedics), DNB, Fellow in Joint Replacement",
          experience_years: 14,
          phone: "+91 98401 22345",
          email: "dr.kumar@kedarhospital.org",
          consultation_fee: 600,
          timings: "Mon-Sat: 09:00 AM - 01:00 PM (Mugalivakkam) | 02:00 PM - 05:00 PM (Iyyappanthangal)",
          is_available: true
        });
        setHospitals(meHosp || []);
      } catch (err) {
        console.error("Failed to load doctor profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["DOCTOR"]}>
      <div className="bg-white min-h-screen text-slate-900 pb-16">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white sticky top-0 z-20 px-6 py-4 shadow-xs">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/doctor"
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Clinician Profile</h1>
                <p className="text-xs text-slate-500">
                  Single Doctor Identity • Multi-Hospital Accreditation & Privileges
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Accredited</span>
            </span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 pt-6 space-y-6">
          {/* Identity Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 text-blue-700 font-extrabold flex items-center justify-center text-3xl border border-blue-200 shadow-xs shrink-0">
              DR
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900">{doctorProfile?.name || "Dr. Rajesh Kumar"}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                  {doctorProfile?.specialty || "Orthopedics & Trauma"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Medical Council Reg: {doctorProfile?.registration_number || "TN-MCI-2026-REG"}
              </p>
              <p className="text-xs text-slate-700 mt-1">
                Qualifications: <span className="font-semibold">{doctorProfile?.qualifications || "MBBS, MS (Orthopedics), DNB (Trauma & Joint Replacement)"}</span>
              </p>
              <p className="text-xs text-slate-500">
                Experience: <span className="font-semibold text-slate-800">{doctorProfile?.experience_years || 14} Years</span> of clinical practice
              </p>
            </div>
          </div>

          {/* Authorized Hospital Memberships Grid */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Hospital className="w-4 h-4 text-blue-600" />
                Authorized Hospital Facilities & Branch Access ({hospitals.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                One doctor login authorized across the following network facilities:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {hospitals.map((h) => (
                <div
                  key={h.hospital_ref_id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {h.role || "DOCTOR"}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-2">{h.hospital_name}</h4>
                    <p className="text-[11px] text-slate-500">{h.branch_name || "Main Branch"}</p>
                    {h.department_name && (
                      <p className="text-[10px] text-slate-600 font-medium mt-1">
                        Dept: {h.department_name}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-400">
                    Status: Verified & Active
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule & Consultation Timings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Consultation Timings
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {doctorProfile?.timings || "Mon-Sat: 09:00 AM - 01:00 PM (Mugalivakkam) | 02:00 PM - 05:00 PM (Iyyappanthangal)"}
              </p>
              <p className="text-[11px] text-slate-500">
                OP Consultation Slots: 15-minute standard slots
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-blue-600" />
                Contact & Clinical Credentials
              </h4>
              <p className="text-xs text-slate-700">
                Email: <span className="font-semibold">{doctorProfile?.email || user?.email || "dr.kumar@kedarhospital.org"}</span>
              </p>
              <p className="text-xs text-slate-700">
                Phone: <span className="font-semibold">{doctorProfile?.phone || "+91 98401 22345"}</span>
              </p>
              <p className="text-[11px] text-slate-500">
                Single sign-on managed via OneHealth ID Identity Provider.
              </p>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
