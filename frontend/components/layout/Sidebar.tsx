"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  ListOrdered,
  Stethoscope,
  BedDouble,
  TestTube,
  Pill,
  Receipt,
  ShieldCheck,
  Settings,
  Activity,
  PlusCircle,
  Building,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients & OH-ID", icon: Users },
  { href: "/appointments", label: "Appointments", icon: CalendarCheck },
  { href: "/queue", label: "Live Queue Board", icon: ListOrdered },
  { href: "/opd", label: "OPD Consultations", icon: Stethoscope },
  { href: "/ipd", label: "IPD & Bed Allocation", icon: BedDouble },
  { href: "/laboratory", label: "Laboratory Orders", icon: TestTube },
  { href: "/pharmacy", label: "Pharmacy Dispensary", icon: Pill },
  { href: "/billing", label: "Billing & Insurance", icon: Receipt },
  { href: "/admin", label: "Administration & Audit", icon: ShieldCheck },
  { href: "/design-system", label: "Design System", icon: Sparkles },
  { href: "/settings", label: "System Settings", icon: Settings },
];

export const Sidebar: React.FC<{ className?: string }> = ({ className }) => {
  const pathname = usePathname();

  return (
    <aside className={cn("hidden lg:flex flex-col w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shrink-0 select-none", className)}>
      {/* Quick Action Button */}
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <Link
          href="/patients/register"
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs tracking-wide shadow-sm hover:shadow transition-all active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register New Patient</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
          Hospital Workflows
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors min-h-[44px]",
                isActive
                  ? "bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-slate-500")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Network / Tenant Tag */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-xs">
        <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold mb-1">
            <Building className="w-3.5 h-3.5 text-blue-600" />
            <span>Multi-Tenant Network</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Tenant: Apollo Global Net<br />
            Status: Active Production
          </p>
        </div>
      </div>
    </aside>
  );
};
