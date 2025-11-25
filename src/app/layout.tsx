/**
 * Atelier Vélo+ - Système de Gestion d'Atelier Vélo
 * 
 * Copyright © 2024-2025 Jérôme Leyssard - Upgraded Bikes
 * Tous droits réservés.
 * 
 * Ce logiciel est la propriété exclusive de Jérôme Leyssard.
 * Toute reproduction, distribution ou modification non autorisée est interdite.
 * 
 * Contact: jerome.leyssard@upgradedbikes.com
 * Site: https://upgradedbikes.com
 */

// src/app/layout.tsx (Server Component)
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers";
import { SentryProvider } from "@/components/providers/SentryProvider";

const inter = Inter({ subsets: ["latin"] });

// Force dynamic rendering for all pages (fixes useContext pre-rendering issues)
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Atelier Vélo+ | Upgraded Bikes",
  description: "Système de gestion d'atelier vélo - Copyright © 2024-2025 Jérôme Leyssard",
  // Note: viewport + themeColor doivent être exportés via `export const viewport`
  // Pour éviter des warnings Next sur chaque route.
  icons: {
    icon: [
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-64x64.png", sizes: "64x64", type: "image/png" },
      { url: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-256x256.png", sizes: "256x256", type: "image/png" },
      { url: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Atelier Vélo",
    description: "Application de gestion pour atelier vélo",
    type: "website",
    locale: "fr_FR",
  },
};

// Déplacer la configuration viewport + themeColor ici (Next.js App Router)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.className}>
      <head>
        <meta httpEquiv="Permissions-Policy" content="camera=*, microphone=*, geolocation=*" />
      </head>
      <body>
        <SentryProvider>
          <AppProviders>{children}</AppProviders>
        </SentryProvider>
      </body>
    </html>
  );
}
