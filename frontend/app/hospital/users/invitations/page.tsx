"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Mail,
  ArrowLeft,
  UserPlus,
  Send,
  XCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  Building2,
  AlertTriangle
} from "lucide-react";
import { api } from "@/lib/api";
import { StaffInvitation } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function HospitalInvitationsPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("oh_workspace") || "{}").hospital_ref_id : "") || "";

  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadInvitations = async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await api.hospital.getStaffInvitations(activeHospitalId);
      if (res?.invitations) setInvitations(res.invitations);
    } catch (err) {
      console.error("Failed to load staff invitations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInvitations(false);
  }, [activeHospitalId]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleResend = async (id: string, name: string) => {
    try {
      await api.hospital.resendInvitation(id, activeHospitalId);
      showToast(`Invitation re-dispatched to ${name}`);
      loadInvitations(true);
    } catch (err: any) {
      alert(err?.message || "Failed to resend invitation");
    }
  };

  const handleCancel = async (id: string, name: string) => {
    try {
      await api.hospital.cancelInvitation(id, activeHospitalId);
      showToast(`Invitation for ${name} cancelled`);
      loadInvitations(true);
    } catch (err: any) {
      alert(err?.message || "Failed to cancel invitation");
    }
  };

  return (
    <WorkspaceLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
        {toastMsg && (
          <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-xl border border-slate-800 animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">{toastMsg}</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/hospital/users"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  Administration &rarr; Users & Access &rarr; Invitations
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Pending Staff Invitations
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadInvitations(false)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            </button>
            <Link
              href="/hospital/users/create"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              Invite New Staff
            </Link>
          </div>
        </div>

        {/* Invitations List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              <p className="text-sm">Loading pending invitations...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <Mail className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Pending Invitations</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                All invited staff accounts have been activated or no pending invitations exist.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-slate-900">{inv.full_name}</h4>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                        {inv.role_code}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Pending Acceptance
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{inv.email}</span>
                      <span>&bull;</span>
                      <span>{inv.mobile}</span>
                      <span>&bull;</span>
                      <span>Expires: {new Date(inv.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResend(inv.id, inv.full_name)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
                    >
                      <Send className="w-3.5 h-3.5 text-blue-600" />
                      Resend Invite
                    </button>
                    <button
                      onClick={() => handleCancel(inv.id, inv.full_name)}
                      className="px-3.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
