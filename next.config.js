/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mode standalone DÉSACTIVÉ
  // output: 'standalone',

  // Désactiver les source maps en production
  productionBrowserSourceMaps: false,

  // Images non optimisées (nécessaire pour Electron)
  images: {
    unoptimized: true,
  },

  // Ignorer les erreurs TS pendant le build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Configuration Webpack minimale
  webpack: (config, { isServer }) => {
    // Désactiver cache pour éviter warnings
    if (isServer) {
      config.cache = false;
    }
    
    return config;
  },
};

module.exports = nextConfig;
