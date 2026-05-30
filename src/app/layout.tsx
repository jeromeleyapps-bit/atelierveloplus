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
import type { Metadata } from "next";
import { Inter } from "next/font/google";

// Note: viewport config via meta tags dans head (Next.js 13.x)
import "./globals.css";
import { AppProviders } from "./providers";
import { SentryProvider } from "@/components/providers/SentryProvider";

const inter = Inter({ subsets: ["latin"] });

// Force dynamic rendering for all pages (fixes useContext pre-rendering issues)
export const dynamic = 'force-dynamic';

// Déterminer la base URL pour les métadonnées (Open Graph, Twitter Card)
// Pour Electron en local, utiliser localhost:3000 par défaut
const getMetadataBase = (): URL => {
  // En production ou si défini dans l'environnement, utiliser la variable d'environnement
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  return new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`);
};

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "Atelier Vélo+ | Upgraded Bikes",
  description: "Atelier Vélo+ — logiciel de gestion pour atelier de réparation vélo (Upgraded Bikes).",
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

// Note: viewport et themeColor sont configurés via meta tags dans le head ci-dessous

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.className}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#3b82f6" />
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
