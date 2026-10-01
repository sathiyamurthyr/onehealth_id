"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bed,
  Building2,
  User,
  Calendar,
  Stethoscope,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Activity
} from "lucide-react";
import { api } from "@/lib/api";
import { WardBed, IPDAdmission } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/FeedbackStates";

export default function IPDPage() {
  const [beds, setBeds] = useState<WardBed[]>([]);
  const [admissions, setAdmissions] = useState<IPDAdmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedWard, setSelectedWard] = useState<string>("ALL");

  const loadIPDData = async () => {
    setLoading(true);
    setError("");
    try {
      const [bedsData, admissionsData] = await Promise.all([
        api.clinical.wardsAndBeds(),
        api.clinical.ipdAdmissions().catch(() => []),
      ]);
      setBeds(bedsData);
      setAdmissions(admissionsData);
    } catch (err: any) {
      setError(err.message || "Failed to load inpatient ward and bed roster");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIPDData();
  }, []);

  const uniqueWards = Array.from(new Set(beds.map((b) => b.ward_name).filter(Boolean)));

  const filteredBeds = beds.filter((b) => {
    return selectedWard === "ALL" || b.ward_name === selectedWard;
  });

  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.status === "OCCUPIED").length;
  const vacantBeds = beds.filter((b) => b.status === "AVAILABLE" || b.status === "VACANT").length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Inpatient Department (IPD)
              </h1>
              <Badge variant="primary" className="text-xs">
                Bed & Ward Allocation
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Live ward occupancy, ICU telemetry beds, and patient admission tracker
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">
              Hospital Capacity: <strong className="text-slate-700 dark:text-slate-200">{occupiedBeds}/{totalBeds} Occupied</strong>
            </span>
          </div>
        </div>

        {/* Occupancy Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Beds</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{totalBeds}</span>
            <span className="text-[10px] text-slate-500 mt-1 block">Sanctioned capacity</span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] text-rose-500 uppercase font-bold block">Occupied</span>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">{occupiedBeds}</span>
            <span className="text-[10px] text-slate-500 mt-1 block">Under active care</span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] text-emerald-500 uppercase font-bold block">Available Vacant</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{vacantBeds}</span>
            <span className="text-[10px] text-slate-500 mt-1 block">Ready for admission</span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] text-blue-500 uppercase font-bold block">Occupancy Rate</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">{occupancyRate}%</span>
            <span className="text-[10px] text-slate-500 mt-1 block">Standard threshold: 85%</span>
          </div>
        </div>

        {/* Ward Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedWard("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[44px] ${
              selectedWard === "ALL"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
            }`}
          >
            All Wards ({beds.length})
          </button>
          {uniqueWards.map((w) => (
            <button
              key={w}
              onClick={() => setSelectedWard(w)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[44px] ${
                selectedWard === w
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              {w}
            </button>
          ))}
        </div>

        {/* Content Area */}
        {loading ? (
          <LoadingState message="Scanning ward bed telemetry..." />
        ) : error ? (
          <ErrorState
            title="Failed to Load IPD Roster"
            message={error}
            onRetry={loadIPDData}
          />
        ) : filteredBeds.length === 0 ? (
          <EmptyState
            title="No Beds Found in Ward"
            message="No beds configured for the selected ward filter."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBeds.map((bed) => {
              const isOccupied = bed.status === "OCCUPIED";
              return (
                <Card
                  key={bed.id}
                  className={`overflow-hidden transition-all ${
                    isOccupied
                      ? "border-rose-200/80 dark:border-rose-900/40 bg-gradient-to-br from-white to-rose-50/20 dark:from-slate-900 dark:to-slate-900"
                      : "border-emerald-200/80 dark:border-emerald-900/40 bg-gradient-to-br from-white to-emerald-50/20 dark:from-slate-900 dark:to-slate-900"
                  }`}
                >
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isOccupied
                              ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
                              : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          <Bed className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold">
                            Bed {bed.bed_number}
                          </CardTitle>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {bed.ward_name} ({bed.bed_type})
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={isOccupied ? "danger" : "success"}
                        className="text-[10px] font-bold"
                      >
                        {isOccupied ? "OCCUPIED" : "VACANT"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-3 text-xs">
                    {isOccupied ? (
                      <div className="space-y-2">
                        <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-rose-100 dark:border-rose-950/60 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Admitted Patient
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm block">
                            {bed.patient_name || "Confidential Record"}
                          </span>
                          {bed.admission_date && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              Admitted: {new Date(bed.admission_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                          <span>Attending: <strong>Dr. {bed.doctor_name || "On Duty"}</strong></span>
                          <span>Daily: <strong>₹{bed.daily_rate}</strong></span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center space-y-2">
                        <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Sanitized & Ready for Admission</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Daily tariff rate: ₹{(bed.daily_rate ?? bed.daily_charge ?? 0).toLocaleString("en-IN")}/day
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
