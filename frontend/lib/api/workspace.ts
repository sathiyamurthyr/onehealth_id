import { fetchJSON } from "./client";
import { 
  WorkspaceResponse, SwitchContextRequest, SwitchContextResponse, 
  UserProfile 
} from "../types";

export const workspaceApi = {
  getMyWorkspace: async (): Promise<WorkspaceResponse> => {
    return fetchJSON<WorkspaceResponse>("/me/workspace");
  },

  switchContext: async (req: SwitchContextRequest): Promise<SwitchContextResponse> => {
    const res = await fetchJSON<SwitchContextResponse>("/workspace/switch-context", {
      method: "POST",
      body: JSON.stringify(req),
    });
    // HttpOnly cookie is updated by backend automatically. Ensure zero token in localStorage.
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("oh_access_token");
        localStorage.removeItem("oh_user");
      } catch {
        // Ignore storage restrictions
      }
    }
    return res;
  },

  getDashboardWidgets: async (hospitalId?: string): Promise<{ success: boolean; data: Record<string, any> }> => {
    const qs = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : "";
    return fetchJSON<{ success: boolean; data: Record<string, any> }>(`/dashboard/widgets${qs}`);
  },

  getSystemRoles: async (): Promise<{ success: boolean; data: any[] }> => {
    return fetchJSON<{ success: boolean; data: any[] }>("/workspace/roles");
  },

  getSystemPermissions: async (): Promise<{ success: boolean; data: any[] }> => {
    return fetchJSON<{ success: boolean; data: any[] }>("/workspace/permissions");
  },

  getWorkspaceUsers: async (): Promise<{ success: boolean; data: any[] }> => {
    return fetchJSON<{ success: boolean; data: any[] }>("/workspace/users");
  },

  assignUserRole: async (payload: {
    user_ref_id: string;
    usertype_ref_id: string;
    hospital_ref_id: string;
    branch_ref_id?: string;
    department_id?: string;
    is_primary?: boolean;
  }): Promise<{ success: boolean; data: any; message?: string }> => {
    return fetchJSON<{ success: boolean; data: any; message?: string }>("/workspace/assign-role", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  manageRolePermission: async (payload: {
    usertype_ref_id: string;
    permission_code: string;
    action: "ASSIGN" | "REVOKE";
  }): Promise<{ success: boolean; data: any; message?: string }> => {
    return fetchJSON<{ success: boolean; data: any; message?: string }>("/workspace/manage-permission", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
