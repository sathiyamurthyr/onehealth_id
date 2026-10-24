"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  TestTube,
  Pill,
  Stethoscope,
  Calendar,
  ArrowLeft,
  ChevronRight,
  Activity,
  Heart,
  Download,
  ShieldCheck,
  Clock,
  Send,
  AlertCircle,
  Receipt,
  FileCheck2,
  FolderOpen,
  Bell,
  ExternalLink,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { api } from "@/lib/api";
import { Prescription, TimelineEvent, ReportsSummary } from "@/lib/types";

export default function PatientRecordsPage() {
  const { workspace, user } = useWorkspace();
  const [activeTab, setActiveTab] = useState<
    "PRESCRIPTIONS" | "MEDICINES" | "REPORTS" | "CONSULTATIONS" | "FOLLOWUPS" | "REFERRALS" | "BILLS"
  >("PRESCRIPTIONS");

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [reportsSummary, setReportsSummary] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);

  // Active chronic medicines dynamically derived from active FHIR prescriptions
  const activeMedicines = prescriptions
    .filter((rx) => rx.status === "ACTIVE")
    .flatMap((rx) =>
      (rx.items || []).map((it) => ({
        name: it.generic_name || it.medicine_name,
        brand: it.brand_name || it.medicine_name,
        instructions: it.food_instruction || (it as any).instructions || "Take as prescribed",
        timings: [it.frequency || "Once daily"],
        duration: `${it.duration_value || it.duration_days || 30} ${it.duration_unit || "Days"}`,
        refillsRemaining: 0,
        prescribedBy: rx.signed_by || "Doctor",
        validUntil: rx.valid_until || "Active",
      }))
    );

  useEffect(() => {
    async function loadPatientRecords() {
      setLoading(true);
      try {
        const patientId = user?.user_ref_id || user?.id || "";
        const [rxList, timeline, rep, fUps, refs, billsList] = await Promise.all([
          api.consultations.listPrescriptions().catch(() => []),
          patientId ? api.consultations.getTimeline(patientId).catch(() => []) : Promise.resolve([]),
          patientId ? api.consultations.getReportsSummary(patientId).catch(() => null) : Promise.resolve(null),
          patientId ? api.consultations.listFollowUps({ patientId }).catch(() => []) : Promise.resolve([]),
          patientId ? api.consultations.listReferrals({ patientId }).catch(() => []) : Promise.resolve([]),
          api.billing.invoices().catch(() => []),
        ]);
        if (rxList && rxList.length > 0) setPrescriptions(rxList);
        if (timeline && timeline.length > 0) setTimelineEvents(timeline);
        if (rep) setReportsSummary(rep);
        if (fUps && fUps.length > 0) setFollowUps(fUps);
        if (refs && refs.length > 0) setReferrals(refs);
        if (billsList && billsList.length > 0) setBills(billsList);
      } catch (err) {
        console.error("Failed to load patient records", err);
      } finally {
        setLoading(false);
      }
    }
    loadPatientRecords();
  }, [user]);

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["PATIENT"]}>
      <div className="bg-white min-h-screen text-slate-900 pb-20 space-y-6 max-w-6xl mx-auto">
        {/* Back Link */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <Link
            href="/patient"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Health Dashboard</span>
          </Link>
          <span className="text-xs font-mono text-slate-500">
            OneHealth ID: <strong className="text-slate-800">{user?.username || "OH-2026-90412"}</strong>
          </span>
        </div>

        {/* Page Header */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            My Medical Records & Health Wallet
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Patient-authorized view of verified prescriptions, active medications, lab diagnostics, specialist referrals, and follow-up plans.
          </p>
        </div>

        {/* RBAC Privacy Assurance (Point 17) */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-slate-900">ABDM & OneHealth Data Governance (Point 17):</span>{" "}
            Your patient health records display finalized clinical outputs: active prescriptions, verified lab values,
            and scheduled visits. Internal clinician rough drafts, confidential differential notes, and staff handovers remain strictly protected.
          </div>
        </div>

        {/* 10 Point 17 Segmented Tabs */}
        <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-1">
          {[
            { key: "PRESCRIPTIONS", label: "My Prescriptions", icon: <FileText className="w-3.5 h-3.5" /> },
            { key: "MEDICINES", label: "My Daily Medicines", icon: <Pill className="w-3.5 h-3.5" /> },
            { key: "REPORTS", label: "Diagnostic Reports", icon: <TestTube className="w-3.5 h-3.5" /> },
            { key: "CONSULTATIONS", label: "Visit Records", icon: <Stethoscope className="w-3.5 h-3.5" /> },
            { key: "FOLLOWUPS", label: "Follow-up Plans", icon: <Calendar className="w-3.5 h-3.5" /> },
            { key: "REFERRALS", label: "Specialist Referrals", icon: <Send className="w-3.5 h-3.5" /> },
            { key: "BILLS", label: "Bills & Receipts", icon: <Receipt className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/20"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: PRESCRIPTIONS */}
        {activeTab === "PRESCRIPTIONS" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Prescriptions On File ({prescriptions.length})
              </h3>
              <span className="text-[11px] text-slate-500">FHIR MedicationRequest Orders</span>
            </div>

            <div className="space-y-3">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="font-semibold text-sm text-slate-900">
                        Prescription #{rx.id}
                      </div>
                      <div className="text-xs text-slate-500">
                        Prescribing Doctor: <strong className="text-slate-700">{rx.doctor_name || "Dr. Senthil Kumar"}</strong> • Date: {rx.created_at?.split("T")[0]}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                          rx.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {rx.status}
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {rx.items?.map((it, idx) => (
                      <div key={idx} className="py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {it.brand_name || it.medicine_name}{" "}
                            <span className="text-slate-500 font-normal">({it.generic_name})</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {it.strength || it.dosage} • {it.route || "Oral"} • {it.frequency} • {it.duration_value || it.duration_days} {it.duration_unit || "Days"}
                            {it.food_instruction && <span className="ml-1 text-slate-700 font-medium">({it.food_instruction})</span>}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                            Qty: {it.quantity || "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {rx.digital_signature_hash && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <FileCheck2 className="w-3.5 h-3.5" /> Digitally Signed by {rx.signed_by || "Physician"}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 truncate max-w-xs">
                        {rx.digital_signature_hash}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: MY MEDICINES */}
        {activeTab === "MEDICINES" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Active Medication Regimen
                </h3>
                <p className="text-xs text-slate-500">Currently active prescribed medicines and daily intake schedule.</p>
              </div>
            </div>

            {activeMedicines.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeMedicines.map((med, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{med.brand}</h4>
                        <p className="text-xs text-slate-500">{med.name}</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active Course
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5">
                      <div className="font-medium text-slate-800">{med.instructions}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Schedule:</span>
                        <span className="bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded border border-indigo-200">
                          {med.timings.join(", ")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Valid until: <strong className="text-slate-800">{med.validUntil}</strong></span>
                      <span>Refills remaining: <strong className="text-indigo-600 font-mono">{med.refillsRemaining}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No active daily medications prescribed.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DIAGNOSTIC REPORTS */}
        {activeTab === "REPORTS" && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Laboratory & Diagnostic Reports
            </h3>

            {(reportsSummary?.reports || reportsSummary?.orders || []).length > 0 ? (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-sm">
                {(reportsSummary?.reports || reportsSummary?.orders || []).map((rep: any) => (
                  <div key={rep.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">{rep.test_name}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {rep.category || rep.test_category || "Biochemistry"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Reported on: {rep.report_date || rep.ordered_at || "Recent"} • Authorized by: {rep.doctor_name || "Pathologist"}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span
                          className={`font-mono font-bold text-sm ${
                            rep.abnormal_indicator || rep.is_abnormal ? "text-rose-600" : "text-emerald-700"
                          }`}
                        >
                          {rep.result_value || "Normal"}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">Ref: {rep.reference_range || rep.normal_range || "Standard"}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => alert(`Downloading signed PDF report for ${rep.test_name}...`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No diagnostic test reports filed yet.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: VISIT RECORDS */}
        {activeTab === "CONSULTATIONS" && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Outpatient Consultations & Admissions
            </h3>

            {timelineEvents.length > 0 ? (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-sm">
                {timelineEvents.map((evt: any, idx: number) => (
                  <div key={evt.id || idx} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-slate-900">
                        {evt.title || evt.event_type || "Clinical Encounter"}
                      </div>
                      <span className="text-xs font-mono text-slate-500">{evt.date || evt.timestamp || "Recent"}</span>
                    </div>
                    {evt.description && (
                      <p className="text-xs text-slate-600">{evt.description}</p>
                    )}
                    {evt.doctor_name && (
                      <div className="text-xs text-slate-500">
                        Doctor: <strong className="text-slate-700">{evt.doctor_name}</strong>
                      </div>
                    )}
                    {evt.diagnosis && (
                      <div className="text-xs text-indigo-600 font-medium">
                        Diagnosis: {evt.diagnosis}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No outpatient consultations or admission records on file.
              </div>
            )}
          </div>
        )}

        {/* TAB 5: FOLLOWUPS */}
        {activeTab === "FOLLOWUPS" && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Scheduled Follow-up Visits
            </h3>

            {followUps.length > 0 ? (
              <div className="space-y-3">
                {followUps.map((fup: any) => (
                  <div key={fup.id} className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900">{fup.reason || "Follow-up Consultation"}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Consultant: <strong className="text-slate-700">{fup.doctor_name || fup.doctor || "Physician"}</strong> • {fup.department_name || fup.department || "OPD"}
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
                        {fup.scheduled_date || fup.date} {fup.scheduled_time || fup.time ? `at ${fup.scheduled_time || fup.time}` : ""}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-2">
                      {fup.preVisitTests && fup.preVisitTests.length > 0 && (
                        <>
                          <div className="font-semibold text-slate-700">Required Before Visit:</div>
                          <div className="flex flex-wrap gap-2">
                            {fup.preVisitTests.map((t: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[11px]">
                                ✓ {t}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                      {fup.instructions && (
                        <div className="text-[11px] text-slate-500 italic mt-1">
                          Note: {fup.instructions}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No scheduled follow-up visits on file.
              </div>
            )}
          </div>
        )}

        {/* TAB 6: REFERRALS */}
        {activeTab === "REFERRALS" && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Doctor Specialist Referrals
            </h3>

            {referrals.length > 0 ? (
              <div className="space-y-3">
                {referrals.map((ref: any) => (
                  <div key={ref.id} className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900">
                          Referral to {ref.specialty || ref.target_department || "Specialist"}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Receiving Specialist: <strong className="text-slate-700">{ref.toDoctor || ref.target_doctor_name || "Specialist"}</strong>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {ref.status || "PENDING"}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                      {ref.reason && <div className="text-slate-700"><span className="font-semibold">Reason:</span> {ref.reason}</div>}
                      {ref.evaluation && <div className="text-slate-600 text-[11px]"><span className="font-semibold">Requested Evaluation:</span> {ref.evaluation}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No specialist referrals on file.
              </div>
            )}
          </div>
        )}

        {/* TAB 7: BILLS */}
        {activeTab === "BILLS" && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Settled Bills & Receipts
            </h3>

            {bills.length > 0 ? (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-sm">
                {bills.map((b: any, idx: number) => (
                  <div key={b.id || idx} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div>
                      <div className="font-semibold text-slate-900">{b.description || b.invoice_number || `Invoice #${b.id}`}</div>
                      <div className="text-[11px] text-slate-500">{b.payment_method || "Paid"} • {b.date || b.created_at || "Recent"}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-900">₹{b.total_amount || b.amount || "0.00"}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                        {b.status || "Paid"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No billing receipts or invoices on record.
              </div>
            )}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
