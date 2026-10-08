"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
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
  Phone,
  Mail,
  UserCheck,
  ShieldAlert,
  Calendar,
  Lock,
  FileText,
  User,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { api, TraineeRegisterPayload } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";

export default function TraineesPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("oh_workspace") || "{}").hospital_ref_id : "") || "";
  const [trainees, setTrainees] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<TraineeRegisterPayload>({
    name: "",
    email: "",
    phone: "",
    training_type: "Medical Intern (CRRI)",
    institution: "Madras Medical College",
    qualification: "MBBS Final Year / Intern",
    department_id: "",
    supervisor_doctor_id: "",
    supervisor_name: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
    hospital_id: activeHospitalId,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [traineeList, docList, deptList] = await Promise.all([
        api.hospital.getTrainees(activeHospitalId).catch(() => []),
        api.hospital.getDoctors(activeHospitalId).catch(() => []),
        api.admin.departments().catch(() => []),
      ]);
      setTrainees(traineeList || []);
      setDoctors(docList || []);
      setDepartments(deptList || []);
      if (deptList && deptList.length > 0 && !formData.department_id) {
        setFormData((prev) => ({ ...prev, hospital_id: activeHospitalId, department_id: deptList[0].id }));
      }
      if (docList && docList.length > 0 && !formData.supervisor_doctor_id) {
        setFormData((prev) => ({
          ...prev,
          hospital_id: activeHospitalId,
          supervisor_doctor_id: docList[0].id,
          supervisor_name: docList[0].name,
        }));
      }
    } catch (err: any) {
      console.error("Failed to load trainee data:", err);
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
      const selectedDoc = doctors.find((d) => d.id === formData.supervisor_doctor_id);
      const payload: TraineeRegisterPayload = {
        ...formData,
        supervisor_name: selectedDoc ? selectedDoc.name : formData.supervisor_name,
      };

      await api.hospital.registerTrainee(payload);
      setSuccessMessage(`Trainee ${formData.name} registered under ${payload.supervisor_name || "Supervising Doctor"}!`);
      setShowRegisterModal(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        training_type: "Medical Intern (CRRI)",
        institution: "Madras Medical College",
        qualification: "MBBS Final Year / Intern",
        department_id: departments[0]?.id || "",
        supervisor_doctor_id: doctors[0]?.id || "",
        supervisor_name: doctors[0]?.name || "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
        hospital_id: activeHospitalId,
      });
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to register trainee. Please check all fields.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTrainees = trainees.filter((t) => {
    const matchesSearch =
      (t.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.institution || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.supervisor_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "ALL" || t.training_type === selectedType;
    const matchesDept = selectedDept === "ALL" || t.department_id === selectedDept || t.department_name === selectedDept;
    return matchesSearch && matchesType && matchesDept;
  });

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN"]}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/hospital"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hospital Operations
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Register Trainee / Intern
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
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-indigo-400/20">
                <GraduationCap className="w-3.5 h-3.5" /> Academic & Clinical Training
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Trainee & Resident Management</h1>
              <p className="text-indigo-100/80 text-sm max-w-xl">
                Manage medical interns, postgraduate residents, and nursing trainees with automated clinical guardrails and supervisor doctor mapping.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
              <div className="px-3">
                <div className="text-2xl font-bold">{trainees.length}</div>
                <div className="text-[11px] font-medium text-indigo-200">Active Trainees</div>
              </div>
              <div className="px-3 border-x border-white/10">
                <div className="text-2xl font-bold text-emerald-300">
                  {trainees.filter((t) => t.training_type?.includes("Medical") || t.training_type?.includes("CRRI")).length}
                </div>
                <div className="text-[11px] font-medium text-indigo-200">Medical Interns</div>
              </div>
              <div className="px-3">
                <div className="text-2xl font-bold text-amber-300">
                  {trainees.filter((t) => t.training_type?.includes("Nursing")).length}
                </div>
                <div className="text-[11px] font-medium text-indigo-200">Nursing Trainees</div>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Guardrails Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-2 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Strict Healthcare Compliance & Trainee Guardrails Enforced</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
              <span className="font-semibold text-emerald-800 flex items-center gap-1 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Permitted Actions:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                <li>View permitted assigned patient demographic & vitals</li>
                <li>Draft clinical notes under supervision</li>
                <li>Record observational patient triage info</li>
              </ul>
            </div>
            <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
              <span className="font-semibold text-rose-800 flex items-center gap-1 mb-1">
                <Lock className="w-3.5 h-3.5 text-rose-600" /> Restricted & Blocked:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                <li>No independent signing of prescriptions</li>
                <li>No unapproved referrals or hospital discharges</li>
                <li>No administrative access or audit override</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by trainee name, medical institution, or supervising doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Training Types</option>
              <option value="Medical Intern (CRRI)">Medical Intern (CRRI)</option>
              <option value="Postgraduate Resident">Postgraduate Resident</option>
              <option value="Nursing Trainee">Nursing Trainee</option>
              <option value="Pharmacy Intern">Pharmacy Intern</option>
            </select>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Trainee Directory */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading trainee directory & supervisor allocations...</p>
          </div>
        ) : filteredTrainees.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Trainees Registered</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              No trainees or interns match the criteria. Register a new intern under an assigned supervisor.
            </p>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" /> Register First Trainee
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTrainees.map((trainee) => (
              <div
                key={trainee.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-base">
                      {trainee.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "TR"}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-tight">{trainee.name}</h3>
                      <p className="text-xs font-semibold text-indigo-700 mt-0.5">{trainee.training_type}</p>
                      <p className="text-[11px] text-slate-500">{trainee.institution}</p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Lock className="w-2.5 h-2.5" /> SUPERVISED
                  </span>
                </div>

                {/* Supervisor & Department */}
                <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Supervisor Doctor:
                    </span>
                    <span className="font-semibold text-slate-800">{trainee.supervisor_name || "Assigned Consultant"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" /> Department:
                    </span>
                    <span className="font-semibold text-slate-800">{trainee.department_name || "General Medicine"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Training Period:
                    </span>
                    <span className="font-mono text-[11px] text-slate-700">
                      {trainee.start_date ? new Date(trainee.start_date).toLocaleDateString() : "Ongoing"} –{" "}
                      {trainee.end_date ? new Date(trainee.end_date).toLocaleDateString() : "Present"}
                    </span>
                  </div>
                </div>

                {/* Contact Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">{trainee.qualification || "MBBS Student"}</span>
                  <div className="flex items-center gap-1 text-slate-400">
                    {trainee.phone && (
                      <a
                        href={`tel:${trainee.phone}`}
                        title={trainee.phone}
                        className="p-1 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {trainee.email && (
                      <a
                        href={`mailto:${trainee.email}`}
                        title={trainee.email}
                        className="p-1 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Register Trainee Modal */}
        {showRegisterModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Register Trainee / Intern</h2>
                    <p className="text-xs text-slate-500">Add medical or nursing trainee with assigned supervisor</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Kavitha S"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="trainee@hospital.org"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Mobile Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98409 87654"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Training Type *</label>
                    <select
                      value={formData.training_type}
                      onChange={(e) => setFormData({ ...formData, training_type: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Medical Intern (CRRI)">Medical Intern (CRRI)</option>
                      <option value="Postgraduate Resident">Postgraduate Resident</option>
                      <option value="Nursing Trainee">Nursing Trainee</option>
                      <option value="Pharmacy Intern">Pharmacy Intern</option>
                      <option value="Lab Technician Trainee">Lab Technician Trainee</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Academic Institution *</label>
                    <input
                      type="text"
                      required
                      placeholder="Madras Medical College"
                      value={formData.institution}
                      onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Department *</label>
                    <select
                      required
                      value={formData.department_id}
                      onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Supervisor Doctor *</label>
                    <select
                      required
                      value={formData.supervisor_doctor_id}
                      onChange={(e) => setFormData({ ...formData, supervisor_doctor_id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name} ({doc.specialty || "Doctor"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
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
                    className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
                  >
                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                    {submitting ? "Registering..." : "Confirm Trainee Registration"}
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
