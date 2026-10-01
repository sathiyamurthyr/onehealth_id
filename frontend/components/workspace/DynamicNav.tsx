"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { 
  LayoutDashboard, Users, Calendar, ListOrdered, Stethoscope, 
  HeartPulse, Activity, Building2, Hospital, Receipt, QrCode, 
  FileText, Settings, ShieldCheck, UserCheck, Search, UserPlus, 
  LogOut, ChevronDown, Building, Check
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  Calendar,
  ListOrdered,
  Stethoscope,
  HeartPulse,
  Activity,
  Building2,
  Hospital,
  Receipt,
  QrCode,
  FileText,
  Settings,
  ShieldCheck,
  UserCheck,
  Search,
  UserPlus,
  Building,
};

export function DynamicNav() {
  const pathname = usePathname();
  const { workspace, user, navigation, availableHospitals, switchContext, logout } = useWorkspace();
  const [showHospDropdown, setShowHospDropdown] = useState(false);

  if (!workspace || !user) return null;

  const roleColors: Record<string, { bg: string; text: string; border: string }> = {
    SUPER_ADMIN: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
    HOSPITAL_ADMIN: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
    DOCTOR: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300" },
    NURSE: { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-300" },
    EMPLOYEE: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" },
    PATIENT: { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-300" },
    OTHER: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
  };

  const badgeStyle = roleColors[workspace.workspace_type] || roleColors.OTHER;

  return (
    <>
      {/* Desktop Sidebar (lg and up) */}
      <aside className="hidden lg:flex w-72 flex-col bg-white border-r border-slate-200 text-slate-700 min-h-screen sticky top-0 z-40 select-none">
        {/* Brand & Organization */}
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-sm">
              OH
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base tracking-tight">OneHealth ID</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-[170px]">{workspace.tenant_name || "Kedar Healthcare"}</p>
            </div>
          </div>

          {/* Hospital Context Switcher */}
          <div className="relative mt-2">
            <button
              onClick={() => setShowHospDropdown(!showHospDropdown)}
              className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Hospital className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-900 truncate">{workspace.hospital_name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{workspace.branch_name || "Mugalivakkam Branch"}</p>
                </div>
              </div>
              {availableHospitals.length > 1 && (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition shrink-0" />
              )}
            </button>

            {/* Dropdown for Multi-Hospital users */}
            {showHospDropdown && availableHospitals.length > 1 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50">
                <p className="text-[10px] font-semibold text-slate-400 px-3 py-1 uppercase tracking-wider">
                  Switch Facility Scope
                </p>
                {availableHospitals.map((hosp) => {
                  const isCurrent = hosp.hospital_ref_id === workspace.hospital_ref_id;
                  return (
                    <button
                      key={hosp.hospital_ref_id}
                      onClick={() => {
                        setShowHospDropdown(false);
                        if (!isCurrent) {
                          switchContext({ hospital_ref_id: hosp.hospital_ref_id });
                        }
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                        isCurrent ? "text-blue-600 font-semibold bg-blue-50" : "text-slate-700"
                      }`}
                    >
                      <div className="truncate">
                        <p className="truncate font-medium">{hosp.hospital_name}</p>
                        <p className="text-[10px] text-slate-400">{hosp.hospital_city || "Chennai"}</p>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-blue-500" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Navigation Items from Backend */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {workspace.role_name} Workspace
          </p>
          {navigation.map((item) => {
            const Icon = ICON_MAP[item.icon || "LayoutDashboard"] || LayoutDashboard;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.title}</span>
                {item.badge && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.name || user.username}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                  {workspace.role_name}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sticky Bottom Navigation (< lg) */}
      <nav aria-label="Mobile Navigation" className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 py-1.5 px-3 z-50 flex items-center justify-around shadow-lg safe-area-pb">
        {navigation.slice(0, 5).map((item) => {
          const Icon = ICON_MAP[item.icon || "LayoutDashboard"] || LayoutDashboard;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-1 rounded-xl transition ${
                isActive ? "text-blue-600 font-semibold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] truncate max-w-[64px]">{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
