"use client";

import React from "react";
import Link from "next/link";
import { User, ShieldCheck, AlertCircle, QrCode, Phone, Droplet, HeartPulse, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { ClinicalPriority } from "./tokens";

export interface PatientBannerProps {
  id: string;
  name: string;
  onehealthId: string;
  age: number;
  gender: string;
  phone?: string;
  bloodGroup?: string;
  primaryDiagnosis?: string;
  priority?: ClinicalPriority;
  allergies?: string[];
  activeToken?: string | number;
  roomNumber?: string;
  onOpenQR?: () => void;
  className?: string;
}

export const PatientBanner: React.FC<PatientBannerProps> = ({
  id,
  name,
  onehealthId,
  age,
  gender,
  phone,
  bloodGroup = "O+",
  primaryDiagnosis,
  priority = "NORMAL",
  allergies = ["Penicillin (Severe)"],
  activeToken,
  roomNumber,
  onOpenQR,
  className,
}) => {
  return (
    <div
      className={cn(
        "bg-white  border border-slate-200  rounded-2xl p-4 sm:p-5 shadow-sm transition-all",
        priority === "EMERGENCY" && "border-rose-300  bg-rose-50/20 ",
        priority === "URGENT" && "border-amber-300  bg-amber-50/20 ",
        className
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Patient Avatar & Demographics */}
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg sm:text-xl shadow-md shrink-0">
            {name ? name.charAt(0) : "P"}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/patients/${id}`}
                className="text-base sm:text-lg font-bold text-slate-900  hover:text-blue-600  transition-colors truncate"
              >
                {name}
              </Link>
              <span className="text-xs text-slate-500 font-medium">
                ({age}y, {gender})
              </span>
              <StatusBadge priority={priority} />
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 ">
              <span className="font-mono font-bold text-blue-600  bg-blue-50  px-2 py-0.5 rounded border border-blue-200 ">
                {onehealthId}
              </span>

              {phone && (
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  +91 {phone}
                </span>
              )}

              <span className="flex items-center gap-1 font-semibold text-rose-600 ">
                <Droplet className="w-3.5 h-3.5 fill-current" />
                {bloodGroup}
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right: Clinical Flags & Operational Info */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 ">
          {/* Active Token or Room */}
          {activeToken && (
            <div className="flex flex-col items-center bg-slate-50  px-3 py-1.5 rounded-xl border border-slate-200 ">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Queue Token</span>
              <span className="text-base font-black text-blue-600 ">#{activeToken}</span>
            </div>
          )}

          {roomNumber && (
            <div className="flex flex-col items-center bg-slate-50  px-3 py-1.5 rounded-xl border border-slate-200 ">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Bed / Room</span>
              <span className="text-base font-black text-slate-800 ">{roomNumber}</span>
            </div>
          )}

          {/* Allergy / Clinical Warning Chip */}
          {allergies && allergies.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50  border border-rose-200  text-rose-700  text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Allergy: {allergies.join(", ")}</span>
            </div>
          )}

          {/* Quick Zero-Knowledge QR Token Action */}
          {onOpenQR && (
            <button
              onClick={onOpenQR}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200   text-slate-700  border border-slate-200  transition-colors min-h-[44px]"
              title="View Zero-Knowledge QR Token"
            >
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>QR Token</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Diagnosis Strip if present */}
      {primaryDiagnosis && (
        <div className="mt-3 pt-2.5 border-t border-slate-100  flex items-center gap-2 text-xs text-slate-600 ">
          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-400">Chief Diagnosis:</span>
          <span className="font-semibold text-slate-800 ">{primaryDiagnosis}</span>
        </div>
      )}
    </div>
  );
};
