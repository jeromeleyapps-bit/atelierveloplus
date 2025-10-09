/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // ← Mode standalone pour Electron
  reactStrictMode: false, // Désactivé pour éviter les problèmes WebSocket avec Cloudflare Tunnel
  eslint: {
    // Allow production builds to succeed even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
  experimental: {
    typedRoutes: false, // Désactiver les routes typées pour éviter les erreurs
  },
  // Allow Cloudflare tunnel domain for dev resources
  allowedDevOrigins: [
    'https://rdv.upgradedbikes.com',
  ],
  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Disable HMR WebSocket
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };
      
      // Disable webpack-dev-server overlay
      if (config.devServer) {
        config.devServer.hot = false;
      }
    }
    
    // Fix for html5-qrcode dynamic imports
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // CSP - Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.pwnedpasswords.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          // HSTS - Force HTTPS
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // X-Frame-Options - Prevention clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // X-Content-Type-Options - Prevention MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Referrer-Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions-Policy - Restreindre camera aux pages scanner
          {
            key: 'Permissions-Policy',
            value: 'camera=(self "https://rdv.upgradedbikes.com"), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: true,
      },
      // Eviter 404 favicon par défaut: rediriger vers notre SVG
      {
        source: "/favicon.ico",
        destination: "/icons/icon.svg",
        permanent: false,
      },
      {
        source: "/booking",
        destination: "/booking-local",
        permanent: true,
      },
      // Legacy auth paths to new custom auth pages
      {
        source: "/login",
        destination: "/auth/login",
        permanent: true,
      },
      {
        source: "/register",
        destination: "/auth/register",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
