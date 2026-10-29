"use client";

import React, { useState, useEffect } from "react";
import {
  X, Share2, Link as LinkIcon, Copy, Check, Clock,
  Shield, AlertCircle, Trash2, Send, Lock, Eye, DownloadCloud
} from "lucide-react";
import { prescriptionsApi, PrescriptionShare } from "@/lib/api/prescriptions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  prescriptionId: string;
  prescriptionNumber: string;
}

export function PrescriptionShareModal({
  isOpen,
  onClose,
  prescriptionId,
  prescriptionNumber,
}: Props) {
  const [recipientName, setRecipientName] = useState("");
  const [recipientContact, setRecipientContact] = useState("");
  const [accessLevel, setAccessLevel] = useState<"VIEW_ONLY" | "VIEW_AND_DOWNLOAD">("VIEW_ONLY");
  const [durationHours, setDurationHours] = useState<number>(24);
  const [shares, setShares] = useState<PrescriptionShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [newShareUrl, setNewShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadShares = async () => {
    try {
      setLoading(true);
      const res = await prescriptionsApi.listShares(prescriptionId);
      if (res?.data) {
        setShares(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load shares", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && prescriptionId) {
      loadShares();
      setNewShareUrl(null);
      setError(null);
      setRecipientName("");
      setRecipientContact("");
    }
  }, [isOpen, prescriptionId]);

  if (!isOpen) return null;

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      setError(null);
      const res = await prescriptionsApi.createShare(prescriptionId, {
        recipient_name: recipientName.trim() || undefined,
        recipient_contact: recipientContact.trim() || undefined,
        access_level: accessLevel,
        duration_hours: durationHours,
      });

      if (res?.data?.share_url) {
        const fullUrl = `${window.location.origin}${res.data.share_url}`;
        setNewShareUrl(fullUrl);
        await loadShares();
      }
    } catch (err: any) {
      console.error("Failed to create share link", err);
      setError(err?.message || "Failed to create secure share link.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      await prescriptionsApi.revokeShare(shareId);
      await loadShares();
    } catch (err: any) {
      console.error("Failed to revoke share link", err);
    }
  };

  const copyToClipboard = (url: string, token: string) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Share Digital Prescription</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{prescriptionNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Created Box */}
          {newShareUrl && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Secure Share Link Created!</span>
              </div>
              <div className="flex items-center gap-2 bg-white border border-emerald-300/80 rounded-xl p-2">
                <input
                  type="text"
                  readOnly
                  value={newShareUrl}
                  className="bg-transparent text-xs text-slate-800 font-mono flex-1 outline-none px-2 select-all"
                />
                <button
                  onClick={() => copyToClipboard(newShareUrl, "new")}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm"
                >
                  {copiedToken === "new" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedToken === "new" ? "Copied" : "Copy Link"}</span>
                </button>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                This link will automatically expire in {durationHours} hours. You can revoke it anytime below.
              </p>
            </div>
          )}

          {/* Share Creation Form */}
          <form onSubmit={handleCreateShare} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Recipient / Pharmacy Name (Optional)
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. City Care Pharmacy, Dr. Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            {/* Access Permission */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Access Permission
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                    accessLevel === "VIEW_ONLY"
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="accessLevel"
                    value="VIEW_ONLY"
                    checked={accessLevel === "VIEW_ONLY"}
                    onChange={() => setAccessLevel("VIEW_ONLY")}
                    className="sr-only"
                  />
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs">View Online Only</span>
                </label>

                <label
                  className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                    accessLevel === "VIEW_AND_DOWNLOAD"
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="accessLevel"
                    value="VIEW_AND_DOWNLOAD"
                    checked={accessLevel === "VIEW_AND_DOWNLOAD"}
                    onChange={() => setAccessLevel("VIEW_AND_DOWNLOAD")}
                    className="sr-only"
                  />
                  <DownloadCloud className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs">View & Download PDF</span>
                </label>
              </div>
            </div>

            {/* Expiry Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Link Expiration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "1 Hour", hours: 1 },
                  { label: "24 Hours", hours: 24 },
                  { label: "7 Days", hours: 168 },
                  { label: "30 Days", hours: 720 },
                ].map((item) => (
                  <button
                    key={item.hours}
                    type="button"
                    onClick={() => setDurationHours(item.hours)}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-semibold border transition ${
                      durationHours === item.hours
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LinkIcon className="w-4 h-4" />
              <span>{creating ? "Generating Secure Link..." : "Create Secure Share Link"}</span>
            </button>
          </form>

          {/* Active Shares List */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Active Share Links ({shares.filter((s) => s.is_active).length})</span>
            </h4>

            {loading ? (
              <div className="text-center py-4 text-xs text-slate-400">Loading share links...</div>
            ) : shares.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-400">
                No active share links created yet.
              </div>
            ) : (
              <div className="space-y-2">
                {shares.map((s) => {
                  const shareFullUrl = typeof window !== "undefined" ? `${window.location.origin}${s.share_url}` : s.share_url;
                  return (
                    <div
                      key={s.id}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 transition ${
                        s.is_active ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200/60 opacity-60"
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 truncate">
                            {s.recipient_label || "Direct Share Link"}
                          </span>
                          {s.is_active ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              Active
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                              Revoked / Expired
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate">{s.share_token}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {s.is_active && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(shareFullUrl, s.id)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Copy link"
                          >
                            {copiedToken === s.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                        {s.is_active && (
                          <button
                            type="button"
                            onClick={() => handleRevokeShare(s.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Revoke access"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 text-[11px]">
            <Lock className="w-3.5 h-3.5 text-indigo-600" />
            End-to-end access logged & verifiable
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
