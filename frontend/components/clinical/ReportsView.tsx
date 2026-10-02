"use client";

import React, { useState } from "react";
import {
  FileText,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  Filter,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { ReportsSummary, LabOrder } from "@/lib/types";

interface ReportsViewProps {
  reportsSummary: ReportsSummary;
}

export function ReportsView({ reportsSummary }: ReportsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const categories = ["ALL", "Biochemistry", "Hematology", "Cardiology", "Pathology"];

  const filteredOrders = (reportsSummary.orders || []).filter((ord) => {
    if (selectedCategory === "ALL") return true;
    return ord.test_category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  const trends = reportsSummary.trends || {};

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-6">
      {/* Header */}
      <div className="bg-slate-50/70 border-b border-slate-200/80 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-600" />
            <span>Unified Diagnostic Reports & Multi-Period Longitudinal Trends</span>
          </h3>
          <p className="text-[11px] text-slate-500">
            Integrated Pathology, Biochemistry, Radiology & Cardiology records with abnormal indicators and temporal trendlines.
          </p>
        </div>

        {/* Filter categories */}
        <div className="flex items-center gap-1.5 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                selectedCategory === cat
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Trend Comparison Cards (Point 8: Previous -> Current comparison) */}
        {Object.keys(trends).length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Temporal Lab Trend Comparison (Previous ──► Current)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(trends).map(([testName, points]) => {
                const latest = points[points.length - 1];
                const previous = points.length > 1 ? points[points.length - 2] : null;
                const isImproved = previous ? parseFloat(latest.value) < parseFloat(previous.value) : false;

                return (
                  <div
                    key={testName}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-purple-200 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 truncate" title={testName}>
                        {testName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Ref: {latest.reference_range || "Normal"}
                      </span>
                    </div>

                    {/* Readings Progression */}
                    <div className="flex items-center justify-between border-y border-slate-200/70 py-2">
                      {points.map((pt, pIdx) => (
                        <div key={pIdx} className="text-center">
                          <span className="text-[10px] text-slate-400 block">{pt.date}</span>
                          <span
                            className={`text-xs font-bold ${
                              pt.is_abnormal ? "text-rose-600" : "text-slate-800"
                            }`}
                          >
                            {pt.value} {pt.unit}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Trend Status */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Current status:</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                          latest.is_abnormal
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {latest.is_abnormal ? "Abnormal / Flagged" : "Within Reference Range"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Reports List Table */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-purple-600" />
            Verified Diagnostic Reports ({filteredOrders.length})
          </h4>

          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
              No diagnostic reports available in this category.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Report Date</th>
                    <th className="py-3 px-3">Test Code & Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Result Value</th>
                    <th className="py-3 px-3">Reference Range</th>
                    <th className="py-3 px-3">Verified By</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((ord, idx) => (
                    <tr key={ord.id || idx} className="hover:bg-purple-50/20 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {ord.ordered_at ? new Date(ord.ordered_at).toLocaleDateString() : "2026-09-17"}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{ord.test_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{ord.test_code}</span>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        {ord.test_category || "Biochemistry"}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${ord.is_abnormal ? "text-rose-600" : "text-slate-900"}`}>
                            {ord.result_value || "Pending"} {ord.result_unit || ""}
                          </span>
                          {ord.is_abnormal && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                              HIGH
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {ord.normal_range || "Normal"}
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        {ord.doctor_name || "Dr. Pathologist"}
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
