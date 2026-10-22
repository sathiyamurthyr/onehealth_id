import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ohid.online"),
  title: "One Health ID (OH-ID) — Unified Healthcare Network | Powered by Sathus Technology Pvt Ltd",
  description: "Universal Healthcare Identity, Unified EHR & Clinical Operating System across Connected Hospitals. Powered by Sathus Technology Pvt Ltd.",
  applicationName: "OneHealth ID",
  authors: [{ name: "Sathus Technology Pvt Ltd", url: "https://ohid.online" }],
  creator: "Sathus Technology Pvt Ltd",
  publisher: "Sathus Technology Pvt Ltd",
  keywords: [
    "OneHealth ID",
    "OH-ID",
    "Universal Health Identity",
    "Unified EHR",
    "Hospital Management System",
    "FHIR R4",
    "ABDM",
    "Clinical Operating System",
    "Digital Health",
    "Sathus Technology"
  ],
  alternates: {
    canonical: "https://ohid.online"
  },
  openGraph: {
    title: "One Health ID (OH-ID) — Unified Healthcare Network | Powered by Sathus Technology Pvt Ltd",
    description: "Universal Healthcare Identity, Unified EHR & Clinical Operating System across Connected Hospitals. Powered by Sathus Technology Pvt Ltd.",
    url: "https://ohid.online",
    siteName: "One Health ID (OH-ID)",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://ohid.online/images/og-preview.png",
        secureUrl: "https://ohid.online/images/og-preview.png",
        width: 1200,
        height: 630,
        alt: "OneHealth ID (OH-ID) — Unified Healthcare Network & Clinical Operating System",
        type: "image/png"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "One Health ID (OH-ID) — Unified Healthcare Network | Powered by Sathus Technology Pvt Ltd",
    description: "Universal Healthcare Identity, Unified EHR & Clinical Operating System across Connected Hospitals. Powered by Sathus Technology Pvt Ltd.",
    images: ["https://ohid.online/images/og-preview.png"],
    creator: "@sathustech",
    site: "@sathustech"
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/logo-icon.png", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ],
    shortcut: ["/favicon.ico"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  }
};

import { WorkspaceClientProvider } from "@/components/providers/WorkspaceClientProvider";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-white`}
    >
      <body className="min-h-full flex flex-col bg-white text-slate-900">
        <WorkspaceClientProvider>
          {children}
        </WorkspaceClientProvider>
      </body>
    </html>
  );
}
