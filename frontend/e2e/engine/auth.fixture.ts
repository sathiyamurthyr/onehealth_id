import { Page, expect } from "@playwright/test";

export interface TestPersona {
  roleCode: string;
  roleName: string;
  username: string;
  password: string;
  expectedRouteRegex: RegExp;
}

export const PERSONAS: Record<string, TestPersona> = {
  SUPER_ADMIN: {
    roleCode: "SUPER_ADMIN",
    roleName: "Sathu's Platform Super Admin",
    username: "9840000000",
    password: "admin123",
    expectedRouteRegex: /.*(admin|super-admin)/,
  },
  HOSPITAL_ADMIN: {
    roleCode: "HOSPITAL_ADMIN",
    roleName: "Hospital Administrator",
    username: "9840012345",
    password: "admin123",
    expectedRouteRegex: /.*hospital/,
  },
  DOCTOR_SENTHIL: {
    roleCode: "DOCTOR",
    roleName: "Senior Cardiologist",
    username: "9840111222",
    password: "doctor123",
    expectedRouteRegex: /.*doctor/,
  },
  NURSE_PRIYA: {
    roleCode: "NURSE",
    roleName: "Staff Nurse",
    username: "9840155666",
    password: "nurse123",
    expectedRouteRegex: /.*nurse/,
  },
  RECEPTIONIST: {
    roleCode: "RECEPTIONIST",
    roleName: "Front Desk Receptionist",
    username: "9840177888",
    password: "rec123",
    expectedRouteRegex: /.*(reception|employee)/,
  },
  PATIENT_RAMESH: {
    roleCode: "PATIENT",
    roleName: "Citizen Patient",
    username: "9840199999",
    password: "patient123",
    expectedRouteRegex: /.*patient/,
  },
};

/**
 * Automates browser login flow for a designated persona.
 */
export async function loginAsPersona(page: Page, persona: TestPersona): Promise<string> {
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");

  // Fill in login credentials
  await page.locator('input#login-username, input[type="text"]').first().fill(persona.username);
  await page.locator('input#login-password, input[type="password"]').first().fill(persona.password);

  // Click submit button
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();

  // Authoritative redirect verification
  await expect(page).toHaveURL(persona.expectedRouteRegex, { timeout: 12000 });
  await page.waitForLoadState("domcontentloaded");

  // Retrieve JWT access token from localStorage
  const token = await page.evaluate(() => localStorage.getItem("oh_access_token") || "");
  expect(token).toBeTruthy();

  return token;
}

/**
 * Logs out current active user session cleanly.
 */
export async function logoutUser(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    window.location.href = "/login";
  });
  await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
}
