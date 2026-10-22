"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Stethoscope,
  HeartPulse,
  Clock,
  Sparkles,
  Layers,
  Users
} from "lucide-react";
import { api } from "@/lib/api";
import { HospitalRoleOption } from "@/lib/types";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function HospitalRolesCatalogPage() {
  const [roles, setRoles] = useState<HospitalRoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const loadRoles = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res: any = await api.hospital.getRolesCatalog();
      const list = Array.isArray(res) ? res : (res?.roles || res?.items || []);
      setRoles(list);
    } catch (err) {
      console.error("Failed to load roles catalog:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRoles(true);
  }, []);

  const categories = ["ALL", "CLINICAL", "DIAGNOSTIC", "OPERATIONAL", "ADMINISTRATIVE", "SUPPORT"];

  const filteredRoles = roles.filter((r) => {
    const matchesCategory =
      selectedCategory === "ALL" ||
      (r.category || "").toUpperCase() === selectedCategory;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (r.title || "").toLowerCase().includes(q) ||
      (r.code || "").toLowerCase().includes(q) ||
      (r.description || "").toLowerCase().includes(q) ||
      (r.default_permissions || []).some((p) => p.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadgeClass = (category?: string) => {
    const cat = (category || "").toUpperCase();
    if (cat === "CLINICAL") return "bg-blue-50 text-blue-700 border-blue-200";
    if (cat === "DIAGNOSTIC") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (cat === "ADMINISTRATIVE") return "bg-purple-50 text-purple-700 border-purple-200";
    if (cat === "OPERATIONAL") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <WorkspaceLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/hospital/users"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
              title="Back to Users"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  Administration &rarr; Users & Access &rarr; Roles
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                  {roles.length} Roles Defined
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Roles & Permissions Catalog
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadRoles(false)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
              title="Refresh Catalog"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            </button>
            <Link
              href="/hospital/users"
              className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              Manage Staff Users
            </Link>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roles by title, code, description, or permission..."
                className="w-full pl-9.5 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none transition"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => {
              const count = cat === "ALL" ? roles.length : roles.filter((r) => (r.category || "").toUpperCase() === cat).length;
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  <span>{cat === "ALL" ? "All Categories" : cat.charAt(0) + cat.slice(1).toLowerCase()}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    active ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-600"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Roles Grid */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="text-sm font-medium">Loading hospital role catalog...</p>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="p-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Roles Matching Query</h3>
            <p className="text-sm text-slate-500">
              No defined roles matched category &ldquo;{selectedCategory}&rdquo; with search &ldquo;{search}&rdquo;.
            </p>
            {(search || selectedCategory !== "ALL") && (
              <button
                onClick={() => { setSearch(""); setSelectedCategory("ALL"); }}
                className="mt-2 text-xs font-bold text-blue-600 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRoles.map((r) => {
              const perms = r.default_permissions || [];
              const categoryBadge = getCategoryBadgeClass(r.category);

              return (
                <div
                  key={r.code}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900">{r.title || r.code}</h3>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                            {r.code}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.description}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase shrink-0 ${categoryBadge}`}>
                        {r.category || "OPERATIONAL"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Default Permissions ({perms.length})
                      </span>
                    </div>
                    {perms.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">No static permissions assigned</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {perms.map((p) => (
                          <span
                            key={p}
                            className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
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
