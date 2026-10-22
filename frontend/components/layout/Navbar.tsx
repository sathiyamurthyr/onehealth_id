"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  QrCode,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Loader2,
  Stethoscope,
  HeartPulse,
  Users
} from "lucide-react";
import { api } from "@/lib/api";
import { UserProfile } from "@/lib/types";
import { Badge, Button } from "@/components/ui/Card";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";

interface NavbarProps {
  onOpenMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileMenu, isMobileMenuOpen }) => {
  const router = useRouter();
  const { workspace, availableWorkspaces, switchContext } = useWorkspace();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrInput, setQrInput] = useState("");
  const [qrVerifying, setQrVerifying] = useState(false);
  const [qrError, setQrError] = useState("");

  // In-session Workspace Switching State
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchingIdx, setSwitchingIdx] = useState<number | null>(null);

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

  const handleSwitchWorkspace = async (ws: any, idx: number) => {
    setSwitchingIdx(idx);
    try {
      const success = await switchContext({
        hospital_ref_id: ws.hospital_ref_id,
        usertype_ref_id: ws.usertype_ref_id,
        role_code: ws.role_code,
        department_id: ws.department_id,
      });
      if (success) {
        setShowSwitchModal(false);
        const targetRoute = ws.default_route || "/dashboard";
        router.push(targetRoute);
      }
    } catch (err) {
      console.error("Failed to switch workspace context:", err);
    } finally {
      setSwitchingIdx(null);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-3 sm:px-6 backdrop-blur">
        {/* Brand & Hospital Badge */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            aria-label="Toggle Navigation Drawer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/dashboard" className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white border border-slate-200 p-1 text-white shadow-xs shrink-0 overflow-hidden">
              <Image
                src="/images/oh-id-logo.png"
                alt="One Health ID"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900">
                  ONEHEALTH ID
                </span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                  v1.0
                </span>
              </div>
              <span className="hidden sm:block text-[10px] font-semibold text-blue-600">
                Powered by Sathus Technology Pvt Ltd
              </span>
            </div>
          </Link>

          {/* Active Facility Context & In-Session Switcher */}
          <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-200 text-xs text-slate-500">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold text-slate-700 truncate max-w-[180px]">
              {workspace?.hospital_name || user?.hospital_name || "Healthcare Facility"}
            </span>
            <Badge variant="primary" className="text-[10px] py-0 px-2">
              {workspace?.branch_name || "Main Campus"}
            </Badge>

            {/* In-Session Multi-Role Switcher Pill */}
            {availableWorkspaces && availableWorkspaces.length > 1 && (
              <button
                type="button"
                onClick={() => setShowSwitchModal(true)}
                className="ml-2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-[11px] transition shadow-2xs cursor-pointer"
                title="Switch Workspace Context"
              >
                <span>Switch Workspace</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Mobile Switch Workspace button if multiple workspaces */}
          {availableWorkspaces && availableWorkspaces.length > 1 && (
            <button
              onClick={() => setShowSwitchModal(true)}
              className="md:hidden flex items-center justify-center p-2 text-xs font-semibold rounded-xl bg-blue-50 text-blue-700 border border-blue-200 min-h-[44px] min-w-[44px]"
              title="Switch Workspace"
            >
              <Users className="w-4 h-4" />
            </button>
          )}

          {/* Scan OneHealth QR Button */}
          <button
            onClick={() => setShowQRModal(true)}
            className="flex items-center justify-center p-2 sm:px-3 sm:py-2 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors min-h-[44px] min-w-[44px]"
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
                <span className="text-xs font-bold text-slate-800">
                  {user.name}
                </span>
                <span className="text-[10px] font-medium text-blue-600 uppercase tracking-wide">
                  {workspace?.role_name || user.role}
                </span>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm shrink-0">
                {user.name ? user.name.charAt(0) : "U"}
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
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

      {/* ── In-Session "Select Your Workspace" Modal ── */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 relative overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Switch Workspace Context
                  </h3>
                  <p className="text-xs text-slate-500">
                    Choose which authorized workspace to enter for this session.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 py-1">
              {availableWorkspaces.map((ws, idx) => {
                const isCurrent =
                  ws.hospital_ref_id === workspace?.hospital_ref_id &&
                  (ws.role_code === workspace?.role_code || ws.usertype_ref_id === workspace?.role_code);
                const isSwitching = switchingIdx === idx;

                return (
                  <div
                    key={`${ws.hospital_ref_id}-${ws.role_code}-${idx}`}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isCurrent
                        ? "bg-blue-50/70 border-blue-300 ring-1 ring-blue-400"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-semibold text-slate-500 block">
                        {ws.category_title || "Healthcare Workspace"}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {ws.role_name || ws.role_code}
                      </h4>
                      <p className="text-xs text-slate-600 truncate mt-0.5">
                        <strong className="font-semibold text-slate-800">{ws.hospital_name}</strong>
                        {ws.department_name && <span> • {ws.department_name}</span>}
                        {ws.branch_name && !ws.department_name && <span> • {ws.branch_name}</span>}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {isCurrent ? (
                        <span className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-2xs">
                          Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={switchingIdx !== null}
                          onClick={() => handleSwitchWorkspace(ws, idx)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                          {isSwitching ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <span>Switch</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* OneHealth QR Scanner / Lookup Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white  p-6 shadow-2xl border border-slate-200 ">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 ">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50  text-blue-600 rounded-xl">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 ">
                    Scan / Enter OneHealth ID
                  </h3>
                  <p className="text-xs text-slate-500">
                    Resolve digital healthcare token across hospitals
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 "
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickQRScan} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700  block mb-1">
                  OneHealth Token or ID (e.g. OHID-IND-2026-01001 or QR Token)
                </label>
                <input
                  type="text"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="Paste QR token or OHID-IND-..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300  bg-white  text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {qrError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50  rounded-xl border border-rose-200 ">
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
