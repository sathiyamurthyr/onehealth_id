"use client";

import React, { useState, useEffect } from "react";
import {
  FlaskConical,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
  Filter,
  Check
} from "lucide-react";
import { InvestigationCatalogItem, InvestigationOrderItem } from "@/lib/types";
import { doctorWorkspaceApi } from "@/lib/api/doctor-workspace";

interface InvestigationOrdererProps {
  patientId: string;
  patientName: string;
  onehealthId: string;
  onOrdersSubmitted?: () => void;
}

const CATEGORIES = [
  "ALL",
  "Blood",
  "Urine",
  "Stool",
  "Cardiac",
  "Imaging",
  "Respiratory",
  "Endoscopy",
  "Microbiology",
  "Pathology",
] as const;

export function InvestigationOrderer({
  patientId,
  patientName,
  onehealthId,
  onOrdersSubmitted,
}: InvestigationOrdererProps) {
  const [catalog, setCatalog] = useState<InvestigationCatalogItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Cart of orders to submit
  const [selectedOrders, setSelectedOrders] = useState<
    Array<{
      test: InvestigationCatalogItem;
      priority: "ROUTINE" | "URGENT" | "STAT";
      clinical_reason: string;
      instructions: string;
      fasting_required: boolean;
      collection_type: "Hospital" | "Lab" | "Home";
      preferred_lab_name: string;
    }>
  >([]);

  // Confirmation dialog state for Urgent / STAT tests
  const [urgentConfirmModalOpen, setUrgentConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog();
  }, [selectedCategory]);

  const loadCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const cat = selectedCategory === "ALL" ? undefined : selectedCategory;
      const res = await doctorWorkspaceApi.listInvestigationCatalog(cat);
      setCatalog(res.catalog || []);
    } catch (err: any) {
      console.error("Failed to load investigation catalog:", err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const filteredCatalog = catalog.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const toggleTestInCart = (test: InvestigationCatalogItem) => {
    const existingIndex = selectedOrders.findIndex((o) => o.test.id === test.id);
    if (existingIndex >= 0) {
      setSelectedOrders(selectedOrders.filter((_, i) => i !== existingIndex));
    } else {
      setSelectedOrders([
        ...selectedOrders,
        {
          test,
          priority: "ROUTINE",
          clinical_reason: "",
          instructions: "",
          fasting_required: test.category === "Blood" && test.name.toLowerCase().includes("fasting"),
          collection_type: "Hospital",
          preferred_lab_name: "Kedar Central Pathology Lab",
        },
      ]);
    }
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    const updated = [...selectedOrders];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedOrders(updated);
  };

  const removeOrderItem = (index: number) => {
    setSelectedOrders(selectedOrders.filter((_, i) => i !== index));
  };

  const handleOrderSubmitClick = () => {
    setErrorMessage(null);
    if (selectedOrders.length === 0) return;

    // Check if any test has URGENT or STAT priority (Requirement 17)
    const hasUrgentOrStat = selectedOrders.some(
      (o) => o.priority === "URGENT" || o.priority === "STAT"
    );

    if (hasUrgentOrStat) {
      setUrgentConfirmModalOpen(true);
    } else {
      executeOrderSubmission();
    }
  };

  const executeOrderSubmission = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payloadItems = selectedOrders.map((o) => ({
        test_id: o.test.id,
        priority: o.priority,
        clinical_reason: o.clinical_reason || undefined,
        instructions: o.instructions || undefined,
        fasting_required: o.fasting_required,
        collection_type: o.collection_type,
        preferred_lab_name: o.preferred_lab_name,
      }));

      const res = await doctorWorkspaceApi.orderInvestigations(patientId, payloadItems);
      setSuccessMessage(`Successfully ordered ${res.orders.length} investigations for ${patientName}`);
      setSelectedOrders([]);
      setUrgentConfirmModalOpen(false);
      if (onOrdersSubmitted) {
        onOrdersSubmitted();
      }
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to order investigations");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Order Investigations & Lab Tests</h3>
            <p className="text-[11px] text-slate-500">
              Multi-category diagnostic catalog with priority, clinical indication & lab dispatch
            </p>
          </div>
        </div>

        {selectedOrders.length > 0 && (
          <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold">
            {selectedOrders.length} test{selectedOrders.length > 1 ? "s" : ""} selected
          </span>
        )}
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
            }`}
          >
            {cat === "ALL" ? "All Tests" : cat}
          </button>
        ))}
      </div>

      {/* Catalog Search & Grid */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tests by name, code or specimen (e.g. CBC, Lipid, ECG, X-Ray, PFT)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 outline-hidden bg-slate-50/50"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
          {loadingCatalog ? (
            <div className="col-span-full py-6 text-center text-xs text-slate-400">
              Loading investigation catalog...
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="col-span-full py-6 text-center text-xs text-slate-400">
              No investigations match your query.
            </div>
          ) : (
            filteredCatalog.map((item) => {
              const isSelected = selectedOrders.some((o) => o.test.id === item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`catalog-test-${item.id}`}
                  onClick={() => toggleTestInCart(item)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? "bg-teal-50/80 border-teal-300 ring-2 ring-teal-500/20"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-100">
                        {item.code}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">{item.category}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 line-clamp-1">{item.name}</p>
                    {item.specimen_type && (
                      <p className="text-[10px] text-slate-500 mt-0.5">Specimen: {item.specimen_type}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-[11px]">
                    <span className="font-semibold text-slate-700">₹{item.price}</span>
                    <span
                      className={`inline-flex items-center gap-1 font-bold ${
                        isSelected ? "text-teal-700" : "text-slate-400"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Added
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" /> Select
                        </>
                      )}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Orders Customization List */}
      {selectedOrders.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <FlaskConical className="w-3.5 h-3.5 text-teal-600" />
            Configuring {selectedOrders.length} Investigation Order{selectedOrders.length > 1 ? "s" : ""}
          </h4>

          <div className="space-y-3">
            {selectedOrders.map((order, idx) => (
              <div
                key={order.test.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-teal-800 px-1.5 py-0.5 rounded-md bg-teal-100 text-[10px]">
                      {order.test.code}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{order.test.name}</span>
                    <span className="text-slate-400 font-medium text-xs">({order.test.category})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Priority Selector */}
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                      {(["ROUTINE", "URGENT", "STAT"] as const).map((pri) => (
                        <button
                          key={pri}
                          type="button"
                          onClick={() => updateOrderItem(idx, "priority", pri)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                            order.priority === pri
                              ? pri === "STAT"
                                ? "bg-rose-600 text-white"
                                : pri === "URGENT"
                                ? "bg-amber-500 text-white"
                                : "bg-teal-600 text-white"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          {pri}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeOrderItem(idx)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove test"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Per-Test Details Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Clinical Reason (e.g. Eval epigastric pain)..."
                    value={order.clinical_reason}
                    onChange={(e) => updateOrderItem(idx, "clinical_reason", e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="Special Instructions (e.g. Overnight 10h fasting)..."
                    value={order.instructions}
                    onChange={(e) => updateOrderItem(idx, "instructions", e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                  <div className="flex items-center gap-3 bg-white px-2.5 py-1.5 rounded-lg border border-slate-300">
                    <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer font-medium text-xs select-none">
                      <input
                        type="checkbox"
                        checked={order.fasting_required}
                        onChange={(e) => updateOrderItem(idx, "fasting_required", e.target.checked)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      Fasting Required
                    </label>

                    <select
                      value={order.collection_type}
                      onChange={(e) => updateOrderItem(idx, "collection_type", e.target.value)}
                      className="text-xs text-slate-700 bg-transparent outline-hidden font-medium ml-auto"
                    >
                      <option value="Hospital">Hospital</option>
                      <option value="Lab">Lab</option>
                      <option value="Home">Home</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSelectedOrders([])}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Clear All
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleOrderSubmitClick}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              {isSubmitting ? "Dispatching..." : `Order ${selectedOrders.length} Investigation(s)`}
            </button>
          </div>
        </div>
      )}

      {/* Urgent / STAT Priority Confirmation Modal (Requirement 17) */}
      {urgentConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Confirm High-Priority (URGENT / STAT) Order
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                One or more selected investigations are marked with <strong>URGENT / STAT</strong> priority.
                This will trigger priority specimen handling and laboratory expedited turnaround protocol.
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs space-y-1 text-rose-900">
              <span className="font-bold block uppercase tracking-wider text-[10px]">Tests Marked Urgent:</span>
              {selectedOrders
                .filter((o) => o.priority === "URGENT" || o.priority === "STAT")
                .map((o) => (
                  <div key={o.test.id} className="flex justify-between font-medium">
                    <span>{o.test.name}</span>
                    <span className="font-mono font-bold text-rose-700">{o.priority}</span>
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUrgentConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={executeOrderSubmission}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {isSubmitting ? "Dispatching..." : "Confirm & Dispatch Urgent Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
