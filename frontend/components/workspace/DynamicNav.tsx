"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { FamilySwitcher } from "./FamilySwitcher";
import { 
  Hospital, Building, LogOut, ChevronDown, Check, MoreHorizontal, X, ChevronRight
} from "lucide-react";
import { resolveNavigationIcon } from "@/design-system/icons";

export function DynamicNav() {
  const pathname = usePathname();
  const { workspace, user, navigation, availableHospitals, availableWorkspaces, switchContext, logout } = useWorkspace();
  const [showHospDropdown, setShowHospDropdown] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchingIdx, setSwitchingIdx] = useState<number | null>(null);

  if (!workspace || !user) return null;

  const isPatient = workspace.workspace_type === "PATIENT";

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

  // Patient mobile bottom 4 primary tabs + More
  const patientMobileTabs = [
    { title: "Home", href: "/patient", icon: "LayoutDashboard" },
    { title: "Visits", href: "/patient/visits", icon: "Clock" },
    { title: "Appts", href: "/patient/appointments", icon: "Calendar" },
    { title: "Health", href: "/patient/timeline", icon: "History" },
    { title: "Profile", href: "/patient/profile", icon: "User" },
  ];

  return (
    <>
      {/* Desktop Sidebar (lg and up) */}
      <aside className="hidden lg:flex w-72 flex-col bg-white border-r border-slate-200 text-slate-700 min-h-screen sticky top-0 z-40 select-none">
        {/* Brand & Organization */}
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1 shrink-0 overflow-hidden">
              <Image
                src="/images/oh-id-logo.png"
                alt="One Health ID"
                width={36}
                height={36}
                priority
                className="object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base tracking-tight">OneHealth ID</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-[170px]">
                {isPatient ? "Personal Health Workspace" : workspace.tenant_name || workspace.hospital_name || "Healthcare Workspace"}
              </p>
            </div>
          </div>

          {/* Patient Header: Dynamic Family Healthcare Person Switcher */}
          {isPatient ? (
            <div className="mt-3">
              <FamilySwitcher />
            </div>
          ) : workspace.workspace_type === "SUPER_ADMIN" ? (
            /* Sathus Platform Super Admin Badge */
            <div className="mt-2 px-3 py-2.5 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                ST
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-purple-950 truncate">Sathus Platform</p>
                  <span className="px-1 py-0.2 rounded bg-purple-200 text-purple-800 text-[8px] font-black uppercase tracking-wider">
                    SaaS Core
                  </span>
                </div>
                <p className="text-[10px] text-purple-600 truncate">Multi-Tenant Governance</p>
              </div>
            </div>
          ) : workspace.workspace_type === "DOCTOR" ? (
            /* Hospital Context Badge for Doctor */
            <div className="mt-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
              <Hospital className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate">{workspace.hospital_name}</p>
                <p className="text-[10px] text-slate-500 truncate">{workspace.branch_name || "Main Campus"}</p>
              </div>
            </div>
          ) : (
            /* Context Switcher for Admin / Staff */
            <div className="relative mt-2">
              <button
                onClick={() => setShowHospDropdown(!showHospDropdown)}
                className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Hospital className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-slate-900 truncate">{workspace.hospital_name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{workspace.branch_name || "Main Campus"}</p>
                  </div>
                </div>
                {availableHospitals.length > 1 && (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition shrink-0" />
                )}
              </button>

              {/* Dropdown for Multi-Hospital Admin users */}
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
          )}
        </div>

        {/* Dynamic Navigation Items from Backend */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {isPatient ? "My Health Journey" : `${workspace.role_name} Workspace`}
          </p>
          {navigation.map((item, idx) => {
            const Icon = resolveNavigationIcon(item.icon);
            const isActive = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/doctor" && item.href !== "/hospital" && pathname.startsWith(item.href));
            const showSection = item.section && (idx === 0 || navigation[idx - 1]?.section !== item.section);

            return (
              <React.Fragment key={item.href}>
                {showSection && (
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-3 pb-1">
                    {item.section}
                  </div>
                )}
                <Link
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
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full border ${
                      isActive ? "bg-white/20 text-white border-white/30" : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              </React.Fragment>
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
                {availableWorkspaces && availableWorkspaces.length > 1 && (
                  <button
                    onClick={() => setShowSwitchModal(true)}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded transition"
                  >
                    Switch
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              id="btn-logout"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Powered By Sathus Technology Footer */}
        <div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200/90 text-[10px] text-slate-500 flex items-center justify-between">
          <span className="font-medium text-slate-500">Powered by</span>
          <span className="font-bold text-slate-700 tracking-tight">Sathus Technology Pvt Ltd</span>
        </div>
      </aside>

      {/* Mobile Sticky Bottom Navigation (< lg) */}
      <nav aria-label="Mobile Navigation" className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 py-1 px-2 z-50 flex items-center justify-around shadow-xl safe-area-pb">
        {isPatient ? (
          <>
            {patientMobileTabs.slice(0, 4).map((tab) => {
              const Icon = resolveNavigationIcon(tab.icon);
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-1 rounded-xl transition ${
                    isActive ? "text-blue-600 font-semibold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] truncate max-w-[64px]">{tab.title}</span>
                </Link>
              );
            })}
            <button
              onClick={() => setShowMobileMore(!showMobileMore)}
              aria-label="More navigation options"
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-1 rounded-xl transition ${
                showMobileMore ? "text-blue-600 font-semibold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <MoreHorizontal className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">More</span>
            </button>
          </>
        ) : (
          navigation.slice(0, 5).map((item) => {
            const Icon = resolveNavigationIcon(item.icon);
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
          })
        )}
      </nav>

      {/* Patient Mobile "More" Drawer / Bottom Sheet */}
      {isPatient && showMobileMore && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Sheet Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-center p-0.5 overflow-hidden shrink-0">
                  <Image
                    src="/images/oh-id-icon.png"
                    alt="OH-ID"
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Personal Health Menu</h3>
                  <p className="text-[10px] text-slate-500">{user.name || "Patient Portal"} • Powered by Sathus Technology</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMore(false)}
                aria-label="Close navigation drawer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* All 16 Navigation Options */}
            <div className="overflow-y-auto p-3 grid grid-cols-2 gap-2">
              {navigation.map((item) => {
                const Icon = resolveNavigationIcon(item.icon);
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMobileMore(false)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition ${
                      isActive
                        ? "bg-blue-50 border-blue-300 text-blue-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="text-[10px] text-slate-500 font-mono">
                OH-ID: <strong className="text-slate-800">{user.username}</strong>
              </div>
              <button
                onClick={() => {
                  setShowMobileMore(false);
                  logout();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-Session Switch Workspace Modal */}
      {showSwitchModal && availableWorkspaces && availableWorkspaces.length > 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Switch Workspace</h3>
              </div>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Select an authorized role and healthcare facility context for your session:
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {availableWorkspaces.map((ws: any, idx: number) => {
                const isCurrent =
                  ws.role_code === workspace.role_code &&
                  ws.hospital_ref_id === workspace.hospital_ref_id &&
                  (!ws.department_id || ws.department_id === workspace.department_id);

                return (
                  <button
                    key={`${ws.hospital_ref_id}-${ws.role_code}-${ws.department_id || idx}`}
                    disabled={switchingIdx !== null}
                    onClick={async () => {
                      setSwitchingIdx(idx);
                      try {
                        const success = await switchContext({
                          hospital_ref_id: ws.hospital_ref_id,
                          usertype_ref_id: ws.usertype_ref_id,
                          role_code: ws.role_code,
                          department_id: ws.department_id,
                        });
                        if (success) {
                          setShowSwitchModal(false);
                          const targetRoute = ws.default_route || "/dashboard";
                          window.location.href = targetRoute;
                        }
                      } finally {
                        setSwitchingIdx(null);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                      isCurrent
                        ? "bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {ws.category_title || ws.role_name || ws.role_code}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {ws.hospital_name || "Healthcare Facility"}
                        {ws.department_name ? ` • ${ws.department_name}` : ""}
                      </p>
                    </div>
                    {switchingIdx === idx ? (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : isCurrent ? (
                      <Check className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
