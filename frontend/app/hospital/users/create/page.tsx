"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Stethoscope,
  HeartPulse,
  Clock,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  Calendar,
  Building,
  GraduationCap,
  FileText,
  Sparkles,
  Layers,
  ChevronRight,
  Info,
  Check,
  Award,
  Copy,
  UserCheck
} from "lucide-react";
import { api } from "@/lib/api";
import { CreateHospitalUserPayload, HospitalRoleOption } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

const STEPS = [
  { id: 1, title: "Basic Information", desc: "Demographics & Contact" },
  { id: 2, title: "Employment", desc: "Designation & Department" },
  { id: 3, title: "Role & Access", desc: "Role, Branches & Shifts" },
  { id: 4, title: "Role Specifics", desc: "Doctor / Nurse / Trainee details" },
  { id: 5, title: "Permissions", desc: "RBAC Customizations" },
  { id: 6, title: "Credentials", desc: "License & Verification" },
  { id: 7, title: "Review & Provision", desc: "Confirm & Invite" },
];

const STANDARD_PERMISSIONS = [
  { code: "PATIENT_SEARCH", name: "Search Patients", desc: "Find patient records by OH-ID or phone", clinical: false },
  { code: "PATIENT_REGISTER", name: "Register Patient", desc: "Create new patient charts", clinical: false },
  { code: "PATIENT_UPDATE", name: "Update Demographics", desc: "Modify contact and address info", clinical: false },
  { code: "APPOINTMENT_VIEW", name: "View Appointments", desc: "Browse OPD schedules and slots", clinical: false },
  { code: "APPOINTMENT_CREATE", name: "Book Appointments", desc: "Schedule doctor consults", clinical: false },
  { code: "CHECKIN", name: "Patient Check-in", desc: "Mark arrival & issue OPD tokens", clinical: false },
  { code: "QUEUE_VIEW", name: "Live Queue View", desc: "Monitor consultation counters", clinical: false },
  { code: "DOCUMENT_UPLOAD", name: "Upload Documents", desc: "Attach scanned records to chart", clinical: false },
  { code: "BASIC_DOCUMENT_VIEW", name: "View Uploaded Records", desc: "Read non-confidential files", clinical: false },
  { code: "PATIENT_CLINICAL_VIEW", name: "View Clinical Chart", desc: "Read doctor diagnoses and histories", clinical: true },
  { code: "CLINICAL_NOTE_CREATE", name: "Write Clinical Notes", desc: "Document consultation findings", clinical: true },
  { code: "PRESCRIPTION_CREATE", name: "Issue Prescriptions", desc: "Digitally sign Rx orders", clinical: true },
  { code: "LAB_ORDER_CREATE", name: "Order Lab Tests", desc: "Request diagnostic investigations", clinical: true },
  { code: "LAB_RESULT_MODIFY", name: "Enter Lab Results", desc: "Input pathology/radiology values", clinical: true },
  { code: "BILLING_MANAGE", name: "Billing & Invoices", desc: "Generate invoices and collect fees", clinical: false },
  { code: "REPORTS_VIEW", name: "Operational Analytics", desc: "View department stats & rosters", clinical: false },
];

