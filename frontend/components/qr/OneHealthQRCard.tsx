"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, Download, Share2, Scan, CheckCircle2, User, Building2, Phone, Calendar } from "lucide-react";
import { Patient } from "@/lib/types";
import { Badge, Button } from "@/components/ui/Card";

interface OneHealthQRCardProps {
  patient: Patient;
  onScanSuccess?: (patient: Patient) => void;
}

export const OneHealthQRCard: React.FC<OneHealthQRCardProps> = ({ patient }) => {
  const [copied, setCopied] = useState(false);

  const rawToken = patient.qr_token || `QR-OHID-${patient.id}-SECURE`;
  const [qrValue, setQrValue] = useState(`https://ohid.online/scan/${rawToken}`);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setQrValue(`${window.location.origin}/scan/${rawToken}`);
    }
  }, [rawToken]);

  const copyOneHealthId = () => {
    if (patient.onehealth_id) {
      navigator.clipboard.writeText(patient.onehealth_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white shadow-xl border border-white/10 p-6 sm:p-8">
      {/* Decorative background glows */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest font-bold text-blue-300">OneHealth Network Identity</div>
            <div className="text-sm text-slate-300 font-medium">Hospital Operating System (OH-ID)</div>
          </div>
        </div>
        <Badge variant="success" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1.5 py-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Verified Citizen
        </Badge>
      </div>

      {/* Card Body */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center relative z-10">
        {/* Left Column: Demographics */}
        <div className="sm:col-span-2 space-y-4">
          <div>
            <div className="text-xs text-blue-200/70 uppercase tracking-wider mb-0.5">Patient Full Name</div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              {patient.name}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block uppercase">OneHealth ID</span>
              <button 
                onClick={copyOneHealthId}
                className="text-sm font-mono font-bold text-blue-300 hover:text-blue-200 transition-colors flex items-center gap-1.5"
                title="Click to copy"
              >
                {patient.onehealth_id || "OHID-PENDING"}
                {copied && <span className="text-[10px] text-emerald-400 font-sans font-normal">Copied!</span>}
              </button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block uppercase">Age & Gender</span>
              <span className="text-sm font-semibold text-slate-100">
                {patient.age} yrs • {patient.gender || "Unspecified"}
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block uppercase">Blood Group</span>
              <span className="text-sm font-semibold text-rose-300">
                {patient.blood_group || "O+ Positive"}
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block uppercase">Primary Hospital</span>
              <span className="text-sm font-semibold text-slate-100 truncate block">
                {patient.hospital_name || "Apollo Central"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Secure QR Code */}
        <div className="flex flex-col items-center justify-center sm:border-l sm:border-white/10 sm:pl-6">
          <div className="p-3 bg-white rounded-2xl shadow-lg border-2 border-white/20">
            <QRCodeSVG
              value={qrValue}
              size={128}
              level="H"
              includeMargin={false}
            />
          </div>
          <span className="text-[11px] font-mono text-blue-200/80 mt-2.5 tracking-tight text-center">
            Zero-Knowledge Healthcare Token
          </span>
          <span className="text-[10px] text-slate-400 text-center">
            Scan with authorized reader
          </span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3 relative z-10">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Interoperable across network hospitals</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={copyOneHealthId}
            className="hover:text-white transition-colors flex items-center gap-1 text-slate-300"
          >
            <Share2 className="w-3.5 h-3.5" /> Share ID
          </button>
        </div>
      </div>
    </div>
  );
};
