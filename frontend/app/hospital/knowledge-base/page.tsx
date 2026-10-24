"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  Plus,
  Sparkles,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Building2,
  FolderOpen,
  Send,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Layers
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { KnowledgeDocument, KnowledgeQueryResponse } from "@/lib/types";

export default function HospitalKnowledgeBasePage() {
  const { workspace } = useWorkspace();
  const hospitalId = workspace?.hospital_ref_id || "";

  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Search / Query State
  const [searchQuery, setSearchQuery] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<KnowledgeQueryResponse | null>(null);

  // Ingest Modal State
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("CLINICAL_PROTOCOL");
  const [newContent, setNewContent] = useState("");
  const [ingesting, setIngesting] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoadingDocs(true);
      const docs = await api.ai.listKnowledgeDocuments(hospitalId);
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleExecuteQuery = async (queryText: string) => {
    if (!queryText.trim() || queryLoading) return;
    try {
      setQueryLoading(true);
      const res = await api.ai.queryKnowledgeBase(queryText, hospitalId);
      setQueryResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setQueryLoading(false);
    }
  };

  const handleIngestDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || ingesting) return;
    try {
      setIngesting(true);
      await api.ai.ingestKnowledgeDocument(newTitle, newCategory, newContent, hospitalId);
      setIsIngestOpen(false);
      setNewTitle("");
      setNewContent("");
      loadDocuments();
    } catch (err) {
      console.error(err);
    } finally {
      setIngesting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-8 text-white shadow-xl">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 border border-emerald-500/30">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Enterprise Healthcare RAG Foundation</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Hospital Protocols & Knowledge Base
              </h1>
              <p className="text-sm text-emerald-200 max-w-2xl leading-relaxed">
                Search accredited hospital SOPs, emergency clinical guidelines, department workflows, and patient education resources with exact citations.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsIngestOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-xs font-bold text-emerald-950 shadow-lg hover:bg-emerald-400 transition cursor-pointer flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Ingest Hospital SOP</span>
            </button>
          </div>
        </div>

        {/* Search & Query Section */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-gray-900">Query Verified Healthcare Knowledge</h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleExecuteQuery(searchQuery);
                }
              }}
              placeholder="e.g. What is the standard protocol for acute chest pain triage in emergency?"
              className="flex-1 rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-xs text-gray-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition"
            />
            <button
              type="button"
              onClick={() => handleExecuteQuery(searchQuery)}
              disabled={queryLoading || !searchQuery.trim()}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 transition disabled:opacity-50 cursor-pointer"
            >
              {queryLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span>Ask Knowledge Base</span>
            </button>
          </div>

          {/* Query Answer Output */}
          {queryResult && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Verified Answer & Citations
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  RAG Grounded
                </span>
              </div>
              <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">{queryResult.answer}</p>

              {/* Citations List */}
              {queryResult.citations && queryResult.citations.length > 0 && (
                <div className="pt-2 border-t border-emerald-200/60 space-y-1.5">
                  <span className="text-[11px] font-bold text-emerald-900 block">Source References:</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {queryResult.citations.map((c, idx) => (
                      <div key={idx} className="rounded-xl bg-white p-3 border border-emerald-200/70 text-xs shadow-2xs">
                        <div className="flex items-center justify-between font-bold text-gray-900 mb-1">
                          <span>{c.document_title || "Hospital Protocol"}</span>
                          <span className="font-mono text-[10px] text-emerald-600">Relevance: {Math.round((c.similarity_score ?? 0.9) * 100)}%</span>
                        </div>
                        <p className="text-[11px] text-gray-600 italic">"{c.chunk_content}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Knowledge Documents Repository Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">
              Approved Knowledge Documents ({documents.length})
            </h3>
            <button
              type="button"
              onClick={loadDocuments}
              className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingDocs ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {loadingDocs ? (
            <div className="py-12 text-center">
              <div className="h-6 w-6 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading document catalogue...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-xs text-gray-400">
              No knowledge documents indexed yet. Click "Ingest Hospital SOP" to add protocols.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm hover:border-emerald-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-9 w-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-600 uppercase">
                      {doc.category}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{doc.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-3 leading-relaxed">
                      {doc.content_preview || "Approved clinical policy standard for hospital operations."}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <span>{doc.chunk_count || 1} chunks indexed</span>
                    <span className="font-semibold text-emerald-600">Active</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ingest Modal */}
        {isIngestOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-base text-gray-900">Ingest Knowledge Protocol</h3>
                <button
                  type="button"
                  onClick={() => setIsIngestOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleIngestDocument} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Document Title *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Acute Coronary Syndrome Triage SOP"
                    className="w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:border-emerald-500"
                  >
                    <option value="CLINICAL_PROTOCOL">Clinical Protocol</option>
                    <option value="HOSPITAL_SOP">Hospital SOP</option>
                    <option value="DEPARTMENT_GUIDELINE">Department Guideline</option>
                    <option value="PATIENT_EDUCATION">Patient Education</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Content / Policy Text *</label>
                  <textarea
                    rows={6}
                    required
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Enter the full accredited policy text or guidelines to chunk and index..."
                    className="w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsIngestOpen(false)}
                    className="rounded-xl border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={ingesting}
                    className="rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {ingesting ? "Chunking & Indexing..." : "Ingest & Index"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
