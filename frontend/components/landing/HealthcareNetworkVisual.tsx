"use client";

import React, { useState } from "react";
import { ShieldCheck, Building2, Stethoscope, Users, Activity, QrCode } from "lucide-react";

interface NodeDetail {
  id: string;
  title: string;
  label: string;
  detail: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

const NODES: NodeDetail[] = [
  {
    id: "hospital",
    title: "Hospital Network",
    label: "Participating Hospitals",
    detail: "Schema-isolated multi-tenant operations, department beds, and live admission desks.",
    icon: Building2,
    color: "text-blue-600",
    bgColor: "bg-blue-50/90",
    borderColor: "border-blue-200",
  },
  {
    id: "doctor",
    title: "Clinical Stations",
    label: "Doctor Workspaces",
    detail: "OPD triage counters, longitudinal patient timelines, and signed FHIR prescriptions.",
    icon: Stethoscope,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50/90",
    borderColor: "border-indigo-200",
  },
  {
    id: "patient",
    title: "Patient Identity",
    label: "OneHealth ID & QR",
    detail: "Privacy-conscious verification tokens, digital health lockers, and instant check-ins.",
    icon: QrCode,
    color: "text-teal-600",
    bgColor: "bg-teal-50/90",
    borderColor: "border-teal-200",
  },
  {
    id: "pharmacy",
    title: "Diagnostics & Pharmacy",
    label: "Fulfillment Services",
    detail: "Direct e-prescription dispensaries, automated lab orders, and GST billing receipts.",
    icon: Activity,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50/90",
    borderColor: "border-emerald-200",
  },
];

export function HealthcareNetworkVisual() {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const activeDetail = NODES.find((n) => n.id === activeNode);

  return (
    <div
      id="network"
      role="region"
      aria-label="Healthcare Network Architecture"
      className="w-full max-w-[min(94vw,1540px)] mx-auto my-8 sm:my-14 p-4 sm:p-6 lg:p-8 rounded-3xl bg-slate-50/70 border border-slate-200/80 shadow-xs relative overflow-hidden transition-all"
    >
      {/* Background grid accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-60" />

      {/* Visual Header */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-4 pb-3 border-b border-slate-200/60 text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-semibold tracking-wide">
          <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
          <span className="text-[11px] sm:text-xs">INTEROPERABLE HEALTHCARE NETWORK BUS</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-slate-500 text-[10px] sm:text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 font-mono">HMAC-SHA256</span>
          <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 font-mono">FHIR R4</span>
          <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 font-mono">PostgreSQL Schema Isolation</span>
        </div>
      </div>

      {/* Interactive Diagram Canvas */}
      <div className="relative z-10 py-3 sm:py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
          {NODES.map((node) => {
            const Icon = node.icon;
            const isHovered = activeNode === node.id;
            return (
              <button
                key={node.id}
                type="button"
                onMouseEnter={() => setActiveNode(node.id)}
                onMouseLeave={() => setActiveNode(null)}
                onFocus={() => setActiveNode(node.id)}
                onBlur={() => setActiveNode(null)}
                className={`p-4 sm:p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[140px] sm:min-h-[150px] ${
                  isHovered
                    ? `${node.bgColor} ${node.borderColor} shadow-md scale-[1.01] ring-2 ring-blue-500/20`
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                }`}
                aria-label={`${node.title}: ${node.label}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${node.bgColor} border ${node.borderColor} flex items-center justify-center ${node.color} shadow-xs`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Node</span>
                </div>
                <div className="mt-2">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">{node.title}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-medium">{node.label}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Central Interconnection Bridge */}
        <div className="mt-4 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/30">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {activeDetail ? activeDetail.title : "OneHealth ID Gateway Active"}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {activeDetail ? activeDetail.detail : "Hover or focus any node to inspect real-time interconnectivity contracts."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] sm:text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              100% Zero Raw PHI Exposure
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
