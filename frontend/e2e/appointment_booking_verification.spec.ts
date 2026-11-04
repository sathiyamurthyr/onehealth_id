import { test, expect } from "@playwright/test";
import path from "path";

test.describe("OH-ID Patient Appointment Booking Workflow Verification", () => {
  test.setTimeout(90000);
  test.use({
    viewport: { width: 393, height: 852 }, // Mobile viewport matching reference screenshot
    deviceScaleFactor: 2,
  });

  test("verifies all 8 screens of the patient appointment booking journey", async ({ page }) => {
    const artifactDir = "C:/Users/Sathyamoorthy/.gemini/antigravity/brain/e30ead5f-7e8a-45cb-b0c3-338a71439c1c";

    // 1. Navigate to Login Screen
    console.log("Navigating to login screen...");
    await page.goto("http://localhost:8081/(auth)/login");
    await page.waitForTimeout(2000);

    // 2. Check if login is needed
    const mobileInput = page.getByTestId("mobile-input");
    if (await mobileInput.isVisible().catch(() => false)) {
      console.log("Entering mobile number...");
      await mobileInput.fill("9884240519");
      await page.waitForTimeout(300);

      const continueBtn = page.getByTestId("continue-button");
      await continueBtn.click();
      await page.waitForTimeout(1500);

      const passInput = page.getByTestId("password-input");
      if (await passInput.isVisible().catch(() => false)) {
        console.log("Entering password...");
        await passInput.fill("password123");
        await page.waitForTimeout(300);

        const loginBtn = page.getByTestId("login-button");
        await loginBtn.click();
        await page.waitForTimeout(3000);
      }
    }

    // 3. Navigate to Appointments & Queue screen
    console.log("Navigating to patient appointments...");
    await page.goto("http://localhost:8081/(patient)/appointments");
    await page.waitForTimeout(2500);

    // -------------------------------------------------------------
    // SCREEN 1: Appointments Home (Empty/List State with Top Action Card)
    // -------------------------------------------------------------
    console.log("Verifying Screen 1: Appointments Landing...");
    await expect(page.getByText("Appointments & Queue")).toBeVisible();
    await expect(page.getByText("Clinic Consultations & OPD Tokens")).toBeVisible();

    const bookCard = page.getByTestId("btn-book-appointment-card");
    await expect(bookCard).toBeVisible();
    await expect(page.getByText("Book Appointment")).toBeVisible();
    await expect(page.getByText("Find a hospital, choose a doctor and book your next consultation.")).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "appointment_booking_screen1_landing.png"),
      fullPage: true,
    });
    console.log("Captured Screen 1 screenshot.");

    // -------------------------------------------------------------
    // SCREEN 2: Select Patient (Step 1)
    // -------------------------------------------------------------
    console.log("Opening Book Appointment Modal...");
    await bookCard.click();
    await page.waitForTimeout(1500);

    await expect(page.getByText("Select Patient")).toBeVisible();
    await expect(page.getByText("Choose who the appointment is for.")).toBeVisible();
    await expect(page.getByTestId("patient-option-myself")).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "appointment_booking_screen2_patient.png"),
      fullPage: true,
    });
    console.log("Captured Screen 2 screenshot.");

    // Click Next: Find Hospital →
    const nextToHospitalBtn = page.getByTestId("btn-next-to-hospital");
    await expect(nextToHospitalBtn).toBeVisible();
    await nextToHospitalBtn.click();
    await page.waitForTimeout(1500);

    // -------------------------------------------------------------
    // SCREEN 3: Find a Hospital (Step 2)
    // -------------------------------------------------------------
    console.log("Verifying Screen 3: Find a Hospital...");
    await expect(page.getByText("Find a Hospital", { exact: true })).toBeVisible();
    await expect(page.getByTestId("input-hospital-search")).toBeVisible();

    // Select Hospital Alpha
    const hospAlpha = page.getByTestId("hospital-item-hosp-alpha");
    await expect(hospAlpha).toBeVisible();
    await hospAlpha.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(artifactDir, "appointment_booking_screen3_hospitals.png"),
      fullPage: true,
    });
    console.log("Captured Screen 3 screenshot.");

    // Click Next: Select Specialty →
    const nextToSpecialtyBtn = page.getByTestId("btn-next-to-specialty");
    await expect(nextToSpecialtyBtn).toBeVisible();
    await nextToSpecialtyBtn.click();
    await page.waitForTimeout(1500);

    // -------------------------------------------------------------
    // SCREEN 4: Select Specialty (Step 3)
    // -------------------------------------------------------------
    console.log("Verifying Screen 4: Select Specialty...");
    await expect(page.getByText("Select Specialty", { exact: true })).toBeVisible();
    await expect(page.getByText("General Medicine", { exact: true })).toBeVisible();
    await expect(page.getByText("Paediatrics", { exact: true })).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "appointment_booking_screen4_specialties.png"),
      fullPage: true,
    });
    console.log("Captured Screen 4 screenshot.");

    // Click General Medicine (auto-advances to Doctor step)
    const genMedCard = page.getByTestId("specialty-item-General Medicine");
    await genMedCard.click();
    await page.waitForTimeout(2000);

    // -------------------------------------------------------------
    // SCREEN 5: Select Doctor (Step 4)
    // -------------------------------------------------------------
    console.log("Verifying Screen 5: Select Doctor...");
    await expect(page.getByText("Select Doctor", { exact: true })).toBeVisible();
    const docItem = page.getByTestId("doctor-item-doc-senthil-nathan");
    await expect(docItem).toBeVisible();
    await expect(docItem.getByText("Dr. Senthil Nathan")).toBeVisible();
    await expect(docItem.getByText(/Available/)).toBeVisible();
    await docItem.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(artifactDir, "appointment_booking_screen5_doctors.png"),
      fullPage: true,
    });
    console.log("Captured Screen 5 screenshot.");

    // Click Next: Select Date & Time →
    const nextToDatetimeBtn = page.getByTestId("btn-next-to-datetime");
    await expect(nextToDatetimeBtn).toBeVisible();
    await nextToDatetimeBtn.click();
    await page.waitForTimeout(2000);

    // -------------------------------------------------------------
    // SCREEN 6: Select Date & Time (Step 5)
    // -------------------------------------------------------------
    console.log("Verifying Screen 6: Select Date & Time...");
    await expect(page.getByText("Select Date & Time", { exact: true })).toBeVisible();
    await expect(page.getByText("Morning", { exact: true })).toBeVisible();

    // Select first available time slot
    const timeSlotBtn = page.locator('[data-testid^="time-slot-"]').first();
    await expect(timeSlotBtn).toBeVisible();
    await timeSlotBtn.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(artifactDir, "appointment_booking_screen6_slots.png"),
      fullPage: true,
    });
    console.log("Captured Screen 6 screenshot.");

    // Click Next: Review Appointment →
    const nextToReviewBtn = page.getByTestId("btn-next-to-review");
    await expect(nextToReviewBtn).toBeVisible();
    await nextToReviewBtn.click();
    await page.waitForTimeout(1500);

    // -------------------------------------------------------------
    // SCREEN 7: Review and Confirm (Step 6)
    // -------------------------------------------------------------
    console.log("Verifying Screen 7: Review and Confirm...");
    await expect(page.getByText("Review and Confirm", { exact: true })).toBeVisible();
    await expect(page.getByText("Please check the details before booking.")).toBeVisible();

    const confirmBookingBtn = page.getByTestId("btn-confirm-booking");
    await expect(confirmBookingBtn).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "appointment_booking_screen7_review.png"),
      fullPage: true,
    });
    console.log("Captured Screen 7 screenshot.");

    // Click Confirm Booking
    console.log("Submitting booking...");
    await confirmBookingBtn.click();

    // -------------------------------------------------------------
    // SCREEN 8: Booking Confirmation (Step 7)
    // -------------------------------------------------------------
    console.log("Verifying Screen 8: Booking Confirmation Pass...");
    await expect(page.getByText("Appointment Booked Successfully", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Your appointment has been confirmed.", { exact: true })).toBeVisible();
    await expect(page.getByText("Appointment Reference", { exact: true })).toBeVisible();
    await expect(page.getByText(/APT-/)).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "appointment_booking_screen8_confirmation.png"),
      fullPage: true,
    });
    console.log("Captured Screen 8 screenshot.");

    // Click "Back to Appointments"
    const backToApptsBtn = page.getByTestId("btn-back-to-appointments");
    await expect(backToApptsBtn).toBeVisible();
    await backToApptsBtn.click();
    await page.waitForTimeout(2500);

    // Verify Appointments list updated
    console.log("Verifying updated appointments list...");
    await expect(page.getByText("Appointments & Queue")).toBeVisible();
    await page.screenshot({
      path: path.join(artifactDir, "appointment_booking_screen9_updated_list.png"),
      fullPage: true,
    });
    console.log("Captured Screen 9 screenshot of updated appointments list.");
  });
});
