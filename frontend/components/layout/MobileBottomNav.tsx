"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { cn } from "@/lib/utils";
import { Building, MoreHorizontal, X } from "lucide-react";
import { resolveNavigationIcon } from "@/design-system/icons";

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { workspace, user, navigation } = useWorkspace();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items = navigation || [];
  const primaryItems = items.slice(0, 4);
  const moreItems = items.slice(4);
  const roleName = workspace?.role_name || user?.role || "Hospital";

  return (
    <>
      {/* Sticky Bottom Navigation Bar for Mobile (<1024px) */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-1 flex items-center justify-around shadow-lg"
        aria-label="Mobile Navigation"
      >
        {primaryItems.map((item) => {
          const Icon = resolveNavigationIcon(item.icon);
          const isActive = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/doctor" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1.5 px-1 min-h-[48px] rounded-xl transition-all",
                isActive
                  ? "text-blue-600 font-bold"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-2")} />
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">{item.title}</span>
            </Link>
          );
        })}

        {/* More Actions Trigger if more than 4 items */}
        {moreItems.length > 0 && (
          <button
            onClick={() => setDrawerOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1.5 px-1 min-h-[48px] rounded-xl transition-all",
              drawerOpen
                ? "text-blue-600 font-bold"
                : "text-slate-500 hover:text-slate-800 font-medium"
            )}
            aria-label="More workflows"
          >
            <MoreHorizontal className="w-5 h-5 stroke-2" />
            <span className="text-[10px] mt-0.5 tracking-tight">More</span>
          </button>
        )}
      </nav>

      {/* Slide-over Mobile Drawer for "More" Workflows */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div 
            className="w-full bg-white rounded-t-3xl p-6 border-t border-slate-200 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {roleName} Workflows
                </h3>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close workflows drawer"
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Additional Permitted Links */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {moreItems.map((item) => {
                const Icon = resolveNavigationIcon(item.icon);
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl border text-xs font-semibold transition-all min-h-[52px]",
                      isActive
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-blue-600" : "text-slate-500")} />
                    <span className="truncate">{item.title}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 text-center text-xs text-slate-400">
              {workspace?.hospital_name} • {workspace?.branch_name || "Main Branch"}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
