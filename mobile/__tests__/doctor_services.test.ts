/**
 * ONEHEALTH ID (OH-ID) Mobile — Doctor API Services Test Suite
 * Sathus Technology Pvt Ltd
 */

import { doctorApi } from "../src/services/api/doctor";
import * as client from "../src/services/api/client";

describe("Doctor API Service", () => {
  let fetchJSONSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchJSONSpy = jest.spyOn(client, "fetchJSON");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("getProfile calls /doctors/me and unwraps doctor metadata", async () => {
    const mockDoctor = {
      id: "doc-101",
      user_id: "9876543210",
      name: "Dr. Senthil Kumar",
      specialty: "General Medicine",
      qualification: "MBBS, MD",
      registration_number: "TN-MCI-2026-64829",
      current_hospital_id: "hosp-kedar",
      current_hospital_name: "Kedar Multi-Specialty Hospital",
    };

    fetchJSONSpy.mockResolvedValueOnce(mockDoctor);

    const result = await doctorApi.getProfile();
    expect(fetchJSONSpy).toHaveBeenCalledWith("/doctors/me");
    expect(result.id).toBe("doc-101");
    expect(result.name).toBe("Dr. Senthil Kumar");
    expect(result.registration_number).toBe("TN-MCI-2026-64829");
  });

  it("getQueue calls /doctors/me/queue and returns queue tokens", async () => {
    const mockQueue = [
      {
        id: "q-01",
        token_number: 1,
        token_str: "OPD-GEN-01",
        patient_id: "p-101",
        patient_name: "Aakash Verma",
        priority: "URGENT",
        status: "WAITING",
      },
    ];

    fetchJSONSpy.mockResolvedValueOnce(mockQueue);

    const result = await doctorApi.getQueue();
    expect(fetchJSONSpy).toHaveBeenCalledWith("/doctors/me/queue");
    expect(result).toHaveLength(1);
    expect(result[0].token_str).toBe("OPD-GEN-01");
    expect(result[0].priority).toBe("URGENT");
  });

  it("getPatientContext queries patient clinical overview and pre-intake", async () => {
    const mockContext = {
      demographics: { name: "Aakash Verma", age: 42 },
      known_allergies: "None",
      recent_vitals: { bp: "120/80", pulse: 72 },
    };

    fetchJSONSpy.mockResolvedValueOnce({
      status: "success",
      data: mockContext,
    });

    const result = await doctorApi.getPatientContext("p-101");
    expect(fetchJSONSpy).toHaveBeenCalledWith("/doctor/patients/p-101/context");
    expect(result.demographics.name).toBe("Aakash Verma");
  });

  it("recordConsultation posts consultation payload and returns digital signature", async () => {
    const mockEncounter = {
      message: "Consultation encounter successfully finalized and recorded.",
      consultation_id: "c-999",
      digital_signature: "SHA256:4f8e91a0c8d7...VERIFIED",
    };

    fetchJSONSpy.mockResolvedValueOnce(mockEncounter);

    const payload = {
      diagnosis: "Acute Bronchitis",
      symptoms: "Fever and cough",
      vitals: { bp_systolic: "120", bp_diastolic: "80" },
    };

    const result = await doctorApi.recordConsultation("p-101", payload);
    expect(fetchJSONSpy).toHaveBeenCalledWith(
      "/doctor/patients/p-101/consultation",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(result.consultation_id).toBe("c-999");
    expect(result.digital_signature).toBe("SHA256:4f8e91a0c8d7...VERIFIED");
  });

  it("createPrescription calls /prescriptions with 4-digit PIN", async () => {
    fetchJSONSpy.mockResolvedValueOnce({
      status: "success",
      prescription_id: "rx-signed-001",
      digital_signature: "SHA256:sig123",
      message: "Prescription created and signed",
    });

    const payload = {
      patient_id: "p-101",
      diagnosis: "Essential Hypertension",
      requires_pin: true,
      verification_pin: "1234",
      items: [
        { medicine_name: "Amlodipine", strength: "5mg", frequency: "1-0-0", duration_days: 30 },
      ],
    };

    const result = await doctorApi.createPrescription(payload);
    expect(fetchJSONSpy).toHaveBeenCalledWith(
      "/prescriptions",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(result.prescription_id).toBe("rx-signed-001");
  });

  it("resolveQrWorkflow resolves scanned code to patient identity", async () => {
    fetchJSONSpy.mockResolvedValueOnce({
      workflow_type: "OPD_CONSULTATION",
      patient: {
        id: "p-501",
        name: "Deepika Padukone",
        onehealth_id: "OHID-DEEPIKA-01",
        age: 38,
        gender: "Female",
        blood_group: "B+",
      },
      message: "Patient identity verified successfully.",
    });

    const result = await doctorApi.resolveQrWorkflow("https://ohid.online/scan/ZKP-TOKEN-XYZ");
    expect(fetchJSONSpy).toHaveBeenCalledWith(
      "/patients/qr/scan-workflow",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(result.patient_id).toBe("p-501");
    expect(result.patient_name).toBe("Deepika Padukone");
    expect(result.blood_group).toBe("B+");
  });

  it("updateQueueStatus patches appointment status", async () => {
    fetchJSONSpy.mockResolvedValueOnce({ status: "success" });

    const result = await doctorApi.updateQueueStatus("q-01", "IN_CONSULTATION");
    expect(fetchJSONSpy).toHaveBeenCalledWith(
      "/appointments/q-01/status",
      expect.objectContaining({
        method: "PATCH",
      })
    );
    expect(result.success).toBe(true);
    expect(result.status).toBe("IN_CONSULTATION");
  });
});
