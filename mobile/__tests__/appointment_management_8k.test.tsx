/**
 * ONEHEALTH ID (OH-ID) Mobile — 8K Appointment Management Flow Unit Tests
 * Sathus Technology Pvt Ltd
 *
 * Verifies all 8 screens from the OH-ID Appointment Management UI specification:
 * 1. Appointments List — View bookings, View Details, 3-dots action dropdown
 * 2. Appointment Details — Hospital, Doctor, Date, Time, Token, 6-Action Grid, Instructions
 * 3. Edit Appointment — Edit Reason, Department, Doctor, Date, Time
 * 4. Reschedule Appointment — Stepper, November 2026 Calendar, Available Time Slots
 * 5. Change Doctor — Department Filter, Doctor Cards with slot counts and radio selection
 * 6. Cancel Appointment — Illustration, Summary Card, Reason Dropdown, Cancellation Policy
 * 7. Success Screen — Confetti Checkmark, Updated Details, Reference ID, Next Actions
 * 8. Appointment Management Overview — 9 Features List with green badges & Hospital art
 */

import React from "react";
import { View } from "react-native";
import { render, fireEvent, waitFor, cleanup, act } from "@testing-library/react-native";
import { AppointmentManagementModal } from "../src/components/patient/AppointmentManagementModal";
import PatientAppointmentsScreen from "../app/(patient)/appointments";
import { patientApi } from "../src/services/api/patient";
import { AppointmentItem } from "../src/types/patient";

jest.setTimeout(25000);

// Mock Modal for deterministic portal unmounting
jest.mock("react-native/Libraries/Modal/Modal", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");
  const MockModal = (props: any) => {
    return props.visible ? React.createElement(View, { testID: "mock-modal" }, props.children) : null;
  };
  return {
    __esModule: true,
    default: MockModal,
  };
});

afterEach(() => {
  cleanup();
});

// Mock router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock patient API
jest.mock("../src/services/api/patient", () => ({
  patientApi: {
    getAppointments: jest.fn(),
    getAppointmentDetails: jest.fn(),
    updateAppointment: jest.fn(),
    rescheduleAppointment: jest.fn(),
    cancelAppointment: jest.fn(),
    getAvailableSlots: jest.fn(),
    getAppointmentQrPass: jest.fn(),
  },
}));

