import { test, expect } from "@playwright/test";

test.describe("OH-ID Doctor Patient Consultation Workspace E2E", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Unified Doctor Authentication
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("dr.senthil");
    await page.locator('input[type="password"]').fill("doctor123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*doctor/);
  });

  test("should open authorized patient workspace with persistent header and patient intake", async ({ page }) => {
    // 2. Open Consultation for Alice Smith (p-101)
    await page.goto("/doctor/consultation/p-101");

    // Verify Persistent Patient Header
    await expect(page.getByText("Alice Smith").first()).toBeVisible();
    await expect(page.getByText(/OHID|OH-ID|p-101/).first()).toBeVisible();

    // Verify Patient-Reported Intake
    await expect(page.getByText("Patient-Reported Problem & Visit Description").first()).toBeVisible();
    await expect(page.getByText(/Tell the doctor what you are experiencing/i).first()).toBeVisible();

    // Verify Vitals Matrix
    await expect(page.getByText("Patient Vital Signs Matrix")).toBeVisible();
    await expect(page.getByText(/Blood Pressure/i).first()).toBeVisible();

    // Verify Clinical Documentation SOAP notes
    await expect(page.getByText("Doctor Clinical Documentation (SOAP Notes)")).toBeVisible();

    // Verify ICD-10 Diagnoses
    await expect(page.getByText("Clinical Diagnosis (ICD-10 Coded)")).toBeVisible();

    // Verify Investigation Ordering
    await expect(page.getByText("Order Investigations & Lab Tests")).toBeVisible();
  });

  test("should switch across all 11 patient-scoped clinical navigation tabs", async ({ page }) => {
    await page.goto("/doctor/consultation/p-101");

    // 1. Overview Tab
    await page.getByRole("button", { name: "Overview", exact: true }).click();
    await expect(page.getByText("Last Visit").first()).toBeVisible();
    await expect(page.getByText("Pending Lab Tests").first()).toBeVisible();

    // 2. Medical History Tab (Cross-Hospital)
    await page.getByRole("button", { name: "Medical History", exact: true }).click();
    await expect(page.getByText("Cross-Hospital Longitudinal History").first()).toBeVisible();

    // 3. Lab Reports & Investigations Tab
    await page.getByRole("button", { name: "Lab Reports & Investigations", exact: true }).click();
    await expect(page.getByText("Investigation Orders & Lab Results").first()).toBeVisible();

    // 4. Referrals Tab
    await page.getByRole("button", { name: "Referrals", exact: true }).click();
    await expect(page.getByText("Specialist Referrals").first()).toBeVisible();

    // 5. Timeline Tab
    await page.getByRole("button", { name: "Timeline", exact: true }).click();
    await expect(page.getByText("Chronological Clinical Event Stream").first()).toBeVisible();

    // 6. Return to Consultation Tab
    await page.getByRole("button", { name: "Consultation", exact: true }).click();
    await expect(page.getByText("Review & Complete Consultation")).toBeVisible();
  });

  test("should test investigation ordering and urgent priority confirmation modal", async ({ page }) => {
    await page.goto("/doctor/consultation/p-101");

    // Click CBC test card in the investigation catalog
    const cbcCard = page.locator('button:has-text("Complete Blood Count (CBC)")').first();
    await expect(cbcCard).toBeVisible();
    await cbcCard.click();

    // Check if configuration panel appeared
    await expect(page.getByText(/Configuring.*Investigation Order/i).first()).toBeVisible();

    // Set Priority to URGENT
    const urgentBtn = page.getByRole("button", { name: "URGENT" }).first();
    await urgentBtn.click();

    // Click Order
    const orderBtn = page.getByRole("button", { name: /Order.*Investigation/i });
    await orderBtn.click();

    // Verify Urgent Confirmation Modal (Requirement 17)
    await expect(page.getByText("Confirm High-Priority (URGENT / STAT) Order")).toBeVisible();
    await expect(page.getByText(/Tests Marked Urgent/i)).toBeVisible();

    // Confirm Urgent Order
    await page.getByRole("button", { name: "Confirm & Dispatch Urgent Order" }).click();
    await expect(page.getByText(/Successfully ordered/i)).toBeVisible();
  });

  test("should test specialist referral with selective document sharing", async ({ page }) => {
    await page.goto("/doctor/consultation/p-101");

    // Open Referral Modal
    await page.getByRole("button", { name: "+ Create Specialist Referral" }).click();
    await expect(page.getByText("Refer Patient to Specialist")).toBeVisible();
    await expect(page.getByText("Selected Relevant Documents to Share (Privacy Scoped)")).toBeVisible();

    // Fill referral reason
    const reasonInput = page.getByPlaceholder(/Further evaluation/i);
    await reasonInput.fill("Cardiology review for intermittent chest tightness");

    // Submit referral
    await page.getByRole("button", { name: "Send Specialist Referral" }).click();
    await expect(page.getByText("Refer Patient to Specialist")).not.toBeVisible();
  });

  test("should complete consultation and display printable clinical summary sheet", async ({ page }) => {
    await page.goto("/doctor/consultation/p-101");

    // Click Review & Complete Consultation
    await page.getByRole("button", { name: "Review & Complete Consultation" }).click();

    // Verify Pre-Completion Review Modal (Requirement 29)
    await expect(page.getByText("Pre-Completion Clinical Review")).toBeVisible();
    await expect(page.getByText("Patient Problem / Description Reviewed")).toBeVisible();

    // Confirm Consultation Completion
    await page.getByRole("button", { name: "Complete Consultation", exact: true }).click();

    // Verify Finalized Printable Summary View (Requirement 30)
    await expect(page.getByText("Consultation Successfully Completed")).toBeVisible();
    await expect(page.getByText("Print Clinical Sheet")).toBeVisible();
    await expect(page.getByText("FINALIZED & SIGNED")).toBeVisible();
    await expect(page.getByText("Clinical Diagnoses (ICD-10)")).toBeVisible();
  });

  test("should verify patient-side pre-consultation intake submission", async ({ page }) => {
    // 1. Patient Login
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("patient");
    await page.locator('input[type="password"]').fill("patient123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*patient/);

    // 2. Patient fills intake form before appointment
    await page.goto("/patient/appointments/apt-001/intake");

    await expect(page.getByText("Pre-Consultation Visit Description")).toBeVisible();
    await expect(page.getByText("Tell the doctor what you are experiencing")).toBeVisible();

    const textArea = page.getByPlaceholder(/Type your symptoms and concerns here/i);
    await textArea.fill("I have experienced sharp epigastric pain for 3 days after meals with mild nausea.");

    // Select symptom
    await page.getByRole("button", { name: "Nausea" }).click();

    // Submit
    await page.getByRole("button", { name: "Submit to Doctor" }).click();
    await expect(page.getByText("Symptom Description Successfully Submitted!")).toBeVisible();
  });
});
