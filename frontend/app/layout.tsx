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
  title: "One Health ID (OH-ID) — Unified Healthcare Network | Powered by Sathus Technology Pvt Ltd",
  description: "Universal Healthcare Identity, Unified EHR & Clinical Operating System across Connected Hospitals. Powered by Sathus Technology Pvt Ltd.",
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
