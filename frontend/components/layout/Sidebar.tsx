"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { cn } from "@/lib/utils";
import { Building, FilePlus, HeartPulse, PlusCircle, ShieldCheck } from "lucide-react";
import { resolveNavigationIcon } from "@/design-system/icons";

export const Sidebar: React.FC<{ className?: string }> = ({ className }) => {
  const pathname = usePathname();
  const { workspace, user, navigation } = useWorkspace();

  // Navigation is driven dynamically from the backend API based on authenticated role & permissions
  const items = navigation || [];
  const workspaceType = workspace?.workspace_type || user?.role || "GUEST";
  const roleName = workspace?.role_name || user?.role || "Hospital";

  return (
    <aside className={cn("hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 select-none", className)}>
      {/* Role-Specific Quick Action Button */}
      <div className="p-4 border-b border-slate-200">
        {workspaceType === "DOCTOR" ? (
          <Link
            href="/doctor/prescriptions/new"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs tracking-wide shadow-sm hover:shadow transition-all active:scale-[0.98]"
          >
            <FilePlus className="w-4 h-4" />
            <span>Create Prescription</span>
          </Link>
        ) : workspaceType === "NURSE" ? (
          <Link
            href="/nurse/vitals"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs tracking-wide shadow-sm hover:shadow transition-all active:scale-[0.98]"
          >
            <HeartPulse className="w-4 h-4" />
            <span>Record Vitals & Triage</span>
          </Link>
        ) : workspaceType === "SUPER_ADMIN" ? (
          <Link
            href="/super-admin/hospitals"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs tracking-wide shadow-sm hover:shadow transition-all active:scale-[0.98]"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Platform Governance</span>
          </Link>
        ) : workspaceType === "HOSPITAL_ADMIN" ? (
          <Link
            href="/hospital/users"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold text-xs tracking-wide shadow-sm hover:shadow transition-all active:scale-[0.98]"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Manage Access & Roles</span>
          </Link>
        ) : (
          <Link
            href="/patients/register"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs tracking-wide shadow-sm hover:shadow transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register New Patient</span>
          </Link>
        )}
      </div>

      {/* Dynamic Navigation Links (Only Permitted Menus for Logged-In User) */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1 mb-1">
          {roleName} Workspace
        </div>

        {items.length === 0 ? (
          <div className="px-3 py-4 text-xs text-slate-400 text-center">
            Loading permitted menus...
          </div>
        ) : (
          items.map((item, idx) => {
            const Icon = resolveNavigationIcon(item.icon);
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && item.href !== "/doctor" && item.href !== "/hospital" && pathname.startsWith(item.href));

            const showSection = item.section && (idx === 0 || items[idx - 1]?.section !== item.section);

            return (
              <React.Fragment key={item.href}>
                {showSection && (
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-3 pb-1">
                    {item.section}
                  </div>
                )}
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors min-h-[44px]",
                    isActive
                      ? "bg-blue-600 text-white font-semibold shadow-sm shadow-blue-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-slate-500")} />
                    <span className="truncate">{item.title}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 shrink-0",
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </React.Fragment>
            );
          })
        )}
      </nav>

      {/* Network / Active Facility Scoped Context Tag */}
      <div className="p-4 border-t border-slate-200 text-xs">
        <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
          <div className="flex items-center gap-2 text-slate-800 font-semibold mb-1 truncate">
            <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">{workspace?.hospital_name || "Healthcare Facility"}</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            {workspace?.branch_name || "Main Branch"}<br />
            <span className="text-[10px] text-slate-400">
              User: {user?.name || user?.username || "Authenticated User"}
            </span>
          </p>
        </div>
      </div>
    </aside>
  );
};
