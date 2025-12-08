/**
 * Prisma Client Loader - Mode Packagé (ASAR)
 * 
 * CHANGEMENT 7 déc 2025: web/ est maintenant dans app.asar
 * - npm_modules dans app.asar/web/npm_modules/
 * - Query engine dans app.asar.unpacked/web/npm_modules/.prisma/client/
 * 
 * Plus besoin de symlink node_modules → npm_modules
 * Electron résout automatiquement les chemins dans ASAR
 * 
 * HISTORIQUE:
 * - Commit 353c90c: Fix ordre exécution (symlink AVANT loadPrismaClient)
 * - Commit 5d9532d: Utiliser web/npm_modules au lieu de prisma-client/
 * - 7 déc 2025: Mode ASAR - Plus de symlink nécessaire
 */

const fs = require('fs');
const path = require('path');
const Module = require('module');

/**
 * Charge Prisma Client avec résolution correcte en mode ASAR
 * 
 * @param {Object} app - Instance Electron app
 * @param {Object} logger - Logger (console par défaut)
 * @param {Function} createRequireFn - Fonction createRequire (pour tests)
 * @returns {Object} - Module @prisma/client
 */
function loadPrismaClient(app, logger = console, createRequireFn = Module.createRequire) {
  // Mode développement: require standard
  if (!app.isPackaged) {
    logger.log('[PRISMA] Mode dev: require standard');
    return require('@prisma/client');
  }

  logger.log('[PRISMA] Mode packagé ASAR: résolution custom...');

  // MODE ASAR: web/ est dans app.asar/electron/web/
  // app.getAppPath() retourne le chemin vers app.asar
  // La structure dans l'ASAR est: electron/web/node_modules/
  const webPath = path.join(app.getAppPath(), 'electron', 'web');
  const nodeModulesPath = path.join(webPath, 'node_modules');
  const clientRoot = path.join(nodeModulesPath, '@prisma', 'client');
  
  // Query engine dans app.asar.unpacked (binaire natif)
  // CHEMIN: app.asar.unpacked/electron/web/node_modules/.prisma/client/
  const engineRoot = path.join(
    process.resourcesPath,
    'app.asar.unpacked',
    'electron',
    'web',
    'node_modules',
    '.prisma',
    'client'
  );

  logger.log('[PRISMA] webPath (ASAR):', webPath);
  logger.log('[PRISMA] clientRoot:', clientRoot);
  logger.log('[PRISMA] engineRoot (unpacked):', engineRoot);

  // createRequire depuis contexte @prisma/client
  const createRequire = createRequireFn || Module.createRequire || Module.createRequireFromPath;
  const requireFromPrisma = createRequire(
    path.join(clientRoot, 'package.json')
  );

  // Configuration variables d'environnement Prisma
  process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';
  logger.log('[PRISMA] Engine type: library');

  if (!process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
    try {
      // Chercher dans app.asar.unpacked (binaires natifs)
      if (fs.existsSync(engineRoot)) {
        const engineFile = fs
          .readdirSync(engineRoot)
          .find((file) => file.endsWith('.node'));
        
        if (engineFile) {
          process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(engineRoot, engineFile);
          logger.log('[PRISMA] ✅ Engine trouvé:', engineFile);
        } else {
          logger.error('[PRISMA] ❌ Aucun .node trouvé dans:', engineRoot);
        }
      } else {
        logger.error('[PRISMA] ❌ engineRoot non trouvé:', engineRoot);
      }
    } catch (error) {
      logger.warn('[PRISMA] Erreur lecture engineRoot:', error.message);
    }
  }

  // Require via contexte créé
  logger.log('[PRISMA] Chargement @prisma/client...');
  return requireFromPrisma('@prisma/client');
}

/**
 * Initialise Prisma Client singleton
 * 
 * @param {Object} app - Instance Electron app
 * @param {Object} logger - Logger
 * @returns {PrismaClient} - Instance Prisma Client
 */
function initPrismaClient(app, logger = console) {
  const { PrismaClient } = loadPrismaClient(app, logger);
  const client = new PrismaClient();
  
  logger.log('[PRISMA] Client initialisé');
  return client;
}

module.exports = {
  loadPrismaClient,
  initPrismaClient
};
