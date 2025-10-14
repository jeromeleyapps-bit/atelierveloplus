/***********************
 * Next.js config
 **********************/
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // ← Mode standalone pour Electron
  eslint: {
    // Allow production builds to succeed even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to succeed even if there are type errors
    ignoreBuildErrors: true,
  },
  experimental: {
    typedRoutes: true,
    optimizePackageImports: ["@mui/material", "@mui/icons-material"],
    outputFileTracingRoot: require('path').join(__dirname, '../../'), // Trace depuis la racine du monorepo
    outputFileTracingIncludes: {
      '/': ['./node_modules/styled-jsx/**/*'],
    },
  },
  webpack: (config) => {
    // Ignore problematic Windows system files from file watching to prevent lstat EINVAL errors
    // Use RegExp patterns as Watchpack expects string/RegExp/array (function may not be supported reliably)
    const sysFilesRegex = [
      /(^|:)\\\\?C:[\\\\\/]hiberfil\.sys$/i,
      /(^|:)\\\\?C:[\\\\\/]pagefile\.sys$/i,
      /(^|:)\\\\?C:[\\\\\/]swapfile\.sys$/i,
      /(^|:)\\\\?C:[\\\\\/]DumpStack\.log(\.tmp)?$/i,
    ];
    config.watchOptions = config.watchOptions || {};
    const prevIgnored = config.watchOptions.ignored;
    if (Array.isArray(prevIgnored)) {
      config.watchOptions.ignored = [...prevIgnored, ...sysFilesRegex];
    } else if (prevIgnored) {
      config.watchOptions.ignored = [prevIgnored, ...sysFilesRegex];
    } else {
      config.watchOptions.ignored = sysFilesRegex;
    }
    return config;
  },
  reactStrictMode: true,
  images: {
    // Use remotePatterns instead of deprecated domains
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  // Variables d'environnement exposées au client
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "1.0.0",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    NEXT_PUBLIC_METRICS_ENABLED:
      process.env.NODE_ENV === "production" ? "true" : "false",
  },
  // Note: remove custom styled-components alias to avoid SSR/CSR hydration mismatches with MUI
  // Keep default Emotion engine for MUI (no alias override).
  // Amélioration de la sécurité des en-têtes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

// En-têtes de sécurité
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

module.exports = nextConfig;