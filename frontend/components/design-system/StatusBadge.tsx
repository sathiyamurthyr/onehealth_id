"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { CLINICAL_STATUS_THEMES, CLINICAL_PRIORITY_THEMES, ClinicalStatus, ClinicalPriority } from "./tokens";

export interface StatusBadgeProps {
  status?: ClinicalStatus;
  priority?: ClinicalPriority;
  label?: string;
  withPulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  priority,
  label,
  withPulse = false,
  className,
}) => {
  let theme: { label: string; badgeClass: string; pulseColor?: string } = {
    label: label || "Unknown",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  };

  if (status && CLINICAL_STATUS_THEMES[status]) {
    theme = CLINICAL_STATUS_THEMES[status];
  } else if (priority && CLINICAL_PRIORITY_THEMES[priority]) {
    theme = CLINICAL_PRIORITY_THEMES[priority];
  }

  const displayText = label || theme.label;
  const showPulse = withPulse || Boolean(theme.pulseColor);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all select-none whitespace-nowrap",
        theme.badgeClass,
        className
      )}
    >
      {showPulse && theme.pulseColor && (
        <span className="relative flex h-2 w-2">
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", theme.pulseColor)} />
          <span className={cn("relative inline-flex rounded-full h-2 w-2", theme.pulseColor)} />
        </span>
      )}
      {displayText}
    </span>
  );
};
