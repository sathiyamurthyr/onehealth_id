"use client";

import React, { ReactNode } from "react";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";

interface PermissionGateProps {
  permission?: string;
  anyPermission?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  permission,
  anyPermission,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission } = useWorkspace();

  let isAllowed = true;
  if (permission) {
    isAllowed = hasPermission(permission);
  } else if (anyPermission && anyPermission.length > 0) {
    isAllowed = hasAnyPermission(...anyPermission);
  }

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
