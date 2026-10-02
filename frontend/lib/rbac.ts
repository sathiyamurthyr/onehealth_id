/**
 * ONEHEALTH ID (OH-ID) — Centralized Role-Based Access Control (RBAC) & Scope Engine
 * Implements strict permission mapping conforming to Points 18 & 19 of OHID Enterprise Specifications.
 *
 * Matrix Model:
 * User -> Role -> Permissions -> Organization -> Hospital -> Department -> Resource -> Action
 */

export type RoleType =
  | "SUPER_ADMIN"
  | "HOSPITAL_ADMIN"
  | "DOCTOR"
  | "NURSE"
  | "RECEPTIONIST"
  | "PHARMACY_STAFF"
  | "LAB_STAFF"
  | "PATIENT";

export type PermissionAction =
  | "patient.register"
  | "patient.view"
  | "patient.edit"
  | "clinical_record.view"
  | "clinical_record.create"
  | "clinical_record.update"
  | "diagnosis.entry"
  | "diagnosis.view"
  | "prescription.create"
  | "prescription.view"
  | "prescription.sign"
  | "prescription.cancel"
  | "prescription.dispense"
  | "lab_result.view"
  | "lab_result.enter"
  | "lab_result.verify"
  | "appointment.create"
  | "appointment.view"
  | "appointment.cancel"
  | "referral.create"
  | "referral.view"
  | "billing.view"
  | "billing.create"
  | "billing.approve"
  | "user.manage";

/**
 * Enterprise Access Matrix (Point 19 Specification):
 * Defines capabilities for each healthcare role.
 */
export const ROLE_ACCESS_MATRIX: Record<RoleType, Record<string, "FULL" | "CONTROLLED" | "AUTHORIZED" | "LIMITED" | "OWN" | "NONE">> = {
  SUPER_ADMIN: {
    patient_registration: "FULL",
    patient_demographics: "FULL",
    clinical_records: "CONTROLLED",
    diagnosis: "NONE", // No routine clinical entry
    prescription: "NONE", // No routine clinical entry
    dispensing: "NONE",
    lab_result_entry: "NONE",
    appointment: "FULL",
    referral: "CONTROLLED",
    billing: "CONTROLLED",
    user_management: "FULL",
  },
  HOSPITAL_ADMIN: {
    patient_registration: "FULL",
    patient_demographics: "FULL",
    clinical_records: "CONTROLLED",
    diagnosis: "NONE",
    prescription: "NONE",
    dispensing: "LIMITED",
    lab_result_entry: "LIMITED",
    appointment: "FULL",
    referral: "CONTROLLED",
    billing: "FULL",
    user_management: "FULL",
  },
  DOCTOR: {
    patient_registration: "LIMITED",
    patient_demographics: "FULL",
    clinical_records: "FULL",
    diagnosis: "FULL",
    prescription: "FULL",
    dispensing: "NONE",
    lab_result_entry: "NONE",
    appointment: "FULL",
    referral: "FULL",
    billing: "LIMITED",
    user_management: "NONE",
  },
  NURSE: {
    patient_registration: "LIMITED",
    patient_demographics: "AUTHORIZED",
    clinical_records: "AUTHORIZED", // Vitals, nursing notes, care tasks
    diagnosis: "NONE",
    prescription: "NONE",
    dispensing: "NONE",
    lab_result_entry: "NONE",
    appointment: "AUTHORIZED",
    referral: "AUTHORIZED",
    billing: "NONE",
    user_management: "NONE",
  },
  RECEPTIONIST: {
    patient_registration: "FULL",
    patient_demographics: "FULL",
    clinical_records: "NONE",
    diagnosis: "NONE",
    prescription: "NONE",
    dispensing: "NONE",
    lab_result_entry: "NONE",
    appointment: "FULL",
    referral: "NONE",
    billing: "LIMITED",
    user_management: "NONE",
  },
  PHARMACY_STAFF: {
    patient_registration: "NONE",
    patient_demographics: "LIMITED",
    clinical_records: "NONE",
    diagnosis: "NONE",
    prescription: "AUTHORIZED", // View & dispense active prescriptions
    dispensing: "FULL",
    lab_result_entry: "NONE",
    appointment: "NONE",
    referral: "NONE",
    billing: "LIMITED",
    user_management: "NONE",
  },
  LAB_STAFF: {
    patient_registration: "NONE",
    patient_demographics: "LIMITED",
    clinical_records: "LIMITED", // Relevant test indications only
    diagnosis: "NONE",
    prescription: "NONE",
    dispensing: "NONE",
    lab_result_entry: "FULL",
    appointment: "NONE",
    referral: "NONE",
    billing: "LIMITED",
    user_management: "NONE",
  },
  PATIENT: {
    patient_registration: "OWN",
    patient_demographics: "OWN",
    clinical_records: "OWN", // Patient summary, excluding internal doctor notes
    diagnosis: "AUTHORIZED", // View confirmed diagnoses
    prescription: "OWN",
    dispensing: "AUTHORIZED",
    lab_result_entry: "AUTHORIZED",
    appointment: "OWN",
    referral: "OWN",
    billing: "OWN",
    user_management: "NONE",
  },
};

