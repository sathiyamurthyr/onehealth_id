"use client";

import React from "react";
import Link from "next/link";
import { 
  Users, User, ShieldAlert, ArrowLeft, Settings, 
  Baby, HeartHandshake, Eye, CheckCircle2 
} from "lucide-react";
import { useFamily } from "@/lib/patient/FamilyContext";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";

export function FamilyContextBanner() {
  const { workspace } = useWorkspace();
  const { activePerson, switchPerson, primaryProfile } = useFamily();

  if (workspace?.workspace_type !== "PATIENT" || !activePerson || activePerson.isSelf) {
    return null;
  }

  const getRelationshipIcon = () => {
    if (activePerson.isMinor) return Baby;
    if (activePerson.relationship.toLowerCase().includes("spouse") || activePerson.relationship.toLowerCase().includes("wife")) return HeartHandshake;
    return User;
  };

  const Icon = getRelationshipIcon();

  return (
    <div 
      id="family-context-banner"
      className="mb-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-0.5 shadow-md animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="bg-white rounded-[14px] p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">Viewing health records for:</span>
              <span className="text-xs font-bold text-slate-900 bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                {activePerson.name}
              </span>
              <span className="text-[11px] font-semibold text-slate-600">
                ({activePerson.relationship} {activePerson.isMinor ? "· Minor" : ""})
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
              <span className="font-mono font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                OH-ID: {activePerson.onehealth_id}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {activePerson.isGuardian ? "Authorized Guardian Access" : "Authorized Family Access"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Link
            id="manage-family-perms-btn"
            href="/patient/family"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Permissions</span>
          </Link>
          <button
            id="switch-to-self-btn"
            onClick={() => switchPerson(null)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Switch to My Health</span>
          </button>
        </div>
      </div>
    </div>
  );
}
