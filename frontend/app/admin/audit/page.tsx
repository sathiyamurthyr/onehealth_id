"use client";

import React from "react";
import { Eye, ArrowLeft, Construction } from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Link from "next/link";

export default function Page() {
  return (
    <WorkspaceLayout allowedWorkspaceTypes={["SUPER_ADMIN"]}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back */}
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition">
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </Link>

        {/* Header */}
        <div className="bg-white border border-rose-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-200 shrink-0">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
              <p className="text-sm text-slate-500 mt-0.5">Review all system actions for compliance and security</p>
            </div>
          </div>
        </div>

        {/* Under Construction */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-12 text-center">
          <Construction className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Audit Logs — Coming Soon</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            This section is actively being developed. The full audit logs management interface will be available in the next sprint.
          </p>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
