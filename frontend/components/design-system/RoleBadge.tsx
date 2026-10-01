"use client";

import React from "react";
import { ShieldAlert, Building2, Stethoscope, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleType, ROLE_THEMES } from "./tokens";

export interface RoleBadgeProps {
  role: RoleType;
  label?: string;
  showIcon?: boolean;
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  label,
  showIcon = true,
  className,
}) => {
  const theme = ROLE_THEMES[role];
  const roleIcons = {
    SUPER_ADMIN: ShieldAlert,
    HOSPITAL_ADMIN: Building2,
    DOCTOR: Stethoscope,
    NURSE_STAFF: Users,
    PATIENT: User,
  };
  const Icon = roleIcons[role];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors select-none",
        theme.badgeClass,
        className
      )}
    >
      {showIcon && Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{label || theme.label}</span>
    </span>
  );
};