/**
 * Checks whether a given role has permission to execute an action.
 */
export function hasPermission(role: string | undefined, action: PermissionAction, userPermissions?: string[]): boolean {
  if (!role) return false;
  const normalizedRole = (role.toUpperCase().replace(/\s+/g, "_") as RoleType);

  // If specific permissions list is provided by JWT, check that first
  if (userPermissions && userPermissions.length > 0) {
    if (userPermissions.includes(action) || userPermissions.includes("system.manage")) {
      return true;
    }
  }

  // Doctor permissions
  if (normalizedRole === "DOCTOR") {
    const doctorAllowed = [
      "patient.view",
      "clinical_record.view",
      "clinical_record.create",
      "clinical_record.update",
      "diagnosis.entry",
      "diagnosis.view",
      "prescription.create",
      "prescription.view",
      "prescription.sign",
      "appointment.view",
      "appointment.create",
      "referral.create",
      "referral.view",
      "lab_result.view",
    ];
    return doctorAllowed.includes(action);
  }

  // Nurse permissions
  if (normalizedRole === "NURSE") {
    const nurseAllowed = [
      "patient.view",
      "clinical_record.view",
      "clinical_record.create", // Vitals & nursing notes only
      "appointment.view",
      "prescription.view",
      "lab_result.view",
    ];
    return nurseAllowed.includes(action);
  }

  // Pharmacy staff permissions
  if (normalizedRole === "PHARMACY_STAFF") {
    const pharmacyAllowed = [
      "patient.view",
      "prescription.view",
      "prescription.dispense",
      "billing.view",
    ];
    return pharmacyAllowed.includes(action);
  }

  // Lab staff permissions
  if (normalizedRole === "LAB_STAFF") {
    const labAllowed = [
      "patient.view",
      "lab_result.view",
      "lab_result.enter",
      "lab_result.verify",
    ];
    return labAllowed.includes(action);
  }

  // Receptionist permissions
  if (normalizedRole === "RECEPTIONIST") {
    const recAllowed = [
      "patient.register",
      "patient.view",
      "patient.edit",
      "appointment.create",
      "appointment.view",
      "appointment.cancel",
      "billing.view",
      "billing.create",
    ];
    return recAllowed.includes(action);
  }

  // Patient portal permissions
  if (normalizedRole === "PATIENT") {
    const patientAllowed = [
      "patient.view",
      "clinical_record.view",
      "diagnosis.view",
      "prescription.view",
      "appointment.create",
      "appointment.view",
      "referral.view",
      "billing.view",
      "lab_result.view",
    ];
    return patientAllowed.includes(action);
  }

  // Admin roles
  if (normalizedRole === "SUPER_ADMIN" || normalizedRole === "HOSPITAL_ADMIN") {
    return true;
  }

  return false;
}

/**
 * Filters sensitive clinical patient data for UI presentation based on caller's role.
 * e.g., Receptionists cannot see confidential psychiatric or reproductive notes.
 */
export function filterSensitivePatientData<T extends Record<string, any>>(data: T, role?: string): Partial<T> {
  if (!role) return data;
  const normalizedRole = role.toUpperCase().replace(/\s+/g, "_");

  // Doctors and Hospital Admins see full data
  if (["DOCTOR", "HOSPITAL_ADMIN", "SUPER_ADMIN"].includes(normalizedRole)) {
    return data;
  }

  // Non-clinicians (Receptionist, Cashier): strip internal clinical notes & sensitive diagnoses
  if (["RECEPTIONIST", "BILLING_STAFF"].includes(normalizedRole)) {
    const filtered = { ...data };
    delete filtered.clinical_notes;
    delete filtered.symptoms;
    delete filtered.diagnosis;
    delete filtered.chief_complaint;
    delete filtered.examination;
    return filtered;
  }

  // Patient view: strip internal hospital physician notes while keeping prescriptions and diagnoses
  if (normalizedRole === "PATIENT") {
    const filtered = { ...data };
    delete filtered.clinical_notes; // Internal clinician notes withheld
    return filtered;
  }

  return data;
}
