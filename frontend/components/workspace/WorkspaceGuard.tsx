"use client";

import React, { ReactNode } from "react";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft, Building2 } from "lucide-react";

interface WorkspaceGuardProps {
  children: ReactNode;
  allowedWorkspaceTypes?: Array<"SUPER_ADMIN" | "HOSPITAL_ADMIN" | "DOCTOR" | "NURSE" | "EMPLOYEE" | "PATIENT" | "OTHER" | string>;
  requiredPermission?: string;
  requiredAnyPermission?: string[];
}

export function WorkspaceGuard({
  children,
  allowedWorkspaceTypes,
  requiredPermission,
  requiredAnyPermission,
}: WorkspaceGuardProps) {
  const { workspace, user, isLoading, hasPermission, hasAnyPermission, refreshWorkspace } = useWorkspace();
  const router = useRouter();

  // If token exists in localStorage but workspace not yet loaded, refresh instead of kicking to login
  React.useEffect(() => {
    if (!isLoading && (!workspace || !user) && typeof window !== "undefined") {
      const token = localStorage.getItem("oh_access_token");
      if (token) {
        refreshWorkspace();
      } else {
        router.push("/login");
      }
    }
  }, [isLoading, workspace, user, refreshWorkspace, router]);

  if (isLoading || (!workspace && typeof window !== "undefined" && !!localStorage.getItem("oh_access_token"))) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-600">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium tracking-wide text-slate-600">Resolving Authoritative Workspace Context...</p>
      </div>
    );
  }

  // Not authenticated
  if (!workspace || !user) {
    return null;
  }

  // Check Workspace Type
  const isTypeAllowed = allowedWorkspaceTypes
    ? allowedWorkspaceTypes.includes(workspace.workspace_type)
    : true;

  // Check Granular Permissions
  const isPermAllowed = requiredPermission
    ? hasPermission(requiredPermission)
    : requiredAnyPermission
    ? hasAnyPermission(...requiredAnyPermission)
    : true;

  if (!isTypeAllowed || !isPermAllowed) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-8 shadow-lg">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-200">
            <ShieldAlert className="w-8 h-8" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Workspace Access Restricted</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Your authenticated role (<span className="text-blue-600 font-semibold">{workspace.role_name}</span>) at{" "}
            <span className="text-slate-800 font-medium">{workspace.hospital_name}</span> does not have authorization to access this workspace module.
          </p>

          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between text-slate-500">
              <span>Active Workspace:</span>
              <span className="text-slate-800 font-mono font-medium">{workspace.workspace_type}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Active Facility:</span>
              <span className="text-slate-800 font-medium">{workspace.hospital_name}</span>
            </div>
            {requiredPermission && (
              <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200">
                <span>Required Permission:</span>
                <span className="text-rose-600 font-mono">{requiredPermission}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => router.push(workspace.default_route)}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to My Authorized Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
