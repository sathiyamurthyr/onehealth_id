"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Building2,
  Share2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Calendar,
  Activity,
  Download,
  Info,
  BadgeAlert
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { phase4Api } from "@/lib/api/phase4";
import { ExternalHealthRecord } from "@/lib/types";

export default function PatientExternalRecordsPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ExternalHealthRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [selectedRecord, setSelectedRecord] = useState<ExternalHealthRecord | null>(null);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await phase4Api.getPatientExternalRecords();
      setRecords(data);
    } catch (err) {
      console.error("Failed to load external records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.external_organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.clinical_summary || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.record_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "ALL" || r.record_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <WorkspaceLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-900/40 via-cyan-900/30 to-slate-900/60 p-6 rounded-2xl border border-teal-500/20 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Layers className="w-3.5 h-3.5" />
                Cross-Provider Interoperability
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                FHIR R4 / ABDM Validated
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              External & Multi-Provider Health Records
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Clinical records, prescriptions, and laboratory reports securely imported from participating hospitals, diagnostic networks, and ABDM health information providers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadRecords}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-400" : ""}`} />
              Refresh Records
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by hospital, diagnosis, or test..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/90 border border-slate-700/60 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {["ALL", "CONSULTATION", "PRESCRIPTION", "LAB_REPORT", "RADIOLOGY_REPORT", "DISCHARGE_SUMMARY"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  filterType === t
                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                    : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                {t === "ALL" ? "All External Records" : t.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Records List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-400 mx-auto mb-3" />
            <p>Loading multi-provider health records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
            <Layers className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No External Records Found</h3>
            <p className="text-xs text-slate-500 mt-1">No clinical records from external network providers match your filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">{record.external_organization_name}</h3>
                        <p className="text-xs text-slate-400">{record.external_facility_name || "Main Campus"}</p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30 shrink-0">
                      External Record
                    </span>
                  </div>

                  {/* Summary & Details */}
                  <div className="mt-4 p-3.5 rounded-xl bg-slate-800/50 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between text-slate-400 mb-1.5">
                      <span className="font-semibold text-teal-300">{record.record_type.replace(/_/g, " ")}</span>
                      <span>{new Date(record.record_date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-300 line-clamp-2">
                      {record.clinical_summary || "External structured clinical artifact imported into OneHealth timeline."}
                    </p>
                  </div>

                  {/* Provenance Box */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 block">External Record ID</span>
                      <span className="font-mono text-slate-300 block truncate">{record.external_record_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Source System</span>
                      <span className="text-slate-300 block">{record.external_source_system}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Validation Status</span>
                      <span className="text-emerald-400 font-medium block flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {record.validation_status}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Imported At</span>
                      <span className="text-slate-300 block">{new Date(record.imported_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedRecord(record)}
                    className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
                  >
                    <Info className="w-3.5 h-3.5" /> View FHIR Provenance
                  </button>
                  <span className="text-[11px] text-slate-500 font-mono">
                    OH-ID Linked
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Provenance Modal */}
        {selectedRecord && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-400" />
                  <h3 className="text-lg font-bold text-white">Clinical Data Provenance & Traceability</h3>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                  <h4 className="font-semibold text-slate-200 mb-2">Source Attribution</h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div><span className="text-slate-500">Originating Org:</span> {selectedRecord.external_organization_name}</div>
                    <div><span className="text-slate-500">Originating System:</span> {selectedRecord.external_source_system}</div>
                    <div><span className="text-slate-500">External ID:</span> {selectedRecord.external_record_id}</div>
                    <div><span className="text-slate-500">Validation:</span> {selectedRecord.validation_status}</div>
                  </div>
                </div>

                {selectedRecord.raw_fhir_resource && (
                  <div>
                    <h4 className="font-semibold text-slate-200 mb-1.5">Raw FHIR R4 Resource</h4>
                    <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-60">
                      {JSON.stringify(selectedRecord.raw_fhir_resource, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
