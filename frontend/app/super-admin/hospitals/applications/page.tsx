"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Hospital,
  Stethoscope,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  RefreshCw,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Check,
  X,
  Lock,
  MessageSquare,
  History,
  AlertCircle,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { api, FacilityApplication } from "@/lib/api";

export default function SuperAdminApplicationsPage() {
  const [applications, setApplications] = useState<FacilityApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Selected application for detail modal
  const [selectedApp, setSelectedApp] = useState<FacilityApplication | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action Modals State
  const [actionModal, setActionModal] = useState<{
    type: "APPROVE" | "REJECT" | "REQUEST_INFO" | "START_REVIEW" | "HOLD";
    app: FacilityApplication;
  } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.superAdmin.listApplications({
        status: statusFilter,
        search: search.trim() || undefined,
      });
      setApplications(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load facility applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadApplications();
  };

  const openAppDetails = async (appId: string) => {
    try {
      setDetailLoading(true);
      const fullDetails = await api.superAdmin.getApplicationDetails(appId);
      setSelectedApp(fullDetails);
    } catch (err: any) {
      alert("Failed to load application details: " + err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenActionModal = (
    type: "APPROVE" | "REJECT" | "REQUEST_INFO" | "START_REVIEW" | "HOLD",
    app: FacilityApplication
  ) => {
    setActionModal({ type, app });
    if (type === "APPROVE") {
      setDecisionNotes("Approved by Super Admin after verifying statutory registration, license, and authorized representative credentials.");
    } else if (type === "HOLD") {
      setDecisionNotes("Application placed on hold pending verification of clinical registration certificates and premises audit.");
    } else if (type === "REJECT") {
      setDecisionNotes("");
    } else if (type === "REQUEST_INFO") {
      setDecisionNotes("Please upload a clearer copy of your Clinical Establishment License certificate and updated Fire NOC.");
    } else {
      setDecisionNotes("Super Admin formal review initiated.");
    }
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;

    const { type, app } = actionModal;
    if ((type === "REJECT" || type === "REQUEST_INFO" || type === "HOLD") && (!decisionNotes.trim() || decisionNotes.trim().length < 5)) {
      alert("Please provide mandatory notes/reason (minimum 5 characters).");
      return;
    }

    try {
      setIsSubmittingAction(true);
      setError("");

      if (type === "START_REVIEW") {
        await api.superAdmin.reviewApplication(app.id, decisionNotes);
        setSuccessMsg(`Application for '${app.name}' transitioned to UNDER_REVIEW.`);
      } else if (type === "APPROVE") {
        await api.superAdmin.approveApplication(app.id, decisionNotes);
        setSuccessMsg(`Facility '${app.name}' has been APPROVED and activated on the platform! Activation token dispatched.`);
      } else if (type === "HOLD") {
        await api.superAdmin.holdApplication(app.id, decisionNotes);
        setSuccessMsg(`Facility application for '${app.name}' has been placed ON_HOLD. Applicant alerted.`);
      } else if (type === "REJECT") {
        await api.superAdmin.rejectApplication(app.id, decisionNotes);
        setSuccessMsg(`Facility application for '${app.name}' has been REJECTED.`);
      } else if (type === "REQUEST_INFO") {
        await api.superAdmin.requestInfoApplication(app.id, decisionNotes);
        setSuccessMsg(`Requested additional information from '${app.name}'. Status set to NEEDS_INFORMATION.`);
      }

      setActionModal(null);
      if (selectedApp?.id === app.id) {
        setSelectedApp(null);
      }
      loadApplications();
    } catch (err: any) {
      alert("Action failed: " + err.message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const pendingCount = applications.filter((a) => a.lifecycle_status === "SUBMITTED" || a.lifecycle_status === "UNDER_REVIEW").length;

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Navigation Breadcrumb & Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/super-admin/hospitals"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Hospital Network Directory
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Auto-refresh ready</span>
            <button
              onClick={loadApplications}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 transition shadow-xs"
              title="Refresh applications"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Page Header */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl lg:text-2xl font-black text-slate-900">
                Hospital &amp; Clinic Onboarding Approvals
              </h1>
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold animate-pulse">
                  {pendingCount} Pending Review
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Super Admin authorization gate. All registered healthcare facilities remain strictly blocked until approved below.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/register/facility"
              target="_blank"
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Public Registration Form
            </Link>
          </div>
        </div>

        {/* Success or Error Alert */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-red-700 hover:text-red-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <form onSubmit={handleSearchSubmit} className="md:col-span-8 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by facility name, license number, representative, or APP- reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
            >
              Search
            </button>
          </form>

          <div className="md:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            >
              <option value="ALL">All Application States</option>
              <option value="SUBMITTED">SUBMITTED (New / Queued)</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="ON_HOLD">ON_HOLD (Action Requested)</option>
              <option value="NEEDS_INFORMATION">NEEDS_INFORMATION</option>
              <option value="APPROVED">APPROVED (Active)</option>
              <option value="REJECTED">REJECTED</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>
        </div>

        {/* Applications List */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Registration Applications ({applications.length})
            </h2>
            <span className="text-[11px] text-slate-400">
              Only authorized Super Admins can issue approval
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-xs">Loading facility onboarding applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No applications found</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting search filters or checking back later.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Organization / Facility</th>
                    <th className="py-3 px-4">Type &amp; License</th>
                    <th className="py-3 px-4">Representative</th>
                    <th className="py-3 px-4">Docs</th>
                    <th className="py-3 px-4">Current Status</th>
                    <th className="py-3 px-4">Submission Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            app.hospital_type === "CLINIC"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {app.hospital_type === "CLINIC" ? <Stethoscope className="w-4 h-4" /> : <Hospital className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{app.name}</span>
                            <span className="text-[11px] font-mono text-slate-500">{app.application_ref}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase mb-1">
                          {app.hospital_type}
                        </span>
                        <div className="font-mono text-[11px] text-slate-700">{app.registration_number}</div>
                        <div className="text-[11px] text-slate-500">{app.city}, {app.state}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{app.rep_name}</div>
                        <div className="text-[11px] text-slate-500">{app.rep_email}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{app.rep_phone}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium">
                          <FileText className="w-3 h-3 text-slate-500" />
                          {app.documents_count || (app.supporting_documents?.length ?? 0)} Docs
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {app.lifecycle_status === "APPROVED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            APPROVED
                          </span>
                        )}
                        {app.lifecycle_status === "UNDER_REVIEW" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800">
                            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                            UNDER_REVIEW
                          </span>
                        )}
                        {app.lifecycle_status === "SUBMITTED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 text-amber-600" />
                            SUBMITTED
                          </span>
                        )}
                        {(app.lifecycle_status === "ON_HOLD" || app.lifecycle_status === "NEEDS_INFORMATION") && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-orange-100 text-orange-800">
                            <AlertTriangle className="w-3 h-3 text-orange-600" />
                            {app.lifecycle_status === "ON_HOLD" ? "ON_HOLD" : "NEEDS_INFO"}
                          </span>
                        )}
                        {app.lifecycle_status === "REJECTED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3 text-red-600" />
                            REJECTED
                          </span>
                        )}
                        {app.lifecycle_status === "SUSPENDED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800">
                            <Lock className="w-3 h-3 text-rose-600" />
                            SUSPENDED
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {app.created_at ? new Date(app.created_at).toLocaleDateString() : "—"}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openAppDetails(app.id)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                            title="Inspect application details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {app.lifecycle_status === "SUBMITTED" && (
                            <button
                              onClick={() => handleOpenActionModal("START_REVIEW", app)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition"
                            >
                              Start Review
                            </button>
                          )}

                          {["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFORMATION", "ON_HOLD"].includes(app.lifecycle_status) && (
                            <>
                              <button
                                onClick={() => handleOpenActionModal("APPROVE", app)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleOpenActionModal("HOLD", app)}
                                className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-800 font-bold text-[11px] transition"
                                title="Place application on hold"
                              >
                                Put On Hold
                              </button>
                              <button
                                onClick={() => handleOpenActionModal("REJECT", app)}
                                className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] transition"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 360-DEGREE APPLICATION DETAIL MODAL */}
        {selectedApp && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {selectedApp.application_ref}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                      {selectedApp.hospital_type}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">{selectedApp.name}</h3>
                  <p className="text-xs text-slate-500">{selectedApp.address}, {selectedApp.city}, {selectedApp.state}</p>
                </div>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Statutory Credentials */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Statutory Credentials</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Registration Number</span>
                    <strong className="font-mono text-slate-800">{selectedApp.registration_number}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Issuing Authority</span>
                    <span className="text-slate-800">{selectedApp.registration_authority || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Ownership</span>
                    <span className="text-slate-800">{selectedApp.ownership_type || "PRIVATE"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Registration Date</span>
                    <span className="text-slate-800">{selectedApp.registration_date || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Registration Expiry</span>
                    <span className="text-slate-800">{selectedApp.registration_expiry || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Official Email</span>
                    <span className="text-slate-800">{selectedApp.email}</span>
                  </div>
                </div>
              </div>

              {/* Authorized Representative */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Authorized Representative</h4>
                <div className="bg-slate-50 p-4 rounded-xl text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Full Name &amp; Designation</span>
                    <strong className="text-slate-800">{selectedApp.rep_name}</strong>
                    <span className="text-slate-500 block text-[11px]">{selectedApp.rep_designation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Contact Coordinates</span>
                    <span className="text-slate-800 block">{selectedApp.rep_email}</span>
                    <span className="text-slate-600 block font-mono">{selectedApp.rep_phone}</span>
                  </div>
                </div>
              </div>

              {/* Supporting Documents */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Supporting Documents</h4>
                {(!selectedApp.supporting_documents || selectedApp.supporting_documents.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">No supporting documents attached.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedApp.supporting_documents.map((doc: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <div>
                            <span className="font-semibold text-slate-800 block">{doc.title}</span>
                            <span className="font-mono text-[11px] text-slate-500">{doc.file_name} • {doc.document_type}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                          Verified Format
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audit Trail */}
              {selectedApp.audit_history && selectedApp.audit_history.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    Decision Audit Log
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedApp.audit_history.map((log: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] flex items-center justify-between">
                        <div>
                          <strong className="text-slate-800 font-semibold">{log.action}</strong>
                          <p className="text-slate-500">{log.reason || "Action executed by admin"}</p>
                        </div>
                        <div className="text-right text-slate-400 text-[10px] font-mono">
                          <div>{log.admin_username}</div>
                          <div>{new Date(log.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons in Modal */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Current Status: <strong className="font-bold text-slate-800">{selectedApp.lifecycle_status}</strong>
                </span>

                <div className="flex items-center gap-2">
                  {["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFORMATION"].includes(selectedApp.lifecycle_status) && (
                    <>
                      <button
                        onClick={() => handleOpenActionModal("APPROVE", selectedApp)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20"
                      >
                        Approve Facility
                      </button>
                      <button
                        onClick={() => handleOpenActionModal("REQUEST_INFO", selectedApp)}
                        className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs"
                      >
                        Request Info
                      </button>
                      <button
                        onClick={() => handleOpenActionModal("REJECT", selectedApp)}
                        className="px-3 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMATION ACTION MODAL */}
        {actionModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  {actionModal.type === "APPROVE" && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {actionModal.type === "HOLD" && <AlertTriangle className="w-5 h-5 text-orange-600" />}
                  {actionModal.type === "REJECT" && <XCircle className="w-5 h-5 text-red-600" />}
                  {actionModal.type === "REQUEST_INFO" && <AlertTriangle className="w-5 h-5 text-orange-600" />}
                  {actionModal.type === "START_REVIEW" && <RefreshCw className="w-5 h-5 text-blue-600" />}
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {actionModal.type === "APPROVE" && "Confirm Organization Approval"}
                    {actionModal.type === "HOLD" && "Put Application On Hold"}
                    {actionModal.type === "REJECT" && "Confirm Application Rejection"}
                    {actionModal.type === "REQUEST_INFO" && "Request Additional Information"}
                    {actionModal.type === "START_REVIEW" && "Start Application Review"}
                  </h3>
                </div>
                <button
                  onClick={() => setActionModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed">
                You are performing an administrative decision for <strong>{actionModal.app.name}</strong> ({actionModal.app.application_ref}).
                {actionModal.type === "APPROVE" && (
                  <p className="mt-2 text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    <strong>Effect:</strong> Transitions organization to <strong>APPROVED</strong>, sets <code>is_active = TRUE</code>, provisions initial administrator user with 72h single-use activation invitation, and sends outbox notifications.
                  </p>
                )}
                {actionModal.type === "HOLD" && (
                  <p className="mt-2 text-orange-800 bg-orange-50 p-2.5 rounded-lg border border-orange-200">
                    <strong>Effect:</strong> Transitions organization to <strong>ON_HOLD</strong>. Applicant receives real-time email &amp; WhatsApp alerts with your remarks and can supply requested documents on the tracking portal.
                  </p>
                )}
                {actionModal.type === "REJECT" && (
                  <p className="mt-2 text-red-800 bg-red-50 p-2.5 rounded-lg border border-red-200">
                    <strong>Effect:</strong> Transitions organization to <strong>REJECTED</strong>. The applicant remains blocked from protected endpoints. Outbox alerts are sent.
                  </p>
                )}
              </div>

              <form onSubmit={handleExecuteAction} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {actionModal.type === "APPROVE" && "Approval Decision Notes (Logged to Audit Trail)"}
                    {actionModal.type === "HOLD" && "Mandatory Reason / Information Required *"}
                    {actionModal.type === "REJECT" && "Mandatory Rejection Reason *"}
                    {actionModal.type === "REQUEST_INFO" && "Information / Documents Needed *"}
                    {actionModal.type === "START_REVIEW" && "Review Notes"}
                  </label>
                  <textarea
                    rows={3}
                    required={actionModal.type === "REJECT" || actionModal.type === "REQUEST_INFO" || actionModal.type === "HOLD"}
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder="Enter audit notes or statutory rationale..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionModal(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingAction}
                    className={`px-5 py-2 rounded-xl text-white font-bold text-xs transition flex items-center gap-1.5 disabled:opacity-50 ${
                      actionModal.type === "APPROVE"
                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
                        : actionModal.type === "HOLD" || actionModal.type === "REQUEST_INFO"
                        ? "bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-500/20"
                        : actionModal.type === "REJECT"
                        ? "bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20"
                        : "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20"
                    }`}
                  >
                    {isSubmittingAction ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Confirm Decision
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
