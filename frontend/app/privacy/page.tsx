import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Lock, FileText, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — OneHealth ID (OH-ID)",
  description: "OneHealth ID patient data privacy policy, DPDP Act compliance, and medical record safeguarding by Sathus Technology Pvt Ltd.",
  openGraph: {
    title: "Privacy Policy — OneHealth ID (OH-ID)",
    description: "OneHealth ID patient data privacy policy, DPDP Act compliance, and medical record safeguarding by Sathus Technology Pvt Ltd.",
    url: "https://ohid.online/privacy",
    siteName: "One Health ID (OH-ID)",
    images: [{ url: "https://ohid.online/images/og-preview.png", width: 1200, height: 630, alt: "OneHealth ID Privacy Policy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy — OneHealth ID (OH-ID)",
    description: "OneHealth ID patient data privacy policy, DPDP Act compliance, and medical record safeguarding by Sathus Technology Pvt Ltd.",
    images: ["https://ohid.online/images/og-preview.png"],
  },
};

export default function PrivacyPolicyPage() {
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
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-900">OneHealth ID Privacy Policy</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-xs space-y-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 mb-3">
              <Lock className="w-3.5 h-3.5" />
              <span>Sathus Technology Privacy Governance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              OneHealth ID (OH-ID) Privacy Policy
            </h1>
            <p className="text-xs text-slate-500 mt-2 font-mono">
              Effective Date: January 1, 2026 • Governing Entity: Sathus Technology Pvt Ltd
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Architectural Privacy Commitment</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              OneHealth ID (OH-ID) is engineered from the ground up on zero-knowledge verification principles. Raw electronic health records (EHR), clinical consultation notes, and private test observations are cryptographically safeguarded in tenant-isolated PostgreSQL schemas and are never sold, rented, or exposed across unauthorized organizational boundaries.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. Data Collected &amp; Purpose Limitation</h2>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Practitioner Credentials:</strong> Primary registered mobile numbers and authenticated credentials are used solely for identity verification and role-based access control (RBAC).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Patient Health Information:</strong> Demographic identifiers and clinical encounters are processed exclusively for authorized clinical care, medication orders, and hospital billing.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Audit Logs:</strong> Immutable server-side access logs are retained for regulatory compliance and security anomaly detection.</span>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. Regulatory &amp; Statutory Standards</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              OH-ID operations comply with the Indian Digital Personal Data Protection (DPDP) Act, Ayushman Bharat Digital Mission (ABDM) data consent frameworks, and applicable healthcare information protection statutes.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-lg font-bold text-slate-900">4. Privacy Contact &amp; Grievance Officer</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              For privacy inquiries, consent revocation, or data subject requests, please contact:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-slate-900">Sathus Technology Pvt Ltd — Privacy &amp; Data Protection Desk</div>
              <div>Email: <a href="mailto:admin@sathus.com" className="text-blue-600 hover:underline">admin@sathus.com</a></div>
              <div>Phone: <a href="tel:+914424760000" className="text-blue-600 hover:underline">+91 44 2476 0000</a></div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
