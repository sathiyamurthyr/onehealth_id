"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { useSidebar } from "@/lib/workspace/SidebarContext";
import { FamilySwitcher } from "./FamilySwitcher";
import { cn } from "@/lib/utils";
import { 
  Hospital, Building, LogOut, ChevronDown, Check, MoreHorizontal, X, ChevronRight,
  PanelLeftClose, PanelLeftOpen, Search, Star, CornerDownLeft
} from "lucide-react";
import { resolveNavigationIcon } from "@/design-system/icons";
import { useFamily } from "@/lib/patient/FamilyContext";

// Root workspace landing hubs that must only match when the path is an exact match
const ROOT_LANDING_ROUTES = new Set([
  "/patient",
  "/doctor",
  "/hospital",
  "/super-admin",
  "/dashboard",
]);

// Explicit child-to-parent route mapping for aliases and nested screens
const EXPLICIT_NESTED_PARENTS: Record<string, string> = {
  "/patient/health-timeline": "/patient/timeline",
  "/patient/id-card": "/patient/onehealth-id",
  "/patient/receipts": "/patient/bills",
  "/patient/data-sharing": "/patient/consent",
  "/patient/connections": "/patient/consent",
  "/patient/access-history": "/patient/consent",
  "/patient/settings": "/patient/profile",
};

