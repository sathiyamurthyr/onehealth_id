"use client";

import React, { useState, useEffect } from "react";
import {
  Share2,
  X,
  UserCheck,
  Building,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Search,
  Check,
  Calendar
} from "lucide-react";
import { DoctorReferralDirectoryItem, LongitudinalHistoryEvent } from "@/lib/types";
import { doctorWorkspaceApi } from "@/lib/api/doctor-workspace";

interface DoctorReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onehealthId: string;
  availableDocuments?: LongitudinalHistoryEvent[];
  onReferralCreated?: () => void;
}

const SPECIALTIES = [
  "Cardiology",
  "Orthopedics",
  "Neurology",
  "Dermatology",
  "ENT",
  "Ophthalmology",
  "Gastroenterology",
  "Urology",
  "Nephrology",
  "Endocrinology",
  "Psychiatry",
  "Pediatrics",
  "Rheumatology",
  "Pulmonology",
  "General Surgery",
];

export function DoctorReferralModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  onehealthId,
  availableDocuments = [],
  onReferralCreated,
}: DoctorReferralModalProps) {
  const [specialty, setSpecialty] = useState("Cardiology");
  const [directory, setDirectory] = useState<DoctorReferralDirectoryItem[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorReferralDirectoryItem | null>(null);

  const [reason, setReason] = useState("");
  const [clinicalSummary, setClinicalSummary] = useState("");
  const [specificQuestion, setSpecificQuestion] = useState("");
  const [priority, setPriority] = useState<"ROUTINE" | "URGENT">("ROUTINE");

  // Selective Document Sharing (Requirement 24)
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDirectory();
    }
  }, [isOpen, specialty]);

  const loadDirectory = async () => {
    setLoadingDoctors(true);
    try {
      const res = await doctorWorkspaceApi.listReferralDirectory(specialty);
      setDirectory(res.directory || []);
      if (res.directory && res.directory.length > 0) {
        setSelectedDoctor(res.directory[0]);
      } else {
        setSelectedDoctor(null);
      }
    } catch (err: any) {
      console.error("Failed to load doctor directory:", err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const toggleDocumentSharing = (docId: string) => {
    if (selectedDocIds.includes(docId)) {
      setSelectedDocIds(selectedDocIds.filter((id) => id !== docId));
    } else {
      setSelectedDocIds([...selectedDocIds, docId]);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setErrorMessage("Please enter a reason for referral");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      // Build selective attached reports
      const attachedReports = availableDocuments
        .filter((doc) => selectedDocIds.includes(doc.event_id))
        .map((doc) => ({
          id: doc.event_id,
          title: doc.title,
          category: doc.record_type,
          date: doc.date,
        }));

      await doctorWorkspaceApi.createReferral(patientId, {
        specialty,
        receiving_doctor_id: selectedDoctor?.id,
        receiving_doctor_name: selectedDoctor?.name,
        reason: reason.trim(),
        clinical_summary: clinicalSummary.trim() || undefined,
        requested_evaluation: specificQuestion.trim() || undefined,
        priority,
        referral_type: "INTERNAL",
        attached_reports: attachedReports,
      });

      if (onReferralCreated) {
        onReferralCreated();
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create referral");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Refer Patient to Specialist
              </h3>
              <p className="text-xs text-slate-500">
                {patientName} • OH-ID: <span className="font-mono font-semibold text-slate-700">{onehealthId}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            {errorMessage}
          </div>
        )}

        <div className="space-y-4 text-xs">
          {/* 1. Specialty & Urgency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                Specialty Required *
              </label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              >
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                Referral Urgency *
              </label>
              <div className="flex items-center gap-2">
                {(["ROUTINE", "URGENT"] as const).map((pri) => (
                  <button
                    key={pri}
                    type="button"
                    onClick={() => setPriority(pri)}
                    className={`flex-1 py-2 rounded-xl font-bold uppercase transition-all cursor-pointer ${
                      priority === pri
                        ? pri === "URGENT"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {pri}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Receiving Doctor Selection */}
          <div>
            <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
              Select Active Credentialed Specialist
            </label>
            {loadingDoctors ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-400">
                Finding available specialists...
              </div>
            ) : directory.length === 0 ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500">
                No active specialists currently registered under {specialty}. Referral will be dispatched to the department pool.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                {directory.map((doc) => {
                  const isSelected = selectedDoctor?.id === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedDoctor(doc)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {doc.name.charAt(3) || "D"}
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-slate-900 truncate">{doc.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {doc.qualification || doc.specialty} • {doc.hospital_name || "Healthcare Facility"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Reason for Referral */}
          <div>
            <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
              Reason for Referral *
            </label>
            <input
              type="text"
              placeholder="e.g. Further evaluation of refractory epigastric pain / cardiology workup"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          {/* 4. Clinical Summary & Specific Question */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                Clinical Summary
              </label>
              <textarea
                rows={2}
                placeholder="Key symptoms, vitals, provisional diagnosis..."
                value={clinicalSummary}
                onChange={(e) => setClinicalSummary(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                Specific Question for Specialist
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Please evaluate for 2D Echo or endoscopy clearance..."
                value={specificQuestion}
                onChange={(e) => setSpecificQuestion(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
          </div>

          {/* 5. Selective Document Sharing (Requirement 24) */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
                  Selected Relevant Documents to Share (Privacy Scoped)
                </span>
                <p className="text-[11px] text-slate-500">
                  Only selected records are shared with the receiving specialist. Entire history is never dumped.
                </p>
              </div>
              <span className="text-[11px] font-bold text-indigo-700">
                {selectedDocIds.length} attached
              </span>
            </div>

            {availableDocuments.length === 0 ? (
              <p className="text-slate-400 italic text-[11px]">No prior records available to attach.</p>
            ) : (
              <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                {availableDocuments.slice(0, 6).map((doc) => {
                  const isChecked = selectedDocIds.includes(doc.event_id);
                  return (
                    <label
                      key={doc.event_id}
                      className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 text-xs cursor-pointer select-none transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleDocumentSharing(doc.event_id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-slate-800 truncate">{doc.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                        {doc.formatted_date || doc.record_type}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !reason.trim()}
            onClick={handleSubmit}
            className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            {isSubmitting ? "Dispatching..." : "Send Specialist Referral"}
          </button>
        </div>
      </div>
    </div>
  );
}
