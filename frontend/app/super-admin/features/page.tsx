"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders,
  Building2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  ShieldAlert,
  Sparkles,
  Zap,
  Activity,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { api, FeatureEntitlement, PlatformHospital } from "@/lib/api";
import Link from "next/link";

const CATEGORY_COLORS: Record<string, { badge: string; border: string }> = {
  CORE: { badge: "bg-blue-100 text-blue-800 border-blue-200", border: "border-blue-200" },
  CLINICAL: { badge: "bg-emerald-100 text-emerald-800 border-emerald-200", border: "border-emerald-200" },
  ADMINISTRATIVE: { badge: "bg-amber-100 text-amber-800 border-amber-200", border: "border-amber-200" },
  ADVANCED: { badge: "bg-purple-100 text-purple-800 border-purple-200", border: "border-purple-200" },
  COMPLIANCE: { badge: "bg-rose-100 text-rose-800 border-rose-200", border: "border-rose-200" },
};

export default function SuperAdminFeaturesPage() {
  const [hospitals, setHospitals] = useState<PlatformHospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("");
  const [features, setFeatures] = useState<FeatureEntitlement[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoadingHospitals(true);
      const res = await api.superAdmin.listHospitals({ limit: 100 });
      setHospitals(res);
      if (res.length > 0) {
        setSelectedHospitalId(res[0].id);
        fetchFeatures(res[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load hospitals", err);
    } finally {
      setLoadingHospitals(false);
    }
  };

  const fetchFeatures = async (hId: string) => {
    try {
      setLoadingFeatures(true);
      const res = await api.superAdmin.getFeatures(hId);
      setFeatures(res);
    } catch (err: any) {
      console.error("Failed to load features", err);
    } finally {
      setLoadingFeatures(false);
    }
  };

  const handleHospitalChange = (hId: string) => {
    setSelectedHospitalId(hId);
    fetchFeatures(hId);
  };

  const toggleFeature = async (featureKey: string, currentEnabled: boolean) => {
    if (!selectedHospitalId) return;
    try {
      setUpdatingKey(featureKey);
      setStatusMessage(null);
      await api.superAdmin.updateFeature(selectedHospitalId, {
        feature_key: featureKey,
        is_enabled: !currentEnabled,
      });

      setFeatures((prev) =>
        prev.map((f) => (f.feature_key === featureKey ? { ...f, is_enabled: !currentEnabled } : f))
      );

      setStatusMessage({
        type: "success",
        text: `Feature "${featureKey}" successfully ${!currentEnabled ? "enabled" : "disabled"}. Backend entitlement enforced.`,
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.response?.data?.detail || "Failed to update feature entitlement",
      });
    } finally {
      setUpdatingKey(null);
    }
  };

  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId);

  const filteredFeatures = features.filter((f) => {
    const matchesSearch =
      f.feature_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.feature_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "ALL" || f.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ["ALL", "CORE", "CLINICAL", "ADMINISTRATIVE", "ADVANCED", "COMPLIANCE"];

  const enabledCount = features.filter((f) => f.is_enabled).length;
  const disabledCount = features.filter((f) => !f.is_enabled).length;

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-8 rounded-3xl text-white shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-200 border border-purple-400/30 rounded-full text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              SaaS Feature Entitlement Engine
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Hospital Feature Matrix</h1>
            <p className="text-purple-200 text-sm max-w-2xl">
              Configure and enforce real-time feature gating per hospital facility. Gated features are restricted at both API middleware and UI navigation levels.
            </p>
          </div>

          {/* Quick Hospital Selector */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 min-w-[280px]">
            <label className="text-xs font-medium text-purple-200 block mb-1">Select Facility</label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-3 text-purple-300 pointer-events-none" />
              <select
                value={selectedHospitalId}
                onChange={(e) => handleHospitalChange(e.target.value)}
                className="w-full bg-slate-900/80 text-white pl-9 pr-4 py-2 rounded-xl text-sm border border-purple-400/30 focus:outline-none focus:ring-2 focus:ring-purple-400 appearance-none cursor-pointer"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.city || "Tamil Nadu"}) - [{h.lifecycle_status}]
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Status feedback toast */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl border text-sm flex items-center justify-between transition-all ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-rose-50 text-rose-900 border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs font-semibold hover:underline opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hospital Snapshot Card */}
        {selectedHospital && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-50 text-purple-700 rounded-2xl flex items-center justify-center font-bold text-xl border border-purple-100 shadow-sm">
                {selectedHospital.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{selectedHospital.name}</h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      selectedHospital.lifecycle_status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {selectedHospital.lifecycle_status}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  Plan: <span className="font-semibold text-slate-800">{selectedHospital.plan_name || "Enterprise Tier"}</span> • Client Group:{" "}
                  <span className="font-semibold text-slate-800">{selectedHospital.client_name || "Direct Sathus Tenant"}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
              <div className="text-center px-4">
                <p className="text-xs text-slate-500">Enabled Features</p>
                <p className="text-2xl font-extrabold text-emerald-600">{enabledCount}</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center px-4">
                <p className="text-xs text-slate-500">Locked / Disabled</p>
                <p className="text-2xl font-extrabold text-slate-400">{disabledCount}</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <Link
                href={`/super-admin/hospitals/${selectedHospital.id}`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-purple-600 hover:text-purple-800 bg-purple-50 px-4 py-2.5 rounded-xl transition"
              >
                View 360° Profile <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Filters & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search feature by name or key..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    categoryFilter === cat
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        {loadingFeatures ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mb-3"></div>
            <p className="text-sm text-slate-500">Querying live entitlements for facility...</p>
          </div>
        ) : filteredFeatures.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500">
            <Layers className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">No feature entitlements found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredFeatures.map((feat) => {
              const catStyle = CATEGORY_COLORS[feat.category] || {
                badge: "bg-slate-100 text-slate-700 border-slate-200",
                border: "border-slate-200",
              };
              const isUpdating = updatingKey === feat.feature_key;

              return (
                <div
                  key={feat.feature_key}
                  className={`bg-white border rounded-3xl p-6 shadow-sm transition-all relative overflow-hidden flex flex-col justify-between ${
                    feat.is_enabled ? "border-slate-200 hover:shadow-md" : "border-slate-200/60 bg-slate-50/50 opacity-90"
                  }`}
                >
                  {/* Top Bar */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${catStyle.badge}`}>
                        {feat.category}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        {feat.feature_key}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base mb-1.5 flex items-center gap-2">
                      {feat.feature_name}
                      {feat.category === "ADVANCED" && (
                        <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      {feat.notes || `Provides access to ${feat.feature_name.toLowerCase()} workflows and API endpoints.`}
                    </p>
                  </div>

                  {/* Toggle Controls */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {feat.is_enabled ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Enabled
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                          <XCircle className="w-4 h-4 text-slate-400" />
                          Disabled
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => toggleFeature(feat.feature_key, feat.is_enabled)}
                      disabled={isUpdating}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        feat.is_enabled
                          ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                          : "bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
                      } disabled:opacity-50`}
                    >
                      {isUpdating ? (
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : feat.is_enabled ? (
                        "Revoke Access"
                      ) : (
                        "Grant Access"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Information box */}
        <div className="bg-slate-900 text-slate-300 rounded-3xl p-6 border border-slate-800 text-xs flex items-start gap-4 shadow-lg">
          <Info className="w-6 h-6 text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-white text-sm">Security & Entitlement Enforcement</h4>
            <p className="leading-relaxed text-slate-400">
              When a feature is disabled for a hospital, all corresponding REST endpoints return HTTP 403 Forbidden with payload
              <code className="text-purple-300 bg-slate-800 px-1.5 py-0.5 rounded mx-1">FEATURE_NOT_ENTITLED</code>.
              Hospital Admin and Staff workspaces will automatically hide related navigational routes.
            </p>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
