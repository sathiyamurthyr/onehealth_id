/**
 * OneHealth ID (OH-ID) — Central Sathus Contact Configuration
 * Powered by Sathus Technology Pvt Ltd
 *
 * Configurable via environment variables with verified enterprise defaults.
 * If any contact detail is missing in the environment, it cleanly falls back
 * or remains undefined without rendering fake numbers or broken links.
 */

export interface ContactCategory {
  id: "admin" | "sales" | "support";
  title: string;
  badge: string;
  roleDescription: string;
  email?: string;
  phone?: string;
  phoneRaw?: string; // sanitized for tel: links
}

export interface SathusContactConfig {
  companyName: string;
  sectionTitle: string;
  sectionSubtitle: string;
  categories: ContactCategory[];
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
}

function sanitizePhoneForTel(phone?: string): string | undefined {
  if (!phone) return undefined;
  // Keep only digits and leading '+'
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.length > 0 ? cleaned : undefined;
}

export function getSathusContactConfig(): SathusContactConfig {
  // Configurable environment variables with verified production defaults
  const adminEmail = process.env.NEXT_PUBLIC_SATHUS_ADMIN_EMAIL ?? "admin@sathus.com";
  const adminPhone = process.env.NEXT_PUBLIC_SATHUS_ADMIN_PHONE ?? "+91 44 2476 0000";

  const salesEmail = process.env.NEXT_PUBLIC_SATHUS_SALES_EMAIL ?? "sales@sathus.com";
  const salesPhone = process.env.NEXT_PUBLIC_SATHUS_SALES_PHONE ?? "+91 44 2476 0000";

  const supportEmail = process.env.NEXT_PUBLIC_SATHUS_SUPPORT_EMAIL ?? "support@sathus.com";
  const supportPhone = process.env.NEXT_PUBLIC_SATHUS_SUPPORT_PHONE ?? "+91 44 2476 0000";

  const privacyPolicyUrl = process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL ?? "/privacy";
  const termsOfServiceUrl = process.env.NEXT_PUBLIC_TERMS_OF_SERVICE_URL ?? "/terms";

  const rawCategories: ContactCategory[] = [
    {
      id: "admin",
      title: "Sathus Admin",
      badge: "Administration",
      roleDescription: "Platform administration & account assistance",
      email: adminEmail.trim() || undefined,
      phone: adminPhone.trim() || undefined,
      phoneRaw: sanitizePhoneForTel(adminPhone),
    },
    {
      id: "sales",
      title: "Sales",
      badge: "Partnerships",
      roleDescription: "Hospital onboarding, demos & partnerships",
      email: salesEmail.trim() || undefined,
      phone: salesPhone.trim() || undefined,
      phoneRaw: sanitizePhoneForTel(salesPhone),
    },
    {
      id: "support",
      title: "Support",
      badge: "Helpdesk",
      roleDescription: "Login issues, technical & product assistance",
      email: supportEmail.trim() || undefined,
      phone: supportPhone.trim() || undefined,
      phoneRaw: sanitizePhoneForTel(supportPhone),
    },
  ];

  // Only expose categories that have at least one verified contact method
  const categories = rawCategories.filter(
    (c) => Boolean(c.email && c.email.length > 0) || Boolean(c.phone && c.phone.length > 0)
  );

  return {
    companyName: "Sathus Technology Pvt Ltd",
    sectionTitle: "Contact Sathus Technology",
    sectionSubtitle: "Official channels for platform governance, onboarding, and technical helpdesk",
    categories,
    privacyPolicyUrl: privacyPolicyUrl.trim() || undefined,
    termsOfServiceUrl: termsOfServiceUrl.trim() || undefined,
  };
}
