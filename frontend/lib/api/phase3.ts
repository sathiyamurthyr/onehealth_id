import { fetchJSON } from "./client";
import {
  PharmacyPrescription,
  PharmacyDispensation,
  LabSample,
  LabResult,
  RadiologyOrder,
  RadiologyReport,
  NursingObservation,
  NursingNote,
  MedicationAdministration,
  Ward,
  Bed,
  InpatientAdmission,
  EmergencyEncounter,
  ClinicalReferral,
  DischargeSummary
} from "../types";

// =============================================================================
// 1. PHARMACY API
// =============================================================================

export const pharmacyApi = {
  listPrescriptions: async (params?: { hospital_id?: string; status?: string; patient_id?: string; search?: string }): Promise<PharmacyPrescription[]> => {
    const query = new URLSearchParams();
    if (params?.hospital_id) query.append("hospital_id", params.hospital_id);
    if (params?.status) query.append("status", params.status);
    if (params?.patient_id) query.append("patient_id", params.patient_id);
    if (params?.search) query.append("search", params.search);
    return fetchJSON<PharmacyPrescription[]>(`/api/v1/pharmacy/prescriptions?${query.toString()}`);
  },

  getPrescription: async (id: string): Promise<PharmacyPrescription> => {
    return fetchJSON<PharmacyPrescription>(`/api/v1/pharmacy/prescriptions/${id}`);
  },

  dispensePrescription: async (
    id: string,
    payload: {
      items: Array<{
        medicine_name: string;
        prescribed_quantity: number;
        dispensed_quantity: number;
        batch_number?: string;
        expiry_date?: string;
        instructions?: string;
        substituted_medicine?: string;
      }>;
      substitution_allowed?: boolean;
      notes?: string;
      is_partial?: boolean;
    }
  ): Promise<{ status: string; message: string; data: any }> => {
    return fetchJSON<{ status: string; message: string; data: any }>(`/api/v1/pharmacy/prescriptions/${id}/dispense`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  listDispensations: async (params?: { hospital_id?: string; patient_id?: string; prescription_id?: string }): Promise<PharmacyDispensation[]> => {
    const query = new URLSearchParams();
    if (params?.hospital_id) query.append("hospital_id", params.hospital_id);
    if (params?.patient_id) query.append("patient_id", params.patient_id);
    if (params?.prescription_id) query.append("prescription_id", params.prescription_id);
    return fetchJSON<PharmacyDispensation[]>(`/api/v1/pharmacy/dispensations?${query.toString()}`);
  }
};

// =============================================================================
// 2. LABORATORY API
// =============================================================================

export const labApi = {
  listOrders: async (params?: { hospital_id?: string; status?: string; patient_id?: string }): Promise<any[]> => {
    const query = new URLSearchParams();
    if (params?.hospital_id) query.append("hospital_id", params.hospital_id);
    if (params?.status) query.append("status", params.status);
    if (params?.patient_id) query.append("patient_id", params.patient_id);
    return fetchJSON<any[]>(`/api/v1/lab/orders?${query.toString()}`);
  },

  collectSample: async (payload: {
    order_id: string;
    patient_id: string;
    sample_type: string;
    accession_number?: string;
    notes?: string;
  }): Promise<{ status: string; message: string; data: LabSample }> => {
    return fetchJSON<{ status: string; message: string; data: LabSample }>("/api/v1/lab/samples/collect", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  listSamples: async (params?: { hospital_id?: string; order_id?: string; patient_id?: string }): Promise<LabSample[]> => {
    const query = new URLSearchParams();
    if (params?.hospital_id) query.append("hospital_id", params.hospital_id);
    if (params?.order_id) query.append("order_id", params.order_id);
    if (params?.patient_id) query.append("patient_id", params.patient_id);
    return fetchJSON<LabSample[]>(`/api/v1/lab/samples?${query.toString()}`);
  },

  recordResults: async (payload: {
    investigation_id: string;
    patient_id: string;
    sample_id?: string;
    method?: string;
    analytes: Array<{
      analyte_name: string;
      value: string;
      unit: string;
      reference_range?: string;
      abnormal_flag?: boolean;
      critical_flag?: boolean;
    }>;
    notes?: string;
    is_verified?: boolean;
  }): Promise<{ status: string; message: string; data: LabResult }> => {
    return fetchJSON<{ status: string; message: string; data: LabResult }>("/api/v1/lab/results", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  verifyResult: async (resultId: string): Promise<{ status: string; message: string; data: LabResult }> => {
    return fetchJSON<{ status: string; message: string; data: LabResult }>(`/api/v1/lab/results/${resultId}/verify`, {
      method: "POST"
    });
  },

  listResults: async (params?: { patient_id?: string; investigation_id?: string }): Promise<LabResult[]> => {
    const query = new URLSearchParams();
    if (params?.patient_id) query.append("patient_id", params.patient_id);
    if (params?.investigation_id) query.append("investigation_id", params.investigation_id);
    return fetchJSON<LabResult[]>(`/api/v1/lab/results?${query.toString()}`);
  }
};

// =============================================================================
// 3. RADIOLOGY & IMAGING API
// =============================================================================

export const radiologyApi = {
  listOrders: async (params?: { hospital_id?: string; status?: string; patient_id?: string }): Promise<RadiologyOrder[]> => {
    const query = new URLSearchParams();
    if (params?.hospital_id) query.append("hospital_id", params.hospital_id);
    if (params?.status) query.append("status", params.status);
    if (params?.patient_id) query.append("patient_id", params.patient_id);
    return fetchJSON<RadiologyOrder[]>(`/api/v1/radiology/orders?${query.toString()}`);
  },

  createOrder: async (payload: {
    patient_id: string;
    modality: string;
    body_part: string;
    clinical_indication: string;
    priority?: string;
    scheduled_time?: string;
  }): Promise<{ status: string; message: string; data: RadiologyOrder }> => {
    return fetchJSON<{ status: string; message: string; data: RadiologyOrder }>("/api/v1/radiology/orders", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  updateOrderStatus: async (
    orderId: string,
    payload: { status: string; dicom_study_uid?: string; pacs_accession_number?: string; notes?: string }
  ): Promise<{ status: string; message: string; data: RadiologyOrder }> => {
    return fetchJSON<{ status: string; message: string; data: RadiologyOrder }>(`/api/v1/radiology/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },

  getReport: async (orderId: string): Promise<RadiologyReport | null> => {
    return fetchJSON<RadiologyReport>(`/api/v1/radiology/reports/${orderId}`);
  },

  saveReport: async (payload: {
    order_id: string;
    patient_id: string;
    findings: string;
    impression: string;
    recommendations?: string;
    is_finalized?: boolean;
  }): Promise<{ status: string; message: string; data: RadiologyReport }> => {
    return fetchJSON<{ status: string; message: string; data: RadiologyReport }>("/api/v1/radiology/reports", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  finalizeReport: async (reportId: string): Promise<{ status: string; message: string; data: RadiologyReport }> => {
    return fetchJSON<{ status: string; message: string; data: RadiologyReport }>(`/api/v1/radiology/reports/${reportId}/finalize`, {
      method: "POST"
    });
  }
};

// =============================================================================
// 4. NURSING WORKSPACE API
// =============================================================================

export const nursingApi = {
  listAssignedPatients: async (params?: { hospital_id?: string; ward_id?: string }): Promise<any[]> => {
    const query = new URLSearchParams();
    if (params?.hospital_id) query.append("hospital_id", params.hospital_id);
    if (params?.ward_id) query.append("ward_id", params.ward_id);
    return fetchJSON<any[]>(`/api/v1/nursing/patients?${query.toString()}`);
  },

  recordVitals: async (payload: {
    patient_id: string;
    admission_id?: string;
    temperature_c?: number;
    heart_rate_bpm?: number;
    respiratory_rate?: number;
    systolic_bp?: number;
    diastolic_bp?: number;
    oxygen_saturation?: number;
    blood_glucose?: number;
    pain_score?: number;
    notes?: string;
  }): Promise<{ status: string; message: string; data: NursingObservation }> => {
    return fetchJSON<{ status: string; message: string; data: NursingObservation }>("/api/v1/nursing/observations", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  listVitals: async (patientId: string, admissionId?: string): Promise<NursingObservation[]> => {
    const query = new URLSearchParams({ patient_id: patientId });
    if (admissionId) query.append("admission_id", admissionId);
    return fetchJSON<NursingObservation[]>(`/api/v1/nursing/observations?${query.toString()}`);
  },

  createNote: async (payload: {
    patient_id: string;
    admission_id?: string;
    note_type: string;
    assessment: string;
    care_provided?: string;
    patient_response?: string;
    concerns?: string;
  }): Promise<{ status: string; message: string; data: NursingNote }> => {
    return fetchJSON<{ status: string; message: string; data: NursingNote }>("/api/v1/nursing/notes", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  listNotes: async (patientId: string, admissionId?: string): Promise<NursingNote[]> => {
    const query = new URLSearchParams({ patient_id: patientId });
    if (admissionId) query.append("admission_id", admissionId);
    return fetchJSON<NursingNote[]>(`/api/v1/nursing/notes?${query.toString()}`);
  },

  recordMedicationAdministration: async (payload: {
    prescription_id: string;
    patient_id: string;
    medicine_name: string;
    dose: string;
    route: string;
    status?: string;
    reason_not_administered?: string;
    admission_id?: string;
  }): Promise<{ status: string; message: string; data: MedicationAdministration }> => {
    return fetchJSON<{ status: string; message: string; data: MedicationAdministration }>("/api/v1/nursing/medication-administration", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  listMedicationAdministrations: async (patientId: string, admissionId?: string): Promise<MedicationAdministration[]> => {
    const query = new URLSearchParams({ patient_id: patientId });
    if (admissionId) query.append("admission_id", admissionId);
    return fetchJSON<MedicationAdministration[]>(`/api/v1/nursing/medication-administration?${query.toString()}`);
  }
};

// =============================================================================
// 5. IPD, WARDS & BED MANAGEMENT API
// =============================================================================

export const ipdApi = {
  listWards: async (hospitalId?: string): Promise<Ward[]> => {
    const query = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : "";
    return fetchJSON<Ward[]>(`/api/v1/ipd/wards${query}`);
  },

  listBeds: async (params?: { hospital_id?: string; ward_id?: string; status?: string }): Promise<Bed[]> => {
    const query = new URLSearchParams();
    if (params?.hospital_id) query.append("hospital_id", params.hospital_id);
    if (params?.ward_id) query.append("ward_id", params.ward_id);
    if (params?.status) query.append("status", params.status);
    return fetchJSON<Bed[]>(`/api/v1/ipd/beds?${query.toString()}`);
  },

  allocateBed: async (
    bedId: string,
    payload: { admission_id: string; patient_id: string; reason?: string }
  ): Promise<{ status: string; message: string; data: Bed }> => {
    return fetchJSON<{ status: string; message: string; data: Bed }>(`/api/v1/ipd/beds/${bedId}/allocate`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  transferBed: async (
    bedId: string,
    payload: { destination_bed_id: string; admission_id: string; patient_id: string; reason?: string }
  ): Promise<{ status: string; message: string; data: any }> => {
    return fetchJSON<{ status: string; message: string; data: any }>(`/api/v1/ipd/beds/${bedId}/transfer`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  releaseBed: async (bedId: string, reason?: string): Promise<{ status: string; message: string }> => {
    return fetchJSON<{ status: string; message: string }>(`/api/v1/ipd/beds/${bedId}/release`, {
      method: "POST",
      body: JSON.stringify({ reason: reason || "Discharge" })
    });
  },

  listAdmissions: async (params?: { hospital_id?: string; status?: string; patient_id?: string }): Promise<InpatientAdmission[]> => {
    const query = new URLSearchParams();
    if (params?.hospital_id) query.append("hospital_id", params.hospital_id);
    if (params?.status) query.append("status", params.status);
    if (params?.patient_id) query.append("patient_id", params.patient_id);
    return fetchJSON<InpatientAdmission[]>(`/api/v1/ipd/admissions?${query.toString()}`);
  },

  createAdmission: async (payload: {
    patient_id: string;
    department?: string;
    specialty?: string;
    admission_type?: string;
    reason_for_admission: string;
    provisional_diagnosis?: string;
  }): Promise<{ status: string; message: string; data: InpatientAdmission }> => {
    return fetchJSON<{ status: string; message: string; data: InpatientAdmission }>("/api/v1/ipd/admissions", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  getOccupancyDashboard: async (hospitalId?: string): Promise<any> => {
    const query = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : "";
    return fetchJSON<any>(`/api/v1/ipd/occupancy-dashboard${query}`);
  }
};

// =============================================================================
// 6. EMERGENCY INTAKE & TRIAGE API
// =============================================================================

export const emergencyApi = {
  listEncounters: async (params?: { hospital_id?: string; status?: string; emergency_category?: string }): Promise<EmergencyEncounter[]> => {
    const query = new URLSearchParams();
    if (params?.hospital_id) query.append("hospital_id", params.hospital_id);
    if (params?.status) query.append("status", params.status);
    if (params?.emergency_category) query.append("emergency_category", params.emergency_category);
    return fetchJSON<EmergencyEncounter[]>(`/api/v1/emergency/encounters?${query.toString()}`);
  },

  registerIntake: async (payload: {
    patient_id?: string;
    is_anonymous_patient?: boolean;
    temporary_identity_code?: string;
    arrival_mode?: string;
    emergency_category: string;
    presenting_complaint: string;
    triage_score?: number;
    triage_notes?: string;
  }): Promise<{ status: string; message: string; data: EmergencyEncounter }> => {
    return fetchJSON<{ status: string; message: string; data: EmergencyEncounter }>("/api/v1/emergency/encounters", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  recordTriage: async (
    encounterId: string,
    payload: {
      emergency_category: string;
      triage_score: number;
      triage_notes?: string;
      vitals?: {
        temperature_c?: number;
        heart_rate_bpm?: number;
        respiratory_rate?: number;
        systolic_bp?: number;
        diastolic_bp?: number;
        oxygen_saturation?: number;
        pain_score?: number;
      };
    }
  ): Promise<{ status: string; message: string; data: EmergencyEncounter }> => {
    return fetchJSON<{ status: string; message: string; data: EmergencyEncounter }>(`/api/v1/emergency/encounters/${encounterId}/triage`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  updateDisposition: async (
    encounterId: string,
    payload: { disposition: string; notes?: string }
  ): Promise<{ status: string; message: string; data: EmergencyEncounter }> => {
    return fetchJSON<{ status: string; message: string; data: EmergencyEncounter }>(`/api/v1/emergency/encounters/${encounterId}/disposition`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },

  reconcilePatient: async (
    encounterId: string,
    payload: { patient_id: string; onehealth_id?: string }
  ): Promise<{ status: string; message: string; data: EmergencyEncounter }> => {
    return fetchJSON<{ status: string; message: string; data: EmergencyEncounter }>(`/api/v1/emergency/encounters/${encounterId}/reconcile`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};

// =============================================================================
// 7. CLINICAL REFERRALS API
// =============================================================================

export const referralsApi = {
  listReferrals: async (params?: { hospital_id?: string; patient_id?: string; status?: string }): Promise<ClinicalReferral[]> => {
    const query = new URLSearchParams();
    if (params?.hospital_id) query.append("hospital_id", params.hospital_id);
    if (params?.patient_id) query.append("patient_id", params.patient_id);
    if (params?.status) query.append("status", params.status);
    return fetchJSON<ClinicalReferral[]>(`/api/v1/referrals?${query.toString()}`);
  },

  createReferral: async (payload: {
    patient_id: string;
    destination_hospital_id?: string;
    destination_facility_name?: string;
    specialty_needed: string;
    reason_for_referral: string;
    urgency?: string;
    clinical_summary?: string;
  }): Promise<{ status: string; message: string; data: ClinicalReferral }> => {
    return fetchJSON<{ status: string; message: string; data: ClinicalReferral }>("/api/v1/referrals", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  updateStatus: async (
    referralId: string,
    payload: { status: string; notes?: string }
  ): Promise<{ status: string; message: string; data: ClinicalReferral }> => {
    return fetchJSON<{ status: string; message: string; data: ClinicalReferral }>(`/api/v1/referrals/${referralId}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }
};

// =============================================================================
// 8. DISCHARGE SUMMARIES & BED RELEASE API
// =============================================================================

export const dischargesApi = {
  getDischargeSummary: async (admissionId: string): Promise<DischargeSummary> => {
    return fetchJSON<DischargeSummary>(`/api/v1/discharges/${admissionId}`);
  },

  saveDischargeSummary: async (payload: {
    admission_id: string;
    patient_id: string;
    diagnosis: string;
    discharge_type?: string;
    condition_at_discharge?: string;
    clinical_summary?: string;
    procedures_performed?: string[];
    discharge_medications?: Array<{
      medicine_name: string;
      dose: string;
      frequency: string;
      duration: string;
      instructions?: string;
    }>;
    follow_up_instructions?: string;
    status?: string;
  }): Promise<{ status: string; message: string; data: DischargeSummary }> => {
    return fetchJSON<{ status: string; message: string; data: DischargeSummary }>("/api/v1/discharges", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  finalizeDischargeSummary: async (dischargeId: string): Promise<{ status: string; message: string; data: DischargeSummary }> => {
    return fetchJSON<{ status: string; message: string; data: DischargeSummary }>(`/api/v1/discharges/${dischargeId}/finalize`, {
      method: "POST"
    });
  }
};
