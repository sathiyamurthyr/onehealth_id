"use client";

import React, { useState, useEffect } from "react";
import {
  LifeBuoy,
  PlusCircle,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  User,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Tag,
  RefreshCw,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { api, SupportTicket, PlatformHospital, PlatformClient } from "@/lib/api";

const PRIORITY_BADGES: Record<string, { badge: string; dot: string }> = {
  CRITICAL: { badge: "bg-rose-100 text-rose-800 border-rose-200 font-extrabold", dot: "bg-rose-500" },
  HIGH: { badge: "bg-amber-100 text-amber-800 border-amber-200 font-bold", dot: "bg-amber-500" },
  MEDIUM: { badge: "bg-blue-100 text-blue-800 border-blue-200", dot: "bg-blue-500" },
  LOW: { badge: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
};

const STATUS_BADGES: Record<string, { badge: string }> = {
  OPEN: { badge: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  IN_PROGRESS: { badge: "bg-blue-100 text-blue-800 border-blue-200" },
  WAITING_FOR_CLIENT: { badge: "bg-amber-100 text-amber-800 border-amber-200" },
  RESOLVED: { badge: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  CLOSED: { badge: "bg-slate-100 text-slate-700 border-slate-200" },
};

export default function SuperAdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [hospitals, setHospitals] = useState<PlatformHospital[]>([]);
  const [clients, setClients] = useState<PlatformClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    hospital_id: "",
    client_id: "",
    category: "BILLING",
    priority: "HIGH",
    subject: "",
    description: "",
    reported_by_name: "",
    reported_by_email: "",
    reported_by_phone: "",
  });

  // Resolve / Update Form State
  const [updateStatus, setUpdateStatus] = useState("RESOLVED");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("Sathus Escalation Team");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [ticketsRes, hospRes, clientRes] = await Promise.all([
        api.superAdmin.listSupportTickets({ limit: 100 }),
        api.superAdmin.listHospitals({ limit: 100 }),
        api.superAdmin.listClients({ limit: 100 }),
      ]);
      setTickets(ticketsRes);
      setHospitals(hospRes);
      setClients(clientRes);
    } catch (err: any) {
      console.error("Failed to load support data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.description) return;

    try {
      setSubmitting(true);
      setFeedback(null);
      await api.superAdmin.createSupportTicket({
        hospital_id: formData.hospital_id || undefined,
        client_id: formData.client_id || undefined,
        category: formData.category,
        priority: formData.priority,
        subject: formData.subject,
        description: formData.description,
        reported_by_name: formData.reported_by_name || "Platform Admin",
        reported_by_email: formData.reported_by_email || "support@sathus.com",
        reported_by_phone: formData.reported_by_phone || "+91 94440 12345",
      });

      setShowCreateModal(false);
      setFormData({
        hospital_id: "",
        client_id: "",
        category: "BILLING",
        priority: "HIGH",
        subject: "",
        description: "",
        reported_by_name: "",
        reported_by_email: "",
        reported_by_phone: "",
      });

      setFeedback({ type: "success", text: "Support ticket registered successfully with auto SLA assignment." });
      fetchInitialData();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.response?.data?.detail || "Failed to create ticket" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setSubmitting(true);
      setFeedback(null);
      await api.superAdmin.updateSupportTicket(selectedTicket.id, {
        status: updateStatus,
        resolution_notes: resolutionNotes,
        assigned_to: assignedTo,
      });

      setSelectedTicket(null);
      setFeedback({ type: "success", text: `Ticket #${selectedTicket.ticket_number} updated to ${updateStatus}.` });
      fetchInitialData();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.response?.data?.detail || "Failed to update ticket" });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.hospital_name && t.hospital_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.client_name && t.client_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    const matchesPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const openTicketsCount = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
  const criticalTicketsCount = tickets.filter((t) => t.priority === "CRITICAL" && t.status !== "CLOSED" && t.status !== "RESOLVED").length;
  const resolvedTicketsCount = tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length;

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 p-8 rounded-3xl text-white shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-200 border border-purple-400/30 rounded-full text-xs font-semibold">
              <LifeBuoy className="w-3.5 h-3.5 text-pink-400" />
              Sathus Multi-Tenant Support Desk
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Customer Support & Tickets</h1>
            <p className="text-purple-200 text-sm max-w-2xl">
              Centralized issue resolution hub for all onboarded hospitals, clients, and technical integrations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchInitialData()}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/20 transition backdrop-blur-md"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold px-5 py-3 rounded-2xl shadow-lg transition"
            >
              <PlusCircle className="w-5 h-5" />
              Log Support Ticket
            </button>
          </div>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-sm flex items-center justify-between transition-all ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-rose-50 text-rose-900 border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-xs font-semibold hover:underline opacity-80">
              Dismiss
            </button>
          </div>
        )}

        {/* Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Active / In Progress</p>
              <p className="text-2xl font-extrabold text-slate-900">{openTicketsCount}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center font-bold">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Critical Priority SLA</p>
              <p className="text-2xl font-extrabold text-rose-600">{criticalTicketsCount}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Resolved & Closed</p>
              <p className="text-2xl font-extrabold text-emerald-600">{resolvedTicketsCount}</p>
            </div>
          </div>
        </div>

        {/* Filter / Search toolbar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket #, subject, hospital..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_CLIENT">Waiting For Client</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mb-3"></div>
              <p className="text-sm text-slate-500">Loading support tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <LifeBuoy className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700">No support tickets found</p>
              <p className="text-xs text-slate-400 mt-1">All tenant requests are currently resolved or clear.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Ticket ID</th>
                    <th className="py-4 px-6">Subject & Facility</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6">Priority</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Assigned / SLA</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTickets.map((t) => {
                    const priorityStyle = PRIORITY_BADGES[t.priority] || PRIORITY_BADGES.MEDIUM;
                    const statusStyle = STATUS_BADGES[t.status] || STATUS_BADGES.OPEN;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition group">
                        <td className="py-4 px-6 font-mono font-bold text-xs text-purple-700">
                          #{t.ticket_number}
                        </td>
                        <td className="py-4 px-6 max-w-xs">
                          <p className="font-bold text-slate-900 line-clamp-1">{t.subject}</p>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t.hospital_name || t.client_name || "General Sathus Platform"}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full font-medium border border-slate-200">
                            <Tag className="w-3 h-3 text-slate-400" />
                            {t.category.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${priorityStyle.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusStyle.badge}`}>
                            {t.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-600">
                          <p className="font-medium text-slate-800">{t.assigned_to || "Unassigned"}</p>
                          <p className="text-[11px] text-slate-400">
                            {t.sla_due_at ? `SLA: ${new Date(t.sla_due_at).toLocaleDateString()}` : "Created: " + new Date(t.created_at).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => {
                              setSelectedTicket(t);
                              setUpdateStatus(t.status);
                              setResolutionNotes(t.resolution_notes || "");
                              setAssignedTo(t.assigned_to || "Sathus Escalation Team");
                            }}
                            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 font-semibold px-3 py-1.5 rounded-xl text-xs transition border border-slate-200"
                          >
                            Manage <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Ticket Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Log Support Ticket</h3>
                  <p className="text-xs text-slate-500">Record a tenant incident, configuration change, or integration task</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Target Facility</label>
                    <select
                      value={formData.hospital_id}
                      onChange={(e) => setFormData({ ...formData, hospital_id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">-- Optional / Platform Wide --</option>
                      {hospitals.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Target Client Group</label>
                    <select
                      value={formData.client_id}
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">-- Optional / Direct --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="BILLING">Billing & Invoices</option>
                      <option value="SUBSCRIPTION">Subscription & Plan</option>
                      <option value="LOGIN_PROBLEM">Login & Access</option>
                      <option value="HOSPITAL_CONFIGURATION">Facility Configuration</option>
                      <option value="INTEGRATION">Integration & ABDM</option>
                      <option value="API">API Gateway</option>
                      <option value="SECURITY">Security & Compliance</option>
                      <option value="FEATURE_REQUEST">Feature Request</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                    >
                      <option value="LOW">Low (SLA: 48 hours)</option>
                      <option value="MEDIUM">Medium (SLA: 24 hours)</option>
                      <option value="HIGH">High (SLA: 8 hours)</option>
                      <option value="CRITICAL">Critical (SLA: 2 hours)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="Brief summary of the issue or requirement"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Description *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe symptoms, error codes, steps to reproduce, or requested changes..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reporter Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Rajesh or Sathus Admin"
                      value={formData.reported_by_name}
                      onChange={(e) => setFormData({ ...formData, reported_by_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reporter Email</label>
                    <input
                      type="email"
                      placeholder="reporter@hospital.com"
                      value={formData.reported_by_email}
                      onChange={(e) => setFormData({ ...formData, reported_by_email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition disabled:opacity-50"
                  >
                    {submitting ? "Logging Ticket..." : "Submit Ticket"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Manage / Resolve Ticket Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-purple-700">
                      #{selectedTicket.ticket_number}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGES[selectedTicket.status]?.badge}`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedTicket.subject}</h3>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-6 space-y-2 text-xs">
                <p className="text-slate-500 font-medium">Issue Description:</p>
                <p className="text-slate-800 text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                <div className="pt-2 border-t border-slate-200 text-slate-500 flex items-center justify-between">
                  <span>Facility: <strong>{selectedTicket.hospital_name || "N/A"}</strong></span>
                  <span>Reported By: <strong>{selectedTicket.reported_by_name || "Admin"}</strong></span>
                </div>
              </div>

              <form onSubmit={handleUpdateTicket} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Update Status</label>
                    <select
                      value={updateStatus}
                      onChange={(e) => setUpdateStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="WAITING_FOR_CLIENT">Waiting For Client</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Admin</label>
                    <input
                      type="text"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Resolution Notes / Internal Remarks
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe the solution applied, configuration updated, or instructions provided to client..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Update Ticket"}
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
