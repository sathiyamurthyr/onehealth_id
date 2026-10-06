"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Clock, 
  Trash2, 
  ShieldCheck, 
  ExternalLink,
  AlertCircle,
  Lock
} from "lucide-react";
import { LabReport, LabReportShare, labReportsAPI } from "@/lib/api/lab-reports";

interface LabReportShareModalProps {
  report: LabReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LabReportShareModal: React.FC<LabReportShareModalProps> = ({
  report,
  isOpen,
  onClose,
}) => {
  const [recipientName, setRecipientName] = useState("");
  const [durationHours, setDurationHours] = useState(24);
  const [accessLevel, setAccessLevel] = useState<"VIEW_ONLY" | "VIEW_AND_DOWNLOAD">("VIEW_ONLY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdShare, setCreatedShare] = useState<LabReportShare | null>(null);
  const [copied, setCopied] = useState(false);
  const [existingShares, setExistingShares] = useState<LabReportShare[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);

  useEffect(() => {
    if (isOpen && report) {
      setCreatedShare(null);
      setCopied(false);
      setError(null);
      loadShares(report.id);
    }
  }, [isOpen, report]);

  const loadShares = async (reportId: string) => {
    try {
      setLoadingShares(true);
      const res = await labReportsAPI.listShares(reportId);
      if (res.success && res.data) {
        setExistingShares(res.data);
      }
    } catch (e: any) {
      console.error("Failed to load lab report shares", e);
    } finally {
      setLoadingShares(false);
    }
  };

  if (!isOpen || !report) return null;

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await labReportsAPI.createShare(report.id, {
        recipient_name: recipientName || "Consulting Specialist",
        duration_hours: durationHours,
        access_level: accessLevel,
      });

      if (res.success && res.data) {
        setCreatedShare(res.data);
        await loadShares(report.id);
      } else {
        setError("Failed to create secure share link. Please try again.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to generate share link.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    try {
      await labReportsAPI.revokeShare(shareId, "Revoked by patient");
      await loadShares(report.id);
      if (createdShare?.id === shareId) {
        setCreatedShare(null);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to revoke share link.");
    }
  };

  const getFullShareUrl = (token: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/share/lab-report/${token}`;
    }
    return `/share/lab-report/${token}`;
  };

  const handleCopy = (token: string) => {
    const url = getFullShareUrl(token);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-labelledby="share-modal-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 rounded-xl">
            <Share2 className="h-6 w-6" />
          </div>
          <div>
            <h2 id="share-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
              Create Secure Share Link
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {report.test_name} · {report.laboratory?.name || report.hospital_name}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success / Created Banner */}
        {createdShare ? (
          <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50/70 dark:bg-teal-950/30 dark:border-teal-800 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-teal-600" />
                Active Time-Limited Link Generated
              </span>
              <span className="text-[11px] text-teal-700 dark:text-teal-300 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Expires in {durationHours}h
              </span>
            </div>
            
            <div className="flex items-center gap-2 mt-3 bg-white dark:bg-slate-900 p-2 rounded-lg border border-teal-200 dark:border-teal-800">
              <input
                type="text"
                readOnly
                value={getFullShareUrl(createdShare.share_token)}
                className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-200 font-mono focus:outline-none"
              />
              <button
                onClick={() => handleCopy(createdShare.share_token)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-medium transition-colors shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-teal-800/80 dark:text-teal-300/80 mt-2">
              Anyone with this cryptographic link can securely view this report. You can revoke it anytime below.
            </p>
          </div>
        ) : (
          /* Create Form */
          <form onSubmit={handleCreateShare} className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Recipient or Clinician Name (Optional)
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Dr. Arun Kumar, Cardiology"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Link Expiration
                </label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value={1}>1 Hour (Immediate Consultation)</option>
                  <option value={24}>24 Hours (Standard)</option>
                  <option value={168}>7 Days (Extended Second Opinion)</option>
                  <option value={720}>30 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Access Permission
                </label>
                <select
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="VIEW_ONLY">View Report Only</option>
                  <option value="VIEW_AND_DOWNLOAD">View & Download Original PDF</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Generating Secure Link...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Create Secure Link
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Existing Shares Section */}
        <div className="pt-5 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Active & Past Share Links
          </h3>

          {loadingShares ? (
            <div className="py-4 text-center text-xs text-slate-400">Loading share links...</div>
          ) : existingShares.length === 0 ? (
            <div className="py-3 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              No previous share links for this report.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {existingShares.map((s) => {
                const isRevoked = Boolean(s.revoked_at);
                const isExpired = new Date(s.expires_at) < new Date();
                const isActive = !isRevoked && !isExpired;

                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                      isActive
                        ? "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                        : "bg-slate-100/50 dark:bg-slate-800/20 border-slate-200/50 opacity-60"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {s.recipient_name || "Shared Recipient"}
                        </span>
                        {isActive ? (
                          <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        ) : isRevoked ? (
                          <span className="bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            Revoked
                          </span>
                        ) : (
                          <span className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            Expired
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Expires: {new Date(s.expires_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isActive && (
                        <>
                          <button
                            onClick={() => handleCopy(s.share_token)}
                            className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Copy link"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleRevoke(s.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Revoke access immediately"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
