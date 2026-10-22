"use client";

import React, { useState, useEffect } from "react";
import {
  Pill,
  Plus,
  Trash2,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Search,
  Sparkles,
  HelpCircle,
  FileCheck,
  ShieldCheck,
  ChevronDown
} from "lucide-react";
import { PrescriptionItem } from "@/lib/types";

interface FHIRPrescriptionBuilderProps {
  items: PrescriptionItem[];
  onItemsChange: (items: PrescriptionItem[]) => void;
  instructions: string;
  onInstructionsChange: (instructions: string) => void;
  validFrom?: string;
  onValidFromChange?: (date: string) => void;
  validUntil?: string;
  onValidUntilChange?: (date: string) => void;
}

// Built-in catalog of commonly prescribed medications with standard strengths, forms, routes
const PRESET_MEDICINES = [
  {
    medicine_name: "Metformin 500mg",
    generic_name: "Metformin Hydrochloride",
    brand_name: "Glycomet 500",
    strength: "500 mg",
    dosage_form: "Tablet",
    route: "Oral",
    dose: "1 tablet",
    frequency: "Twice daily (1-0-1)",
    timing_morning: true,
    timing_afternoon: false,
    timing_evening: false,
    timing_night: true,
    food_instruction: "AFTER_FOOD",
    duration_value: 30,
    duration_unit: "Days",
    quantity: 60,
    refills: 1,
    specific_instructions: "Swallow whole with a full glass of water. Do not crush.",
  },
  {
    medicine_name: "Amoxicillin 500mg",
    generic_name: "Amoxicillin Trihydrate",
    brand_name: "Mox 500",
    strength: "500 mg",
    dosage_form: "Capsule",
    route: "Oral",
    dose: "1 capsule",
    frequency: "Three times daily (1-1-1)",
    timing_morning: true,
    timing_afternoon: true,
    timing_evening: false,
    timing_night: true,
    food_instruction: "AFTER_FOOD",
    duration_value: 5,
    duration_unit: "Days",
    quantity: 15,
    refills: 0,
    specific_instructions: "Complete the entire 5-day antibiotic course even if feeling better.",
  },
  {
    medicine_name: "Paracetamol 650mg",
    generic_name: "Acetaminophen / Paracetamol",
    brand_name: "Dolo 650",
    strength: "650 mg",
    dosage_form: "Tablet",
    route: "Oral",
    dose: "1 tablet",
    frequency: "Three times daily / PRN",
    timing_morning: true,
    timing_afternoon: true,
    timing_evening: false,
    timing_night: true,
    food_instruction: "AFTER_FOOD",
    duration_value: 3,
    duration_unit: "Days",
    quantity: 10,
    refills: 0,
    is_prn: true,
    prn_indication: "For body fever > 100 °F or severe headache",
    specific_instructions: "Do not exceed 3 tablets in 24 hours.",
  },
  {
    medicine_name: "Telmisartan 40mg",
    generic_name: "Telmisartan",
    brand_name: "Telma 40",
    strength: "40 mg",
    dosage_form: "Tablet",
    route: "Oral",
    dose: "1 tablet",
    frequency: "Once daily (1-0-0)",
    timing_morning: true,
    timing_afternoon: false,
    timing_evening: false,
    timing_night: false,
    food_instruction: "AFTER_FOOD",
    duration_value: 30,
    duration_unit: "Days",
    quantity: 30,
    refills: 2,
    specific_instructions: "Take in the morning after breakfast. Monitor BP weekly.",
  },
  {
    medicine_name: "Pantoprazole 40mg",
    generic_name: "Pantoprazole Sodium",
    brand_name: "Pan 40",
    strength: "40 mg",
    dosage_form: "Tablet",
    route: "Oral",
    dose: "1 tablet",
    frequency: "Once daily (1-0-0)",
    timing_morning: true,
    timing_afternoon: false,
    timing_evening: false,
    timing_night: false,
    food_instruction: "BEFORE_FOOD",
    duration_value: 14,
    duration_unit: "Days",
    quantity: 14,
    refills: 0,
    specific_instructions: "Take 30 minutes before morning breakfast.",
  },
  {
    medicine_name: "Atorvastatin 10mg",
    generic_name: "Atorvastatin Calcium",
    brand_name: "Atorva 10",
    strength: "10 mg",
    dosage_form: "Tablet",
    route: "Oral",
    dose: "1 tablet",
    frequency: "Once daily at bedtime (0-0-0-1)",
    timing_morning: false,
    timing_afternoon: false,
    timing_evening: false,
    timing_night: true,
    food_instruction: "AFTER_FOOD",
    duration_value: 30,
    duration_unit: "Days",
    quantity: 30,
    refills: 1,
    specific_instructions: "Take at night before sleep.",
  },
];

