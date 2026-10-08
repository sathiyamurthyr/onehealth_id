"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Hospital,
  MapPin,
  Layers,
  Stethoscope,
  Users,
  CreditCard,
  Plus,
  Trash2,
  Phone,
  Mail,
  Clock,
  Activity,
  AlertCircle,
  HelpCircle,
  Check,
  FileCheck2,
  HeartPulse,
  BadgeAlert,
  Shield,
  Briefcase,
  Calendar,
  Lock
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

// Pre-defined Clinical Facilities inside a Hospital with standard sub-services
const DEFAULT_FACILITIES = [
  {
    id: "fac_opd",
    code: "OPD",
    name: "Outpatient Department (OPD)",
    description: "Doctor consultation rooms, triage & ambulatory clinics",
    enabled: true,
    services: ["General Consultation", "Specialist Consultation", "Follow-up Checks", "Preventive Health Checks"],
  },
  {
    id: "fac_ipd",
    code: "IPD",
    name: "Inpatient Department (IPD)",
    description: "Wards, semi-private rooms, deluxe patient admissions",
    enabled: true,
    services: ["General Wards", "Semi-Private Rooms", "Deluxe Private Rooms", "Daycare Admissions"],
  },
  {
    id: "fac_icu",
    code: "ICU",
    name: "Intensive Care Unit (ICU)",
    description: "Critical care monitoring, ventilators & 24/7 intensivist care",
    enabled: true,
    services: ["Medical ICU (MICU)", "Surgical ICU (SICU)", "Coronary Care (CCU)", "Neonatal ICU (NICU)"],
  },
  {
    id: "fac_emergency",
    code: "EMERGENCY",
    name: "Emergency & Trauma Center",
    description: "24x7 acute resuscitation, trauma bays & ambulance bay",
    enabled: true,
    services: ["24x7 Triage", "Trauma Resuscitation", "Minor OT", "Acute Observation Bay"],
  },
  {
    id: "fac_ot",
    code: "OT",
    name: "Operation Theatres (OT)",
    description: "Major & minor surgical suites with sterile laminar airflow",
    enabled: true,
    services: ["Major Surgical OT", "Minor Procedure OT", "Laparoscopic Suite", "Endoscopy Suite"],
  },
  {
    id: "fac_lab",
    code: "LAB",
    name: "Central Clinical Laboratory",
    description: "Automated sample processing, bio-chemistry & pathology",
    enabled: true,
    services: ["Clinical Biochemistry", "Hematology & CBC", "Clinical Pathology", "Microbiology & Serology"],
  },
  {
    id: "fac_pharmacy",
    code: "PHARMACY",
    name: "24x7 In-House Pharmacy",
    description: "Inpatient & outpatient dispensary with temperature-controlled storage",
    enabled: true,
    services: ["24x7 Inpatient Dispensing", "OPD Prescription Counter", "Cold-Chain Medication", "Drug Counseling"],
  },
  {
    id: "fac_radiology",
    code: "RADIOLOGY",
    name: "Radiology & Imaging Center",
    description: "Diagnostic scans, X-Rays, ultrasound, CT & MRI",
    enabled: true,
    services: ["Digital X-Ray", "High-Resolution Ultrasound", "128-Slice CT Scan", "3.0 Tesla MRI"],
  },
  {
    id: "fac_bloodbank",
    code: "BLOOD_BANK",
    name: "Blood Bank & Component Lab",
    description: "Blood testing, cross-matching & component separation",
    enabled: false,
    services: ["Whole Blood Storage", "Packed Red Blood Cells (PRBC)", "Fresh Frozen Plasma (FFP)", "Platelet Concentrates"],
  },
  {
    id: "fac_physio",
    code: "PHYSIOTHERAPY",
    name: "Physiotherapy & Rehabilitation",
    description: "Post-op recovery, musculoskeletal & neuro rehab",
    enabled: true,
    services: ["Orthopedic Rehabilitation", "Neurological Rehabilitation", "Electrotherapy", "Exercise Therapy"],
  },
  {
    id: "fac_ambulance",
    code: "AMBULANCE",
    name: "Ambulance & EMS Fleet",
    description: "GPS-tracked emergency response vehicles",
    enabled: true,
    services: ["Advanced Cardiac Life Support (ACLS)", "Basic Life Support (BLS)", "Neonatal Transport"],
  },
  {
    id: "fac_vaccination",
    code: "VACCINATION",
    name: "Immunization & Vaccination Unit",
    description: "Pediatric & adult vaccines, international travel immunization",
    enabled: false,
    services: ["National Immunization Program", "Adult Vaccines", "Travel Immunization"],
  },
];

