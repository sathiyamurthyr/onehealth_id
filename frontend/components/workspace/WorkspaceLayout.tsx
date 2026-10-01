"use client";

import React, { ReactNode } from "react";
import { DynamicNav } from "./DynamicNav";
import { WorkspaceGuard } from "./WorkspaceGuard";

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
  return (
    <WorkspaceGuard
      allowedWorkspaceTypes={allowedWorkspaceTypes}
      requiredPermission={requiredPermission}
      requiredAnyPermission={requiredAnyPermission}
    >
      <div className="min-h-screen bg-white text-slate-900 flex flex-col lg:flex-row antialiased">
        <DynamicNav />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </WorkspaceGuard>
  );
}
