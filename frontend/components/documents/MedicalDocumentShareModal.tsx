"use client";

import React, { useState, useEffect } from "react";
import {
  MedicalDocument,
  DocumentShare,
  medicalDocumentsAPI
} from "@/lib/api/documents";
import {
  X,
  Share2,
  Copy,
  Check,
  Clock,
  Shield,
  Trash2,
  ExternalLink,
  User,
  AlertCircle
} from "lucide-react";

interface MedicalDocumentShareModalProps {
  document: MedicalDocument | null;
  patientId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MedicalDocumentShareModal: React.FC<MedicalDocumentShareModalProps> = ({
  document,
  patientId,
  isOpen,
  onClose
}) => {
  const [recipientName, setRecipientName] = useState<string>("");
  const [durationHours, setDurationHours] = useState<number>(24);
  const [accessLevel, setAccessLevel] = useState<"VIEW_ONLY" | "ALLOW_DOWNLOAD">("VIEW_ONLY");
  const [createdShare, setCreatedShare] = useState<DocumentShare | null>(null);
  const [existingShares, setExistingShares] = useState<DocumentShare[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && document) {
      setRecipientName("");
      setDurationHours(24);
      setAccessLevel("VIEW_ONLY");
      setCreatedShare(null);
      setError(null);
      loadExistingShares();
    }
  }, [isOpen, document]);

  const loadExistingShares = async () => {
    if (!document) return;
    try {
      const res = await medicalDocumentsAPI.listDocumentShares(document.id, patientId);
      setExistingShares(res.data || []);
    } catch (e: any) {
      console.error("Failed to load existing document shares", e);
    }
  };

  if (!isOpen || !document) return null;

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await medicalDocumentsAPI.shareDocument(
        document.id,
        {
          recipient_name: recipientName.trim() || "Consulting Specialist",
          duration_hours: durationHours,
          access_level: accessLevel
        },
        patientId
      );
      setCreatedShare(res.data);
      setExistingShares((prev) => [
        { ...res.data, status: "ACTIVE" },
        ...prev.filter((p) => p.id !== res.data.id)
      ]);
      await loadExistingShares();
    } catch (err: any) {
      setError(err?.message || "Failed to generate secure document share link.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      await medicalDocumentsAPI.revokeDocumentShare(shareId, patientId, "Revoked by patient");
      if (createdShare?.id === shareId) {
        setCreatedShare(null);
      }
      loadExistingShares();
    } catch (err: any) {
      alert("Failed to revoke share link: " + (err?.message || "Unknown error"));
    }
  };

  const getShareUrl = (token: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/share/document/${token}`;
    }
    return `/share/document/${token}`;
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Secure Document Sharing
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                {document.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Generated Share Banner */}
          {createdShare && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  Secure Link Ready
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Expires in {durationHours} hours
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getShareUrl(createdShare.share_token)}
                  className="w-full text-xs font-mono bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none"
                />
                <button
                  type="button"
                  data-testid="copy-share-token-btn"
                  onClick={() => handleCopyLink(getShareUrl(createdShare.share_token))}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* Share Generation Form */}
          <form onSubmit={handleCreateShare} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recipient / Doctor Name (Optional)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. Dr. Senthil Nathan (Cardiology)"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Link Expiration
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 Hour</option>
                    <option value={24}>24 Hours (1 Day)</option>
                    <option value={168}>7 Days</option>
                    <option value={720}>30 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Access Permission
                </label>
                <select
                  value={accessLevel}
                  onChange={(e) =>
                    setAccessLevel(e.target.value as "VIEW_ONLY" | "ALLOW_DOWNLOAD")
                  }
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="VIEW_ONLY">View Only</option>
                  <option value="ALLOW_DOWNLOAD">Allow Download</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              {loading ? "Generating Secure Link..." : "Create Secure Share Link"}
            </button>
          </form>

          {/* Previously Active Shares & Revocation */}
          {existingShares.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                Active & Previous Shares ({existingShares.length})
              </h3>

              <div className="space-y-2">
                {existingShares.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {s.recipient_name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {s.status === "ACTIVE" ? (
                          <span className="text-emerald-600 font-medium">Active</span>
                        ) : (
                          <span className="text-slate-400">{s.status}</span>
                        )}{" "}
                        • {s.access_level === "VIEW_ONLY" ? "View Only" : "Download Allowed"}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {s.status === "ACTIVE" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(getShareUrl(s.share_token))}
                            title="Copy link"
                            className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevokeShare(s.id)}
                            title="Revoke access immediately"
                            className="p-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
