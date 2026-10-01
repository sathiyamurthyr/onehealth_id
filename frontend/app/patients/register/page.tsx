"use client";

import React, { useState } from "react";
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
  ChevronRight
} from "lucide-react";
import { api } from "@/lib/api";
import { Patient } from "@/lib/types";
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
    blood_group: "O+",
    diagnosis: "",
    address: "",
    emergency_contact: "",
    hospital_name: "Apollo Speciality Hospital Greams Road",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
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

    setSubmitting(true);
    try {
      const res = await api.patients.register({
        name: formData.name,
        age: parseInt(formData.age),
        gender: formData.gender,
        phone: formData.phone,
        blood_group: formData.blood_group,
        diagnosis: formData.diagnosis || "General Health Checkup",
        address: formData.address || "Chennai, Tamil Nadu, India",
        emergency_contact: formData.emergency_contact || formData.phone,
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
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Patient Registry</span>
          </Link>
          <Badge variant="primary" className="text-xs">
            ABDM & OneHealth Identity Enrolled
          </Badge>
        </div>

        {createdPatient ? (
          /* Registration Success Screen with Generated QR & Digital Card */
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                    Patient Successfully Registered!
                  </h2>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    OneHealth ID generated and enrolled in multi-hospital network registry.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => window.print()}
                  className="gap-2 text-xs flex-1 sm:flex-none"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Card</span>
                </Button>
                <Link href={`/patients/${createdPatient.id}`}>
                  <Button variant="primary" size="md" className="gap-2 text-xs flex-1 sm:flex-none">
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
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Registered Name</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{createdPatient.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">OneHealth ID</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{createdPatient.onehealth_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Age / Gender</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {createdPatient.age} yrs • {createdPatient.gender}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Blood Group</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{createdPatient.blood_group}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Registered Hospital</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {createdPatient.hospital_name || "Apollo Speciality Hospital"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Diagnosis / Complaint</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{createdPatient.diagnosis}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <Link href="/appointments" className="w-full">
                      <Button variant="primary" size="md" className="w-full text-xs font-semibold justify-center">
                        Book Appointment for Patient
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
                          blood_group: "O+",
                          diagnosis: "",
                          address: "",
                          emergency_contact: "",
                          hospital_name: "Apollo Speciality Hospital Greams Road",
                        });
                      }}
                      className="w-full text-xs justify-center"
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
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">New Patient Registration</CardTitle>
                  <p className="text-xs text-slate-500">
                    Captures demographic data, generates a persistent OneHealth ID & QR token
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {error && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    1. Demographic Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Ananya Sundaram"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Age (Years) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="age"
                        required
                        min="1"
                        max="125"
                        value={formData.age}
                        onChange={handleChange}
                        placeholder="e.g. 29"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Gender <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Blood Group
                      </label>
                      <select
                        name="blood_group"
                        value={formData.blood_group}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Medical & Hospital Context */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    2. Clinical & Contact Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Chief Complaint / Preliminary Diagnosis
                      </label>
                      <input
                        type="text"
                        name="diagnosis"
                        value={formData.diagnosis}
                        onChange={handleChange}
                        placeholder="e.g. Chronic Migraine, Hypertension, Annual Physical"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Emergency Contact (Name & Phone)
                      </label>
                      <input
                        type="text"
                        name="emergency_contact"
                        value={formData.emergency_contact}
                        onChange={handleChange}
                        placeholder="e.g. Ramesh Sundaram (+91 98765 11223)"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Residential Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="e.g. No. 42 Anna Nagar, Chennai"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Protected by OneHealth Zero-Knowledge Encryption</span>
                  </p>

                  <div className="flex gap-3 w-full sm:w-auto">
                    <Link href="/patients" className="w-full sm:w-auto">
                      <Button variant="outline" size="md" type="button" className="w-full sm:w-auto text-xs min-h-[44px]">
                        Cancel
                      </Button>
                    </Link>
                    <Button
                      variant="primary"
                      size="md"
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto text-xs font-semibold gap-2 min-h-[44px]"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Generating OneHealth ID...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Complete Registration</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
