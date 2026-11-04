import { test, expect } from "@playwright/test";
import path from "path";

test.describe("OH-ID 8K Appointment Management Flow E2E Verification", () => {
  test.setTimeout(90000);
  test.use({
    viewport: { width: 393, height: 852 }, // iPhone 16 Pro dimensions matching design reference
    deviceScaleFactor: 2,
  });

  const artifactDir = "C:/Users/Sathyamoorthy/.gemini/antigravity/brain/e30ead5f-7e8a-45cb-b0c3-338a71439c1c";
  const validToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwYXQtMTAxIiwicm9sZSI6IlBBVElFTlQiLCJyb2xlcyI6WyJQQVRJRU5UIl0sInBob25lIjoiOTg4NDI0MDUxOSIsImZ1bGxfbmFtZSI6IkpvaG4gRG9lIiwib25laGVhbHRoX2lkIjoiT0hJRC1JTkQtMjAyNi0wMTAwMSIsImp0aSI6ImQ4OTk1ZGEzLTMwMzQtNDk0OC1iZGUwLWU3M2NmNGZhZmQxNCIsImlhdCI6MTc5MzQ2ODU2Ni4zNTE3MzMsImV4cCI6MTc5MzU1NDk2Nn0.ljDHd0VeULSOWVBi4oMVmWbH4xy2BhtUQYUDn_rX-d8";

  test("verifies all 8 screens of the appointment management 8K workflow and saves artifacts", async ({
    page,
  }) => {
    // 1. Pre-seed local storage with valid session and mock appointment data
    await page.addInitScript(({ token }) => {
      window.localStorage.setItem("oh_mobile_jwt", token);
      window.localStorage.setItem(
        "oh_mobile_user_profile",
        JSON.stringify({
          id: "pat-101",
          username: "9884240519",
          role: "PATIENT",
          full_name: "John Doe",
          onehealth_id: "OHID-IND-2026-01001",
          phone: "9884240519",
          is_active: true,
        })
      );
    }, { token: validToken });

    // Mock patient appointments API to return the reference appointment
    await page.route("**/api/v1/me/appointments*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: "OHID-APT-000867",
              patient_id: "pat-101",
              patient_name: "John Doe",
              onehealth_id: "OHID-IND-2026-01001",
              doctor_id: "doc-01",
              doctor_name: "Dr. Senthil Nathan",
              doctor_specialty: "General Medicine",
              doctor_qualification: "MBBS, MD (General Medicine)",
              department: "GENERAL OPD",
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
            },
          ],
        }),
      });
    });

    await page.route("**/api/v1/appointments*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: "OHID-APT-000867",
              patient_id: "pat-101",
              patient_name: "John Doe",
              onehealth_id: "OHID-IND-2026-01001",
              doctor_id: "doc-01",
              doctor_name: "Dr. Senthil Nathan",
              doctor_specialty: "General Medicine",
              doctor_qualification: "MBBS, MD (General Medicine)",
              department: "GENERAL OPD",
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
            },
          ],
        }),
      });
    });

    // Mock slots API
    await page.route("**/api/v1/patient/doctors/**/available-slots**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { time: "09:00 AM", period: "Morning", date: "2026-11-12", is_available: true },
          { time: "09:30 AM", period: "Morning", date: "2026-11-12", is_available: true },
          { time: "10:00 AM", period: "Morning", date: "2026-11-12", is_available: true },
          { time: "10:30 AM", period: "Morning", date: "2026-11-12", is_available: true },
        ]),
      });
    });

    console.log("Navigating directly to patient appointments...");
    await page.goto("http://localhost:8081/(patient)/appointments");
    await page.waitForTimeout(3000);

    // =========================================================================
    // SCREEN 1: Appointments List with View Details & 3-dots Menu
    // =========================================================================
    console.log("Capturing Screen 1: Appointments List...");
    await expect(page.getByText("Appointments & Queue")).toBeVisible();
    await expect(page.getByText("Dr. Senthil Nathan")).toBeVisible();
    await expect(page.getByText("Hospital Alpha")).toBeVisible();

    // Verify 3-dots action menu button
    const threeDotsBtn = page.getByTestId("btn-appointment-more-OHID-APT-000867");
    await expect(threeDotsBtn).toBeVisible();
    await threeDotsBtn.click();
    await page.waitForTimeout(500);

    await expect(page.getByText("Edit Appointment")).toBeVisible();
    await expect(page.getByText("Reschedule")).toBeVisible();
    await expect(page.getByText("Change Doctor")).toBeVisible();
    await expect(page.getByText("Cancel Appointment")).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "appointment_management_screen1_list.png"),
    });

    // Close menu by clicking View Details
    const viewDetailsBtn = page.getByTestId("btn-view-details-OHID-APT-000867");
    await viewDetailsBtn.click();
    await page.waitForTimeout(1000);

    // =========================================================================
    // SCREEN 2: Appointment Details View
    // =========================================================================
    console.log("Capturing Screen 2: Appointment Details...");
    const modal = page.getByTestId("appointment-management-modal");
    await expect(page.getByText("Appointment Details")).toBeVisible();
    await expect(modal.getByText("GENERAL OPD")).toBeVisible();
    await expect(modal.getByText("Scheduled")).toBeVisible();
    await expect(modal.getByText("Token #6")).toBeVisible();
    await expect(modal.getByText("OPD - Room 102")).toBeVisible();
    await expect(modal.getByText("OHID-APT-000867")).toBeVisible();

    // Verify 6 quick actions
    await expect(modal.getByTestId("btn-action-edit-details")).toBeVisible();
    await expect(modal.getByTestId("btn-action-reschedule-appointment")).toBeVisible();
    await expect(modal.getByTestId("btn-action-change-doctor")).toBeVisible();
    await expect(modal.getByTestId("btn-action-cancel-appointment")).toBeVisible();
    await expect(modal.getByTestId("btn-action-directions")).toBeVisible();
    await expect(modal.getByTestId("btn-action-add-calendar")).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "appointment_management_screen2_details.png"),
    });

    // =========================================================================
    // SCREEN 3: Edit Appointment View
    // =========================================================================
    console.log("Capturing Screen 3: Edit Appointment...");
    await modal.getByTestId("btn-action-edit-details").click();
    await page.waitForTimeout(600);

    await expect(page.getByText("Edit Appointment")).toBeVisible();
    await expect(modal.getByText("Update your appointment details below.")).toBeVisible();
    await expect(modal.getByTestId("input-edit-reason")).toBeVisible();
    await expect(modal.getByText("Review Changes →")).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "appointment_management_screen3_edit.png"),
    });

    // =========================================================================
    // SCREEN 4: Reschedule Appointment View
    // =========================================================================
    console.log("Capturing Screen 4: Reschedule Appointment...");
    // Go back to details, then open reschedule
    await modal.getByTestId("btn-appointment-modal-back").click();
    await page.waitForTimeout(400);
    await modal.getByTestId("btn-action-reschedule-appointment").click();
    await page.waitForTimeout(600);

    await expect(page.getByText("Reschedule Appointment")).toBeVisible();
    await expect(modal.getByText("Choose a new date and time")).toBeVisible();
    await expect(modal.getByText("November 2026")).toBeVisible();
    await expect(modal.getByText("Available Time Slots")).toBeVisible();
    await expect(modal.getByTestId("btn-confirm-reschedule")).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "appointment_management_screen4_reschedule.png"),
    });

    // =========================================================================
    // SCREEN 5: Change Doctor View
    // =========================================================================
    console.log("Capturing Screen 5: Change Doctor...");
    await modal.getByTestId("btn-appointment-modal-back").click();
    await page.waitForTimeout(400);
    await modal.getByTestId("btn-action-change-doctor").click();
    await page.waitForTimeout(600);

    await expect(page.getByText("Change Doctor")).toBeVisible();
    await expect(modal.getByText("Select a different doctor for your appointment")).toBeVisible();
    await expect(modal.getByText("Dr. Senthil Nathan")).toBeVisible();
    await expect(modal.getByText("(Your current doctor)")).toBeVisible();
    await expect(modal.getByText("Dr. Aravind Kumar")).toBeVisible();
    await expect(modal.getByTestId("btn-choose-time-for-new-doctor")).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "appointment_management_screen5_change_doctor.png"),
    });

    // =========================================================================
    // SCREEN 6: Cancel Appointment View
    // =========================================================================
    console.log("Capturing Screen 6: Cancel Appointment...");
    await modal.getByTestId("btn-appointment-modal-back").click();
    await page.waitForTimeout(400);
    await modal.getByTestId("btn-action-cancel-appointment").click();
    await page.waitForTimeout(600);

    await expect(page.getByText("Cancel this appointment?")).toBeVisible();
    await expect(modal.getByText("Cancellation Policy")).toBeVisible();
    await expect(modal.getByTestId("btn-keep-appointment")).toBeVisible();
    const confirmCancelBtn = modal.getByTestId("btn-confirm-cancellation");
    await expect(confirmCancelBtn).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "appointment_management_screen6_cancel.png"),
    });

    // =========================================================================
    // SCREEN 7: Success Screen View
    // =========================================================================
    console.log("Capturing Screen 7: Success Confirmation...");
    // Mock reschedule API response
    await page.route("**/api/v1/**/reschedule*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: "OHID-APT-000867",
            status: "RESCHEDULED",
            appointment_date: "2026-11-12",
            appointment_time: "10:30 AM",
          },
        }),
      });
    });

    // Mock cancel API response
    await page.route("**/api/v1/**/cancel*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: "OHID-APT-000867",
            status: "CANCELLED",
            cancellation_reason: "Change in schedule",
          },
        }),
      });
    });

    await confirmCancelBtn.click();
    await page.waitForTimeout(1000);

    await expect(page.getByText("Appointment Cancelled")).toBeVisible();
    await expect(page.getByText("Reference ID")).toBeVisible();
    await expect(page.getByTestId("btn-success-view-details")).toBeVisible();
    await expect(page.getByTestId("btn-success-back-appointments")).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "appointment_management_screen7_success.png"),
    });

    // =========================================================================
    // SCREEN 8: Appointment Management Overview View
    // =========================================================================
    console.log("Capturing Screen 8: Appointment Management Overview...");
    await page.getByTestId("btn-success-back-appointments").click();
    await page.waitForTimeout(600);

    // Open Overview via the top Info icon in the header
    const overviewTrigger = page.getByTestId("btn-appointment-management-overview");
    await expect(overviewTrigger).toBeVisible();
    await overviewTrigger.click();
    await page.waitForTimeout(800);

    await expect(page.getByText("Appointment Management (OH-ID)")).toBeVisible();
    await expect(page.getByText("View Appointment Details")).toBeVisible();
    await expect(page.getByText("Edit Appointment")).toBeVisible();
    await expect(page.getByText("Reschedule Appointment")).toBeVisible();
    await expect(page.getByText("Change Doctor")).toBeVisible();
    await expect(page.getByText("Cancel Appointment")).toBeVisible();
    await expect(page.getByText("Add to Calendar")).toBeVisible();
    await expect(page.getByText("Hospital Directions")).toBeVisible();
    await expect(page.getByText("Appointment Instructions")).toBeVisible();
    await expect(page.getByText("Appointment History")).toBeVisible();
    await expect(page.getByText("OneHealth ID Connected Care Facilities")).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "appointment_management_screen8_overview.png"),
    });

    console.log("All 8 Appointment Management screens successfully verified and captured!");
  });
});