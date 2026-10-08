"use client";

import React, { useState, useEffect } from "react";
import {
  Globe, Shield, Activity, Users, CreditCard, Building2,
  Code, RefreshCw, CheckCircle2, TrendingUp, DollarSign, Database,
  FileText, Languages, Cpu, Landmark
} from "lucide-react";
import { globalApi } from "@/lib/api/global";
import { GlobalPlatformTelemetry, CountryConfig, DeveloperApp, ResearchCohort } from "@/lib/types";

export default function SuperAdminGlobalPlatformPage() {
  const [telemetry, setTelemetry] = useState<GlobalPlatformTelemetry | null>(null);
  const [countries, setCountries] = useState<CountryConfig[]>([]);
  const [apps, setApps] = useState<DeveloperApp[]>([]);
  const [cohorts, setCohorts] = useState<ResearchCohort[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    setLoading(true);
    try {
      const [telem, countryList, appList, cohortList] = await Promise.all([
        globalApi.getGlobalTelemetry(),
        globalApi.listCountries(),
        globalApi.listDeveloperApps(),
        globalApi.listResearchCohorts(),
      ]);
      setTelemetry(telem);
      setCountries(countryList || []);
      setApps(appList || []);
      setCohorts(cohortList || []);
    } catch (err) {
      console.error("Failed to load global platform governance data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", minHeight: "100vh", backgroundColor: "#0b0f19", color: "#f8fafc", fontFamily: "sans-serif" }}>
      {/* Top Banner */}
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
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>Super Admin — Global Healthcare Platform Governance</h1>
            </div>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.95rem" }}>
              Central executive telemetry across sovereign country jurisdictions, developer ecosystem apps, payer clearinghouses, and IRB research cohorts.
            </p>
          </div>
          <button
            onClick={loadMasterData}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa",
              border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "8px", padding: "0.6rem 1rem", fontWeight: 600, cursor: "pointer"
            }}
          >
            <RefreshCw size={16} /> Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Global Telemetry KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.4rem" }}>ACTIVE COUNTRIES</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#38bdf8" }}>
            {telemetry?.active_countries_count ?? telemetry?.active_countries ?? countries.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>Sovereign nodes live</div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.4rem" }}>DEVELOPER APPS</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#a855f7" }}>
            {telemetry?.active_developer_apps_count ?? telemetry?.connected_apps ?? apps.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>Connected third-party apps</div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.4rem" }}>TELEHEALTH SESSIONS</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#34d399" }}>
            {telemetry?.total_telehealth_sessions_count ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>Virtual consultations</div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.4rem" }}>RPM BIOMETRIC FEEDS</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f87171" }}>
            {telemetry?.total_wearable_records_count ?? telemetry?.total_wearable_records ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>Wearable streams active</div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.4rem" }}>PAYER CLAIMS VOLUME</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#facc15" }}>
            ₹{Number(telemetry?.total_claims_volume_inr ?? 0).toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>Gross settled tariff</div>
        </div>
      </div>

      {/* Sovereign Jurisdiction Map Table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {/* Country Jurisdictions */}
        <div style={{
          background: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "1.5rem"
        }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Landmark size={18} color="#60a5fa" /> Sovereign Country Registries
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {countries.map((c) => (
              <div
                key={c.country_code}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.9rem", borderRadius: "10px", background: "rgba(30, 41, 59, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.05)"
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>{c.country_name} ({c.country_code})</div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Scheme: <span style={{ color: "#38bdf8" }}>{c.national_health_id_name}</span> | Interop: {c.interop_standard}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.8rem", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                    {c.data_residency_region}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Developer Ecosystem Apps */}
        <div style={{
          background: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "1.5rem"
        }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Code size={18} color="#a855f7" /> Accredited Third-Party Applications
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {apps.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.9rem", borderRadius: "10px", background: "rgba(30, 41, 59, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.05)"
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>{a.app_name}</div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Org: {a.organization_name} • Rate: {a.rate_limit_per_minute} req/m
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                    {a.app_category}
                  </span>
                  <span style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                    {a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Research Cohorts Governance */}
      <div style={{
        background: "rgba(15, 23, 42, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "16px",
        padding: "1.5rem"
      }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Database size={18} color="#34d399" /> Population Health & IRB-Approved Research Cohorts
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1rem" }}>
          {cohorts.map((c) => (
            <div
              key={c.id}
              style={{
                padding: "1.25rem", borderRadius: "12px", background: "rgba(30, 41, 59, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.05)"
              }}
            >
              <div style={{ fontWeight: 600, color: "#f8fafc", fontSize: "1rem", marginBottom: "0.25rem" }}>
                {c.cohort_name || c.study_title}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.5rem" }}>
                {c.institution_name || c.lead_institution} • IRB #{c.irb_approval_number}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#38bdf8", background: "rgba(56, 189, 248, 0.1)", padding: "0.3rem 0.6rem", borderRadius: "6px", display: "inline-block" }}>
                Anonymization: {c.anonymization_method}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.5rem", fontSize: "0.8rem" }}>
                <span style={{ color: "#64748b" }}>Cohort Size: <strong style={{ color: "#fff" }}>{c.patient_count} patients</strong></span>
                <span style={{ color: "#34d399", fontWeight: 600 }}>{c.export_status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
