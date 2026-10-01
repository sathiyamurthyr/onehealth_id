"use client";

import React, { useState, useEffect } from "react";
import {
  UserPlus,
  Search,
  CalendarCheck,
  ListOrdered,
  QrCode,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
  Sparkles,
  Ticket,
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { DynamicDashboard } from "@/components/workspace/DynamicDashboard";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EmployeeWorkspacePage() {
  const { workspace, user } = useWorkspace();
  const router = useRouter();

  // Search Patient State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Quick Token Generation State
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [tokenResult, setTokenResult] = useState<any | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      setSearching(true);
      const results = await api.patients.search(searchQuery.trim());
      setSearchResults(results || []);
    } catch (err) {
      console.error("Patient search failed", err);
    } finally {
      setSearching(false);
    }
  };

  const handleIssueToken = async (patient: any) => {
    try {
      setGeneratingToken(true);
      const res = await api.queue.issueToken({
        patient_id: patient.id,
        hospital_id: workspace?.hospital_ref_id,
        department_name: "General Medicine",
      });
      setTokenResult(res);
    } catch (err: any) {
      alert(err.message || "Failed to issue token");
    } finally {
      setGeneratingToken(false);
    }
  };

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["EMPLOYEE", "HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Dynamic Header & Registration Metrics */}
        <DynamicDashboard
          title={`Frontdesk Operations — ${user?.name || "Reception"}`}
          subtitle={`Citizen Enrollment & Outpatient Reception at ${workspace?.hospital_name || "Kedar Hospital"} • OneHealth ID issuance, appointment check-in, and OPD tokens.`}
        />

        {/* Quick Action Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/patients/register"
            className="bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-5 transition group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                <UserPlus className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Enroll New Citizen</h4>
              <p className="text-xs text-slate-400">Issue fresh OneHealth ID & cryptographically signed QR card.</p>
            </div>
          </Link>

          <Link
            href="/appointments"
            className="bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 transition group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Book Appointment</h4>
              <p className="text-xs text-slate-400">Schedule specialist doctor slots and send SMS confirmations.</p>
            </div>
          </Link>

          <Link
            href="/queue"
            className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 transition group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <ListOrdered className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Live Queue Board</h4>
              <p className="text-xs text-slate-400">View real-time token progression and patient wait times.</p>
            </div>
          </Link>

          <Link
            href="/patients"
            className="bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-5 transition group space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                <QrCode className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Verify Patient QR</h4>
              <p className="text-xs text-slate-400">Zero-knowledge scan to instantly pull patient demographic record.</p>
            </div>
          </Link>
        </div>

        {/* Quick Patient Lookup & Token Issuance Station */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-amber-400" />
                Rapid Patient Lookup & OPD Check-In
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Search by OneHealth ID (e.g. OH-XXXX), mobile number, or citizen name to issue instant OPD token.
              </p>
            </div>
          </div>

          {tokenResult && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-black text-xl">
                  {tokenResult.token_number}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">OPD Token Issued Successfully!</h4>
                  <p className="text-xs text-slate-300">
                    Patient routed to General Medicine OPD Queue at {workspace?.hospital_name}.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTokenResult(null)}
                className="text-xs"
              >
                Dismiss
              </Button>
            </div>
          )}

          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by OneHealth ID (OH-...), Mobile number, or Name..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={searching}
              className="bg-amber-600 hover:bg-amber-500 text-white shrink-0 text-xs font-semibold px-5"
            >
              {searching ? "Searching..." : "Lookup Citizen"}
            </Button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">OneHealth ID</th>
                    <th className="py-2.5 px-4">Citizen Name</th>
                    <th className="py-2.5 px-4">Gender / Age</th>
                    <th className="py-2.5 px-4">Mobile</th>
                    <th className="py-2.5 px-4 text-right">Instant Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {searchResults.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">
                        {p.onehealth_id || p.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {p.gender || "U"} • {p.age || 35} yrs
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {p.phone || p.mobile || "9876543210"}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleIssueToken(p)}
                          disabled={generatingToken}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition inline-flex items-center gap-1 shadow-sm"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          Issue OPD Token
                        </button>
                        <Link
                          href={`/patients/${p.id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition inline-flex items-center"
                        >
                          View File
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
