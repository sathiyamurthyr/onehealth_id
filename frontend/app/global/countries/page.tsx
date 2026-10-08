"use client";

import React, { useState, useEffect } from "react";
import {
  Globe, Shield, CheckCircle2, Plus, Flag, Landmark,
  Database, RefreshCw, Languages, FileText
} from "lucide-react";
import { globalApi } from "@/lib/api/global";
import { CountryConfig } from "@/lib/types";

export default function GlobalCountryRegistryPage() {
  const [countries, setCountries] = useState<CountryConfig[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // New Country Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [countryCode, setCountryCode] = useState("");
  const [countryName, setCountryName] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [timezone, setTimezone] = useState("America/New_York");
  const [healthIdName, setHealthIdName] = useState("National Health ID");
  const [interopStandard, setInteropStandard] = useState("FHIR_R4_US_CORE");
  const [region, setRegion] = useState("US_EAST");
  const [taxRate, setTaxRate] = useState("8.5");

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    setLoading(true);
    try {
      const data = await globalApi.listCountries();
      setCountries(data || []);
      if (data && data.length > 0 && !selectedCountry) {
        setSelectedCountry(data[0]);
      }
    } catch (err) {
      console.error("Failed to load country configurations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await globalApi.upsertCountry({
        country_code: countryCode.toUpperCase(),
        country_name: countryName,
        currency_code: currencyCode,
        currency_symbol: currencySymbol,
        default_timezone: timezone,
        national_health_id_name: healthIdName,
        interop_standard: interopStandard,
        data_residency_region: region,
        tax_rate: parseFloat(taxRate) || 0,
        is_active: true,
      });
      setShowAddModal(false);
      setCountryCode("");
      setCountryName("");
      loadCountries();
      if (created) setSelectedCountry(created);
    } catch (err) {
      console.error("Failed to add country config:", err);
    }
  };

  return (
    <div style={{ padding: "2rem", minHeight: "100vh", backgroundColor: "#0b0f19", color: "#f8fafc", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "16px",
        padding: "2rem",
        marginBottom: "2rem",
        backdropFilter: "blur(12px)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <div style={{ padding: "0.5rem", borderRadius: "10px", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" }}>
                <Globe size={26} />
              </div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>Sovereign Country Configurations & Regional Residency</h1>
            </div>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.95rem" }}>
              Multi-jurisdiction health identity schemes, national interoperability standards (ABDM, NABIDH, NHS FHIR, US Core), and sovereign data residency.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem", background: "#3b82f6", color: "#fff",
              border: "none", borderRadius: "10px", padding: "0.75rem 1.25rem", fontWeight: 600, cursor: "pointer"
            }}
          >
            <Plus size={18} /> Add Country Configuration
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "1.5rem" }}>
        {/* Country Cards */}
        <div style={{
          background: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem"
        }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.5rem 0", color: "#cbd5e1" }}>Active Country Profiles</h2>
          {loading ? (
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Loading country schemes...</p>
          ) : countries.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No countries registered.</p>
          ) : (
            countries.map((c) => (
              <div
                key={c.country_code}
                onClick={() => setSelectedCountry(c)}
                style={{
                  padding: "1rem",
                  borderRadius: "12px",
                  background: selectedCountry?.country_code === c.country_code ? "rgba(59, 130, 246, 0.15)" : "rgba(30, 41, 59, 0.4)",
                  border: `1px solid ${selectedCountry?.country_code === c.country_code ? "rgba(59, 130, 246, 0.4)" : "rgba(255, 255, 255, 0.05)"}`,
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                  <span style={{ fontWeight: 700, color: "#f8fafc", fontSize: "1rem" }}>{c.country_name}</span>
                  <span style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "6px",
                    background: "rgba(59, 130, 246, 0.2)",
                    color: "#60a5fa",
                    fontWeight: 700
                  }}>
                    {c.country_code}
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{c.national_health_id_name}</div>
              </div>
            ))
          )}
        </div>

        {/* Selected Country Details */}
        {selectedCountry ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "1.5rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 0.25rem 0" }}>{selectedCountry.country_name} ({selectedCountry.country_code})</h3>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>
                    National Health Identifier: <strong style={{ color: "#38bdf8" }}>{selectedCountry.national_health_id_name}</strong>
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "0.4rem 0.8rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600 }}>
                  <CheckCircle2 size={16} /> SOVEREIGN REGISTRY ACTIVE
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "1rem", borderRadius: "10px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>CURRENCY & SYMBOL</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f8fafc" }}>
                    {selectedCountry.currency_code} ({selectedCountry.currency_symbol})
                  </div>
                </div>
                <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "1rem", borderRadius: "10px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>DEFAULT TIMEZONE</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f8fafc" }}>
                    {selectedCountry.default_timezone}
                  </div>
                </div>
                <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "1rem", borderRadius: "10px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>PHONE PREFIX</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f8fafc" }}>
                    {selectedCountry.phone_prefix}
                  </div>
                </div>
                <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "1rem", borderRadius: "10px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>INTEROP STANDARD</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "#a855f7" }}>
                    {selectedCountry.interop_standard}
                  </div>
                </div>
                <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "1rem", borderRadius: "10px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>DATA RESIDENCY REGION</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "#34d399" }}>
                    {selectedCountry.data_residency_region}
                  </div>
                </div>
                <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "1rem", borderRadius: "10px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>HEALTHCARE VAT/TAX</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f8fafc" }}>
                    {selectedCountry.tax_rate}%
                  </div>
                </div>
              </div>

              {/* Supported Languages */}
              <div style={{ marginTop: "1.5rem" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#cbd5e1", margin: "0 0 0.5rem 0", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Languages size={16} /> Supported Regional Languages & Scripts
                </h4>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {Array.isArray(selectedCountry.supported_languages) && selectedCountry.supported_languages.map((lang) => (
                    <span key={lang} style={{ background: "rgba(59, 130, 246, 0.15)", color: "#93c5fd", padding: "0.3rem 0.6rem", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600 }}>
                      {lang.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "#64748b" }}>
            Select a country profile to review regional rules.
          </div>
        )}
      </div>

      {/* Add Country Modal */}
      {showAddModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "16px",
            padding: "2rem", width: "520px", maxWidth: "90%"
          }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 1rem 0" }}>Register Sovereign Country Configuration</h3>
            <form onSubmit={handleAddCountry} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>ISO Code</label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    placeholder="AUS"
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff", textTransform: "uppercase" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Country Name</label>
                  <input
                    type="text"
                    required
                    value={countryName}
                    onChange={(e) => setCountryName(e.target.value)}
                    placeholder="Australia"
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff" }}
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Currency Code</label>
                  <input
                    type="text"
                    required
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value)}
                    placeholder="AUD"
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Currency Symbol</label>
                  <input
                    type="text"
                    required
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    placeholder="$"
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff" }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>National Health ID Scheme Name</label>
                <input
                  type="text"
                  required
                  value={healthIdName}
                  onChange={(e) => setHealthIdName(e.target.value)}
                  placeholder="e.g. My Health Record / IHI"
                  style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Interop Standard</label>
                  <input
                    type="text"
                    required
                    value={interopStandard}
                    onChange={(e) => setInteropStandard(e.target.value)}
                    placeholder="FHIR_AU_BASE"
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Data Residency Region</label>
                  <input
                    type="text"
                    required
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="AUSTRALIA_SOUTHEAST"
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff" }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: "0.6rem 1.2rem", background: "transparent", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#94a3b8", borderRadius: "8px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "0.6rem 1.2rem", background: "#3b82f6", border: "none", color: "#fff", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
                >
                  Register Country
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
