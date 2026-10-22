"use client";

import React from "react";
import {
  ShieldCheck,
  Briefcase,
  Headphones,
  Mail,
  Building2,
} from "lucide-react";
import { getSathusContactConfig, ContactCategory } from "@/lib/config/contactConfig";

export function ContactSathusSection() {
  const contactConfig = getSathusContactConfig();

  const getCategoryTheme = (id: string) => {
    switch (id) {
      case "admin":
        return {
          icon: ShieldCheck,
          iconBg: "bg-purple-100 text-purple-700",
          cardBorder: "border-slate-200 hover:border-purple-300",
          badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
        };
      case "sales":
        return {
          icon: Briefcase,
          iconBg: "bg-blue-100 text-blue-700",
          cardBorder: "border-slate-200 hover:border-blue-300",
          badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
        };
      case "support":
        return {
          icon: Headphones,
          iconBg: "bg-emerald-100 text-emerald-700",
          cardBorder: "border-slate-200 hover:border-emerald-300",
          badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      default:
        return {
          icon: Building2,
          iconBg: "bg-slate-100 text-slate-700",
          cardBorder: "border-slate-200 hover:border-slate-300",
          badgeBg: "bg-slate-50 text-slate-700 border-slate-200",
        };
    }
  };

  // Only render categories that have an email
  const emailCategories = (contactConfig.categories ?? []).filter(
    (c: ContactCategory) => Boolean(c.email && c.email.length > 0)
  );

  if (emailCategories.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={contactConfig.sectionTitle}
      className="mt-5 pt-4 border-t border-slate-200/80"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
          <h3 className="text-xs font-bold text-slate-800 tracking-tight">
            {contactConfig.sectionTitle}
          </h3>
        </div>
        <span className="text-[10px] text-slate-500 font-medium">
          Official Helpdesk &amp; Sales
        </span>
      </div>

      {/* 3 Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {emailCategories.map((cat: ContactCategory) => {
          const theme = getCategoryTheme(cat.id);
          const CategoryIcon = theme.icon;

          return (
            <div
              key={cat.id}
              className={`p-2.5 rounded-xl bg-slate-50/80 border ${theme.cardBorder} transition-all duration-150 flex flex-col gap-1.5`}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-lg ${theme.iconBg} flex items-center justify-center shrink-0`}
                  >
                    <CategoryIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {cat.title}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${theme.badgeBg} shrink-0`}
                >
                  {cat.badge}
                </span>
              </div>

              {/* Subtitle / Role */}
              <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">
                {cat.roleDescription}
              </p>

              {/* Email link */}
              <div className="pt-1 border-t border-slate-200/60">
                <a
                  href={`mailto:${cat.email}`}
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium text-[11px] truncate transition-colors focus:outline-hidden focus:underline"
                  aria-label={`Email Us at ${cat.email}`}
                  title={`Email Us — ${cat.email}`}
                >
                  <Mail className="w-3 h-3 shrink-0 text-blue-500" aria-hidden="true" />
                  <span className="truncate">{cat.email}</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
