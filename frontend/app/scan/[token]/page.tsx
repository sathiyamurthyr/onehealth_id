"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertCircle,
  Building2,
  Calendar,
  Stethoscope,
  RefreshCw,
  User,
  ArrowLeft,
  Share2,
  Sparkles
} from "lucide-react";
import { patientsApi } from "@/lib/api/patients";
import { QRWorkflowScanResult } from "@/lib/types";
import { Badge, Button } from "@/components/ui/Card";

export default function ResolveTokenScanPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<QRWorkflowScanResult | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionBusy, setIsActionBusy] = useState(false);

  useEffect(() => {
    if (!token) return;

    const resolveScan = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await patientsApi.scanWorkflow(token);
        setScanResult(res);
      } catch (err: any) {
        console.error("Failed to resolve scan token:", err);
        setError(err.message || "Invalid or unverified OneHealth QR reference.");
      } finally {
        setLoading(false);
      }
    };

    resolveScan();
  }, [token]);

  // Action: 1-click cross-hospital registration
  const handleRegisterHospital = async () => {
    if (!scanResult) return;
    setIsActionBusy(true);
    setActionError(null);
    try {
      const res = await patientsApi.registerHospital(scanResult.patient_identity.id);
      setActionMessage(res.message || "Successfully registered patient at this hospital facility.");
      const refreshed = await patientsApi.scanWorkflow(token);
      setScanResult(refreshed);
    } catch (err: any) {
      setActionError(err.message || "Failed to register patient at hospital.");
    } finally {
      setIsActionBusy(false);
    }
  };

  // Action: Check in appointment
  const handleCheckIn = async (appointmentId: string) => {
    setIsActionBusy(true);
    setActionError(null);
    try {
      const res = await patientsApi.checkInAppointment(appointmentId);
      setActionMessage(res.message || "Appointment successfully checked in.");
      const refreshed = await patientsApi.scanWorkflow(token);
      setScanResult(refreshed);
    } catch (err: any) {
      setActionError(err.message || "Failed to check in appointment.");
    } finally {
      setIsActionBusy(false);
    }
  };

  // Action: Issue OPD walk-in queue token
  const handleIssueToken = async () => {
    if (!scanResult) return;
    setIsActionBusy(true);
    setActionError(null);
    try {
      const res = await patientsApi.issueToken({
        patient_id: scanResult.patient_identity.id,
        department_name: "General Medicine",
        priority: "NORMAL",
        chief_complaint: "OPD Check-in via OneHealth QR Scan",
      });
      setActionMessage(res.message || "OPD Queue Token issued.");
      const refreshed = await patientsApi.scanWorkflow(token);
      setScanResult(refreshed);
    } catch (err: any) {
      setActionError(err.message || "Failed to issue queue token.");
    } finally {
      setIsActionBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Navbar */}
      <div className="max-w-2xl mx-auto w-full flex items-center justify-between pb-4 border-b border-slate-200">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>
        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          <ShieldCheck className="w-4 h-4" />
          <span>OneHealth ID Network</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto w-full my-auto py-8">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-xl">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Resolving Citizen Healthcare Identity...</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Querying OneHealth network registry with zero-knowledge cryptographic token.
            </p>
          </div>
        ) : error ? (
          <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Identity Verification Failed</h3>
            <p className="text-xs text-rose-700 max-w-sm mx-auto">{error}</p>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={() => router.push("/scan")}>
                Try Scanning Again
              </Button>
            </div>
          </div>
        ) : scanResult ? (
          <div className="space-y-5">
            {actionError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
            {actionMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionMessage}</span>
              </div>
            )}

            {/* IDENTITY CARD */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white shadow-2xl border border-white/10 relative overflow-hidden">
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-400/30">
                      {scanResult.role} SCAN VIEW
                    </span>
                    {scanResult.hospital_context.is_registered_at_active_hospital ? (
                      <span className="text-[10px] uppercase font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Registered at Facility
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                        External Hospital Patient
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    {scanResult.patient_identity.name}
                  </h2>
                  <p className="text-xs text-blue-200 font-mono mt-1">
                    {scanResult.patient_identity.onehealth_id}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Blood Group</span>
                  <span className="text-lg font-bold text-rose-300">
                    {scanResult.patient_identity.blood_group || "O+"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-white/10 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Age & Gender</span>
                  <span className="font-semibold text-white">
                    {scanResult.patient_identity.age} yrs • {scanResult.patient_identity.gender}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Phone</span>
                  <span className="font-semibold text-white">
                    {scanResult.patient_identity.phone || scanResult.patient_identity.phone_masked}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Home Hospital</span>
                  <span className="font-semibold text-white truncate block">
                    {scanResult.patient_identity.primary_hospital_name || "Apollo Central"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Local UHID</span>
                  <span className="font-semibold text-blue-200 truncate block">
                    {scanResult.hospital_context.local_uhid || "Not assigned"}
                  </span>
                </div>
              </div>
            </div>

            {/* RESTRICTED NOTICE IF APPLICABLE */}
            {scanResult.workflow_data.cross_hospital_sharing_blocked && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <span className="font-bold block text-sm text-amber-950">
                    Cross-Hospital Clinical Records Restricted
                  </span>
                  <p>{scanResult.workflow_data.sharing_block_reason}</p>
                </div>
              </div>
            )}

            {/* RECEPTIONIST WORKFLOW CARD */}
            {scanResult.role === "RECEPTIONIST" && (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
                {!scanResult.hospital_context.is_registered_at_active_hospital && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-blue-950">
                        Register at {scanResult.hospital_context.active_hospital_name}
                      </h4>
                      <p className="text-xs text-blue-700">
                        Links patient to this hospital facility without creating duplicate records.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleRegisterHospital}
                      disabled={isActionBusy}
                    >
                      {isActionBusy ? "Registering..." : "1-Click Register"}
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" /> Today&apos;s Appointments
                  </h4>
                  {scanResult.workflow_data.today_appointments &&
                  scanResult.workflow_data.today_appointments.length > 0 ? (
                    <div className="space-y-2">
                      {scanResult.workflow_data.today_appointments.map((appt: any) => (
                        <div
                          key={appt.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block">{appt.doctor_name}</span>
                            <span className="text-slate-500">
                              Slot: {appt.appointment_time || appt.slot} • Status: {appt.status}
                            </span>
                          </div>
                          {appt.status !== "checked_in" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCheckIn(appt.id)}
                              disabled={isActionBusy}
                            >
                              Check In
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-slate-500 py-2">
                      <span>No scheduled appointments found for today.</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleIssueToken}
                        disabled={isActionBusy}
                      >
                        Issue Walk-in OPD Token
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DOCTOR WORKFLOW CARD */}
            {scanResult.role === "DOCTOR" && (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-blue-600" /> Clinical Workspace
                  </h4>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => router.push(`/doctor/consultations?patientId=${scanResult.patient_identity.id}`)}
                  >
                    Open Consultation Workspace <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                {scanResult.workflow_data.clinical_summary && (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Allergies</span>
                      <span className="font-semibold text-slate-800">
                        {scanResult.workflow_data.clinical_summary.allergies?.join(", ") || "No allergies"}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Diagnosis</span>
                      <span className="font-semibold text-slate-800">
                        {scanResult.workflow_data.clinical_summary.diagnosis || "None recorded"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ANONYMOUS WORKFLOW CARD */}
            {scanResult.role === "ANONYMOUS" && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-4 shadow-sm">
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  This patient is actively registered on the OneHealth Network. Staff members must sign in to view clinical consultations, issue prescriptions, or check in appointments.
                </p>
                <Button
                  variant="primary"
                  size="md"
                  className="rounded-xl px-6"
                  onClick={() => router.push("/login")}
                >
                  Staff Sign In
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="max-w-2xl mx-auto w-full text-center text-xs text-slate-400 pt-6">
        OneHealth ID (OH-ID) • Interoperable Citizen Health Network
      </div>
    </div>
  );
}
