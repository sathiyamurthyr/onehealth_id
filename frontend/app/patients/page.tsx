"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  PlusCircle,
  QrCode,
  Phone,
  Calendar,
  Building2,
  ChevronRight,
  Filter,
  UserCheck,
  ShieldCheck,
  Activity,
  UploadCloud,
  FileText
} from "lucide-react";
import { api } from "@/lib/api";
import { Patient } from "@/lib/types";
import { DocumentOCRJob } from "@/lib/api/ocr";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/FeedbackStates";
import { DocumentUploadModal } from "@/components/documents/DocumentUploadModal";
import { DocumentExtractionReviewModal } from "@/components/documents/DocumentExtractionReviewModal";

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Document OCR Upload & Human Review Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeOCRJob, setActiveOCRJob] = useState<DocumentOCRJob | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const fetchPatients = async (query?: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.patients.list(query);
      setPatients(data);
      if (data.length > 0 && !selectedPatient) {
        setSelectedPatient(data[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load patient records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(search);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white  p-5 sm:p-6 rounded-3xl border border-slate-200  shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 ">
                Patient Management
              </h1>
              <Badge variant="primary" className="text-xs">
                OneHealth Registry
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Persistent OneHealth IDs & QR identity records across network hospitals
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsUploadModalOpen(true)}
              className="gap-2 text-xs font-semibold w-full sm:w-auto border-blue-200 hover:bg-blue-50 text-blue-700 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              <UploadCloud className="w-4 h-4 text-blue-500" />
              <span>Upload Document</span>
            </Button>
            <Link href="/patients/register">
              <Button variant="primary" size="md" className="gap-2 text-xs font-semibold w-full sm:w-auto">
                <PlusCircle className="w-4 h-4" />
                <span>Register New Patient</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white  p-4 rounded-2xl border border-slate-200  shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, OneHealth ID, diagnosis, or phone number..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50  border border-slate-200  rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="md" className="text-xs font-semibold flex-1 sm:flex-none">
                Search Registry
              </Button>
              {search && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setSearch("");
                    fetchPatients("");
                  }}
                  className="text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Content Area */}
        {loading ? (
          <LoadingState message="Fetching patients from oh_id.vw_patients view..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchPatients(search)} />
        ) : patients.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm space-y-5 animate-in fade-in">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
              <Search className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Can&apos;t find the patient or hospital?
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {search
                  ? `No registry matches found for "${search}". You can search again with different terms or upload supporting documents to extract identity and clinical records via OCR.`
                  : "No matching patients found in this hospital registry. You can search again or upload a supporting document to extract records."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setIsUploadModalOpen(true)}
                className="gap-2 font-bold text-xs"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Document</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => {
                  const input = document.querySelector('input[placeholder*="Search by name"]') as HTMLInputElement;
                  input?.focus();
                }}
                className="text-xs"
              >
                Search Again
              </Button>
              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setSearch("");
                    fetchPatients("");
                  }}
                  className="text-xs text-slate-500"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Patients List / Table (8 cols on Desktop, full width on Mobile) */}
            <div className="lg:col-span-8">
              {/* Desktop Data Table (>=1024px) */}
              <div className="hidden lg:block bg-white  rounded-3xl border border-slate-200  shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50  border-b border-slate-200  text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Patient Name</th>
                      <th className="py-3.5 px-4">OneHealth ID</th>
                      <th className="py-3.5 px-4">Demographics</th>
                      <th className="py-3.5 px-4">Diagnosis</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 ">
                    {patients.map((p) => {
                      const isSelected = selectedPatient?.id === p.id;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedPatient(p)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-50/60"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="py-4 px-4 font-semibold text-slate-900 ">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-100  text-blue-600 flex items-center justify-center font-bold text-xs">
                                {p.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold">{p.name}</div>
                                <div className="text-[11px] text-slate-400">{p.phone || "No phone"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono text-xs font-bold text-blue-600 ">
                            {p.onehealth_id || "OHID-PENDING"}
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-600 ">
                            {p.age} yrs • {p.gender || "Unspecified"}
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-700  max-w-[200px] truncate">
                            {p.diagnosis}
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant={p.status === "ACTIVE" ? "success" : "neutral"} className="text-[10px]">
                              {p.status || "ACTIVE"}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <Link href={`/patients/${p.id}`}>
                              <Button variant="outline" size="sm" className="text-xs">
                                View Profile
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Patient Cards (<1024px) */}
              <div className="lg:hidden space-y-3">
                {patients.map((p) => (
                  <Card key={p.id} className="p-4 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900  text-base">
                            {p.name}
                          </h3>
                          <span className="font-mono text-xs font-semibold text-blue-600  block">
                            {p.onehealth_id || "OHID-PENDING"}
                          </span>
                        </div>
                      </div>
                      <Badge variant="success" className="text-[10px]">
                        {p.status || "ACTIVE"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600  bg-slate-50  p-3 rounded-xl mb-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Age & Gender</span>
                        <span className="font-medium">{p.age} yrs • {p.gender || "Unspecified"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Blood Group</span>
                        <span className="font-medium text-rose-500">{p.blood_group || "O+"}</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-200/50 ">
                        <span className="text-[10px] text-slate-400 block uppercase">Diagnosis</span>
                        <span className="font-medium text-slate-800 ">{p.diagnosis}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {p.phone || "No phone"}
                      </span>
                      <Link href={`/patients/${p.id}`}>
                        <Button variant="primary" size="sm" className="text-xs gap-1 min-h-[44px] px-4">
                          <span>View Profile</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Desktop Side Inspector Panel (4 cols on Desktop) */}
            <div className="hidden lg:block lg:col-span-4 space-y-4">
              {selectedPatient ? (
                <Card className="sticky top-24 p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100  mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Quick Profile Preview</span>
                    <Badge variant="primary" className="text-[10px]">Verified ID</Badge>
                  </div>

                  <div className="text-center pb-4 mb-4 border-b border-slate-100 ">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md mb-2">
                      {selectedPatient.name.charAt(0)}
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 ">
                      {selectedPatient.name}
                    </h3>
                    <span className="font-mono text-xs font-bold text-blue-600 ">
                      {selectedPatient.onehealth_id}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Primary Diagnosis:</span>
                      <span className="font-semibold text-slate-800 ">
                        {selectedPatient.diagnosis}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Age & Blood Group:</span>
                      <span className="font-semibold text-slate-800 ">
                        {selectedPatient.age} Years • {selectedPatient.blood_group || "O+ Positive"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Emergency Contact:</span>
                      <span className="font-semibold text-slate-800 ">
                        {selectedPatient.emergency_contact || "+91 94440 12345"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Primary Hospital:</span>
                      <span className="font-semibold text-slate-800 ">
                        {selectedPatient.hospital_name || "City Healthcare Centre"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-5 mt-5 border-t border-slate-100 ">
                    <Link href={`/patients/${selectedPatient.id}`} className="w-full">
                      <Button variant="primary" size="md" className="w-full text-xs font-semibold">
                        Open Full Patient Profile & QR
                      </Button>
                    </Link>
                  </div>
                </Card>
              ) : (
                <div className="p-8 text-center bg-slate-50  rounded-3xl border border-dashed border-slate-200  text-xs text-slate-400">
                  Select a patient to preview quick details
                </div>
              )}
            </div>
          </div>
        )}

        {/* Document Upload Modal */}
        <DocumentUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadSuccess={(job) => {
            setActiveOCRJob(job);
            setIsReviewModalOpen(true);
          }}
        />

        {/* Human Review & Identity Verification Screen */}
        <DocumentExtractionReviewModal
          isOpen={isReviewModalOpen}
          job={activeOCRJob}
          onClose={() => setIsReviewModalOpen(false)}
          onConfirmed={(res) => {
            fetchPatients(search);
          }}
        />
      </div>
    </AppLayout>
  );
}
