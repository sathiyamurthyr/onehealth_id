"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Calendar,
  Building2,
  HeartPulse,
  Printer,
  ChevronRight,
  AlertTriangle,
  UserCheck,
  Search
} from "lucide-react";
import { api } from "@/lib/api";
import { Patient, DuplicateCheckResult } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/ui/Card";
import { OneHealthQRCard } from "@/components/qr/OneHealthQRCard";

export default function RegisterPatientPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "Male",
    phone: "",
    email: "",
    blood_group: "O+",
    diagnosis: "",
    address: "",
    emergency_contact: "",
    identity_type: "VOTER_ID",
    identity_number: "",
    hospital_id: "hosp-kedar",
    branch_id: "branch-kedar-01",
    consent_given: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);
  
  // Duplicate Detection State
  const [duplicateMatches, setDuplicateMatches] = useState<Patient[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

  // Trigger duplicate check on phone / identity_number change
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.phone.length >= 10 || formData.identity_number.length >= 5 || (formData.name.length >= 3 && formData.age)) {
        setCheckingDuplicates(true);
        try {
          const res = await api.patients.checkDuplicate({
            phone: formData.phone.trim() || undefined,
            identity_number: formData.identity_number.trim() || undefined,
            name: formData.name.trim() || undefined,
            age: formData.age ? parseInt(formData.age) : undefined,
          });
          if (res.duplicate_found) {
            setDuplicateMatches(res.matches);
            setDuplicateDismissed(false);
          } else {
            setDuplicateMatches([]);
          }
        } catch {
          // Non-blocking duplicate check error
        } finally {
          setCheckingDuplicates(false);
        }
      } else {
        setDuplicateMatches([]);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.phone, formData.identity_number, formData.name, formData.age]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({
      ...prev,
      [name]: val,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Patient full name is required");
      return;
    }
    if (!formData.age || parseInt(formData.age) <= 0 || parseInt(formData.age) > 130) {
      setError("Please enter a valid age between 1 and 130");
      return;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      setError("Please provide a valid 10-digit mobile number");
      return;
    }
    if (!formData.consent_given) {
      setError("Patient consent is required for registering into the OneHealth ID registry.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.patients.register({
        name: formData.name.trim(),
        age: parseInt(formData.age),
        gender: formData.gender,
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        blood_group: formData.blood_group,
        diagnosis: formData.diagnosis.trim() || "General Outpatient Intake",
        address: formData.address.trim() || "Mugalivakkam, Chennai, Tamil Nadu",
        emergency_contact: formData.emergency_contact.trim() || formData.phone.trim(),
        identity_type: formData.identity_type,
        identity_number: formData.identity_number.trim() || undefined,
        hospital_id: formData.hospital_id,
        branch_id: formData.branch_id,
      });
      setCreatedPatient(res);
    } catch (err: any) {
      setError(err.message || "Failed to register patient in OneHealth registry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/patients"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800  min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Patient Registry</span>
          </Link>
          <Badge variant="primary" className="text-xs">
            Kedar Hospital Pilot • Mugalivakkam
          </Badge>
        </div>

        {createdPatient ? (
          /* Registration Success Screen with Generated QR & Digital Card */
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-emerald-50  border border-emerald-200  p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-emerald-900 ">
                    Patient Successfully Registered!
                  </h2>
                  <p className="text-xs text-emerald-700 ">
                    Persistent OneHealth ID & Zero-Knowledge QR Token generated.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => window.print()}
                  className="gap-2 text-xs flex-1 sm:flex-none min-h-[44px]"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Card</span>
                </Button>
                <Link href={`/patients/${createdPatient.id}`}>
                  <Button variant="primary" size="md" className="gap-2 text-xs flex-1 sm:flex-none min-h-[44px]">
                    <span>View Profile</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Render Digital OneHealth Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <OneHealthQRCard patient={createdPatient} />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <span>Identity Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50  rounded-xl">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Registered Name</span>
                      <span className="font-semibold text-slate-800 ">{createdPatient.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">OneHealth ID</span>
                      <span className="font-mono font-bold text-blue-600 ">{createdPatient.onehealth_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Age / Gender</span>
                      <span className="font-medium text-slate-700 ">
                        {createdPatient.age} yrs • {createdPatient.gender}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Blood Group</span>
                      <span className="font-bold text-rose-600 ">{createdPatient.blood_group}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Registered Facility</span>
                      <span className="font-medium text-slate-700 ">
                        Kedar Hospital (Mugalivakkam)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Identity Ref</span>
                      <span className="font-mono font-medium text-slate-700 ">
                        {createdPatient.identity_type}: {createdPatient.identity_number || "Not specified"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <Link href={`/appointments?patient_id=${createdPatient.id}`} className="w-full">
                      <Button variant="primary" size="md" className="w-full text-xs font-semibold justify-center min-h-[44px]">
                        Book Outpatient Appointment
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => {
                        setCreatedPatient(null);
                        setFormData({
                          name: "",
                          age: "",
                          gender: "Male",
                          phone: "",
                          email: "",
                          blood_group: "O+",
                          diagnosis: "",
                          address: "",
                          emergency_contact: "",
                          identity_type: "VOTER_ID",
                          identity_number: "",
                          hospital_id: "hosp-kedar",
                          branch_id: "branch-kedar-01",
                          consent_given: true,
                        });
                        setDuplicateMatches([]);
                      }}
                      className="w-full text-xs justify-center min-h-[44px]"
                    >
                      Register Another Patient
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Registration Form */
          <Card>
            <CardHeader className="border-b border-slate-100 ">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100  text-blue-600  flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Kedar Hospital Patient Registration</CardTitle>
                  <p className="text-xs text-slate-500">
                    Mugalivakkam Branch • Live Duplicate Detection & Zero-Knowledge QR Generation
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {error && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-50  border border-rose-200  text-rose-700  text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Duplicate Patient Alert Banner (Section 13) */}
              {duplicateMatches.length > 0 && !duplicateDismissed && (
                <div className="mb-6 p-4 rounded-2xl bg-amber-50  border border-amber-300  text-amber-900  text-xs animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold text-sm text-amber-900  mb-1">
                        Possible Existing Patient Found!
                      </div>
                      <p className="text-amber-800  mb-3">
                        The registry found matching records with the same contact or identity credentials. Please review to avoid duplicate registrations.
                      </p>

                      <div className="space-y-2 mb-3">
                        {duplicateMatches.map((match) => (
                          <div
                            key={match.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white  rounded-xl border border-amber-200 "
                          >
                            <div>
                              <span className="font-bold text-slate-900  mr-2">{match.name}</span>
                              <span className="font-mono text-[11px] text-blue-600  mr-2">{match.onehealth_id}</span>
                              <span className="text-[11px] text-slate-500">({match.phone})</span>
                            </div>
                            <Link href={`/patients/${match.id}`}>
                              <Button variant="outline" size="sm" className="text-xs gap-1 min-h-[36px]">
                                <span>View Existing Profile</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDuplicateDismissed(true)}
                          className="text-xs"
                        >
                          Proceed Anyway (Not a Duplicate)
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Demographic Information */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    1. Demographic Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700  mb-1.5">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="e.g. S. Ramanathan"
                        className="w-full px-4 py-2.5 bg-slate-50  border border-slate-300  rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700  mb-1.5">
                        Age <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleChange}
                        required
                        min="1"
                        max="130"
                        placeholder="e.g. 45"
                        className="w-full px-4 py-2.5 bg-slate-50  border border-slate-300  rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700  mb-1.5">
                        Gender <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-slate-50  border border-slate-300  rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700  mb-1.5">
                        Blood Group
                      </label>
                      <select
                        name="blood_group"
                        value={formData.blood_group}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-slate-50  border border-slate-300  rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      >
                        <option value="O+">O+ Positive</option>
                        <option value="O-">O- Negative</option>
                        <option value="A+">A+ Positive</option>
                        <option value="A-">A- Negative</option>
                        <option value="B+">B+ Positive</option>
                        <option value="B-">B- Negative</option>
                        <option value="AB+">AB+ Positive</option>
                        <option value="AB-">AB- Negative</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Contact & Identity Credentials */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    2. Contact & Configurable Identity (Aadhaar Not Mandatory)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700  mb-1.5">
                        Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        placeholder="10-digit mobile number"
                        className="w-full px-4 py-2.5 bg-slate-50  border border-slate-300  rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700  mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="e.g. patient@example.com"
                        className="w-full px-4 py-2.5 bg-slate-50  border border-slate-300  rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700  mb-1.5">
                        Emergency Contact
                      </label>
                      <input
                        type="text"
                        name="emergency_contact"
                        value={formData.emergency_contact}
                        onChange={handleChange}
                        placeholder="e.g. +91 98401 22334 (Spouse)"
                        className="w-full px-4 py-2.5 bg-slate-50  border border-slate-300  rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700  mb-1.5">
                        Identity Type (Configurable)
                      </label>
                      <select
                        name="identity_type"
                        value={formData.identity_type}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-slate-50  border border-slate-300  rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      >
                        <option value="VOTER_ID">Voter ID (Election Card)</option>
                        <option value="DRIVING_LICENSE">Driving License</option>
                        <option value="NATIONAL_ID">National ID / Aadhaar</option>
                        <option value="PASSPORT">Passport</option>
                        <option value="EMPLOYEE_ID">Employee / Insurance ID</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700  mb-1.5">
                        Identity Reference Number
                      </label>
                      <input
                        type="text"
                        name="identity_number"
                        value={formData.identity_number}
                        onChange={handleChange}
                        placeholder="e.g. TN/02/124/88921"
                        className="w-full px-4 py-2.5 bg-slate-50  border border-slate-300  rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-slate-700  mb-1.5">
                        Residential Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="e.g. 14 Sabari Nagar, Mugalivakkam, Chennai 600125"
                        className="w-full px-4 py-2.5 bg-slate-50  border border-slate-300  rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Initial Clinical Reason & Consent */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    3. Reason for Visit & Patient Consent
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700  mb-1.5">
                        Initial Reason / Complaint
                      </label>
                      <input
                        type="text"
                        name="diagnosis"
                        value={formData.diagnosis}
                        onChange={handleChange}
                        placeholder="e.g. Routine OPD Consultation, Diabetology Follow-up, Fever"
                        className="w-full px-4 py-2.5 bg-slate-50  border border-slate-300  rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      />
                    </div>

                    <div className="p-3.5 bg-slate-50  rounded-xl border border-slate-200 ">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="consent_given"
                          checked={formData.consent_given}
                          onChange={handleChange}
                          className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs text-slate-600 ">
                          <strong>Patient Consent:</strong> Patient consents to create a secure OneHealth ID, generate a zero-knowledge QR identity token, and permit authorized Kedar Hospital clinicians to view health records.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="pt-4 border-t border-slate-100  flex flex-col sm:flex-row items-center justify-end gap-3">
                  <Link href="/patients" className="w-full sm:w-auto">
                    <Button variant="outline" size="md" type="button" className="w-full sm:w-auto min-h-[44px]">
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={submitting}
                    className="w-full sm:w-auto min-h-[44px]"
                  >
                    {submitting ? "Registering & Generating OH-ID..." : "Register Patient & Generate QR"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