export function DynamicNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { workspace, user, navigation, availableHospitals, availableWorkspaces, switchContext, logout } = useWorkspace();
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen, closeMobile } = useSidebar();
  const { familyMembers, isLoading: familyLoading, error: familyError, refreshFamily } = useFamily();

  // Modal / Dropdown states
  const [showHospDropdown, setShowHospDropdown] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchingIdx, setSwitchingIdx] = useState<number | null>(null);

  // Enterprise Search & Favourites States
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isCollapsedSearchOpen, setIsCollapsedSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const collapsedSearchInputRef = useRef<HTMLInputElement>(null);

  // Favourites state with safe localStorage persistence
  const [favourites, setFavourites] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("oh_patient_favourite_nav");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // Storage restricted or unavailable
      }
    }
    // Default helpful favourite shortcuts for patient ease of access
    return ["/patient/appointments", "/patient/records"];
  });

  const toggleFavourite = useCallback((href: string) => {
    setFavourites((prev) => {
      const next = prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href];
      try {
        localStorage.setItem("oh_patient_favourite_nav", JSON.stringify(next));
      } catch {
        // Storage restricted or unavailable
      }
      return next;
    });
  }, []);

  if (!workspace || !user) return null;

  const isPatient = workspace.workspace_type === "PATIENT";

  // Filter navigation items by search query (case-insensitive on title or section)
  const filteredNavItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return navigation;
    return navigation.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.section && item.section.toLowerCase().includes(q))
    );
  }, [navigation, searchQuery]);

  // Authorized Favourite Items (guaranteed to match current authorized navigation only)
  const favouriteNavItems = useMemo(() => {
    return navigation.filter((item) => favourites.includes(item.href));
  }, [navigation, favourites]);

  // Global keyboard shortcut to focus or open menu search (/ or Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (!isInput && (e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k"))) {
        e.preventDefault();
        if (isCollapsed) {
          setIsCollapsedSearchOpen(true);
        } else {
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isCollapsed]);

  // Auto-focus input when collapsed search modal opens
  useEffect(() => {
    if (isCollapsedSearchOpen) {
      const timer = setTimeout(() => {
        collapsedSearchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isCollapsedSearchOpen]);

  // Handle keyboard navigation inside search inputs (ArrowUp, ArrowDown, Enter, Escape)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (filteredNavItems.length ? (prev + 1) % filteredNavItems.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredNavItems.length ? (prev - 1 + filteredNavItems.length) % filteredNavItems.length : 0
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredNavItems.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredNavItems.length) {
        const target = filteredNavItems[highlightedIndex];
        router.push(target.href);
        if (isMobileOpen) closeMobile();
        if (isCollapsedSearchOpen) setIsCollapsedSearchOpen(false);
        setSearchQuery("");
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSearchQuery("");
      if (isCollapsedSearchOpen) {
        setIsCollapsedSearchOpen(false);
      }
    }
  };

  // Dedicated badge resolver for navigation items with database-backed dynamic family count
  const renderNavBadge = (item: { href: string; badge?: string | null }, isActive: boolean, isTooltip: boolean = false) => {
    const isFamilyNav = isPatient && item.href === "/patient/family";

    if (isFamilyNav) {
      if (familyLoading) {
        if (isTooltip) {
          return (
            <span 
              aria-label="Loading family count"
              className="text-[10px] bg-slate-700 text-white px-2 py-0.5 rounded-full font-mono animate-pulse"
            >
              ...
            </span>
          );
        }
        return (
          <span
            id="family-nav-badge-loading"
            aria-label="Loading family count"
            className="ml-auto flex items-center justify-center min-w-[24px] px-2 py-0.5 text-xs rounded-full border bg-slate-100 text-slate-400 border-slate-200 font-mono animate-pulse"
          >
            ...
          </span>
        );
      }

      if (familyError) {
        if (isTooltip) {
          return (
            <span 
              title={`Family API error: ${familyError}`}
              className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-bold"
            >
              !
            </span>
          );
        }
        return (
          <span
            id="family-nav-badge-error"
            title={`Failed to load family members: ${familyError}. Click to retry.`}
            aria-label="Error loading family count"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              refreshFamily();
            }}
            className="ml-auto cursor-pointer flex items-center justify-center min-w-[24px] px-2 py-0.5 text-xs rounded-full border bg-rose-100 text-rose-700 border-rose-300 font-bold hover:bg-rose-200 transition"
          >
            !
          </span>
        );
      }

      // Authoritative count from actual familyMembers returned by API
      const dynamicCount = familyMembers.length.toString();
      if (isTooltip) {
        return (
          <span className="text-[10px] bg-[#155EEF] text-white px-2 py-0.5 rounded-full font-mono font-bold">
            {dynamicCount}
          </span>
        );
      }
      return (
        <span
          id="family-nav-badge"
          data-count={dynamicCount}
          className={cn(
            "ml-auto text-xs px-2 py-0.5 rounded-full border font-mono font-bold transition-colors min-w-[24px] text-center",
            isActive
              ? "bg-white/20 text-white border-white/30"
              : "bg-slate-100 text-slate-700 border-slate-200"
          )}
        >
          {dynamicCount}
        </span>
      );
    }

    // Default badge for non-family items
    if (!item.badge) return null;

    if (isTooltip) {
      return (
        <span className="text-[10px] bg-[#155EEF] text-white px-2 py-0.5 rounded-full font-mono font-bold">
          {item.badge}
        </span>
      );
    }

    return (
      <span
        className={cn(
          "ml-auto text-xs px-2 py-0.5 rounded-full border font-semibold min-w-[24px] text-center",
          isActive
            ? "bg-white/20 text-white border-white/30"
            : "bg-slate-100 text-slate-700 border-slate-200"
        )}
      >
        {item.badge}
      </span>
    );
  };

  const roleColors: Record<string, { bg: string; text: string; border: string }> = {
    SUPER_ADMIN: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
    HOSPITAL_ADMIN: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
    DOCTOR: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300" },
    NURSE: { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-300" },
    EMPLOYEE: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" },
    PATIENT: { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-300" },
    OTHER: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
  };

  const badgeStyle = roleColors[workspace.workspace_type] || roleColors.OTHER;

  // Canonical active route determination: strictly guarantees exactly one active route match
  const activeNavHref = useMemo(() => {
    if (!pathname) return null;
    const normalizedPath = pathname.replace(/\/+$/, "") || "/";

    // 1. Strict exact match against configured navigation items
    const exact = navigation.find((item) => item.href.replace(/\/+$/, "") === normalizedPath);
    if (exact) return exact.href;

    // 2. Explicit nested alias / parent mapping
    const explicitParent = EXPLICIT_NESTED_PARENTS[normalizedPath];
    if (explicitParent && navigation.some((item) => item.href === explicitParent)) {
      return explicitParent;
    }

    // 3. Child route matching for non-root navigation items (e.g. /patient/appointments/123 -> /patient/appointments)
    // Root landing hubs (/patient, /doctor, /hospital, etc.) are strictly excluded to avoid broad prefix hijacking
    const eligibleParents = navigation.filter(
      (item) => !ROOT_LANDING_ROUTES.has(item.href.replace(/\/+$/, ""))
    );

    let bestMatch: string | null = null;
    let longestPrefix = 0;

    for (const item of eligibleParents) {
      const cleanHref = item.href.replace(/\/+$/, "");
      if (cleanHref && normalizedPath.startsWith(cleanHref + "/")) {
        if (cleanHref.length > longestPrefix) {
          longestPrefix = cleanHref.length;
          bestMatch = item.href;
        }
      }
    }

    return bestMatch;
  }, [pathname, navigation]);

  // Helper to test if a route is the single active menu item
  const isRouteActive = useCallback((href: string) => {
    return href === activeNavHref;
  }, [activeNavHref]);

  // Patient mobile bottom 4 primary tabs + More
  const patientMobileTabs = [
    { title: "Home", href: "/patient", icon: "LayoutDashboard" },
    { title: "Visits", href: "/patient/visits", icon: "Clock" },
    { title: "Appts", href: "/patient/appointments", icon: "Calendar" },
    { title: "Health", href: "/patient/timeline", icon: "History" },
    { title: "Profile", href: "/patient/profile", icon: "User" },
  ];

  return (
    <>
      {/* =========================================================================
          Desktop Sidebar (lg and up): Collapsible & Expandable with Search & Favourites
          ========================================================================= */}
      <aside
        id="desktop-workspace-sidebar"
        aria-label="Workspace Navigation Sidebar"
        className={cn(
          "hidden lg:flex flex-col bg-white border-r border-slate-200 text-slate-700 min-h-screen sticky top-0 z-40 select-none transition-all duration-300 ease-in-out motion-reduce:transition-none shrink-0",
          isCollapsed ? "w-20" : "w-72"
        )}
      >
        {/* Brand & Organization Header */}
        <div
          className={cn(
            "border-b transition-all duration-300 relative",
            isPatient
              ? "bg-gradient-to-b from-[#155EEF] via-[#144ecc] to-[#123B75] text-white border-[#123B75]/40 shadow-sm"
              : "bg-white border-slate-200 text-slate-900",
            isCollapsed ? "p-3 flex flex-col items-center justify-center gap-2" : "p-4 sm:p-5"
          )}
        >
          {isCollapsed ? (
            /* Collapsed State Header: Prominent Logo, Expand Toggle, Collapsed Search, Compact Identity */
            <div className="flex flex-col items-center gap-2 w-full">
              {/* Prominent Visible Logo (Clickable Link to Home) */}
              <Link
                href="/"
                id="sidebar-brand-logo-collapsed"
                title="Go to OneHealth ID Home"
                aria-label="OneHealth ID Home"
                className={cn(
                  "w-11 h-11 rounded-xl bg-white ring-2 ring-white/90 shadow-md flex items-center justify-center p-1 shrink-0 overflow-hidden cursor-pointer",
                  "hover:ring-white hover:scale-105 active:scale-95 transition-all",
                  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2",
                  isPatient ? "focus-visible:ring-offset-[#155EEF]" : "focus-visible:ring-offset-slate-900"
                )}
              >
                <Image
                  src="/images/oh-id-logo.png"
                  alt="One Health ID"
                  width={40}
                  height={40}
                  priority
                  className="w-full h-full object-contain filter drop-shadow-2xs"
                />
              </Link>

              {/* Expand Toggle Button */}
              <button
                type="button"
                id="btn-sidebar-expand"
                onClick={() => setIsCollapsed(false)}
                title="Expand sidebar"
                aria-label="Expand sidebar"
                className={cn(
                  "p-1.5 rounded-lg transition-colors focus:outline-hidden focus:ring-2 shrink-0",
                  isPatient
                    ? "text-blue-100 hover:text-white hover:bg-white/20 focus:ring-white"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:ring-blue-500"
                )}
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>

              {/* Collapsed Search Icon Button */}
              <button
                type="button"
                id="btn-collapsed-search"
                onClick={() => {
                  setIsCollapsedSearchOpen(true);
                  setSearchQuery("");
                  setHighlightedIndex(0);
                }}
                title="Search menu (/)"
                aria-label="Search navigation menu"
                className={cn(
                  "p-1.5 rounded-lg transition-colors focus:outline-hidden focus:ring-2 shrink-0 relative group",
                  isPatient
                    ? "text-blue-100 hover:text-white hover:bg-white/20 focus:ring-white"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:ring-blue-500"
                )}
              >
                <Search className="w-5 h-5" />
                <div className="pointer-events-none absolute left-full ml-3 z-50 hidden group-hover:flex items-center">
                  <div className="bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                    Search menu (/)
                  </div>
                </div>
              </button>

              {/* Compact Patient Identity Switcher */}
              {isPatient && (
                <div className="w-full flex justify-center mt-1">
                  <FamilySwitcher compact={true} variant="header" />
                </div>
              )}
            </div>
          ) : (
            /* Expanded State Header: Full Branding, Title, Version, Subtitle, Collapse Button & Identity Card */
            <>
              <div className="flex items-center justify-between gap-2 mb-3.5">
                <Link
                  href="/"
                  id="sidebar-brand-link"
                  title="Go to OneHealth ID Home"
                  aria-label="OneHealth ID Home"
                  className={cn(
                    "group/brand flex items-center gap-3 min-w-0 rounded-xl p-1 -m-1 transition-all cursor-pointer",
                    "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2",
                    isPatient
                      ? "focus-visible:ring-white focus-visible:ring-offset-[#155EEF]"
                      : "focus-visible:ring-[#155EEF] focus-visible:ring-offset-white"
                  )}
                >
                  {/* Prominent High-Visibility Logo */}
                  <div className="w-12 h-12 rounded-2xl bg-white ring-2 ring-white/90 shadow-md flex items-center justify-center p-1.5 shrink-0 overflow-hidden group-hover/brand:scale-105 group-hover/brand:ring-white group-active/brand:scale-95 transition-all">
                    <Image
                      src="/images/oh-id-logo.png"
                      alt="One Health ID"
                      width={44}
                      height={44}
                      priority
                      className="w-full h-full object-contain filter drop-shadow-2xs"
                    />
                  </div>
                  <div className="truncate min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-extrabold text-[17px] tracking-tight truncate leading-snug group-hover/brand:underline underline-offset-4 decoration-2",
                        isPatient ? "text-white drop-shadow-xs decoration-white/70" : "text-slate-900 decoration-[#155EEF]/70"
                      )}>
                        OneHealth ID
                      </span>
                      <span className={cn(
                        "text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border shadow-xs shrink-0",
                        isPatient
                          ? "bg-white/20 text-white border-white/30 backdrop-blur-xs"
                          : "bg-blue-100 text-blue-700 border-blue-200"
                      )}>
                        v1.0
                      </span>
                    </div>
                    <p className={cn(
                      "text-xs truncate font-medium max-w-[150px] mt-0.5",
                      isPatient ? "text-blue-100/95" : "text-slate-500"
                    )}>
                      {isPatient ? "Personal Health Workspace" : workspace.tenant_name || workspace.hospital_name || "Healthcare Workspace"}
                    </p>
                  </div>
                </Link>

                {/* Collapse Toggle Button */}
                <button
                  type="button"
                  id="btn-sidebar-collapse"
                  onClick={() => setIsCollapsed(true)}
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                  className={cn(
                    "p-1.5 rounded-lg transition-colors focus:outline-hidden focus:ring-2 shrink-0",
                    isPatient
                      ? "text-blue-100 hover:text-white hover:bg-white/20 focus:ring-white"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:ring-blue-500"
                  )}
                >
                  <PanelLeftClose className="w-5 h-5" />
                </button>
              </div>

              {/* Patient Header: Dynamic Family Healthcare Person Switcher */}
              {isPatient ? (
                <div className="mt-2.5">
                  <FamilySwitcher variant="header" />
                </div>
              ) : workspace.workspace_type === "SUPER_ADMIN" ? (
                /* Sathus Platform Super Admin Badge */
                <div className="mt-2 px-3 py-2.5 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                    ST
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-purple-950 truncate">Sathus Platform</p>
                      <span className="px-1 py-0.2 rounded bg-purple-200 text-purple-800 text-[8px] font-black uppercase tracking-wider">
                        SaaS Core
                      </span>
                    </div>
                    <p className="text-[10px] text-purple-600 truncate">Multi-Tenant Governance</p>
                  </div>
                </div>
              ) : workspace.workspace_type === "DOCTOR" ? (
                /* Hospital Context Badge for Doctor */
                <div className="mt-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                  <Hospital className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 truncate">{workspace.hospital_name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{workspace.branch_name || "Main Campus"}</p>
                  </div>
                </div>
              ) : (
                /* Context Switcher for Admin / Staff */
                <div className="relative mt-2">
                  <button
                    onClick={() => setShowHospDropdown(!showHospDropdown)}
                    className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Hospital className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-900 truncate">{workspace.hospital_name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{workspace.branch_name || "Main Campus"}</p>
                      </div>
                    </div>
                    {availableHospitals.length > 1 && (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition shrink-0" />
                    )}
                  </button>

                  {/* Dropdown for Multi-Hospital Admin users */}
                  {showHospDropdown && availableHospitals.length > 1 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50">
                      <p className="text-[10px] font-semibold text-slate-400 px-3 py-1 uppercase tracking-wider">
                        Switch Facility Scope
                      </p>
                      {availableHospitals.map((hosp) => {
                        const isCurrent = hosp.hospital_ref_id === workspace.hospital_ref_id;
                        return (
                          <button
                            key={hosp.hospital_ref_id}
                            onClick={() => {
                              setShowHospDropdown(false);
                              if (!isCurrent) {
                                switchContext({ hospital_ref_id: hosp.hospital_ref_id });
                              }
                            }}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                              isCurrent ? "text-blue-600 font-semibold bg-blue-50" : "text-slate-700"
                            }`}
                          >
                            <div className="truncate">
                              <p className="truncate font-medium">{hosp.hospital_name}</p>
                              <p className="text-[10px] text-slate-400">{hosp.hospital_city || "Chennai"}</p>
                            </div>
                            {isCurrent && <Check className="w-4 h-4 text-blue-500" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* =========================================================================
            Menu Search Bar (Expanded State)
            ========================================================================= */}
        {!isCollapsed && (
          <div className="px-3 pt-3.5 pb-1">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                id="sidebar-menu-search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search menu..."
                aria-label="Search navigation menu"
                className="w-full pl-9 pr-9 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm font-medium rounded-xl border border-slate-200 focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/20 focus:outline-hidden transition shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  id="btn-clear-search"
                  onClick={() => {
                    setSearchQuery("");
                    setHighlightedIndex(0);
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {searchQuery.trim() && (
              <div className="flex items-center justify-between px-1 pt-1.5 text-[11px] text-slate-500 font-medium">
                <span>{filteredNavItems.length} item{filteredNavItems.length !== 1 ? "s" : ""} matched</span>
                <span className="text-[10px] text-slate-400">↑↓ to move • ↵ to open</span>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            Dynamic Navigation Items from Backend (Scrollable List)
            ========================================================================= */}
        <div className={cn(
          "flex-1 overflow-y-auto space-y-1.5",
          isCollapsed ? "px-2 py-3" : "px-3 py-2.5"
        )}>
          {/* Collapsed Rail Icons */}
          {isCollapsed ? (
            navigation.map((item, idx) => {
              const Icon = resolveNavigationIcon(item.icon);
              const isActive = isRouteActive(item.href);
              const isFavourited = favourites.includes(item.href);
              const showSection = item.section && (idx === 0 || navigation[idx - 1]?.section !== item.section);

              return (
                <React.Fragment key={item.href}>
                  {showSection && (
                    <div className="my-2 border-t border-slate-200/80 mx-2" />
                  )}
                  <Link
                    href={item.href}
                    id={`collapsed-nav-${item.href.replace(/\//g, "-").replace(/^-/, "")}`}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={item.title}
                    title={item.title}
                    className={cn(
                      "flex items-center justify-center w-12 h-12 mx-auto rounded-xl transition-all relative group my-1 focus:outline-hidden focus:ring-2 focus:ring-[#155EEF]",
                      isActive
                        ? "bg-[#155EEF] text-white shadow-md shadow-blue-300/50 ring-2 ring-blue-400/40"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    {/* Active Left Indicator Bar in Collapsed State */}
                    {isActive && (
                      <span aria-hidden="true" className="absolute -left-1 top-2.5 bottom-2.5 w-1.5 bg-[#155EEF] rounded-r-md ring-2 ring-white" />
                    )}

                    <Icon className="w-5 h-5 shrink-0" />

                    {/* Accessible Floating Tooltip */}
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute left-full ml-3 z-50 hidden group-hover:flex group-focus-within:flex items-center"
                    >
                      <div className="bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap flex items-center gap-1.5">
                        <span>{item.title}</span>
                        {renderNavBadge(item, isActive, true)}
                      </div>
                    </div>
                  </Link>
                </React.Fragment>
              );
            })
          ) : (
            /* Expanded Navigation Mode with Favourites & Readable Typography */
            <>
              {/* 1. Favourites Section (when not actively searching and patient has favourites) */}
              {!searchQuery.trim() && isPatient && favouriteNavItems.length > 0 && (
                <div id="sidebar-favourites-section" className="mb-2 pb-2 border-b border-slate-200/80">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-800 px-3 pt-1 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      Favourites
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full">
                      {favouriteNavItems.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {favouriteNavItems.map((favItem) => {
                      const Icon = resolveNavigationIcon(favItem.icon);
                      const isCurrent = favItem.href === activeNavHref;

                      return (
                        <Link
                          key={`fav-${favItem.href}`}
                          href={favItem.href}
                          title={favItem.title}
                          className={cn(
                            "group flex items-center min-h-[46px] px-3.5 py-2.5 rounded-xl transition-all relative text-left",
                            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#155EEF] focus-visible:ring-offset-2",
                            isCurrent
                              ? "bg-amber-100/70 text-amber-950 font-semibold ring-1 ring-amber-300 shadow-2xs"
                              : "text-slate-800 hover:text-[#155EEF] hover:bg-amber-50/70 active:bg-amber-100/80 font-medium"
                          )}
                        >
                          {/* Distinct Amber Left Indicator for active favourite shortcut */}
                          {isCurrent ? (
                            <span aria-hidden="true" className="w-1.5 h-6 rounded-full bg-amber-500 mr-2.5 shrink-0 shadow-xs" />
                          ) : (
                            <span aria-hidden="true" className="w-1.5 h-6 mr-2.5 shrink-0 opacity-0 pointer-events-none" />
                          )}

                          <Icon className={cn(
                            "w-5 h-5 shrink-0 mr-3 transition-colors",
                            isCurrent ? "text-amber-700" : "text-amber-600 group-hover:text-amber-700"
                          )} />

                          <span className={cn(
                            "truncate text-[16px] tracking-tight flex-1",
                            isCurrent ? "text-amber-950 font-semibold" : "text-slate-800 font-medium group-hover:text-slate-900"
                          )}>
                            {favItem.title}
                          </span>

                          {renderNavBadge(favItem, false, false)}

                          {/* Quick Remove from Favourites Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleFavourite(favItem.href);
                            }}
                            aria-label={`Remove ${favItem.title} from favourites`}
                            title={`Remove ${favItem.title} from favourites`}
                            className="p-1.5 ml-1.5 rounded-lg text-amber-500 hover:text-amber-700 hover:scale-110 transition focus:outline-hidden focus:ring-2 focus:ring-amber-400 shrink-0"
                          >
                            <Star className="w-4 h-4 fill-amber-400 text-amber-500 drop-shadow-2xs" />
                          </button>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Main Navigation Items (Filtered by Search or Grouped by Section) */}
              {!searchQuery.trim() && (
                <p className="px-3 pb-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {isPatient ? "My Health Journey" : `${workspace.role_name} Workspace`}
                </p>
              )}

              {/* Empty Search Results Message */}
              {searchQuery.trim() && filteredNavItems.length === 0 && (
                <div id="no-menu-items-found" className="px-4 py-8 text-center flex flex-col items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center mb-2.5 text-slate-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">No menu items found</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                    No navigation items matched &ldquo;{searchQuery}&rdquo;.
                  </p>
                  <button
                    type="button"
                    id="btn-clear-search-empty"
                    onClick={() => {
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="mt-3 px-3 py-1.5 text-xs font-semibold text-[#155EEF] hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                  >
                    Clear search
                  </button>
                </div>
              )}

              {/* Render Navigation Links */}
              {filteredNavItems.map((item, idx) => {
                const Icon = resolveNavigationIcon(item.icon);
                const isActive = isRouteActive(item.href);
                const isFavourited = favourites.includes(item.href);
                const isHighlighted = searchQuery.trim().length > 0 && idx === highlightedIndex;
                const showSection = !searchQuery.trim() && item.section && (idx === 0 || filteredNavItems[idx - 1]?.section !== item.section);

                return (
                  <React.Fragment key={item.href}>
                    {showSection && (
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 pt-3 pb-1">
                        {item.section}
                      </div>
                    )}
                    <Link
                      href={item.href}
                      id={`nav-${item.href.replace(/\//g, "-").replace(/^-/, "")}`}
                      aria-current={isActive ? "page" : undefined}
                      title={item.title}
                      className={cn(
                        "group flex items-center min-h-[48px] px-3.5 py-2.5 rounded-xl transition-all relative text-left",
                        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#155EEF] focus-visible:ring-offset-2",
                        isActive
                          ? "bg-[#155EEF] text-white shadow-md shadow-blue-500/25 font-semibold"
                          : "text-slate-800 hover:text-[#155EEF] hover:bg-blue-50/80 active:bg-blue-100 font-medium",
                        isHighlighted && "ring-2 ring-[#155EEF] bg-blue-50"
                      )}
                    >
                      {/* Distinct Left Indicator Bar (Accessible Visual Marker) */}
                      {isActive ? (
                        <span aria-hidden="true" className="w-1.5 h-6 rounded-full bg-white mr-2.5 shrink-0 shadow-xs" />
                      ) : (
                        <span aria-hidden="true" className="w-1.5 h-6 mr-2.5 shrink-0 opacity-0 pointer-events-none" />
                      )}

                      {/* Clear Recognizable Icon */}
                      <Icon className={cn(
                        "w-5 h-5 shrink-0 mr-3 transition-colors",
                        isActive ? "text-white" : "text-slate-500 group-hover:text-[#155EEF]"
                      )} />

                      {/* Readable Menu Label for Older Users (~16px text-base) */}
                      <span className={cn(
                        "truncate text-[16px] tracking-tight flex-1",
                        isActive ? "text-white font-semibold" : "text-slate-800 font-medium group-hover:text-slate-900"
                      )}>
                        {item.title}
                      </span>

                      {/* Database-backed Dynamic Badge */}
                      {renderNavBadge(item, isActive, false)}

                      {/* Favourite Star Toggle Button for Patient Workspace */}
                      {isPatient && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavourite(item.href);
                          }}
                          aria-label={isFavourited ? `Remove ${item.title} from favourites` : `Add ${item.title} to favourites`}
                          title={isFavourited ? `Remove ${item.title} from favourites` : `Add ${item.title} to favourites`}
                          className={cn(
                            "p-1.5 ml-1.5 rounded-lg transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-400 shrink-0",
                            isFavourited
                              ? "text-amber-400 hover:text-amber-500 hover:scale-110"
                              : "text-slate-400/80 hover:text-amber-500 hover:scale-110 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
                          )}
                        >
                          <Star
                            className={cn(
                              "w-4 h-4 transition-transform",
                              isFavourited && "fill-amber-400 text-amber-400 drop-shadow-2xs",
                              isActive && isFavourited && "fill-amber-300 text-amber-300"
                            )}
                          />
                        </button>
                      )}
                    </Link>
                  </React.Fragment>
                );
              })}
            </>
          )}
        </div>

        {/* User Card & Logout */}
        <div className={cn(
          "border-t border-slate-200 bg-slate-50 transition-all",
          isCollapsed ? "p-2 flex flex-col items-center justify-center" : "p-4"
        )}>
          {isCollapsed ? (
            <button
              onClick={logout}
              title={`Sign Out (${user.name || user.username})`}
              aria-label="Sign Out"
              id="btn-logout"
              className="w-10 h-10 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors focus:outline-hidden focus:ring-2 focus:ring-rose-500 relative group"
            >
              <LogOut className="w-5 h-5" />
              <div role="tooltip" className="pointer-events-none absolute left-full ml-3 z-50 hidden group-hover:flex items-center">
                <div className="bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                  Sign Out
                </div>
              </div>
            </button>
          ) : (
            <div className="flex items-center justify-between">
              <div className="truncate pr-2">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.name || user.username}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                    {workspace.role_name}
                  </span>
                  {availableWorkspaces && availableWorkspaces.length > 1 && (
                    <button
                      onClick={() => setShowSwitchModal(true)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded transition"
                    >
                      Switch
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                aria-label="Sign Out"
                id="btn-logout"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Powered By Sathus Technology Footer */}
        <div className={cn(
          "bg-slate-100/90 border-t border-slate-200/90 text-[10px] text-slate-500 flex items-center justify-between",
          isCollapsed ? "p-2 justify-center" : "px-4 py-2.5"
        )}>
          {isCollapsed ? (
            <span title="Powered by Sathus Technology Pvt Ltd" className="font-black text-slate-600 text-[10px]">
              ST
            </span>
          ) : (
            <>
              <span className="font-medium text-slate-500">Powered by</span>
              <span className="font-bold text-slate-700 tracking-tight">Sathus Technology Pvt Ltd</span>
            </>
          )}
        </div>
      </aside>

      {/* =========================================================================
          Accessible Search Modal / Popover (for Collapsed Rail)
          ========================================================================= */}
      {isCollapsedSearchOpen && (
        <>
          <div
            id="collapsed-search-backdrop"
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsCollapsedSearchOpen(false)}
            aria-hidden="true"
          />
          <div
            id="collapsed-search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Search navigation menu"
            className="fixed inset-x-4 top-20 max-w-lg mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in zoom-in-95 duration-150"
          >
            <div className="p-3.5 border-b border-slate-200 flex items-center gap-2.5 bg-slate-50">
              <Search className="w-5 h-5 text-slate-400 shrink-0 ml-1" />
              <input
                ref={collapsedSearchInputRef}
                type="text"
                id="collapsed-modal-search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search menu..."
                aria-label="Search menu"
                className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 text-sm font-medium outline-hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setHighlightedIndex(0);
                    collapsedSearchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsCollapsedSearchOpen(false)}
                aria-label="Close search"
                className="text-xs font-semibold px-2 py-1 text-slate-500 hover:text-slate-800 bg-slate-200/70 hover:bg-slate-200 rounded-lg transition"
              >
                Esc
              </button>
            </div>

            {/* Results list */}
            <div className="p-2 max-h-80 overflow-y-auto space-y-1">
              {filteredNavItems.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm font-semibold text-slate-700">No menu items found</p>
                  <p className="text-xs text-slate-400 mt-1">No items matched &ldquo;{searchQuery}&rdquo;</p>
                </div>
              ) : (
                filteredNavItems.map((item, idx) => {
                  const Icon = resolveNavigationIcon(item.icon);
                  const isActive = isRouteActive(item.href);
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <button
                      key={`modal-${item.href}`}
                      type="button"
                      onClick={() => {
                        router.push(item.href);
                        setIsCollapsedSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className={cn(
                        "w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all",
                        isActive
                          ? "bg-[#155EEF] text-white font-semibold"
                          : isHighlighted
                          ? "bg-blue-50 text-blue-900 font-medium"
                          : "text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-slate-500")} />
                      <span className="truncate flex-1">{item.title}</span>
                      {item.section && (
                        <span className={cn(
                          "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
                          isActive ? "bg-white/20 text-white" : "text-slate-400 bg-slate-100"
                        )}>
                          {item.section}
                        </span>
                      )}
                      {renderNavBadge(item, isActive, false)}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          Mobile Slide-In Navigation Drawer (< lg)
          ========================================================================= */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            id="mobile-nav-backdrop"
            className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={closeMobile}
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Drawer"
            className="lg:hidden fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out motion-reduce:transition-none animate-in slide-in-from-left"
          >
            {/* Drawer Header with Healthcare Blue Branding */}
            <div className={cn(
              "p-4 flex items-center justify-between border-b shadow-xs",
              isPatient
                ? "bg-gradient-to-b from-[#155EEF] via-[#144ecc] to-[#123B75] text-white border-[#123B75]/40"
                : "bg-slate-900 text-white border-slate-800"
            )}>
              <Link
                href="/"
                id="sidebar-mobile-brand-link"
                onClick={closeMobile}
                title="Go to OneHealth ID Home"
                aria-label="OneHealth ID Home"
                className="group/brand flex items-center gap-3 min-w-0 rounded-xl p-1 -m-1 transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#155EEF]"
              >
                <div className="w-12 h-12 rounded-2xl bg-white ring-2 ring-white/90 shadow-md flex items-center justify-center p-1.5 shrink-0 overflow-hidden group-hover/brand:scale-105 group-hover/brand:ring-white group-active/brand:scale-95 transition-all">
                  <Image
                    src="/images/oh-id-logo.png"
                    alt="One Health ID"
                    width={44}
                    height={44}
                    priority
                    className="w-full h-full object-contain filter drop-shadow-2xs"
                  />
                </div>
                <div className="truncate min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-[17px] tracking-tight truncate leading-snug group-hover/brand:underline underline-offset-4 decoration-2 decoration-white/70">
                      OneHealth ID
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white font-bold border border-white/30 shrink-0">
                      v1.0
                    </span>
                  </div>
                  <p className="text-xs text-blue-100 font-medium truncate mt-0.5">
                    {isPatient ? "Personal Health Workspace" : workspace.tenant_name || "Healthcare Workspace"}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                id="btn-mobile-nav-close"
                aria-label="Close navigation menu"
                onClick={closeMobile}
                className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-white/20 transition-colors focus:outline-hidden focus:ring-2 focus:ring-white shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Patient Family Switcher in Drawer */}
            {isPatient && (
              <div className="p-3 bg-blue-50/60 border-b border-slate-200">
                <FamilySwitcher />
              </div>
            )}

            {/* Mobile Search Field */}
            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  id="mobile-menu-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu..."
                  aria-label="Search navigation menu"
                  className="w-full pl-9 pr-9 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 text-sm font-medium rounded-xl border border-slate-200 focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/20 focus:outline-hidden shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Navigation Items */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
              {/* Mobile Favourites */}
              {!searchQuery.trim() && isPatient && favouriteNavItems.length > 0 && (
                <div className="mb-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-800 px-3 pt-1 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      Favourites
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full">
                      {favouriteNavItems.length}
                    </span>
                  </div>
                  {favouriteNavItems.map((favItem) => {
                    const Icon = resolveNavigationIcon(favItem.icon);
                    const isCurrent = favItem.href === activeNavHref;

                    return (
                      <Link
                        key={`mob-fav-${favItem.href}`}
                        href={favItem.href}
                        onClick={closeMobile}
                        className={cn(
                          "flex items-center min-h-[48px] px-3.5 py-2.5 rounded-xl text-[16px] transition-all",
                          isCurrent
                            ? "bg-amber-100/70 text-amber-950 font-semibold ring-1 ring-amber-300"
                            : "text-slate-800 hover:text-[#155EEF] hover:bg-amber-50 font-medium"
                        )}
                      >
                        {isCurrent ? (
                          <span aria-hidden="true" className="w-1.5 h-6 rounded-full bg-amber-500 mr-2.5 shrink-0 shadow-xs" />
                        ) : (
                          <span aria-hidden="true" className="w-1.5 h-6 mr-2.5 shrink-0 opacity-0 pointer-events-none" />
                        )}
                        <Icon className={cn("w-5 h-5 shrink-0 mr-3", isCurrent ? "text-amber-700" : "text-amber-600")} />
                        <span className="truncate flex-1">{favItem.title}</span>
                        {renderNavBadge(favItem, false, false)}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Empty Mobile Search State */}
              {searchQuery.trim() && filteredNavItems.length === 0 ? (
                <div className="px-4 py-8 text-center flex flex-col items-center justify-center">
                  <Search className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-800">No menu items found</p>
                  <p className="text-xs text-slate-500 mt-1">No items matched &ldquo;{searchQuery}&rdquo;</p>
                </div>
              ) : (
                filteredNavItems.map((item, idx) => {
                  const Icon = resolveNavigationIcon(item.icon);
                  const isActive = isRouteActive(item.href);
                  const isFavourited = favourites.includes(item.href);
                  const showSection = !searchQuery.trim() && item.section && (idx === 0 || filteredNavItems[idx - 1]?.section !== item.section);

                  return (
                    <React.Fragment key={`mobile-${item.href}`}>
                      {showSection && (
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 pt-3 pb-1">
                          {item.section}
                        </div>
                      )}
                      <Link
                        href={item.href}
                        onClick={closeMobile}
                        className={cn(
                          "group flex items-center min-h-[48px] px-3.5 py-2.5 rounded-xl text-[16px] transition-all",
                          isActive
                            ? "bg-[#155EEF] text-white shadow-md shadow-blue-500/25 font-semibold"
                            : "text-slate-800 hover:text-[#155EEF] hover:bg-slate-100 font-medium"
                        )}
                      >
                        {isActive ? (
                          <span aria-hidden="true" className="w-1.5 h-6 rounded-full bg-white mr-2.5 shrink-0 shadow-xs" />
                        ) : (
                          <span aria-hidden="true" className="w-1.5 h-6 mr-2.5 shrink-0 opacity-0 pointer-events-none" />
                        )}
                        <Icon className={cn("w-5 h-5 shrink-0 mr-3", isActive ? "text-white" : "text-slate-500")} />
                        <span className="truncate flex-1">{item.title}</span>
                        {renderNavBadge(item, isActive, false)}
                        {isPatient && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleFavourite(item.href);
                            }}
                            aria-label={isFavourited ? `Remove ${item.title} from favourites` : `Add ${item.title} to favourites`}
                            className="p-1.5 ml-1 rounded-lg text-amber-500 shrink-0"
                          >
                            <Star className={cn("w-4 h-4", isFavourited && "fill-amber-400 text-amber-500")} />
                          </button>
                        )}
                      </Link>
                    </React.Fragment>
                  );
                })
              )}
            </div>

            {/* Drawer Footer with User & Logout */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="truncate pr-2">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.name || user.username}</p>
                <p className="text-xs font-mono text-slate-500">OH-ID: {user.username}</p>
              </div>
              <button
                onClick={() => {
                  closeMobile();
                  logout();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          Mobile Sticky Bottom Navigation (< lg)
          ========================================================================= */}
      <nav aria-label="Mobile Navigation" className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 py-1 px-2 z-40 flex items-center justify-around shadow-xl safe-area-pb">
        {isPatient ? (
          <>
            {patientMobileTabs.slice(0, 4).map((tab) => {
              const Icon = resolveNavigationIcon(tab.icon);
              const isActive = isRouteActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-1 rounded-xl transition ${
                    isActive ? "text-[#155EEF] font-semibold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] truncate max-w-[64px]">{tab.title}</span>
                </Link>
              );
            })}
            <button
              onClick={() => setIsMobileOpen(true)}
              aria-label="More navigation options"
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-1 rounded-xl transition ${
                isMobileOpen ? "text-[#155EEF] font-semibold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <MoreHorizontal className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">More</span>
            </button>
          </>
        ) : (
          navigation.slice(0, 5).map((item) => {
            const Icon = resolveNavigationIcon(item.icon);
            const isActive = isRouteActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-1 rounded-xl transition ${
                  isActive ? "text-[#155EEF] font-semibold" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] truncate max-w-[64px]">{item.title}</span>
              </Link>
            );
          })
        )}
      </nav>

      {/* In-Session Switch Workspace Modal */}
      {showSwitchModal && availableWorkspaces && availableWorkspaces.length > 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Switch Workspace</h3>
              </div>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Select an authorized role and healthcare facility context for your session:
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {availableWorkspaces.map((ws: any, idx: number) => {
                const isCurrent =
                  ws.role_code === workspace.role_code &&
                  ws.hospital_ref_id === workspace.hospital_ref_id &&
                  (!ws.department_id || ws.department_id === workspace.department_id);

                return (
                  <button
                    key={`${ws.hospital_ref_id}-${ws.role_code}-${ws.department_id || idx}`}
                    disabled={switchingIdx !== null}
                    onClick={async () => {
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
                          window.location.href = targetRoute;
                        }
                      } finally {
                        setSwitchingIdx(null);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                      isCurrent
                        ? "bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {ws.category_title || ws.role_name || ws.role_code}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {ws.hospital_name || "Healthcare Facility"}
                        {ws.department_name ? ` • ${ws.department_name}` : ""}
                      </p>
                    </div>
                    {switchingIdx === idx ? (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : isCurrent ? (
                      <Check className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
