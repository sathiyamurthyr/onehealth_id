"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Upload,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  User,
  Stethoscope,
  ArrowRight,
  RefreshCw,
  FileText,
  Lock,
  Phone,
  Sparkles,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { patientsApi } from "@/lib/api/patients";
import { QRWorkflowScanResult } from "@/lib/types";
import { Badge, Button } from "@/components/ui/Card";

interface OneHealthQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeHospitalId?: string;
  onSuccess?: (result: QRWorkflowScanResult) => void;
}

type ScanTab = "camera" | "upload" | "manual";

export const OneHealthQRScannerModal: React.FC<OneHealthQRScannerModalProps> = ({
  isOpen,
  onClose,
  activeHospitalId,
  onSuccess,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ScanTab>("camera");
  const [manualInput, setManualInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<QRWorkflowScanResult | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionBusy, setIsActionBusy] = useState(false);

  const scannerRef = useRef<any>(null);
  const isScanningRef = useRef(false);

  // Initialize and tear down camera scanner
  useEffect(() => {
    let html5QrCode: any = null;

    if (isOpen && activeTab === "camera" && !scanResult) {
      setCameraError(null);

      // Dynamically import html5-qrcode to prevent SSR issues
      import("html5-qrcode")
        .then(({ Html5Qrcode }) => {
          const qrRegionId = "oh-qr-video-region";
          const element = document.getElementById(qrRegionId);
          if (!element) return;

          html5QrCode = new Html5Qrcode(qrRegionId);
          scannerRef.current = html5QrCode;

          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          };

          html5QrCode
            .start(
              { facingMode: "environment" },
              config,
              (decodedText: string) => {
                if (!isScanningRef.current) {
                  isScanningRef.current = true;
                  handleResolveQR(decodedText);
                  try {
                    html5QrCode.stop().catch(() => {});
                  } catch (e) {}
                }
              },
              () => {
                // scanning frame error (ignore continuous scan ticks)
              }
            )
            .catch((err: any) => {
              console.warn("Camera init failed:", err);
              setCameraError(
                "Camera access denied or unavailable. Please grant permission or switch to File Upload / Manual Lookup."
              );
            });
        })
        .catch(() => {
          setCameraError("Failed to initialize camera scanning library.");
        });
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
          scannerRef.current.clear();
        } catch (e) {}
        scannerRef.current = null;
      }
      isScanningRef.current = false;
    };
  }, [isOpen, activeTab, scanResult]);

  // Handle resolving token via API
  const handleResolveQR = async (rawInput: string) => {
    const cleaned = rawInput.trim();
    if (!cleaned || isProcessing) return;

    setIsProcessing(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await patientsApi.scanWorkflow(cleaned, activeHospitalId);
      setScanResult(response);
      if (onSuccess) onSuccess(response);
    } catch (err: any) {
      console.error("QR resolution error:", err);
      setActionError(err.message || "Invalid or unverified OneHealth QR code.");
    } finally {
      setIsProcessing(false);
      isScanningRef.current = false;
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setActionError(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const html5QrCode = new Html5Qrcode("oh-qr-file-region");
      const decodedText = await html5QrCode.scanFile(file, true);
      await handleResolveQR(decodedText);
      html5QrCode.clear();
    } catch (err: any) {
      console.error("File QR scan error:", err);
      setActionError("Could not detect a valid QR code in the uploaded image.");
      setIsProcessing(false);
    }
  };

  // Action: 1-click cross-hospital registration
  const handleRegisterHospital = async () => {
    if (!scanResult) return;
    setIsActionBusy(true);
    setActionError(null);
    try {
      const res = await patientsApi.registerHospital(
        scanResult.patient_identity.id,
        activeHospitalId
      );
      setActionMessage(res.message || "Successfully registered patient at this facility.");
      // Refresh scan data
      const refreshed = await patientsApi.scanWorkflow(
        scanResult.patient_identity.qr_token,
        activeHospitalId
      );
      setScanResult(refreshed);
    } catch (err: any) {
      setActionError(err.message || "Failed to register patient at hospital.");
    } finally {
      setIsActionBusy(false);
    }
  };

  // Action: 1-click appointment check-in
  const handleCheckIn = async (appointmentId: string) => {
    setIsActionBusy(true);
    setActionError(null);
    try {
      const res = await patientsApi.checkInAppointment(appointmentId, activeHospitalId);
      setActionMessage(res.message || "Appointment successfully checked in.");
      // Refresh scan data
      if (scanResult) {
        const refreshed = await patientsApi.scanWorkflow(
          scanResult.patient_identity.qr_token,
          activeHospitalId
        );
        setScanResult(refreshed);
      }
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
        hospital_id: activeHospitalId,
        department_name: "General Medicine",
        priority: "NORMAL",
        chief_complaint: "OPD Check-in via OneHealth QR Scan",
      });
      setActionMessage(res.message || "OPD Queue Token issued.");
      // Refresh scan data
      const refreshed = await patientsApi.scanWorkflow(
        scanResult.patient_identity.qr_token,
        activeHospitalId
      );
      setScanResult(refreshed);
    } catch (err: any) {
      setActionError(err.message || "Failed to issue queue token.");
    } finally {
      setIsActionBusy(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setActionError(null);
    setActionMessage(null);
    setManualInput("");
    isScanningRef.current = false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                OneHealth QR Identity Scanner
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Universal Citizen QR Identity & Hospital Access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
            aria-label="Close scanner modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {actionError && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Scan Error</span>
                <span className="text-xs text-rose-700">{actionError}</span>
              </div>
            </div>
          )}

          {actionMessage && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-800 text-sm animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Workflow Success</span>
                <span className="text-xs text-emerald-700">{actionMessage}</span>
              </div>
            </div>
          )}

          {/* ACTIVE SCANNER VIEW */}
          {!scanResult ? (
            <div className="space-y-5">
              {/* Tabs */}
              <div className="flex p-1 bg-slate-100 rounded-2xl">
                <button
                  onClick={() => { setActiveTab("camera"); setActionError(null); }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "camera"
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Camera className="w-4 h-4" /> Camera Scan
                </button>
                <button
                  onClick={() => { setActiveTab("upload"); setActionError(null); }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "upload"
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Upload className="w-4 h-4" /> Upload QR Image
                </button>
                <button
                  onClick={() => { setActiveTab("manual"); setActionError(null); }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "manual"
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Search className="w-4 h-4" /> Manual Lookup
                </button>
              </div>

              {/* CAMERA TAB */}
              {activeTab === "camera" && (
                <div className="space-y-4">
                  {cameraError ? (
                    <div className="p-6 border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-3 bg-slate-50">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                        <Camera className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Camera Unavailable</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">{cameraError}</p>
                      <div className="pt-2 flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab("upload")}
                        >
                          <Upload className="w-3.5 h-3.5 mr-1" /> Use File Upload
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab("manual")}
                        >
                          <Search className="w-3.5 h-3.5 mr-1" /> Enter ID Manually
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-3xl overflow-hidden bg-slate-950 aspect-square max-h-[300px] mx-auto border-2 border-blue-500/30 flex items-center justify-center">
                      <div id="oh-qr-video-region" className="w-full h-full" />
                      {/* Scanning reticle overlay */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-blue-400 rounded-2xl relative animate-pulse">
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                        </div>
                      </div>
                      {isProcessing && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
                          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                          <span className="text-xs font-semibold">Resolving OneHealth Identity...</span>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-center text-xs text-slate-400">
                    Align the patient&apos;s physical card or mobile QR screen within the frame.
                  </p>
                </div>
              )}

              {/* UPLOAD TAB */}
              {activeTab === "upload" && (
                <div className="space-y-4">
                  <div id="oh-qr-file-region" className="hidden" />
                  <label className="border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/30 transition-all rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer group">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">
                      Upload QR Code Image
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Supports PNG, JPG, WEBP, or PDF scan
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isProcessing}
                    />
                  </label>
                  {isProcessing && (
                    <div className="text-center text-xs font-semibold text-blue-600 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Processing QR Image...
                    </div>
                  )}
                </div>
              )}

              {/* MANUAL TAB */}
              {activeTab === "manual" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleResolveQR(manualInput);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Enter OneHealth ID, QR Token, or Scan URL
                    </label>
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="e.g. OHID-IND-2026-01001 or qr-9b5182..."
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full justify-center"
                    disabled={isProcessing || !manualInput.trim()}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Resolving...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" /> Resolve Patient Identity
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          ) : (
            /* ROLE-TAILORED SCAN RESULT WORKFLOW SCREEN */
            <div className="space-y-5 animate-in fade-in">
              {/* Identity Header Card */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-lg border border-white/10 relative overflow-hidden">
                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-400/30">
                        {scanResult.role} SCAN VIEW
                      </span>
                      {scanResult.hospital_context.is_registered_at_active_hospital ? (
                        <span className="text-[10px] uppercase font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Registered Here
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                          External Network Patient
                        </span>
                      )}
                    </div>
                    <h4 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                      {scanResult.patient_identity.name}
                    </h4>
                    <p className="text-xs text-blue-200/80 font-mono mt-0.5">
                      {scanResult.patient_identity.onehealth_id}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Blood Group</span>
                    <span className="text-base font-bold text-rose-300">
                      {scanResult.patient_identity.blood_group || "O+"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Age / Gender</span>
                    <span className="font-semibold text-white">
                      {scanResult.patient_identity.age}y • {scanResult.patient_identity.gender}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Phone</span>
                    <span className="font-semibold text-white">
                      {scanResult.patient_identity.phone || scanResult.patient_identity.phone_masked}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Home Facility</span>
                    <span className="font-semibold text-white truncate block">
                      {scanResult.patient_identity.primary_hospital_name || "Primary"}
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

              {/* CROSS HOSPITAL SHARING BLOCKED NOTICE */}
              {scanResult.workflow_data.cross_hospital_sharing_blocked && (
                <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start gap-3">
                  <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 space-y-1">
                    <span className="font-bold block text-sm text-amber-950">
                      Cross-Hospital Clinical Records Restricted
                    </span>
                    <p>{scanResult.workflow_data.sharing_block_reason}</p>
                  </div>
                </div>
              )}

              {/* RECEPTIONIST ACTIONS & WORKFLOW */}
              {scanResult.role === "RECEPTIONIST" && (
                <div className="space-y-4">
                  {/* Registration Action if not registered at this facility */}
                  {!scanResult.hospital_context.is_registered_at_active_hospital && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3">
                      <div>
                        <h5 className="text-sm font-bold text-blue-950">
                          Register at {scanResult.hospital_context.active_hospital_name}
                        </h5>
                        <p className="text-xs text-blue-700">
                          Assigns a hospital UHID under the same universal OH-ID identity.
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

                  {/* Today's Appointments */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-white">
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" /> Today&apos;s Appointments
                    </h5>
                    {scanResult.workflow_data.today_appointments &&
                    scanResult.workflow_data.today_appointments.length > 0 ? (
                      <div className="space-y-2">
                        {scanResult.workflow_data.today_appointments.map((appt: any) => (
                          <div
                            key={appt.id}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-900 block">
                                {appt.doctor_name || "Doctor Consultation"}
                              </span>
                              <span className="text-slate-500">
                                Slot: {appt.appointment_time || appt.slot || "Today"} • Status:{" "}
                                <strong className="text-slate-700">{appt.status}</strong>
                              </span>
                            </div>
                            {appt.status !== "checked_in" && appt.status !== "completed" && (
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
                      <div className="flex items-center justify-between text-xs text-slate-500 py-1">
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

                  {/* Active Queue Entry */}
                  {scanResult.workflow_data.active_queue_entry && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
                      <div>
                        <span className="font-bold block">
                          OPD Token #{scanResult.workflow_data.active_queue_entry.token_number} Active
                        </span>
                        <span>
                          Status: {scanResult.workflow_data.active_queue_entry.status} • Wait Time: ~
                          {scanResult.workflow_data.active_queue_entry.estimated_wait_time || 15}m
                        </span>
                      </div>
                      <Badge variant="success">Waiting</Badge>
                    </div>
                  )}
                </div>
              )}

              {/* DOCTOR CLINICAL WORKSPACE VIEW */}
              {scanResult.role === "DOCTOR" && (
                <div className="space-y-4">
                  {scanResult.workflow_data.clinical_summary && (
                    <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Stethoscope className="w-4 h-4 text-blue-600" /> Authorized Clinical Summary
                        </h5>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            onClose();
                            router.push(`/doctor/consultations?patientId=${scanResult.patient_identity.id}`);
                          }}
                        >
                          Open Clinical Workspace <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">
                            Allergies
                          </span>
                          <span className="font-semibold text-slate-800">
                            {scanResult.workflow_data.clinical_summary.allergies?.join(", ") ||
                              "No known allergies"}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">
                            Current Diagnosis
                          </span>
                          <span className="font-semibold text-slate-800">
                            {scanResult.workflow_data.clinical_summary.diagnosis ||
                              "None recorded at this facility"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ANONYMOUS / KIOSK VIEW */}
              {scanResult.role === "ANONYMOUS" && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
                  <p className="text-xs text-slate-600">
                    Patient identity verified on the OneHealth Network. Sign in with staff credentials
                    to access clinical charts, registration, and prescriptions.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onClose();
                      router.push("/login");
                    }}
                  >
                    Staff Sign In
                  </Button>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={resetScanner}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Scan Another Patient
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClose();
                    router.push(`/patients/${scanResult.patient_identity.id}`);
                  }}
                >
                  Full Profile Details <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