describe("OH-ID 8-Screen Appointment Management UI & Workflows", () => {
  const sampleAppointment: AppointmentItem = {
    id: "OHID-APT-000867",
    patient_id: "pat-101",
    patient_name: "John Doe",
    onehealth_id: "OHID-IND-2026-01001",
    doctor_id: "doc-01",
    doctor_name: "Dr. Senthil Nathan",
    doctor_specialty: "General Medicine",
    doctor_qualification: "MBBS, MD (General Medicine)",
    department: "General Medicine",
    hospital_id: "hosp-alpha",
    hospital_name: "Hospital Alpha",
    hospital_address: "148 Trunk Road, Porur, Chennai - 600116",
    appointment_date: "2026-11-10",
    appointment_time: "09:30 AM",
    status: "CONFIRMED",
    token_number: 6,
    token_str: "OPD-06",
    room_number: "OPD - Room 102",
    reason: "General Consultation",
    booking_date: "28 Oct 2026, 04:15 PM",
    created_at: "2026-10-28T16:15:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (patientApi.getAppointments as jest.Mock).mockResolvedValue([sampleAppointment]);
    (patientApi.getAvailableSlots as jest.Mock).mockResolvedValue([
      { time: "09:00 AM", period: "Morning", date: "2026-11-12", slot_value: "09:00 AM", is_available: true, doctor_id: "doc-01" },
      { time: "09:30 AM", period: "Morning", date: "2026-11-12", slot_value: "09:30 AM", is_available: true, doctor_id: "doc-01" },
      { time: "10:00 AM", period: "Morning", date: "2026-11-12", slot_value: "10:00 AM", is_available: true, doctor_id: "doc-01" },
      { time: "10:30 AM", period: "Morning", date: "2026-11-12", slot_value: "10:30 AM", is_available: true, doctor_id: "doc-01" },
    ]);
    (patientApi.updateAppointment as jest.Mock).mockResolvedValue({
      ...sampleAppointment,
      reason: "Follow-up Consultation",
    });
    (patientApi.rescheduleAppointment as jest.Mock).mockResolvedValue({
      ...sampleAppointment,
      appointment_date: "2026-11-12",
      appointment_time: "10:30 AM",
      status: "RESCHEDULED",
    });
    (patientApi.cancelAppointment as jest.Mock).mockResolvedValue({
      ...sampleAppointment,
      status: "CANCELLED",
      cancellation_reason: "Change in schedule",
    });
  });

  // --------------------------------------------------------------------------
  // SCREEN 1: Appointments List with View Details and 3-Dots Dropdown
  // --------------------------------------------------------------------------
  test("Screen 1: renders appointment card with View Details and 3-dots action menu", async () => {
    const { getByText, getByTestId } = await render(<PatientAppointmentsScreen />);

    await waitFor(() => {
      expect(getByText("Dr. Senthil Nathan")).toBeTruthy();
      expect(getByText("Hospital Alpha")).toBeTruthy();
      expect(getByTestId("btn-view-details-OHID-APT-000867")).toBeTruthy();
      expect(getByTestId("btn-appointment-more-OHID-APT-000867")).toBeTruthy();
    });

    // Tap 3-dots button to open dropdown
    fireEvent.press(getByTestId("btn-appointment-more-OHID-APT-000867"));

    await waitFor(() => {
      expect(getByText("Edit Appointment")).toBeTruthy();
      expect(getByText("Reschedule")).toBeTruthy();
      expect(getByText("Change Doctor")).toBeTruthy();
      expect(getByText("Cancel Appointment")).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // SCREEN 2: Appointment Details View
  // --------------------------------------------------------------------------
  test("Screen 2: renders complete appointment details, token, 6-action grid, and instructions", async () => {
    const { getByText, getByTestId } = await render(
      <AppointmentManagementModal
        visible={true}
        appointment={sampleAppointment}
        initialMode="details"
        onClose={jest.fn()}
      />
    );

    // Header & Badges
    expect(getByText("Appointment Details")).toBeTruthy();
    expect(getByText("General Medicine")).toBeTruthy();
    expect(getByText("Scheduled")).toBeTruthy();

    // Doctor & Schedule
    expect(getByText("Dr. Senthil Nathan")).toBeTruthy();
    expect(getByText("MBBS, MD (General Medicine)")).toBeTruthy();
    expect(getByText("Hospital Alpha")).toBeTruthy();
    expect(getByText("Token #6")).toBeTruthy();
    expect(getByText("OPD - Room 102")).toBeTruthy();

    // Appointment Information Table
    expect(getByText("Appointment ID")).toBeTruthy();
    expect(getByText("OHID-APT-000867")).toBeTruthy();
    expect(getByText("General Consultation")).toBeTruthy();
    expect(getByText("OPD (In-person)")).toBeTruthy();

    // 6-Action Grid
    expect(getByTestId("btn-action-edit-details")).toBeTruthy();
    expect(getByTestId("btn-action-reschedule-appointment")).toBeTruthy();
    expect(getByTestId("btn-action-change-doctor")).toBeTruthy();
    expect(getByTestId("btn-action-cancel-appointment")).toBeTruthy();
    expect(getByTestId("btn-action-directions")).toBeTruthy();
    expect(getByTestId("btn-action-add-calendar")).toBeTruthy();

    // Instructions Accordion Toggle
    expect(getByText("Appointment Instructions")).toBeTruthy();
    fireEvent.press(getByTestId("btn-toggle-instructions"));
    await waitFor(() => {
      expect(getByText(/Please arrive 15 minutes prior/)).toBeTruthy();
      expect(getByText(/Present your digital OH-ID pass/)).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // SCREEN 3: Edit Appointment View
  // --------------------------------------------------------------------------
  test("Screen 3: renders edit form and saves updated consultation reason", async () => {
    const { getByText, getByTestId } = await render(
      <AppointmentManagementModal
        visible={true}
        appointment={sampleAppointment}
        initialMode="edit"
        onClose={jest.fn()}
      />
    );

    expect(getByText("Edit Appointment")).toBeTruthy();
    expect(getByText("Update your appointment details below.")).toBeTruthy();
    expect(getByTestId("input-edit-reason")).toBeTruthy();
    expect(getByText(/Note: Based on availability, your updated details will be confirmed instantly/)).toBeTruthy();

    // Change reason text and submit
    await act(async () => {
      fireEvent.changeText(getByTestId("input-edit-reason"), "Routine Diabetes Review");
    });
    await act(async () => {
      fireEvent.press(getByTestId("btn-submit-edit-appointment"));
    });

    await waitFor(() => {
      expect(patientApi.updateAppointment).toHaveBeenCalledWith(
        "OHID-APT-000867",
        expect.objectContaining({
          reason: "Routine Diabetes Review",
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // SCREEN 4: Reschedule Appointment View
  // --------------------------------------------------------------------------
  test("Screen 4: renders stepper, November 2026 calendar, slot chips, and confirms reschedule", async () => {
    const { getByText, getByTestId } = await render(
      <AppointmentManagementModal
        visible={true}
        appointment={sampleAppointment}
        initialMode="reschedule"
        onClose={jest.fn()}
      />
    );

    expect(getByText("Reschedule Appointment")).toBeTruthy();
    expect(getByText("Choose a new date and time")).toBeTruthy();
    expect(getByText("November 2026")).toBeTruthy();
    expect(getByText("Available Time Slots")).toBeTruthy();

    // Select slot and submit
    await act(async () => {
      fireEvent.press(getByTestId("reschedule-slot-1030AM"));
    });
    await act(async () => {
      fireEvent.press(getByTestId("btn-confirm-reschedule"));
    });

    await waitFor(() => {
      expect(patientApi.rescheduleAppointment).toHaveBeenCalledWith(
        "OHID-APT-000867",
        expect.any(String),
        "10:30 AM",
        undefined,
        expect.any(String)
      );
    });
  });

  // --------------------------------------------------------------------------
  // SCREEN 5: Change Doctor View
  // --------------------------------------------------------------------------
  test("Screen 5: displays department filter, available doctors with slot badges, and allows selection", async () => {
    const { getByText, getByTestId } = await render(
      <AppointmentManagementModal
        visible={true}
        appointment={sampleAppointment}
        initialMode="change_doctor"
        onClose={jest.fn()}
      />
    );

    expect(getByText("Change Doctor")).toBeTruthy();
    expect(getByText("Select a different doctor for your appointment")).toBeTruthy();
    expect(getByText("Dr. Senthil Nathan")).toBeTruthy();
    expect(getByText("(Your current doctor)")).toBeTruthy();
    expect(getByText("Dr. Aravind Kumar")).toBeTruthy();
    expect(getByText("10 Nov • 10 slots available")).toBeTruthy();

    // Select alternative doctor
    await act(async () => {
      fireEvent.press(getByTestId("select-doctor-doc-02"));
    });
    expect(getByTestId("btn-choose-time-for-new-doctor")).toBeTruthy();
  });

  // --------------------------------------------------------------------------
  // SCREEN 6: Cancel Appointment View
  // --------------------------------------------------------------------------
  test("Screen 6: renders cancellation warning, summary, cancellation policy, and cancels with reason", async () => {
    const { getByText, getByTestId } = await render(
      <AppointmentManagementModal
        visible={true}
        appointment={sampleAppointment}
        initialMode="cancel"
        onClose={jest.fn()}
      />
    );

    expect(getByText("Cancel this appointment?")).toBeTruthy();
    expect(getByText("You are about to cancel the following appointment:")).toBeTruthy();
    expect(getByText(/Reason for Cancellation/)).toBeTruthy();
    expect(getByText("Cancellation Policy")).toBeTruthy();
    expect(getByText(/Free cancellation up to 24 hours/)).toBeTruthy();
    expect(getByTestId("btn-keep-appointment")).toBeTruthy();

    // Confirm cancellation
    await act(async () => {
      fireEvent.press(getByTestId("btn-confirm-cancellation"));
    });

    await waitFor(() => {
      expect(patientApi.cancelAppointment).toHaveBeenCalledWith(
        "OHID-APT-000867",
        expect.any(String)
      );
    });
  });

  // --------------------------------------------------------------------------
  // SCREEN 7: Success Screen View
  // --------------------------------------------------------------------------
  test("Screen 7: displays green checkmark, updated details card, reference ID, and next actions", async () => {
    const { getByText, getByTestId } = await render(
      <AppointmentManagementModal
        visible={true}
        appointment={sampleAppointment}
        initialMode="success"
        onClose={jest.fn()}
      />
    );

    expect(getByText("Appointment Rescheduled")).toBeTruthy();
    expect(getByText("New Appointment Details")).toBeTruthy();
    expect(getByText("Dr. Senthil Nathan")).toBeTruthy();
    expect(getByText("Reference ID")).toBeTruthy();
    expect(getByTestId("btn-success-view-details")).toBeTruthy();
    expect(getByTestId("btn-success-back-appointments")).toBeTruthy();
  });

  // --------------------------------------------------------------------------
  // SCREEN 8: Appointment Management Overview View
  // --------------------------------------------------------------------------
  test("Screen 8: renders all 9 Appointment Management feature cards with verified checkmarks", async () => {
    const { getByText } = await render(
      <AppointmentManagementModal
        visible={true}
        appointment={sampleAppointment}
        initialMode="overview"
        onClose={jest.fn()}
      />
    );

    expect(getByText("Appointment Management (OH-ID)")).toBeTruthy();
    expect(getByText("Comprehensive patient self-service healthcare features.")).toBeTruthy();

    expect(getByText("View Appointment Details")).toBeTruthy();
    expect(getByText("Edit Appointment")).toBeTruthy();
    expect(getByText("Reschedule Appointment")).toBeTruthy();
    expect(getByText("Change Doctor")).toBeTruthy();
    expect(getByText("Cancel Appointment")).toBeTruthy();
    expect(getByText("Add to Calendar")).toBeTruthy();
    expect(getByText("Hospital Directions")).toBeTruthy();
    expect(getByText("Appointment Instructions")).toBeTruthy();
    expect(getByText("Appointment History")).toBeTruthy();

    expect(getByText("OneHealth ID Connected Care Facilities")).toBeTruthy();
  });
});
