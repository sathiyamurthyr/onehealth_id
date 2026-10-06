"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  RefreshCw,
  Activity,
  Bed,
  Siren,
  HeartPulse,
  Scissors,
  Pill,
  FlaskConical,
  Scan,
  Droplet,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { api } from "@/lib/api";

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await api.hospital.getFacilities("hosp-kedar");
      setFacilities(list || []);
    } catch (err: any) {
      console.error("Failed to load facilities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getFacilityIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case "EMERGENCY":
        return <Siren className="w-5 h-5 text-rose-600" />;
      case "ICU":
        return <HeartPulse className="w-5 h-5 text-rose-600" />;
      case "OT":
        return <Scissors className="w-5 h-5 text-indigo-600" />;
      case "IPD":
        return <Bed className="w-5 h-5 text-blue-600" />;
      case "PHARMACY":
        return <Pill className="w-5 h-5 text-emerald-600" />;
      case "LABORATORY":
        return <FlaskConical className="w-5 h-5 text-purple-600" />;
      case "RADIOLOGY":
        return <Scan className="w-5 h-5 text-sky-600" />;
      case "BLOOD_BANK":
        return <Droplet className="w-5 h-5 text-red-600" />;
      case "AMBULANCE":
        return <Truck className="w-5 h-5 text-amber-600" />;
      default:
        return <Building2 className="w-5 h-5 text-slate-600" />;
    }
  };

  const filteredFacilities = facilities.filter((f) => {
    const matchesSearch =
      (f.facility_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.facility_type || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "ALL" || f.facility_type === selectedType;
    return matchesSearch && matchesType;
  });

  const operationalCount = facilities.filter((f) => f.status === "OPERATIONAL" || f.status === "ACTIVE").length;

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN"]}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/hospital"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hospital Operations
          </Link>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Header with Stats */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-blue-400/20">
                <Building2 className="w-3.5 h-3.5" /> Physical Hospital Infrastructure
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Hospital Facilities & Units</h1>
              <p className="text-blue-100/80 text-sm max-w-xl">
                Real-time operational readiness across Emergency Trauma, Intensive Care Units (ICU), Operating Theatres, Diagnostic Laboratories, and Inpatient Wards.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
              <div className="px-3">
                <div className="text-2xl font-bold">{facilities.length}</div>
                <div className="text-[11px] font-medium text-blue-200">Total Facilities</div>
              </div>
              <div className="px-3 border-x border-white/10">
                <div className="text-2xl font-bold text-emerald-300">{operationalCount}</div>
                <div className="text-[11px] font-medium text-blue-200">100% Operational</div>
              </div>
              <div className="px-3">
                <div className="text-2xl font-bold text-teal-300">24 / 7</div>
                <div className="text-[11px] font-medium text-blue-200">Emergency Readiness</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by facility name, floor location, or facility type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Facility Types</option>
              <option value="OPD">OPD Clinics</option>
              <option value="IPD">Inpatient Wards (IPD)</option>
              <option value="EMERGENCY">Emergency & Trauma</option>
              <option value="ICU">Intensive Care Units (ICU)</option>
              <option value="OT">Operating Theatres (OT)</option>
              <option value="LABORATORY">Diagnostic Laboratory</option>
              <option value="RADIOLOGY">Radiology & Imaging</option>
              <option value="PHARMACY">Pharmacy Dispensary</option>
              <option value="BLOOD_BANK">Blood Bank</option>
              <option value="AMBULANCE">Ambulance Services</option>
            </select>
          </div>
        </div>

        {/* Facilities Grid */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading hospital facilities directory...</p>
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Facilities Match</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">No hospital facilities match your filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredFacilities.map((facility) => {
              const isOperational = facility.status === "OPERATIONAL" || facility.status === "ACTIVE";
              return (
                <div
                  key={facility.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                        {getFacilityIcon(facility.facility_type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">{facility.facility_name}</h3>
                        <span className="inline-block text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                          {facility.facility_type}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isOperational ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isOperational ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                      {facility.status}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> Location:
                      </span>
                      <span className="font-semibold text-slate-800">{facility.location || "Ground Floor"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> Operating Hours:
                      </span>
                      <span className="font-semibold text-slate-800">{facility.operating_hours || "24/7 Service"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> Ext / Hotline:
                      </span>
                      <span className="font-mono font-semibold text-slate-800">{facility.contact_ext || "Ext 101"}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" /> NABH Safety Verified
                    </span>
                    <span className="text-[11px]">Branch: Mugalivakkam</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
