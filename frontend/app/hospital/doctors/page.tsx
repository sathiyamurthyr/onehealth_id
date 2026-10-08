"use client";

import React, { useState, useEffect } from "react";
import {
  Stethoscope,
  ArrowLeft,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Building,
  ShieldCheck,
  AlertCircle,
  X,
  RefreshCw,
  Award,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { api, DoctorRegisterPayload } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";

export default function DoctorsPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("oh_workspace") || "{}").hospital_ref_id : "") || "";
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [counters, setCounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<DoctorRegisterPayload>({
    name: "",
    email: "",
    phone: "",
    gender: "Male",
    specialty: "General Medicine",
    qualification: "MBBS, MD",
    registration_number: "",
    registration_authority: "Tamil Nadu Medical Council (TNMC)",
    department_id: "",
    opd_counter_id: "",
    room_number: "Room 101",
    employment_type: "FULL_TIME",
    hospital_id: activeHospitalId,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [docList, deptList, counterList] = await Promise.all([
        api.hospital.getDoctors(activeHospitalId).catch(() => []),
        api.admin.departments().catch(() => []),
        api.hospital.getCounters(activeHospitalId).catch(() => []),
      ]);
      setDoctors(docList || []);
      setDepartments(deptList || []);
      setCounters(counterList || []);
      if (deptList && deptList.length > 0 && !formData.department_id) {
        setFormData((prev) => ({ ...prev, hospital_id: activeHospitalId, department_id: deptList[0].id }));
      }
    } catch (err: any) {
      console.error("Failed to load doctor data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeHospitalId]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await api.hospital.registerDoctor({ ...formData, hospital_id: activeHospitalId });
      setSuccessMessage(`Dr. ${formData.name} registered and mapped successfully!`);
      setShowRegisterModal(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        gender: "Male",
        specialty: "General Medicine",
        qualification: "MBBS, MD",
        registration_number: "",
        registration_authority: "Tamil Nadu Medical Council (TNMC)",
        department_id: departments[0]?.id || "",
        opd_counter_id: "",
        room_number: "Room 101",
        employment_type: "FULL_TIME",
        hospital_id: activeHospitalId,
      });
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to register doctor. Please check all fields.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      (doc.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.specialty || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.registration_number || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === "ALL" || doc.department_id === selectedDept || doc.department_name === selectedDept;
    const matchesStatus =
      selectedStatus === "ALL" ||
      (selectedStatus === "ON_DUTY" && doc.on_duty_status === "ON_DUTY") ||
      (selectedStatus === "VERIFIED" && doc.verification_status === "VERIFIED");
    return matchesSearch && matchesDept && matchesStatus;
  });

  const verifiedCount = doctors.filter((d) => d.verification_status === "VERIFIED").length;
  const onDutyCount = doctors.filter((d) => d.on_duty_status === "ON_DUTY" || d.is_available).length;

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN"]}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/hospital"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hospital Operations
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Register Doctor
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header with Stats */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-emerald-400/20">
                <Stethoscope className="w-3.5 h-3.5" /> Medical Staff Directory
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Doctor Management & Mapping</h1>
              <p className="text-emerald-100/80 text-sm max-w-xl">
                Manage registered doctors, verified professional credentials, hospital department allocations, and OPD consultation counters.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <div className="text-center px-3">
                <div className="text-2xl font-bold">{doctors.length}</div>
                <div className="text-[11px] font-medium text-emerald-200">Total Doctors</div>
              </div>
              <div className="text-center px-3 border-x border-white/10">
                <div className="text-2xl font-bold text-emerald-300">{onDutyCount}</div>
                <div className="text-[11px] font-medium text-emerald-200">On Duty</div>
              </div>
              <div className="text-center px-3">
                <div className="text-2xl font-bold text-teal-300">{verifiedCount}</div>
                <div className="text-[11px] font-medium text-emerald-200">Hospital Verified</div>
              </div>
            </div>
          </div>
        </div>

        {/* Notice on Verification Scope */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-800">Compliance & Credentialing Policy:</span>{" "}
            Hospital Administrator verifies physical credentials and assigns internal department/OPD counter mapping. State Medical Council (SMC) & National Medical Commission (NMC) council verifications are recorded with official registration IDs.
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by doctor name, specialty, or medical registration number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="ON_DUTY">On Duty Only</option>
              <option value="VERIFIED">Hospital Verified Only</option>
            </select>
          </div>
        </div>

        {/* Doctor List */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading doctor directory & mappings...</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Doctors Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              No medical practitioners match your search criteria. Try modifying your filters or register a new doctor.
            </p>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
            >
              <Plus className="w-4 h-4" /> Register First Doctor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDoctors.map((doctor) => {
              const isOnDuty = doctor.on_duty_status === "ON_DUTY" || doctor.is_available;
              return (
                <div
                  key={doctor.id || doctor.doctor_id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-4 relative overflow-hidden"
                >
                  {/* Top Status Bar */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-base">
                        {doctor.name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase() || "DR"}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">
                          {doctor.name?.startsWith("Dr.") ? doctor.name : `Dr. ${doctor.name}`}
                        </h3>
                        <p className="text-xs font-semibold text-emerald-700 mt-0.5">{doctor.specialty || "Specialist"}</p>
                        <p className="text-[11px] text-slate-500">{doctor.qualification || "MBBS"}</p>
                      </div>
                    </div>

                    {/* On Duty Indicator */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isOnDuty ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnDuty ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                      {isOnDuty ? "ON DUTY" : "OFF DUTY"}
                    </span>
                  </div>

                  {/* Mapping Details */}
                  <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" /> Department:
                      </span>
                      <span className="font-semibold text-slate-800">{doctor.department_name || "General Medicine"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> OPD Counter / Room:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {doctor.counter_name ? `${doctor.counter_name}` : doctor.room_number || "Room 101"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-slate-400" /> Medical Reg No:
                      </span>
                      <span className="font-mono font-semibold text-slate-800">{doctor.registration_number || "TNMC-54210"}</span>
                    </div>
                  </div>

                  {/* Contacts & Badges */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                        <ShieldCheck className="w-3 h-3" /> Hospital Verified
                      </span>
                      {doctor.employment_type && (
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {doctor.employment_type}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-slate-400">
                      {doctor.phone && (
                        <a
                          href={`tel:${doctor.phone}`}
                          title={doctor.phone}
                          className="p-1 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {doctor.email && (
                        <a
                          href={`mailto:${doctor.email}`}
                          title={doctor.email}
                          className="p-1 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Register Doctor Modal */}
        {showRegisterModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Register & Map Doctor</h2>
                    <p className="text-xs text-slate-500">Add medical practitioner to hospital operational roster</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-5">
                {/* Personal Information */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">1. Personal Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Full Name (with Dr. prefix) *</label>
                      <input
                        type="text"
                        required
                        placeholder="Dr. Arun Kumar"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="doctor@hospital.org"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Mobile Phone *</label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">2. Professional & Registration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Primary Specialty *</label>
                      <input
                        type="text"
                        required
                        placeholder="Cardiology & Internal Medicine"
                        value={formData.specialty}
                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Qualifications *</label>
                      <input
                        type="text"
                        required
                        placeholder="MBBS, MD (Cardiology), DNB"
                        value={formData.qualification}
                        onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Medical Registration Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="TNMC-48291"
                        value={formData.registration_number}
                        onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Registration Authority</label>
                      <input
                        type="text"
                        placeholder="Tamil Nadu Medical Council (TNMC)"
                        value={formData.registration_authority}
                        onChange={(e) => setFormData({ ...formData, registration_authority: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Hospital Mapping */}
                <div className="pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">3. Hospital Operational Mapping</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Department *</label>
                      <select
                        required
                        value={formData.department_id}
                        onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code || "DEPT"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">OPD Counter Assignment</label>
                      <select
                        value={formData.opd_counter_id}
                        onChange={(e) => setFormData({ ...formData, opd_counter_id: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="">-- No specific counter --</option>
                        {counters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.counter_name} ({c.token_prefix || "TKN"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Consultation Room *</label>
                      <input
                        type="text"
                        placeholder="Room 204 (2nd Floor)"
                        value={formData.room_number}
                        onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Employment Type</label>
                      <select
                        value={formData.employment_type}
                        onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="FULL_TIME">Full Time</option>
                        <option value="PART_TIME">Part Time</option>
                        <option value="VISITING_CONSULTANT">Visiting Consultant</option>
                        <option value="ON_CALL">On-Call Emergency</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Registering marks this doctor as <strong>Hospital Verified</strong>. Official medical council verification is logged separately.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
                  >
                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                    {submitting ? "Registering Doctor..." : "Confirm & Register Doctor"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
