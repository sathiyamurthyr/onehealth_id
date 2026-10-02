"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Pill,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Printer,
  Download,
  Share2,
  ShieldCheck,
  Lock,
  Building,
  Hospital as HospitalIcon,
  User,
  Calendar,
  Clock,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { Button } from "@/components/ui/Card";

interface MedicineRow {
  id: string;
  medicine_name: string;
  strength: string;
  dosage_form: string;
  dose: string;
  frequency: string;
  duration_days: number;
  route: string;
  food_instruction: string;
  quantity: number;
  specific_instructions: string;
}

const COMMON_DRUGS = [
  { name: "Paracetamol", strength: "650 mg", form: "Tablet", freq: "Thrice daily (1-1-1)", route: "Oral", food: "After food" },
  { name: "Amoxicillin + Clavulanic Acid", strength: "625 mg", form: "Tablet", freq: "Twice daily (1-0-1)", route: "Oral", food: "After food" },
  { name: "Pantoprazole", strength: "40 mg", form: "Tablet", freq: "Once daily (1-0-0)", route: "Oral", food: "Before food" },
  { name: "Cetirizine", strength: "10 mg", form: "Tablet", freq: "Once daily (0-0-1)", route: "Oral", food: "Bedtime" },
  { name: "Thiocolchicoside", strength: "4 mg", form: "Capsule", freq: "Twice daily (1-0-1)", route: "Oral", food: "After food" },
  { name: "Ibuprofen", strength: "400 mg", form: "Tablet", freq: "Twice daily (1-0-1)", route: "Oral", food: "After food" },
  { name: "Metformin", strength: "500 mg", form: "Tablet", freq: "Twice daily (1-0-1)", route: "Oral", food: "With food" },
  { name: "Atorvastatin", strength: "20 mg", form: "Tablet", freq: "Once daily (0-0-1)", route: "Oral", food: "Bedtime" },
];

function NewPrescriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspace, user } = useWorkspace();

  const patientIdFromQuery = searchParams?.get("patient_id") || "";
  const visitIdFromQuery = searchParams?.get("visit_id") || "";

  // Step state: 1 = Editor, 2 = Review, 3 = Success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Patient Selection & Data
  const [selectedPatientId, setSelectedPatientId] = useState(patientIdFromQuery);
  const [patient, setPatient] = useState<any>(null);
  const [patientList, setPatientList] = useState<any[]>([]);
  const [loadingPatient, setLoadingPatient] = useState(false);

  // Prescription Form State
  const [visitId, setVisitId] = useState(visitIdFromQuery || `VIS-2026-${Math.floor(100000 + Math.random() * 900000)}`);
  const [diagnosis, setDiagnosis] = useState("Acute Lumbar Strain & Muscle Spasm");
  const [doctorNotes, setDoctorNotes] = useState("Advised strict bed rest for 48 hours, core lumbar physiotherapy after acute pain subsides, avoid forward bending and lifting heavy weights.");
  const [followUpDays, setFollowUpDays] = useState(7);
  const [requiresPin, setRequiresPin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState("");

  // Medicine Item Builder State
  const [medicines, setMedicines] = useState<MedicineRow[]>([
    {
      id: "med-1",
      medicine_name: "Paracetamol",
      strength: "650 mg",
      dosage_form: "Tablet",
      dose: "1",
      frequency: "Thrice daily (1-1-1)",
      duration_days: 5,
      route: "Oral",
      food_instruction: "After food",
      quantity: 15,
      specific_instructions: "Take after meals with a glass of warm water.",
    },
    {
      id: "med-2",
      medicine_name: "Thiocolchicoside",
      strength: "4 mg",
      dosage_form: "Capsule",
      dose: "1",
      frequency: "Twice daily (1-0-1)",
      duration_days: 5,
      route: "Oral",
      food_instruction: "After food",
      quantity: 10,
      specific_instructions: "Muscle relaxant for lumbar spasms.",
    }
  ]);

  const [curMedicineName, setCurMedicineName] = useState("");
  const [curStrength, setCurStrength] = useState("500 mg");
  const [curForm, setCurForm] = useState("Tablet");
  const [curDose, setCurDose] = useState("1");
  const [curFrequency, setCurFrequency] = useState("Twice daily (1-0-1)");
  const [curDuration, setCurDuration] = useState(5);
  const [curRoute, setCurRoute] = useState("Oral");
  const [curFood, setCurFood] = useState("After food");
  const [curQuantity, setCurQuantity] = useState(10);
  const [curInstructions, setCurInstructions] = useState("");

  // Created Prescription Result
  const [createdRx, setCreatedRx] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load patients and initial data
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingPatient(true);
        const pts = await api.patients.list().catch(() => []);
        setPatientList(pts || []);

        const targetId = selectedPatientId || pts[0]?.id;
        if (targetId) {
          setSelectedPatientId(targetId);
          const pData = await api.patients.get(targetId).catch(() => null);
          setPatient(pData || pts[0]);
        }
      } catch (err) {
        console.error("Failed to load patient data:", err);
      } finally {
        setLoadingPatient(false);
      }
    }
    loadData();
  }, []);

  const handlePatientChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setSelectedPatientId(pId);
    try {
      const pData = await api.patients.get(pId);
      setPatient(pData);
    } catch {
      const fallback = patientList.find(p => p.id === pId);
      setPatient(fallback || null);
    }
  };

  const handleQuickAdd = (drug: typeof COMMON_DRUGS[0]) => {
    setCurMedicineName(drug.name);
    setCurStrength(drug.strength);
    setCurForm(drug.form);
    setCurFrequency(drug.freq);
    setCurRoute(drug.route);
    setCurFood(drug.food);
    setCurQuantity(10);
  };

  const handleAddMedicine = () => {
    if (!curMedicineName.trim()) {
      alert("Please enter or select a medicine name.");
      return;
    }
    const newMed: MedicineRow = {
      id: `med-${Date.now()}`,
      medicine_name: curMedicineName.trim(),
      strength: curStrength.trim(),
      dosage_form: curForm,
      dose: curDose.trim(),
      frequency: curFrequency,
      duration_days: Number(curDuration) || 5,
      route: curRoute,
      food_instruction: curFood,
      quantity: Number(curQuantity) || 10,
      specific_instructions: curInstructions.trim() || "As directed by physician",
    };
    setMedicines([...medicines, newMed]);
    setCurMedicineName("");
    setCurInstructions("");
  };

  const handleRemoveMedicine = (id: string) => {
    setMedicines(medicines.filter(m => m.id !== id));
  };

  const handleProceedToReview = () => {
    if (medicines.length === 0) {
      alert("Please add at least one medication before proceeding to review.");
      return;
    }
    if (!diagnosis.trim()) {
      alert("Please enter a clinical diagnosis.");
      return;
    }
    setCurrentStep(2);
  };

  const handleConfirmSubmission = async () => {
    if (requiresPin) {
      setShowPinModal(true);
      return;
    }
    await executeCreatePrescription();
  };

  const executeCreatePrescription = async (pin?: string) => {
    try {
      setSubmitting(true);
      setErrorMessage("");
      setPinError("");

      const payload = {
        patient_id: selectedPatientId,
        hospital_id: workspace?.hospital_ref_id,
        visit_id: visitId,
        diagnosis: diagnosis.trim(),
        doctor_notes: doctorNotes.trim(),
        follow_up_days: Number(followUpDays) || 0,
        requires_pin: requiresPin,
        verification_pin: pin,
        items: medicines.map(m => ({
          medicine_name: m.medicine_name,
          strength: m.strength,
          dosage_form: m.dosage_form,
          dose: m.dose,
          frequency: m.frequency,
          duration_days: m.duration_days,
          route: m.route,
          food_instruction: m.food_instruction,
          quantity: m.quantity,
          specific_instructions: m.specific_instructions,
        }))
      };

      const result = await api.prescriptions.create(payload);
      setCreatedRx(result);
      setShowPinModal(false);
      setCurrentStep(3); // Show Success Screen
    } catch (err: any) {
      console.error("Prescription creation failed:", err);
      const msg = err.message || "Failed to create prescription. Please check clinical inputs.";
      if (showPinModal) {
        setPinError(msg);
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinValue.trim()) {
      setPinError("Please enter your 4-digit signing PIN.");
      return;
    }
    await executeCreatePrescription(pinValue.trim());
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["DOCTOR"]}>
      <div className="bg-white min-h-screen text-slate-900 pb-16">
        {/* Top Breadcrumb & Header */}
        <div className="border-b border-slate-200 bg-white sticky top-0 z-20 px-6 py-4 shadow-xs">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/doctor"
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Prescription Desk</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 font-medium">{workspace?.hospital_name || "Kedar Hospital"}</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900">
                  {currentStep === 1 && "Create New Prescription"}
                  {currentStep === 2 && "Prescription Review & Confirmation"}
                  {currentStep === 3 && "Prescription Successfully Signed"}
                </h1>
              </div>
            </div>

            {/* Stepper Indicator */}
            <div className="flex items-center gap-2 text-xs font-semibold">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${currentStep === 1 ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-slate-400 border-slate-200"}`}>
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                <span>Editor</span>
              </div>
              <span className="text-slate-300">→</span>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${currentStep === 2 ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-slate-400 border-slate-200"}`}>
                <span className="w-4 h-4 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[10px]">2</span>
                <span>Review</span>
              </div>
              <span className="text-slate-300">→</span>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${currentStep === 3 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-400 border-slate-200"}`}>
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
                <span>Complete</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 pt-6">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <p>{errorMessage}</p>
            </div>
          )}

          {/* ========================================================
              STEP 1: PRESCRIPTION BUILDER / EDITOR
             ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Context Header Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Patient
                    </label>
                    {patientList.length > 0 ? (
                      <select
                        value={selectedPatientId}
                        onChange={handlePatientChange}
                        className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {patientList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.onehealth_id || p.id})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-bold text-slate-900">{patient?.name || "Loading..."}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {patient?.age ? `${patient.age} yrs • ` : ""}{patient?.gender || "Patient"} • {patient?.onehealth_id || "OHID-PENDING"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Visit & Date
                    </label>
                    <input
                      type="text"
                      value={visitId}
                      onChange={(e) => setVisitId(e.target.value)}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    />
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Consulting Doctor
                    </label>
                    <p className="text-sm font-bold text-slate-900">{user?.name || "Dr. Rajesh Kumar"}</p>
                    <p className="text-xs text-blue-600 font-medium">Orthopedics & Trauma</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Hospital Facility Context
                    </label>
                    <p className="text-sm font-bold text-slate-900 truncate">{workspace?.hospital_name || "Kedar Hospital"}</p>
                    <p className="text-xs text-slate-500 truncate">{workspace?.branch_name || "Mugalivakkam Main"}</p>
                  </div>
                </div>
              </div>

              {/* Diagnosis & Clinical Indication */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Clinical Diagnosis & Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Primary Clinical Diagnosis *
                    </label>
                    <input
                      type="text"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="e.g. Acute Lumbar Strain, Essential Hypertension..."
                      className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Follow-up Plan (Days)
                    </label>
                    <div className="flex items-center gap-2">
                      {[3, 5, 7, 14, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setFollowUpDays(d)}
                          className={`px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                            followUpDays === d
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {d} days
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Physician Notes & Patient Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    placeholder="Dietary instructions, physical activity advice, precautions..."
                    className="w-full text-sm bg-white border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Quick Drug Picker Bar */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 shadow-xs">
                <p className="text-xs font-semibold text-blue-900 mb-2.5 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-blue-600" />
                  Quick Prescribe Formulary (Tap to pre-fill):
                </p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_DRUGS.map((d, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickAdd(d)}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-blue-200 hover:border-blue-400 text-slate-800 text-xs font-medium transition shadow-xs flex items-center gap-1.5 hover:bg-blue-50"
                    >
                      <Plus className="w-3 h-3 text-blue-600" />
                      <span>{d.name} {d.strength}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Medicine Entry Section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-emerald-600" />
                    Add Medication to Prescription
                  </span>
                  <span className="text-xs font-normal text-slate-500">
                    {medicines.length} medications currently prescribed
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Medicine Name *</label>
                    <input
                      type="text"
                      value={curMedicineName}
                      onChange={(e) => setCurMedicineName(e.target.value)}
                      placeholder="e.g. Paracetamol, Amoxicillin..."
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Strength</label>
                    <input
                      type="text"
                      value={curStrength}
                      onChange={(e) => setCurStrength(e.target.value)}
                      placeholder="e.g. 500 mg, 10 ml..."
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Form</label>
                    <select
                      value={curForm}
                      onChange={(e) => setCurForm(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    >
                      <option value="Tablet">Tablet</option>
                      <option value="Capsule">Capsule</option>
                      <option value="Syrup">Syrup</option>
                      <option value="Injection">Injection</option>
                      <option value="Ointment">Ointment</option>
                      <option value="Inhaler">Inhaler</option>
                      <option value="Drops">Drops</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Dose</label>
                    <input
                      type="text"
                      value={curDose}
                      onChange={(e) => setCurDose(e.target.value)}
                      placeholder="1"
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency</label>
                    <select
                      value={curFrequency}
                      onChange={(e) => setCurFrequency(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    >
                      <option value="Once daily (1-0-0)">Once daily (1-0-0) Morning</option>
                      <option value="Once daily (0-0-1)">Once daily (0-0-1) Night</option>
                      <option value="Twice daily (1-0-1)">Twice daily (1-0-1)</option>
                      <option value="Thrice daily (1-1-1)">Thrice daily (1-1-1)</option>
                      <option value="Four times daily (1-1-1-1)">Four times daily (1-1-1-1)</option>
                      <option value="As needed (SOS)">As needed (SOS / PRN)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Days)</label>
                    <input
                      type="number"
                      value={curDuration}
                      onChange={(e) => {
                        const days = Number(e.target.value) || 1;
                        setCurDuration(days);
                        setCurQuantity(days * 2);
                      }}
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Food Timing</label>
                    <select
                      value={curFood}
                      onChange={(e) => setCurFood(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    >
                      <option value="After food">After food</option>
                      <option value="Before food">Before food</option>
                      <option value="With food">With food</option>
                      <option value="Empty stomach">Empty stomach</option>
                      <option value="Bedtime">Bedtime</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Route</label>
                    <select
                      value={curRoute}
                      onChange={(e) => setCurRoute(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    >
                      <option value="Oral">Oral</option>
                      <option value="Topical">Topical</option>
                      <option value="Intravenous (IV)">Intravenous (IV)</option>
                      <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                      <option value="Inhalation">Inhalation</option>
                      <option value="Sublingual">Sublingual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Dispense Qty</label>
                    <input
                      type="number"
                      value={curQuantity}
                      onChange={(e) => setCurQuantity(Number(e.target.value) || 1)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Special Instructions</label>
                    <input
                      type="text"
                      value={curInstructions}
                      onChange={(e) => setCurInstructions(e.target.value)}
                      placeholder="e.g. Swallow whole with water, avoid alcohol..."
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAddMedicine}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 px-4 py-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Medicine to Prescription</span>
                  </Button>
                </div>
              </div>

              {/* Medication Stack (Cards) */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Prescription Medication List ({medicines.length})
                </h4>

                {medicines.map((m, idx) => (
                  <div
                    key={m.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-blue-200 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-100">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="text-sm font-bold text-slate-900">{m.medicine_name}</h5>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {m.strength}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">
                            {m.dosage_form}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Take <span className="font-semibold">{m.dose} {m.dosage_form}</span> • {m.frequency} • {m.food_instruction} • {m.route} for <span className="font-semibold">{m.duration_days} days</span>
                        </p>
                        {m.specific_instructions && (
                          <p className="text-[11px] text-slate-400 mt-0.5 italic">
                            Instructions: {m.specific_instructions}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end md:self-center">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Qty</span>
                        <span className="text-xs font-bold text-slate-800">{m.quantity} Units</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicine(m.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Clinical Verification Configuration */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Enforce Digital Signing PIN Verification</h5>
                    <p className="text-[11px] text-slate-500">
                      When enabled, requires entering your 4-digit signature PIN before prescription finalization.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={requiresPin}
                  onChange={(e) => setRequiresPin(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </div>

              {/* Bottom Action Strip */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <Link
                  href="/doctor"
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </Link>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleProceedToReview}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-2.5 gap-2 shadow-xs"
                >
                  <span>Review Prescription</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 2: PRESCRIPTION REVIEW SCREEN
             ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                {/* Formal Prescription Header */}
                <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-lg tracking-tight">ONEHEALTH ID</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold uppercase">
                        Clinical Rx
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-800 mt-1">{workspace?.hospital_name || "Kedar Hospital"}</h2>
                    <p className="text-xs text-slate-500">{workspace?.branch_name || "Mugalivakkam Main Branch, Chennai"}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-500">Visit Ref: <span className="font-mono text-slate-900">{visitId}</span></p>
                    <p className="text-xs text-slate-500">Date: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    <p className="text-xs font-semibold text-emerald-600 mt-1">Status: Pending Doctor Confirmation</p>
                  </div>
                </div>

                {/* Patient & Doctor Demographics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Patient Details</p>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">{patient?.name || "Patient"}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      OH-ID: <span className="font-mono font-semibold">{patient?.onehealth_id || "OHID-PENDING"}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Age / Gender: {patient?.age || "42"} yrs / {patient?.gender || "Male"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Prescribing Physician</p>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">{user?.name || "Dr. Rajesh Kumar"}</h4>
                    <p className="text-xs text-blue-600 font-medium">Orthopedics & Trauma</p>
                    <p className="text-xs text-slate-500">Reg: TN-MCI-2026-REG</p>
                  </div>
                </div>

                {/* Clinical Indication */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Clinical Diagnosis</h4>
                  <p className="text-sm font-bold text-slate-900">{diagnosis}</p>
                  {doctorNotes && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                      <span className="font-semibold text-slate-900 block mb-0.5">Doctor Instructions:</span>
                      {doctorNotes}
                    </div>
                  )}
                </div>

                {/* Medications Table */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Prescribed Medicines</h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Medication</th>
                          <th className="py-2.5 px-3">Strength & Form</th>
                          <th className="py-2.5 px-3">Dosage & Frequency</th>
                          <th className="py-2.5 px-3">Duration</th>
                          <th className="py-2.5 px-3">Food & Route</th>
                          <th className="py-2.5 px-3 text-right">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {medicines.map((m, idx) => (
                          <tr key={m.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{m.medicine_name}</td>
                            <td className="py-2.5 px-3 text-slate-700">{m.strength} • {m.dosage_form}</td>
                            <td className="py-2.5 px-3 font-semibold text-blue-700">{m.frequency}</td>
                            <td className="py-2.5 px-3 text-slate-700">{m.duration_days} days</td>
                            <td className="py-2.5 px-3 text-slate-600">{m.food_instruction} ({m.route})</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">{m.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Follow-up Note */}
                <div className="flex items-center justify-between text-xs text-slate-600 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200">
                  <span className="font-semibold text-blue-900">Follow-up Consultation Advised:</span>
                  <span className="font-bold text-blue-700">In {followUpDays} days</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="gap-2 text-xs font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back & Edit</span>
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  disabled={submitting}
                  onClick={handleConfirmSubmission}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-3 gap-2 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? "Signing & Saving..." : "Confirm & Sign Prescription"}</span>
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 3: PRESCRIPTION SUCCESS SCREEN
             ======================================================== */}
          {currentStep === 3 && createdRx && (
            <div className="space-y-6">
              <div className="bg-white border border-emerald-200 rounded-3xl p-8 shadow-sm text-center space-y-6 max-w-2xl mx-auto">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    Prescription Finalized & Cryptographically Signed
                  </span>
                  <h2 className="text-2xl font-bold text-slate-900 mt-3">Prescription Created Successfully</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Immutable clinical version #{createdRx.version || 1} has been registered to OneHealth ID Network.
                  </p>
                </div>

                {/* Details Summary Pill */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs space-y-2">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Prescription ID:</span>
                    <span className="font-mono font-bold text-blue-700">{createdRx.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Patient:</span>
                    <span className="font-bold text-slate-900">{createdRx.patient_name || patient?.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Doctor:</span>
                    <span className="font-bold text-slate-900">{createdRx.doctor_name || user?.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Hospital Facility:</span>
                    <span className="font-bold text-slate-900">{createdRx.hospital_name || workspace?.hospital_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-bold text-emerald-600">SIGNED / FINALIZED</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">Verification Token:</span>
                    <span className="font-mono text-slate-600 truncate max-w-[240px]">{createdRx.verification_token || "vtok_authenticated"}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link
                    href={`/doctor/prescriptions/${createdRx.id}`}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Details</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => window.open(`/doctor/prescriptions/${createdRx.id}?print=true`, "_blank")}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Print Prescription</span>
                  </button>

                  <Link
                    href="/doctor"
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Dashboard</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            PIN VERIFICATION MODAL (ONLY SHOWN IF requires_pin IS TRUE)
           ======================================================== */}
        {showPinModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>

              <div className="text-center">
                <h3 className="text-base font-bold text-slate-900">Clinical Signature Verification</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Prescription verification is required before final signing. Please enter your authorized 4-digit digital signing PIN.
                </p>
              </div>

              {pinError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {pinError}
                </div>
              )}

              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                    Enter Verification PIN (Default: 1234)
                  </label>
                  <input
                    type="password"
                    maxLength={8}
                    autoFocus
                    value={pinValue}
                    onChange={(e) => setPinValue(e.target.value)}
                    placeholder="••••"
                    className="w-40 mx-auto block text-center tracking-widest text-lg font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPinModal(false)}
                    className="w-full text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                  >
                    {submitting ? "Verifying..." : "Verify & Sign"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export default function NewPrescriptionPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Loading prescription workflow...</div>}>
      <NewPrescriptionContent />
    </React.Suspense>
  );
}
