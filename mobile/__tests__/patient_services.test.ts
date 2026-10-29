/**
 * ONEHEALTH ID (OH-ID) Mobile — Patient API Services Test Suite
 * Sathus Technology Pvt Ltd
 */

import { patientApi } from "../src/services/api/patient";
import * as client from "../src/services/api/client";

describe("Patient API Service", () => {
  let fetchJSONSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchJSONSpy = jest.spyOn(client, "fetchJSON");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("getOhIdCard calls /me/oh-id and unwraps data", async () => {
    const mockCard = {
      onehealth_id: "OHID-KEDAR-2026-001",
      qr_token: "ZKP-TOKEN-ABC123XYZ",
      name: "Sathish Kumar",
      dob: "1994-05-12",
      gender: "Male",
      blood_group: "O+",
      verification_status: "VERIFIED_ACTIVE",
      facilities_count: 2,
    };

    fetchJSONSpy.mockResolvedValueOnce({
      status: "success",
      data: mockCard,
    });

    const result = await patientApi.getOhIdCard();
    expect(fetchJSONSpy).toHaveBeenCalledWith("/me/oh-id");
    expect(result.onehealth_id).toBe("OHID-KEDAR-2026-001");
    expect(result.name).toBe("Sathish Kumar");
    expect(result.blood_group).toBe("O+");
  });

  it("getOhIdCard appends patient_id query when specified", async () => {
    fetchJSONSpy.mockResolvedValueOnce({
      status: "success",
      data: { onehealth_id: "OHID-DEP-01" },
    });

    await patientApi.getOhIdCard("p-dependent-123");
    expect(fetchJSONSpy).toHaveBeenCalledWith("/me/oh-id?patient_id=p-dependent-123");
  });

  it("getQrPass calls /me/qr endpoint", async () => {
    fetchJSONSpy.mockResolvedValueOnce({
      status: "success",
      data: {
        onehealth_id: "OHID-DEMO",
        qr_token: "ZKP-778899",
        name: "Test Patient",
      },
    });

    const result = await patientApi.getQrPass();
    expect(fetchJSONSpy).toHaveBeenCalledWith("/me/qr");
    expect(result.qr_token).toBe("ZKP-778899");
  });

  it("rotateQrToken calls /me/qr/rotate for self by default", async () => {
    fetchJSONSpy.mockResolvedValueOnce({
      status: "success",
      data: {
        onehealth_id: "OHID-DEMO",
        qr_token: "ZKP-NEW-ROTATED-TOKEN",
      },
    });

    const result = await patientApi.rotateQrToken();
    expect(fetchJSONSpy).toHaveBeenCalledWith("/me/qr/rotate", { method: "POST" });
    expect(result.qr_token).toBe("ZKP-NEW-ROTATED-TOKEN");
  });

  it("rotateQrToken calls /patients/{patientId}/qr/rotate when patientId provided", async () => {
    fetchJSONSpy.mockResolvedValueOnce({
      status: "success",
      data: {
        onehealth_id: "OHID-DEP-01",
        qr_token: "ZKP-ROTATED-DEP",
      },
    });

    const result = await patientApi.rotateQrToken("p-456");
    expect(fetchJSONSpy).toHaveBeenCalledWith("/patients/p-456/qr/rotate", { method: "POST" });
    expect(result.qr_token).toBe("ZKP-ROTATED-DEP");
  });

  it("getPrescriptions fetches active prescriptions and returns array", async () => {
    const mockPrescriptions = [
      {
        id: "rx-001",
        prescription_code: "RX-2026-001",
        date: "2026-10-25",
        doctor_name: "Dr. Kedar Nathan",
        hospital_name: "Kedar Multi-Specialty Hospital",
        status: "ACTIVE",
        medicines: [
          { name: "Amoxicillin", dosage: "500mg", frequency: "TDS", duration: "5 days" },
        ],
      },
    ];

    fetchJSONSpy.mockResolvedValueOnce({
      status: "success",
      data: mockPrescriptions,
    });

    const result = await patientApi.getPrescriptions("ACTIVE");
    expect(fetchJSONSpy).toHaveBeenCalledWith("/me/prescriptions?status=ACTIVE");
    expect(result).toHaveLength(1);
    expect(result[0].medicines[0].name).toBe("Amoxicillin");
  });

  it("getAppointments calls /appointments endpoint", async () => {
    const mockAppointments = [
      {
        id: "appt-01",
        appointment_date: "2026-10-29",
        appointment_time: "10:30 AM",
        doctor_name: "Dr. Ananya Sharma",
        department: "Cardiology",
        hospital_name: "Apollo Speciality",
        token_number: 14,
        token_str: "OPD-CARDIO-14",
        status: "CONFIRMED",
      },
    ];

    fetchJSONSpy.mockResolvedValueOnce(mockAppointments);

    const result = await patientApi.getAppointments();
    expect(fetchJSONSpy).toHaveBeenCalledWith("/appointments");
    expect(result).toHaveLength(1);
    expect(result[0].doctor_name).toBe("Dr. Ananya Sharma");
    expect(result[0].token_number).toBe(14);
  });

  it("getHealthTimeline queries unified clinical events with parameters", async () => {
    const mockTimeline = [
      {
        id: "evt-01",
        event_type: "CONSULTATION",
        event_date: "2026-10-20",
        title: "Cardiology Consultation",
        doctor_name: "Dr. Sharma",
        hospital_name: "Apollo",
        summary: "Normal ECG; BP 120/80 mmHg.",
      },
    ];

    fetchJSONSpy.mockResolvedValueOnce({
      status: "success",
      data: mockTimeline,
    });

    const result = await patientApi.getHealthTimeline({ type: "CONSULTATION", limit: 20 });
    expect(fetchJSONSpy).toHaveBeenCalledWith("/me/health-timeline?type=CONSULTATION&limit=20");
    expect(result).toHaveLength(1);
    expect(result[0].event_type).toBe("CONSULTATION");
  });

  it("getProfile calls /patients/{id}", async () => {
    const mockProfile = {
      id: "p-100",
      name: "Sathish Kumar",
      onehealth_id: "OHID-100",
      age: 32,
      blood_group: "O+",
    };

    fetchJSONSpy.mockResolvedValueOnce(mockProfile);

    const result = await patientApi.getProfile("p-100");
    expect(fetchJSONSpy).toHaveBeenCalledWith("/patients/p-100");
    expect(result.name).toBe("Sathish Kumar");
  });
});
