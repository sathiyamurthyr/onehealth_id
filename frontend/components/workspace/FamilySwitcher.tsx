"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Users, User, ChevronDown, Check, Plus, ShieldCheck, 
  Baby, HeartHandshake, Sparkles, AlertCircle 
} from "lucide-react";
import { useFamily } from "@/lib/patient/FamilyContext";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";

export function FamilySwitcher() {
  const { workspace } = useWorkspace();
  const { 
    primaryProfile, 
    familyMembers, 
    activePerson, 
    switchPerson, 
    isLoading 
  } = useFamily();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (workspace?.workspace_type !== "PATIENT") return null;

  const isSelf = activePerson?.isSelf ?? true;

  const getRelationshipIcon = (relationship: string, isMinor?: boolean) => {
    if (isMinor || relationship.toLowerCase().includes("son") || relationship.toLowerCase().includes("daughter") || relationship.toLowerCase().includes("child")) {
      return Baby;
    }
    if (relationship.toLowerCase().includes("spouse") || relationship.toLowerCase().includes("wife") || relationship.toLowerCase().includes("husband")) {
      return HeartHandshake;
    }
    return User;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        id="family-switcher-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left px-3.5 py-2.5 rounded-2xl border transition-all flex items-center justify-between group shadow-sm ${
          isSelf 
            ? "bg-gradient-to-r from-cyan-50/90 to-blue-50/90 border-cyan-200/90 hover:border-cyan-300" 
            : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 hover:border-amber-400"
        }`}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
            isSelf 
              ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white" 
              : "bg-gradient-to-br from-amber-500 to-orange-600 text-white"
          }`}>
            {isSelf ? "ME" : activePerson?.relationship?.slice(0, 2).toUpperCase() || "FM"}
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                isSelf ? "bg-cyan-100 text-cyan-800" : "bg-amber-200 text-amber-900"
              }`}>
                {isSelf ? "Self" : activePerson?.relationship}
              </span>
              {activePerson?.isMinor && (
                <span className="text-[9px] font-bold px-1 rounded bg-rose-100 text-rose-700">Minor</span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
              {activePerson?.name || primaryProfile?.name || "Patient"}
            </p>
            <p className="text-[10px] font-mono text-slate-500 truncate">
              {activePerson?.onehealth_id || primaryProfile?.onehealth_id || "OHID"}
            </p>
          </div>
        </div>

        <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-slate-700 transition shrink-0 ml-1.5 ${
          isOpen ? "rotate-180 text-blue-600" : ""
        }`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          id="family-switcher-dropdown"
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150 divide-y divide-slate-100 min-w-[260px]"
        >
          {/* Header */}
          <div className="px-3.5 py-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
              <span>Switch Healthcare Person</span>
              <span className="text-cyan-600 font-mono text-[9px]">1 OH-ID per Person</span>
            </p>
          </div>

          {/* Members List */}
          <div className="py-1 max-h-64 overflow-y-auto space-y-0.5 px-1.5">
            {/* 1. Primary Patient (Self) */}
            <button
              id="family-member-option-self"
              onClick={() => {
                switchPerson(null);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                isSelf ? "bg-blue-50/80 text-blue-900 font-semibold border border-blue-200" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  ME
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold truncate text-slate-900">{primaryProfile?.name || "Self (Primary)"}</span>
                    <span className="text-[9px] px-1 rounded bg-blue-100 text-blue-700 font-semibold">Self</span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 truncate">
                    {primaryProfile?.onehealth_id || "OHID-PRIMARY"}
                  </p>
                </div>
              </div>
              {isSelf && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
            </button>

            {/* 2. Linked Family Members */}
            {familyMembers.map((member) => {
              const isSelected = activePerson?.id === member.member_patient_id;
              const Icon = getRelationshipIcon(member.relationship, member.is_minor);
              return (
                <button
                  key={member.id}
                  id={`family-member-option-${member.member_patient_id}`}
                  onClick={() => {
                    switchPerson(member.member_patient_id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                    isSelected ? "bg-amber-50 text-amber-900 font-semibold border border-amber-300" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold truncate text-slate-900">{member.member_name}</span>
                        <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-600 font-semibold">
                          {member.relationship}
                        </span>
                        {member.is_minor && (
                          <span className="text-[9px] px-1 rounded bg-rose-100 text-rose-700 font-bold">Minor</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 truncate">
                        <span>{member.member_onehealth_id}</span>
                        {member.hospitals_count > 0 && (
                          <span className="text-slate-500">• {member.hospitals_count} Hosp</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Action Footer: Add Family Member */}
          <div className="p-2 bg-slate-50 rounded-b-2xl">
            <Link
              id="add-family-member-btn"
              href="/patient/family?action=add"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-blue-700 text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Family Member</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
