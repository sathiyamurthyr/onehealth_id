"use client";

import React, { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { DynamicNav } from "./DynamicNav";
import { WorkspaceGuard } from "./WorkspaceGuard";
import { FamilyContextBanner } from "./FamilyContextBanner";
import { FamilySwitcher } from "./FamilySwitcher";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { SidebarProvider, useSidebar } from "@/lib/workspace/SidebarContext";

interface WorkspaceLayoutProps {
  children: ReactNode;
  allowedWorkspaceTypes?: Array<"SUPER_ADMIN" | "HOSPITAL_ADMIN" | "DOCTOR" | "NURSE" | "EMPLOYEE" | "PATIENT" | "OTHER">;
  requiredPermission?: string;
  requiredAnyPermission?: string[];
}

function WorkspaceLayoutInner({
  children,
  allowedWorkspaceTypes,
  requiredPermission,
  requiredAnyPermission,
}: WorkspaceLayoutProps) {
  const { workspace } = useWorkspace();
  const { isMobileOpen, toggleMobile } = useSidebar();
  const isPatient = workspace?.workspace_type === "PATIENT";

  return (
    <WorkspaceGuard
      allowedWorkspaceTypes={allowedWorkspaceTypes}
      requiredPermission={requiredPermission}
      requiredAnyPermission={requiredAnyPermission}
    >
      <div className="min-h-screen bg-white text-slate-900 flex flex-col lg:flex-row antialiased overflow-x-hidden">
        <DynamicNav />

        {/* Mobile / Tablet Header (< lg) */}
        {isPatient && (
          <header className="lg:hidden p-3 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-mobile-nav-toggle"
                aria-label="Open navigation menu"
                aria-expanded={isMobileOpen}
                onClick={toggleMobile}
                className="p-1.5 -ml-1 rounded-xl text-slate-700 hover:text-[#155EEF] hover:bg-blue-50 transition focus:outline-hidden focus:ring-2 focus:ring-[#155EEF] shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link
                href="/"
                id="header-brand-link-mobile"
                title="Go to OneHealth ID Home"
                aria-label="OneHealth ID Home"
                className="flex items-center gap-2 group/brand focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#155EEF] focus-visible:ring-offset-2 rounded-xl p-1 -m-1 transition-all cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1 shrink-0 overflow-hidden group-hover/brand:border-blue-300 group-hover/brand:scale-105 transition-all">
                  <Image
                    src="/images/oh-id-logo.png"
                    alt="One Health ID"
                    width={32}
                    height={32}
                    className="w-full h-full object-contain filter drop-shadow-2xs"
                  />
                </div>
                <div>
                  <span className="font-bold text-slate-900 text-sm tracking-tight group-hover/brand:text-[#155EEF] transition-colors">OneHealth ID</span>
                  <p className="text-[10px] text-slate-500">Personal Health</p>
                </div>
              </Link>
            </div>
            <div className="w-44 sm:w-60">
              <FamilySwitcher />
            </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {/* Active Impersonation Warning Banner */}
          {typeof window !== "undefined" && localStorage.getItem("oh_impersonation") && (
            <div className="mb-4 p-3.5 rounded-2xl bg-amber-500 text-white shadow-md flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded bg-black/20 font-black text-xs">AUDITED SUPPORT SESSION</span>
                <p className="text-xs font-semibold">
                  Acting on behalf of Hospital Administration. Direct access to raw patient clinical EHR records is strictly restricted.
                </p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("oh_impersonation");
                  window.location.href = "/super-admin/security";
                }}
                className="px-3 py-1 bg-slate-900 text-white hover:bg-black rounded-xl text-xs font-bold transition shrink-0"
              >
                Exit Session
              </button>
            </div>
          )}
          <FamilyContextBanner />
          {children}
        </main>
      </div>
    </WorkspaceGuard>
  );
}

export function WorkspaceLayout(props: WorkspaceLayoutProps) {
  return (
    <SidebarProvider>
      <WorkspaceLayoutInner {...props} />
    </SidebarProvider>
  );
}

