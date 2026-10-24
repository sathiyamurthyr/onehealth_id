"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users, User, Plus, ShieldCheck, Baby, HeartHandshake,
  Calendar, Clock, Pill, TestTube, FileText, Activity,
  CreditCard, QrCode, Search, CheckCircle2, AlertCircle,
  X, Check, Lock, ChevronRight, ShieldAlert, ArrowRight,
  ExternalLink, Eye, Trash2, History, Settings, RefreshCw,
  Hospital, Phone, Mail, MapPin, Sparkles, Building2
} from "lucide-react";
import { 
  api, 
  FamilyMember, 
  FamilyOverview, 
  FamilyAuditLog,
  FamilyPermissions,
  ExistingPersonCandidate
} from "@/lib/api";
import { useFamily } from "@/lib/patient/FamilyContext";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

const RELATIONSHIP_OPTIONS = [
  { value: "SPOUSE", label: "Spouse / Partner" },
  { value: "SON", label: "Son" },
  { value: "DAUGHTER", label: "Daughter" },
  { value: "FATHER", label: "Father" },
  { value: "MOTHER", label: "Mother" },
  { value: "BROTHER", label: "Brother" },
  { value: "SISTER", label: "Sister" },
  { value: "GRANDFATHER", label: "Grandfather" },
  { value: "GRANDMOTHER", label: "Grandmother" },
  { value: "GRANDCHILD", label: "Grandchild" },
  { value: "LEGAL_GUARDIAN", label: "Legal Guardian" },
  { value: "DEPENDENT", label: "Dependent" },
  { value: "OTHER", label: "Other Family Member" },
];

const BLOOD_GROUPS = ["O+ Positive", "O- Negative", "A+ Positive", "A- Negative", "B+ Positive", "B- Negative", "AB+ Positive", "AB- Negative", "Unknown"];

function FamilyManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useWorkspace();
  const { 
    primaryProfile, 
    familyMembers, 
    familyOverview, 
    activePerson, 
    switchPerson, 
    refreshFamily, 
    isLoading: familyContextLoading,
    error: familyContextError
  } = useFamily();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<{ open: boolean; member: FamilyMember | null }>({ open: false, member: null });
  const [editingPermissionsMember, setEditingPermissionsMember] = useState<FamilyMember | null>(null);
  const [unlinkingMember, setUnlinkingMember] = useState<FamilyMember | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<FamilyAuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Add Member Wizard State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ExistingPersonCandidate[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<ExistingPersonCandidate | null>(null);

  // New Member Form Data
  const [newMemberForm, setNewMemberForm] = useState({
    name: "",
    age: 25,
    dob: "2001-01-01",
    gender: "Male",
    phone: "",
    email: "",
    address: "",
    city: "Chennai",
    state: "Tamil Nadu",
    blood_group: "O+ Positive",
    emergency_contact: "",
    relationship: "SPOUSE",
    is_minor: false,
    is_guardian: false,
    notes: "",
  });

  const [permissionsForm, setPermissionsForm] = useState<FamilyPermissions>({
    view_appointments: true,
    book_appointments: true,
    view_records: true,
    view_prescriptions: true,
    view_lab_reports: true,
    view_bills: true,
    manage_profile: true,
    receive_notifications: true,
  });

  // Open Add Modal automatically if ?action=add
  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setShowAddModal(true);
    }
  }, [searchParams]);

  // Load Audit Trail
  const loadAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const res = await api.patient.getFamilyAuditLogs(50);
      if (res?.data) {
        setAuditLogs(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Duplicate Check Handler
  const handleSearchExisting = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      setSearchLoading(true);
      setError(null);
      const res = await api.patient.checkExistingFamilyMember({
        identifier: searchQuery.trim(),
        phone: searchQuery.trim(),
        email: searchQuery.trim(),
      });
      setSearchResults(res?.data?.candidates || []);
      setSearchDone(true);
    } catch (err: any) {
      setError(err?.message || "Lookup failed.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Submit Add Family Member
  const handleAddMemberSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (selectedCandidate) {
        // Link Existing Person
        const res = await api.patient.addFamilyMember({
          relationship: newMemberForm.relationship,
          is_guardian: newMemberForm.is_guardian || newMemberForm.is_minor,
          is_minor: newMemberForm.is_minor,
          member_patient_id: selectedCandidate.id,
          permissions: permissionsForm,
          notes: newMemberForm.notes,
        });
        setSuccessMsg(res.message || "Family member linked successfully!");
      } else {
        // Create New Person with Auto-generated OH-ID
        const res = await api.patient.addFamilyMember({
          relationship: newMemberForm.relationship,
          is_guardian: newMemberForm.is_guardian || newMemberForm.is_minor,
          is_minor: newMemberForm.is_minor,
          new_member: {
            name: newMemberForm.name,
            age: Number(newMemberForm.age),
            dob: newMemberForm.dob,
            gender: newMemberForm.gender,
            phone: newMemberForm.phone || "+91 98765 00000",
            email: newMemberForm.email || `${newMemberForm.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
            address: newMemberForm.address || "123 Anna Salai",
            city: newMemberForm.city,
            state: newMemberForm.state,
            blood_group: newMemberForm.blood_group,
            emergency_contact: newMemberForm.emergency_contact || primaryProfile?.phone || "+91 98765 43210",
          },
          permissions: permissionsForm,
          notes: newMemberForm.notes,
        });
        setSuccessMsg(res.message || "New family member registered with unique OH-ID!");
      }

      await refreshFamily();
      setShowAddModal(false);
      resetAddForm();
    } catch (err: any) {
      setError(err?.message || "Failed to add family member.");
    } finally {
      setLoading(false);
    }
  };

  // Update Permissions Submit
  const handleUpdatePermissions = async () => {
    if (!editingPermissionsMember) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.patient.updateFamilyPermissions(
        editingPermissionsMember.id,
        { permissions: permissionsForm }
      );
      setSuccessMsg(res.message || "Permissions updated successfully.");
      await refreshFamily();
      setEditingPermissionsMember(null);
    } catch (err: any) {
      setError(err?.message || "Failed to update permissions.");
    } finally {
      setLoading(false);
    }
  };

  // Unlink Member Submit
  const handleUnlinkMember = async () => {
    if (!unlinkingMember) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.patient.removeFamilyMember(unlinkingMember.id);
      setSuccessMsg(res.message || "Family member unlinked.");
      await refreshFamily();
      setUnlinkingMember(null);
    } catch (err: any) {
      setError(err?.message || "Failed to unlink member.");
    } finally {
      setLoading(false);
    }
  };

  const resetAddForm = () => {
    setWizardStep(1);
    setSearchQuery("");
    setSearchResults([]);
    setSearchDone(false);
    setSelectedCandidate(null);
    setNewMemberForm({
      name: "",
      age: 25,
      dob: "2001-01-01",
      gender: "Male",
      phone: "",
      email: "",
      address: "",
      city: "Chennai",
      state: "Tamil Nadu",
      blood_group: "O+ Positive",
      emergency_contact: "",
      relationship: "SPOUSE",
      is_minor: false,
      is_guardian: false,
      notes: "",
    });
    setPermissionsForm({
      view_appointments: true,
      book_appointments: true,
      view_records: true,
      view_prescriptions: true,
      view_lab_reports: true,
      view_bills: true,
      manage_profile: true,
      receive_notifications: true,
    });
  };

  const upcomingEvents = familyOverview?.upcoming_family_appointments || [];

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* 1. Page Header & Principles Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 shadow-xl text-white border border-slate-800">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-cyan-300 text-xs font-semibold backdrop-blur-sm">
                <Users className="w-3.5 h-3.5" />
                <span>OH-ID Family Healthcare Architecture • 1 Person = 1 OH-ID</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Family Healthcare Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                Every family member retains their own unique OneHealth ID and independent clinical records across multiple hospitals. Family relationships enable authorized management without merging medical records.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                id="btn-open-audit-trail"
                onClick={() => {
                  loadAuditLogs();
                  setShowAuditModal(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-sm transition shadow-sm"
              >
                <History className="w-4 h-4 text-cyan-300" />
                <span>Audit Trail</span>
              </button>
              <button
                id="btn-open-add-member"
                onClick={() => {
                  resetAddForm();
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Family Member</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-xs">
            <div>
              <p className="text-slate-400 text-[11px]">Linked Family Members</p>
              <p className="text-lg font-bold text-white mt-0.5">
                {familyOverview?.counts?.total_members ?? familyMembers.length} Person(s)
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-[11px]">Guardianship / Minors</p>
              <p className="text-lg font-bold text-cyan-300 mt-0.5">
                {familyOverview?.counts?.minors ?? familyMembers.filter((m) => m.is_minor).length} Active Minor(s)
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-[11px]">Upcoming Family Appointments</p>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">
                {upcomingEvents.length} Event(s)
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-[11px]">Clinical Data Isolation</p>
              <p className="text-lg font-bold text-amber-300 mt-0.5">100% Enforced</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {(error || familyContextError) && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-700">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error || familyContextError}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setError(null);
                  refreshFamily();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
              <button onClick={() => setError(null)} className="p-1 text-rose-500 hover:text-rose-800">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="p-1 text-emerald-600 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2. Upcoming Family Schedule (Aggregated without mixing medical histories) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Upcoming Family Schedule</h3>
                <p className="text-xs text-slate-500">
                  Appointments scheduled across different hospitals for you and authorized family members
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              Multi-Hospital View
            </span>
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingEvents.map((evt, idx) => {
                const isEvtSelf = evt.patient_id === primaryProfile?.id;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isEvtSelf ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-900"
                        }`}>
                          {isEvtSelf ? "👤 Self (Alice)" : `${evt.relationship}: ${evt.patient_name}`}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {evt.patient_onehealth_id}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{evt.doctor_name}</h4>
                      <p className="text-xs text-slate-600">{evt.doctor_specialty}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                        <Hospital className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate font-medium">{evt.hospital_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-xs">
                      <span className="font-semibold text-slate-700">{evt.slot}</span>
                      <button
                        onClick={() => {
                          switchPerson(isEvtSelf ? null : evt.patient_id);
                          router.push("/patient/appointments");
                        }}
                        className="text-blue-600 hover:text-blue-800 font-bold text-[11px] flex items-center gap-1"
                      >
                        <span>View Appointment</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-1">
              <Calendar className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">No upcoming appointments across the family.</p>
              <p className="text-[11px] text-slate-400">Book new consultations at any accredited hospital.</p>
            </div>
          )}
        </div>

        {/* 3. Family Members Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Family Members & Profiles</h3>
              <p className="text-xs text-slate-500">
                Independent healthcare records connected through authorized family relationship
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total: <strong>{(familyMembers.length + 1)} Person(s)</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CARD A: Primary Account (Self) */}
            <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              activePerson?.isSelf 
                ? "bg-gradient-to-br from-blue-50/80 to-cyan-50/50 border-blue-300 shadow-sm" 
                : "bg-white border-slate-200"
            }`}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                      ME
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">{primaryProfile?.name || "Alice Smith"}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">
                          Self (Primary)
                        </span>
                      </div>
                      <p className="text-xs font-mono font-bold text-cyan-800 mt-0.5">
                        {primaryProfile?.onehealth_id || "OHID-IND-2026-01001"}
                      </p>
                    </div>
                  </div>
                  {activePerson?.isSelf && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active Context
                    </span>
                  )}
                </div>

                {/* Demographics */}
                <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-white/80 rounded-xl border border-slate-100 text-xs text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Age / Gender</span>
                    <span className="font-semibold text-slate-800">{primaryProfile?.age || 32} Y · {primaryProfile?.gender || "Female"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Blood Group</span>
                    <span className="font-semibold text-rose-700">{primaryProfile?.blood_group || "O+ Positive"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Location</span>
                    <span className="font-semibold text-slate-800">{primaryProfile?.city || "Chennai"}</span>
                  </div>
                </div>

                {/* Multi-Hospital Coverage */}
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <Hospital className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Visited Facilities: <strong>Apollo City Hospital, City Multispecialty Clinic</strong></span>
                </div>
              </div>

              {/* Action */}
              <div className="pt-4 mt-3 border-t border-slate-200/80 flex items-center justify-between">
                <Link
                  href="/patient/profile"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Edit My Profile
                </Link>
                <button
                  id="btn-switch-to-self"
                  onClick={() => switchPerson(null)}
                  disabled={activePerson?.isSelf}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activePerson?.isSelf
                      ? "bg-blue-600 text-white opacity-80 cursor-default"
                      : "bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                  }`}
                >
                  <span>{activePerson?.isSelf ? "Currently Viewing" : "Switch to My Health"}</span>
                </button>
              </div>
            </div>

            {/* CARDS B+: Family Members */}
            {familyMembers.length === 0 && (
              <div 
                id="empty-family-members-card"
                className="p-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 flex flex-col items-center justify-center text-center space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">No Family Members Registered</h4>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    You currently have 0 linked family members. Add children, elderly parents, or dependents to manage their healthcare records.
                  </p>
                </div>
                <button
                  id="btn-empty-add-family"
                  onClick={() => {
                    resetAddForm();
                    setShowAddModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Family Member</span>
                </button>
              </div>
            )}

            {familyMembers.map((member) => {
              const isSelected = activePerson?.id === member.member_patient_id;
              return (
                <div
                  key={member.id}
                  id={`family-card-${member.member_patient_id}`}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-gradient-to-br from-amber-50/90 to-orange-50/60 border-amber-300 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                          {member.member_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-slate-900">{member.member_name}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 uppercase">
                              {member.relationship}
                            </span>
                            {member.is_minor && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                Minor
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono font-bold text-amber-800 mt-0.5">
                            {member.member_onehealth_id}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          title="View QR Token"
                          onClick={() => setShowQrModal({ open: true, member })}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          title="Unlink Relationship"
                          onClick={() => setUnlinkingMember(member)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Demographics & Multi-Hospital Badges */}
                    <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50/90 rounded-xl border border-slate-100 text-xs text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Age / Gender</span>
                        <span className="font-semibold text-slate-800">{member.member_age} Y · {member.member_gender}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Blood Group</span>
                        <span className="font-semibold text-rose-700">{member.member_blood_group}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Access Status</span>
                        <span className="font-semibold text-emerald-700">
                          {member.is_guardian ? "Guardian" : "Authorized"}
                        </span>
                      </div>
                    </div>

                    {/* Clinical Records Count */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Hospital className="w-3.5 h-3.5 text-blue-500" />
                        {member.hospitals_count || 1} Visited Hospital(s)
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Pill className="w-3.5 h-3.5 text-emerald-500" />
                        {member.prescriptions_count} Rx
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <TestTube className="w-3.5 h-3.5 text-purple-500" />
                        {member.lab_reports_count} Labs
                      </span>
                    </div>

                    {/* Permissions Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {member.permissions?.view_prescriptions && (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Rx Access
                        </span>
                      )}
                      {member.permissions?.view_lab_reports && (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          ✓ Lab Access
                        </span>
                      )}
                      {member.permissions?.view_appointments && (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          ✓ Appointments
                        </span>
                      )}
                      {member.permissions?.view_bills && (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          ✓ Invoices
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <button
                      id={`btn-perms-${member.member_patient_id}`}
                      onClick={() => {
                        setEditingPermissionsMember(member);
                        setPermissionsForm(member.permissions || {});
                      }}
                      className="text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Permissions</span>
                    </button>

                    <button
                      id={`btn-switch-${member.member_patient_id}`}
                      onClick={() => {
                        switchPerson(member.member_patient_id);
                        router.push("/patient");
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-amber-600 text-white shadow-sm"
                          : "bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                      }`}
                    >
                      <span>{isSelected ? "Viewing Profile" : "View Health Records"}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Multi-Step "+ Add Family Member" Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div id="add-family-wizard-modal" className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200 my-8">
              {/* Modal Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider mb-1">
                    Step {wizardStep} of 3
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {wizardStep === 1 && "Duplicate Check & Identity Lookup"}
                    {wizardStep === 2 && "Demographics & Healthcare Identity"}
                    {wizardStep === 3 && "Relationship & Permissions Matrix"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {wizardStep === 1 && "Check if this person already has a OneHealth ID to prevent duplicate patient records."}
                    {wizardStep === 2 && "Enter individual demographics to create a new unique person identity."}
                    {wizardStep === 3 && "Define family relationship and configure granular record permissions."}
                  </p>
                </div>
                <button
                  id="btn-close-family-wizard"
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* STEP 1: DUPLICATE PREVENTION SEARCH */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <form onSubmit={handleSearchExisting} className="space-y-3">
                    <label className="text-xs font-bold text-slate-700 block">
                      Search by OH-ID, Mobile Number, or Email
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          id="input-duplicate-search"
                          placeholder="e.g. OHID-IND-2026-01002 or 9876543210"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="submit"
                        id="btn-search-duplicate"
                        disabled={searchLoading || !searchQuery.trim()}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5"
                      >
                        {searchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Check Identity"}
                      </button>
                    </div>
                  </form>

                  {/* Search Results / Candidates */}
                  {searchDone && (
                    <div className="space-y-3 pt-2">
                      {searchResults.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Existing Citizen Record Found (Avoids Duplicate OH-ID):
                          </p>
                          {searchResults.map((cand) => (
                            <div
                              key={cand.id}
                              onClick={() => setSelectedCandidate(cand)}
                              className={`p-4 rounded-2xl border cursor-pointer transition ${
                                selectedCandidate?.id === cand.id
                                  ? "bg-blue-50 border-blue-400 shadow-sm"
                                  : "bg-white border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-slate-900">{cand.name}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">
                                      {cand.onehealth_id}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-slate-500">
                                    <span>{cand.age} Y · {cand.gender}</span>
                                    <span>•</span>
                                    <span>{cand.phone_masked}</span>
                                    <span>•</span>
                                    <span>{cand.city}</span>
                                  </div>
                                </div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                  selectedCandidate?.id === cand.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                                }`}>
                                  {selectedCandidate?.id === cand.id && <Check className="w-3.5 h-3.5" />}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
                          <p className="text-xs font-bold text-slate-700">No existing OH-ID record found.</p>
                          <p className="text-[11px] text-slate-500">
                            A new OneHealth ID and zero-knowledge identity pass will be automatically generated for this person.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 1 Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      id="btn-step1-next"
                      onClick={() => {
                        if (selectedCandidate) {
                          setWizardStep(3); // Skip demographics since profile already exists!
                        } else {
                          setWizardStep(2); // Proceed to fill demographics
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <span>{selectedCandidate ? "Link Existing Person →" : "Create New Person →"}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: DEMOGRAPHICS (FOR NEW PERSON) */}
              {wizardStep === 2 && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700">Full Name *</label>
                      <input
                        type="text"
                        id="input-new-member-name"
                        required
                        placeholder="e.g. Arun Murthy"
                        value={newMemberForm.name}
                        onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Age *</label>
                      <input
                        type="number"
                        id="input-new-member-age"
                        required
                        min="0"
                        max="120"
                        value={newMemberForm.age}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setNewMemberForm({
                            ...newMemberForm,
                            age: val,
                            is_minor: val < 18,
                            is_guardian: val < 18,
                          });
                        }}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Gender *</label>
                      <select
                        value={newMemberForm.gender}
                        onChange={(e) => setNewMemberForm({ ...newMemberForm, gender: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Blood Group</label>
                      <select
                        value={newMemberForm.blood_group}
                        onChange={(e) => setNewMemberForm({ ...newMemberForm, blood_group: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {BLOOD_GROUPS.map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Mobile Number</label>
                      <input
                        type="tel"
                        placeholder="+91 98765 00000"
                        value={newMemberForm.phone}
                        onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700">Residential City & State</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="City (e.g. Chennai)"
                          value={newMemberForm.city}
                          onChange={(e) => setNewMemberForm({ ...newMemberForm, city: e.target.value })}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="State (e.g. Tamil Nadu)"
                          value={newMemberForm.state}
                          onChange={(e) => setNewMemberForm({ ...newMemberForm, state: e.target.value })}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 2 Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      id="btn-step2-next"
                      disabled={!newMemberForm.name.trim()}
                      onClick={() => setWizardStep(3)}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Next: Permissions →</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: RELATIONSHIP & PERMISSIONS MATRIX */}
              {wizardStep === 3 && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {/* Selected target preview */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Linking Target</span>
                      <span className="text-sm font-bold text-slate-900">
                        {selectedCandidate ? selectedCandidate.name : newMemberForm.name}
                      </span>
                      <span className="text-xs font-mono text-slate-500 ml-2">
                        {selectedCandidate ? selectedCandidate.onehealth_id : "New OH-ID will be auto-generated"}
                      </span>
                    </div>
                    {selectedCandidate ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Existing Person
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        New Person
                      </span>
                    )}
                  </div>

                  {/* Relationship selector */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Relationship Type *</label>
                    <select
                      id="select-relationship-type"
                      value={newMemberForm.relationship}
                      onChange={(e) => {
                        const rel = e.target.value;
                        const isChild = rel === "SON" || rel === "DAUGHTER" || rel === "DEPENDENT";
                        setNewMemberForm({
                          ...newMemberForm,
                          relationship: rel,
                          is_minor: isChild ? newMemberForm.age < 18 : newMemberForm.is_minor,
                          is_guardian: isChild ? newMemberForm.age < 18 : newMemberForm.is_guardian,
                        });
                      }}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {RELATIONSHIP_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Minor & Guardian Flags */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newMemberForm.is_minor}
                        onChange={(e) => setNewMemberForm({ ...newMemberForm, is_minor: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-800">Minor Person (Age &lt; 18)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newMemberForm.is_guardian}
                        onChange={(e) => setNewMemberForm({ ...newMemberForm, is_guardian: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-800">Legal Guardian Access</span>
                    </label>
                  </div>

                  {/* Granular Permissions Matrix */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Authorized Healthcare Permissions Matrix
                      </label>
                      <span className="text-[10px] text-slate-400">ABDM & OH-ID Consent Model</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { key: "view_appointments", label: "View Appointments", icon: Calendar },
                        { key: "book_appointments", label: "Book Consultations", icon: Plus },
                        { key: "view_records", label: "View Clinical Visits", icon: Clock },
                        { key: "view_prescriptions", label: "View Prescriptions", icon: Pill },
                        { key: "view_lab_reports", label: "View Lab Reports", icon: TestTube },
                        { key: "view_bills", label: "View Invoices & Bills", icon: CreditCard },
                        { key: "manage_profile", label: "Manage Profile Info", icon: User },
                        { key: "receive_notifications", label: "Receive Notifications", icon: ShieldCheck },
                      ].map((perm) => {
                        const Icon = perm.icon;
                        const isChecked = !!permissionsForm[perm.key as keyof FamilyPermissions];
                        return (
                          <label
                            key={perm.key}
                            className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                              isChecked ? "bg-blue-50/60 border-blue-200 text-blue-900" : "bg-white border-slate-200 text-slate-600"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                setPermissionsForm({
                                  ...permissionsForm,
                                  [perm.key]: e.target.checked,
                                })
                              }
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Icon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="text-[11px] font-semibold truncate">{perm.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 3 Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(selectedCandidate ? 1 : 2)}
                      className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      id="btn-submit-add-member"
                      disabled={loading}
                      onClick={handleAddMemberSubmit}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Confirm &amp; Add Member</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. Edit Permissions Modal */}
        {editingPermissionsMember && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Edit Permissions: {editingPermissionsMember.member_name}
                  </h3>
                  <p className="text-xs font-mono text-slate-500">
                    OH-ID: {editingPermissionsMember.member_onehealth_id} ({editingPermissionsMember.relationship})
                  </p>
                </div>
                <button
                  onClick={() => setEditingPermissionsMember(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-600">
                  Configure which categories of healthcare data you are authorized to view or manage for this family member:
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  {[
                    { key: "view_appointments", label: "Appointments" },
                    { key: "book_appointments", label: "Book Consultations" },
                    { key: "view_records", label: "Clinical Visits" },
                    { key: "view_prescriptions", label: "Prescriptions" },
                    { key: "view_lab_reports", label: "Lab Reports" },
                    { key: "view_bills", label: "Bills & Invoices" },
                    { key: "manage_profile", label: "Manage Profile" },
                    { key: "receive_notifications", label: "Notifications" },
                  ].map((perm) => (
                    <label
                      key={perm.key}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-2 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={!!permissionsForm[perm.key as keyof FamilyPermissions]}
                        onChange={(e) =>
                          setPermissionsForm({
                            ...permissionsForm,
                            [perm.key]: e.target.checked,
                          })
                        }
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-800">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setEditingPermissionsMember(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-permissions"
                  disabled={loading}
                  onClick={handleUpdatePermissions}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Save Permissions"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. Unlink Member Confirmation Modal */}
        {unlinkingMember && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Unlink {unlinkingMember.member_name}?
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  This will remove the family access relationship from your account.
                </p>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl mt-3 text-[11px] text-blue-900 font-medium">
                  <strong>Individual Identity Protection:</strong> {unlinkingMember.member_name}&apos;s unique OneHealth ID (<code>{unlinkingMember.member_onehealth_id}</code>) and complete medical records across all hospitals will remain securely preserved and never deleted.
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setUnlinkingMember(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-unlink"
                  disabled={loading}
                  onClick={handleUnlinkMember}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Confirm Unlink"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 7. QR Pass Modal for Specific Family Member */}
        {showQrModal.open && showQrModal.member && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center animate-in zoom-in-95 duration-200">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">{showQrModal.member.member_name}</h3>
                <p className="text-xs text-slate-500">
                  {showQrModal.member.relationship} • Zero-Knowledge QR Token
                </p>
                <p className="text-xs font-mono font-bold text-blue-700 bg-blue-50 py-1 rounded-lg border border-blue-200">
                  {showQrModal.member.member_onehealth_id}
                </p>
              </div>

              {/* QR Box */}
              <div className="p-6 bg-slate-900 rounded-2xl shadow-inner text-white flex flex-col items-center justify-center space-y-3">
                <div className="p-3 bg-white rounded-xl">
                  <QrCode className="w-36 h-36 text-slate-900" />
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Token: {showQrModal.member.member_qr_token || "ZKP-TOKEN-OK"}
                </p>
              </div>

              <p className="text-[11px] text-slate-500">
                Hospital reception scans this QR to locate existing OH-ID records without creating duplicates.
              </p>

              <button
                onClick={() => setShowQrModal({ open: false, member: null })}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
              >
                Close Pass
              </button>
            </div>
          </div>
        )}

        {/* 8. Audit Trail Drawer / Modal */}
        {showAuditModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-800 text-[11px] font-bold uppercase tracking-wider mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
                    Security &amp; Consent Log
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Family Access Audit Trail</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Immutable chronological record of all accesses to family health information
                  </p>
                </div>
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Log Entries List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1 space-y-1">
                {loadingAudit ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Loading audit trail...</span>
                  </div>
                ) : auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <div key={log.id} className="py-3 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{log.action.replace(/_/g, " ")}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(log.created_at).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">{log.relationship_type}</span>
                        <span>•</span>
                        <span>Basis: <strong>{log.authorization_basis}</strong></span>
                        <span>•</span>
                        <span className="font-mono text-slate-400">{log.resource}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-8 text-center">No family access logs recorded yet.</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                >
                  Close Audit Trail
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export default function FamilyManagementPage() {
  return (
    <React.Suspense
      fallback={
        <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          </div>
        </WorkspaceLayout>
      }
    >
      <FamilyManagementContent />
    </React.Suspense>
  );
}
