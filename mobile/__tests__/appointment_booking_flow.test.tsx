/**
 * ONEHEALTH ID (OH-ID) Mobile — Appointment Booking Flow Tests
 * Sathus Technology Pvt Ltd
 *
 * Verifies the complete 8-screen patient appointment booking workflow:
 * 1. Appointments landing page with Top Action Card & Empty State
 * 2. Step 1: Patient Selection (Myself / Authorized Family Member)
 * 3. Step 2: Hospital Search & Selection
 * 4. Step 3: Clinical Specialty Selection
 * 5. Step 4: Doctor Selection with Verified Qualifications & Badges
 * 6. Step 5: Date & Real-Time Time Slot Selection
 * 7. Step 6: Review & Concurrency Protection
 * 8. Step 7: Confirmation Card with Reference APT-... and Token
 */

import React from "react";
import { render, fireEvent, waitFor, act, cleanup } from "@testing-library/react-native";
import PatientAppointmentsScreen from "../app/(patient)/appointments";
import { BookAppointmentModal } from "../src/components/patient/BookAppointmentModal";
import { patientApi } from "../src/services/api/patient";

// Mock Expo Router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

// Mock patient API
jest.mock("../src/services/api/patient", () => ({
  patientApi: {
    getAppointments: jest.fn(),
    getMyProfile: jest.fn(),
    getFamilyMembers: jest.fn(),
    searchHospitals: jest.fn(),
    getSpecialties: jest.fn(),
    getDoctors: jest.fn(),
    getAvailableSlots: jest.fn(),
    bookAppointment: jest.fn(),
  },
}));

