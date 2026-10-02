"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Stethoscope,
  Pill,
  FileText,
  Activity,
  Hospital,
  ArrowRight,
  Eye,
  X,
  Share2
} from "lucide-react";
import { TimelineEvent } from "@/lib/types";

interface PatientClinicalTimelineProps {
  events: TimelineEvent[];
}

export function PatientClinicalTimeline({ events }: PatientClinicalTimelineProps) {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "CONSULTATION":
        return <Stethoscope className="w-3.5 h-3.5 text-purple-600" />;
      case "PRESCRIPTION":
        return <Pill className="w-3.5 h-3.5 text-emerald-600" />;
      case "LAB_REPORT":
        return <FileText className="w-3.5 h-3.5 text-blue-600" />;
      case "ADMISSION":
        return <Hospital className="w-3.5 h-3.5 text-rose-600" />;
      case "REFERRAL":
        return <Share2 className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getEventBg = (type: string) => {
    switch (type) {
      case "CONSULTATION":
        return "bg-purple-50 border-purple-200 text-purple-700";
      case "PRESCRIPTION":
        return "bg-emerald-50 border-emerald-200 text-emerald-700";
      case "LAB_REPORT":
        return "bg-blue-50 border-blue-200 text-blue-700";
      case "ADMISSION":
        return "bg-rose-50 border-rose-200 text-rose-700";
      case "REFERRAL":
        return "bg-amber-50 border-amber-200 text-amber-700";
      default:
        return "bg-slate-50 border-slate-200 text-slate-700";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="bg-slate-50/70 border-b border-slate-200/80 px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span>Patient Clinical Timeline (Unified Longitudinal Record)</span>
          </h3>
          <p className="text-[11px] text-slate-500">
            Chronological progression of consultations, lab results, prescriptions, and inpatient episodes. Click to view.
          </p>
        </div>

        <span className="text-[11px] font-mono text-purple-700 font-bold px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200">
          {events.length} Clinical Milestones
        </span>
      </div>

      <div className="p-6">
        {events.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No chronological timeline events recorded.
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-slate-200 ml-4 space-y-6">
            {events.map((ev, idx) => (
              <div key={ev.id || idx} className="relative group">
                {/* Timeline node dot */}
                <div className="absolute -left-[31px] top-1.5 w-5 h-5 rounded-full bg-white border-2 border-purple-500 flex items-center justify-center shadow-xs">
                  <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                </div>

                <div
                  onClick={() => setSelectedEvent(ev)}
                  className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-xs bg-white cursor-pointer transition-all flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${getEventBg(ev.type)}`}>
                        {getEventIcon(ev.type)}
                        {ev.type}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {new Date(ev.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      {ev.status && (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {ev.status}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                      {ev.title}
                    </h4>
                    <p className="text-[11px] text-slate-500">{ev.subtitle}</p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-purple-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Inspection Drawer / Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-lg border ${getEventBg(selectedEvent.type)}`}>
                  {getEventIcon(selectedEvent.type)}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedEvent.title}</h3>
                  <span className="text-xs text-slate-500">{selectedEvent.date}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="font-semibold text-slate-800">
                Attending Clinician / Authority: <span className="font-bold text-slate-900">{selectedEvent.doctor_name || "Doctor"}</span>
              </div>
              <div className="text-slate-600">{selectedEvent.subtitle}</div>
            </div>

            {selectedEvent.details && (
              <div className="max-h-60 overflow-y-auto p-3 rounded-xl border border-slate-200 bg-white font-mono text-xs text-slate-800 whitespace-pre-wrap">
                {JSON.stringify(selectedEvent.details, null, 2)}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