export function FHIRPrescriptionBuilder({
  items,
  onItemsChange,
  instructions,
  onInstructionsChange,
  validFrom,
  onValidFromChange,
  validUntil,
  onValidUntilChange,
}: FHIRPrescriptionBuilderProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  // Active Line State being edited/added
  const [activeItem, setActiveItem] = useState<PrescriptionItem>({
    medicine_name: "",
    generic_name: "",
    brand_name: "",
    strength: "500 mg",
    dosage_form: "Tablet",
    route: "Oral",
    dose: "1 tablet",
    frequency: "Once daily (1-0-0)",
    timing_morning: true,
    timing_afternoon: false,
    timing_evening: false,
    timing_night: false,
    food_instruction: "AFTER_FOOD",
    duration_value: 5,
    duration_unit: "Days",
    start_date: todayStr,
    end_date: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
    quantity: 5,
    expected_supply_duration: 5,
    refills: 0,
    is_prn: false,
    prn_indication: "",
    specific_instructions: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);

  // Auto calculate End Date & Quantity when duration or timings change
  useEffect(() => {
    if (activeItem.start_date && activeItem.duration_value) {
      const start = new Date(activeItem.start_date);
      let days = activeItem.duration_value;
      if (activeItem.duration_unit === "Weeks") days *= 7;
      if (activeItem.duration_unit === "Months") days *= 30;

      const end = new Date(start.getTime() + days * 86400000);
      const endStr = end.toISOString().split("T")[0];

      // Frequency doses count per day
      let timesPerDay = 1;
      const count =
        (activeItem.timing_morning ? 1 : 0) +
        (activeItem.timing_afternoon ? 1 : 0) +
        (activeItem.timing_evening ? 1 : 0) +
        (activeItem.timing_night ? 1 : 0);
      if (count > 0) timesPerDay = count;

      const calcQty = days * timesPerDay;

      setActiveItem((prev) => ({
        ...prev,
        end_date: endStr,
        expected_supply_duration: days,
        quantity: prev.quantity === 5 || prev.quantity === 0 ? calcQty : prev.quantity,
      }));
    }
  }, [
    activeItem.start_date,
    activeItem.duration_value,
    activeItem.duration_unit,
    activeItem.timing_morning,
    activeItem.timing_afternoon,
    activeItem.timing_evening,
    activeItem.timing_night,
  ]);

  const handleSelectPreset = (preset: typeof PRESET_MEDICINES[0]) => {
    const start = activeItem.start_date || todayStr;
    const days = preset.duration_value;
    const end = new Date(new Date(start).getTime() + days * 86400000).toISOString().split("T")[0];

    setActiveItem({
      ...preset,
      start_date: start,
      end_date: end,
      expected_supply_duration: days,
    });
    setSearchTerm(preset.medicine_name);
    setShowCatalog(false);
  };

  const handleAddMedicine = () => {
    if (!activeItem.medicine_name.trim()) {
      alert("Please enter or select a medicine name before adding to prescription.");
      return;
    }

    onItemsChange([...items, { ...activeItem, id: `rxi-${Date.now()}` }]);

    // Reset line form to standard default
    setActiveItem({
      medicine_name: "",
      generic_name: "",
      brand_name: "",
      strength: "500 mg",
      dosage_form: "Tablet",
      route: "Oral",
      dose: "1 tablet",
      frequency: "Once daily (1-0-0)",
      timing_morning: true,
      timing_afternoon: false,
      timing_evening: false,
      timing_night: false,
      food_instruction: "AFTER_FOOD",
      duration_value: 5,
      duration_unit: "Days",
      start_date: todayStr,
      end_date: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
      quantity: 5,
      expected_supply_duration: 5,
      refills: 0,
      is_prn: false,
      prn_indication: "",
      specific_instructions: "",
    });
    setSearchTerm("");
  };

  const handleRemoveItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const filteredPresets = PRESET_MEDICINES.filter(
    (m) =>
      m.medicine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.generic_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.brand_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50/70 border-b border-slate-200/80 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Structured Prescription Builder</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-mono font-bold">
                FHIR MedicationRequest
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Each medication line captures exact dosage, timing, duration, quantity, supply duration, and refills.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">Prescription Validity:</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold">
              {validFrom || todayStr} to {validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Medicine Input Line Form (Design Engineer Clean Layout) */}
        <div className="p-5 rounded-2xl border border-purple-100 bg-purple-50/20 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              Add Medication Line Order
            </h4>
            <span className="text-[11px] text-purple-700 font-medium">
              Select preset or type custom medication details
            </span>
          </div>

          {/* Row 1: Search & Identity */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
            <div className="md:col-span-2 relative">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Medicine Name / Brand / Generic <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm || activeItem.medicine_name}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setActiveItem({ ...activeItem, medicine_name: e.target.value });
                    setShowCatalog(true);
                  }}
                  onFocus={() => setShowCatalog(true)}
                  placeholder="Search medication e.g. Metformin, Amoxicillin, Dolo..."
                  className="w-full px-3.5 py-2 pl-9 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              {/* Autocomplete Dropdown */}
              {showCatalog && filteredPresets.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {filteredPresets.map((med, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectPreset(med)}
                      className="w-full px-4 py-2.5 text-left text-xs hover:bg-purple-50 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{med.medicine_name}</span>
                        <span className="text-[11px] text-slate-500 block">
                          {med.generic_name} • {med.brand_name}
                        </span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold">
                        {med.dosage_form}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Strength</label>
              <input
                type="text"
                value={activeItem.strength}
                onChange={(e) => setActiveItem({ ...activeItem, strength: e.target.value })}
                placeholder="500 mg"
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Dosage Form</label>
              <select
                value={activeItem.dosage_form}
                onChange={(e) => setActiveItem({ ...activeItem, dosage_form: e.target.value })}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
              >
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection</option>
                <option value="Inhaler">Inhaler</option>
                <option value="Drops">Drops</option>
                <option value="Ointment">Ointment</option>
                <option value="Suspension">Suspension</option>
              </select>
            </div>
          </div>

          {/* Row 2: Route, Dose, Frequency, Timing Checkboxes */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Route</label>
              <select
                value={activeItem.route}
                onChange={(e) => setActiveItem({ ...activeItem, route: e.target.value })}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
              >
                <option value="Oral">Oral (PO)</option>
                <option value="Intravenous">Intravenous (IV)</option>
                <option value="Intramuscular">Intramuscular (IM)</option>
                <option value="Subcutaneous">Subcutaneous (SC)</option>
                <option value="Topical">Topical</option>
                <option value="Inhalation">Inhalation</option>
                <option value="Sublingual">Sublingual</option>
                <option value="Ophthalmic">Ophthalmic</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Dose Amount</label>
              <input
                type="text"
                value={activeItem.dose}
                onChange={(e) => setActiveItem({ ...activeItem, dose: e.target.value })}
                placeholder="1 tablet, 5 ml, 2 puffs"
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Timing Slots & Frequency
              </label>
              <div className="flex flex-wrap items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeItem.timing_morning}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, timing_morning: e.target.checked })
                    }
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                  />
                  <span>Morning</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeItem.timing_afternoon}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, timing_afternoon: e.target.checked })
                    }
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                  />
                  <span>Afternoon</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeItem.timing_evening}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, timing_evening: e.target.checked })
                    }
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                  />
                  <span>Evening</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeItem.timing_night}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, timing_night: e.target.checked })
                    }
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                  />
                  <span>Night</span>
                </label>
              </div>
            </div>
          </div>

          {/* Row 3: Food Association, Duration, Start/End, Quantity, Refills */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Relation to Food
              </label>
              <div className="flex gap-2">
                {[
                  { id: "BEFORE_FOOD", label: "Before Food" },
                  { id: "AFTER_FOOD", label: "After Food" },
                  { id: "WITH_FOOD", label: "With Food" },
                  { id: "NO_INSTRUCTION", label: "No Instr." },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveItem({ ...activeItem, food_instruction: f.id })}
                    className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg border transition-all ${
                      activeItem.food_instruction === f.id
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Duration</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min="1"
                  value={activeItem.duration_value}
                  onChange={(e) =>
                    setActiveItem({ ...activeItem, duration_value: parseInt(e.target.value) || 1 })
                  }
                  className="w-16 px-2 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                />
                <select
                  value={activeItem.duration_unit}
                  onChange={(e) => setActiveItem({ ...activeItem, duration_unit: e.target.value })}
                  className="flex-1 px-1.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                >
                  <option value="Days">Days</option>
                  <option value="Weeks">Weeks</option>
                  <option value="Months">Months</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Start / End Date
              </label>
              <div className="flex flex-col text-[11px] font-medium text-slate-600 bg-white p-1.5 rounded-xl border border-slate-300">
                <span className="truncate">Start: {activeItem.start_date}</span>
                <span className="text-purple-700 font-bold truncate">End: {activeItem.end_date}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Total Quantity
              </label>
              <input
                type="number"
                min="1"
                value={activeItem.quantity}
                onChange={(e) =>
                  setActiveItem({ ...activeItem, quantity: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Refills</label>
              <select
                value={activeItem.refills}
                onChange={(e) =>
                  setActiveItem({ ...activeItem, refills: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
              >
                <option value="0">0 (No refill)</option>
                <option value="1">1 refill</option>
                <option value="2">2 refills</option>
                <option value="3">3 refills</option>
              </select>
            </div>
          </div>

          {/* Row 4: PRN / SOS & Special Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Special Patient Instructions
              </label>
              <input
                type="text"
                value={activeItem.specific_instructions || ""}
                onChange={(e) =>
                  setActiveItem({ ...activeItem, specific_instructions: e.target.value })
                }
                placeholder="e.g. Take with warm water, avoid dairy 2 hours before/after, do not chew..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeItem.is_prn}
                  onChange={(e) => setActiveItem({ ...activeItem, is_prn: e.target.checked })}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <span>PRN (SOS / As needed)</span>
              </label>

              <button
                type="button"
                onClick={handleAddMedicine}
                className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medicine</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table of Structured Prescribed Medicines */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Prescribed Medication Lines ({items.length})</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">
              Review treatment periods, quantities and supply validity
            </span>
          </div>

          {items.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50/40 text-center space-y-2">
              <Pill className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No medications prescribed yet</p>
              <p className="text-[11px] text-slate-500">
                Use the form above to add structured medication requests adhering to FHIR standards.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Medication & Strength</th>
                    <th className="py-3 px-3">Dose & Route</th>
                    <th className="py-3 px-3">Timing & Food</th>
                    <th className="py-3 px-3">Course Period</th>
                    <th className="py-3 px-3">Quantity</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const timings = [];
                    if (item.timing_morning) timings.push("Morning");
                    if (item.timing_afternoon) timings.push("Afternoon");
                    if (item.timing_evening) timings.push("Evening");
                    if (item.timing_night) timings.push("Night");

                    return (
                      <tr key={item.id || idx} className="hover:bg-purple-50/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-xs">{item.medicine_name}</div>
                          <div className="text-[11px] text-slate-500">
                            {item.generic_name || item.brand_name || item.dosage_form}
                          </div>
                          {item.specific_instructions && (
                            <div className="text-[10px] text-purple-700 font-medium mt-0.5">
                              Note: {item.specific_instructions}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-slate-800">{item.dose || "1 tab"}</span>
                          <span className="text-[11px] text-slate-400 block">{item.route || "Oral"}</span>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-slate-800">
                            {timings.join(" - ") || item.frequency || "Once daily"}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {item.food_instruction?.replace("_", " ") || "After food"}
                            {item.is_prn && " • SOS/PRN"}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-800">
                            {item.duration_value} {item.duration_unit || "Days"}
                          </span>
                          <span className="text-[11px] text-slate-400 block font-mono">
                            {item.start_date} → {item.end_date}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="font-mono font-bold text-purple-700">
                            {item.quantity} {item.dosage_form}s
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            Refills: {item.refills || 0}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            ACTIVE COURSE
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Remove medication"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* General Doctor Prescription Notes */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">
            General Prescription Instructions & Dietary Advise
          </label>
          <textarea
            value={instructions}
            onChange={(e) => onInstructionsChange(e.target.value)}
            rows={2}
            placeholder="e.g. Drink 2.5L water daily. Fasting blood sugar monitoring twice a week. Return immediately if dizziness occurs."
            className="w-full p-3 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Prescription Clinical Validity Period */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              Prescription Validity Period
            </span>
            <span className="text-[11px] text-slate-500">
              Optional · Leave blank if validity period is not explicitly defined
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Valid From
              </label>
              <input
                type="date"
                value={validFrom || ""}
                onChange={(e) => onValidFromChange?.(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Valid Until <span className="text-slate-400 font-normal">(leave blank if not defined)</span>
              </label>
              <input
                type="date"
                value={validUntil || ""}
                onChange={(e) => onValidUntilChange?.(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <p className="text-[11px] text-amber-700 font-medium">
            Note: If "Valid Until" is left blank, the prescription will be issued without an arbitrary system expiration date.
          </p>
        </div>
      </div>
    </div>
  );
}
