"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BedDouble,
  Building2,
  User,
  Calendar,
  Stethoscope,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Activity,
  PlusCircle,
  RefreshCw,
  Search,
  X,
  Layers,
  Sparkles,
  ArrowLeftRight,
  LogOut
} from "lucide-react";
import { ipdApi } from "@/lib/api/phase3";
import { Ward, Bed, InpatientAdmission } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState } from "@/components/ui/FeedbackStates";

export default function IPDPage() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [admissions, setAdmissions] = useState<InpatientAdmission[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Admission Modal State
  const [admissionModalOpen, setAdmissionModalOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [department, setDepartment] = useState("General Medicine");
  const [specialty, setSpecialty] = useState("Internal Medicine");
  const [admissionType, setAdmissionType] = useState<string>("ELECTIVE");
  const [reason, setReason] = useState("");
  const [submittingAdmission, setSubmittingAdmission] = useState(false);

  // Bed Allocation Modal State
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  const [allocAdmissionId, setAllocAdmissionId] = useState("");
  const [allocPatientId, setAllocPatientId] = useState("");
  const [allocReason, setAllocReason] = useState("Initial Ward Admission");
  const [submittingAllocation, setSubmittingAllocation] = useState(false);

  // Bed Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [destBedId, setDestBedId] = useState("");
  const [transferReason, setTransferReason] = useState("Clinical condition upgrade/downgrade");
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [wardsData, bedsData, admissionsData] = await Promise.all([
        ipdApi.listWards(),
        ipdApi.listBeds(),
        ipdApi.listAdmissions({ status: "ADMITTED" })
      ]);
      setWards(wardsData || []);
      setBeds(bedsData || []);
      setAdmissions(admissionsData || []);
    } catch (err: any) {
      setError(err.message || "Failed to load IPD wards and beds data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredBeds = beds.filter((b) => {
    const matchesWard = selectedWardId === "ALL" || b.ward_id === selectedWardId;
    const matchesSearch =
      (b.bed_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.patient_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.onehealth_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.ward_name || "").toLowerCase().includes(search.toLowerCase());
    return matchesWard && matchesSearch;
  });

  const totalBedsCount = beds.length;
  const occupiedCount = beds.filter((b) => b.is_occupied || b.status === "OCCUPIED").length;
  const availableCount = beds.filter((b) => b.status === "AVAILABLE" && !b.is_occupied).length;
  const occupancyPct = totalBedsCount > 0 ? Math.round((occupiedCount / totalBedsCount) * 100) : 0;

  const handleCreateAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !reason) {
      alert("Please provide patient ID and reason for admission");
      return;
    }
    setSubmittingAdmission(true);
    try {
      await ipdApi.createAdmission({
        patient_id: patientId,
        department: department,
        specialty: specialty,
        admission_type: admissionType,
        reason_for_admission: reason
      });
      setAdmissionModalOpen(false);
      setPatientId("");
      setReason("");
      showToast("Inpatient admission created successfully");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create inpatient admission");
    } finally {
      setSubmittingAdmission(false);
    }
  };

  const handleAllocateBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBed || !allocAdmissionId || !allocPatientId) return;
    setSubmittingAllocation(true);
    try {
      await ipdApi.allocateBed(selectedBed.id, {
        admission_id: allocAdmissionId,
        patient_id: allocPatientId,
        reason: allocReason
      });
      setAllocationModalOpen(false);
      showToast(`Bed ${selectedBed.bed_number} allocated (Occupancy locked)`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to allocate bed (Double-allocation prevented)");
    } finally {
      setSubmittingAllocation(false);
    }
  };

  const handleTransferBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBed || !destBedId) return;
    setSubmittingTransfer(true);
    try {
      await ipdApi.transferBed(selectedBed.id, {
        destination_bed_id: destBedId,
        admission_id: selectedBed.current_admission_id || "",
        patient_id: selectedBed.current_patient_id || "",
        reason: transferReason
      });
      setTransferModalOpen(false);
      showToast("Bed transfer executed successfully");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to transfer bed");
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const handleReleaseBed = async (bed: Bed) => {
    if (!confirm(`Are you sure you want to release Bed ${bed.bed_number}?`)) return;
    try {
      await ipdApi.releaseBed(bed.id, "Direct Clinical Release");
      showToast(`Bed ${bed.bed_number} released and marked AVAILABLE`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to release bed");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 p-4 rounded-xl bg-emerald-500/90 border border-emerald-400 text-white shadow-2xl flex items-center gap-3 backdrop-blur-md">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
              <BedDouble className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Inpatient Wards & Bed Management
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
                  Phase 3 Real-Time IPD
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Transactional bed allocation, occupancy analytics, inter-ward transfers, and inpatient admissions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadData}
              className="gap-2 border-slate-700 bg-slate-800/60 hover:bg-slate-700/60 text-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setAdmissionModalOpen(true)}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20"
            >
              <PlusCircle className="h-4 w-4" />
              New Admission Request
            </Button>
          </div>
        </div>

        {/* Occupancy Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 shadow-sm backdrop-blur-md">
            <span className="text-xs text-slate-400 uppercase font-semibold block">Total Beds</span>
            <span className="text-2xl font-bold text-white mt-1 block">{totalBedsCount}</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Sanctioned hospital capacity</span>
          </div>

          <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 shadow-sm backdrop-blur-md">
            <span className="text-xs text-rose-400 uppercase font-semibold block">Occupied Beds</span>
            <span className="text-2xl font-bold text-rose-400 mt-1 block">{occupiedCount}</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Admitted inpatients</span>
          </div>

          <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 shadow-sm backdrop-blur-md">
            <span className="text-xs text-emerald-400 uppercase font-semibold block">Available Beds</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">{availableCount}</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Ready for admission</span>
          </div>

          <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 shadow-sm backdrop-blur-md">
            <span className="text-xs text-blue-400 uppercase font-semibold block">Occupancy Rate</span>
            <span className="text-2xl font-bold text-blue-400 mt-1 block">{occupancyPct}%</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Capacity utilization</span>
          </div>
        </div>

        {/* Wards Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedWardId("ALL")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedWardId === "ALL"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              All Wards ({beds.length})
            </button>
            {wards.map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedWardId(w.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedWardId === w.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
                }`}
              >
                {w.name}
              </button>
            ))}
          </div>

          <div className="relative min-w-[260px]">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Bed, Patient, OH-ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Beds Matrix Grid */}
        {loading ? (
          <LoadingState message="Fetching real-time bed occupancy..." />
        ) : filteredBeds.length === 0 ? (
          <EmptyState title="No Beds Found" description="No beds match your filter or search criteria." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBeds.map((bed) => {
              const isOccupied = bed.is_occupied || bed.status === "OCCUPIED";
              return (
                <div
                  key={bed.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isOccupied
                      ? "bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/20 border-rose-500/30 shadow-lg"
                      : "bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50"
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl ${isOccupied ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                          <BedDouble className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-base">Bed {bed.bed_number}</div>
                          <div className="text-xs text-slate-400">{bed.ward_name || "General Ward"}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isOccupied ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}>
                        {bed.status}
                      </span>
                    </div>

                    {/* Patient / Occupancy Details */}
                    {isOccupied ? (
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1.5 mb-4">
                        <div className="font-semibold text-white text-xs">{bed.patient_name || "Admitted Inpatient"}</div>
                        <div className="text-[11px] font-mono text-rose-400">{bed.onehealth_id || "OH-0000"}</div>
                        <div className="text-[11px] text-slate-400">Attending: {bed.admitting_doctor_name || "Dr. Attending"}</div>
                        {bed.admission_date && (
                          <div className="text-[10px] text-slate-500">Since: {new Date(bed.admission_date).toLocaleDateString()}</div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 mb-4 text-xs text-emerald-400/90 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                        <span>Ready for allocation & admission</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                    {isOccupied ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBed(bed);
                            setDestBedId("");
                            setTransferModalOpen(true);
                          }}
                          className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs gap-1 flex-1"
                        >
                          <ArrowLeftRight className="h-3.5 w-3.5" /> Transfer
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReleaseBed(bed)}
                          className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs gap-1 flex-1"
                        >
                          <LogOut className="h-3.5 w-3.5" /> Release
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedBed(bed);
                          setAllocAdmissionId("");
                          setAllocPatientId("");
                          setAllocationModalOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs w-full shadow-md shadow-emerald-500/20"
                      >
                        <PlusCircle className="h-3.5 w-3.5 mr-1" /> Allocate Bed
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Allocate Bed Modal */}
        {allocationModalOpen && selectedBed && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-emerald-400" />
                  Allocate Bed {selectedBed.bed_number}
                </h2>
                <button onClick={() => setAllocationModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAllocateBed} className="p-6 space-y-4 text-sm text-slate-200">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Select Active Admission <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    required
                    value={allocAdmissionId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAllocAdmissionId(val);
                      const matching = admissions.find((a) => a.id === val);
                      if (matching) setAllocPatientId(matching.patient_id);
                    }}
                    className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select an Inpatient Admission...</option>
                    {admissions.map((adm) => (
                      <option key={adm.id} value={adm.id}>
                        {adm.patient_name} ({adm.onehealth_id}) - Dx: {adm.reason_for_admission}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Allocation Reason / Admission Note
                  </label>
                  <input
                    type="text"
                    value={allocReason}
                    onChange={(e) => setAllocReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setAllocationModalOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingAllocation} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                    {submittingAllocation ? "Allocating..." : "Confirm Bed Allocation"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transfer Bed Modal */}
        {transferModalOpen && selectedBed && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5 text-blue-400" />
                  Transfer Patient from Bed {selectedBed.bed_number}
                </h2>
                <button onClick={() => setTransferModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleTransferBed} className="p-6 space-y-4 text-sm text-slate-200">
                <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 text-xs">
                  <div>Patient: <strong className="text-white">{selectedBed.patient_name}</strong></div>
                  <div>Current Bed: <strong className="text-blue-300">{selectedBed.ward_name} - Bed {selectedBed.bed_number}</strong></div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Destination Available Bed <span className="text-blue-400">*</span>
                  </label>
                  <select
                    required
                    value={destBedId}
                    onChange={(e) => setDestBedId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Destination Bed...</option>
                    {beds
                      .filter((b) => !b.is_occupied && b.status === "AVAILABLE" && b.id !== selectedBed.id)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.ward_name} - Bed {b.bed_number} ({b.bed_type})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Transfer Clinical Reason <span className="text-blue-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setTransferModalOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingTransfer} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                    {submittingTransfer ? "Transferring..." : "Execute Bed Transfer"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* New Admission Modal */}
        {admissionModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-400" />
                  Inpatient Admission Request
                </h2>
                <button onClick={() => setAdmissionModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAdmission} className="p-6 space-y-4 text-sm text-slate-200">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Patient ID or OH-ID <span className="text-blue-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. pt-01 or OH-2026-XXXX"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="General Medicine">General Medicine</option>
                      <option value="General Surgery">General Surgery</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Pulmonology">Pulmonology</option>
                      <option value="Orthopedics">Orthopedics</option>
                      <option value="ICU">Critical Care / ICU</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Admission Type
                    </label>
                    <select
                      value={admissionType}
                      onChange={(e) => setAdmissionType(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="ELECTIVE">Elective Admission</option>
                      <option value="EMERGENCY">Emergency Admission</option>
                      <option value="TRANSFER">Inter-Hospital Transfer</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Reason for Admission / Provisional Diagnosis <span className="text-blue-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Severe acute exacerbation of COPD, IV antibiotic therapy, telemetry monitoring..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setAdmissionModalOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingAdmission} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                    {submittingAdmission ? "Submitting..." : "Admit Patient"}
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
