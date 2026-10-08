"use client";

import React, { useState, useEffect } from "react";
import {
  HeartPulse,
  Activity,
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
  AlertTriangle,
  Pill,
  Calendar,
  Send,
  Lock,
  Layers,
  FileText,
  BadgeAlert,
  RefreshCw,
  X,
  Sparkles,
  BedDouble
} from "lucide-react";
import { nursingApi, ipdApi } from "@/lib/api/phase3";
import { NursingObservation, NursingNote, MedicationAdministration, InpatientAdmission } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState } from "@/components/ui/FeedbackStates";

export default function NurseWorkspacePage() {
  const [inpatients, setInpatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Active Tab
  const [activeTab, setActiveTab] = useState<"VITALS" | "MAR" | "NOTES" | "HANDOVER">("VITALS");

  // Vitals State & List
  const [vitalsList, setVitalsList] = useState<NursingObservation[]>([]);
  const [loadingVitals, setLoadingVitals] = useState(false);
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
  const [tempC, setTempC] = useState("37.0");
  const [systolicBp, setSystolicBp] = useState("120");
  const [diastolicBp, setDiastolicBp] = useState("80");
  const [heartRate, setHeartRate] = useState("72");
  const [respRate, setRespRate] = useState("16");
  const [spo2, setSpo2] = useState("98");
  const [painScore, setPainScore] = useState(0);
  const [vitalsNotes, setVitalsNotes] = useState("");
  const [savingVitals, setSavingVitals] = useState(false);

  // Nursing Notes State & List
  const [notesList, setNotesList] = useState<NursingNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteType, setNoteType] = useState<string>("PROGRESS");
  const [noteAssessment, setNoteAssessment] = useState("");
  const [noteCareProvided, setNoteCareProvided] = useState("");
  const [noteResponse, setNoteResponse] = useState("");
  const [noteConcerns, setNoteConcerns] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // MAR State & List
  const [marList, setMarList] = useState<MedicationAdministration[]>([]);
  const [loadingMar, setLoadingMar] = useState(false);
  const [marModalOpen, setMarModalOpen] = useState(false);
  const [marMedName, setMarMedName] = useState("Amoxicillin 500mg");
  const [marDose, setMarDose] = useState("500 mg");
  const [marRoute, setMarRoute] = useState("Oral");
  const [marStatus, setMarStatus] = useState("ADMINISTERED");
  const [marReason, setMarReason] = useState("");
  const [savingMar, setSavingMar] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const loadInpatients = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await nursingApi.listAssignedPatients();
      setInpatients(data || []);
      if (data && data.length > 0 && !selectedPatientId) {
        setSelectedPatientId(data[0].patient_id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load assigned inpatients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInpatients();
  }, []);

  const selectedPatient = inpatients.find((p) => p.patient_id === selectedPatientId) || inpatients[0];

  const loadPatientClinicalData = async (patientId: string) => {
    if (!patientId) return;
    setLoadingVitals(true);
    setLoadingNotes(true);
    setLoadingMar(true);

    try {
      const [vData, nData, mData] = await Promise.all([
        nursingApi.listVitals(patientId),
        nursingApi.listNotes(patientId),
        nursingApi.listMedicationAdministrations(patientId)
      ]);
      setVitalsList(vData || []);
      setNotesList(nData || []);
      setMarList(mData || []);
    } catch (err) {
      console.error("Error loading patient clinical records:", err);
    } finally {
      setLoadingVitals(false);
      setLoadingNotes(false);
      setLoadingMar(false);
    }
  };

  useEffect(() => {
    if (selectedPatientId) {
      loadPatientClinicalData(selectedPatientId);
    }
  }, [selectedPatientId]);

  const handleRecordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setSavingVitals(true);
    try {
      await nursingApi.recordVitals({
        patient_id: selectedPatientId,
        admission_id: selectedPatient?.admission_id,
        temperature_c: parseFloat(tempC) || 37.0,
        systolic_bp: parseInt(systolicBp) || 120,
        diastolic_bp: parseInt(diastolicBp) || 80,
        heart_rate_bpm: parseInt(heartRate) || 72,
        respiratory_rate: parseInt(respRate) || 16,
        oxygen_saturation: parseInt(spo2) || 98,
        pain_score: painScore,
        notes: vitalsNotes
      });
      setVitalsModalOpen(false);
      showToast("Vitals observation recorded & health timeline updated");
      loadPatientClinicalData(selectedPatientId);
    } catch (err: any) {
      alert(err.message || "Failed to record vitals observation");
    } finally {
      setSavingVitals(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !noteAssessment) return;
    setSavingNote(true);
    try {
      await nursingApi.createNote({
        patient_id: selectedPatientId,
        admission_id: selectedPatient?.admission_id,
        note_type: noteType,
        assessment: noteAssessment,
        care_provided: noteCareProvided,
        patient_response: noteResponse,
        concerns: noteConcerns
      });
      setNoteModalOpen(false);
      setNoteAssessment("");
      setNoteCareProvided("");
      setNoteResponse("");
      showToast("Nursing progress note saved & signed");
      loadPatientClinicalData(selectedPatientId);
    } catch (err: any) {
      alert(err.message || "Failed to save nursing note");
    } finally {
      setSavingNote(false);
    }
  };

  const handleRecordMar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setSavingMar(true);
    try {
      await nursingApi.recordMedicationAdministration({
        prescription_id: `rx-${selectedPatientId.slice(0, 8)}`,
        patient_id: selectedPatientId,
        admission_id: selectedPatient?.admission_id,
        medicine_name: marMedName,
        dose: marDose,
        route: marRoute,
        status: marStatus,
        reason_not_administered: marReason
      });
      setMarModalOpen(false);
      showToast("Medication Administration Record (MAR) updated");
      loadPatientClinicalData(selectedPatientId);
    } catch (err: any) {
      alert(err.message || "Failed to record medication administration");
    } finally {
      setSavingMar(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 p-4 rounded-xl bg-emerald-500/90 border border-emerald-400 text-white shadow-2xl flex items-center gap-3 backdrop-blur-md">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shadow-inner">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Clinical Nursing Workspace
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 font-medium">
                  Phase 3 Live Inpatient Care
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Continuous vitals observation matrix, structured nursing notes, MAR administration, and shift handovers.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadInpatients}
              className="gap-2 border-slate-700 bg-slate-800/60 hover:bg-slate-700/60 text-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Main 2-Column Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Inpatient Bed / Patient Roster (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Assigned Inpatients ({inpatients.length})
                </span>
                <span className="text-xs text-pink-400 font-medium">General & ICU Wards</span>
              </div>

              {loading ? (
                <LoadingState message="Loading inpatients..." />
              ) : inpatients.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No inpatients currently admitted.</div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {inpatients.map((pat) => {
                    const isSelected = pat.patient_id === selectedPatientId;
                    return (
                      <div
                        key={pat.patient_id || pat.id}
                        onClick={() => setSelectedPatientId(pat.patient_id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-gradient-to-r from-pink-950/40 to-slate-900 border-pink-500/40 ring-1 ring-pink-500/30 shadow-lg"
                            : "bg-slate-850/40 border-slate-800 hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-white text-sm">{pat.patient_name || "Patient"}</div>
                            <div className="text-xs font-mono text-pink-400">{pat.onehealth_id || "OH-0000"}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1">
                            <BedDouble className="h-3 w-3 text-pink-400" />
                            {pat.ward_name ? `${pat.ward_name} - Bed ${pat.bed_number}` : `Bed ${pat.bed_number || "A1"}`}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-400 truncate">
                          Dx: {pat.reason_for_admission || pat.provisional_diagnosis || "Inpatient Care Observation"}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Doctor: {pat.doctor_name || "Dr. Attending"}</span>
                          <span>Admitted: {new Date(pat.admission_date || pat.created_at || Date.now()).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Inpatient Clinical Care Tabs (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            {selectedPatient ? (
              <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-6 backdrop-blur-md space-y-6">
                {/* Active Inpatient Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div>
                    <div className="text-lg font-bold text-white flex items-center gap-2">
                      {selectedPatient.patient_name}
                      <span className="text-xs font-mono text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">
                        {selectedPatient.onehealth_id}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Ward: <strong className="text-slate-200">{selectedPatient.ward_name || "General Ward"}</strong> | Bed: <strong className="text-slate-200">{selectedPatient.bed_number || "Allocated"}</strong> | Attending: <strong className="text-slate-200">{selectedPatient.doctor_name || "Dr. Physician"}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeTab === "VITALS" && (
                      <Button
                        size="sm"
                        onClick={() => setVitalsModalOpen(true)}
                        className="bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/20 text-xs"
                      >
                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                        Record Vitals
                      </Button>
                    )}
                    {activeTab === "NOTES" && (
                      <Button
                        size="sm"
                        onClick={() => setNoteModalOpen(true)}
                        className="bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/20 text-xs"
                      >
                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                        New Progress Note
                      </Button>
                    )}
                    {activeTab === "MAR" && (
                      <Button
                        size="sm"
                        onClick={() => setMarModalOpen(true)}
                        className="bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/20 text-xs"
                      >
                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                        Administer Dose
                      </Button>
                    )}
                  </div>
                </div>

                {/* Sub-Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <button
                    onClick={() => setActiveTab("VITALS")}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
                      activeTab === "VITALS"
                        ? "bg-pink-600 text-white shadow-md shadow-pink-500/20"
                        : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Thermometer className="h-3.5 w-3.5" />
                    Vitals Matrix ({vitalsList.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("MAR")}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
                      activeTab === "MAR"
                        ? "bg-pink-600 text-white shadow-md shadow-pink-500/20"
                        : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Pill className="h-3.5 w-3.5" />
                    Medication Record (MAR) ({marList.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("NOTES")}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
                      activeTab === "NOTES"
                        ? "bg-pink-600 text-white shadow-md shadow-pink-500/20"
                        : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Nursing Notes ({notesList.length})
                  </button>
                </div>

                {/* Tab 1: Vitals Observations */}
                {activeTab === "VITALS" && (
                  <div className="space-y-4">
                    {loadingVitals ? (
                      <LoadingState message="Fetching vitals telemetry..." />
                    ) : vitalsList.length === 0 ? (
                      <EmptyState
                        title="No Vitals Recorded Yet"
                        description="Record patient vital observations (BP, SpO2, Temp, Heart Rate) to populate the clinical chart."
                      />
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-800">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-800/60 uppercase tracking-wider text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="px-4 py-3">Timestamp</th>
                              <th className="px-4 py-3">Blood Pressure</th>
                              <th className="px-4 py-3">Heart Rate</th>
                              <th className="px-4 py-3">SpO2</th>
                              <th className="px-4 py-3">Temperature</th>
                              <th className="px-4 py-3">Pain Score</th>
                              <th className="px-4 py-3">Recorded By</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {vitalsList.map((v) => (
                              <tr key={v.id} className="hover:bg-slate-800/30">
                                <td className="px-4 py-3 font-mono text-slate-300">
                                  {new Date(v.observation_time).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 font-semibold text-white">
                                  {v.systolic_bp || 120}/{v.diastolic_bp || 80} mmHg
                                </td>
                                <td className="px-4 py-3 text-slate-200">{v.heart_rate_bpm || 72} bpm</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded font-bold ${
                                    (v.oxygen_saturation || 98) < 92
                                      ? "bg-red-500/20 text-red-300"
                                      : "bg-emerald-500/20 text-emerald-300"
                                  }`}>
                                    {v.oxygen_saturation || 98}%
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-200">{v.temperature_c || 37.0} °C</td>
                                <td className="px-4 py-3 text-slate-200">{v.pain_score || 0} / 10</td>
                                <td className="px-4 py-3 text-slate-400">{v.nurse_name || "Nurse on Duty"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: MAR (Medication Administration Record) */}
                {activeTab === "MAR" && (
                  <div className="space-y-4">
                    {loadingMar ? (
                      <LoadingState message="Fetching MAR records..." />
                    ) : marList.length === 0 ? (
                      <EmptyState
                        title="No Medication Doses Logged"
                        description="Record medication doses administered to the patient according to the doctor's prescription."
                      />
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-800">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-800/60 uppercase tracking-wider text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="px-4 py-3">Administered Time</th>
                              <th className="px-4 py-3">Medication Name</th>
                              <th className="px-4 py-3">Dose & Route</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Nurse</th>
                              <th className="px-4 py-3">Clinical Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {marList.map((m) => (
                              <tr key={m.id} className="hover:bg-slate-800/30">
                                <td className="px-4 py-3 font-mono text-slate-300">
                                  {new Date(m.administered_time).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 font-semibold text-white">{m.medicine_name}</td>
                                <td className="px-4 py-3 text-slate-300">
                                  {m.administered_dose} ({m.route})
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                                    m.status === "ADMINISTERED"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  }`}>
                                    {m.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-400">{m.nurse_name || "Nurse Staff"}</td>
                                <td className="px-4 py-3 text-slate-400">{m.reason_if_not_given || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Nursing Clinical Notes */}
                {activeTab === "NOTES" && (
                  <div className="space-y-4">
                    {loadingNotes ? (
                      <LoadingState message="Fetching nursing notes..." />
                    ) : notesList.length === 0 ? (
                      <EmptyState
                        title="No Nursing Notes Documented"
                        description="Document structured shift assessment, patient response, and care plan notes."
                      />
                    ) : (
                      <div className="space-y-3">
                        {notesList.map((n) => (
                          <div key={n.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20 uppercase">
                                {n.note_type} NOTE
                              </span>
                              <span className="text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
                            </div>
                            <div className="text-sm text-slate-200">
                              <strong>Assessment:</strong> {n.assessment}
                            </div>
                            {n.care_provided && (
                              <div className="text-xs text-slate-300">
                                <strong>Care Provided:</strong> {n.care_provided}
                              </div>
                            )}
                            {n.patient_response && (
                              <div className="text-xs text-slate-300">
                                <strong>Patient Response:</strong> {n.patient_response}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState title="Select a Patient" description="Choose an inpatient from the roster to view and log care." />
            )}
          </div>
        </div>

        {/* Record Vitals Modal */}
        {vitalsModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Thermometer className="h-5 w-5 text-pink-400" />
                  Record Inpatient Vitals Observation
                </h2>
                <button onClick={() => setVitalsModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleRecordVitals} className="p-6 space-y-4 text-sm text-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Systolic BP (mmHg)
                    </label>
                    <input
                      type="number"
                      required
                      value={systolicBp}
                      onChange={(e) => setSystolicBp(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Diastolic BP (mmHg)
                    </label>
                    <input
                      type="number"
                      required
                      value={diastolicBp}
                      onChange={(e) => setDiastolicBp(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Heart Rate (bpm)
                    </label>
                    <input
                      type="number"
                      required
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      SpO2 (%)
                    </label>
                    <input
                      type="number"
                      required
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Temp (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={tempC}
                      onChange={(e) => setTempC(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Respiratory Rate (/min)
                    </label>
                    <input
                      type="number"
                      value={respRate}
                      onChange={(e) => setRespRate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Pain Score (0 - 10)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={painScore}
                      onChange={(e) => setPainScore(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Nurse Clinical Observations & Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Afebrile, breathing comfortably on room air..."
                    value={vitalsNotes}
                    onChange={(e) => setVitalsNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setVitalsModalOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingVitals} className="bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/20">
                    {savingVitals ? "Saving..." : "Record Vitals Observation"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Nursing Note Modal */}
        {noteModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-pink-400" />
                  Document Nursing Progress Note
                </h2>
                <button onClick={() => setNoteModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateNote} className="p-6 space-y-4 text-sm text-slate-200">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Note Type
                  </label>
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-pink-500"
                  >
                    <option value="PROGRESS">Progress / Routine Shift Note</option>
                    <option value="ASSESSMENT">Comprehensive Assessment</option>
                    <option value="CARE_PLAN">Care Plan Implementation</option>
                    <option value="INCIDENT">Incident / Red Flag</option>
                    <option value="HANDOVER">Shift Handover</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Assessment & Clinical Status <span className="text-pink-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Patient oriented to time, place, and person. Tolerating soft diet well..."
                    value={noteAssessment}
                    onChange={(e) => setNoteAssessment(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Care Provided & Nursing Interventions
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. IV line flushed, nebulization administered, wound dressed..."
                    value={noteCareProvided}
                    onChange={(e) => setNoteCareProvided(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Patient Response & Concerns
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Patient expressed relief from pain after analgesia..."
                    value={noteResponse}
                    onChange={(e) => setNoteResponse(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setNoteModalOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingNote} className="bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/20">
                    {savingNote ? "Saving..." : "Save Progress Note"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MAR Modal */}
        {marModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Pill className="h-5 w-5 text-pink-400" />
                  Log Medication Administration (MAR)
                </h2>
                <button onClick={() => setMarModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleRecordMar} className="p-6 space-y-4 text-sm text-slate-200">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Medicine Name <span className="text-pink-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={marMedName}
                    onChange={(e) => setMarMedName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Administered Dose
                    </label>
                    <input
                      type="text"
                      required
                      value={marDose}
                      onChange={(e) => setMarDose(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Route
                    </label>
                    <select
                      value={marRoute}
                      onChange={(e) => setMarRoute(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-pink-500"
                    >
                      <option value="Oral">Oral</option>
                      <option value="IV (Intravenous)">IV (Intravenous)</option>
                      <option value="IM (Intramuscular)">IM (Intramuscular)</option>
                      <option value="SC (Subcutaneous)">SC (Subcutaneous)</option>
                      <option value="Inhalation">Inhalation</option>
                      <option value="Topical">Topical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Administration Status
                  </label>
                  <select
                    value={marStatus}
                    onChange={(e) => setMarStatus(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-pink-500"
                  >
                    <option value="ADMINISTERED">ADMINISTERED (Given Successfully)</option>
                    <option value="HELD">HELD (Clinically Held / NPO)</option>
                    <option value="REFUSED">REFUSED (Patient Refusal)</option>
                    <option value="MISSED">MISSED (Medication Not Available)</option>
                  </select>
                </div>

                {marStatus !== "ADMINISTERED" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Reason for Withholding / Failure <span className="text-pink-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Specify reason dose was held or refused..."
                      value={marReason}
                      onChange={(e) => setMarReason(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setMarModalOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingMar} className="bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/20">
                    {savingMar ? "Saving..." : "Log MAR Record"}
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
