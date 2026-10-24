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
  const activeHospitalId = workspace?.hospital_ref_id || "";

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
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Hospital Tariff & Master Catalogue
              </span>
              <span className="text-xs text-slate-500 font-medium">Effective Date Pricing & Versioning</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <Tag className="w-7 h-7 text-emerald-600" />
              Services, Price Lists & Packages
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure billable clinical consultations, procedures, investigations, room rates, and tiered corporate price lists.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/hospital/billing"
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all flex items-center gap-2 shadow-xs"
            >
              <IndianRupee className="w-4 h-4 text-slate-500" />
              Patient Invoices & Billing
            </Link>
            <button
              onClick={loadData}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-all shadow-xs"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Action feedback */}
        {actionMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              actionMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {actionMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              {actionMessage.text}
            </div>
            <button onClick={() => setActionMessage(null)} className="text-xs font-semibold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("services")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "services"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Service Catalogue ({services.length})
          </button>
          <button
            onClick={() => setActiveTab("pricelists")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "pricelists"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Price Lists ({priceLists.length})
          </button>
          <button
            onClick={() => setActiveTab("packages")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "packages"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by code, service title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
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
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Master Service
              </button>
            </div>

            {/* Services Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">Service Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5 text-right">Base Price</th>
                    <th className="p-3.5 text-center">Tax / GST</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No services found. Click "Add Master Service" to register billable items.
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-mono text-emerald-700 font-semibold">{s.code}</td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">{s.name}</div>
                          <div className="text-[11px] text-slate-500">{s.description}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {s.category}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-semibold text-slate-900">
                          ₹{Number(s.base_price).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center text-slate-500">
                          {s.taxable ? `${s.tax_rate}% GST` : "Exempt"}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              s.is_active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
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
              <p className="text-xs text-slate-500">
                Configured price schedules for standard self-pay, corporate agreements, and insurance coverage.
              </p>
              <button
                onClick={() => setShowPriceListModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Price Schedule
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {priceLists.map((pl) => (
                <div
                  key={pl.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-slate-300 hover:shadow-md transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {pl.price_list_type}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-2">{pl.name}</h3>
                      <div className="text-xs font-mono text-slate-500">{pl.code}</div>
                    </div>
                    {pl.is_default && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        DEFAULT
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">{pl.description || "Standard institutional price schedule."}</p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Currency: {pl.currency}</span>
                    <button
                      onClick={() => handleOpenPriceListItems(pl)}
                      className="text-emerald-600 hover:underline font-semibold cursor-pointer"
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
              <p className="text-xs text-slate-500">
                Bundled healthcare packages with defined inclusions, exclusions, and fixed composite pricing.
              </p>
              <button
                onClick={() => setShowPackageModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Medical Package
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-slate-300 hover:shadow-md transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        {pkg.category}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-2">{pkg.name}</h3>
                      <div className="text-xs font-mono text-slate-500">{pkg.code}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-emerald-600">
                        ₹{Number(pkg.total_package_price).toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-slate-500">Validity: {pkg.validity_days} Days</div>
                    </div>
                  </div>

                  {/* Inclusions */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Inclusions</div>
                    <div className="flex flex-wrap gap-1.5">
                      {pkg.inclusions.map((inc, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 font-medium"
                        >
                          <Check className="w-3 h-3 text-emerald-600" />
                          {inc}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Exclusions */}
                  {pkg.exclusions && pkg.exclusions.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Exclusions</div>
                      <div className="flex flex-wrap gap-1.5">
                        {pkg.exclusions.map((exc, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1"
                          >
                            <X className="w-3 h-3 text-slate-400" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  Add Billable Hospital Service
                </h3>
                <button onClick={() => setShowServiceModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateService} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Service Code (Unique)</label>
                  <input
                    type="text"
                    required
                    value={serviceForm.code}
                    onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Service Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Echocardiography (2D Echo)"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Category</label>
                    <select
                      value={serviceForm.category}
                      onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
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
                    <label className="block text-slate-700 font-medium mb-1">Base Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={serviceForm.base_price}
                      onChange={(e) => setServiceForm({ ...serviceForm, base_price: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={serviceForm.taxable}
                      onChange={(e) => setServiceForm({ ...serviceForm, taxable: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Taxable Service (GST)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowServiceModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Save Service
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: RATE OVERRIDES */}
        {selectedPriceList && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Price Schedule: {selectedPriceList.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Rate overrides and customized tier rules for {selectedPriceList.code}</p>
                </div>
                <button onClick={() => setSelectedPriceList(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-3">Item / Service Code</th>
                      <th className="p-3 text-right">Standard Rate</th>
                      <th className="p-3 text-right">Negotiated Rate</th>
                      <th className="p-3 text-center">Discount %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {priceListItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400">
                          No rate overrides configured. Base catalog tariff applies to this schedule.
                        </td>
                      </tr>
                    ) : (
                      priceListItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="p-3 font-mono font-medium text-slate-900">{item.service_code || item.service_name || item.service_id}</td>
                          <td className="p-3 text-right text-slate-500">{item.category || "General"}</td>
                          <td className="p-3 text-right font-semibold text-emerald-700">₹{Number(item.price || 0).toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {item.currency || "INR"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPriceList(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
