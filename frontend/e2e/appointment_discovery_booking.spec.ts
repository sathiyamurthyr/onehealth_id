import { test, expect } from "@playwright/test";

test.describe("OH-ID Patient Discovery & Appointment Booking Workflow", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Authenticate as patient Alice Smith (Sathiya Murthy)
    await page.goto("/login");
    await page.fill('input[type="text"]', "patient");
    await page.fill('input[type="password"]', "patient123");
    await page.click('button[type="submit"]');

    // Wait for patient dashboard to load
    await page.waitForURL("**/patient", { timeout: 15000 });
  });

  test("Discovery booking for Self from Dashboard", async ({ page }) => {
    // 1. Verify dashboard loaded and click Book Appointment button
    const bookBtn = page.locator("#dashboard-book-btn, #header-book-appointment-btn").first();
    await expect(bookBtn).toBeVisible({ timeout: 10000 });
    await bookBtn.click();

    // 2. Step 1: Who is this appointment for? -> Select Myself
    await expect(page.locator("text=Book an Appointment")).toBeVisible();
    await expect(page.locator("text=Who is this appointment for?")).toBeVisible();
    
    // Choose Myself card
    const myselfCard = page.locator("text=Myself (Sathiya Murthy)").or(page.locator("text=Myself (Alice Smith)")).first();
    await expect(myselfCard).toBeVisible();
    await myselfCard.click();

    // Click Continue
    await page.click('button:has-text("Continue")');

    // 3. Step 2: Location search
    await expect(page.locator("text=Where do you want to visit?")).toBeVisible();
    const locationInput = page.locator('input[placeholder*="Search city, area, landmark"]');
    await locationInput.fill("Mugalivakkam");
    await page.click('button:has-text("Continue to Requirement")');

    // 4. Step 3: Healthcare Requirement / Specialty
    await expect(page.locator("text=What healthcare service do you need?")).toBeVisible();
    // Search for Orthopedics or select from popular pills
    const orthoPill = page.locator('button:has-text("Orthopedics & Trauma")').first();
    if (await orthoPill.isVisible()) {
      await orthoPill.click();
    } else {
      const specialtySearch = page.locator('input[placeholder*="Search by specialty, illness"]');
      await specialtySearch.fill("Orthopedics");
      await page.click('text=Orthopedics & Trauma');
    }

    // Click Continue to find providers
    await page.click('button:has-text("Find Registered Providers")');

    // 5. Step 4: Registered OH-ID Providers
    await expect(page.locator("text=Registered Healthcare Providers")).toBeVisible();
    await expect(page.locator("text=Registered on OH-ID").first()).toBeVisible();

    // Select Kedar Hospital or first provider
    const selectHospitalBtn = page.locator('button:has-text("Select Facility")').first();
    await expect(selectHospitalBtn).toBeVisible();
    await selectHospitalBtn.click();

    // 6. Step 5: Department Selection
    await expect(page.locator("text=Choose Department / Specialty")).toBeVisible();
    const deptCard = page.locator('button:has-text("Orthopedics & Trauma"), button:has-text("General Medicine"), button:has-text("Cardiology")').first();
    await deptCard.click();
    await page.click('button:has-text("Continue to Doctor Selection")');

    // 7. Step 6: Doctor Selection
    await expect(page.locator("text=Choose Doctor")).toBeVisible();
    // Select first doctor or "Any Available Doctor"
    const doctorCard = page.locator('button:has-text("Select Doctor"), button:has-text("Any Available Specialist")').first();
    await doctorCard.click();

    // 8. Step 7: Date & Slot Picker
    await expect(page.locator("text=Select Date & Available Slot")).toBeVisible();
    // Pick an available slot
    const slotBtn = page.locator('button:has-text("AM"), button:has-text("PM")').first();
    await expect(slotBtn).toBeVisible();
    await slotBtn.click();
    await page.click('button:has-text("Continue to Consultation Details")');

    // 9. Step 8: Reason & Type
    await expect(page.locator("text=Appointment Details & Reason")).toBeVisible();
    await page.fill('textarea[placeholder*="Briefly describe the purpose"]', "Regular follow-up orthopedic checkup");
    await page.click('button:has-text("Review Appointment")');

    // 10. Step 9: Review & Confirm
    await expect(page.locator("text=Review Appointment Details")).toBeVisible();
    await expect(page.locator("text=Appointment For")).toBeVisible();
    
    // Confirm Appointment
    const confirmBtn = page.locator('button:has-text("Confirm & Book Appointment")');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 11. Success Screen
    await expect(page.locator("text=Appointment Confirmed!")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Appointment ID:")).toBeVisible();
    await expect(page.locator("text=Download Calendar Invite (.ics)")).toBeVisible();

    // Close modal
    await page.click('button:has-text("View in My Appointments")');
    await page.waitForURL("**/patient/appointments", { timeout: 10000 });

    // Verify appointment card in Appointments page
    await expect(page.locator("text=My Appointments").or(page.locator("text=Family Appointments"))).toBeVisible();
  });

  test("Discovery booking for Family Member (Son)", async ({ page }) => {
    // Navigate directly to appointments page
    await page.goto("/patient/appointments");
    await page.waitForLoadState("networkidle");

    // Click + Book Appointment button
    const bookBtn = page.locator("#book-appointment-btn").first();
    await expect(bookBtn).toBeVisible();
    await bookBtn.click();

    // Step 1: Select Family Member
    await expect(page.locator("text=Book an Appointment")).toBeVisible();
    await page.click('button:has-text("Family Member")');

    // Select Son (Charlie)
    const sonCard = page.locator("text=Son").or(page.locator("text=Charlie")).first();
    await expect(sonCard).toBeVisible();
    await sonCard.click();

    // Continue
    await page.click('button:has-text("Continue")');

    // Step 2: Location
    await page.click('button:has-text("Continue to Requirement")');

    // Step 3: Healthcare Service (e.g. Pediatrics or General Medicine)
    await expect(page.locator("text=What healthcare service do you need?")).toBeVisible();
    const pediaPill = page.locator('button:has-text("Pediatrics"), button:has-text("General Medicine")').first();
    await pediaPill.click();
    await page.click('button:has-text("Find Registered Providers")');

    // Step 4: Provider Selection
    await expect(page.locator("text=Registered Healthcare Providers")).toBeVisible();
    await page.locator('button:has-text("Select Facility")').first().click();

    // Step 5: Department
    await expect(page.locator("text=Choose Department / Specialty")).toBeVisible();
    await page.locator('div.grid button').first().click();
    await page.click('button:has-text("Continue to Doctor Selection")');

    // Step 6: Doctor
    await expect(page.locator("text=Choose Doctor")).toBeVisible();
    await page.locator('button:has-text("Select Doctor"), button:has-text("Any Available Specialist")').first().click();

    // Step 7: Slot
    await expect(page.locator("text=Select Date & Available Slot")).toBeVisible();
    await page.locator('button:has-text("AM"), button:has-text("PM")').first().click();
    await page.click('button:has-text("Continue to Consultation Details")');

    // Step 8: Reason
    await page.fill('textarea[placeholder*="Briefly describe the purpose"]', "Pediatric vaccination and wellness review");
    await page.click('button:has-text("Review Appointment")');

    // Step 9: Review audit verification
    await expect(page.locator("text=Booked By (Authorized Family Representative)")).toBeVisible();
    await page.click('button:has-text("Confirm & Book Appointment")');

    // Confirmation
    await expect(page.locator("text=Appointment Confirmed!")).toBeVisible({ timeout: 15000 });
    await page.click('button:has-text("View in My Appointments")');

    // Verify Appointments List shows Son badge
    await expect(page.locator("text=Son:").first()).toBeVisible({ timeout: 10000 });
  });
});
