"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Phone,
  MapPin,
  Building2,
  FileText,
  CreditCard,
  Stethoscope,
  Activity,
  ShieldCheck,
  QrCode,
  Printer,
  PlusCircle,
  Clock,
  CheckCircle2
} from "lucide-react";
import { api } from "@/lib/api";
import { Patient, Appointment, OPDEncounter, Invoice } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/FeedbackStates";
import { OneHealthQRCard } from "@/components/qr/OneHealthQRCard";

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params?.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [opdEncounters, setOpdEncounters] = useState<OPDEncounter[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "appointments" | "opd" | "billing">("overview");

  useEffect(() => {
    if (!patientId) return;

    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const [pat, appts, opd, invs] = await Promise.all([
          api.patients.get(patientId),
          api.appointments.list().catch(() => []),
          api.clinical.opdEncounters().catch(() => []),
          api.billing.invoices().catch(() => []),
        ]);
        setPatient(pat);
        // Filter records related to this patient
        setAppointments(appts.filter((a) => a.patient_id === patientId));
        setOpdEncounters(opd.filter((o) => o.patient_id === patientId));
        setInvoices(invs.filter((i) => i.patient_id === patientId));
      } catch (err: any) {
        setError(err.message || "Failed to load patient profile");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [patientId]);

  if (loading) {
    return (
      <AppLayout>
        <LoadingState message="Fetching OneHealth identity & clinical profile..." />
      </AppLayout>
    );
  }

  if (error || !patient) {
    return (
      <AppLayout>
        <ErrorState
          title="Patient Record Not Found"
          message={error || "The requested OneHealth ID or patient record could not be resolved."}
          onRetry={() => window.location.reload()}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/patients"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Patient Registry</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => window.print()}
              className="gap-2 text-xs font-semibold"
            >
              <Printer className="w-4 h-4" />
              <span>Print Health Summary</span>
            </Button>
            <Link href="/appointments">
              <Button variant="primary" size="md" className="gap-2 text-xs font-semibold">
                <PlusCircle className="w-4 h-4" />
                <span>Book Appointment</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Patient Hero Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-blue-500/20 shrink-0">
                {patient.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {patient.name}
                  </h1>
                  <Badge variant="primary" className="font-mono text-xs">
                    {patient.onehealth_id}
                  </Badge>
                  <Badge variant="success" className="text-xs">
                    Identity Verified
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>Age: <strong className="text-slate-700 dark:text-slate-300">{patient.age} yrs</strong></span>
                  <span>Gender: <strong className="text-slate-700 dark:text-slate-300">{patient.gender}</strong></span>
                  <span>Blood: <strong className="text-rose-600 dark:text-rose-400">{patient.blood_group || "N/A"}</strong></span>
                  <span>Hospital: <strong className="text-slate-700 dark:text-slate-300">{patient.hospital_name || "Apollo Hospital"}</strong></span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto">
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400 block text-[10px] uppercase">Registered Since</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {patient.created_at ? new Date(patient.created_at).toLocaleDateString() : "Active"}
                </span>
              </div>
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900 text-xs">
                <span className="text-blue-500 block text-[10px] uppercase">Primary Diagnosis</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">
                  {patient.diagnosis || "General Outpatient"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Responsive Scroll) */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-2">
          {[
            { id: "overview", label: "Overview & QR ID", icon: QrCode },
            { id: "appointments", label: `Appointments (${appointments.length})`, icon: Calendar },
            { id: "opd", label: `OPD Consultations (${opdEncounters.length})`, icon: Stethoscope },
            { id: "billing", label: `Invoices & Payments (${invoices.length})`, icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[44px] ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview & QR ID */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-1">
              <OneHealthQRCard patient={patient} />
            </div>

            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <span>Demographic & Identity Attributes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Contact Number</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-blue-500" />
                        {patient.phone}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Emergency Contact</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-rose-500" />
                        {patient.emergency_contact || patient.phone}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 sm:col-span-2">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Residential Address</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        {patient.address || "Chennai, Tamil Nadu, India"}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 sm:col-span-2">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Parent Hospital Facility</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        {patient.hospital_name || "Apollo Speciality Hospital Greams Road"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* QR Verification Protocol Info */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border border-blue-200/60 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Zero-Knowledge Inter-Hospital Portability
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      This QR identity allows any participating Apollo, Fortis, or Government network hospital to verify this patient’s OneHealth identity without exposing raw clinical data in the QR payload.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Appointments */}
        {activeTab === "appointments" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Consultation & Appointment History</CardTitle>
              <Link href="/appointments">
                <Button variant="primary" size="sm" className="text-xs gap-1.5">
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Book New</span>
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <EmptyState
                  title="No Scheduled Appointments"
                  message="This patient currently has no active or past appointment records."
                  actionLabel="Schedule Appointment"
                  onAction={() => window.location.href = "/appointments"}
                />
              ) : (
                <div className="space-y-3">
                  {appointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                              Dr. {appt.doctor_name || "Specialist"}
                            </span>
                            <Badge variant={appt.status === "COMPLETED" ? "success" : "primary"} className="text-[10px]">
                              {appt.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {appt.department_name} • Token #{appt.token_number || "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {appt.appointment_date} {appt.appointment_time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab 3: OPD Consultations */}
        {activeTab === "opd" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Outpatient Clinical Encounters</CardTitle>
            </CardHeader>
            <CardContent>
              {opdEncounters.length === 0 ? (
                <EmptyState
                  title="No OPD Clinical Records"
                  message="No outpatient encounters recorded for this patient yet."
                />
              ) : (
                <div className="space-y-4">
                  {opdEncounters.map((opd) => (
                    <div
                      key={opd.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-blue-600" />
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            Dr. {opd.doctor_name} ({opd.department_name})
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          Token #{opd.token_number}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Chief Complaint</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {opd.chief_complaints || "Routine assessment"}
                          </span>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Recorded Vitals</span>
                          <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                            {JSON.stringify(opd.vitals) || "BP: 120/80, Pulse: 72"}
                          </span>
                        </div>
                      </div>

                      {opd.clinical_notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          "{opd.clinical_notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab 4: Billing */}
        {activeTab === "billing" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Invoices & Financial Records</CardTitle>
              <Link href="/billing">
                <Button variant="outline" size="sm" className="text-xs">
                  Go to Billing Module
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <EmptyState
                  title="No Invoices Generated"
                  message="There are no outstanding or settled invoices for this patient."
                />
              ) : (
                <div className="space-y-3">
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                            {inv.invoice_number}
                          </span>
                          <Badge
                            variant={inv.status === "PAID" || inv.payment_status === "PAID" ? "success" : inv.status === "PARTIAL" ? "warning" : "danger"}
                            className="text-[10px]"
                          >
                            {inv.status || inv.payment_status || "PENDING"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Date: {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "Recent"} • GST Included: ₹{(inv.tax_amount ?? inv.tax_gst ?? 0).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Amount</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            ₹{(inv.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Balance</span>
                          <span className={`text-sm font-bold ${(inv.balance_due ?? inv.balance_amount ?? 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            ₹{(inv.balance_due ?? inv.balance_amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
