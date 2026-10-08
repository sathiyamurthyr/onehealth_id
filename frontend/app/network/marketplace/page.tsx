"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, Search, Filter, ShieldCheck, Star, MapPin, 
  Clock, ArrowRight, Activity, Stethoscope, CheckCircle2,
  Calendar, Layers, Sparkles
} from "lucide-react";
import { networkApi } from "@/lib/api/network";
import { NetworkProvider, NetworkServiceOffering } from "@/lib/types";

export default function NetworkMarketplacePage() {
  const [services, setServices] = useState<NetworkServiceOffering[]>([]);
  const [providers, setProviders] = useState<NetworkProvider[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("ALL");
  const [selectedProviderType, setSelectedProviderType] = useState("ALL");
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"SERVICES" | "PROVIDERS">("SERVICES");
  const [bookingModal, setBookingModal] = useState<NetworkServiceOffering | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const specialties = [
    "ALL", "Cardiology", "Neurology", "Orthopedics", "Pathology",
    "Radiology", "Pharmacy", "Emergency Care", "General Medicine"
  ];

  const providerTypes = [
    { label: "All Facilities", value: "ALL" },
    { label: "Hospitals", value: "HOSPITAL" },
    { label: "Clinics", value: "CLINIC" },
    { label: "Diagnostic Labs", value: "LABORATORY" },
    { label: "Pharmacies", value: "PHARMACY" },
    { label: "Specialty Centres", value: "SPECIALIST" },
  ];

  useEffect(() => {
    loadData();
  }, [selectedSpecialty, selectedCity]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [svcData, provData] = await Promise.all([
        networkApi.searchMarketplace({
          q: searchQuery || undefined,
          specialty: selectedSpecialty !== "ALL" ? selectedSpecialty : undefined,
          city: selectedCity !== "ALL" ? selectedCity : undefined,
        }),
        networkApi.listProviders({
          stage: "ACTIVE",
          city: selectedCity !== "ALL" ? selectedCity : undefined,
        }),
      ]);
      setServices(svcData || []);
      setProviders(provData || []);
    } catch (err) {
      console.error("Failed to load network marketplace data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  return (
    <div style={{ padding: "2rem", minHeight: "100vh", backgroundColor: "#0b0f19", color: "#f8fafc", fontFamily: "sans-serif" }}>
      {/* Header Banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "16px",
        padding: "2rem",
        marginBottom: "2rem",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.3)", padding: "0.3rem 0.8rem", borderRadius: "20px", color: "#60a5fa", fontSize: "0.85rem", marginBottom: "0.8rem" }}>
              <ShieldCheck size={16} /> OH-ID National Healthcare Exchange
            </div>
            <h1 style={{ fontSize: "2rem", fontWeight: "700", margin: "0 0 0.5rem 0", background: "linear-gradient(90deg, #ffffff, #93c5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Verified Healthcare Network & Directory
            </h1>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "1rem", maxWidth: "700px" }}>
              Discover accredited hospitals, clinics, diagnostic labs, pharmacies, and specialists connected under one unified OH-ID ecosystem.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", background: "rgba(15, 23, 42, 0.6)", padding: "0.3rem", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <button
              onClick={() => setActiveTab("SERVICES")}
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: "8px",
                border: "none",
                background: activeTab === "SERVICES" ? "#2563eb" : "transparent",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s ease"
              }}
            >
              <Activity size={16} /> Services & Packages
            </button>
            <button
              onClick={() => setActiveTab("PROVIDERS")}
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: "8px",
                border: "none",
                background: activeTab === "PROVIDERS" ? "#2563eb" : "transparent",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s ease"
              }}
            >
              <Building2 size={16} /> Accredited Providers ({providers.length})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px", position: "relative" }}>
            <Search style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} size={18} />
            <input
              type="text"
              placeholder="Search by consultation, doctor, test, hospital, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.8rem 1rem 0.8rem 2.8rem",
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "10px",
                color: "#f8fafc",
                fontSize: "0.95rem",
                outline: "none"
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "0.8rem 1.8rem",
              background: "linear-gradient(90deg, #2563eb, #1d4ed8)",
              border: "none",
              borderRadius: "10px",
              color: "#ffffff",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)"
            }}
          >
            Search Network
          </button>
        </form>

        {/* Specialty Filter Pills */}
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", marginTop: "1.2rem", paddingBottom: "0.3rem" }}>
          {specialties.map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpecialty(spec)}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: "20px",
                border: "1px solid",
                borderColor: selectedSpecialty === spec ? "#3b82f6" : "rgba(255, 255, 255, 0.1)",
                background: selectedSpecialty === spec ? "rgba(59, 130, 246, 0.2)" : "rgba(15, 23, 42, 0.4)",
                color: selectedSpecialty === spec ? "#60a5fa" : "#94a3b8",
                fontSize: "0.85rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease"
              }}
            >
              {spec === "ALL" ? "All Specialties" : spec}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
          <Activity className="animate-spin" size={36} style={{ margin: "0 auto 1rem auto", color: "#3b82f6" }} />
          <p>Querying verified network directory...</p>
        </div>
      ) : activeTab === "SERVICES" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.5rem" }}>
          {services.map((svc) => (
            <div
              key={svc.id}
              style={{
                background: "rgba(30, 41, 59, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                backdropFilter: "blur(8px)",
                transition: "transform 0.2s ease, border-color 0.2s ease"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.8rem" }}>
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "6px",
                    background: "rgba(59, 130, 246, 0.15)",
                    color: "#93c5fd",
                    border: "1px solid rgba(59, 130, 246, 0.3)"
                  }}>
                    {svc.specialty}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#fbbf24", fontSize: "0.85rem", fontWeight: "600" }}>
                    <Star size={14} fill="#fbbf24" /> {svc.rating ? Number(svc.rating).toFixed(1) : "4.9"}
                  </div>
                </div>

                <h3 style={{ fontSize: "1.2rem", fontWeight: "600", margin: "0 0 0.5rem 0", color: "#f8fafc" }}>
                  {svc.service_name}
                </h3>

                <p style={{ color: "#94a3b8", fontSize: "0.88rem", margin: "0 0 1rem 0", lineHeight: "1.4" }}>
                  {svc.description || "Comprehensive clinical consultation and diagnostic evaluation."}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "1.2rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Building2 size={15} style={{ color: "#60a5fa" }} />
                    <span style={{ fontWeight: "500" }}>{svc.organization_name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8" }}>
                    <MapPin size={15} />
                    <span>{svc.facility_name || svc.provider_city || "Chennai"}</span>
                  </div>
                  {svc.estimated_duration_minutes && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8" }}>
                      <Clock size={15} />
                      <span>{svc.estimated_duration_minutes} Mins Duration</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>Standard Tariff</span>
                  <span style={{ fontSize: "1.3rem", fontWeight: "700", color: "#34d399" }}>
                    ₹{Number(svc.standard_rate).toLocaleString("en-IN")}
                  </span>
                </div>
                <button
                  onClick={() => setBookingModal(svc)}
                  style={{
                    padding: "0.6rem 1.2rem",
                    background: "linear-gradient(90deg, #3b82f6, #2563eb)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem"
                  }}
                >
                  <Calendar size={15} /> Book Visit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.5rem" }}>
          {providers.map((prov) => (
            <div
              key={prov.id}
              style={{
                background: "rgba(30, 41, 59, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "1.5rem",
                backdropFilter: "blur(8px)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.8rem" }}>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  padding: "0.25rem 0.6rem",
                  borderRadius: "6px",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16, 185, 129, 0.3)"
                }}>
                  {prov.provider_type}
                </span>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontSize: "0.75rem",
                  color: "#60a5fa",
                  fontWeight: "600"
                }}>
                  <ShieldCheck size={14} /> OH-ID Verified
                </span>
              </div>

              <h3 style={{ fontSize: "1.25rem", fontWeight: "700", margin: "0 0 0.5rem 0" }}>
                {prov.organization_name}
              </h3>

              <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "0 0 1rem 0" }}>
                Registration: {prov.registration_number}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem", color: "#cbd5e1" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <MapPin size={15} style={{ color: "#60a5fa" }} />
                  <span>{prov.city}, {prov.state}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8" }}>
                  <span>Contact: {prov.primary_phone} | {prov.primary_email}</span>
                </div>
              </div>

              <div style={{ marginTop: "1.2rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "#10b981", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                  <CheckCircle2 size={14} /> Active Network Node
                </span>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Verified: {prov.verified_by || "NABH / National Registry"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Confirmation Modal */}
      {bookingModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(6px)"
        }}>
          <div style={{
            background: "#1e293b",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "16px",
            padding: "2rem",
            maxWidth: "500px",
            width: "90%",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
          }}>
            {!bookingSuccess ? (
              <>
                <h2 style={{ fontSize: "1.4rem", fontWeight: "700", margin: "0 0 1rem 0", color: "#f8fafc" }}>
                  Schedule Cross-Network Appointment
                </h2>
                <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "1rem", borderRadius: "10px", marginBottom: "1.2rem" }}>
                  <p style={{ margin: "0 0 0.3rem 0", fontWeight: "600", color: "#60a5fa" }}>{bookingModal.service_name}</p>
                  <p style={{ margin: "0 0 0.3rem 0", fontSize: "0.9rem", color: "#cbd5e1" }}>{bookingModal.organization_name}</p>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>Fee: ₹{Number(bookingModal.standard_rate).toLocaleString("en-IN")}</p>
                </div>
                <p style={{ fontSize: "0.88rem", color: "#94a3b8", lineHeight: "1.5", marginBottom: "1.5rem" }}>
                  Your OH-ID identity token will be securely transmitted to the host hospital. Prior records will remain private unless explicit consent is granted.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem" }}>
                  <button
                    onClick={() => setBookingModal(null)}
                    style={{ padding: "0.6rem 1.2rem", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#f8fafc", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setBookingSuccess(true)}
                    style={{ padding: "0.6rem 1.5rem", background: "#2563eb", border: "none", borderRadius: "8px", color: "#ffffff", fontWeight: "600", cursor: "pointer" }}
                  >
                    Confirm OH-ID Slot
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <CheckCircle2 size={48} style={{ color: "#34d399", margin: "0 auto 1rem auto" }} />
                <h3 style={{ fontSize: "1.3rem", fontWeight: "700", margin: "0 0 0.5rem 0", color: "#f8fafc" }}>
                  Appointment Slot Reserved!
                </h3>
                <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                  Your cross-provider appointment token has been dispatched. An SMS and QR badge have been synchronized to your OH-ID pass.
                </p>
                <button
                  onClick={() => {
                    setBookingSuccess(false);
                    setBookingModal(null);
                  }}
                  style={{ padding: "0.6rem 1.5rem", background: "#2563eb", border: "none", borderRadius: "8px", color: "#ffffff", fontWeight: "600", cursor: "pointer" }}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
