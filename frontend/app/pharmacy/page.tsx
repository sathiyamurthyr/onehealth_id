"use client";

import React, { useState, useEffect } from "react";
import {
  Pill,
  AlertTriangle,
  CheckCircle2,
  Package,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Building2,
  RefreshCw,
  PlusCircle
} from "lucide-react";
import { api } from "@/lib/api";
import { PharmacyItem } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui/Card";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/FeedbackStates";

export default function PharmacyPage() {
  const [medicines, setMedicines] = useState<PharmacyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadPharmacy = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.clinical.pharmacyDispensary();
      setMedicines(data);
    } catch (err: any) {
      setError(err.message || "Failed to load pharmacy inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPharmacy();
  }, []);

  const filteredMedicines = medicines.filter((m) => {
    return (
      !search ||
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.generic_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.manufacturer?.toLowerCase().includes(search.toLowerCase()) ||
      m.batch_number?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const lowStockCount = medicines.filter((m) => (m.stock_quantity ?? 0) < 50).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Pharmacy & Dispensary
              </h1>
              <Badge variant="primary" className="text-xs">
                Drug Formulary
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Hospital pharmacy inventory, batch expiration tracking, and prescription dispensing
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lowStockCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{lowStockCount} Low Stock Items</span>
              </span>
            )}
            <Button
              variant="outline"
              size="md"
              onClick={loadPharmacy}
              className="gap-2 text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Stock</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by brand name, generic salt, batch number or manufacturer..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            />
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <LoadingState message="Loading hospital pharmaceutical inventory..." />
        ) : error ? (
          <ErrorState
            title="Failed to Load Inventory"
            message={error}
            onRetry={loadPharmacy}
          />
        ) : filteredMedicines.length === 0 ? (
          <EmptyState
            title="No Medications Found"
            message="No pharmaceutical formulary items match the search query."
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-4 px-6">Medication Name</th>
                    <th className="py-4 px-6">Generic Salt Formula</th>
                    <th className="py-4 px-6">Batch & Expiry</th>
                    <th className="py-4 px-6">Manufacturer</th>
                    <th className="py-4 px-6">Unit Price</th>
                    <th className="py-4 px-6">Available Stock</th>
                    <th className="py-4 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMedicines.map((m, idx) => {
                    const isLowStock = (m.stock_quantity ?? 0) < 50;
                    return (
                      <tr
                        key={m.id || idx}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                              <Pill className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {m.name || m.medicine_name}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            {m.generic_name || "Standard Formula"}
                          </span>
                        </td>

                        <td className="py-4 px-6">
                          <div className="font-mono text-slate-700 dark:text-slate-300">
                            {m.batch_number || "BATCH-01"}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Exp: {m.expiry_date ? new Date(m.expiry_date).toLocaleDateString() : "2027-12-31"}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <span className="text-slate-600 dark:text-slate-400">
                            {m.manufacturer || "Generic Pharma"}
                          </span>
                        </td>

                        <td className="py-4 px-6">
                          <span className="font-bold text-slate-900 dark:text-white font-mono">
                            ₹{(m.unit_price ?? 0).toFixed(2)}
                          </span>
                        </td>

                        <td className="py-4 px-6">
                          <span
                            className={`font-mono font-bold ${
                              isLowStock ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {m.stock_quantity ?? 0} units
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <Badge
                            variant={isLowStock ? "warning" : "success"}
                            className="text-[10px]"
                          >
                            {isLowStock ? "LOW STOCK" : "IN STOCK"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-3">
              {filteredMedicines.map((m, idx) => {
                const isLowStock = (m.stock_quantity ?? 0) < 50;
                return (
                  <div
                    key={m.id || idx}
                    className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            {m.name || m.medicine_name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {m.generic_name || "Standard Formula"}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant={isLowStock ? "warning" : "success"}
                        className="text-[10px]"
                      >
                        {isLowStock ? "LOW" : "AVAILABLE"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Stock Count</span>
                        <span
                          className={`font-mono font-bold text-sm ${
                            isLowStock ? "text-amber-600" : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {m.stock_quantity ?? 0} units
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Unit Tariff</span>
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          ₹{(m.unit_price ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                      <span>Batch: <strong className="font-mono">{m.batch_number || "BATCH-01"}</strong></span>
                      <span>Mfg: {m.manufacturer || "Certified Labs"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
