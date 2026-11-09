/**
 * ONEHEALTH ID (OH-ID) Mobile — Nurse API Service
 * Sathus Technology Pvt Ltd
 */

import { fetchJSON } from "./client";
import { InpatientItem, VitalsBatchPayload, MedicationAdminPayload, NursingNotePayload } from "../../types/nurse";

function unwrap<T>(res: any): T {
  if (res && typeof res === "object" && "data" in res) {
    return res.data as T;
  }
  return res as T;
}

export const nurseApi = {
  /**
   * Retrieves assigned inpatients / patients for triage & vitals.
   */
  async getPatients(hospitalId?: string): Promise<InpatientItem[]> {
    const query = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : "";
    const res = await fetchJSON<any>(`/nursing/patients${query}`);
    const items = unwrap<any[]>(res);
    return Array.isArray(items) ? items : [];
  },

  /**
   * Records a full battery of vitals for a patient.
   */
  async recordVitalsBatch(payload: VitalsBatchPayload): Promise<any> {
    const res = await fetchJSON<any>("/nursing/vitals/batch", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return unwrap<any>(res);
  },

  /**
   * Retrieves vital signs observations history for a patient.
   */
  async getObservations(patientId: string): Promise<any[]> {
    const res = await fetchJSON<any>(`/nursing/observations?patient_id=${encodeURIComponent(patientId)}`);
    const items = unwrap<any[]>(res);
    return Array.isArray(items) ? items : [];
  },

  /**
   * Confirms medication administration (MAR).
   */
  async recordMedication(payload: MedicationAdminPayload): Promise<any> {
    const res = await fetchJSON<any>("/nursing/medication-administrations", {
      method: "POST",
      body: JSON.stringify({
        prescription_id: payload.prescription_id || "rx-general",
        ...payload,
      }),
    });
    return unwrap<any>(res);
  },

  /**
   * Retrieves nursing notes for a patient.
   */
  async getNotes(patientId: string): Promise<any[]> {
    const res = await fetchJSON<any>(`/nursing/notes?patient_id=${encodeURIComponent(patientId)}`);
    const items = unwrap<any[]>(res);
    return Array.isArray(items) ? items : [];
  },

  /**
   * Records a nursing shift note.
   */
  async recordNote(payload: NursingNotePayload): Promise<any> {
    const res = await fetchJSON<any>("/nursing/notes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return unwrap<any>(res);
  },
};

