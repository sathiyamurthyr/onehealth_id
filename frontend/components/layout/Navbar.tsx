"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Search,
  Bell,
  LogOut,
  Building2,
  Menu,
  X,
  User,
  Shield,
  QrCode
} from "lucide-react";
import { api } from "@/lib/api";
import { UserProfile } from "@/lib/types";
import { Badge, Button } from "@/components/ui/Card";

interface NavbarProps {
  onOpenMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileMenu, isMobileMenuOpen }) => {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrInput, setQrInput] = useState("");
  const [qrVerifying, setQrVerifying] = useState(false);
  const [qrError, setQrError] = useState("");

  useEffect(() => {
    const currentUser = api.auth.getCurrentUser();
    setUser(currentUser);
  }, []);

  const handleLogout = () => {
    api.auth.logout();
    router.push("/login");
  };

  const handleQuickQRScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) return;
    setQrVerifying(true);
    setQrError("");

    try {
      const patient = await api.patients.verifyQr(qrInput.trim());
      setShowQRModal(false);
      setQrInput("");
      router.push(`/patients/${patient.id}`);
    } catch (err: any) {
      setQrError(err.message || "Invalid or unverified OneHealth QR Token");
    } finally {
      setQrVerifying(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-3 sm:px-6 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        {/* Brand & Hospital Badge */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            aria-label="Toggle Navigation Drawer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/dashboard" className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  ONEHEALTH
                </span>
                <span className="text-[10px] sm:text-xs font-black tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1 sm:px-1.5 py-0.5 rounded">
                  ID
                </span>
              </div>
              <span className="hidden sm:block text-[11px] font-medium text-slate-400">
                Hospital Operating System
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {user?.hospital_name || "Kedar Hospital"}
            </span>
            <Badge variant="primary" className="text-[10px] py-0 px-2">
              Mugalivakkam, Chennai
            </Badge>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Scan OneHealth QR Button */}
          <button
            onClick={() => setShowQRModal(true)}
            className="flex items-center justify-center p-2 sm:px-3 sm:py-2 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-900 transition-colors min-h-[44px] min-w-[44px]"
            title="Scan or Verify OneHealth ID QR Token"
            aria-label="Scan OneHealth ID"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Scan OneHealth ID</span>
          </button>

          {/* User Profile Pill */}
          {user ? (
            <div className="flex items-center gap-1 sm:gap-3 pl-1 sm:pl-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {user.name}
                </span>
                <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  {user.role}
                </span>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm shrink-0">
                {user.name ? user.name.charAt(0) : "U"}
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                title="Sign Out"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/login")}
            >
              Staff Login
            </Button>
          )}
        </div>
      </header>

      {/* OneHealth QR Scanner / Lookup Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-xl">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Scan / Enter OneHealth ID
                  </h3>
                  <p className="text-xs text-slate-500">
                    Resolve digital healthcare token across hospitals
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickQRScan} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  OneHealth Token or ID (e.g. OHID-IND-2026-01001 or QR Token)
                </label>
                <input
                  type="text"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="Paste QR token or OHID-IND-..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {qrError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900">
                  {qrError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowQRModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={qrVerifying || !qrInput.trim()}
                >
                  {qrVerifying ? "Verifying Token..." : "Resolve Identity"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
