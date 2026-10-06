"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Filter,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  FolderOpen,
  Plus,
  SlidersHorizontal,
  Calendar,
  Building2,
  User,
  LayoutGrid,
  ListTree,
  ChevronDown,
  X
} from "lucide-react";
import {
  MedicalDocument,
  MedicalDocumentDetail,
  DocumentCountsSummary,
  DOCUMENT_CATEGORIES,
  DocumentCategory,
  DocumentRequest,
  medicalDocumentsAPI
} from "@/lib/api/documents";
import { useFamily } from "@/lib/patient/FamilyContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { MedicalDocumentCard } from "@/components/documents/MedicalDocumentCard";
import { MedicalDocumentViewerModal } from "@/components/documents/MedicalDocumentViewerModal";
import { MedicalDocumentShareModal } from "@/components/documents/MedicalDocumentShareModal";
import { AddPersonalDocumentModal } from "@/components/documents/AddPersonalDocumentModal";
import { MedicalDocumentsTimelineView } from "@/components/documents/MedicalDocumentsTimelineView";

export default function PatientMedicalDocumentsPage() {
  const {
    activePerson,
    selectedPersonId,
    familyMembers,
    primaryProfile,
    switchPerson,
    canAccess
  } = useFamily();

  // Data state
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [selectedRequestForUpload, setSelectedRequestForUpload] = useState<DocumentRequest | null>(null);
  const [countsSummary, setCountsSummary] = useState<DocumentCountsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [viewerDoc, setViewerDoc] = useState<MedicalDocumentDetail | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [shareDoc, setShareDoc] = useState<MedicalDocument | null>(null);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>("ALL");
  const [selectedHospital, setSelectedHospital] = useState<string>("ALL");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("ALL_TIME");
  const [customFromDate, setCustomFromDate] = useState<string>("");
  const [customToDate, setCustomToDate] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedSort, setSelectedSort] = useState<"newest" | "oldest" | "hospital" | "title" | "category">("newest");
  const [viewMode, setViewMode] = useState<"cards" | "timeline">("cards");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  const hasPermission = canAccess("view_records");

  const loadDocuments = async () => {
    if (!hasPermission) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Compute date filters
      let fromDate = customFromDate || undefined;
      let toDate = customToDate || undefined;

      if (selectedDateRange === "TODAY") {
        const today = new Date().toISOString().split("T")[0];
        fromDate = today;
        toDate = today;
      } else if (selectedDateRange === "7_DAYS") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        fromDate = d.toISOString().split("T")[0];
      } else if (selectedDateRange === "30_DAYS") {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        fromDate = d.toISOString().split("T")[0];
      } else if (selectedDateRange === "6_MONTHS") {
        const d = new Date();
        d.setMonth(d.getMonth() - 6);
        fromDate = d.toISOString().split("T")[0];
      } else if (selectedDateRange === "1_YEAR") {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 1);
        fromDate = d.toISOString().split("T")[0];
      }

      const [docsRes, countsRes, reqsRes] = await Promise.all([
        medicalDocumentsAPI.listDocuments({
          patient_id: selectedPersonId || undefined,
          hospital_id: selectedHospital !== "ALL" ? selectedHospital : undefined,
          category: selectedCategory !== "ALL" ? selectedCategory : undefined,
          doctor_id: selectedDoctor !== "ALL" ? selectedDoctor : undefined,
          department: selectedDepartment !== "ALL" ? selectedDepartment : undefined,
          status: selectedStatus !== "ALL" ? selectedStatus : undefined,
          from_date: fromDate,
          to_date: toDate,
          search: searchQuery.trim() || undefined,
          sort_by: selectedSort
        }),
        medicalDocumentsAPI.getDocumentCounts(selectedPersonId || undefined),
        medicalDocumentsAPI.listDocumentRequests(selectedPersonId || undefined).catch(() => ({ data: [] }))
      ]);

      setDocuments(docsRes.data || []);
      setCountsSummary(countsRes.data || null);
      setDocumentRequests(reqsRes.data || []);
    } catch (err: any) {
      console.error("Failed to load medical documents:", err);
      setError(err?.message || "Failed to load medical documents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [
    selectedPersonId,
    hasPermission,
    selectedCategory,
    selectedHospital,
    selectedDateRange,
    customFromDate,
    customToDate,
    selectedDoctor,
    selectedDepartment,
    selectedStatus,
    selectedSort,
    searchQuery
  ]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDocuments();
  };

  const handleOpenViewer = async (doc: MedicalDocument) => {
    try {
      const res = await medicalDocumentsAPI.getDocumentDetail(
        doc.id,
        selectedPersonId || undefined
      );
      setViewerDoc(res.data);
      setIsViewerOpen(true);
    } catch (err: any) {
      alert("Failed to load document details: " + (err?.message || "Unknown error"));
    }
  };

  const handleOpenShare = (doc: MedicalDocument) => {
    setShareDoc(doc);
    setIsShareOpen(true);
  };

  // Extract distinct doctors and departments from current document set for advanced filter dropdowns
  const availableDoctors = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    documents.forEach((d) => {
      if (d.doctor_id && d.doctor_name) {
        map.set(d.doctor_id, { id: d.doctor_id, name: d.doctor_name });
      }
    });
    return Array.from(map.values());
  }, [documents]);

  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.department) set.add(d.department);
    });
    return Array.from(set);
  }, [documents]);

  const activeHospitalSummary = useMemo(() => {
    if (!countsSummary?.hospitals) return [];
    return countsSummary.hospitals;
  }, [countsSummary]);

  const totalDocCount = countsSummary?.total_documents || documents.length;
  const connectedHospitalsCount = countsSummary?.connected_hospitals_count || activeHospitalSummary.length;

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <Link
            href="/patient"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>My Health</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>OneHealth ID Personal Document Vault</span>
          </div>
        </div>

        {/* Family Member Active Banner */}
        {activePerson && !activePerson.isSelf && (
          <div
            data-testid="family-member-banner"
            className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center justify-between flex-wrap gap-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-base shadow">
                {activePerson.relationship === "Son"
                  ? "👦"
                  : activePerson.relationship === "Daughter"
                  ? "👧"
                  : activePerson.relationship === "Mother" || activePerson.relationship === "Wife"
                  ? "👩"
                  : "👤"}
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                  Viewing documents for:
                </p>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {activePerson.relationship ? `${activePerson.relationship} • ` : ""}
                  {activePerson.name}
                  <span className="font-mono text-xs font-normal text-slate-500 dark:text-slate-400 ml-2">
                    {activePerson.onehealth_id}
                  </span>
                </h3>
              </div>
            </div>

            <button
              onClick={() => switchPerson(null)}
              className="text-xs font-semibold px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-700 transition-colors shadow-sm"
            >
              Switch back to Myself
            </button>
          </div>
        )}

        {/* PAGE HEADER: Title, Scope, Summary Badge & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                My Medical Documents
              </h1>
              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-full border border-blue-200 dark:border-blue-800">
                {totalDocCount} {totalDocCount === 1 ? "Document" : "Documents"} • {connectedHospitalsCount} {connectedHospitalsCount === 1 ? "Provider" : "Healthcare Providers"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              All your authorized healthcare documents in one place — across participating hospitals, diagnostics labs, and clinics.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setSelectedRequestForUpload(null);
                setIsAddOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Personal Document</span>
            </button>

            <button
              onClick={loadDocuments}
              className="p-2.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Refresh Documents"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PENDING DOCTOR REQUESTS BANNER (Requirement 2 & 11) */}
        {documentRequests.filter(r => r.status === "PENDING").length > 0 && (
          <div className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-white/20 backdrop-blur-xs">
                  <AlertCircle className="w-5 h-5 text-amber-300 animate-bounce" />
                </span>
                <h3 className="text-sm font-bold tracking-tight">
                  Doctor Document Requests Awaiting Your Upload ({documentRequests.filter(r => r.status === "PENDING").length})
                </h3>
              </div>
              <span className="text-[11px] font-semibold bg-white/20 px-2.5 py-0.5 rounded-full">
                Clinical Requirement
              </span>
            </div>

            <div className="space-y-2.5">
              {documentRequests
                .filter(r => r.status === "PENDING")
                .map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{req.title}</span>
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-amber-400 text-amber-950">
                          {req.urgency}
                        </span>
                      </div>
                      <p className="text-indigo-100 text-xs mt-0.5">
                        Requested by <strong className="text-white">{req.doctor_name || "Doctor"}</strong> ({req.doctor_specialty || "Clinician"}, {req.hospital_name || "Hospital"})
                      </p>
                      {req.instructions && (
                        <p className="text-white/80 text-[11px] mt-1 bg-black/20 p-2 rounded-lg font-mono">
                          Instructions: &quot;{req.instructions}&quot;
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedRequestForUpload(req);
                        setIsAddOpen(true);
                      }}
                      className="px-4 py-2 bg-white hover:bg-indigo-50 text-indigo-900 font-bold rounded-xl text-xs shadow-xs transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Upload Requested File</span>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* PROVENANCE NOTICE: Uploaded ≠ Verified ≠ Official Clinical Record */}
        <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <strong>OneHealth ID Trust Policy:</strong> Documents uploaded directly by you are marked as <span className="font-semibold underline">Uploaded by You</span> until clinically reviewed by a consulting physician or certified by an authorized healthcare provider.
            </span>
          </div>
        </div>

        {/* SEARCH, PATIENT SWITCHER & PRIMARY FILTERS BAR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search documents, doctor, hospital, visit ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </form>

            {/* Patient Switcher Dropdown */}
            <div className="md:col-span-3">
              <label className="sr-only">Patient</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <select
                  aria-label="Select Patient"
                  value={selectedPersonId || "self"}
                  onChange={(e) => switchPerson(e.target.value === "self" ? null : e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium appearance-none"
                >
                  <option value="self">
                    👤 Patient: Myself ({primaryProfile?.name || "Alice Smith"})
                  </option>
                  {familyMembers.map((m, idx) => (
                    <option key={m.member_patient_id || m.id || idx} value={m.member_patient_id}>
                      {m.relationship === "Son"
                        ? "👦"
                        : m.relationship === "Daughter"
                        ? "👧"
                        : "👩"}{" "}
                      {m.relationship}: {m.member_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Hospital Provider Filter Dropdown */}
            <div className="md:col-span-4">
              <label className="sr-only">Hospital</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <select
                  aria-label="Filter by Hospital"
                  value={selectedHospital}
                  onChange={(e) => setSelectedHospital(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium appearance-none"
                >
                  <option value="ALL">Hospital: All Hospitals</option>
                  {activeHospitalSummary.map((h, idx) => (
                    <option key={h.hospital_id || idx} value={h.hospital_id}>
                      {h.hospital_name || (h as any).name || "Hospital"} ({h.doc_count ?? 0})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* SECONDARY ROW: Category Chips */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Document Categories
              </span>

              {/* View mode toggle (Cards vs Timeline) & Advanced Filters toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    showAdvancedFilters
                      ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filters</span>
                </button>

                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode("cards")}
                    aria-label="Cards View"
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      viewMode === "cards"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>
                  <button
                    onClick={() => setViewMode("timeline")}
                    aria-label="Timeline View"
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      viewMode === "timeline"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <ListTree className="w-3.5 h-3.5" />
                    <span>Timeline</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Category Chips Scroller */}
            <div className="flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
              {DOCUMENT_CATEGORIES.map((cat) => {
                const count =
                  cat.key === "ALL"
                    ? countsSummary?.total_documents || documents.length
                    : countsSummary?.categories?.[cat.key] || 0;

                const isSelected = selectedCategory === cat.key;

                return (
                  <button
                    key={cat.key}
                    data-testid={`category-chip-${cat.key}`}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap font-semibold transition-all shrink-0 ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ADVANCED EXPANDABLE FILTERS SECTION */}
          {showAdvancedFilters && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-xl">
              {/* Date Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Date Range
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <select
                    value={selectedDateRange}
                    onChange={(e) => setSelectedDateRange(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="ALL_TIME">All Time</option>
                    <option value="TODAY">Today</option>
                    <option value="7_DAYS">Last 7 Days</option>
                    <option value="30_DAYS">Last 30 Days</option>
                    <option value="6_MONTHS">Last 6 Months</option>
                    <option value="1_YEAR">Last 1 Year</option>
                    <option value="CUSTOM">Custom Range</option>
                  </select>
                </div>
              </div>

              {/* Doctor Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Doctor
                </label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="ALL">All Doctors</option>
                  {availableDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="ALL">All Departments</option>
                  {availableDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Status & Sort
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-1/2 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs truncate"
                  >
                    <option value="ALL">All Status</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="FINAL">Final</option>
                    <option value="VALID">Valid</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>

                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value as any)}
                    className="w-1/2 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs truncate font-medium"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="hospital">By Hospital</option>
                    <option value="title">By Title</option>
                    <option value="category">By Category</option>
                  </select>
                </div>
              </div>

              {/* Custom Date Range Inputs if selected */}
              {selectedDateRange === "CUSTOM" && (
                <div className="col-span-full grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">From Date</label>
                    <input
                      type="date"
                      value={customFromDate}
                      onChange={(e) => setCustomFromDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">To Date</label>
                    <input
                      type="date"
                      value={customToDate}
                      onChange={(e) => setCustomToDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={loadDocuments} className="font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* DOCUMENTS LISTING / TIMELINE / EMPTY STATE */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-56 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : documents.length === 0 ? (
          /* Structured Healthcare Empty States */
          selectedHospital !== "ALL" ? (
            <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No documents from selected healthcare facility
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                  You do not have any records stored from this provider under the selected filters.
                </p>
              </div>
              <button
                onClick={() => setSelectedHospital("ALL")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition"
              >
                View All Hospitals
              </button>
            </div>
          ) : (
            <div className="p-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <FolderOpen className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  No medical documents yet
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                  Your prescriptions, lab reports, discharge summaries and other healthcare documents will appear here when available from connected hospitals or uploaded by you.
                </p>
              </div>
              <button
                onClick={() => setIsAddOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow"
              >
                <Plus className="w-4 h-4" />
                Add Your First Personal Record
              </button>
            </div>
          )
        ) : viewMode === "timeline" ? (
          <MedicalDocumentsTimelineView
            documents={documents}
            onView={handleOpenViewer}
            onShare={handleOpenShare}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {documents.map((doc) => (
              <MedicalDocumentCard
                key={doc.id}
                document={doc}
                onView={handleOpenViewer}
                onShare={handleOpenShare}
              />
            ))}
          </div>
        )}

        {/* MODALS */}
        <MedicalDocumentViewerModal
          document={viewerDoc}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          onShare={(doc) => {
            setIsViewerOpen(false);
            setShareDoc(doc);
            setIsShareOpen(true);
          }}
        />

        <MedicalDocumentShareModal
          document={shareDoc}
          patientId={selectedPersonId || undefined}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
        />

        <AddPersonalDocumentModal
          patientId={selectedPersonId || undefined}
          isOpen={isAddOpen}
          initialRequest={selectedRequestForUpload}
          onClose={() => {
            setIsAddOpen(false);
            setSelectedRequestForUpload(null);
          }}
          onSuccess={() => {
            setSelectedRequestForUpload(null);
            loadDocuments();
          }}
        />
      </div>
    </WorkspaceLayout>
  );
}
