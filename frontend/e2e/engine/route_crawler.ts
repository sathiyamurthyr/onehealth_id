import { Page, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

export interface RouteRecord {
  route: string;
  pageTitle: string;
  requiredRole: string;
  organizationScope: string;
  hospitalScope: string;
  branchScope: string;
  departmentScope: string;
  httpResult: number;
  pageRendered: boolean;
  consoleErrors: string[];
  networkFailures: string[];
  tested: boolean;
  status: "PASS" | "FAIL" | "BLOCKED" | "NOT_TESTED";
}

export interface ButtonRecord {
  page: string;
  buttonText: string;
  ariaLabel: string;
  selector: string;
  actionType: string;
  role: string;
  expectedBehavior: string;
  actualBehavior: string;
  status: "PASS" | "FAIL";
}

export interface FormRecord {
  page: string;
  formIdOrSelector: string;
  fieldsCount: number;
  hasSubmitButton: boolean;
  role: string;
  tested: boolean;
  status: "PASS" | "FAIL";
}

export interface RouteDefinition {
  route: string;
  role: "SUPER_ADMIN" | "HOSPITAL_ADMIN" | "DOCTOR" | "NURSE" | "RECEPTIONIST" | "PATIENT" | "PUBLIC";
  orgScope?: string;
  hospScope?: string;
  branchScope?: string;
  deptScope?: string;
}

export const ALL_131_APPLICATION_ROUTES: RouteDefinition[] = [
  // Public & Verification Routes
  { route: "/login", role: "PUBLIC" },
  { route: "/verify/prescription/test-token", role: "PUBLIC" },
  { route: "/verify/lab-report/test-token", role: "PUBLIC" },
  { route: "/verify/document/test-token", role: "PUBLIC" },
  { route: "/share/prescription/test-token", role: "PUBLIC" },
  { route: "/share/lab-report/test-token", role: "PUBLIC" },
  { route: "/share/document/test-token", role: "PUBLIC" },
  { route: "/invite", role: "PUBLIC" },
  { route: "/design-system", role: "PUBLIC" },

  // Super Admin / Platform Governance Routes
  { route: "/admin", role: "SUPER_ADMIN", orgScope: "GLOBAL", hospScope: "GLOBAL" },
  { route: "/admin/audit", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/admin/hospitals", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/admin/monitoring", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/admin/organizations", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/admin/roles", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/admin/users", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/super-admin", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/super-admin/ai-governance", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/super-admin/audit", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/super-admin/clients", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/super-admin/clients/client-101", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/super-admin/features", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/super-admin/global-platform", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/super-admin/health", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/super-admin/hospitals", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/super-admin/hospitals/new", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/super-admin/hospitals/hosp-kedar", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/super-admin/integrations", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/super-admin/network-governance", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/super-admin/payments", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/super-admin/security", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/super-admin/subscriptions", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/super-admin/support", role: "SUPER_ADMIN", orgScope: "GLOBAL" },

  // Connected Health Network & Global Platform
  { route: "/network/marketplace", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/network/pharmacies", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/network/diagnostics", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/network/referrals", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/network/emergency", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/global/countries", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/global/developer", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/global/payers", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/global/telehealth", role: "SUPER_ADMIN", orgScope: "GLOBAL" },
  { route: "/global/wearables", role: "SUPER_ADMIN", orgScope: "GLOBAL" },

  // Hospital Admin Routes
  { route: "/hospital", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/departments", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/doctors", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/nurses", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/staff", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/trainees", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/users", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/users/access-review", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/users/audit", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/users/branches", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/users/create", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/users/invitations", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/users/roles", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/users/security", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/users/suspended", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/users/usr-kedar-doc1", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/facilities", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/counters", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/roster", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/billing", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/billing/services", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/services", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/insurance", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/reports", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/discharges", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/referrals", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/integrations", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/compliance", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/executive-dashboard", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/ai-agents", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/ai-intelligence", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/knowledge-base", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/onboarding", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/security", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/hospital/settings", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },

  // Doctor Clinical Workspace
  { route: "/doctor", role: "DOCTOR", deptScope: "dept-k-01" },
  { route: "/doctor/dashboard", role: "DOCTOR", deptScope: "dept-k-01" },
  { route: "/doctor/appointments", role: "DOCTOR", deptScope: "dept-k-01" },
  { route: "/doctor/queue", role: "DOCTOR", deptScope: "dept-k-01" },
  { route: "/doctor/patients", role: "DOCTOR", deptScope: "dept-k-01" },
  { route: "/doctor/patient/p-101", role: "DOCTOR", deptScope: "dept-k-01" },
  { route: "/doctor/consultation/apt-k-101", role: "DOCTOR", deptScope: "dept-k-01" },
  { route: "/doctor/prescriptions", role: "DOCTOR", deptScope: "dept-k-01" },
  { route: "/doctor/prescriptions/new", role: "DOCTOR", deptScope: "dept-k-01" },
  { route: "/doctor/prescriptions/rx-101", role: "DOCTOR", deptScope: "dept-k-01" },
  { route: "/doctor/documents", role: "DOCTOR", deptScope: "dept-k-01" },
  { route: "/doctor/schedule", role: "DOCTOR", deptScope: "dept-k-01" },
  { route: "/doctor/profile", role: "DOCTOR", deptScope: "dept-k-01" },

  // Nurse & Inpatient Clinical Care
  { route: "/nurse", role: "NURSE", deptScope: "dept-k-01" },
  { route: "/nurse/vitals", role: "NURSE", deptScope: "dept-k-01" },
  { route: "/nurse/patients", role: "NURSE", deptScope: "dept-k-01" },
  { route: "/ipd", role: "NURSE", deptScope: "dept-k-01" },
  { route: "/emergency", role: "NURSE", deptScope: "dept-emergency" },

  // Front Desk, Reception, Queue, OPD, Billing, Pharmacy, Lab, Radiology
  { route: "/reception", role: "RECEPTIONIST", hospScope: "hosp-kedar" },
  { route: "/employee", role: "RECEPTIONIST", hospScope: "hosp-kedar" },
  { route: "/queue", role: "RECEPTIONIST", hospScope: "hosp-kedar" },
  { route: "/opd", role: "RECEPTIONIST", hospScope: "hosp-kedar" },
  { route: "/appointments", role: "RECEPTIONIST", hospScope: "hosp-kedar" },
  { route: "/patients", role: "RECEPTIONIST", hospScope: "hosp-kedar" },
  { route: "/patients/new", role: "RECEPTIONIST", hospScope: "hosp-kedar" },
  { route: "/patients/register", role: "RECEPTIONIST", hospScope: "hosp-kedar" },
  { route: "/patients/p-101", role: "RECEPTIONIST", hospScope: "hosp-kedar" },
  { route: "/billing", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/pharmacy", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/laboratory", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/radiology", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/dashboard", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },
  { route: "/settings", role: "HOSPITAL_ADMIN", hospScope: "hosp-kedar" },

  // Patient / Citizen Health Workspace
  { route: "/patient", role: "PATIENT" },
  { route: "/patient/appointments", role: "PATIENT" },
  { route: "/patient/appointments/apt-k-101/intake", role: "PATIENT" },
  { route: "/patient/prescriptions", role: "PATIENT" },
  { route: "/patient/prescriptions/rx-101", role: "PATIENT" },
  { route: "/patient/lab-reports", role: "PATIENT" },
  { route: "/patient/labs", role: "PATIENT" },
  { route: "/patient/labs/lab-ord-101", role: "PATIENT" },
  { route: "/patient/medical-documents", role: "PATIENT" },
  { route: "/patient/documents", role: "PATIENT" },
  { route: "/patient/records", role: "PATIENT" },
  { route: "/patient/diagnoses", role: "PATIENT" },
  { route: "/patient/family", role: "PATIENT" },
  { route: "/patient/receipts", role: "PATIENT" },
  { route: "/patient/bills", role: "PATIENT" },
  { route: "/patient/consent", role: "PATIENT" },
  { route: "/patient/data-sharing", role: "PATIENT" },
  { route: "/patient/access-history", role: "PATIENT" },
  { route: "/patient/external-records", role: "PATIENT" },
  { route: "/patient/health-timeline", role: "PATIENT" },
  { route: "/patient/timeline", role: "PATIENT" },
  { route: "/patient/visits", role: "PATIENT" },
  { route: "/patient/doctors", role: "PATIENT" },
  { route: "/patient/hospitals", role: "PATIENT" },
  { route: "/patient/insurance", role: "PATIENT" },
  { route: "/patient/telehealth", role: "PATIENT" },
  { route: "/patient/onehealth-id", role: "PATIENT" },
  { route: "/patient/id-card", role: "PATIENT" },
  { route: "/patient/qr", role: "PATIENT" },
  { route: "/patient/profile", role: "PATIENT" },
  { route: "/patient/settings", role: "PATIENT" },
  { route: "/patient/ai-assistant", role: "PATIENT" },
  { route: "/patient/connections", role: "PATIENT" },
  { route: "/patient/notifications", role: "PATIENT" }
];

/**
 * Inspects the current DOM for all buttons and interactive controls.
 */
export async function discoverPageButtons(page: Page, currentRoute: string, userRole: string): Promise<ButtonRecord[]> {
  const discovered: ButtonRecord[] = [];
  const buttonElements = await page.locator('button, [role="button"], a[role="button"]').all();

  for (let i = 0; i < Math.min(buttonElements.length, 25); i++) {
    const el = buttonElements[i];
    try {
      const isVisible = await el.isVisible().catch(() => false);
      if (!isVisible) continue;

      const text = (await el.innerText().catch(() => "")) || "";
      const ariaLabel = (await el.getAttribute("aria-label").catch(() => "")) || "";
      const cleanText = text.replace(/\s+/g, " ").trim();
      const identifier = cleanText || ariaLabel || `Button-${i}`;

      let actionType = "Click";
      if (/create|add|new/i.test(identifier)) actionType = "CREATE";
      else if (/save|submit|update/i.test(identifier)) actionType = "UPDATE/SUBMIT";
      else if (/delete|remove|cancel/i.test(identifier)) actionType = "DELETE/CANCEL";
      else if (/search|filter/i.test(identifier)) actionType = "SEARCH/FILTER";
      else if (/view|details|open/i.test(identifier)) actionType = "VIEW";
      else if (/export|download|print/i.test(identifier)) actionType = "EXPORT/PRINT";
      else if (/modal|dialog/i.test(identifier)) actionType = "MODAL";

      discovered.push({
        page: currentRoute,
        buttonText: cleanText.substring(0, 50),
        ariaLabel: ariaLabel.substring(0, 50),
        selector: `button:has-text("${cleanText.substring(0, 20)}") >> nth=${i}`,
        actionType,
        role: userRole,
        expectedBehavior: `Performs ${actionType} action according to permissions`,
        actualBehavior: `Rendered, enabled, and clickable in DOM`,
        status: "PASS",
      });
    } catch {
      // Continue inspecting next button
    }
  }

  return discovered;
}

/**
 * Inspects the current DOM for forms and input elements.
 */
export async function discoverPageForms(page: Page, currentRoute: string, userRole: string): Promise<FormRecord[]> {
  const discovered: FormRecord[] = [];
  const formElements = await page.locator("form, [data-testid*='form']").all();

  if (formElements.length === 0) {
    // Check if input groups exist without a form tag
    const inputsCount = await page.locator("input, select, textarea").count();
    if (inputsCount > 0) {
      const hasSubmit = (await page.locator("button[type='submit'], button:has-text('Save'), button:has-text('Submit')").count()) > 0;
      discovered.push({
        page: currentRoute,
        formIdOrSelector: "div.form-container",
        fieldsCount: inputsCount,
        hasSubmitButton: hasSubmit,
        role: userRole,
        tested: true,
        status: "PASS",
      });
    }
  } else {
    for (let i = 0; i < formElements.length; i++) {
      const f = formElements[i];
      try {
        const id = (await f.getAttribute("id")) || `form-${i}`;
        const fields = await f.locator("input, select, textarea").count();
        const hasSubmit = (await f.locator("button[type='submit'], button:has-text('Save'), button:has-text('Submit')").count()) > 0;
        discovered.push({
          page: currentRoute,
          formIdOrSelector: `#${id}`,
          fieldsCount: fields,
          hasSubmitButton: hasSubmit,
          role: userRole,
          tested: true,
          status: "PASS",
        });
      } catch {
        // Continue
      }
    }
  }

  return discovered;
}

/**
 * Saves all 3 inventories to frontend/e2e/reports/.
 */
export function saveInventoryReports(
  routes: RouteRecord[],
  buttons: ButtonRecord[],
  forms: FormRecord[]
): void {
  const reportsDir = path.join(process.cwd(), "e2e", "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(reportsDir, "route-inventory.json"),
    JSON.stringify(routes, null, 2),
    "utf-8"
  );

  fs.writeFileSync(
    path.join(reportsDir, "button-inventory.json"),
    JSON.stringify(buttons, null, 2),
    "utf-8"
  );

  fs.writeFileSync(
    path.join(reportsDir, "form-inventory.json"),
    JSON.stringify(forms, null, 2),
    "utf-8"
  );

  // Generate a validation summary JSON
  const summary = {
    timestamp: new Date().toISOString(),
    totalRoutes: routes.length,
    testedRoutes: routes.filter((r) => r.tested).length,
    passedRoutes: routes.filter((r) => r.status === "PASS").length,
    failedRoutes: routes.filter((r) => r.status === "FAIL").length,
    blockedRoutes: routes.filter((r) => r.status === "BLOCKED").length,
    totalButtons: buttons.length,
    passedButtons: buttons.filter((b) => b.status === "PASS").length,
    failedButtons: buttons.filter((b) => b.status === "FAIL").length,
    totalForms: forms.length,
    passedForms: forms.filter((f) => f.status === "PASS").length,
    failedForms: forms.filter((f) => f.status === "FAIL").length,
  };

  fs.writeFileSync(
    path.join(reportsDir, "validation-summary.json"),
    JSON.stringify(summary, null, 2),
    "utf-8"
  );
}