export default function CreateHospitalUserPage() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || "";

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rolesCatalog, setRolesCatalog] = useState<HospitalRoleOption[]>([]);
  const [createdUserResult, setCreatedUserResult] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    mobile: "+91 ",
    gender: "Male",
    dob: "1990-01-01",
    address: "Chennai, Tamil Nadu",
    emergency_contact: "",
    photo_url: "",

    // Step 2: Employment
    employee_id: "",
    joining_date: new Date().toISOString().split("T")[0],
    employment_type: "FULL_TIME",
    department_id: "dept-gen-01",
    branch_id: "br-main",
    designation: "",
    reporting_manager_id: "usr-hosp-admin",
    reporting_manager_name: "Hospital Administrator",

    // Step 3: Role & Access Scope
    role_code: "DOCTOR",
    additional_roles: [] as string[],
    branch_ids: ["br-main"],
    department_ids: ["dept-gen-01"],
    shift_access: "ALL_SHIFTS",
    login_enabled: true,
    mfa_enabled: false,

    // Step 4: Role-Specific Dynamic Details
    // Doctor
    medical_registration_number: "",
    registration_authority: "Tamil Nadu Medical Council",
    nmr_id: "",
    specialty: "Cardiology",
    qualification: "MBBS, MD (General Medicine)",
    opd_counter_id: "ctr-k-01",
    consultation_room: "Room 101, Block A",
    consultation_fee: 500.0,
    appointment_availability: "MON-SAT 09:00 AM - 01:00 PM",

    // Nurse
    nursing_registration_number: "",
    nursing_authority: "Tamil Nadu Nursing Council",
    nursing_qualification: "B.Sc (Nursing)",
    ward: "OPD Triage / General Ward",
    shift: "MORNING",
    nurse_supervisor: "Nurse Superintendent",

    // Trainee
    training_type: "INTERN",
    institution: "Madras Medical College",
    trainee_qualification: "MBBS (Final Year / CRRI)",
    supervisor_doctor_id: "u-doc-101",
    supervisor_name: "Dr. Arun Kumar (Cardiology)",
    trainee_start_date: new Date().toISOString().split("T")[0],
    trainee_end_date: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
    restricted_access_note: "Trainees cannot independently sign prescriptions or author discharge summaries.",

    // Receptionist
    counter_number: "Counter 1 - Front Desk",
    reception_workflows: ["REGISTRATION", "CHECKIN", "QUEUE_MANAGE", "DOCUMENT_UPLOAD"],

    // Step 5: Custom Permissions
    custom_permissions: [] as string[],

    // Step 6: Professional Credentials
    credential_number: "",
    credential_authority: "Tamil Nadu Medical Council",
    credential_expiry_date: "2028-12-31",
    verification_status: "VERIFIED",

    // Step 7: Review & Provision
    send_invitation: false,
    initial_password: "Welcome@123",
  });

  // Load roles catalog
  useEffect(() => {
    api.hospital.getRolesCatalog().then((res) => {
      if (res?.roles) setRolesCatalog(res.roles);
    }).catch(() => null);
  }, []);

  // Update default designation / credentials when role changes
  useEffect(() => {
    if (formData.role_code === "DOCTOR") {
      setFormData((prev) => ({
        ...prev,
        designation: prev.designation || "Consultant Physician",
        credential_authority: "Tamil Nadu Medical Council",
      }));
    } else if (formData.role_code === "NURSE") {
      setFormData((prev) => ({
        ...prev,
        designation: prev.designation || "Staff Nurse",
        credential_authority: "Tamil Nadu Nurses and Midwives Council",
      }));
    } else if (formData.role_code === "TRAINEE") {
      setFormData((prev) => ({
        ...prev,
        designation: prev.designation || "Junior Resident / Intern",
        credential_authority: "Institution Dean Office",
      }));
    } else if (formData.role_code === "RECEPTIONIST") {
      setFormData((prev) => ({
        ...prev,
        designation: prev.designation || "Front Desk Executive",
        department_id: "dept-k-05",
      }));
    }
  }, [formData.role_code]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleBranch = (branchId: string) => {
    setFormData((prev) => {
      const exists = prev.branch_ids.includes(branchId);
      const next = exists ? prev.branch_ids.filter((b) => b !== branchId) : [...prev.branch_ids, branchId];
      return { ...prev, branch_ids: next.length > 0 ? next : [branchId] };
    });
  };

  const togglePermission = (permCode: string) => {
    setFormData((prev) => {
      const exists = prev.custom_permissions.includes(permCode);
      const next = exists
        ? prev.custom_permissions.filter((p) => p !== permCode)
        : [...prev.custom_permissions, permCode];
      return { ...prev, custom_permissions: next };
    });
  };

  const validateStep = (step: number): boolean => {
    setErrorMsg(null);
    if (step === 1) {
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        setErrorMsg("Please enter both First Name and Last Name.");
        return false;
      }
      if (!formData.email.trim() || !formData.email.includes("@")) {
        setErrorMsg("Please provide a valid staff email address.");
        return false;
      }
      if (!formData.mobile.trim() || formData.mobile.length < 8) {
        setErrorMsg("Please provide a valid contact mobile number.");
        return false;
      }
    } else if (step === 2) {
      if (!formData.employee_id.trim()) {
        setErrorMsg("Please enter an Employee / Staff ID.");
        return false;
      }
      if (!formData.designation.trim()) {
        setErrorMsg("Please specify the staff member's official designation.");
        return false;
      }
    } else if (step === 3) {
      if (["SUPER_ADMIN", "PLATFORM_ADMIN", "SYSTEM_ADMIN"].includes(formData.role_code)) {
        setErrorMsg("Privilege Escalation Blocked: Hospital Administrators cannot create Super Admin accounts.");
        return false;
      }
      if (formData.branch_ids.length === 0) {
        setErrorMsg("Please select at least one authorized branch.");
        return false;
      }
    } else if (step === 4) {
      if (formData.role_code === "DOCTOR" && !formData.medical_registration_number.trim()) {
        setErrorMsg("Doctor role requires Medical Registration Number.");
        return false;
      }
      if (formData.role_code === "NURSE" && !formData.nursing_registration_number.trim()) {
        setErrorMsg("Nurse role requires Nursing Council Registration Number.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 7));
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    setSubmitting(true);
    setErrorMsg(null);

    // Build role metadata
    let roleMeta: Record<string, any> = {};
    let credNumber = formData.credential_number;
    let credAuth = formData.credential_authority;

    if (formData.role_code === "DOCTOR") {
      credNumber = formData.medical_registration_number || formData.credential_number;
      credAuth = formData.registration_authority;
      roleMeta = {
        medical_registration_number: formData.medical_registration_number,
        registration_authority: formData.registration_authority,
        nmr_id: formData.nmr_id,
        specialty: formData.specialty,
        qualification: formData.qualification,
        opd_counter_id: formData.opd_counter_id,
        consultation_room: formData.consultation_room,
        consultation_fee: Number(formData.consultation_fee),
        appointment_availability: formData.appointment_availability,
      };
    } else if (formData.role_code === "NURSE") {
      credNumber = formData.nursing_registration_number || formData.credential_number;
      credAuth = formData.nursing_authority;
      roleMeta = {
        nursing_registration_number: formData.nursing_registration_number,
        registration_authority: formData.nursing_authority,
        qualification: formData.nursing_qualification,
        ward: formData.ward,
        shift: formData.shift,
        supervisor: formData.nurse_supervisor,
      };
    } else if (formData.role_code === "TRAINEE") {
      roleMeta = {
        training_type: formData.training_type,
        institution: formData.institution,
        qualification: formData.trainee_qualification,
        supervisor_doctor_id: formData.supervisor_doctor_id,
        supervisor_name: formData.supervisor_name,
        start_date: formData.trainee_start_date,
        end_date: formData.trainee_end_date,
        access_level: "RESTRICTED",
      };
    } else if (formData.role_code === "RECEPTIONIST") {
      roleMeta = {
        counter_number: formData.counter_number,
        allowed_workflows: formData.reception_workflows,
      };
    }

    const payload: CreateHospitalUserPayload = {
      first_name: formData.first_name.trim(),
      middle_name: formData.middle_name.trim() || undefined,
      last_name: formData.last_name.trim(),
      email: formData.email.trim(),
      mobile: formData.mobile.trim(),
      gender: formData.gender,
      dob: formData.dob,
      address: formData.address,
      emergency_contact: formData.emergency_contact || undefined,
      photo_url: formData.photo_url || undefined,
      employee_id: formData.employee_id.trim(),
      joining_date: formData.joining_date,
      employment_type: formData.employment_type,
      designation: formData.designation.trim(),
      reporting_manager_id: formData.reporting_manager_id,
      reporting_manager_name: formData.reporting_manager_name,
      role_code: formData.role_code,
      department_id: formData.department_id,
      branch_id: formData.branch_id,
      additional_roles: formData.additional_roles,
      branch_ids: formData.branch_ids,
      department_ids: formData.department_ids,
      custom_permissions: formData.custom_permissions,
      shift_access: formData.shift_access,
      login_enabled: formData.login_enabled,
      mfa_enabled: formData.mfa_enabled,
      employment_status: formData.send_invitation ? "INVITED" : "ACTIVE",
      send_invitation: formData.send_invitation,
      password: formData.initial_password,
      credential_number: credNumber || undefined,
      credential_authority: credAuth || undefined,
      credential_expiry_date: formData.credential_expiry_date || undefined,
      role_metadata: roleMeta,
      hospital_id: activeHospitalId,
    };

    try {
      const res = await api.hospital.createUser(payload);
      if (res?.invitation?.token) {
        setCreatedUserResult(res);
      } else {
        router.push("/hospital/users");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create staff user account");
    } finally {
      setSubmitting(false);
    }
  };

  const copyInviteLink = () => {
    if (!createdUserResult?.invitation?.token) return;
    const url = `${window.location.origin}/invite?token=${createdUserResult.invitation.token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <WorkspaceLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
        {/* Header with Back */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/hospital/users"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Create Hospital Staff User
              </h1>
              <p className="text-sm text-slate-500">
                Single-portal account provisioning with dynamic RBAC & professional credentials.
              </p>
            </div>
          </div>
        </div>

        {/* Wizard Stepper Progress */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between min-w-[700px] relative">
            {STEPS.map((s, idx) => {
              const isDone = currentStep > s.id;
              const isCurrent = currentStep === s.id;
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center relative z-10">
                    <button
                      onClick={() => s.id < currentStep && setCurrentStep(s.id)}
                      disabled={s.id > currentStep}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition ${
                        isDone
                          ? "bg-emerald-600 text-white shadow-sm"
                          : isCurrent
                          ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isDone ? <Check className="w-4 h-4" /> : s.id}
                    </button>
                    <span
                      className={`text-xs font-semibold mt-2 whitespace-nowrap ${
                        isCurrent ? "text-blue-700 font-bold" : isDone ? "text-slate-700" : "text-slate-400"
                      }`}
                    >
                      {s.title}
                    </span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{s.desc}</span>
                  </div>

                  {idx < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-3 mt-[-24px] ${
                        currentStep > idx + 1 ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-sm font-medium">{errorMsg}</div>
          </div>
        )}

        {/* Step Content Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
          {/* STEP 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 1: Basic Information</h3>
                <p className="text-xs text-slate-500">Demographic details and primary contact information.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    placeholder="e.g. Arun"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={formData.middle_name}
                    onChange={(e) => updateField("middle_name", e.target.value)}
                    placeholder="e.g. Kumar"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Last Name / Surname *
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                    placeholder="e.g. Natarajan"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Staff Email Address (Single-portal Login) *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="doctor@hospital.org"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => updateField("mobile", e.target.value)}
                    placeholder="+91 98401 22334"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => updateField("dob", e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={formData.emergency_contact}
                    onChange={(e) => updateField("emergency_contact", e.target.value)}
                    placeholder="+91 98409 99887 (Spouse/Parent)"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Residential / Communication Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Plot 14, Healthcare Avenue, City - 600001"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Employment Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 2: Employment Information</h3>
                <p className="text-xs text-slate-500">Employee ID, designation, joining timeline, and department.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    value={formData.employee_id}
                    onChange={(e) => updateField("employee_id", e.target.value)}
                    placeholder="EMP-DOC-108"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => updateField("joining_date", e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Employment Type
                  </label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) => updateField("employment_type", e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="FULL_TIME">Full Time Regular</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="VISITING">Visiting Consultant</option>
                    <option value="CONTRACT">Contractual Staff</option>
                    <option value="INTERN">Intern / Trainee</option>
                    <option value="VOLUNTEER">Volunteer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Official Designation *
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => updateField("designation", e.target.value)}
                    placeholder="e.g. Senior Consultant Cardiologist"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Primary Department
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => updateField("department_id", e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-semibold"
                  >
                    <option value="dept-k-01">Cardiology</option>
                    <option value="dept-k-02">Orthopedics</option>
                    <option value="dept-k-03">General Medicine</option>
                    <option value="dept-k-04">Pediatrics</option>
                    <option value="dept-k-05">Emergency & Triage</option>
                    <option value="dept-k-06">Radiology</option>
                    <option value="dept-k-07">Laboratory</option>
                    <option value="dept-k-08">Pharmacy</option>
                    <option value="dept-k-09">Administration & Accounts</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reporting Manager
                </label>
                <input
                  type="text"
                  value={formData.reporting_manager_name}
                  onChange={(e) => updateField("reporting_manager_name", e.target.value)}
                  placeholder="e.g. Dr. Senthil Nathan (Medical Superintendent)"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Role & Access Scope */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 3: Role & Access Scope</h3>
                <p className="text-xs text-slate-500">
                  Select the staff role and multi-branch authorization. Note: Platform Super Admin role cannot be created here.
                </p>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Primary Hospital Role *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {[
                    { code: "DOCTOR", label: "Doctor", desc: "Consultations, Rx, Clinical" },
                    { code: "NURSE", label: "Nurse", desc: "Vitals, Wards, Triage" },
                    { code: "RECEPTIONIST", label: "Receptionist", desc: "Registration, Tokens, OPD" },
                    { code: "LAB_TECH", label: "Lab Technician", desc: "Sample processing, Values" },
                    { code: "LAB_ADMIN", label: "Lab Admin", desc: "Diagnostic lab oversight" },
                    { code: "PHARMACIST", label: "Pharmacist", desc: "Dispensing & Drug inventory" },
                    { code: "RADIOLOGY_TECH", label: "Radiology Tech", desc: "Scans & Imaging reports" },
                    { code: "BILLING_STAFF", label: "Billing Staff", desc: "Invoicing, Cash counters" },
                    { code: "ACCOUNTS", label: "Accounts", desc: "Financial ledgers & audits" },
                    { code: "HOSPITAL_MANAGER", label: "Hospital Manager", desc: "Operations & Schedules" },
                    { code: "DEPT_COORDINATOR", label: "Dept Coordinator", desc: "Department queue & rosters" },
                    { code: "TRAINEE", label: "Trainee / Intern", desc: "Restricted supervised clinical" },
                    { code: "STAFF", label: "Other Staff", desc: "General hospital personnel" },
                    { code: "CUSTOM", label: "Custom Role", desc: "Tailored permission set" },
                  ].map((r) => {
                    const isSelected = formData.role_code === r.code;
                    return (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() => updateField("role_code", r.code)}
                        className={`p-3 rounded-xl border text-left transition ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? "text-blue-900" : "text-slate-800"}`}>
                            {r.label}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{r.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Branch Multi-Access Matrix */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Authorized Branch Coverage
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: "br-main", name: `${workspace?.hospital_name || "Hospital"} - Main Campus`, isMain: true },
                    { id: "br-satellite", name: `${workspace?.hospital_name || "Hospital"} - Satellite Branch`, isMain: false },
                  ].map((b) => {
                    const checked = formData.branch_ids.includes(b.id);
                    return (
                      <div
                        key={b.id}
                        onClick={() => toggleBranch(b.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                          checked
                            ? "border-blue-500 bg-blue-50/60"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Building2 className={`w-4 h-4 ${checked ? "text-blue-600" : "text-slate-400"}`} />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">{b.name}</span>
                            <span className="text-[10px] text-slate-500">
                              {b.isMain ? "Primary Campus" : "Satellite Branch"}
                            </span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shift Access */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Shift Access Schedule
                  </label>
                  <select
                    value={formData.shift_access}
                    onChange={(e) => updateField("shift_access", e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="ALL_SHIFTS">All Shifts (24x7 Coverage)</option>
                    <option value="MORNING_ONLY">Morning Shift (08:00 AM - 02:00 PM)</option>
                    <option value="EVENING_ONLY">Evening Shift (02:00 PM - 09:00 PM)</option>
                    <option value="NIGHT_ONLY">Night Shift (09:00 PM - 08:00 AM)</option>
                    <option value="ON_CALL">On-Call Duty Only</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Login Enabled</span>
                    <span className="text-[11px] text-slate-500">Allow authentication via /login</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.login_enabled}
                    onChange={(e) => updateField("login_enabled", e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Role-Specific Dynamic Details */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Step 4: Role-Specific Information ({formData.role_code})
                </h3>
                <p className="text-xs text-slate-500">
                  Dynamic fields tailored specifically for {formData.role_code}.
                </p>
              </div>

              {/* DOCTOR Dynamic Fields */}
              {formData.role_code === "DOCTOR" && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Doctor profile will be automatically linked to OPD consultation desks, queue dispatch, and prescription authorization.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Medical Registration No *
                      </label>
                      <input
                        type="text"
                        value={formData.medical_registration_number}
                        onChange={(e) => updateField("medical_registration_number", e.target.value)}
                        placeholder="TN-MCI-2015-8890"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Registration Authority
                      </label>
                      <input
                        type="text"
                        value={formData.registration_authority}
                        onChange={(e) => updateField("registration_authority", e.target.value)}
                        placeholder="Tamil Nadu Medical Council"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        NMR ID (National Medical Register)
                      </label>
                      <input
                        type="text"
                        value={formData.nmr_id}
                        onChange={(e) => updateField("nmr_id", e.target.value)}
                        placeholder="NMR-IND-2026-9901"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Qualification
                      </label>
                      <input
                        type="text"
                        value={formData.qualification}
                        onChange={(e) => updateField("qualification", e.target.value)}
                        placeholder="MBBS, MD (General Medicine), DM (Cardiology)"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Clinical Specialization
                      </label>
                      <input
                        type="text"
                        value={formData.specialty}
                        onChange={(e) => updateField("specialty", e.target.value)}
                        placeholder="Interventional Cardiology"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Assigned Consultation Room
                      </label>
                      <input
                        type="text"
                        value={formData.consultation_room}
                        onChange={(e) => updateField("consultation_room", e.target.value)}
                        placeholder="Room 101, Block A"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        OPD Counter Link
                      </label>
                      <select
                        value={formData.opd_counter_id}
                        onChange={(e) => updateField("opd_counter_id", e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-semibold"
                      >
                        <option value="ctr-k-01">Counter 1 - Cardiology OPD</option>
                        <option value="ctr-k-02">Counter 2 - General Medicine</option>
                        <option value="ctr-k-03">Counter 3 - Orthopedics</option>
                        <option value="ctr-k-04">Counter 4 - Pediatrics</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Standard Consultation Fee (₹)
                      </label>
                      <input
                        type="number"
                        value={formData.consultation_fee}
                        onChange={(e) => updateField("consultation_fee", parseFloat(e.target.value) || 0)}
                        placeholder="500"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* NURSE Dynamic Fields */}
              {formData.role_code === "NURSE" && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      Nurse profile links directly to inpatient wards, triage counters, and shift rosters.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Nursing Registration Number *
                      </label>
                      <input
                        type="text"
                        value={formData.nursing_registration_number}
                        onChange={(e) => updateField("nursing_registration_number", e.target.value)}
                        placeholder="TNNMC-RN-2018-4421"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Registration Council
                      </label>
                      <input
                        type="text"
                        value={formData.nursing_authority}
                        onChange={(e) => updateField("nursing_authority", e.target.value)}
                        placeholder="Tamil Nadu Nursing and Midwives Council"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Assigned Ward / Unit
                      </label>
                      <input
                        type="text"
                        value={formData.ward}
                        onChange={(e) => updateField("ward", e.target.value)}
                        placeholder="ICU / Post-Op Recovery"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Primary Shift
                      </label>
                      <select
                        value={formData.shift}
                        onChange={(e) => updateField("shift", e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      >
                        <option value="MORNING">Morning Shift</option>
                        <option value="EVENING">Evening Shift</option>
                        <option value="NIGHT">Night Shift</option>
                        <option value="ROTATIONAL">Rotational Roster</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Nursing Supervisor
                      </label>
                      <input
                        type="text"
                        value={formData.nurse_supervisor}
                        onChange={(e) => updateField("nurse_supervisor", e.target.value)}
                        placeholder="Nurse In-charge"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TRAINEE / INTERN Dynamic Fields */}
              {formData.role_code === "TRAINEE" && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-start gap-2">
                    <GraduationCap className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Strict Trainee Guardrails:</strong> Trainees are granted read-only patient access and supervised documentation. They cannot independently sign prescriptions or author discharge summaries.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Training Type
                      </label>
                      <select
                        value={formData.training_type}
                        onChange={(e) => updateField("training_type", e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      >
                        <option value="INTERN">Medical Intern (CRRI)</option>
                        <option value="NURSING_TRAINEE">Nursing Trainee</option>
                        <option value="RESIDENT">Junior Resident (JR)</option>
                        <option value="POSTGRADUATE">Postgraduate Trainee (MD/MS)</option>
                        <option value="PHARMACY_INTERN">Pharmacy Intern</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Affiliated Institution
                      </label>
                      <input
                        type="text"
                        value={formData.institution}
                        onChange={(e) => updateField("institution", e.target.value)}
                        placeholder="Madras Medical College"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Assigned Supervising Doctor
                      </label>
                      <input
                        type="text"
                        value={formData.supervisor_name}
                        onChange={(e) => updateField("supervisor_name", e.target.value)}
                        placeholder="Dr. Arun Kumar (Cardiology)"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Internship Start Date
                      </label>
                      <input
                        type="date"
                        value={formData.trainee_start_date}
                        onChange={(e) => updateField("trainee_start_date", e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Internship End Date
                      </label>
                      <input
                        type="date"
                        value={formData.trainee_end_date}
                        onChange={(e) => updateField("trainee_end_date", e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* RECEPTIONIST Dynamic Fields */}
              {formData.role_code === "RECEPTIONIST" && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-900 flex items-center gap-2">
                    <Building className="w-4 h-4 text-cyan-600 shrink-0" />
                    <span>
                      Receptionist profile handles patient search, rapid token check-in, and document scanning.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Assigned Front-Desk Counter
                    </label>
                    <input
                      type="text"
                      value={formData.counter_number}
                      onChange={(e) => updateField("counter_number", e.target.value)}
                      placeholder="Counter 1 - Main Reception"
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* OTHER / ADMINISTRATIVE roles */}
              {!["DOCTOR", "NURSE", "TRAINEE", "RECEPTIONIST"].includes(formData.role_code) && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
                  <div className="font-bold text-slate-800">Standard Administrative / Technical Profile</div>
                  <p>
                    Standard hospital role configurations will be applied for {formData.role_code}. In the next step, you can customize fine-grained RBAC permissions.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Permissions Customizer */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 5: RBAC Permissions Customizer</h3>
                <p className="text-xs text-slate-500">
                  Select explicitly granted or custom permissions. Permissions adhere to hospital tenancy boundaries.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STANDARD_PERMISSIONS.map((perm) => {
                  const isChecked = formData.custom_permissions.includes(perm.code);
                  return (
                    <div
                      key={perm.code}
                      onClick={() => togglePermission(perm.code)}
                      className={`p-3.5 rounded-xl border cursor-pointer flex items-start justify-between transition ${
                        isChecked
                          ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/20"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{perm.name}</span>
                          {perm.clinical && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-semibold">
                              Clinical
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{perm.desc}</p>
                        <span className="font-mono text-[10px] text-slate-400 block">{perm.code}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 mt-1"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 6: Professional Credentials */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 6: Professional Credentials</h3>
                <p className="text-xs text-slate-500">
                  Regulatory registration, license authority, expiry tracking, and verification status.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Credential / Registration Number
                  </label>
                  <input
                    type="text"
                    value={formData.credential_number || formData.medical_registration_number || formData.nursing_registration_number}
                    onChange={(e) => updateField("credential_number", e.target.value)}
                    placeholder="e.g. TN-MCI-2015-8890"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Issuing Authority
                  </label>
                  <input
                    type="text"
                    value={formData.credential_authority}
                    onChange={(e) => updateField("credential_authority", e.target.value)}
                    placeholder="Tamil Nadu Medical Council"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    License Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.credential_expiry_date}
                    onChange={(e) => updateField("credential_expiry_date", e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Credential Verification Status
                </label>
                <select
                  value={formData.verification_status}
                  onChange={(e) => updateField("verification_status", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-semibold"
                >
                  <option value="VERIFIED">Hospital Verified (Primary credentials checked)</option>
                  <option value="PENDING">Pending Verification (Documents under review)</option>
                  <option value="NOT_REQUIRED">Not Required (Non-clinical support staff)</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 7: Review & Provision */}
          {currentStep === 7 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 7: Review & Account Provisioning</h3>
                <p className="text-xs text-slate-500">
                  Verify the staff account profile before creating and generating login access.
                </p>
              </div>

              {/* Review Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-lg shrink-0">
                    {(formData.first_name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">
                      {formData.first_name} {formData.middle_name} {formData.last_name}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="font-semibold text-blue-700">{formData.role_code}</span>
                      <span>&bull;</span>
                      <span>{formData.designation}</span>
                      <span>&bull;</span>
                      <span>{formData.email}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-400 block">Employee ID</span>
                    <span className="font-mono font-bold text-slate-800">{formData.employee_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Department</span>
                    <span className="font-bold text-slate-800">{formData.department_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Branch Coverage</span>
                    <span className="font-bold text-slate-800">{formData.branch_ids.length} Branch(es)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Shift Access</span>
                    <span className="font-bold text-slate-800">{formData.shift_access}</span>
                  </div>
                </div>
              </div>

              {/* Activation vs Invitation Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Account Provisioning Workflow
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => updateField("send_invitation", false)}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      !formData.send_invitation
                        ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-900">Instant Activation</span>
                      {!formData.send_invitation && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                    </div>
                    <p className="text-xs text-slate-500">
                      Creates ACTIVE account immediately with temporary password. User logs in via /login.
                    </p>
                  </div>

                  <div
                    onClick={() => updateField("send_invitation", true)}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      formData.send_invitation
                        ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-900">Send Invitation Link</span>
                      {formData.send_invitation && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                    </div>
                    <p className="text-xs text-slate-500">
                      Dispatches secure email/SMS invite. Account activates once user completes password set.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {currentStep < 7 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-md transition disabled:opacity-50"
              >
                {submitting ? (
                  <>Provisioning Staff Account...</>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Complete & Create Account
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* STAFF INVITATION SUCCESS MODAL */}
        {createdUserResult && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-slate-900">Staff Account Successfully Provisioned!</h3>
                <p className="text-xs text-slate-500">
                  User <strong>{createdUserResult.name}</strong> ({createdUserResult.role}) has been registered with initial status INVITED.
                </p>
              </div>

              {/* Invitation Token Card */}
              {createdUserResult.invitation && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Staff Workspace Invitation Link
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      SINGLE-USE
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    Send this secure link to the staff member to activate their account and configure password & MFA:
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={
                        typeof window !== "undefined"
                          ? `${window.location.origin}/invite?token=${createdUserResult.invitation.token}`
                          : `/invite?token=${createdUserResult.invitation.token}`
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 font-mono text-slate-700 select-all"
                    />
                    <button
                      onClick={copyInviteLink}
                      className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1 shrink-0"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLink ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <Link
                  href="/hospital/users"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-center text-xs font-bold transition"
                >
                  Return to Users Directory
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
