"use client";

import React from "react";
import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleType, ROLE_THEMES } from "./tokens";

export interface MetricsWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  roleAccent?: RoleType;
  delta?: {
    value: string | number;
    trend: "up" | "down" | "neutral";
    label?: string;
  };
  onClick?: () => void;
  className?: string;
}

export const MetricsWidget: React.FC<MetricsWidgetProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  roleAccent = "HOSPITAL_ADMIN",
  delta,
  onClick,
  className,
}) => {
  const roleTheme = ROLE_THEMES[roleAccent];

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white  border border-slate-200  rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between",
        onClick && "cursor-pointer hover:border-slate-300  active:scale-[0.99]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 ">
          {title}
        </span>
        {Icon && (
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
              roleTheme.bgLight,
              roleTheme.bgDark,
              roleTheme.badgeClass
            )}
          >
            <Icon className={cn("w-4 h-4", roleTheme.iconColor)} />
          </div>
        )}
      </div>

      <div className="my-2">
        <div className="text-2xl sm:text-3xl font-black text-slate-900  tracking-tight">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500  mt-1 line-clamp-1">
            {subtitle}
          </p>
        )}
      </div>

      {delta && (
        <div className="mt-2 pt-2 border-t border-slate-100  flex items-center justify-between text-xs">
          <div
            className={cn(
              "flex items-center gap-1 font-semibold",
              delta.trend === "up" && "text-emerald-600 ",
              delta.trend === "down" && "text-rose-600 ",
              delta.trend === "neutral" && "text-slate-500"
            )}
          >
            {delta.trend === "up" && <ArrowUpRight className="w-3.5 h-3.5" />}
            {delta.trend === "down" && <ArrowDownRight className="w-3.5 h-3.5" />}
            {delta.trend === "neutral" && <Minus className="w-3.5 h-3.5" />}
            <span>{delta.value}</span>
          </div>
          {delta.label && (
            <span className="text-[11px] text-slate-400">{delta.label}</span>
          )}
        </div>
      )}
    </div>
  );
};