// Pre-defined Clinical Departments with Standard Specialties
const DEFAULT_DEPARTMENTS = [
  {
    id: "dept_gen_med",
    name: "General Medicine",
    code: "GEN_MED",
    category: "Clinical",
    enabled: true,
    specialties: ["General Medicine", "Diabetology", "Hypertension & Internal Medicine", "Infectious Diseases"],
  },
  {
    id: "dept_cardiology",
    name: "Cardiology",
    code: "CARDIO",
    category: "Super Specialty",
    enabled: true,
    specialties: ["Clinical Cardiology", "Interventional Cardiology", "Electrophysiology", "Preventive Cardiology"],
  },
  {
    id: "dept_ortho",
    name: "Orthopedics & Joint Replacement",
    code: "ORTHO",
    category: "Surgical",
    enabled: true,
    specialties: ["Joint Replacement", "Trauma & Fracture Surgery", "Sports Medicine", "Spine Surgery"],
  },
  {
    id: "dept_pediatrics",
    name: "Pediatrics & Neonatology",
    code: "PEDIATRICS",
    category: "Clinical",
    enabled: true,
    specialties: ["General Pediatrics", "Neonatology", "Pediatric Intensive Care", "Child Development"],
  },
  {
    id: "dept_ent",
    name: "ENT (Ear, Nose & Throat)",
    code: "ENT",
    category: "Surgical",
    enabled: true,
    specialties: ["Otolaryngology", "Rhinology & Sinus", "Head & Neck Surgery", "Audiology"],
  },
  {
    id: "dept_ophthalmology",
    name: "Ophthalmology",
    code: "OPHTHAL",
    category: "Surgical",
    enabled: false,
    specialties: ["Cataract & Refractive", "Glaucoma", "Retina & Vitreous", "Cornea Services"],
  },
  {
    id: "dept_dermatology",
    name: "Dermatology & Cosmetology",
    code: "DERMAT",
    category: "Clinical",
    enabled: true,
    specialties: ["Clinical Dermatology", "Trichology", "Laser Procedures", "Allergy & Immunology"],
  },
  {
    id: "dept_neurology",
    name: "Neurology",
    code: "NEURO",
    category: "Super Specialty",
    enabled: false,
    specialties: ["Stroke Management", "Epilepsy", "Movement Disorders", "Neuro-Muscular Disorders"],
  },
  {
    id: "dept_obgyn",
    name: "Obstetrics & Gynecology",
    code: "OBGYN",
    category: "Surgical",
    enabled: true,
    specialties: ["High-Risk Pregnancy", "Laparoscopic Gynecology", "Infertility & IVF", "Maternal-Fetal Medicine"],
  },
  {
    id: "dept_general_surgery",
    name: "General & Laparoscopic Surgery",
    code: "GEN_SURG",
    category: "Surgical",
    enabled: true,
    specialties: ["Laparoscopic Hernia & Gallbladder", "Colorectal Surgery", "Thyroid Surgery", "Trauma Surgery"],
  },
  {
    id: "dept_pulmonology",
    name: "Pulmonology & Chest Medicine",
    code: "PULMO",
    category: "Clinical",
    enabled: false,
    specialties: ["Asthma & COPD", "Sleep Medicine", "Interventional Pulmonology", "Tuberculosis Care"],
  },
  {
    id: "dept_gastro",
    name: "Gastroenterology & Hepatology",
    code: "GASTRO",
    category: "Super Specialty",
    enabled: false,
    specialties: ["Medical Gastroenterology", "Therapeutic Endoscopy", "Liver & Biliary Care", "IBD Clinic"],
  },
];

