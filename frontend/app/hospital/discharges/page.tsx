"use client";

import React, { useState, useEffect } from "react";
import {
  FileCheck2,
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
  X,
  RefreshCw,
  PlusCircle,
  Pill,
  BedDouble,
  LogOut,
  Sparkles,
  FileSpreadsheet
} from "lucide-react";
import { dischargesApi, ipdApi } from "@/lib/api/phase3";
import { DischargeSummary, InpatientAdmission } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState } from "@/components/ui/FeedbackStates";

export default function DischargesPage() {
  const [admissions, setAdmissions] = useState<InpatientAdmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ADMITTED");

  // Selected Admission for Discharge Summary
  const [selectedAdmission, setSelectedAdmission] = useState<InpatientAdmission | null>(null);
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [activeSummary, setActiveSummary] = useState<DischargeSummary | null>(null);

  // Form State
  const [diagnosis, setDiagnosis] = useState("");
  const [dischargeType, setDischargeType] = useState("ROUTINE");
  const [condition, setCondition] = useState("RECOVERED");
  const [clinicalSummary, setClinicalSummary] = useState("");
  const [procedures, setProcedures] = useState("");
  const [medications, setMedications] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [savingDischarge, setSavingDischarge] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadAdmissions = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await ipdApi.listAdmissions({
        status: statusFilter !== "ALL" ? statusFilter : undefined
      });
      setAdmissions(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load inpatient admissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmissions();
  }, [statusFilter]);

  const openDischargeModal = async (adm: InpatientAdmission) => {
    setSelectedAdmission(adm);
    setDiagnosis(adm.provisional_diagnosis || "Acute Condition - Resolved");
    setDischargeType("ROUTINE");
    setCondition("RECOVERED");
    setClinicalSummary("");
    setProcedures("Chest Radiography, Routine Ward Care");
    setMedications("Amoxicillin 500mg (1-0-1 x 5 days), Paracetamol 650mg SOS");
    setFollowUp("Follow-up in OPD after 7 days.");
    setDischargeModalOpen(true);

    try {
      const summary = await dischargesApi.getDischargeSummary(adm.id);
      if (summary) {
        setActiveSummary(summary);
        setDiagnosis(summary.primary_diagnosis || "");
        setDischargeType(summary.discharge_type || "ROUTINE");
        setCondition(summary.condition_at_discharge || "RECOVERED");
        setClinicalSummary(summary.hospital_course_summary || "");
        setProcedures((summary.procedures_performed || []).join(", "));
        setFollowUp(summary.follow_up_instructions || "");
      } else {
        setActiveSummary(null);
      }
    } catch (err) {
      setActiveSummary(null);
    }
  };

  const handleSaveDischarge = async (finalize: boolean) => {
    if (!selectedAdmission) return;
    setSavingDischarge(true);
    try {
      const procsArray = procedures.split(",").map((p) => p.trim()).filter(Boolean);
      const medsArray = medications.split("\n").map((m) => {
        const parts = m.split("(");
        return {
          medicine_name: parts[0]?.trim() || m.trim(),
          dose: "Standard",
          frequency: parts[1]?.replace(")", "")?.trim() || "1-0-1",
          duration: "5 days"
        };
      }).filter((m) => m.medicine_name);

      const res = await dischargesApi.saveDischargeSummary({
        admission_id: selectedAdmission.id,
        patient_id: selectedAdmission.patient_id,
        diagnosis: diagnosis || "Acute Medical Condition - Treated",
        discharge_type: dischargeType,
        condition_at_discharge: condition,
        clinical_summary: clinicalSummary || "Hospital course uncomplicated with rapid recovery.",
        procedures_performed: procsArray,
        discharge_medications: medsArray,
        follow_up_instructions: followUp || "Follow up in OPD as advised.",
        status: finalize ? "FINALIZED" : "DRAFT"
      });

      if (finalize && res.data?.id) {
        await dischargesApi.finalizeDischargeSummary(res.data.id);
      }

      setActionSuccess(finalize ? "Discharge finalized, bed released, and patient timeline updated" : "Discharge draft saved");
      setTimeout(() => {
        setActionSuccess(null);
        setDischargeModalOpen(false);
        loadAdmissions();
      }, 1300);
    } catch (err: any) {
      alert(err.message || "Failed to save discharge summary");
    } finally {
      setSavingDischarge(false);
    }
  };

  const filteredAdmissions = admissions.filter((adm) => {
    const matchesSearch =
      (adm.patient_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (adm.onehealth_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (adm.bed_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (adm.reason_for_admission || "").toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shadow-inner">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Inpatient Discharges & Summaries
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 font-medium">
                  Phase 3 Clinical Completion
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Structured clinical discharge summaries, take-home medication reconciliation, and transactional bed release.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadAdmissions}
              className="gap-2 border-slate-700 bg-slate-800/60 hover:bg-slate-700/60 text-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Patient Name, OH-ID, Bed Number, or Diagnosis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Admission Statuses</option>
              <option value="ADMITTED">Active Inpatients (ADMITTED)</option>
              <option value="DISCHARGED">Discharged Patients</option>
            </select>
          </div>
        </div>

        {/* Inpatients Table */}
        {loading ? (
          <LoadingState message="Fetching inpatient admission records..." />
        ) : filteredAdmissions.length === 0 ? (
          <EmptyState
            title="No Inpatient Records Found"
            description="There are currently no inpatient admissions matching your filter criteria."
          />
        ) : (
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden shadow-xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Inpatient & Identity</th>
                    <th className="px-6 py-4">Ward & Bed Allocation</th>
                    <th className="px-6 py-4">Attending Doctor & Reason</th>
                    <th className="px-6 py-4">Admission Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAdmissions.map((adm) => (
                    <tr key={adm.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{adm.patient_name || "Patient"}</div>
                        <div className="text-xs text-teal-400 font-mono">{adm.onehealth_id || "OH-0000"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200 flex items-center gap-1.5">
                          <BedDouble className="h-4 w-4 text-teal-400" />
                          {adm.ward_name || "General Ward"} - Bed {adm.bed_number || "Allocated"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-200">{adm.doctor_name || "Dr. Attending"}</div>
                        <div className="text-xs text-slate-400 truncate max-w-xs">{adm.reason_for_admission}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-200">{new Date(adm.admission_date).toLocaleDateString()}</div>
                        <div className="text-xs text-slate-400">{new Date(adm.admission_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            adm.status === "DISCHARGED"
                              ? "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {adm.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => openDischargeModal(adm)}
                          className="bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs"
                        >
                          {adm.status === "DISCHARGED" ? "View Summary" : "Prepare Discharge"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Discharge Summary Modal */}
        {dischargeModalOpen && selectedAdmission && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Digital Discharge Summary
                    </h2>
                    <p className="text-xs text-slate-400">
                      Patient: <span className="text-slate-200 font-medium">{selectedAdmission.patient_name}</span> ({selectedAdmission.onehealth_id}) - Bed {selectedAdmission.bed_number}
                    </p>
                  </div>
                </div>
                <button onClick={() => setDischargeModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm text-slate-200">
                {actionSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Final Primary Diagnosis <span className="text-teal-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      disabled={selectedAdmission.status === "DISCHARGED"}
                      placeholder="e.g. Acute Bronchitis - Resolved, Secondary Hypertension"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 disabled:opacity-75"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Condition at Discharge
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      disabled={selectedAdmission.status === "DISCHARGED"}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500 disabled:opacity-75"
                    >
                      <option value="RECOVERED">Recovered (Fully Stable)</option>
                      <option value="IMPROVED">Improved (Ambulatory)</option>
                      <option value="STABLE">Stable on Oral Meds</option>
                      <option value="GUARDED">Guarded Prognosis</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Hospital Course & Clinical Treatment Summary <span className="text-teal-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={clinicalSummary}
                    onChange={(e) => setClinicalSummary(e.target.value)}
                    disabled={selectedAdmission.status === "DISCHARGED"}
                    placeholder="Describe patient's hospital course, key lab findings, antibiotic response..."
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 disabled:opacity-75"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Procedures & Significant Interventions Performed
                  </label>
                  <input
                    type="text"
                    value={procedures}
                    onChange={(e) => setProcedures(e.target.value)}
                    disabled={selectedAdmission.status === "DISCHARGED"}
                    placeholder="Comma separated procedures (e.g. Chest X-Ray, Nebulization, IV Cannulation)..."
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 disabled:opacity-75"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Discharge Medications (Take-Home Prescriptions)
                  </label>
                  <textarea
                    rows={3}
                    value={medications}
                    onChange={(e) => setMedications(e.target.value)}
                    disabled={selectedAdmission.status === "DISCHARGED"}
                    placeholder="Enter one medicine per line (e.g. Amoxicillin 500mg (1-0-1 x 5 days))..."
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 disabled:opacity-75"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Follow-up Instructions & Emergency Red Flags <span className="text-teal-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                    disabled={selectedAdmission.status === "DISCHARGED"}
                    placeholder="OPD follow-up schedule, dietary restrictions, warning signs to return to ED..."
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 disabled:opacity-75"
                  />
                </div>

                {activeSummary?.finalized_at && (
                  <div className="p-3 rounded-xl bg-teal-950/20 border border-teal-500/20 flex items-center justify-between text-xs text-teal-300">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" /> Immutable Record (Version {activeSummary.version}) - Bed Released
                    </span>
                    <span>{new Date(activeSummary.finalized_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
                <Button variant="outline" onClick={() => setDischargeModalOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                  Close
                </Button>
                {selectedAdmission.status !== "DISCHARGED" && (
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      disabled={savingDischarge}
                      onClick={() => handleSaveDischarge(false)}
                      className="border-teal-500/30 text-teal-300 hover:bg-teal-950/30"
                    >
                      Save Draft Summary
                    </Button>
                    <Button
                      disabled={savingDischarge}
                      onClick={() => handleSaveDischarge(true)}
                      className="bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/20"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Finalize Discharge & Release Bed
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
