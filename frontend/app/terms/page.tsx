import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle2, Building2 } from "lucide-react";

export const metadata = {
  title: "Terms of Service — OneHealth ID (OH-ID)",
  description: "OneHealth ID hospital operating system terms of service and institutional usage agreement by Sathus Technology Pvt Ltd.",
  openGraph: {
    title: "Terms of Service — OneHealth ID (OH-ID)",
    description: "OneHealth ID hospital operating system terms of service and institutional usage agreement by Sathus Technology Pvt Ltd.",
    url: "https://ohid.online/terms",
    siteName: "One Health ID (OH-ID)",
    images: [{ url: "https://ohid.online/images/og-preview.png", width: 1200, height: 630, alt: "OneHealth ID Terms of Service" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service — OneHealth ID (OH-ID)",
    description: "OneHealth ID hospital operating system terms of service and institutional usage agreement by Sathus Technology Pvt Ltd.",
    images: ["https://ohid.online/images/og-preview.png"],
  },
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/login"
            className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900">OneHealth ID Terms of Service</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-xs space-y-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 mb-3">
              <Building2 className="w-3.5 h-3.5" />
              <span>Sathus Technology Enterprise Terms</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              OneHealth ID (OH-ID) Terms of Service
            </h1>
            <p className="text-xs text-slate-500 mt-2 font-mono">
              Effective Date: January 1, 2026 • Governing Entity: Sathus Technology Pvt Ltd
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              By accessing or using the OneHealth ID (OH-ID) platform, affiliated hospital facilities, clinical personnel, and registered users agree to be bound by these Terms of Service provided by Sathus Technology Pvt Ltd.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. Authorized Institutional Use</h2>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>Role-Based Access:</strong> Access credentials are non-transferable and assigned strictly to individual healthcare workers with enforced backend RBAC.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>Clinical Accountability:</strong> Doctors and clinical staff retain full medical discretion for consultations, prescriptions, and patient care decisions.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>Multi-Tenant Integrity:</strong> Participating hospitals operate within isolated PostgreSQL database schemas to prevent unauthorized data crossing.</span>
              </li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-lg font-bold text-slate-900">3. Contact &amp; Legal Notices</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              For commercial agreements, hospital licensing, or enterprise terms inquiries, please contact:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-slate-900">Sathus Technology Pvt Ltd — Legal &amp; Commercial Partnerships</div>
              <div>Email: <a href="mailto:sales@sathus.com" className="text-blue-600 hover:underline">sales@sathus.com</a></div>
              <div>Phone: <a href="tel:+914424760000" className="text-blue-600 hover:underline">+91 44 2476 0000</a></div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
