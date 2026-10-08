"use client";

import React, { useState, useEffect } from "react";
import {
  Tag,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Building,
  IndianRupee,
  Layers,
  Package,
  Calendar,
  Percent,
  Sliders,
  Check,
  Clock,
  Briefcase
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";
import { phase5Api } from "@/lib/api/phase5";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { HospitalService, PriceList, MedicalPackage, PriceListItem } from "@/lib/types";

export default function ServicesAndPricingPage() {
  const { workspace } = useWorkspace();
  const activeHospitalId = workspace?.hospital_ref_id || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("oh_workspace") || "{}").hospital_ref_id : "") || "";

  const [activeTab, setActiveTab] = useState<"services" | "pricelists" | "packages">("services");
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<HospitalService[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [packages, setPackages] = useState<MedicalPackage[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPriceListModal, setShowPriceListModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  const [priceListItems, setPriceListItems] = useState<PriceListItem[]>([]);

  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Service Form
  const [serviceForm, setServiceForm] = useState<Partial<HospitalService>>({
    hospital_id: activeHospitalId,
    code: "SRV-",
    name: "",
    description: "",
    category: "CONSULTATION",
    base_price: 500,
    taxable: false,
    tax_rate: 0,
    currency: "INR",
    is_active: true
  });

  // New Price List Form
  const [priceListForm, setPriceListForm] = useState<Partial<PriceList>>({
    hospital_id: activeHospitalId,
    code: "PLIST-",
    name: "",
    description: "",
    price_list_type: "CORPORATE",
    currency: "INR",
    is_default: false
  });

  // New Package Form
  const [packageForm, setPackageForm] = useState<Partial<MedicalPackage>>({
    hospital_id: activeHospitalId,
    code: "PKG-",
    name: "",
    description: "",
    category: "HEALTH_CHECKUP",
    total_package_price: 4999,
    currency: "INR",
    validity_days: 30,
    inclusions: ["Complete Blood Count (CBC)", "ECG", "Lipid Profile", "Physician Consultation"],
    exclusions: ["Emergency Medication", "Cross-Specialist Referral"]
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [srvRes, plRes, pkgRes] = await Promise.all([
        phase5Api.listServices({ hospital_id: activeHospitalId }).catch(() => []),
        phase5Api.listPriceLists(activeHospitalId).catch(() => []),
        phase5Api.listPackages(activeHospitalId).catch(() => [])
      ]);
      setServices(srvRes || []);
      setPriceLists(plRes || []);
      setPackages(pkgRes || []);
    } catch (err: any) {
      console.error("Failed to load services and price lists:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeHospitalId]);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await phase5Api.createService({ ...serviceForm, hospital_id: activeHospitalId });
      setActionMessage({ type: "success", text: `Service '${serviceForm.name}' added to hospital tariff catalogue!` });
      setShowServiceModal(false);
      setServiceForm({
        hospital_id: activeHospitalId,
        code: "SRV-",
        name: "",
        description: "",
        category: "CONSULTATION",
        base_price: 500,
        taxable: false,
        tax_rate: 0,
        currency: "INR",
        is_active: true
      });
      await loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to create service." });
    }
  };

  const handleCreatePriceList = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await phase5Api.createPriceList({ ...priceListForm, hospital_id: activeHospitalId });
      setActionMessage({ type: "success", text: `Price Schedule '${priceListForm.name}' created!` });
      setShowPriceListModal(false);
      await loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to create price list." });
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await phase5Api.createPackage({ ...packageForm, hospital_id: activeHospitalId });
      setActionMessage({ type: "success", text: `Medical Package '${packageForm.name}' published!` });
      setShowPackageModal(false);
      await loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to create package." });
    }
  };

  const handleOpenPriceListItems = async (plist: PriceList) => {
    setSelectedPriceList(plist);
    try {
      const items = await phase5Api.getPriceListItems(plist.id);
      setPriceListItems(items || []);
    } catch (err) {
      console.error("Failed to get price list items:", err);
      setPriceListItems([]);
    }
  };

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      (s.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (s.code?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <WorkspaceLayout allowedWorkspaceTypes={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Hospital Tariff & Master Catalogue
              </span>
              <span className="text-xs text-zinc-500">Effective Date Pricing & Versioning</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <Tag className="w-7 h-7 text-emerald-400" />
              Services, Price Lists & Packages
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Configure billable clinical consultations, procedures, investigations, room rates, and tiered corporate price lists.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/hospital/billing"
              className="px-4 py-2 bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700/60 rounded-xl text-xs font-semibold text-zinc-200 transition-all flex items-center gap-2"
            >
              <IndianRupee className="w-4 h-4 text-zinc-400" />
              Patient Invoices & Billing
            </Link>
            <button
              onClick={loadData}
              className="p-2 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 rounded-xl text-zinc-300 transition-all"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Action feedback */}
        {actionMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              actionMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/20 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {actionMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {actionMessage.text}
            </div>
            <button onClick={() => setActionMessage(null)} className="text-xs hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2">
          <button
            onClick={() => setActiveTab("services")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "services"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Service Catalogue ({services.length})
          </button>
          <button
            onClick={() => setActiveTab("pricelists")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "pricelists"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Price Lists ({priceLists.length})
          </button>
          <button
            onClick={() => setActiveTab("packages")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "packages"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Medical Packages ({packages.length})
          </button>
        </div>

        {/* TAB 1: SERVICE CATALOGUE */}
        {activeTab === "services" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by code, service title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="ALL">All Categories</option>
                  <option value="CONSULTATION">Consultation</option>
                  <option value="PROCEDURE">Procedure</option>
                  <option value="SURGERY">Surgery</option>
                  <option value="LABORATORY">Laboratory</option>
                  <option value="RADIOLOGY">Radiology</option>
                  <option value="ROOM_BED">Room / Bed</option>
                  <option value="PHARMACY">Pharmacy</option>
                  <option value="NURSING">Nursing</option>
                </select>
              </div>

              <button
                onClick={() => setShowServiceModal(true)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold rounded-xl text-xs transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Master Service
              </button>
            </div>

            {/* Services Table */}
            <div className="border border-zinc-800/80 rounded-2xl overflow-hidden bg-zinc-900/40">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900/90 text-zinc-400 font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">Service Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5 text-right">Base Price</th>
                    <th className="p-3.5 text-center">Tax / GST</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
                        No services found. Click "Add Master Service" to register billable items.
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((s) => (
                      <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-3.5 font-mono text-emerald-400 font-medium">{s.code}</td>
                        <td className="p-3.5">
                          <div className="font-semibold text-white">{s.name}</div>
                          <div className="text-[11px] text-zinc-500">{s.description}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {s.category}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-semibold text-white">
                          ₹{Number(s.base_price).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center text-zinc-400">
                          {s.taxable ? `${s.tax_rate}% GST` : "Exempt"}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              s.is_active
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-zinc-800 text-zinc-500 border-zinc-700"
                            }`}
                          >
                            {s.is_active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PRICE LISTS */}
        {activeTab === "pricelists" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-400">
                Configured price schedules for standard self-pay, corporate agreements, and insurance coverage.
              </p>
              <button
                onClick={() => setShowPriceListModal(true)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold rounded-xl text-xs transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Price Schedule
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {priceLists.map((pl) => (
                <div
                  key={pl.id}
                  className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {pl.price_list_type}
                      </span>
                      <h3 className="text-base font-bold text-white mt-2">{pl.name}</h3>
                      <div className="text-xs font-mono text-zinc-500">{pl.code}</div>
                    </div>
                    {pl.is_default && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        DEFAULT
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400">{pl.description || "Standard institutional price schedule."}</p>

                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Currency: {pl.currency}</span>
                    <button
                      onClick={() => handleOpenPriceListItems(pl)}
                      className="text-emerald-400 hover:underline font-semibold"
                    >
                      View Rate Overrides →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MEDICAL PACKAGES */}
        {activeTab === "packages" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-400">
                Bundled healthcare packages with defined inclusions, exclusions, and fixed composite pricing.
              </p>
              <button
                onClick={() => setShowPackageModal(true)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold rounded-xl text-xs transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Medical Package
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {pkg.category}
                      </span>
                      <h3 className="text-lg font-bold text-white mt-2">{pkg.name}</h3>
                      <div className="text-xs font-mono text-zinc-500">{pkg.code}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-emerald-400">
                        ₹{Number(pkg.total_package_price).toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-zinc-500">Validity: {pkg.validity_days} Days</div>
                    </div>
                  </div>

                  {/* Inclusions */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Inclusions</div>
                    <div className="flex flex-wrap gap-1.5">
                      {pkg.inclusions.map((inc, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 text-emerald-400" />
                          {inc}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Exclusions */}
                  {pkg.exclusions && pkg.exclusions.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                      <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Exclusions</div>
                      <div className="flex flex-wrap gap-1.5">
                        {pkg.exclusions.map((exc, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-lg text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1"
                          >
                            <X className="w-3 h-3 text-zinc-500" />
                            {exc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL: ADD SERVICE */}
        {showServiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-400" />
                  Add Billable Hospital Service
                </h3>
                <button onClick={() => setShowServiceModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateService} className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1">Service Code (Unique)</label>
                  <input
                    type="text"
                    required
                    value={serviceForm.code}
                    onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Service Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Echocardiography (2D Echo)"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Category</label>
                    <select
                      value={serviceForm.category}
                      onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value as any })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                    >
                      <option value="CONSULTATION">Consultation</option>
                      <option value="PROCEDURE">Procedure</option>
                      <option value="SURGERY">Surgery</option>
                      <option value="LABORATORY">Laboratory</option>
                      <option value="RADIOLOGY">Radiology</option>
                      <option value="ROOM_BED">Room / Bed</option>
                      <option value="PHARMACY">Pharmacy</option>
                      <option value="NURSING">Nursing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Base Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={serviceForm.base_price}
                      onChange={(e) => setServiceForm({ ...serviceForm, base_price: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                  />
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 text-zinc-300">
                    <input
                      type="checkbox"
                      checked={serviceForm.taxable}
                      onChange={(e) => setServiceForm({ ...serviceForm, taxable: e.target.checked })}
                    />
                    Taxable Service (GST)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowServiceModal(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold rounded-xl"
                  >
                    Save Service
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
