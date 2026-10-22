"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { X, ArrowRight, CheckCircle2, Clock, Sparkles, ShieldCheck, ExternalLink } from "lucide-react";

export interface FeatureDetail {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  themeColor: {
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
  };
  summary: string;
  sections: {
    heading: string;
    content: string;
    bulletPoints?: string[];
  }[];
  capabilities: {
    status: "IMPLEMENTED" | "IN_PROGRESS" | "PLANNED";
    label: string;
    description: string;
  }[];
  primaryAction: {
    label: string;
    href: string;
    note?: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
}

interface FeatureDetailModalProps {
  feature: FeatureDetail | null;
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export function FeatureDetailModal({
  feature,
  isOpen,
  onClose,
  triggerRef,
}: FeatureDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll and handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus close button on open
    setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      // Restore focus to trigger button
      triggerRef?.current?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen || !feature) return null;

  const Icon = feature.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feature-modal-title"
      aria-describedby="feature-modal-summary"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Box */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 z-10 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl ${feature.themeColor.iconBg} flex items-center justify-center ${feature.themeColor.iconColor} shrink-0 shadow-sm border border-slate-200/60`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="feature-modal-title" className="text-xl font-bold text-slate-950 tracking-tight">
                  {feature.title}
                </h3>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${feature.themeColor.badgeBg} ${feature.themeColor.badgeText} ${feature.themeColor.badgeBorder}`}>
                  {feature.subtitle}
                </span>
              </div>
              <p id="feature-modal-summary" className="text-xs text-slate-600 mt-1.5 leading-relaxed font-normal">
                {feature.summary}
              </p>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            aria-label="Close dialog"
            data-testid="feature-modal-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-sm">
          {/* Detailed Explanations */}
          {feature.sections.map((section, idx) => (
            <div key={idx} className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                {section.heading}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">{section.content}</p>
              {section.bulletPoints && section.bulletPoints.length > 0 && (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {section.bulletPoints.map((point, pIdx) => (
                    <li key={pIdx} className="text-xs text-slate-600 flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* Transparent Verification Status Matrix */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Technical Implementation Matrix
            </h4>
            <div className="space-y-2.5">
              {feature.capabilities.map((cap, cIdx) => (
                <div key={cIdx} className="flex items-start justify-between gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-900">{cap.label}</p>
                    <p className="text-[11px] text-slate-500">{cap.description}</p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      cap.status === "IMPLEMENTED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : cap.status === "IN_PROGRESS"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {cap.status === "IMPLEMENTED"
                      ? "VERIFIED & ACTIVE"
                      : cap.status === "IN_PROGRESS"
                      ? "READY / STAGING"
                      : "PLANNED ROADMAP"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            {feature.primaryAction.note || "Protected under multi-tenant enterprise access controls."}
          </p>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {feature.secondaryAction && (
              <Link
                href={feature.secondaryAction.href}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 min-h-[40px]"
              >
                <span>{feature.secondaryAction.label}</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            )}
            <Link
              href={feature.primaryAction.href}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 min-h-[40px]"
            >
              <span>{feature.primaryAction.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
