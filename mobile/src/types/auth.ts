/**
 * ONEHEALTH ID (OH-ID) Mobile — Auth & User Domain Types
 * Matches backend/app/schemas/models.py and frontend/lib/types.ts
 */

export interface UserProfile {
  id?: string;
  user_ref_id?: string;
  username: string;
  name?: string;
  full_name?: string;
  email: string;
  role: string;
  usertype_ref_id?: string;
  hospital_id?: string;
  hospital_ref_id?: string;
  hospital_name?: string;
  tenant_name?: string;
  roles?: string[];
  permissions?: string[];
}

export interface LoginResponse {
  access_token?: string | null;
  token_type?: string;
  user: UserProfile;
}

export interface RegisterResponse {
  message: string;
  user_id: string;
  patient_id: string;
  onehealth_id: string;
  access_token?: string | null;
  token_type: string;
  user: UserProfile;
}

export interface WorkspaceDefinition {
  id: string;
  workspace_type: string;
  role_code: string;
  role_name: string;
  default_route: string;
  hospital_ref_id: string;
  hospital_name: string;
  tenant_id?: string;
  tenant_name?: string;
  is_primary?: boolean;
}

export interface WorkspaceResponse {
  user: UserProfile;
  workspace: WorkspaceDefinition;
  permissions: string[];
  available_workspaces: any[];
  available_hospitals: any[];
}
