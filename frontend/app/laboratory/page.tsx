"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FlaskConical,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  FileText,
  User,
  Building2,
  Calendar,
  ChevronRight
} from "lucide-react";
import { api } from "@/lib/api";
import { LabOrder } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/FeedbackStates";

export default function LaboratoryPage() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadLabOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.clinical.labOrders();
      setOrders(data);
    } catch (err: any) {
      setError(err.message || "Failed to load laboratory orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLabOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    const matchesSearch =
      !search ||
      o.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.test_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.test_code?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Diagnostic Laboratory (LIS)
              </h1>
              <Badge variant="primary" className="text-xs">
                Specimen & Results
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Pathology test orders, sample barcodes, diagnostic ranges, and abnormal result flagging
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">
              Active Orders: <strong className="text-slate-700 dark:text-slate-200">{orders.length} tests</strong>
            </span>
          </div>
        </div>

        {/* Filter and Search */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by test name, patient, code (e.g. CBC, HBA1C)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {["ALL", "ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "COMPLETED", "VERIFIED"].map(
              (st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all min-h-[40px] ${
                    statusFilter === st
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {st}
                </button>
              )
            )}
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <LoadingState message="Querying laboratory specimen database..." />
        ) : error ? (
          <ErrorState
            title="Failed to Load Lab Tests"
            message={error}
            onRetry={loadLabOrders}
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            title="No Lab Orders Found"
            message="No laboratory investigations match the selected filter criteria."
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-4 px-6">Test Code & Description</th>
                    <th className="py-4 px-6">Patient Name</th>
                    <th className="py-4 px-6">Specimen Type</th>
                    <th className="py-4 px-6">Observed Result</th>
                    <th className="py-4 px-6">Standard Reference</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOrders.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <FlaskConical className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="font-bold text-slate-900 dark:text-white">
                            {o.test_name}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono pl-6">
                          Code: {o.test_code}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <Link
                          href={`/patients/${o.patient_id}`}
                          className="font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 block"
                        >
                          {o.patient_name}
                        </Link>
                      </td>

                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          {o.specimen_type || "Venous Blood"}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        {o.result_value ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-mono font-bold text-sm ${
                                o.is_abnormal ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {o.result_value}
                            </span>
                            {o.is_abnormal && (
                              <Badge variant="danger" className="text-[9px] px-1 py-0">
                                ABNORMAL
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Processing in Lab...</span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-mono text-slate-500 text-[11px]">
                          {o.normal_range || "N/A"}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <Badge
                          variant={
                            o.status === "COMPLETED" || o.status === "VERIFIED"
                              ? "success"
                              : o.status === "PROCESSING"
                              ? "primary"
                              : "warning"
                          }
                          className="text-[10px]"
                        >
                          {o.status}
                        </Badge>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <Link href={`/patients/${o.patient_id}`}>
                          <Button variant="outline" size="sm" className="text-[11px] h-8 px-2.5">
                            Report View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-3">
              {filteredOrders.map((o) => (
                <div
                  key={o.id}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {o.test_name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Patient: <strong>{o.patient_name}</strong> • Specimen: {o.specimen_type || "Blood"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        o.status === "COMPLETED" || o.status === "VERIFIED"
                          ? "success"
                          : o.status === "PROCESSING"
                          ? "primary"
                          : "warning"
                      }
                      className="text-[10px]"
                    >
                      {o.status}
                    </Badge>
                  </div>

                  {/* Result & Range */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Result</span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          o.is_abnormal ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"
                        }`}
                      >
                        {o.result_value || "In Analysis"}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Reference</span>
                      <span className="font-mono text-slate-600 dark:text-slate-400 text-xs">
                        {o.normal_range || "Standard"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <Link href={`/patients/${o.patient_id}`} className="w-full">
                      <Button variant="outline" size="md" className="w-full text-xs justify-center min-h-[44px]">
                        Open Patient Health File
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
