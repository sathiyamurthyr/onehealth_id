"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  UploadCloud,
  Eye,
  Building2,
  User,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Tag
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import {
  MedicalDocument,
  MedicalDocumentDetail,
  DocumentCategory,
  DOCUMENT_CATEGORIES
} from "@/lib/api/documents";
import { doctorWorkspaceApi } from "@/lib/api/doctor-workspace";
import { MedicalDocumentCard } from "@/components/documents/MedicalDocumentCard";
import { MedicalDocumentViewerModal } from "@/components/documents/MedicalDocumentViewerModal";
import { DoctorReviewDocumentModal } from "@/components/documents/DoctorReviewDocumentModal";
import { DoctorRequestDocumentModal } from "@/components/documents/DoctorRequestDocumentModal";
import { DoctorUploadExternalDocumentModal } from "@/components/documents/DoctorUploadExternalDocumentModal";

type TriageTab = "ALL" | "AWAITING_REVIEW" | "PATIENT_UPLOADED" | "VERIFIED";

export default function DoctorDocumentInboxPage() {
  const { workspace, user } = useWorkspace();

  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [summary, setSummary] = useState({
    awaiting_review_count: 0,
    patient_uploaded_count: 0,
    verified_count: 0,
    total_inbox_count: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<TriageTab>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>("ALL");
  const [selectedSource, setSelectedSource] = useState<string>("ALL");

  // Modals state
  const [selectedViewerDoc, setSelectedViewerDoc] = useState<MedicalDocumentDetail | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [selectedReviewDoc, setSelectedReviewDoc] = useState<MedicalDocument | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);
  const [isUploadExtModalOpen, setIsUploadExtModalOpen] = useState<boolean>(false);

  // Selected Patient for direct request/upload actions
  const [activePatientId, setActivePatientId] = useState<string>("pat-alice-01");
  const [activePatientName, setActivePatientName] = useState<string>("Alice Smith");

  const loadInbox = async () => {
    try {
      setLoading(true);
      setError(null);
      let statusParam: string | undefined = undefined;
      let sourceParam: string | undefined = selectedSource !== "ALL" ? selectedSource : undefined;

      if (activeTab === "AWAITING_REVIEW") {
        statusParam = "UPLOADED";
      } else if (activeTab === "PATIENT_UPLOADED") {
        sourceParam = "PATIENT_UPLOADED";
      } else if (activeTab === "VERIFIED") {
        statusParam = "VERIFIED";
      }

      const res = await doctorWorkspaceApi.getDoctorDocumentInbox({
        status: statusParam,
        source_type: sourceParam,
        category: selectedCategory !== "ALL" ? selectedCategory : undefined,
        search: searchQuery || undefined
      });

      setDocuments(res.data || []);
      setSummary(res.summary || {
        awaiting_review_count: 0,
        patient_uploaded_count: 0,
        verified_count: 0,
        total_inbox_count: 0
      });
    } catch (err: any) {
      console.error("Failed to load doctor document inbox:", err);
      setError(err.message || "Failed to load document inbox records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, [activeTab, selectedCategory, selectedSource]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadInbox();
  };

  const handleOpenViewer = (doc: MedicalDocument) => {
    setSelectedViewerDoc(doc as MedicalDocumentDetail);
    setIsViewerOpen(true);
  };

  const handleOpenReview = (doc: MedicalDocument) => {
    setSelectedReviewDoc(doc);
    setIsReviewOpen(true);
  };

  const handleOpenPatientActions = (doc: MedicalDocument) => {
    if (doc.patient_id) {
      setActivePatientId(doc.patient_id);
      setActivePatientName(doc.patient_name || "Patient");
    }
  };

  return (
    <WorkspaceLayout
      allowedWorkspaceTypes={["DOCTOR", "HOSPITAL_ADMIN", "SUPER_ADMIN"]}
    >
      <div className="space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                <FileText className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Medical Records & Document Inbox
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Clinical triage queue for patient-uploaded documents, external hospital reports, and certified provider records.
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              Request from Patient
            </button>
            <button
              onClick={() => setIsUploadExtModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              + Upload External Record
            </button>
          </div>
        </div>

        {/* Triage Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              activeTab === "ALL"
                ? "bg-blue-50/80 dark:bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Inbox
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 font-mono">
              {summary.total_inbox_count}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">All clinical & patient files</p>
          </button>

          <button
            onClick={() => setActiveTab("AWAITING_REVIEW")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              activeTab === "AWAITING_REVIEW"
                ? "bg-rose-50/80 dark:bg-rose-950/50 border-rose-500 ring-2 ring-rose-500/20 shadow-sm"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Awaiting Review
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                Action Required
              </span>
            </div>
            <div className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1.5 font-mono">
              {summary.awaiting_review_count}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Uncertified patient submissions</p>
          </button>

          <button
            onClick={() => setActiveTab("PATIENT_UPLOADED")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              activeTab === "PATIENT_UPLOADED"
                ? "bg-amber-50/80 dark:bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/20 shadow-sm"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Patient Uploaded
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1.5 font-mono">
              {summary.patient_uploaded_count}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Vault history & prior reports</p>
          </button>

          <button
            onClick={() => setActiveTab("VERIFIED")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              activeTab === "VERIFIED"
                ? "bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Verified Records
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1.5 font-mono">
              {summary.verified_count}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Provider issued & certified</p>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, OH-ID, or doc title..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  loadInbox();
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </form>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
            >
              <option value="ALL">All Categories</option>
              {DOCUMENT_CATEGORIES.filter(c => c.key !== "ALL").map(cat => (
                <option key={cat.key} value={cat.key}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>

            {/* Source Filter */}
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
            >
              <option value="ALL">All Sources</option>
              <option value="PATIENT_UPLOADED">👤 Patient Uploaded</option>
              <option value="EXTERNAL_PROVIDER">🌐 External Provider</option>
              <option value="HOSPITAL">🏥 Hospital Issued</option>
              <option value="DOCTOR">🩺 Doctor Issued</option>
              <option value="LAB">🧪 Diagnostic Lab</option>
            </select>

            {/* Refresh */}
            <button
              onClick={loadInbox}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Refresh inbox"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Document Results List */}
        {loading ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Loading document inbox triage queue...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
            <p className="font-bold">Error loading documents</p>
            <p className="mt-1">{error}</p>
            <button
              onClick={loadInbox}
              className="mt-3 px-3.5 py-1.5 rounded-lg bg-rose-600 text-white font-bold"
            >
              Retry
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No documents found in this triage queue
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {activeTab === "AWAITING_REVIEW"
                ? "Great news! There are currently no unreviewed patient uploads waiting for your clinical clearance."
                : "Try selecting a different filter tab or clearing your search keywords."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <MedicalDocumentCard
                key={doc.id}
                document={doc}
                onView={handleOpenViewer}
                onReview={handleOpenReview}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        <MedicalDocumentViewerModal
          document={selectedViewerDoc}
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
            setSelectedViewerDoc(null);
          }}
          onShare={() => {}}
        />

        <DoctorReviewDocumentModal
          document={selectedReviewDoc}
          isOpen={isReviewOpen}
          onClose={() => {
            setIsReviewOpen(false);
            setSelectedReviewDoc(null);
          }}
          onReviewCompleted={loadInbox}
        />

        <DoctorRequestDocumentModal
          patientId={activePatientId}
          patientName={activePatientName}
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          onRequestCreated={loadInbox}
        />

        <DoctorUploadExternalDocumentModal
          patientId={activePatientId}
          patientName={activePatientName}
          isOpen={isUploadExtModalOpen}
          onClose={() => setIsUploadExtModalOpen(false)}
          onDocumentUploaded={loadInbox}
        />
      </div>
    </WorkspaceLayout>
  );
}
