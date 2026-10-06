"use client";

import React, { ReactNode } from "react";
import { DynamicNav } from "./DynamicNav";
import { WorkspaceGuard } from "./WorkspaceGuard";
import { FamilyContextBanner } from "./FamilyContextBanner";
import { FamilySwitcher } from "./FamilySwitcher";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";

interface WorkspaceLayoutProps {
  children: ReactNode;
  allowedWorkspaceTypes?: Array<"SUPER_ADMIN" | "HOSPITAL_ADMIN" | "DOCTOR" | "NURSE" | "EMPLOYEE" | "PATIENT" | "OTHER">;
  requiredPermission?: string;
  requiredAnyPermission?: string[];
}

export function WorkspaceLayout({
  children,
  allowedWorkspaceTypes,
  requiredPermission,
  requiredAnyPermission,
}: WorkspaceLayoutProps) {
  const { workspace } = useWorkspace();
  const isPatient = workspace?.workspace_type === "PATIENT";

  return (
    <WorkspaceGuard
      allowedWorkspaceTypes={allowedWorkspaceTypes}
      requiredPermission={requiredPermission}
      requiredAnyPermission={requiredAnyPermission}
    >
      <div className="min-h-screen bg-white text-slate-900 flex flex-col lg:flex-row antialiased">
        <DynamicNav />

        {/* Mobile / Tablet Header (< lg) */}
        {isPatient && (
          <header className="lg:hidden p-3 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                OH
              </div>
              <div>
                <span className="font-bold text-slate-900 text-sm tracking-tight">OneHealth ID</span>
                <p className="text-[10px] text-slate-500">Personal Health</p>
              </div>
            </div>
            <div className="w-48 sm:w-64">
              <FamilySwitcher />
            </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          <FamilyContextBanner />
          {children}
        </main>
      </div>
    </WorkspaceGuard>
  );
}
