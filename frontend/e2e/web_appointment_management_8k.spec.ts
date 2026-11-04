import { test, expect } from "@playwright/test";
import path from "path";

test.describe("OH-ID Web Patient Portal 8K Appointment Management Flow", () => {
  test.setTimeout(90000);
  test.use({
    viewport: { width: 390, height: 844 }, // Mobile viewport matching 8K mobile layout reference
    deviceScaleFactor: 2,
  });

  const artifactDir = "C:/Users/Sathyamoorthy/.gemini/antigravity/brain/e30ead5f-7e8a-45cb-b0c3-338a71439c1c";
  const validToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwYXQtMTAxIiwicm9sZSI6IlBBVElFTlQiLCJyb2xlcyI6WyJQQVRJRU5UIl0sInBob25lIjoiOTg4NDI0MDUxOSIsImZ1bGxfbmFtZSI6IkpvaG4gRG9lIiwib25laGVhbHRoX2lkIjoiT0hJRC1JTkQtMjAyNi0wMTAwMSIsImp0aSI6ImQ4OTk1ZGEzLTMwMzQtNDk0OC1iZGUwLWU3M2NmNGZhZmQxNCIsImlhdCI6MTc5MzQ2ODU2Ni4zNTE3MzMsImV4cCI6MTc5MzU1NDk2Nn0.ljDHd0VeULSOWVBi4oMVmWbH4xy2BhtUQYUDn_rX-d8";

  test("verifies all 8 screens of the web appointment management 8K workflow and saves artifacts", async ({
    page,
  }) => {
    // 1. Pre-seed local storage with valid session and mock appointment data
    await page.addInitScript(({ token }) => {
      window.localStorage.setItem("oh_access_token", token);
      window.localStorage.setItem("oh_mobile_jwt", token);
      window.localStorage.setItem(
        "oh_user",
        JSON.stringify({
          id: "pat-101",
          username: "9884240519",
          role: "PATIENT",
          roles: ["PATIENT"],
          name: "John Doe",
          full_name: "John Doe",
          onehealth_id: "OHID-IND-2026-01001",
          phone: "9884240519",
          is_active: true,
        })
      );
      window.localStorage.setItem(
        "oh_workspace",
        JSON.stringify({
          id: "ws-patient",
          workspace_type: "PATIENT",
          name: "Patient Workspace",
          title: "Patient Portal",
          role: "PATIENT",
        })
      );
    }, { token: validToken });

    // Mock Workspace Me API (/me/workspace and /workspace/me)
    await page.route("**/api/v1/me/workspace*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          workspace: {
            id: "ws-patient",
            workspace_type: "PATIENT",
            name: "Patient Workspace",
            title: "Patient Portal",
            role: "PATIENT",
          },
          user: {
            id: "pat-101",
            name: "John Doe",
            full_name: "John Doe",
            role: "PATIENT",
            roles: ["PATIENT"],
            email: "john@example.com",
            phone: "9884240519",
            onehealth_id: "OHID-IND-2026-01001",
          },
          navigation: [],
          permissions: [
            "PATIENT_READ",
            "PATIENT_WRITE",
            "APPOINTMENT_READ",
            "APPOINTMENT_WRITE",
            "CAN_BOOK_APPOINTMENT",
            "CAN_CANCEL_APPOINTMENT",
            "CAN_RESCHEDULE_APPOINTMENT",
            "view_appointments",
          ],
          available_workspaces: [],
          available_hospitals: [],
        }),
      });
    });

    await page.route("**/api/v1/workspace/me*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          workspace: {
            id: "ws-patient",
            workspace_type: "PATIENT",
            name: "Patient Workspace",
            title: "Patient Portal",
            role: "PATIENT",
          },
          user: {
            id: "pat-101",
            name: "John Doe",
            full_name: "John Doe",
            role: "PATIENT",
            roles: ["PATIENT"],
            email: "john@example.com",
            phone: "9884240519",
            onehealth_id: "OHID-IND-2026-01001",
          },
          navigation: [],
          permissions: [
            "PATIENT_READ",
            "PATIENT_WRITE",
            "APPOINTMENT_READ",
            "APPOINTMENT_WRITE",
            "CAN_BOOK_APPOINTMENT",
            "CAN_CANCEL_APPOINTMENT",
            "CAN_RESCHEDULE_APPOINTMENT",
            "view_appointments",
          ],
          available_workspaces: [],
          available_hospitals: [],
        }),
      });
    });

    // Mock Profile API
    await page.route("**/api/v1/me/profile*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "pat-101",
            onehealth_id: "OHID-IND-2026-01001",
            name: "John Doe",
            full_name: "John Doe",
            age: 32,
            gender: "Male",
            phone: "9884240519",
            email: "john@example.com",
            address: "123, Green Park Street, Anna Nagar",
            city: "Chennai",
            state: "Tamil Nadu",
            emergency_contact: "+91 98765 43210",
            blood_group: "O+",
            status: "ACTIVE",
            qr_token: "OHID-QR-PAT-101",
          },
        }),
      });
    });

    // Mock Family members API
    await page.route("**/api/v1/me/family/overview*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            total_members: 2,
            active_members: 2,
          },
        }),
      });
    });

    await page.route("**/api/v1/me/family*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "pat-101",
              full_name: "John Doe",
              relationship: "SELF",
              onehealth_id: "OHID-IND-2026-01001",
              is_primary: true,
              permissions: {
                view_medical_records: true,
                view_prescriptions: true,
                view_lab_reports: true,
                view_appointments: true,
                book_appointments: true,
                manage_family: true,
              },
            },
          ],
        }),
      });
    });

    // Mock Hospitals API
    await page.route("**/api/v1/me/hospitals*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            { id: "hosp-alpha", name: "Hospital Alpha", address: "148 Trunk Road, Porur, Chennai - 600116" },
          ],
        }),
      });
    });

    await page.route("**/api/v1/patient/hospitals*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            { id: "hosp-alpha", name: "Hospital Alpha", address: "148 Trunk Road, Porur, Chennai - 600116" },
          ],
        }),
      });
    });

    // Mock patient appointments API to return the reference appointment
    await page.route("**/api/v1/me/appointments*", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: "OHID-APT-000867",
              status: "SCHEDULED",
              reason: "Updated Consultation",
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
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
              department_name: "GENERAL OPD",
              hospital_id: "hosp-alpha",
              hospital_name: "Hospital Alpha",
              hospital_address: "148 Trunk Road, Porur, Chennai - 600116",
              appointment_date: "2026-11-10",
              appointment_time: "09:30 AM",
              status: "SCHEDULED",
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

    // Mock update / reschedule / cancel APIs
    await page.route("**/api/v1/me/appointments/*/reschedule", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "OHID-APT-000867",
            status: "SCHEDULED",
            appointment_date: "2026-11-12",
            appointment_time: "10:30 AM",
            token_number: 9,
          },
        }),
      });
    });

    await page.route("**/api/v1/me/appointments/*/cancel", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "OHID-APT-000867",
            status: "CANCELLED",
          },
        }),
      });
    });

    console.log("Navigating directly to patient appointments on web...");
    await page.goto("/patient/appointments");
    await page.waitForLoadState("networkidle");

    // =========================================================================
    // SCREEN 1: Appointments List with View Details & 3-dots Menu
    // =========================================================================
    console.log("Capturing Screen 1: Appointments List...");
    await expect(page.getByText("Appointments & Queue").first()).toBeVisible({ timeout: 15000 });
    const apptCard = page.getByTestId("appointment-card-OHID-APT-000867");
    await expect(apptCard).toBeVisible({ timeout: 10000 });
    await expect(apptCard.getByText("Dr. Senthil Nathan")).toBeVisible({ timeout: 10000 });
    await expect(apptCard.getByText("Hospital Alpha")).toBeVisible({ timeout: 10000 });

    // Verify Screen 1 Top Action Card
    const topActionCard = page.getByTestId("btn-book-appointment-card");
    await expect(topActionCard).toBeVisible();

    // Verify 3-dots action menu button
    const threeDotsBtn = page.getByTestId("btn-appointment-more-OHID-APT-000867");
    await expect(threeDotsBtn).toBeVisible();
    await threeDotsBtn.click();
    await page.waitForTimeout(500);

    await expect(page.getByTestId("menu-opt-edit-OHID-APT-000867")).toBeVisible();
    await expect(page.getByTestId("menu-opt-reschedule-OHID-APT-000867")).toBeVisible();
    await expect(page.getByTestId("menu-opt-change-doctor-OHID-APT-000867")).toBeVisible();
    await expect(page.getByTestId("menu-opt-cancel-OHID-APT-000867")).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "web_appointment_screen1_list.png"),
    });

    // Close menu by clicking View Details
    const viewDetailsBtn = page.getByTestId("btn-view-details-OHID-APT-000867");
    await viewDetailsBtn.click();
    await page.waitForTimeout(600);

    // =========================================================================
    // SCREEN 2: Appointment Details View
    // =========================================================================
    console.log("Capturing Screen 2: Appointment Details...");
    const modal = page.getByTestId("appointment-management-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByText("Appointment Details")).toBeVisible();
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

    // Toggle instructions accordion
    const instructionsBtn = modal.getByTestId("btn-toggle-instructions");
    await expect(instructionsBtn).toBeVisible();
    await instructionsBtn.click();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: path.join(artifactDir, "web_appointment_screen2_details.png"),
    });

    // =========================================================================
    // SCREEN 3: Edit Appointment View
    // =========================================================================
    console.log("Capturing Screen 3: Edit Appointment...");
    await modal.getByTestId("btn-action-edit-details").click();
    await page.waitForTimeout(600);

    await expect(modal.getByText("Edit Appointment")).toBeVisible();
    await expect(modal.getByText("Update your appointment details below.")).toBeVisible();
    await expect(modal.getByTestId("input-edit-reason")).toBeVisible();
    await expect(modal.getByTestId("btn-submit-edit-appointment")).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "web_appointment_screen3_edit.png"),
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

    await expect(modal.getByText("Reschedule Appointment")).toBeVisible();
    await expect(modal.getByText("Choose a new date and time")).toBeVisible();
    await expect(modal.getByText("November 2026")).toBeVisible();
    await expect(modal.getByTestId("btn-confirm-reschedule")).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "web_appointment_screen4_reschedule.png"),
    });

    // =========================================================================
    // SCREEN 5: Change Doctor View
    // =========================================================================
    console.log("Capturing Screen 5: Change Doctor...");
    await modal.getByTestId("btn-appointment-modal-back").click();
    await page.waitForTimeout(400);
    await modal.getByTestId("btn-action-change-doctor").click();
    await page.waitForTimeout(600);

    await expect(modal.getByText("Change Doctor")).toBeVisible();
    await expect(modal.getByText("Select a different doctor for your appointment")).toBeVisible();
    await expect(modal.getByText("Dr. Aravind Kumar")).toBeVisible();
    await expect(modal.getByText("Dr. Priya Raman")).toBeVisible();
    await expect(modal.getByTestId("btn-choose-time-for-new-doctor")).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "web_appointment_screen5_change_doctor.png"),
    });

    // =========================================================================
    // SCREEN 6: Cancel Appointment View
    // =========================================================================
    console.log("Capturing Screen 6: Cancel Appointment...");
    await modal.getByTestId("btn-appointment-modal-back").click();
    await page.waitForTimeout(400);
    await modal.getByTestId("btn-action-cancel-appointment").click();
    await page.waitForTimeout(600);

    await expect(modal.getByText("Cancel Appointment")).toBeVisible();
    await expect(modal.getByText("Cancel this appointment?")).toBeVisible();
    await expect(modal.getByText("Cancellation Policy")).toBeVisible();
    await expect(modal.getByTestId("btn-keep-appointment")).toBeVisible();
    await expect(modal.getByTestId("btn-confirm-cancellation")).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "web_appointment_screen6_cancel.png"),
    });

    // =========================================================================
    // SCREEN 7: Success State View
    // =========================================================================
    console.log("Capturing Screen 7: Success State...");
    await modal.getByTestId("btn-confirm-cancellation").click();
    await page.waitForTimeout(1000);

    await expect(modal.getByText(/Appointment (Cancelled|Rescheduled|Updated)/i)).toBeVisible();
    await expect(modal.getByText("Reference ID")).toBeVisible();
    await expect(modal.getByTestId("btn-success-back-appointments")).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "web_appointment_screen7_success.png"),
    });

    // Close modal
    await modal.getByTestId("btn-success-back-appointments").click();
    await page.waitForTimeout(600);

    // =========================================================================
    // SCREEN 8: Appointment Management Overview View
    // =========================================================================
    console.log("Capturing Screen 8: Overview View...");
    const overviewTrigger = page.getByTestId("btn-appointment-management-overview");
    await expect(overviewTrigger).toBeVisible();
    await overviewTrigger.click();
    await page.waitForTimeout(600);

    const overviewModal = page.getByTestId("appointment-management-modal");
    await expect(overviewModal).toBeVisible();
    await expect(overviewModal.getByText("Appointment Management (OH-ID)")).toBeVisible();
    await expect(overviewModal.getByText("View Appointment Details")).toBeVisible();
    await expect(overviewModal.getByText("Reschedule Appointment")).toBeVisible();
    await expect(overviewModal.getByText("Change Doctor")).toBeVisible();
    await expect(overviewModal.getByText("Cancel Appointment")).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "web_appointment_screen8_overview.png"),
    });

    console.log("Successfully verified all 8 screens of Web Patient Portal 8K Appointment Management!");
  });
});
