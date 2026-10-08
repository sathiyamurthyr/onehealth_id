"use client";

import React, { useState, useEffect } from "react";
import {
  GitPullRequest,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  FileText,
  User,
  Building2,
  Calendar,
  ChevronRight,
  ShieldCheck,
  FileCheck2,
  X,
  RefreshCw,
  PlusCircle,
  Send,
  CheckSquare,
  ArrowRight,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { referralsApi } from "@/lib/api/phase3";
import { ClinicalReferral } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState } from "@/components/ui/FeedbackStates";

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<ClinicalReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [specialty, setSpecialty] = useState("Cardiology");
  const [destinationHospital, setDestinationHospital] = useState("");
  const [urgency, setUrgency] = useState<string>("ROUTINE");
  const [reason, setReason] = useState("");
  const [clinicalSummary, setClinicalSummary] = useState("");
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Status Action Modal State
  const [selectedReferral, setSelectedReferral] = useState<ClinicalReferral | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState("ACCEPTED");
  const [actionNotes, setActionNotes] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadReferrals = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await referralsApi.listReferrals({
        status: statusFilter !== "ALL" ? statusFilter : undefined
      });
      setReferrals(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load clinical referrals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferrals();
  }, [statusFilter]);

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !reason) {
      alert("Please enter patient ID and referral reason");
      return;
    }
    setSubmittingCreate(true);
    try {
      await referralsApi.createReferral({
        patient_id: patientId,
        specialty_needed: specialty,
        destination_facility_name: destinationHospital,
        urgency: urgency,
        reason_for_referral: reason,
        clinical_summary: clinicalSummary
      });
      setCreateModalOpen(false);
      setPatientId("");
      setReason("");
      setClinicalSummary("");
      loadReferrals();
    } catch (err: any) {
      alert(err.message || "Failed to create digital referral");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReferral) return;
    setSubmittingAction(true);
    try {
      await referralsApi.updateStatus(selectedReferral.id, {
        status: nextStatus,
        notes: actionNotes
      });
      setActionModalOpen(false);
      loadReferrals();
    } catch (err: any) {
      alert(err.message || "Failed to update referral status");
    } finally {
      setSubmittingAction(false);
    }
  };

  const filteredReferrals = referrals.filter((ref) => {
    const matchesSearch =
      (ref.patient_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (ref.onehealth_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (ref.specialty || "").toLowerCase().includes(search.toLowerCase()) ||
      (ref.reason || "").toLowerCase().includes(search.toLowerCase()) ||
      (ref.id || "").toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
              <GitPullRequest className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Digital Clinical Referrals
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium">
                  Phase 3 Care Coordination
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Specialty transfers, inter-hospital consultations, shared clinical records, and referral tracking.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadReferrals}
              className="gap-2 border-slate-700 bg-slate-800/60 hover:bg-slate-700/60 text-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/20"
            >
              <PlusCircle className="h-4 w-4" />
              New Clinical Referral
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Patient Name, OH-ID, Specialty, or Referral Reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SENT">SENT (Pending Acceptance)</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="DECLINED">DECLINED</option>
            </select>
          </div>
        </div>

        {/* Referrals Table */}
        {loading ? (
          <LoadingState message="Fetching clinical referrals..." />
        ) : filteredReferrals.length === 0 ? (
          <EmptyState
            title="No Clinical Referrals"
            description="There are currently no referrals matching your filter criteria."
          />
        ) : (
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden shadow-xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Patient & Identity</th>
                    <th className="px-6 py-4">Specialty & Urgency</th>
                    <th className="px-6 py-4">Reason & Clinical Summary</th>
                    <th className="px-6 py-4">Referring Provider</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredReferrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{ref.patient_name || "Patient"}</div>
                        <div className="text-xs text-indigo-400 font-mono">{ref.onehealth_id || "OH-0000"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200">{ref.specialty}</div>
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mt-1 ${
                            ref.urgency === "EMERGENCY"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : ref.urgency === "URGENT"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {ref.urgency}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-200 font-medium max-w-sm truncate">{ref.reason}</div>
                        {ref.clinical_summary && (
                          <div className="text-xs text-slate-400 max-w-sm truncate">{ref.clinical_summary}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-semibold text-slate-200">{ref.source_doctor_name || "Dr. Attending"}</div>
                        <div className="text-xs text-slate-400">{new Date(ref.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            ref.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : ref.status === "ACCEPTED" || ref.status === "IN_PROGRESS"
                              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              : ref.status === "DECLINED"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {ref.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedReferral(ref);
                            setNextStatus(ref.status === "SENT" ? "ACCEPTED" : "COMPLETED");
                            setActionModalOpen(true);
                          }}
                          className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs"
                        >
                          Manage Referral
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Referral Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <GitPullRequest className="h-5 w-5 text-indigo-400" />
                  Create Digital Clinical Referral
                </h2>
                <button onClick={() => setCreateModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateReferral} className="p-6 space-y-4 text-sm text-slate-200">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Patient ID or OH-ID <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Patient ID (e.g. pt-01)..."
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Specialty Needed
                    </label>
                    <select
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Cardiology">Cardiology</option>
                      <option value="Pulmonology">Pulmonology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Nephrology">Nephrology</option>
                      <option value="Gastroenterology">Gastroenterology</option>
                      <option value="Orthopedics">Orthopedics</option>
                      <option value="Endocrinology">Endocrinology</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Urgency
                    </label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ROUTINE">Routine</option>
                      <option value="URGENT">Urgent (24 - 48 Hours)</option>
                      <option value="EMERGENCY">Emergency (Immediate)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Destination Facility or Department (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Heart Institute / Tertiary Pulmonology Care"
                    value={destinationHospital}
                    onChange={(e) => setDestinationHospital(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Reason for Referral <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Specialized 2D Echo & Holter Monitoring, surgical clearance..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Clinical Summary & Pertinent History
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Summary of inpatient stay, key diagnoses, drug allergies, current meds..."
                    value={clinicalSummary}
                    onChange={(e) => setClinicalSummary(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingCreate} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                    {submittingCreate ? "Creating..." : "Submit Digital Referral"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Manage Referral Status Modal */}
        {actionModalOpen && selectedReferral && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <GitPullRequest className="h-5 w-5 text-indigo-400" />
                  Update Referral Status
                </h2>
                <button onClick={() => setActionModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateStatus} className="p-6 space-y-4 text-sm text-slate-200">
                <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div>Patient: <span className="font-semibold text-white">{selectedReferral.patient_name}</span></div>
                  <div>Specialty: <span className="text-indigo-300 font-medium">{selectedReferral.specialty}</span></div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Status Transition <span className="text-indigo-400">*</span>
                  </label>
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ACCEPTED">ACCEPTED (Appointment Scheduled)</option>
                    <option value="IN_PROGRESS">IN_PROGRESS (Under Evaluation)</option>
                    <option value="COMPLETED">COMPLETED (Consultation Done)</option>
                    <option value="DECLINED">DECLINED (Specialist Unavailable)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Coordinator Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Booked slot with Dr. Pulmonologist on Monday..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setActionModalOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingAction} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                    {submittingAction ? "Saving..." : "Update Status"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
