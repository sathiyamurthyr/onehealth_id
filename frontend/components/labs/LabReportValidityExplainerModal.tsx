"use client";

import React from "react";
import { 
  X, 
  Info, 
  ShieldCheck, 
  Scale, 
  FileText, 
  HelpCircle, 
  AlertCircle,
  Stethoscope
} from "lucide-react";

interface LabReportValidityExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LabReportValidityExplainerModal: React.FC<LabReportValidityExplainerModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-labelledby="explainer-modal-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 rounded-xl">
            <Info className="h-6 w-6" />
          </div>
          <div>
            <h2 id="explainer-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">
              About Your Laboratory Results & Reference Ranges
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Understanding clinical reference limits and the OneHealth ID Three-Layer Guarantee
            </p>
          </div>
        </div>

        {/* Core Principles */}
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
          {/* Box 1: Reference Ranges originate from the Laboratory */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
            <div className="flex items-start gap-3">
              <Scale className="h-5 w-5 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                  1. Reference Ranges Are Laboratory-Specific
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  The biological reference intervals shown in your report are supplied directly by the testing laboratory. 
                  Reference ranges can vary between different laboratories because of differences in testing methodologies, 
                  instrument platforms, reagents, calibrator lots, patient age, biological sex, and sample collection times. 
                  OH-ID does not substitute or override the laboratory&apos;s authoritative reference values with generic thresholds.
                </p>
              </div>
            </div>
          </div>

          {/* Box 2: Not a standalone medical diagnosis */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/40 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-300 text-sm mb-1">
                  2. Outside Reference Range ≠ Standalone Diagnosis
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                  A test result marked as &ldquo;Outside Range&rdquo; indicates that the value falls outside the statistical 95% biological 
                  reference population standard established by that laboratory. It does not by itself establish a disease or condition. 
                  Only a licensed physician or healthcare provider can interpret laboratory values in conjunction with your medical history, 
                  clinical examination, and symptoms.
                </p>
              </div>
            </div>
          </div>

          {/* Box 3: The 3-Layer Document Architecture */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-600" />
              The OneHealth ID Three-Layer System
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 border border-slate-100 dark:border-slate-700">
                <span className="font-bold text-teal-700 dark:text-teal-400 block mb-1">LAYER 1</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">Original Laboratory Report</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  The authoritative legal document created, certified, and digitally signed by the pathologist. Always accessible in its authentic PDF format.
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 border border-slate-100 dark:border-slate-700">
                <span className="font-bold text-teal-700 dark:text-teal-400 block mb-1">LAYER 2</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">OH-ID Structured Engine</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Extracts structured parameters, visual gauge bars, and multi-visit historical trends across hospitals.
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 border border-slate-100 dark:border-slate-700">
                <span className="font-bold text-teal-700 dark:text-teal-400 block mb-1">LAYER 3</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">Patient-Friendly Summary</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Translates complex tables into simple parameter counts and clear doctor instructions without altering medical data.
                </p>
              </div>
            </div>
          </div>

          {/* Box 4: Critical Results Protocol */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
            <div className="flex items-start gap-3">
              <Stethoscope className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                  3. Laboratory Critical Values & Physician Follow-up
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  If a test value is explicitly flagged as critical by the testing pathologist, please contact your referring clinician or clinic immediately for clinical direction.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
