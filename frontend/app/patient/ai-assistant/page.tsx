"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  ShieldCheck,
  Building2,
  Calendar,
  FileText,
  Activity,
  Pill,
  ArrowRight,
  Info,
  Clock,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { api } from "@/lib/api";
import { PatientJourneyExplainResponse } from "@/lib/types";

export default function PatientAIAssistantPage() {
  const [messages, setMessages] = useState<
    Array<{
      sender: "user" | "ai";
      text: string;
      data?: PatientJourneyExplainResponse;
      timestamp: string;
    }>
  >([
    {
      sender: "ai",
      text: "Hello! I am your OH-ID Health Assistant. I analyze your authorized hospital records to help you understand your health journey, prescriptions, lab reports, and doctor visits. What would you like to know about your medical history?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "What happened during my last hospital visit?",
    "Summarize my active medications & instructions",
    "Explain my latest lab reports",
    "Show my previous cardiology consultations",
    "Are there any pending follow-up appointments?"
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    const userMessage = {
      sender: "user" as const,
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery("");
    setLoading(true);

    try {
      const response = await api.ai.explainHealthTimeline(queryText);
      const aiMessage = {
        sender: "ai" as const,
        text: response.explanation || response.answer_markdown || "Record retrieved.",
        data: response,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage = {
        sender: "ai" as const,
        text: "I was unable to retrieve your records at this moment. Please verify your consent and network connection.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Top Header Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 p-8 text-white shadow-xl">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-indigo-100 backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Zero-Hallucination Grounded Intelligence</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Patient AI Health Assistant
              </h1>
              <p className="text-sm text-indigo-200 max-w-2xl leading-relaxed">
                Understand your consultations, lab results, and medications across all connected hospitals. Every insight is directly traceable to authorized medical records.
              </p>
            </div>
          </div>
        </div>

        {/* Safety & Compliance Notice */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 shadow-2xs">
          <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold">Informational Health Intelligence:</span> This AI assistant explains your documented hospital records. It does not replace direct physician advice, establish diagnoses, or prescribe treatments. For emergencies, contact your healthcare provider or emergency room immediately.
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Suggested Inquiries
          </span>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendQuery(prompt)}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-2xs hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat / Timeline Interaction Box */}
        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col h-[600px]">
          {/* Message Stream */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 max-w-3xl ${
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`h-9 w-9 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-sm ${
                    msg.sender === "user"
                      ? "bg-gradient-to-tr from-slate-700 to-slate-900"
                      : "bg-gradient-to-tr from-indigo-600 to-violet-600"
                  }`}
                >
                  {msg.sender === "user" ? (
                    <span className="text-xs font-bold">ME</span>
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </div>

                {/* Message Body */}
                <div className="space-y-2 max-w-2xl">
                  <div
                    className={`rounded-2xl p-4 text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-slate-900 text-white"
                        : "bg-white border border-gray-200 text-gray-800 shadow-2xs"
                    }`}
                  >
                    {msg.sender === "ai" && (
                      <div className="flex items-center gap-1.5 font-bold text-indigo-900 text-[11px] mb-2 pb-1.5 border-b border-indigo-50">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span>OH-ID Health Intelligence</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {/* Grounding Source Citations (Hospital -> Visit -> Record) */}
                  {msg.data?.citations && msg.data.citations.length > 0 && (
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-950 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                          Source Traceability ({msg.data.citations.length} Records)
                        </span>
                        <span className="text-[10px] font-mono text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                          Grounded
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {msg.data.citations.map((cit, cIdx) => (
                          <div
                            key={cIdx}
                            className="flex items-center justify-between rounded-xl bg-white border border-indigo-100/80 px-3 py-2 text-[11px] text-gray-700 shadow-2xs"
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                              <span className="font-bold text-gray-900">{cit.hospital_name || "Hospital"}</span>
                              <span className="text-gray-300">•</span>
                              <span className="font-medium text-gray-600">{cit.record_type}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {cit.date && (
                                <span className="font-mono text-gray-500 text-[10px]">{cit.date}</span>
                              )}
                              <span className="text-xs font-semibold text-indigo-600">Verified</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recorded Information Highlights */}
                  {msg.data?.recorded_facts && msg.data.recorded_facts.length > 0 && (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3 text-xs space-y-1">
                      <span className="font-bold text-emerald-950 text-[11px] block">
                        Direct Clinician-Recorded Elements:
                      </span>
                      <ul className="space-y-1 text-emerald-900">
                        {msg.data.recorded_facts.map((fact, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                            <span>{fact}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <span className="text-[10px] text-gray-400 block px-1">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 max-w-3xl mr-auto">
                <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm">
                  <Sparkles className="h-4 w-4 animate-spin" />
                </div>
                <div className="rounded-2xl bg-white border border-gray-200 p-4 text-xs text-gray-500 shadow-2xs flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                  <span>Retrieving authorized records and explaining...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 border-t border-gray-200 bg-white flex items-center gap-3">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendQuery(inputQuery);
                }
              }}
              placeholder="Ask anything about your visits, medicines, or lab reports..."
              className="flex-1 rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-xs text-gray-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            />
            <button
              type="button"
              onClick={() => handleSendQuery(inputQuery)}
              disabled={loading || !inputQuery.trim()}
              className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md hover:from-indigo-700 hover:to-violet-700 transition disabled:opacity-50 cursor-pointer flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
