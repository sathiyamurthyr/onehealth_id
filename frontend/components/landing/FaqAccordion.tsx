"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle, ShieldCheck, Sparkles } from "lucide-react";

interface FaqItem {
  id: string;
  question: string;
  category: string;
  badgeColor: string;
  answer: string;
  points?: string[];
}

const FAQS: FaqItem[] = [
  {
    id: "what-is-ohid",
    question: "What is OneHealth ID (OH-ID) and how does it replace paper cards?",
    category: "Identity & Convenience",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    answer: "OneHealth ID (OH-ID) is a universal, cryptographically secured digital health identity that replaces cumbersome physical cards, handwritten case sheets, and fragmented hospital slips. One unique ID allows you to walk into any participating network hospital, check in under 30 seconds, and access your unified longitudinal medical history.",
    points: [
      "Eliminates repeated physical registration forms across different clinics.",
      "Consolidates historical prescriptions, lab results, and discharge summaries.",
      "Access your verified health card anytime from your mobile device."
    ]
  },
  {
    id: "privacy-zk-qr",
    question: "How does the Zero-Knowledge QR code safeguard clinical privacy at reception?",
    category: "Security & Privacy",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    answer: "Our dynamic QR code leverages Zero-Knowledge verification and HMAC-SHA256 signing. When scanned at a hospital reception counter, it only reveals identity credentials and token confirmation required for triage, without exposing sensitive clinical diagnoses, past procedures, or confidential medication history on reception monitors.",
    points: [
      "Dynamic rolling token refreshes automatically to prevent visual cloning.",
      "Encrypted clinical payload is accessible exclusively by authorized consulting doctors.",
      "Fully compliant with HIPAA and Indian Digital Personal Data Protection (DPDP) Act."
    ]
  },
  {
    id: "family-member-care",
    question: "Can I manage healthcare records for my children or elderly family members?",
    category: "Family Health",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    answer: "Yes. OH-ID includes comprehensive Family Healthcare Management. From your primary account, you can add and manage dependent profiles (children, spouse, parents), view their specific clinical timelines, book appointments, and store their paediatric vaccination milestones.",
    points: [
      "Seamlessly switch between primary and dependent profiles with one tap.",
      "Dedicated Paediatric Care templates featuring weight and growth percentiles.",
      "Parental and legal guardian consent verification built-in."
    ]
  },
  {
    id: "twenty-templates",
    question: "How do hospitals adopt the 20 standardized Rx and clinical report templates?",
    category: "Hospital Architecture",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    answer: "Every participating hospital administrator can configure their preferred prescription (Rx) template (out of 10 designs) and clinical consultation report template (out of 10 designs) from the Hospital Command Console. Once approved, all doctors within that facility prescribe seamlessly using that standard format.",
    points: [
      "Specialty-tailored options: Paediatric, Emergency STAT, Chronic Care, Cardiology, and Minimal OPD.",
      "Consistent clinical data model guarantees cross-hospital portability.",
      "Includes digital signatures, clinic logos, and verification QR codes automatically."
    ]
  },
  {
    id: "abdm-fhir-r4",
    question: "Is OneHealth ID compliant with ABDM (Ayushman Bharat) and HL7 FHIR R4?",
    category: "Compliance",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    answer: "Yes. OH-ID is engineered to conform strictly to India's Ayushman Bharat Digital Mission (ABDM) standards and the global HL7 FHIR R4 specification. Encounters, prescriptions, and diagnostic reports follow interoperable schema structures for national health exchange.",
    points: [
      "Interoperable with ABHA (Ayushman Bharat Health Account) linking.",
      "Standard FHIR R4 JSON payloads for seamless external HIE integration.",
      "GST-ready invoicing and audited financial ledger compliance."
    ]
  },
  {
    id: "emergency-ice",
    question: "How does In Case of Emergency (ICE) access work during critical trauma triage?",
    category: "Emergency Care",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    answer: "During critical trauma situations or unconscious patient arrivals, authorized ER staff can scan the emergency badge to instantly retrieve life-saving parameters: Blood Group, Severe Drug Allergies, Chronic Pre-existing Conditions, and Emergency Contacts without delay.",
    points: [
      "Zero-latency retrieval of blood group and anaphylactic allergy warnings.",
      "Instant SMS/notification dispatch to designated emergency next-of-kin.",
      "Full audit logging of all emergency bypass lookups for legal accountability."
    ]
  }
];

export function FaqAccordion() {
  const [openId, setOpenId] = useState<string | null>("what-is-ohid");

  const toggleFaq = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section aria-labelledby="faq-title" className="w-full max-w-[min(94vw,1100px)] mx-auto mt-16 sm:mt-24 text-left">
      <div className="text-center max-w-xl mx-auto mb-10">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          Frequently Asked Questions
        </span>
        <h2 id="faq-title" className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-3 tracking-tight">
          Everything You Need to Know About OH-ID
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-2 font-normal leading-relaxed">
          Clear answers about patient privacy, hospital onboarding, digital health records, and emergency trauma triage.
        </p>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div
              key={faq.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen
                  ? "bg-white border-blue-300 shadow-sm ring-1 ring-blue-500/15"
                  : "bg-white border-slate-200/90 hover:border-slate-300"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleFaq(faq.id)}
                aria-expanded={isOpen}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 w-fit ${faq.badgeColor}`}>
                    {faq.category}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {faq.question}
                  </span>
                </div>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                  isOpen ? "bg-blue-50 text-blue-600 rotate-180" : "bg-slate-100 text-slate-500"
                }`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 pt-1 text-slate-600 text-xs sm:text-sm leading-relaxed border-t border-slate-100/80">
                  <p>{faq.answer}</p>
                  {faq.points && (
                    <ul className="mt-3 space-y-1.5 pl-1">
                      {faq.points.map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="text-blue-600 font-bold mt-0.5">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

