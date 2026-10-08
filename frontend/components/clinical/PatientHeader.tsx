"use client";

import React from "react";
import {
  User,
  AlertTriangle,
  Heart,
  Calendar,
  Building,
  Stethoscope,
  ShieldCheck,
  Activity,
  FileCheck,
  Clock,
  Droplet
} from "lucide-react";
import { Patient, UserProfile } from "@/lib/types";
import { Badge } from "@/components/ui/Card";
import { filterSensitivePatientData } from "@/lib/rbac";

interface PatientHeaderProps {
  patient: Patient;
  user?: UserProfile | null;
  encounterId?: string;
  lastVisit?: string;
  nextVisit?: string;
  primaryDoctor?: string;
  department?: string;
  chronicConditions?: string[];
  allergies?: Array<{ allergen: string; severity: string; type: string }>;
  criticalAlerts?: string[];
}

export function PatientHeader({
  patient,
  user,
  encounterId = "ENC-2026-0901",
  lastVisit = "15-Sep-2026",
  nextVisit = "15-Oct-2026",
  primaryDoctor = "Dr. Anitha (MD Gen Med)",
  department = "General Medicine & OPD",
  chronicConditions = ["Type 2 Diabetes Mellitus (2021)", "Essential Hypertension (2023)"],
  allergies = [{ allergen: "Penicillin", severity: "Severe", type: "Drug" }],
  criticalAlerts = ["Severe Penicillin Allergy — Anaphylaxis Risk", "Diabetic Foot Care Protocol Active"],
}: PatientHeaderProps) {
  // Apply RBAC sensitive data filtering
  const visiblePatient = filterSensitivePatientData(patient, user?.role);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
      {/* Top Banner: Patient Identity & Alerts Bar */}
      <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold text-sm">
            {patient.name?.charAt(0) || "P"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                {patient.name}
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                {patient.onehealth_id || patient.id}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                In Consultation
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Encounter: <span className="font-mono font-medium text-slate-700">{encounterId}</span> • Registered: {patient.created_at ? new Date(patient.created_at).toLocaleDateString() : "Active"}
            </p>
          </div>
        </div>

        {/* Critical Alerts Badge */}
        {criticalAlerts.length > 0 && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <div className="font-semibold">
              <span className="text-rose-900 font-bold uppercase tracking-wider text-[10px] block">Critical Clinical Alert</span>
              {criticalAlerts[0]}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Demographics, Hospital Scope, Clinical Flags */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
        {/* Age & DOB */}
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Age / DOB</span>
          <p className="font-semibold text-slate-800 text-sm">
            {patient.age} yrs <span className="text-slate-400 font-normal">({patient.gender || "Unspecified"})</span>
          </p>
          <span className="text-[11px] text-slate-500 block">DOB: ~{2026 - (patient.age || 30)}</span>
        </div>

        {/* Blood Group */}
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Blood Group</span>
          <div className="flex items-center gap-1.5">
            <Droplet className="w-3.5 h-3.5 text-rose-500" />
            <span className="font-bold text-slate-900 text-sm">{patient.blood_group || "O+"}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Rh +ve</Badge>
          </div>
        </div>

        {/* Hospital & Department */}
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Hospital / Dept</span>
          <p className="font-semibold text-slate-800 truncate" title={patient.hospital_name || "Healthcare Facility"}>
            {patient.hospital_name || "Healthcare Facility"}
          </p>
          <span className="text-[11px] text-slate-500 block truncate">{department}</span>
        </div>

        {/* Attending Doctor */}
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Primary Doctor</span>
          <p className="font-semibold text-slate-800 truncate flex items-center gap-1">
            <Stethoscope className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="truncate">{primaryDoctor}</span>
          </p>
          <span className="text-[11px] text-slate-500 block">OPD Session A • Rm 102</span>
        </div>

        {/* Last Visit & Next Visit */}
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Last Visit</span>
          <p className="font-semibold text-slate-800 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{lastVisit}</span>
          </p>
          <span className="text-[11px] text-emerald-600 font-medium block">
            Next: {nextVisit}
          </span>
        </div>

        {/* Allergies Chips */}
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Allergies</span>
          <div className="flex flex-wrap gap-1">
            {allergies.map((a, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                {a.allergen} ({a.severity})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Chronic Conditions Bar */}
      {chronicConditions.length > 0 && (
        <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-2.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            Chronic Conditions:
          </span>
          {chronicConditions.map((cond, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 text-[11px] font-medium shadow-2xs"
            >
              {cond}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
