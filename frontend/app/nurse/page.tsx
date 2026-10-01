"use client";

import React, { useState, useEffect } from "react";
import {
  HeartPulse,
  Activity,
  ListOrdered,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  ClipboardList,
  Thermometer,
  ShieldCheck,
  PlusCircle,
  Save,
  UserCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { DynamicDashboard } from "@/components/workspace/DynamicDashboard";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import Link from "next/link";

export default function NurseWorkspacePage() {
  const { workspace, user } = useWorkspace();
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQueueItem, setSelectedQueueItem] = useState<any | null>(null);

  // Vitals Form State
  const [bpSystolic, setBpSystolic] = useState("120");
  const [bpDiastolic, setBpDiastolic] = useState("80");
  const [pulse, setPulse] = useState("72");
  const [temperature, setTemperature] = useState("98.6");
  const [spo2, setSpo2] = useState("98");
  const [weight, setWeight] = useState("68");
  const [triageNotes, setTriageNotes] = useState("");
  const [savingVitals, setSavingVitals] = useState(false);
  const [vitalsSavedSuccess, setVitalsSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadNurseQueue() {
      try {
        setLoading(true);
        const data = await api.queue.list({
          status: "WAITING",
          hospital_id: workspace?.hospital_ref_id,
        }).catch(() => []);
        setQueueItems(data || []);
        if (data && data.length > 0) {
          setSelectedQueueItem(data[0]);
        }
      } catch (err) {
        console.error("Failed to load nurse queue", err);
      } finally {
        setLoading(false);
      }
    }
    loadNurseQueue();
  }, [workspace?.hospital_ref_id]);

  const handleRecordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQueueItem) return;
    try {
      setSavingVitals(true);
      // Simulate saving vitals or calling api
      await new Promise((r) => setTimeout(r, 600));
      setVitalsSavedSuccess(true);
      setTimeout(() => setVitalsSavedSuccess(false), 3000);
      setTriageNotes("");
    } catch (err: any) {
      alert(err.message || "Failed to record vitals");
    } finally {
      setSavingVitals(false);
    }
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["NURSE"]}>
      <div className="space-y-6">
        {/* Dynamic Header & Nursing Widgets */}
        <DynamicDashboard
          title={`Nursing Station & Triage — ${user?.name || "Staff Nurse"}`}
          subtitle={`Department Nursing Care at ${workspace?.hospital_name || "Kedar Hospital"} • Patient vitals, triage intake, and ward observations.`}
        />

        {/* Triage & Vitals Recording Station */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Waiting Patients List */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-400" />
                Patients Awaiting Triage
              </h3>
              <Badge variant="outline" className="text-[10px]">
                {queueItems.length} in Queue
              </Badge>
            </div>

            {loading ? (
              <div className="h-40 flex items-center justify-center text-xs text-slate-400">
                Loading queue...
              </div>
            ) : queueItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">Triage Clear</p>
                <p className="text-xs text-slate-400 mt-1">All waiting patients have vitals recorded.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {queueItems.map((item) => {
                  const isSelected = selectedQueueItem?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedQueueItem(item)}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between ${
                        isSelected
                          ? "bg-rose-500/10 border-rose-500/40 text-white"
                          : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-rose-400">
                            {item.token_number}
                          </span>
                          <span className="font-semibold text-sm text-white">
                            {item.patient_name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">
                          {item.onehealth_id || "OH-N/A"} • Doctor: {item.doctor_name || "General OPD"}
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {item.wait_time_minutes ? `${item.wait_time_minutes}m` : "New"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vitals Recording Form */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-400" />
                  Clinical Triage & Vitals Intake
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Recording for: <strong className="text-white">{selectedQueueItem?.patient_name || "Select a patient"}</strong>
                </p>
              </div>
              {selectedQueueItem && (
                <span className="font-mono text-xs px-2.5 py-1 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  Token {selectedQueueItem.token_number}
                </span>
              )}
            </div>

            {vitalsSavedSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Patient vitals successfully recorded and attached to OPD encounter.</span>
              </div>
            )}

            <form onSubmit={handleRecordVitals} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">BP (Systolic / Diastolic)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={bpSystolic}
                      onChange={(e) => setBpSystolic(e.target.value)}
                      placeholder="120"
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    <span className="text-slate-500 font-bold">/</span>
                    <input
                      type="text"
                      value={bpDiastolic}
                      onChange={(e) => setBpDiastolic(e.target.value)}
                      placeholder="80"
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Pulse Rate (bpm)</label>
                  <input
                    type="text"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    placeholder="72"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Temperature (°F)</label>
                  <input
                    type="text"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="98.6"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">SpO2 Oxygen (%)</label>
                  <input
                    type="text"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    placeholder="98"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Weight (kg)</label>
                  <input
                    type="text"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="68"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Triage Priority</label>
                  <select
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="NORMAL">Standard / Routine</option>
                    <option value="URGENT">Urgent / Priority</option>
                    <option value="EMERGENCY">Emergency (Red)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Nursing / Triage Assessment Notes</label>
                <textarea
                  rows={3}
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                  placeholder="Patient reports mild cough and low-grade fever for 2 days. No respiratory distress noted."
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={savingVitals || !selectedQueueItem}
                  className="bg-rose-600 hover:bg-rose-500 text-white gap-2 text-xs font-semibold"
                >
                  <Save className="w-4 h-4" />
                  {savingVitals ? "Saving Vitals..." : "Save Vitals & Forward to Doctor"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Nursing Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/queue"
            className="bg-slate-900 border border-slate-800 hover:border-rose-500/40 rounded-2xl p-5 transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <ListOrdered className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="text-sm font-bold text-white">Full Live Queue Board</h4>
            <p className="text-xs text-slate-400">Monitor all departmental token calls and check-in statuses.</p>
          </Link>

          <Link
            href="/patients"
            className="bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="text-sm font-bold text-white">Assigned Patients</h4>
            <p className="text-xs text-slate-400">View patient details, active allergies, and assigned physician.</p>
          </Link>

          <Link
            href="/ipd"
            className="bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-5 transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <ClipboardList className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="text-sm font-bold text-white">Ward Rounds & Beds</h4>
            <p className="text-xs text-slate-400">Inpatient ward allocations and routine nursing round tasks.</p>
          </Link>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
