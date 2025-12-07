/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // ============================================================================
  // MODE STANDALONE - Activé pour réduire node_modules (ENAMETOOLONG fix)
  // ============================================================================
  // Next.js trace automatiquement les dépendances nécessaires
  // Résultat: ~3000 fichiers au lieu de ~110000
  output: 'standalone',

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

  // OPTIMISATIONS SPRINT 1.3 - 25 nov 2024
  // Tree-shaking MUI automatique
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
    // Forcer l'inclusion des binaires Prisma dans le tracing standalone
    outputFileTracingIncludes: {
      '/*': ['./node_modules/.prisma/client/**/*'],
    },
  },

  // Configuration Webpack minimale
  webpack: (config, { isServer }) => {
    // Désactiver cache pour éviter warnings
    if (isServer) {
      config.cache = false;
    }
    
    // OPTIMISATIONS SPRINT 1.3 - 25 nov 2024
    // Minification Terser aggressive en production
    if (!isServer && process.env.NODE_ENV === 'production') {
      const TerserPlugin = require('terser-webpack-plugin');
      const webpack = require('webpack');
      
      config.optimization = {
        ...config.optimization,
        minimize: true,
        usedExports: true,
        sideEffects: true,
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: true,  // Supprimer tous les console.*
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info', 'console.debug'],
                passes: 2,  // 2 passes de compression
              },
              mangle: true,
              output: {
                comments: false,  // Supprimer commentaires
              },
            },
          }),
        ],
      };
      
      // Exclure locales inutilisées (date-fns, moment si présent)
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^\.\/locale$/,
          contextRegExp: /date-fns/,
        })
      );
    }
    
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
