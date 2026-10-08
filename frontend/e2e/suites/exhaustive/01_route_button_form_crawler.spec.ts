import { test, expect } from "@playwright/test";
import { PERSONAS, loginAsPersona, logoutUser } from "../../engine/auth.fixture";
import { setupPageDiagnostics, assertPageHealth } from "../../engine/discovery.crawler";
import {
  ALL_131_APPLICATION_ROUTES,
  RouteRecord,
  ButtonRecord,
  FormRecord,
  discoverPageButtons,
  discoverPageForms,
  saveInventoryReports,
} from "../../engine/route_crawler";

test.describe("Exhaustive Route, Button & Form Crawler", () => {
  const routeRecords: RouteRecord[] = [];
  const buttonRecords: ButtonRecord[] = [];
  const formRecords: FormRecord[] = [];

  test.afterAll(async () => {
    // Generate and save all 3 inventories to frontend/e2e/reports/
    saveInventoryReports(routeRecords, buttonRecords, formRecords);
  });

  test("01. Public & Verification Route Discovery & DOM Health", async ({ page }) => {
    const { consoleErrors, failedRequests } = setupPageDiagnostics(page);
    const publicRoutes = ALL_131_APPLICATION_ROUTES.filter((r) => r.role === "PUBLIC");

    for (const item of publicRoutes) {
      const startErrors = consoleErrors.length;
      const startFailures = failedRequests.length;
      let httpResult = 200;
      let rendered = false;
      let status: "PASS" | "FAIL" = "PASS";

      try {
        const response = await page.goto(item.route, { waitUntil: "domcontentloaded", timeout: 15000 });
        httpResult = response ? response.status() : 200;
        await assertPageHealth(page);
        rendered = true;

        // Discover buttons & forms
        const buttons = await discoverPageButtons(page, item.route, "PUBLIC");
        const forms = await discoverPageForms(page, item.route, "PUBLIC");
        buttonRecords.push(...buttons);
        formRecords.push(...forms);
      } catch (err: any) {
        status = "FAIL";
      }

      routeRecords.push({
        route: item.route,
        pageTitle: (await page.title().catch(() => "")) || item.route,
        requiredRole: "PUBLIC",
        organizationScope: "PUBLIC",
        hospitalScope: "PUBLIC",
        branchScope: "PUBLIC",
        departmentScope: "PUBLIC",
        httpResult,
        pageRendered: rendered,
        consoleErrors: consoleErrors.slice(startErrors),
        networkFailures: failedRequests.slice(startFailures),
        tested: true,
        status,
      });

      expect(rendered).toBeTruthy();
    }
  });

  test("02. Super Admin & Platform Governance Route Discovery", async ({ page }) => {
    const { consoleErrors, failedRequests } = setupPageDiagnostics(page);
    await loginAsPersona(page, PERSONAS.SUPER_ADMIN);

    const superAdminRoutes = ALL_131_APPLICATION_ROUTES.filter((r) => r.role === "SUPER_ADMIN");

    for (const item of superAdminRoutes) {
      const startErrors = consoleErrors.length;
      const startFailures = failedRequests.length;
      let httpResult = 200;
      let rendered = false;
      let status: "PASS" | "FAIL" = "PASS";

      try {
        const response = await page.goto(item.route, { waitUntil: "domcontentloaded", timeout: 15000 });
        httpResult = response ? response.status() : 200;
        await assertPageHealth(page);
        rendered = true;

        const buttons = await discoverPageButtons(page, item.route, "SUPER_ADMIN");
        const forms = await discoverPageForms(page, item.route, "SUPER_ADMIN");
        buttonRecords.push(...buttons);
        formRecords.push(...forms);
      } catch (err: any) {
        status = "FAIL";
      }

      routeRecords.push({
        route: item.route,
        pageTitle: (await page.title().catch(() => "")) || item.route,
        requiredRole: "SUPER_ADMIN",
        organizationScope: item.orgScope || "GLOBAL",
        hospitalScope: item.hospScope || "GLOBAL",
        branchScope: "GLOBAL",
        departmentScope: "GLOBAL",
        httpResult,
        pageRendered: rendered,
        consoleErrors: consoleErrors.slice(startErrors),
        networkFailures: failedRequests.slice(startFailures),
        tested: true,
        status,
      });

      expect(rendered).toBeTruthy();
    }

    await logoutUser(page);
  });

  test("03. Hospital Admin Route & Department Discovery", async ({ page }) => {
    const { consoleErrors, failedRequests } = setupPageDiagnostics(page);
    await loginAsPersona(page, PERSONAS.HOSPITAL_ADMIN);

    const hospRoutes = ALL_131_APPLICATION_ROUTES.filter((r) => r.role === "HOSPITAL_ADMIN");

    for (const item of hospRoutes) {
      const startErrors = consoleErrors.length;
      const startFailures = failedRequests.length;
      let httpResult = 200;
      let rendered = false;
      let status: "PASS" | "FAIL" = "PASS";

      try {
        const response = await page.goto(item.route, { waitUntil: "domcontentloaded", timeout: 15000 });
        httpResult = response ? response.status() : 200;
        await assertPageHealth(page);
        rendered = true;

        const buttons = await discoverPageButtons(page, item.route, "HOSPITAL_ADMIN");
        const forms = await discoverPageForms(page, item.route, "HOSPITAL_ADMIN");
        buttonRecords.push(...buttons);
        formRecords.push(...forms);
      } catch (err: any) {
        status = "FAIL";
      }

      routeRecords.push({
        route: item.route,
        pageTitle: (await page.title().catch(() => "")) || item.route,
        requiredRole: "HOSPITAL_ADMIN",
        organizationScope: "ten-kedar",
        hospitalScope: item.hospScope || "hosp-kedar",
        branchScope: "branch-kedar-01",
        departmentScope: "ALL",
        httpResult,
        pageRendered: rendered,
        consoleErrors: consoleErrors.slice(startErrors),
        networkFailures: failedRequests.slice(startFailures),
        tested: true,
        status,
      });

      expect(rendered).toBeTruthy();
    }

    await logoutUser(page);
  });

  test("04. Doctor Clinical Workspace & Consultation Routes", async ({ page }) => {
    const { consoleErrors, failedRequests } = setupPageDiagnostics(page);
    await loginAsPersona(page, PERSONAS.DOCTOR_SENTHIL);

    const doctorRoutes = ALL_131_APPLICATION_ROUTES.filter((r) => r.role === "DOCTOR");

    for (const item of doctorRoutes) {
      const startErrors = consoleErrors.length;
      const startFailures = failedRequests.length;
      let httpResult = 200;
      let rendered = false;
      let status: "PASS" | "FAIL" = "PASS";

      try {
        const response = await page.goto(item.route, { waitUntil: "domcontentloaded", timeout: 15000 });
        httpResult = response ? response.status() : 200;
        await assertPageHealth(page);
        rendered = true;

        const buttons = await discoverPageButtons(page, item.route, "DOCTOR");
        const forms = await discoverPageForms(page, item.route, "DOCTOR");
        buttonRecords.push(...buttons);
        formRecords.push(...forms);
      } catch (err: any) {
        status = "FAIL";
      }

      routeRecords.push({
        route: item.route,
        pageTitle: (await page.title().catch(() => "")) || item.route,
        requiredRole: "DOCTOR",
        organizationScope: "ten-kedar",
        hospitalScope: "hosp-kedar",
        branchScope: "branch-kedar-01",
        departmentScope: item.deptScope || "dept-k-01",
        httpResult,
        pageRendered: rendered,
        consoleErrors: consoleErrors.slice(startErrors),
        networkFailures: failedRequests.slice(startFailures),
        tested: true,
        status,
      });

      expect(rendered).toBeTruthy();
    }

    await logoutUser(page);
  });

  test("05. Nurse, Inpatient & Emergency Workspace Routes", async ({ page }) => {
    const { consoleErrors, failedRequests } = setupPageDiagnostics(page);
    await loginAsPersona(page, PERSONAS.NURSE_PRIYA);

    const nurseRoutes = ALL_131_APPLICATION_ROUTES.filter((r) => r.role === "NURSE");

    for (const item of nurseRoutes) {
      const startErrors = consoleErrors.length;
      const startFailures = failedRequests.length;
      let httpResult = 200;
      let rendered = false;
      let status: "PASS" | "FAIL" = "PASS";

      try {
        const response = await page.goto(item.route, { waitUntil: "domcontentloaded", timeout: 15000 });
        httpResult = response ? response.status() : 200;
        await assertPageHealth(page);
        rendered = true;

        const buttons = await discoverPageButtons(page, item.route, "NURSE");
        const forms = await discoverPageForms(page, item.route, "NURSE");
        buttonRecords.push(...buttons);
        formRecords.push(...forms);
      } catch (err: any) {
        status = "FAIL";
      }

      routeRecords.push({
        route: item.route,
        pageTitle: (await page.title().catch(() => "")) || item.route,
        requiredRole: "NURSE",
        organizationScope: "ten-kedar",
        hospitalScope: "hosp-kedar",
        branchScope: "branch-kedar-01",
        departmentScope: item.deptScope || "dept-k-01",
        httpResult,
        pageRendered: rendered,
        consoleErrors: consoleErrors.slice(startErrors),
        networkFailures: failedRequests.slice(startFailures),
        tested: true,
        status,
      });

      expect(rendered).toBeTruthy();
    }

    await logoutUser(page);
  });

  test("06. Receptionist, Queue, OPD & Patient Management Routes", async ({ page }) => {
    const { consoleErrors, failedRequests } = setupPageDiagnostics(page);
    await loginAsPersona(page, PERSONAS.RECEPTIONIST);

    const recRoutes = ALL_131_APPLICATION_ROUTES.filter((r) => r.role === "RECEPTIONIST");

    for (const item of recRoutes) {
      const startErrors = consoleErrors.length;
      const startFailures = failedRequests.length;
      let httpResult = 200;
      let rendered = false;
      let status: "PASS" | "FAIL" = "PASS";

      try {
        const response = await page.goto(item.route, { waitUntil: "domcontentloaded", timeout: 15000 });
        httpResult = response ? response.status() : 200;
        await assertPageHealth(page);
        rendered = true;

        const buttons = await discoverPageButtons(page, item.route, "RECEPTIONIST");
        const forms = await discoverPageForms(page, item.route, "RECEPTIONIST");
        buttonRecords.push(...buttons);
        formRecords.push(...forms);
      } catch (err: any) {
        status = "FAIL";
      }

      routeRecords.push({
        route: item.route,
        pageTitle: (await page.title().catch(() => "")) || item.route,
        requiredRole: "RECEPTIONIST",
        organizationScope: "ten-kedar",
        hospitalScope: "hosp-kedar",
        branchScope: "branch-kedar-01",
        departmentScope: "OPD",
        httpResult,
        pageRendered: rendered,
        consoleErrors: consoleErrors.slice(startErrors),
        networkFailures: failedRequests.slice(startFailures),
        tested: true,
        status,
      });

      expect(rendered).toBeTruthy();
    }

    await logoutUser(page);
  });

  test("07. Citizen Patient Portal & Health Records Routes", async ({ page }) => {
    const { consoleErrors, failedRequests } = setupPageDiagnostics(page);
    await loginAsPersona(page, PERSONAS.PATIENT_RAMESH);

    const patientRoutes = ALL_131_APPLICATION_ROUTES.filter((r) => r.role === "PATIENT");

    for (const item of patientRoutes) {
      const startErrors = consoleErrors.length;
      const startFailures = failedRequests.length;
      let httpResult = 200;
      let rendered = false;
      let status: "PASS" | "FAIL" = "PASS";

      try {
        const response = await page.goto(item.route, { waitUntil: "domcontentloaded", timeout: 15000 });
        httpResult = response ? response.status() : 200;
        await assertPageHealth(page);
        rendered = true;

        const buttons = await discoverPageButtons(page, item.route, "PATIENT");
        const forms = await discoverPageForms(page, item.route, "PATIENT");
        buttonRecords.push(...buttons);
        formRecords.push(...forms);
      } catch (err: any) {
        status = "FAIL";
      }

      routeRecords.push({
        route: item.route,
        pageTitle: (await page.title().catch(() => "")) || item.route,
        requiredRole: "PATIENT",
        organizationScope: "ten-kedar",
        hospitalScope: "hosp-kedar",
        branchScope: "branch-kedar-01",
        departmentScope: "CITIZEN",
        httpResult,
        pageRendered: rendered,
        consoleErrors: consoleErrors.slice(startErrors),
        networkFailures: failedRequests.slice(startFailures),
        tested: true,
        status,
      });

      expect(rendered).toBeTruthy();
    }

    await logoutUser(page);
  });
});