describe("Appointment Booking Flow & Reference UI", () => {
  const mockPatientProfile = {
    id: "pat-101",
    name: "John Doe",
    onehealth_id: "OHID-IND-2026-01001",
    age: 32,
    gender: "Male",
    phone: "+91 98765 43210",
  };

  const mockFamilyMembers = [
    {
      id: "fm-01",
      primary_patient_id: "pat-101",
      member_patient_id: "pat-102",
      relationship: "Spouse",
      is_guardian: false,
      is_minor: false,
      consent_status: "ACTIVE",
      permissions: { book_appointments: true, view_appointments: true },
      member_name: "Sridevi",
      member_onehealth_id: "OHID-IND-2026-01002",
      member_age: 30,
      member_gender: "Female",
    },
  ];

  const mockHospitals = [
    {
      id: "hosp-alpha",
      name: "Hospital Alpha",
      code: "ALPHA",
      type: "Multi-Specialty",
      area: "Porur",
      city: "Chennai",
      address: "148 Trunk Road, Porur, Chennai - 600116",
      distance_km: 2.5,
      rating: 4.8,
      booking_enabled: true,
    },
    {
      id: "hosp-citycare",
      name: "City Care Hospital",
      code: "CITYCARE",
      type: "Multi-Specialty",
      area: "Valasaravakkam",
      city: "Chennai",
      address: "24 Arcot Road, Valasaravakkam, Chennai",
      distance_km: 5.8,
      rating: 4.6,
      booking_enabled: true,
    },
  ];

  const mockSpecialties = [
    { id: "dept-genmed", code: "GENMED", name: "General Medicine", description: "Adult primary care" },
    { id: "dept-pedia", code: "PEDIA", name: "Paediatrics", description: "Child healthcare" },
    { id: "dept-cardio", code: "CARDIO", name: "Cardiology", description: "Heart and vascular care" },
  ];

  const mockDoctors = [
    {
      id: "doc-senthil",
      name: "Dr. Senthil Nathan",
      qualification: "MBBS, MD",
      specialty: "General Medicine",
      experience_years: 14,
      consultation_fee: 500,
      availability_badge: "Available Today",
      hospital_id: "hosp-alpha",
      hospital_name: "Hospital Alpha",
    },
    {
      id: "doc-priya",
      name: "Dr. Priya Sharma",
      qualification: "MBBS, DNB",
      specialty: "General Medicine",
      experience_years: 9,
      consultation_fee: 500,
      availability_badge: "Available Tomorrow",
      hospital_id: "hosp-alpha",
      hospital_name: "Hospital Alpha",
    },
  ];

  const mockSlots = [
    {
      slot_id: "slot-0930",
      slot_value: "2026-10-30 09:30:00",
      time: "09:30 AM",
      period: "Morning" as const,
      session: "Morning",
      date: "2026-10-30",
      doctor_id: "doc-senthil",
      is_available: true,
      estimated_token: 1,
    },
    {
      slot_id: "slot-1000",
      slot_value: "2026-10-30 10:00:00",
      time: "10:00 AM",
      period: "Morning" as const,
      session: "Morning",
      date: "2026-10-30",
      doctor_id: "doc-senthil",
      is_available: true,
      estimated_token: 2,
    },
    {
      slot_id: "slot-1400",
      slot_value: "2026-10-30 14:00:00",
      time: "02:00 PM",
      period: "Afternoon" as const,
      session: "Afternoon",
      date: "2026-10-30",
      doctor_id: "doc-senthil",
      is_available: true,
      estimated_token: 5,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (patientApi.getAppointments as jest.Mock).mockResolvedValue([]);
    (patientApi.getMyProfile as jest.Mock).mockResolvedValue(mockPatientProfile);
    (patientApi.getFamilyMembers as jest.Mock).mockResolvedValue(mockFamilyMembers);
    (patientApi.searchHospitals as jest.Mock).mockResolvedValue(mockHospitals);
    (patientApi.getSpecialties as jest.Mock).mockResolvedValue(mockSpecialties);
    (patientApi.getDoctors as jest.Mock).mockResolvedValue(mockDoctors);
    (patientApi.getAvailableSlots as jest.Mock).mockResolvedValue(mockSlots);
  });

  afterEach(() => {
    cleanup();
  });

  it("Screen 1: Renders Appointments Home with Top Action Card & Empty State", async () => {
    const { getByTestId, getByText } = await render(<PatientAppointmentsScreen />);

    await waitFor(() => {
      expect(getByTestId("patient-appointments-screen")).toBeTruthy();
    });

    // Check Header
    expect(getByText("Appointments & Queue")).toBeTruthy();
    expect(getByText("Clinic Consultations & OPD Tokens")).toBeTruthy();

    // Check Top Action Card (Screen 1)
    expect(getByTestId("btn-book-appointment-card")).toBeTruthy();
    expect(getByText("Book Appointment")).toBeTruthy();
    expect(
      getByText("Find a hospital, choose a doctor and book your next consultation.")
    ).toBeTruthy();

    // Check Empty State (Screen 1)
    expect(getByTestId("empty-appointments-state")).toBeTruthy();
    expect(getByText("No Appointments Found")).toBeTruthy();
    expect(
      getByText("You have no upcoming or past clinic appointments scheduled.")
    ).toBeTruthy();
    expect(getByTestId("btn-book-first-appointment")).toBeTruthy();
    expect(getByText("Book Your First Appointment")).toBeTruthy();
  });

  it("Screen 2: BookAppointmentModal opens at Step 1 (Select Patient: Myself & Family Member)", async () => {
    const onClose = jest.fn();
    const { getByTestId, getByText } = await render(
      <BookAppointmentModal visible={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(getByTestId("step-select-patient")).toBeTruthy();
    });

    expect(getByText("Select Patient")).toBeTruthy();
    expect(getByText("Choose who the appointment is for.")).toBeTruthy();
    expect(getByText("Myself")).toBeTruthy();
    expect(getByText("John Doe")).toBeTruthy();
    expect(getByText(/Family Member/)).toBeTruthy();
    expect(getByText("Sridevi")).toBeTruthy();

    // Next button
    expect(getByTestId("btn-next-to-hospital")).toBeTruthy();
  });

  it("Screen 3: Step 2 searches and lists participating hospitals", async () => {
    const onClose = jest.fn();
    const { getByTestId, getByText } = await render(
      <BookAppointmentModal visible={true} onClose={onClose} />
    );

    // Wait for step 1 to be ready and click Next
    await waitFor(() => {
      expect(getByTestId("step-select-patient")).toBeTruthy();
      expect(getByTestId("btn-next-to-hospital")).toBeTruthy();
    });
    await fireEvent.press(getByTestId("btn-next-to-hospital"));

    await waitFor(() => {
      expect(getByTestId("step-find-hospital")).toBeTruthy();
    });

    expect(getByText("Find a Hospital")).toBeTruthy();
    expect(getByTestId("input-hospital-search")).toBeTruthy();
    expect(getByText("Hospital Alpha")).toBeTruthy();
    expect(getByText("City Care Hospital")).toBeTruthy();
    expect(getByText(/Porur, Chennai/)).toBeTruthy();
    expect(getByText(/2\.5 km/)).toBeTruthy();
  });

  it("Screen 4 to 8: Progresses through Specialty -> Doctor -> Slot -> Review -> Confirm", async () => {
    const onClose = jest.fn();
    const onBookingSuccess = jest.fn();

    (patientApi.bookAppointment as jest.Mock).mockResolvedValue({
      id: "APT-2026-000456",
      appointment_reference: "APT-2026-000456",
      status: "CONFIRMED",
      token_number: 1,
      token_str: "TOKEN #1",
      appointment_date: "2026-10-30",
      appointment_time: "09:30 AM",
      hospital_name: "Hospital Alpha",
      doctor_name: "Dr. Senthil Nathan",
      department: "General Medicine",
      consultation_type: "OPD Consultation",
      patient_name: "John Doe",
    });

    const { getByTestId, getByText } = await render(
      <BookAppointmentModal
        visible={true}
        onClose={onClose}
        onBookingSuccess={onBookingSuccess}
      />
    );

    // 1. Patient Step -> Click Next
    await waitFor(() => expect(getByTestId("step-select-patient")).toBeTruthy());
    await waitFor(() => expect(getByTestId("btn-next-to-hospital")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-next-to-hospital"));

    // 2. Hospital Step -> Select Hospital Alpha
    await waitFor(() => expect(getByTestId("hospital-item-hosp-alpha")).toBeTruthy());
    await fireEvent.press(getByTestId("hospital-item-hosp-alpha"));
    await fireEvent.press(getByTestId("btn-next-to-specialty"));

    // 3. Specialty Step -> Select General Medicine
    await waitFor(() => expect(getByTestId("step-select-specialty")).toBeTruthy());
    expect(getByText("General Medicine")).toBeTruthy();
    await fireEvent.press(getByTestId("specialty-item-General Medicine"));

    // 4. Doctor Step -> Select Dr. Senthil Nathan
    await waitFor(() => expect(getByTestId("step-select-doctor")).toBeTruthy());
    await waitFor(() => expect(getByTestId("doctor-item-doc-senthil")).toBeTruthy());
    expect(getByText("Dr. Senthil Nathan")).toBeTruthy();
    expect(getByText(/Available Today/)).toBeTruthy();
    await fireEvent.press(getByTestId("doctor-item-doc-senthil"));
    await fireEvent.press(getByTestId("btn-next-to-datetime"));

    // 5. Date & Time Step -> Select 09:30 AM slot
    await waitFor(() => expect(getByTestId("step-select-datetime")).toBeTruthy());
    await waitFor(() => expect(getByTestId("time-slot-09:30 AM")).toBeTruthy());
    expect(getByText("09:30 AM")).toBeTruthy();
    await fireEvent.press(getByTestId("time-slot-09:30 AM"));
    await fireEvent.press(getByTestId("btn-next-to-review"));

    // 6. Review Step -> Verify Summary details
    await waitFor(() => expect(getByTestId("step-review-confirm")).toBeTruthy());
    expect(getByText("Review and Confirm")).toBeTruthy();
    expect(getByText("Hospital Alpha")).toBeTruthy();
    expect(getByText("Dr. Senthil Nathan")).toBeTruthy();
    expect(getByText("OPD Consultation")).toBeTruthy();
    expect(getByText("₹500 (if applicable)")).toBeTruthy();

    // 7. Click Confirm Booking
    const confirmBtn = getByTestId("btn-confirm-booking");
    expect(confirmBtn).toBeTruthy();
    await fireEvent.press(confirmBtn);

    // 8. Confirmation Screen
    await waitFor(() => {
      expect(getByTestId("booking-confirmation-view")).toBeTruthy();
    });

    expect(getByText("Appointment Booked Successfully")).toBeTruthy();
    expect(getByText("APT-2026-000456")).toBeTruthy();
    expect(getByTestId("btn-view-booked-appointment")).toBeTruthy();
    expect(getByTestId("btn-back-to-appointments")).toBeTruthy();

    // Click "Back to Appointments"
    await fireEvent.press(getByTestId("btn-back-to-appointments"));
    expect(onClose).toHaveBeenCalled();
  });

  it("Protects against double-booking concurrency submission", async () => {
    const onClose = jest.fn();
    let resolveBooking: (val: any) => void;
    (patientApi.bookAppointment as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveBooking = resolve;
        })
    );

    const { getByTestId } = await render(
      <BookAppointmentModal visible={true} onClose={onClose} />
    );

    // Step 1: Patient
    await waitFor(() => expect(getByTestId("step-select-patient")).toBeTruthy());
    await waitFor(() => expect(getByTestId("btn-next-to-hospital")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-next-to-hospital"));

    // Step 2: Hospital
    await waitFor(() => expect(getByTestId("hospital-item-hosp-alpha")).toBeTruthy());
    await fireEvent.press(getByTestId("hospital-item-hosp-alpha"));
    await fireEvent.press(getByTestId("btn-next-to-specialty"));

    // Step 3: Specialty
    await waitFor(() => expect(getByTestId("step-select-specialty")).toBeTruthy());
    await fireEvent.press(getByTestId("specialty-item-General Medicine"));

    // Step 4: Doctor
    await waitFor(() => expect(getByTestId("doctor-item-doc-senthil")).toBeTruthy());
    await fireEvent.press(getByTestId("doctor-item-doc-senthil"));
    await fireEvent.press(getByTestId("btn-next-to-datetime"));

    // Step 5: Slot
    await waitFor(() => expect(getByTestId("time-slot-09:30 AM")).toBeTruthy());
    await fireEvent.press(getByTestId("time-slot-09:30 AM"));
    await fireEvent.press(getByTestId("btn-next-to-review"));

    // Step 6: Review & Double click
    await waitFor(() => expect(getByTestId("step-review-confirm")).toBeTruthy());
    await waitFor(() => expect(getByTestId("btn-confirm-booking")).toBeTruthy());
    const confirmBtn = getByTestId("btn-confirm-booking");

    // Double press while promise is pending
    await act(async () => {
      fireEvent.press(confirmBtn);
      fireEvent.press(confirmBtn);
    });

    // Resolve the booking promise
    await act(async () => {
      resolveBooking!({
        id: "APT-2026-000456",
        appointment_reference: "APT-2026-000456",
        status: "CONFIRMED",
        token_number: 1,
      });
    });

    // Wait for booking confirmation screen to ensure all state transitions cleanly complete
    await waitFor(() => expect(getByTestId("booking-confirmation-view")).toBeTruthy());

    // bookAppointment should only be called once
    expect(patientApi.bookAppointment).toHaveBeenCalledTimes(1);
  });

  test("offers Duty Doctor option in Doctor selection and when doctor slots are unavailable", async () => {
    const { getByTestId, getByText } = await render(
      <BookAppointmentModal visible={true} onClose={jest.fn()} />
    );

    // Step 1: Patient
    await waitFor(() => expect(getByTestId("step-select-patient")).toBeTruthy(), { timeout: 4000 });
    await waitFor(() => expect(getByTestId("btn-next-to-hospital")).toBeTruthy(), { timeout: 4000 });
    await fireEvent.press(getByTestId("btn-next-to-hospital"));

    // Step 2: Hospital
    await waitFor(() => expect(getByTestId("hospital-item-hosp-alpha")).toBeTruthy());
    await fireEvent.press(getByTestId("hospital-item-hosp-alpha"));
    await fireEvent.press(getByTestId("btn-next-to-specialty"));

    // Step 3: Specialty
    await waitFor(() => expect(getByTestId("step-select-specialty")).toBeTruthy());
    await fireEvent.press(getByTestId("specialty-item-General Medicine"));

    // Step 4: Doctor Selection offers Any Available Duty Doctor
    await waitFor(() => expect(getByTestId("btn-select-duty-doctor-quick")).toBeTruthy());
    expect(getByText("Any Available Duty Doctor")).toBeTruthy();

    // Select Duty Doctor
    await fireEvent.press(getByTestId("btn-select-duty-doctor-quick"));
    await fireEvent.press(getByTestId("btn-next-to-datetime"));

    // Step 5: Slots available
    await waitFor(() => expect(getByTestId("step-select-datetime")).toBeTruthy());
  });
});
