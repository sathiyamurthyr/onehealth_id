import { fetchJSON } from "./client";

export interface AuthorizedHospitalMembership {
  hospital_id: string;
  hospital_ref_id: string;
  hospital_name: string;
  hospital_code: string;
  branch_ref_id?: string;
  branch_name?: string;
  department_id?: string;
  department_name?: string;
  role: string;
  is_active: boolean;
}

export interface UserMeProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  hospital_ref_id: string;
  hospital_name: string;
  doctor?: {
    id: string;
    name: string;
    specialty: string;
    registration_number?: string;
  };
  authorized_hospitals: AuthorizedHospitalMembership[];
}

export const meApi = {
  getProfile: async () => {
    return fetchJSON<UserMeProfile>("/me");
  },

  getHospitals: async () => {
    const list = await fetchJSON<any[]>("/me/hospitals");
    return (list || []).map((h) => ({
      ...h,
      hospital_ref_id: h.hospital_ref_id || h.hospital_id,
      hospital_id: h.hospital_id || h.hospital_ref_id,
      branch_ref_id: h.branch_ref_id || h.branch_id,
      branch_id: h.branch_id || h.branch_ref_id,
    })) as AuthorizedHospitalMembership[];
  },

  switchHospitalContext: async (hospitalId: string, branchId?: string, departmentId?: string) => {
    const res = await fetchJSON<{
      access_token?: string;
      token_type?: string;
      active_hospital_id: string;
      active_hospital_name: string;
      doctor_id?: string;
      role: string;
    }>("/me/hospital-context", {
      method: "POST",
      body: JSON.stringify({
        hospital_id: hospitalId,
        branch_id: branchId,
        department_id: departmentId,
      }),
    });

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("oh_access_token");
      } catch {
        // Ignore storage restrictions
      }
    }
    return res;
  },
};
