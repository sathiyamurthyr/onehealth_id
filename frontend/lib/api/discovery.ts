import { fetchJSON } from "./client";

export interface SpecialtyItem {
  id: string;
  name: string;
  category: string;
  display_order: number;
  description?: string;
  is_active: boolean;
}

export interface SymptomMappingItem {
  id: string;
  problem_title: string;
  category: string;
  specialty_names: string[];
  keywords: string[];
  icon?: string;
  display_order: number;
}

export interface ProviderItem {
  id: string;
  name: string;
  code: string;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  pin_code?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  review_count?: number;
  is_active?: boolean;
  is_verified?: boolean;
  verification_status?: string;
  booking_enabled?: boolean;
  consultation_fee?: number;
  featured_badge?: string;
  phone?: string;
  email?: string;
  distance_km?: number;
  next_available_slot?: string;
  specialties?: Array<{
    id: string;
    name: string;
    category: string;
    department_id?: string;
  }>;
  doctors?: Array<{
    id: string;
    name: string;
    specialty: string;
    qualification?: string;
    experience_years?: number;
    rating?: number;
    consultation_fee?: number;
    department_id?: string;
  }>;
}

export interface ProviderDetailResponse extends ProviderItem {
  departments: Array<{
    id: string;
    name: string;
    code?: string;
    specialties: Array<{ id: string; name: string; category: string }>;
  }>;
  doctors: Array<{
    id: string;
    name: string;
    specialty: string;
    qualification?: string;
    experience_years?: number;
    rating?: number;
    consultation_fee?: number;
    room_number?: string;
    department_id?: string;
    department_name?: string;
    bio?: string;
    available_days?: string[];
    is_available: boolean;
  }>;
  appointment_types: Array<{
    id: string;
    name: string;
    description: string;
    fee: number;
  }>;
}

export interface SlotItem {
  time: string;
  period: string;
  session: string;
  date: string;
  slot_value: string;
  is_available: boolean;
  doctor_id?: string;
}

export const discoveryApi = {
  getSpecialties: (category?: string, search?: string) => {
    const q = new URLSearchParams();
    if (category) q.set("category", category);
    if (search) q.set("search", search);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: SpecialtyItem[] }>(`/discovery/specialties${qs ? `?${qs}` : ""}`);
  },

  getSymptoms: (category?: string, search?: string) => {
    const q = new URLSearchParams();
    if (category) q.set("category", category);
    if (search) q.set("search", search);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: SymptomMappingItem[] }>(`/discovery/symptoms${qs ? `?${qs}` : ""}`);
  },

  searchProviders: (params?: {
    query?: string;
    specialty?: string;
    category?: string;
    location?: string;
    city?: string;
    area?: string;
    pin_code?: string;
    latitude?: number;
    longitude?: number;
    radius_km?: number;
    sort_by?: "recommended" | "nearest" | "earliest";
  }) => {
    const q = new URLSearchParams();
    if (params?.query) q.set("query", params.query);
    if (params?.specialty) q.set("specialty", params.specialty);
    if (params?.category) q.set("category", params.category);
    if (params?.location) q.set("location", params.location);
    if (params?.city) q.set("city", params.city);
    if (params?.area) q.set("area", params.area);
    if (params?.pin_code) q.set("pin_code", params.pin_code);
    if (params?.latitude !== undefined) q.set("latitude", String(params.latitude));
    if (params?.longitude !== undefined) q.set("longitude", String(params.longitude));
    if (params?.radius_km !== undefined) q.set("radius_km", String(params.radius_km));
    if (params?.sort_by) q.set("sort_by", params.sort_by);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: ProviderItem[]; message?: string }>(`/discovery/providers${qs ? `?${qs}` : ""}`);
  },

  getProvider: (hospitalId: string) =>
    fetchJSON<{ success: boolean; data: ProviderDetailResponse }>(`/discovery/providers/${hospitalId}`),

  getDoctors: (params?: { hospital_id?: string; department_id?: string; specialty?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.hospital_id) q.set("hospital_id", params.hospital_id);
    if (params?.department_id) q.set("department_id", params.department_id);
    if (params?.specialty) q.set("specialty", params.specialty);
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    return fetchJSON<{ success: boolean; data: any[] }>(`/discovery/doctors${qs ? `?${qs}` : ""}`);
  },

  getSlots: (doctorId: string, date: string, hospitalId?: string, departmentId?: string) => {
    const q = new URLSearchParams();
    q.set("doctor_id", doctorId);
    q.set("date", date);
    if (hospitalId) q.set("hospital_id", hospitalId);
    if (departmentId) q.set("department_id", departmentId);
    return fetchJSON<{ success: boolean; data: SlotItem[] }>(`/discovery/slots?${q.toString()}`);
  },
};