export default function HospitalAdminOnboardingWizard() {
  const router = useRouter();
  const { workspace, user } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("oh_workspace") || "{}").hospital_ref_id : "") || "";

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Hospital Profile
  const [profile, setProfile] = useState({
    legal_name: workspace?.hospital_name || "",
    display_name: workspace?.hospital_name || "",
    hospital_type: "Multi-Specialty Hospital",
    ownership_type: "Private Healthcare Entity",
    registration_authority: "Tamil Nadu Clinical Establishments Act (TN-CEA)",
    registration_number: "",
    registration_date: "",
    registration_expiry_date: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600125",
    emergency_contact: "",
    operating_hours: "24x7 Emergency Services | OPD: 08:00 AM - 08:00 PM",
  });

  // Step 2: Branches & Locations
  const [branches, setBranches] = useState([
    {
      id: "br_1",
      name: `${workspace?.hospital_name || "Main"} Branch`,
      code: "BR-MAIN-01",
      address: "Main Facility Location",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600125",
      phone: "",
      operating_hours: "24x7 Full Service",
      is_main_branch: true,
      emergency_available: true,
      status: "ACTIVE",
    },
  ]);

  // Step 3: Clinical Facilities & Services
  const [facilities, setFacilities] = useState(DEFAULT_FACILITIES);
  const [newServiceInputs, setNewServiceInputs] = useState<{ [facId: string]: string }>({});

  // Step 4: Departments & Specialties
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [newSpecialtyInputs, setNewSpecialtyInputs] = useState<{ [deptId: string]: string }>({});

  // Step 5: Staff & Read-Only Subscription
  const [staffMembers, setStaffMembers] = useState<any[]>([]);

  const [newStaff, setNewStaff] = useState({
    name: "",
    role_code: "DOCTOR",
    email: "",
    phone: "",
    department: "General Medicine",
    branch: `${workspace?.hospital_name || "Main"} Branch`,
    shift: "Full Time (General)",
  });

  // Load existing status and configuration if available
  useEffect(() => {
    if (!activeHospitalId) return;
    setLoading(true);
    Promise.all([
      api.hospital.getOnboardingStatus(activeHospitalId).catch(() => null),
      api.hospital.getConfig(activeHospitalId).catch(() => null),
    ])
      .then(([onbRes, configRes]: any[]) => {
        const hosp = onbRes?.data?.hospital || configRes?.hospital;
        if (hosp) {
          setProfile((prev) => ({
            ...prev,
            legal_name: hosp.name || hosp.display_name || prev.legal_name,
            display_name: hosp.display_name || hosp.name || prev.display_name,
            phone: hosp.phone || prev.phone,
            email: hosp.email || prev.email,
            website: hosp.website || prev.website,
            address: hosp.address || prev.address,
            city: hosp.city || prev.city,
            state: hosp.state || prev.state,
            pincode: hosp.pin_code || hosp.pincode || prev.pincode,
            registration_number: hosp.registration_number || prev.registration_number,
            registration_authority: hosp.registration_authority || prev.registration_authority,
            registration_date: hosp.registration_date ? String(hosp.registration_date).slice(0, 10) : prev.registration_date,
            registration_expiry_date: hosp.registration_expiry ? String(hosp.registration_expiry).slice(0, 10) : prev.registration_expiry_date,
            emergency_contact: hosp.emergency_contact || prev.emergency_contact,
            hospital_type: hosp.hospital_type || prev.hospital_type,
            ownership_type: hosp.ownership_type || prev.ownership_type,
          }));
        } else if (workspace) {
          setProfile((prev) => ({
            ...prev,
            legal_name: workspace.hospital_name || prev.legal_name,
            display_name: workspace.hospital_name || prev.display_name,
          }));
        }

        if (configRes?.branches && configRes.branches.length > 0) {
          setBranches(
            configRes.branches.map((b: any, idx: number) => ({
              id: b.id || `br_${idx + 1}`,
              name: b.name || "Branch",
              code: b.code || `BR-0${idx + 1}`,
              address: b.address || "",
              city: b.city || "Chennai",
              state: b.state || "Tamil Nadu",
              pincode: b.pin_code || "600125",
              phone: b.phone || "",
              operating_hours: b.operating_hours || "24x7 Full Service",
              is_main_branch: Boolean(b.is_main_branch),
              emergency_available: Boolean(b.emergency_available),
              status: b.is_active !== false ? "ACTIVE" : "INACTIVE",
            }))
          );
        }
      })
      .catch((err) => {
        console.warn("Could not load initial onboarding status", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeHospitalId]);

  // Branch handlers
  const addBranch = () => {
    const newId = `br_${Date.now()}`;
    setBranches([
      ...branches,
      {
        id: newId,
        name: "New Satellite Branch",
        code: `BR-${branches.length + 1}`,
        address: "Address line",
        city: profile.city || "Chennai",
        state: profile.state || "Tamil Nadu",
        pincode: "600000",
        phone: profile.phone || "",
        operating_hours: "09:00 AM - 06:00 PM",
        is_main_branch: false,
        emergency_available: false,
        status: "ACTIVE",
      },
    ]);
  };

  const removeBranch = (id: string) => {
    if (branches.length <= 1) return;
    setBranches(branches.filter((b) => b.id !== id));
  };

  const updateBranch = (id: string, field: string, value: any) => {
    setBranches(
      branches.map((b) => {
        if (b.id === id) {
          return { ...b, [field]: value };
        }
        if (field === "is_main_branch" && value === true) {
          return { ...b, is_main_branch: false };
        }
        return b;
      })
    );
  };

  // Facility handlers
  const toggleFacility = (id: string) => {
    setFacilities(
      facilities.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const addFacilityService = (facId: string) => {
    const text = newServiceInputs[facId]?.trim();
    if (!text) return;
    setFacilities(
      facilities.map((f) => {
        if (f.id === facId) {
          return { ...f, services: [...f.services, text] };
        }
        return f;
      })
    );
    setNewServiceInputs({ ...newServiceInputs, [facId]: "" });
  };

  const removeFacilityService = (facId: string, serviceIdx: number) => {
    setFacilities(
      facilities.map((f) => {
        if (f.id === facId) {
          return { ...f, services: f.services.filter((_, i) => i !== serviceIdx) };
        }
        return f;
      })
    );
  };

  // Department handlers
  const toggleDepartment = (id: string) => {
    setDepartments(
      departments.map((d) => (d.id === id ? { ...d, enabled: !d.enabled } : d))
    );
  };

  const addDepartmentSpecialty = (deptId: string) => {
    const text = newSpecialtyInputs[deptId]?.trim();
    if (!text) return;
    setDepartments(
      departments.map((d) => {
        if (d.id === deptId) {
          return { ...d, specialties: [...d.specialties, text] };
        }
        return d;
      })
    );
    setNewSpecialtyInputs({ ...newSpecialtyInputs, [deptId]: "" });
  };

  const removeDepartmentSpecialty = (deptId: string, specialtyIdx: number) => {
    setDepartments(
      departments.map((d) => {
        if (d.id === deptId) {
          return { ...d, specialties: d.specialties.filter((_, i) => i !== specialtyIdx) };
        }
        return d;
      })
    );
  };

  // Staff handlers
  const addStaffMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name.trim() || !newStaff.phone.trim()) {
      setErrorMsg("Please provide at least a full name and mobile number for the staff member.");
      return;
    }

    const hospitalDomain = (workspace?.hospital_name || "hospital").toLowerCase().replace(/[^a-z0-9]/g, "") + ".org";
    setStaffMembers([
      ...staffMembers,
      {
        id: `staff_${Date.now()}`,
        name: newStaff.name,
        role_code: newStaff.role_code,
        email: newStaff.email || `${newStaff.name.toLowerCase().replace(/\s+/g, ".")}@${hospitalDomain}`,
        phone: newStaff.phone,
        department: newStaff.department,
        branch: newStaff.branch,
        shift: newStaff.shift,
      },
    ]);

    setNewStaff({
      name: "",
      role_code: "DOCTOR",
      email: "",
      phone: "",
      department: departments.find((d) => d.enabled)?.name || "General Medicine",
      branch: branches[0]?.name || "Main Branch",
      shift: "Full Time (General)",
    });
    setErrorMsg(null);
  };

  const removeStaffMember = (id: string) => {
    setStaffMembers(staffMembers.filter((s) => s.id !== id));
  };

  // Submit complete onboarding setup to backend
  const handleFinalSubmit = async () => {
    setSaving(true);
    setErrorMsg(null);

    const payload = {
      hospital_id: activeHospitalId,
      profile: profile,
      branches: branches,
      facilities: facilities.filter((f) => f.enabled),
      departments: departments.filter((d) => d.enabled),
      staff: staffMembers,
    };

    try {
      const res = await api.hospital.saveOnboardingSetup(payload);
      setSavedSuccess(true);
      setTimeout(() => {
        router.push("/hospital");
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save hospital setup. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { number: 1, title: "Hospital Profile", icon: Hospital, desc: "Legal identity, contacts & registration" },
    { number: 2, title: "Branches & Locations", icon: MapPin, desc: "Main campus & satellite facilities" },
    { number: 3, title: "Clinical Facilities", icon: Layers, desc: "OPD, IPD, ICU, OT & Services" },
    { number: 4, title: "Departments & Specialties", icon: Stethoscope, desc: "Medical wings & clinical care mapping" },
    { number: 5, title: "Workforce & Subscription", icon: Users, desc: "Doctors, staff & Sathus SaaS tier" },
  ];

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        
        {/* Top Header Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-900/40 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Hospital Administrator Setup Wizard
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Configure Your Healthcare Organization
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                As the authorized Clinical Hospital Admin, configure your hospital identity, branches, in-house clinical facilities, departments, and operational clinician workforce.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-lg text-white">
                {profile.display_name ? profile.display_name[0] : "H"}
              </div>
              <div>
                <span className="text-xs font-bold text-white block">{profile.display_name}</span>
                <span className="text-[10px] text-blue-300 font-mono">Hospital Admin Scope</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step Indicator Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = currentStep === s.number;
              const isDone = currentStep > s.number;

              return (
                <button
                  key={s.number}
                  type="button"
                  onClick={() => setCurrentStep(s.number)}
                  className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-50 border border-blue-200 ring-2 ring-blue-500/20"
                      : isDone
                      ? "bg-slate-50 hover:bg-slate-100 border border-slate-200/60"
                      : "opacity-60 hover:opacity-90 bg-transparent"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                      isDone
                        ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                        : isActive
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : s.number}
                  </div>
                  <div className="truncate">
                    <span className={`text-xs font-bold block truncate ${isActive ? "text-blue-900" : "text-slate-800"}`}>
                      {s.title}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">{s.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">
              <span className="font-bold">Configuration Validation: </span>
              {errorMsg}
            </div>
          </div>
        )}

        {/* Success Modal */}
        {savedSuccess && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl border border-emerald-200 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Hospital Configured Successfully!</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your hospital profile, branches, clinical units, departments, and clinician credentials have been safely provisioned in the ONE HEALTH ID Enterprise Database.
              </p>
              <div className="p-3 rounded-xl bg-slate-50 text-[11px] font-mono text-slate-600 border border-slate-200">
                Redirecting to Hospital Admin Command Center...
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 1: HOSPITAL PROFILE
           ════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 1 — Hospital Information &amp; Legal Profile</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify or complete the statutory establishment details for your healthcare organization.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                Hospital Profile
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Legal Registered Name *</label>
                <input
                  type="text"
                  value={profile.legal_name}
                  onChange={(e) => setProfile({ ...profile, legal_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50"
                  placeholder="e.g. City Healthcare Pvt Ltd"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Display / Brand Name *</label>
                <input
                  type="text"
                  value={profile.display_name}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50"
                  placeholder="e.g. City Care Hospital"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Facility / Hospital Type</label>
                <select
                  value={profile.hospital_type}
                  onChange={(e) => setProfile({ ...profile, hospital_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50"
                >
                  <option value="Multi-Specialty Hospital">Multi-Specialty Hospital</option>
                  <option value="Super Specialty Hospital">Super Specialty Hospital</option>
                  <option value="General Hospital">General Hospital</option>
                  <option value="Teaching & Research Hospital">Teaching &amp; Research Hospital</option>
                  <option value="Day Care & Surgical Centre">Day Care &amp; Surgical Centre</option>
                  <option value="Specialty Clinic">Specialty Clinic</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ownership Model</label>
                <select
                  value={profile.ownership_type}
                  onChange={(e) => setProfile({ ...profile, ownership_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50"
                >
                  <option value="Private Healthcare Entity">Private Healthcare Entity</option>
                  <option value="Non-Profit / Trust Hospital">Non-Profit / Trust Hospital</option>
                  <option value="Corporate Hospital Chain">Corporate Hospital Chain</option>
                  <option value="Government / Semi-Government">Government / Semi-Government</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Registration Authority</label>
                <input
                  type="text"
                  value={profile.registration_authority}
                  onChange={(e) => setProfile({ ...profile, registration_authority: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50"
                  placeholder="e.g. Tamil Nadu Clinical Establishments Act"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Statutory License / Reg Number</label>
                <input
                  type="text"
                  value={profile.registration_number}
                  onChange={(e) => setProfile({ ...profile, registration_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50"
                  placeholder="e.g. TN/CEA/2026/08492"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Registration Date</label>
                <input
                  type="date"
                  value={profile.registration_date}
                  onChange={(e) => setProfile({ ...profile, registration_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">License Expiry Date</label>
                <input
                  type="date"
                  value={profile.registration_expiry_date}
                  onChange={(e) => setProfile({ ...profile, registration_expiry_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Official Hospital Phone *</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50"
                  placeholder="+91 44 1234 5678"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Official Hospital Email *</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50"
                  placeholder="contact@hospital.org"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">24x7 Emergency Contact *</label>
                <input
                  type="text"
                  value={profile.emergency_contact}
                  onChange={(e) => setProfile({ ...profile, emergency_contact: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Official Website</label>
                <input
                  type="text"
                  value={profile.website}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50"
                  placeholder="https://hospital.org"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">Registered Address *</label>
                <textarea
                  rows={2}
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50"
                  placeholder="Street, locality, landmarks..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">City *</label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">State *</label>
                <input
                  type="text"
                  value={profile.state}
                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">PIN / Postal Code *</label>
                <input
                  type="text"
                  value={profile.pincode}
                  onChange={(e) => setProfile({ ...profile, pincode: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Operating Hours Description</label>
                <input
                  type="text"
                  value={profile.operating_hours}
                  onChange={(e) => setProfile({ ...profile, operating_hours: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-blue-600/20"
              >
                Continue to Branches &amp; Locations
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 2: BRANCHES & LOCATIONS
           ════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 2 — Hospital Branches &amp; Physical Locations</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure your primary campus, secondary hospital branches, satellite clinics, and emergency stations.
                </p>
              </div>
              <button
                type="button"
                onClick={addBranch}
                className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Branch Location
              </button>
            </div>

            <div className="space-y-4">
              {branches.map((b, idx) => (
                <div
                  key={b.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    b.is_main_branch
                      ? "border-blue-300 bg-blue-50/30 ring-1 ring-blue-500/20"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{b.name}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">{b.code}</span>
                      </div>
                      {b.is_main_branch && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                          Main Campus
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!b.is_main_branch && (
                        <button
                          type="button"
                          onClick={() => updateBranch(b.id, "is_main_branch", true)}
                          className="text-[11px] font-semibold text-blue-600 hover:underline px-2 py-1"
                        >
                          Set as Main
                        </button>
                      )}
                      {branches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBranch(b.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                          title="Remove Branch"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Branch Name</label>
                      <input
                        type="text"
                        value={b.name}
                        onChange={(e) => updateBranch(b.id, "name", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Branch Code</label>
                      <input
                        type="text"
                        value={b.code}
                        onChange={(e) => updateBranch(b.id, "code", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Branch Phone</label>
                      <input
                        type="text"
                        value={b.phone}
                        onChange={(e) => updateBranch(b.id, "phone", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">Physical Address</label>
                      <input
                        type="text"
                        value={b.address}
                        onChange={(e) => updateBranch(b.id, "address", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">City / PIN</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={b.city}
                          onChange={(e) => updateBranch(b.id, "city", e.target.value)}
                          className="w-2/3 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-blue-500"
                          placeholder="City"
                        />
                        <input
                          type="text"
                          value={b.pincode}
                          onChange={(e) => updateBranch(b.id, "pincode", e.target.value)}
                          className="w-1/3 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-blue-500"
                          placeholder="PIN"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={b.emergency_available}
                          onChange={(e) => updateBranch(b.id, "emergency_available", e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="text-slate-700 font-semibold text-[11px]">24x7 Emergency Station</span>
                      </label>
                    </div>

                    <div className="md:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">Operating Hours</label>
                      <input
                        type="text"
                        value={b.operating_hours}
                        onChange={(e) => updateBranch(b.id, "operating_hours", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous Step
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-blue-600/20"
              >
                Continue to Clinical Facilities &amp; Services
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 3: CLINICAL FACILITIES & SERVICES
           ════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 3 — Clinical Facilities &amp; In-Hospital Units</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select and configure the operational units (OPD, IPD, ICU, OT, Labs, Radiology, Pharmacy) inside your hospital.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                {facilities.filter((f) => f.enabled).length} Active Facilities
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {facilities.map((fac) => (
                <div
                  key={fac.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    fac.enabled
                      ? "border-blue-200 bg-blue-50/20 ring-1 ring-blue-500/10"
                      : "border-slate-200 bg-slate-50/60 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          fac.enabled ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {fac.code.slice(0, 3)}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{fac.name}</h4>
                        <p className="text-[10px] text-slate-500">{fac.description}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFacility(fac.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 ${
                        fac.enabled
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      {fac.enabled ? "Enabled" : "Enable"}
                    </button>
                  </div>

                  {fac.enabled && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Included Services &amp; Sub-Units
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {fac.services.map((srv, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-medium shadow-2xs"
                          >
                            <span>{srv}</span>
                            <button
                              type="button"
                              onClick={() => removeFacilityService(fac.id, sIdx)}
                              className="text-slate-400 hover:text-rose-600 ml-0.5"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Quick Add Service Input */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={newServiceInputs[fac.id] || ""}
                          onChange={(e) =>
                            setNewServiceInputs({ ...newServiceInputs, [fac.id]: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addFacilityService(fac.id);
                            }
                          }}
                          placeholder="Add sub-service or procedure..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => addFacilityService(fac.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-semibold shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous Step
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-blue-600/20"
              >
                Continue to Departments &amp; Specialties
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 4: DEPARTMENTS & SPECIALTIES
           ════════════════════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 4 — Clinical Departments &amp; Specialties</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Activate medical specialties for doctor OPD scheduling, diagnostic referrals, and IPD admissions.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                {departments.filter((d) => d.enabled).length} Active Departments
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    dept.enabled
                      ? "border-blue-200 bg-blue-50/20 ring-1 ring-blue-500/10"
                      : "border-slate-200 bg-slate-50/60 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{dept.name}</h4>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                          {dept.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{dept.code}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleDepartment(dept.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 ${
                        dept.enabled
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      {dept.enabled ? "Active" : "Activate"}
                    </button>
                  </div>

                  {dept.enabled && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Mapped Sub-Specialties
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {dept.specialties.map((spec, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-medium shadow-2xs"
                          >
                            <span>{spec}</span>
                            <button
                              type="button"
                              onClick={() => removeDepartmentSpecialty(dept.id, sIdx)}
                              className="text-slate-400 hover:text-rose-600 ml-0.5"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Quick Add Specialty Input */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={newSpecialtyInputs[dept.id] || ""}
                          onChange={(e) =>
                            setNewSpecialtyInputs({ ...newSpecialtyInputs, [dept.id]: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addDepartmentSpecialty(dept.id);
                            }
                          }}
                          placeholder="Add specialty e.g. Diabetology..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => addDepartmentSpecialty(dept.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-semibold shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous Step
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-blue-600/20"
              >
                Continue to Workforce &amp; Subscription
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 5: HOSPITAL ADMINISTRATION & READ-ONLY SUBSCRIPTION
           ════════════════════════════════════════════════════════════ */}
        {currentStep === 5 && (
          <div className="space-y-6">
            
            {/* Workforce Setup Card */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Step 5 — Operational Workforce &amp; Staff Setup</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create initial doctors, nurses, receptionists, pharmacists, and lab staff. They will receive SMS/email invitations to activate their mobile-based login.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                  {staffMembers.length} Initial Team Members
                </span>
              </div>

              {/* Add New Staff Form */}
              <form onSubmit={addStaffMember} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Provision Team Member</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                      placeholder="e.g. Dr. Ramesh Babu"
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Role *</label>
                    <select
                      value={newStaff.role_code}
                      onChange={(e) => setNewStaff({ ...newStaff, role_code: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                    >
                      <option value="DOCTOR">Doctor / Consultant</option>
                      <option value="NURSE">Staff Nurse</option>
                      <option value="RECEPTIONIST">Receptionist / OPD</option>
                      <option value="LAB_TECH">Lab Technician</option>
                      <option value="PHARMACIST">Pharmacist</option>
                      <option value="RADIOLOGIST">Radiologist</option>
                      <option value="BILLING">Billing Officer</option>
                      <option value="ADMIN_STAFF">Hospital Admin Staff</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Registered Mobile *</label>
                    <input
                      type="text"
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                      placeholder="e.g. 9840199888"
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Department</label>
                    <select
                      value={newStaff.department}
                      onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                    >
                      {departments
                        .filter((d) => d.enabled)
                        .map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Branch</label>
                    <select
                      value={newStaff.branch}
                      onChange={(e) => setNewStaff({ ...newStaff, branch: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Member
                    </button>
                  </div>
                </div>
              </form>

              {/* Staff Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Staff Member</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Registered Mobile</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Assigned Branch</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffMembers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                              {s.name[0]}
                            </div>
                            <div>
                              <span>{s.name}</span>
                              <span className="text-[10px] text-slate-400 block">{s.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.role_code === "DOCTOR"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : s.role_code === "NURSE"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {s.role_code}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-700">{s.phone}</td>
                        <td className="p-3 text-slate-700">{s.department}</td>
                        <td className="p-3 text-slate-700">{s.branch}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeStaffMember(s.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════
                READ-ONLY SAAS SUBSCRIPTION & LICENSING (SATHUS CONTROLLED)
               ════════════════════════════════════════════════════════════ */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold border border-indigo-500/30 mb-1.5">
                    <Lock className="w-3 h-3" />
                    Sathus SaaS Commercial Control (Read-Only)
                  </div>
                  <h3 className="text-base font-bold text-white">
                    Hospital Administration &amp; Subscription Overview
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hospital Admin can view plan tier and quotas. Commercial invoicing, plan upgrades, and feature gating are governed strictly by Sathus Super Admin.
                  </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs font-bold shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>SaaS Status: ACTIVE &amp; LICENSED</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Current SaaS Tier
                  </span>
                  <span className="text-sm font-bold text-white mt-0.5 block">ENTERPRISE_PRO</span>
                  <span className="text-[10px] text-blue-400">Unlimited Multi-Branch</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Doctor License Quota
                  </span>
                  <span className="text-sm font-bold text-white mt-0.5 block">100 Clinicians</span>
                  <span className="text-[10px] text-emerald-400">{staffMembers.filter(s => s.role_code === "DOCTOR").length} in use</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Staff &amp; Nursing Quota
                  </span>
                  <span className="text-sm font-bold text-white mt-0.5 block">500 Operators</span>
                  <span className="text-[10px] text-emerald-400">{staffMembers.length} in use</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    SaaS Billing Authority
                  </span>
                  <span className="text-sm font-bold text-white mt-0.5 block">Sathus Technology</span>
                  <span className="text-[10px] text-slate-400">B2B SaaS Managed</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-[11px] text-slate-400 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    To upgrade your quota, add additional hospitals, or request enterprise custom integrations, contact Sathus Super Admin at <strong className="text-slate-200">support@sathus.com</strong>.
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Action Controls */}
            <div className="flex justify-between items-center bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous Step
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleFinalSubmit}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving Hospital Configuration &amp; Provisioning Access...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Hospital Onboarding &amp; Open Command Center</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </WorkspaceLayout>
  );
}
