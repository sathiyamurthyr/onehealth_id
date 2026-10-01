"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Users,
  Stethoscope,
  HeartPulse,
  BedDouble,
  Receipt,
  TestTube,
  Pill,
  CalendarCheck,
  ListOrdered,
  PlusCircle,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Building,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { DynamicDashboard } from "@/components/workspace/DynamicDashboard";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import Link from "next/link";

export default function HospitalAdminPage() {
  const { workspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<"operations" | "doctors" | "departments">("operations");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!workspace?.hospital_ref_id) return;
      try {
        setLoading(true);
        const [docs, depts] = await Promise.all([
          api.doctors.list(workspace.hospital_ref_id).catch(() => []),
          api.admin?.departments?.().catch(() => []) || [],
        ]);
        setDoctors(docs || []);
        setDepartments(depts || []);
      } catch (err) {
        console.error("Failed to load hospital admin data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [workspace?.hospital_ref_id]);

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Dynamic Header & Operational Metrics */}
        <DynamicDashboard
          title={`${workspace?.hospital_name || "Hospital"} Operations Console`}
          subtitle={`Administrative control for ${workspace?.branch_name || "Main Branch"} • Clinical rosters, queue governance, and departmental workflows.`}
        />

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-2">
          {[
            { id: "operations", label: "Hospital Modules & Workflows", icon: Building2 },
            { id: "doctors", label: `Medical Staff & Doctors (${doctors.length})`, icon: Stethoscope },
            { id: "departments", label: `Clinical Departments (${departments.length})`, icon: Building },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[44px] ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab: Operations Quick Links */}
        {activeTab === "operations" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/patients"
              className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 transition group space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Patient Directory & OH-ID</h4>
                <p className="text-xs text-slate-400">Search, register citizens, and issue encrypted OneHealth QR cards.</p>
              </div>
            </Link>

            <Link
              href="/appointments"
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 transition group space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Appointment Central</h4>
                <p className="text-xs text-slate-400">Schedule outpatient consultations across specialist departments.</p>
              </div>
            </Link>

            <Link
              href="/queue"
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 transition group space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                  <ListOrdered className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Live Queue Board</h4>
                <p className="text-xs text-slate-400">Manage real-time token calling, triage routing, and wait times.</p>
              </div>
            </Link>

            <Link
              href="/billing"
              className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 transition group space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Billing & Tariffs</h4>
                <p className="text-xs text-slate-400">Generate OPD invoices, insurance pre-authorizations, and settlements.</p>
              </div>
            </Link>

            <Link
              href="/laboratory"
              className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 transition group space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                  <TestTube className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Laboratory Orders</h4>
                <p className="text-xs text-slate-400">Diagnostic requisitions, specimen processing, and test reports.</p>
              </div>
            </Link>

            <Link
              href="/pharmacy"
              className="bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-5 transition group space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                  <Pill className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 group-hover:translate-x-1 transition" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Pharmacy Dispensary</h4>
                <p className="text-xs text-slate-400">Prescription fulfillment, formulary inventory, and batch tracking.</p>
              </div>
            </Link>
          </div>
        )}

        {/* Tab: Medical Staff */}
        {activeTab === "doctors" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doc) => (
              <div key={doc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{doc.name}</h4>
                      <p className="text-xs text-slate-400">{doc.specialty || "General Medicine"}</p>
                    </div>
                  </div>
                  <Badge variant="success" className="text-[10px]">
                    Available
                  </Badge>
                </div>
                <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Department:</span>
                    <span className="text-slate-200">{doc.department_name || "OPD"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Consultation Fee:</span>
                    <span className="font-mono text-emerald-400">₹{doc.consultation_fee || 500}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Departments */}
        {activeTab === "departments" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((d) => (
              <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {d.code}
                  </span>
                  <Badge variant="outline" className="text-[10px]">Active</Badge>
                </div>
                <h4 className="text-sm font-bold text-white">{d.name}</h4>
                <p className="text-xs text-slate-400">{d.description || "Operational clinical department unit."}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
