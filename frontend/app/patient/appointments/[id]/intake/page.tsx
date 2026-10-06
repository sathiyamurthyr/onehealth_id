"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  MessageSquare,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Send,
  HelpCircle
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { api } from "@/lib/api";
import { doctorWorkspaceApi } from "@/lib/api/doctor-workspace";
import { PatientReportedIntake } from "@/lib/types";

const COMMON_SYMPTOMS = [
  "Fever",
  "Headache",
  "Nausea",
  "Vomiting",
  "Stomach Pain",
  "Fatigue",
  "Dizziness",
  "Shortness of Breath",
  "Cough",
  "Chest Discomfort",
  "Joint Pain",
  "Skin Rash",
];

export default function PatientAppointmentIntakePage() {
  const router = useRouter();
  const params = useParams();
  const appointmentId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string>("p-101");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Intake form state
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [duration, setDuration] = useState("3 days");
  const [mainConcern, setMainConcern] = useState("");
  const [severity, setSeverity] = useState<"Mild" | "Moderate" | "Severe">("Moderate");
  const [location, setLocation] = useState("");
  const [relievingFactors, setRelievingFactors] = useState("");
  const [aggravatingFactors, setAggravatingFactors] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [previousTreatments, setPreviousTreatments] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [knownAllergies, setKnownAllergies] = useState("");

  useEffect(() => {
    async function loadCurrentIntake() {
      setLoading(true);
        let resolvedPatientId = "p-101";
        try {
          const profileRes = await api.patient.getProfile();
          if (profileRes?.data?.id) {
            resolvedPatientId = profileRes.data.id;
          }
        } catch {
          const user = api.auth.getCurrentUser();
          resolvedPatientId = user?.user_ref_id || user?.id || "p-101";
        }
        setPatientId(resolvedPatientId);

        const res = await doctorWorkspaceApi.getPatientIntake(resolvedPatientId, appointmentId).catch(() => ({ intake: undefined }));
        if (res.intake) {
          const it = res.intake;
          setReasonForVisit(it.reason_for_visit || "");
          setDuration(it.duration || "3 days");
          setMainConcern(it.main_concern || "");
          setSeverity(it.severity || "Moderate");
          setLocation(it.location || "");
          setRelievingFactors(it.relieving_factors || "");
          setAggravatingFactors(it.aggravating_factors || "");
          setSelectedSymptoms(it.associated_symptoms || []);
          setPreviousTreatments(it.previous_treatments || "");
          setCurrentMedications(it.current_medications || "");
          setKnownAllergies(it.known_allergies || "");
        }
      } catch (err: any) {
        console.error("Failed to load existing intake:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCurrentIntake();
  }, [appointmentId]);

  const toggleSymptom = (sym: string) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonForVisit.trim()) {
      setError("Please describe what you are experiencing in the box below.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const intakePayload: PatientReportedIntake = {
        appointment_id: appointmentId,
        reason_for_visit: reasonForVisit.trim(),
        duration: duration.trim() || undefined,
        main_concern: mainConcern.trim() || undefined,
        description: reasonForVisit.trim(),
        severity: severity,
        location: location.trim() || undefined,
        relieving_factors: relievingFactors.trim() || undefined,
        aggravating_factors: aggravatingFactors.trim() || undefined,
        associated_symptoms: selectedSymptoms,
        previous_treatments: previousTreatments.trim() || undefined,
        current_medications: currentMedications.trim() || undefined,
        known_allergies: knownAllergies.trim() || undefined,
      };

      await doctorWorkspaceApi.submitPatientIntake(patientId, intakePayload);
      setSuccess(true);
      setTimeout(() => {
        router.push("/patient/appointments");
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Failed to submit symptom intake. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="bg-slate-50 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link
              href="/patient/appointments"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Pre-Consultation Visit Description
              </h1>
              <p className="text-xs text-slate-500">
                Tell your doctor what you are experiencing before your consultation. Your words are preserved exactly as you write them.
              </p>
            </div>
          </div>

          {/* Success Banner */}
          {success && (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-2 shadow-xs animate-in zoom-in-95">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h2 className="text-base font-bold text-emerald-950">
                Symptom Description Successfully Submitted!
              </h2>
              <p className="text-xs text-emerald-800">
                Your doctor will review your description during your consultation. Redirecting to your appointments...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {error}
            </div>
          )}

          {/* Intake Form */}
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 text-xs text-slate-800">
            {/* 1. Large Main Reason Box (Requirement 7) */}
            <div className="space-y-2">
              <label className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                Tell the doctor what you are experiencing *
              </label>
              <p className="text-slate-500 text-xs">
                Describe your symptoms in your own words. For example:
                <em className="block text-indigo-700 font-medium mt-1 bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100">
                  &ldquo;I have had stomach pain for three days, especially after eating, and I have also been feeling tired.&rdquo;
                </em>
              </p>
              <textarea
                rows={4}
                required
                placeholder="Type your symptoms and concerns here..."
                value={reasonForVisit}
                onChange={(e) => setReasonForVisit(e.target.value)}
                className="w-full p-4 rounded-2xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50/40"
              />
            </div>

            {/* 2. Structured Intake (Requirement 9) */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Optional Details to Help Your Doctor
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Duration */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    When did it start? (Duration)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3 days ago, 2 weeks"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                {/* Severity */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    How severe is it?
                  </label>
                  <div className="flex items-center gap-2">
                    {(["Mild", "Moderate", "Severe"] as const).map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSeverity(sev)}
                        className={`flex-1 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                          severity === sev
                            ? sev === "Severe"
                              ? "bg-rose-600 text-white"
                              : sev === "Moderate"
                              ? "bg-amber-500 text-white"
                              : "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Where is the problem? (Body location)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Upper stomach, lower back, left knee"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                {/* Main concern */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Main Concern
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acid reflux, sudden sharp pain"
                    value={mainConcern}
                    onChange={(e) => setMainConcern(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                {/* What makes it better? */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    What makes it better? (Relieving factors)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lying down, drinking warm water, resting"
                    value={relievingFactors}
                    onChange={(e) => setRelievingFactors(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                {/* What makes it worse? */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    What makes it worse? (Aggravating factors)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Eating spicy foods, bending over, walking"
                    value={aggravatingFactors}
                    onChange={(e) => setAggravatingFactors(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Associated Symptoms Multi-select */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  Any associated symptoms? (Tap to select)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_SYMPTOMS.map((sym) => {
                    const isSelected = selectedSymptoms.includes(sym);
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => toggleSymptom(sym)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {sym}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Meds & Known Allergies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Current Medications (if any)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Telmisartan 40mg, Vitamin C"
                    value={currentMedications}
                    onChange={(e) => setCurrentMedications(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Known Drug or Food Allergies
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Penicillin, Peanuts"
                    value={knownAllergies}
                    onChange={(e) => setKnownAllergies(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Link
                href="/patient/appointments"
                className="px-4 py-2.5 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !reasonForVisit.trim()}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? "Saving..." : "Submit to Doctor"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
