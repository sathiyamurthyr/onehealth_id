"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, QrCode, Shield, Sparkles } from "lucide-react";
import { OneHealthQRScannerModal } from "@/components/qr/OneHealthQRScannerModal";
import { Button } from "@/components/ui/Card";

export default function UniversalQRScanPage() {
  const [modalOpen, setModalOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-8">
      {/* Top Bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-white/10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="flex items-center gap-2 text-xs text-blue-400">
          <Shield className="w-4 h-4" />
          <span>Zero-Knowledge Identity Verification</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-md mx-auto w-full my-auto text-center space-y-6 py-12">
        <div className="w-20 h-20 rounded-3xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/10">
          <QrCode className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            OneHealth QR Scanner
          </h1>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Scan patient QR codes to verify identity, check in appointments, or register patients across participating hospitals.
          </p>
        </div>

        <div className="pt-4">
          <Button
            variant="primary"
            size="lg"
            className="w-full justify-center text-base py-4 rounded-2xl shadow-xl shadow-blue-600/20"
            onClick={() => setModalOpen(true)}
          >
            <QrCode className="w-5 h-5 mr-2" /> Launch Scanner Modal
          </Button>
        </div>

        <div className="pt-6 border-t border-white/10 text-xs text-slate-500">
          Authorized hospital personnel: Ensure you are logged into your hospital workspace to view clinical summaries and issue tokens.
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="max-w-4xl mx-auto w-full text-center text-xs text-slate-600 pt-6">
        OneHealth ID (OH-ID) • Interoperable Citizen Health Network • DPDP Act & HIPAA Compliant
      </div>

      <OneHealthQRScannerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
