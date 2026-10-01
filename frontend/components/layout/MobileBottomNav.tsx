"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  ListOrdered,
  MoreHorizontal,
  X,
  Stethoscope,
  BedDouble,
  TestTube,
  Pill,
  Receipt,
  ShieldCheck,
  Settings,
  PlusCircle,
  Building2,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_MOBILE_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/appointments", label: "Appts", icon: CalendarCheck },
  { href: "/queue", label: "Queue", icon: ListOrdered },
];

const MORE_MOBILE_ITEMS = [
  { href: "/opd", label: "OPD Consultations", icon: Stethoscope },
  { href: "/ipd", label: "IPD & Beds", icon: BedDouble },
  { href: "/laboratory", label: "Laboratory", icon: TestTube },
  { href: "/pharmacy", label: "Pharmacy", icon: Pill },
  { href: "/billing", label: "Billing & Invoices", icon: Receipt },
  { href: "/admin", label: "Admin & Audit", icon: ShieldCheck },
  { href: "/design-system", label: "Design System", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Sticky Bottom Navigation Bar for Mobile (<1024px) */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-2 py-1 flex items-center justify-around shadow-lg"
        aria-label="Mobile Navigation"
      >
        {PRIMARY_MOBILE_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1.5 px-1 min-h-[48px] rounded-xl transition-all",
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-2")} />
              <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* More Actions Trigger */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1.5 px-1 min-h-[48px] rounded-xl transition-all",
            drawerOpen
              ? "text-blue-600 dark:text-blue-400 font-bold"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
          )}
          aria-label="More hospital sections"
        >
          <MoreHorizontal className="w-5 h-5 stroke-2" />
          <span className="text-[11px] mt-0.5 tracking-tight">More</span>
        </button>
      </nav>

      {/* Slide-over Mobile Drawer for "More" Workflows */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div 
            className="w-full bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Hospital Workflows
                </h3>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Register Patient Mobile Action */}
            <Link
              href="/patients/register"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-md mb-4 min-h-[48px]"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Register New Patient</span>
            </Link>

            {/* Grid of Sections */}
            <div className="grid grid-cols-2 gap-2.5">
              {MORE_MOBILE_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-2xl border transition-all min-h-[52px]",
                      isActive
                        ? "bg-blue-50 border-blue-200 dark:bg-blue-950/60 dark:border-blue-900 text-blue-700 dark:text-blue-300 font-semibold"
                        : "bg-slate-50 border-slate-200/80 dark:bg-slate-800/50 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
