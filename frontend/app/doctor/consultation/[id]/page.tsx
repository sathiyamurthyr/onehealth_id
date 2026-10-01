"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Stethoscope,
  ArrowLeft,
  CheckCircle2,
  Activity,
  Heart,
  FileText,
  Pill,
  ShieldCheck,
  AlertCircle,
  Save,
  Clock,
  User,
  QrCode
} from "lucide-react";
import { api } from "@/lib/api";
import { Patient, UserProfile } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/ui/Card";
import { LoadingState, ErrorState } from "@/components/ui/FeedbackStates";
import { PatientBanner } from "@/components/design-system/PatientBanner";

export default function DoctorConsultationPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const patientId = params?.id as string;
  const appointmentId = searchParams?.get("appointment_id") || undefined;
  const queueId = searchParams?.get("queue_id") || undefined;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Clinical encounter form fields
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [vitals, setVitals] = useState({
    bp: "120/80 mmHg",
    pulse: 72,
    spo2: 98,
    temperature: "98.6 °F",
    weight_kg: 65,
  });

  useEffect(() => {
    const cur = api.auth.getCurrentUser();
    setUser(cur);

    if (!patientId) return;

    const loadPatient = async () => {
      setLoading(true);
      setError("");
      try {
        const p = await api.patients.get(patientId);
        setPatient(p);
        if (p.diagnosis) {
          setSymptoms(p.diagnosis);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load patient records");
      } finally {
        setLoading(false);
      }
    };

    loadPatient();
  }, [patientId]);

  const handleVitalsChange = (field: string, value: any) => {
    setVitals((prev) => ({ ...prev, [field]: value }));
  };

  const handleCompleteConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) {
      alert("Please enter a clinical diagnosis before completing the consultation.");
      return;
    }

    setSubmitting(true);
    try {
      const doctorId = user?.username === "dr.anitha" ? "doc-k-02" : "doc-k-01";
      await api.consultations.record({
        appointment_id: appointmentId,
        patient_id: patientId,
        doctor_id: doctorId,
        symptoms: symptoms.trim() || undefined,
        diagnosis: diagnosis.trim(),
        clinical_notes: clinicalNotes.trim() || undefined,
        vitals: vitals,
      });

      // If queue token is provided, mark it as completed
      if (queueId) {
        try {
          await api.queue.complete(queueId);
        } catch {
          // already completed by procedure
        }
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/doctor/queue");
      }, 2000);
    } catch (err: any) {
      alert("Failed to record consultation: " + (err.message || "Database error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingState message="Opening Doctor Consultation Room..." />
      </AppLayout>
    );
  }

  if (error || !patient) {
    return (
      <AppLayout>
        <ErrorState
          title="Patient Not Found"
          message={error || "Could not retrieve patient records"}
          onRetry={() => window.location.reload()}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/doctor/queue"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Doctor Queue</span>
          </Link>

          <Badge variant="primary" className="text-xs">
            Clinical Consultation Room • Kedar Hospital
          </Badge>
        </div>

        {/* Patient Hero Banner */}
        <PatientBanner
          id={patient.id}
          name={patient.name}
          onehealthId={patient.onehealth_id}
          age={patient.age}
          gender={patient.gender}
          bloodGroup={patient.blood_group || "O+"}
          phone={patient.phone}
          primaryDiagnosis={patient.diagnosis}
        />

        {success ? (
          <div className="p-8 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3 animate-in fade-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
              Consultation Completed & Audited!
            </h2>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Diagnostic notes, prescription structures, and encounter telemetry successfully committed to PostgreSQL.
            </p>
            <p className="text-[11px] text-slate-400">Redirecting back to live queue...</p>
          </div>
        ) : (
          <form onSubmit={handleCompleteConsultation} className="space-y-6">
            {/* 1. Clinical Vitals Grid */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  1. Clinical Vitals Triage
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Blood Pressure</label>
                  <input
                    type="text"
                    value={vitals.bp}
                    onChange={(e) => handleVitalsChange("bp", e.target.value)}
                    placeholder="120/80 mmHg"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Pulse (bpm)</label>
                  <input
                    type="number"
                    value={vitals.pulse}
                    onChange={(e) => handleVitalsChange("pulse", parseInt(e.target.value) || 0)}
                    placeholder="72"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">SpO2 (%)</label>
                  <input
                    type="number"
                    value={vitals.spo2}
                    onChange={(e) => handleVitalsChange("spo2", parseInt(e.target.value) || 0)}
                    placeholder="98"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Temperature</label>
                  <input
                    type="text"
                    value={vitals.temperature}
                    onChange={(e) => handleVitalsChange("temperature", e.target.value)}
                    placeholder="98.6 °F"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={vitals.weight_kg}
                    onChange={(e) => handleVitalsChange("weight_kg", parseFloat(e.target.value) || 0)}
                    placeholder="65"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 min-h-[44px]"
                  />
                </div>
              </div>
            </Card>

            {/* 2. Chief Complaints & Symptoms */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  2. Chief Complaints & Clinical History
                </h3>
              </div>

              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={2}
                placeholder="Patient reporting symptoms, duration, prior medication..."
                className="w-full p-3.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Card>

            {/* 3. Clinical Diagnosis & Doctor Notes */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  3. Clinical Diagnosis & Prescription Orders <span className="text-rose-500">*</span>
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Primary Diagnosis <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    required
                    placeholder="e.g. Type 2 Diabetes Mellitus with Mild Neuropathy"
                    className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Clinical Notes, Diet & Medication Instructions
                  </label>
                  <textarea
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    rows={4}
                    placeholder="1. Tab Metformin 500mg (1-0-1) After Food for 30 days&#10;2. Fasting blood sugar & HbA1c review after 2 weeks&#10;3. Diabetic diet and 30 mins brisk walking"
                    className="w-full p-3.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 pb-12">
              <Link href="/doctor/queue" className="w-full sm:w-auto">
                <Button variant="outline" size="md" type="button" className="w-full sm:w-auto min-h-[44px]">
                  Discard Changes
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={submitting}
                className="w-full sm:w-auto gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? "Committing Consultation..." : "Complete Consultation & Update Queue"}</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
