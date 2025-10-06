/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Allow production builds to succeed even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
  experimental: {
    typedRoutes: false, // Désactiver les routes typées pour éviter les erreurs
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
