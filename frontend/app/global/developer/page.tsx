"use client";

import React, { useState, useEffect } from "react";
import {
  Code, Key, Webhook, Shield, Plus, Copy, Check, ExternalLink,
  Cpu, Layers, AlertCircle, RefreshCw, Terminal, CheckCircle2, Lock
} from "lucide-react";
import { globalApi } from "@/lib/api/global";
import { DeveloperApp, DeveloperApiKey, WebhookSubscription } from "@/lib/types";

export default function GlobalDeveloperPortalPage() {
  const [apps, setApps] = useState<DeveloperApp[]>([]);
  const [selectedApp, setSelectedApp] = useState<DeveloperApp | null>(null);
  const [apiKeys, setApiKeys] = useState<DeveloperApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New App Form State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCategory, setNewCategory] = useState("HOSPITAL_INTEGRATION");

  // New Key Form State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);

  useEffect(() => {
    loadApps();
  }, []);

  useEffect(() => {
    if (selectedApp) {
      loadAppDetails(selectedApp.id);
    }
  }, [selectedApp]);

  const loadApps = async () => {
    setLoading(true);
    try {
      const appList = await globalApi.listDeveloperApps();
      setApps(appList || []);
      if (appList && appList.length > 0 && !selectedApp) {
        setSelectedApp(appList[0]);
      }
    } catch (err) {
      console.error("Failed to load developer apps:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAppDetails = async (appId: string) => {
    try {
      const [keys, hooks] = await Promise.all([
        globalApi.listApiKeys(appId),
        globalApi.listWebhooks(appId),
      ]);
      setApiKeys(keys || []);
      setWebhooks(hooks || []);
    } catch (err) {
      console.error("Failed to load app details:", err);
    }
  };

  const handleRegisterApp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await globalApi.registerDeveloperApp({
        app_name: newAppName,
        organization_name: newOrgName,
        developer_email: newEmail,
        app_category: newCategory,
      });
      setShowRegisterModal(false);
      setNewAppName("");
      setNewOrgName("");
      setNewEmail("");
      loadApps();
      if (created) setSelectedApp(created);
    } catch (err) {
      console.error("Failed to register developer app:", err);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      const keyData = await globalApi.createApiKey(selectedApp.id, newKeyName || "Production API Key");
      if (keyData?.raw_api_key) {
        setCreatedRawKey(keyData.raw_api_key);
      }
      setNewKeyName("");
      loadAppDetails(selectedApp.id);
    } catch (err) {
      console.error("Failed to create API key:", err);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!selectedApp) return;
    try {
      await globalApi.revokeApiKey(keyId);
      loadAppDetails(selectedApp.id);
    } catch (err) {
      console.error("Failed to revoke API key:", err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
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
                <Terminal size={26} />
              </div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>OH-ID Developer Ecosystem & API Hub</h1>
            </div>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.95rem" }}>
              Manage third-party EHR integrations, API keys, Webhooks, and secure token issuance for connected digital health partners.
            </p>
          </div>
          <button
            onClick={() => setShowRegisterModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "0.75rem 1.25rem",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            <Plus size={18} /> Register New App
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.5rem" }}>
        {/* Left Column: Apps List */}
        <div style={{
          background: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem"
        }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.5rem 0", color: "#cbd5e1" }}>Connected Applications</h2>
          {loading ? (
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Loading apps...</p>
          ) : apps.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No developer apps registered yet.</p>
          ) : (
            apps.map((app) => (
              <div
                key={app.id}
                onClick={() => setSelectedApp(app)}
                style={{
                  padding: "1rem",
                  borderRadius: "12px",
                  background: selectedApp?.id === app.id ? "rgba(59, 130, 246, 0.15)" : "rgba(30, 41, 59, 0.4)",
                  border: `1px solid ${selectedApp?.id === app.id ? "rgba(59, 130, 246, 0.4)" : "rgba(255, 255, 255, 0.05)"}`,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600, color: "#f8fafc" }}>{app.app_name}</span>
                  <span style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "6px",
                    background: app.environment === "PRODUCTION" ? "rgba(16, 185, 129, 0.2)" : "rgba(234, 179, 8, 0.2)",
                    color: app.environment === "PRODUCTION" ? "#34d399" : "#facc15"
                  }}>
                    {app.environment}
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{app.organization_name}</div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Selected App Workspace */}
        {selectedApp ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* App Overview Card */}
            <div style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "1.5rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 0.25rem 0" }}>{selectedApp.app_name}</h3>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>
                    Client ID: <code style={{ background: "rgba(0,0,0,0.3)", padding: "0.2rem 0.4rem", borderRadius: "4px", color: "#38bdf8" }}>{selectedApp.client_id}</code>
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => setShowKeyModal(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      background: "rgba(59, 130, 246, 0.2)",
                      color: "#60a5fa",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      borderRadius: "8px",
                      padding: "0.5rem 0.9rem",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <Key size={16} /> Generate API Key
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginTop: "1rem" }}>
                <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "0.8rem", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>CATEGORY</div>
                  <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.9rem" }}>{selectedApp.app_category}</div>
                </div>
                <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "0.8rem", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>CONTACT EMAIL</div>
                  <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.9rem" }}>{selectedApp.developer_email}</div>
                </div>
                <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "0.8rem", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>RATE LIMIT</div>
                  <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.9rem" }}>{selectedApp.rate_limit_per_minute} req/min</div>
                </div>
                <div style={{ background: "rgba(30, 41, 59, 0.4)", padding: "0.8rem", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>STATUS</div>
                  <div style={{ fontWeight: 600, color: "#34d399", fontSize: "0.9rem" }}>{selectedApp.status}</div>
                </div>
              </div>
            </div>

            {/* API Keys Table */}
            <div style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "1.5rem"
            }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Key size={18} color="#60a5fa" /> Active API Keys
              </h3>
              {apiKeys.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No API keys created for this app yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {apiKeys.map((k) => (
                    <div
                      key={k.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.9rem",
                        borderRadius: "10px",
                        background: "rgba(30, 41, 59, 0.4)",
                        border: "1px solid rgba(255, 255, 255, 0.05)"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: "#f8fafc", fontSize: "0.95rem" }}>{k.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          Prefix: <code style={{ color: "#38bdf8" }}>{k.key_prefix}...</code> | Created: {k.created_at ? new Date(k.created_at).toLocaleDateString() : "Active"}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <span style={{
                          fontSize: "0.75rem",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "6px",
                          background: k.is_active ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                          color: k.is_active ? "#34d399" : "#f87171"
                        }}>
                          {k.is_active ? "ACTIVE" : "REVOKED"}
                        </span>
                        {k.is_active && (
                          <button
                            onClick={() => handleRevokeKey(k.id)}
                            style={{
                              background: "rgba(239, 68, 68, 0.15)",
                              color: "#f87171",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              padding: "0.4rem 0.75rem",
                              borderRadius: "6px",
                              fontSize: "0.8rem",
                              cursor: "pointer"
                            }}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Webhooks Section */}
            <div style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "1.5rem"
            }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Webhook size={18} color="#a78bfa" /> Real-time Webhook Listeners
              </h3>
              {webhooks.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No webhook event listeners subscribed.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {webhooks.map((w) => (
                    <div
                      key={w.id}
                      style={{
                        padding: "1rem",
                        borderRadius: "10px",
                        background: "rgba(30, 41, 59, 0.4)",
                        border: "1px solid rgba(255, 255, 255, 0.05)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <code style={{ color: "#a78bfa", fontSize: "0.9rem" }}>{w.target_url}</code>
                        <span style={{ fontSize: "0.75rem", color: "#34d399", background: "rgba(16, 185, 129, 0.15)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                          LISTENING
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        {Array.isArray(w.subscribed_events) && w.subscribed_events.map((ev) => (
                          <span key={ev} style={{ background: "rgba(255, 255, 255, 0.05)", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.75rem", color: "#94a3b8" }}>
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "#64748b" }}>
            Select an app to view credentials and webhooks.
          </div>
        )}
      </div>

      {/* Register App Modal */}
      {showRegisterModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "16px",
            padding: "2rem", width: "480px", maxWidth: "90%"
          }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 1rem 0" }}>Register Third-Party Developer App</h3>
            <form onSubmit={handleRegisterApp} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Application Name</label>
                <input
                  type="text"
                  required
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  placeholder="e.g. CarePulse RPM Assistant"
                  style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Developer Organization</label>
                <input
                  type="text"
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g. HealthTech Global Solutions Ltd"
                  style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Contact Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. api-admin@healthtech.com"
                  style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>App Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff" }}
                >
                  <option value="HOSPITAL_INTEGRATION">Hospital EHR Integration</option>
                  <option value="TELEMEDICINE">Telemedicine & Virtual Care</option>
                  <option value="WEARABLE_APP">Wearable IoT & RPM Stream</option>
                  <option value="INSURANCE_PAYER">Global Payer Clearinghouse</option>
                  <option value="AI_INTELLIGENCE">Clinical AI & Decision Support</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  style={{ padding: "0.6rem 1.2rem", background: "transparent", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#94a3b8", borderRadius: "8px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "0.6rem 1.2rem", background: "#3b82f6", border: "none", color: "#fff", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
                >
                  Register Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Key Modal / Display Token */}
      {showKeyModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "16px",
            padding: "2rem", width: "480px", maxWidth: "90%"
          }}>
            {!createdRawKey ? (
              <>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 1rem 0" }}>Generate Live API Key</h3>
                <form onSubmit={handleCreateKey} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>Key Description / Name</label>
                    <input
                      type="text"
                      required
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g. Production Cluster Gateway"
                      style={{ width: "100%", padding: "0.6rem", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#fff" }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                    <button
                      type="button"
                      onClick={() => setShowKeyModal(false)}
                      style={{ padding: "0.6rem 1.2rem", background: "transparent", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#94a3b8", borderRadius: "8px", cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{ padding: "0.6rem 1.2rem", background: "#3b82f6", border: "none", color: "#fff", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Generate Key
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#34d399", marginBottom: "0.5rem" }}>
                  <CheckCircle2 size={24} />
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>API Key Generated!</h3>
                </div>
                <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "0 0 1rem 0" }}>
                  Please save this key securely. For your protection, you won't be able to view this raw key again.
                </p>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "rgba(0,0,0,0.4)", padding: "0.8rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "1.5rem"
                }}>
                  <code style={{ color: "#38bdf8", fontSize: "0.85rem", wordBreak: "break-all" }}>{createdRawKey}</code>
                  <button
                    onClick={() => copyToClipboard(createdRawKey, "modal-key")}
                    style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", marginLeft: "0.5rem" }}
                  >
                    {copiedKey === "modal-key" ? <Check size={18} color="#34d399" /> : <Copy size={18} />}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setCreatedRawKey(null);
                    setShowKeyModal(false);
                  }}
                  style={{ width: "100%", padding: "0.7rem", background: "#3b82f6", border: "none", color: "#fff", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
