"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { 
  WorkspaceResponse, WorkspaceDefinition, NavigationItem, 
  UserProfile, SwitchContextRequest 
} from "@/lib/types";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

interface WorkspaceContextValue {
  workspace: WorkspaceDefinition | null;
  user: UserProfile | null;
  navigation: NavigationItem[];
  permissions: string[];
  availableWorkspaces: any[];
  availableHospitals: any[];
  isLoading: boolean;
  error: string | null;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  switchContext: (req: SwitchContextRequest) => Promise<boolean>;
  refreshWorkspace: () => Promise<void>;
  logout: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<WorkspaceDefinition | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [navigation, setNavigation] = useState<NavigationItem[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<any[]>([]);
  const [availableHospitals, setAvailableHospitals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadWorkspace = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await api.workspace.getMyWorkspace();
      setWorkspace(res.workspace);
      setUser(res.user);
      setNavigation(res.navigation || []);
      setPermissions(res.permissions || []);
      setAvailableWorkspaces(res.available_workspaces || []);
      setAvailableHospitals(res.available_hospitals || []);
    } catch (err: any) {
      // Unauthenticated or session expired — do not fall back to stale browser storage
      setWorkspace(null);
      setUser(null);
      setNavigation([]);
      setPermissions([]);
      setAvailableWorkspaces([]);
      setAvailableHospitals([]);
      setError(err?.message || "Failed to load workspace context");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!permissions || permissions.length === 0) return false;
    if (permissions.includes("system.manage")) return true; // Platform admin override
    return permissions.includes(permission);
  }, [permissions]);

  const hasAnyPermission = useCallback((...perms: string[]): boolean => {
    if (!permissions || permissions.length === 0) return false;
    if (permissions.includes("system.manage")) return true;
    return perms.some((p) => permissions.includes(p));
  }, [permissions]);

  const switchContext = async (req: SwitchContextRequest): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await api.workspace.switchContext(req);
      const activeWs = res.workspace.workspace || (res.workspace as any);
      const activeUser = res.workspace.user;
      
      setWorkspace(activeWs);
      setUser(activeUser);
      setNavigation(res.workspace.navigation || []);
      setPermissions(res.workspace.permissions || []);
      setAvailableWorkspaces(res.workspace.available_workspaces || []);
      setAvailableHospitals(res.workspace.available_hospitals || []);

      // Navigate to the newly activated workspace's default route if needed
      if (activeWs?.default_route) {
        router.push(activeWs.default_route);
      }
      return true;
    } catch (err: any) {
      console.error("Context switch failed:", err);
      alert(err?.message || "Failed to switch hospital context");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await api.auth.logout();
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("oh_access_token");
        localStorage.removeItem("oh_workspace");
        localStorage.removeItem("oh_user");
        localStorage.removeItem("oh_impersonation");
        localStorage.removeItem("sathus_impersonation_session");
      } catch {
        // ignore
      }
    }
    setWorkspace(null);
    setUser(null);
    setNavigation([]);
    setPermissions([]);
    router.push("/login");
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        user,
        navigation,
        permissions,
        availableWorkspaces,
        availableHospitals,
        isLoading,
        error,
        hasPermission,
        hasAnyPermission,
        switchContext,
        refreshWorkspace: loadWorkspace,
        logout,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
