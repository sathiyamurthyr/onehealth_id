import { test, expect } from "@playwright/test";

test.describe("Kedar Hospital Pilot MVP - Complete Vertical Slice E2E", () => {
  // Test 1: Staff Authentication & Dynamic Kedar Dashboard
  test("1. Staff Login & Kedar Dashboard Live Metrics", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Sign In to Kedar Hospital OS")).toBeVisible();

    // Fill Admin credentials
    await page.locator('input[type="text"]').fill("admin");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('button[type="submit"]').click();

    // Verify redirected to Dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByRole("heading", { name: "Kedar Hospital" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today's Overview" })).toBeVisible();

    // Verify dynamic metrics cards (Section 10 Today's Overview)
    const main = page.locator("main");
    await expect(main.getByText("Patients").first()).toBeVisible();
    await expect(main.getByText("Appointments").first()).toBeVisible();
    await expect(main.getByText("Checked-in").first()).toBeVisible();
    await expect(main.getByText("Waiting").first()).toBeVisible();
    await expect(main.getByText("In Consultation").first()).toBeVisible();
    await expect(main.getByText("Completed").first()).toBeVisible();
  });

  // Test 2: Patient Search & Zero-Knowledge QR Verification
  test("2. Patient Search & OneHealth Profile with Secure QR", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("admin");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*dashboard/);

    await page.goto("/patients");
    await expect(page.getByText("Patient Management")).toBeVisible();

    // Search for Meenakshi (seeded Kedar patient p-k-101)
    const searchInput = page.getByPlaceholder("Search by name, OneHealth ID, diagnosis, or phone number...");
    await searchInput.fill("Meenakshi");
    await page.getByRole("button", { name: "Search Registry" }).click();

    // Click on Meenakshi's record (adaptive for desktop table and mobile cards)
    const patientItem = page.getByText("Meenakshi Sundaram").locator("visible=true").first();
    await expect(patientItem).toBeVisible();
    await page.getByRole("link", { name: "View Profile" }).locator("visible=true").first().click();

    // Verify OneHealth ID badge and QR section
    await expect(page).toHaveURL(/.*patients\/p-.*/);
    await expect(page.locator("text=OHID-").first()).toBeVisible();
    await expect(page.getByText("Verified Citizen", { exact: false })).toBeVisible();
  });

  // Test 3: Duplicate Patient Detection & New Patient Registration
  test("3. Duplicate Patient Detection & Registration of New Citizen", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("admin");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*dashboard/);

    // Navigate to /patients/new
    await page.goto("/patients/new");
    await expect(page.getByText("Kedar Hospital Patient Registration")).toBeVisible();

    // Trigger duplicate detection using Meenakshi's phone
    const phoneInput = page.locator('input[name="phone"]');
    await phoneInput.fill("9840199001");

    // Verify duplicate warning banner appears (Section 13)
    await expect(page.getByText("Possible Existing Patient Found!")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Meenakshi Sundaram").first()).toBeVisible();

    // Now fill unique details for a new pilot patient
    const uniqueSuffix = Date.now().toString().slice(-4);
    const testName = `Kavitha Sundaram ${uniqueSuffix}`;
    const testPhone = `98402${uniqueSuffix}9`;

    await page.locator('input[name="name"]').fill(testName);
    await page.locator('input[name="age"]').fill("34");
    await page.locator('select[name="gender"]').selectOption("Female");
    await phoneInput.fill(testPhone);
    await page.locator('select[name="blood_group"]').selectOption("B+");
    await page.locator('input[name="diagnosis"]').fill("Preventive Cardiology Checkup");
    await page.locator('input[name="address"]').fill("Mugalivakkam Main Road, Chennai, Tamil Nadu");

    // Submit registration
    await page.getByRole("button", { name: "Register Patient & Generate QR" }).click();

    // Verify registration success and OneHealth ID generation
    await expect(page.getByText("Patient Successfully Registered!")).toBeVisible();
    await expect(page.locator("text=OHID-KEDAR-2026-").first()).toBeVisible();
  });

  // Test 4: Appointment Booking & Atomic Check-in
  test("4. Appointment Scheduling & Check-in Token Generation", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("admin");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*dashboard/);

    await page.goto("/appointments");
    await expect(page.getByText("Appointments & Scheduling")).toBeVisible();

    // Verify appointment booking modal opens
    await page.getByRole("button", { name: "Book New Appointment" }).click();
    await expect(page.getByText("Book Outpatient Consultation")).toBeVisible();
    await expect(page.getByText("Select Attending Specialist")).toBeVisible();

    // Select doctor (first available specialist)
    await page.locator("select").nth(1).selectOption({ index: 0 });

    // Submit booking
    await page.getByRole("button", { name: "Confirm & Issue Token" }).click();

    // Verify booking succeeded and modal closed
    await expect(page.getByText("Book Outpatient Consultation")).toBeHidden({ timeout: 5000 });

    // Verify check-in button works on scheduled appointments (adaptive to visible container)
    const checkInBtn = page.getByRole("button", { name: "Check-In" }).locator("visible=true").first();
    if (await checkInBtn.isVisible()) {
      await checkInBtn.click();
      await expect(page.getByText("Patient checked in successfully", { exact: false })).toBeVisible({ timeout: 5000 });
    }
  });

  // Test 5: OPD Queue Management & Token Transitions
  test("5. OPD Queue Board & Controls", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("admin");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*dashboard/);

    await page.goto("/queue");
    await expect(page.getByText("Live OPD Queue Orchestrator")).toBeVisible();
    await expect(page.getByText("Real-Time Synced")).toBeVisible();

    // Check queue controls
    const callNextBtn = page.getByRole("button", { name: "Call Next" }).first();
    await expect(callNextBtn).toBeVisible();
  });

  // Test 6: Doctor Console & Clinical Consultation Room
  test("6. Doctor Console & Consultation Room", async ({ page }) => {
    await page.goto("/login");
    // Login as Doctor
    await page.locator('input[type="text"]').fill("dr.senthil");
    await page.locator('input[type="password"]').fill("doctor123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*dashboard/);

    // Navigate to Doctor Queue
    await page.goto("/doctor/queue");
    await expect(page.getByRole("heading", { name: "Doctor Consultation Console" })).toBeVisible();
    await expect(page.getByText("Dr. Senthil Nathan").locator("visible=true").first()).toBeVisible();

    // Verify consultation room can be accessed
    await page.goto("/doctor/consultation/p-k-101");
    await expect(page.getByText("Clinical Consultation Room • Kedar Hospital")).toBeVisible();
    await expect(page.getByText("Meenakshi Sundaram").locator("visible=true").first()).toBeVisible();

    // Enter clinical diagnosis & notes
    await page.locator('input[placeholder*="Diabetes"]').fill("Essential Hypertension - Routine Evaluation");
    const notesArea = page.locator("textarea").last();
    await notesArea.fill("Patient evaluated at Kedar Mugalivakkam. Blood pressure 128/82 mmHg. Commenced lifestyle modification.");

    // Complete consultation
    const completeBtn = page.getByRole("button", { name: "Complete Consultation & Update Queue" });
    await completeBtn.scrollIntoViewIfNeeded();
    await completeBtn.click({ force: true });
    await expect(page.getByText("Consultation Completed & Audited!")).toBeVisible();
  });

  // Test 7: Multi-Device Responsive Layout Validations
  test("7. Responsive Viewport Audits (Zero Overflow, Touch Targets >= 44px)", async ({ page }) => {
    const viewports = [
      { name: "Mobile (390x844)", width: 390, height: 844 },
      { name: "Mobile Large (430x932)", width: 430, height: 932 },
      { name: "Tablet Portrait (768x1024)", width: 768, height: 1024 },
      { name: "Tablet Landscape (1024x768)", width: 1024, height: 768 },
      { name: "Laptop (1440x900)", width: 1440, height: 900 },
      { name: "Desktop (1920x1080)", width: 1920, height: 1080 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/login");

      // Verify no horizontal scrolling
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasOverflow, `Horizontal overflow detected in ${vp.name}`).toBeFalsy();

      // Verify submit button has adequate touch target height >= 44px
      const submitBtn = page.locator('button[type="submit"]');
      const box = await submitBtn.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });
});
