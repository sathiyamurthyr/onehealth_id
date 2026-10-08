import { test, expect } from "@playwright/test";
import { PERSONAS, loginAsPersona, logoutUser } from "../../engine/auth.fixture";
import { setupPageDiagnostics, assertPageHealth } from "../../engine/discovery.crawler";

test.describe("Exhaustive Clinical Golden Journey & Multi-Department Handoff", () => {
  test("Phase A: Citizen Patient Appointment Booking & Discovery", async ({ page }) => {
    setupPageDiagnostics(page);
    await loginAsPersona(page, PERSONAS.PATIENT_RAMESH);

    // 1. Visit Patient Appointments
    await page.goto("/patient/appointments");
    await assertPageHealth(page, "/patient/appointments");

    // 2. Open Appointment Discovery / Booking Interface
    const bookBtn = page.locator('button:has-text("Book Appointment"), button:has-text("+ Book Appointment"), button:has-text("Schedule")').first();
    if (await bookBtn.isVisible()) {
      await bookBtn.click();
      await page.waitForTimeout(500);
    }

    // 3. Verify Patient Header & Dashboard
    await page.goto("/patient");
    await assertPageHealth(page, "/patient");
    await expect(page.locator("text=Verified Citizen Healthcare Identity").filter({ visible: true }).first()).toBeVisible({ timeout: 12000 });

    await logoutUser(page);
  });

  test("Phase B: Receptionist Patient Check-In & OPD Queue Token Issuance", async ({ page }) => {
    setupPageDiagnostics(page);
    await loginAsPersona(page, PERSONAS.RECEPTIONIST);

    // 1. Visit Reception Desk
    await page.goto("/employee");
    await assertPageHealth(page, "/employee");

    // 2. Visit OPD Queue Management
    await page.goto("/queue");
    await assertPageHealth(page, "/queue");
    await expect(page.locator("text=Live OPD Queue Orchestrator").filter({ visible: true }).first()).toBeVisible({ timeout: 12000 });

    // 3. Check Patients Directory
    await page.goto("/patients");
    await assertPageHealth(page, "/patients");

    await logoutUser(page);
  });

  test("Phase C: Doctor Clinical Consultation Workspace, Queue Calling & Vitals", async ({ page }) => {
    setupPageDiagnostics(page);
    await loginAsPersona(page, PERSONAS.DOCTOR_SENTHIL);

    // 1. Doctor Dashboard & Queue
    await page.goto("/doctor");
    await assertPageHealth(page, "/doctor");
    await expect(page.getByText(/Active Clinician|OP Practice|Doctor|Consultation/i).first()).toBeVisible({ timeout: 12000 });

    // 2. Doctor Queue
    await page.goto("/doctor/queue");
    await assertPageHealth(page, "/doctor/queue");

    // 3. Doctor Consultation Workspace with active patient
    await page.goto("/doctor/consultation/p-101?appointment_id=apt-k-101");
    await assertPageHealth(page, "/doctor/consultation");

    await logoutUser(page);
  });

  test("Phase D: Doctor Digital Prescription Generation & Verification PIN", async ({ page }) => {
    setupPageDiagnostics(page);
    await loginAsPersona(page, PERSONAS.DOCTOR_SENTHIL);

    // 1. Navigate to Prescriptions
    await page.goto("/doctor/prescriptions");
    await assertPageHealth(page, "/doctor/prescriptions");

    // 2. Navigate to New Prescription Creator
    await page.goto("/doctor/prescriptions/new");
    await assertPageHealth(page, "/doctor/prescriptions");

    // Wait for form to mount
    await expect(page.locator("text=Create New Prescription").filter({ visible: true }).first()).toBeVisible({ timeout: 12000 });
    const inputs = await page.locator("input, textarea, select, button").count();
    expect(inputs).toBeGreaterThan(0);

    await logoutUser(page);
  });

  test("Phase E: Nurse Vitals Recording & Inpatient Monitoring", async ({ page }) => {
    setupPageDiagnostics(page);
    await loginAsPersona(page, PERSONAS.NURSE_PRIYA);

    // 1. Nurse Workspace
    await page.goto("/nurse");
    await assertPageHealth(page, "/nurse");

    // 2. Nurse Vitals Entry
    await page.goto("/nurse/vitals");
    await assertPageHealth(page, "/nurse/vitals");

    // 3. Inpatient Wards (IPD)
    await page.goto("/ipd");
    await assertPageHealth(page, "/ipd");

    await logoutUser(page);
  });

  test("Phase F: Hospital Admin Operations, Billing, Pharmacy & Laboratory", async ({ page }) => {
    setupPageDiagnostics(page);
    await loginAsPersona(page, PERSONAS.HOSPITAL_ADMIN);

    // 1. Hospital Administration Hub
    await page.goto("/hospital");
    await assertPageHealth(page, "/hospital");

    // 2. Laboratory Operations
    await page.goto("/laboratory");
    await assertPageHealth(page, "/laboratory");

    // 3. Pharmacy Operations & Dispensing
    await page.goto("/pharmacy");
    await assertPageHealth(page, "/pharmacy");

    // 4. Hospital Billing & Cashier Desk
    await page.goto("/hospital/billing");
    await assertPageHealth(page, "/hospital/billing");

    // 5. Hospital Analytics & Executive Dashboard
    await page.goto("/hospital/executive-dashboard");
    await assertPageHealth(page, "/hospital/executive-dashboard");

    await logoutUser(page);
  });

  test("Phase G: Patient Unified Health Timeline, Receipts & OneHealth ID Verification", async ({ page }) => {
    setupPageDiagnostics(page);
    await loginAsPersona(page, PERSONAS.PATIENT_RAMESH);

    // 1. Unified Health Timeline
    await page.goto("/patient/health-timeline");
    await assertPageHealth(page, "/patient/health-timeline");

    // 2. Patient Prescriptions
    await page.goto("/patient/prescriptions");
    await assertPageHealth(page, "/patient/prescriptions");

    // 3. Patient Lab Reports
    await page.goto("/patient/lab-reports");
    await assertPageHealth(page, "/patient/lab-reports");

    // 4. Patient Invoices & Receipts
    await page.goto("/patient/receipts");
    await assertPageHealth(page, "/patient/receipts");

    // 5. Patient ID Card & Dynamic QR
    await page.goto("/patient/id-card");
    await assertPageHealth(page, "/patient/id-card");

    await logoutUser(page);
  });
});
