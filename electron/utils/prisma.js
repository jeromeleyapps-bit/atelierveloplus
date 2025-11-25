/**
 * Prisma Client Loader - Mode Packagé
 * 
 * CAUSE: Electron packagé nécessite résolution modules custom
 * Prisma fait require('.prisma/client/default') qui doit trouver chemin
 * 
 * SOLUTION: createRequire depuis contexte @prisma/client
 * 
 * PRÉ-REQUIS: Symlink node_modules → npm_modules créé
 * 
 * HISTORIQUE:
 * - Commit 353c90c: Fix ordre exécution (symlink AVANT loadPrismaClient)
 * - Commit 5d9532d: Utiliser web/npm_modules au lieu de prisma-client/
 */

const fs = require('fs');
const path = require('path');
const Module = require('module');

/**
 * Charge Prisma Client avec résolution correcte en mode packagé
 * 
 * @param {Object} app - Instance Electron app
 * @param {Object} logger - Logger (console par défaut)
 * @param {Function} createRequireFn - Fonction createRequire (pour tests, défaut: Module.createRequire)
 * @returns {Object} - Module @prisma/client
 * 
 * @example
 * const { PrismaClient } = loadPrismaClient(app);
 * const prisma = new PrismaClient();
 * 
 * @example
 * // Pour les tests : injection de dépendance
 * const mockCreateRequire = jest.fn((path) => jest.fn((id) => mockPrismaClient));
 * loadPrismaClient(mockApp, mockLogger, mockCreateRequire);
 */
function loadPrismaClient(app, logger = console, createRequireFn = Module.createRequire) {
  // Mode développement: require standard
  if (!app.isPackaged) {
    logger.log('[PRISMA] Mode dev: require standard');
    return require('@prisma/client');
  }

  logger.log('[PRISMA] Mode packagé: résolution custom...');

  // Utiliser web/npm_modules/ (structure correcte pour Prisma)
  const webPath = path.join(process.resourcesPath, 'web');
  const npmModulesPath = path.join(webPath, 'npm_modules');
  const clientRoot = path.join(npmModulesPath, '@prisma', 'client');
  const engineRoot = path.join(npmModulesPath, '.prisma', 'client');

  // ✅ createRequire depuis contexte @prisma/client (injecté pour tests)
  // Ceci permet à Prisma de résoudre ses require relatifs: require('.prisma/client/default')
  // IMPORTANT: Symlink node_modules → npm_modules créé au runtime
  // NOTE: createRequireFn injecté pour faciliter les tests unitaires (inversion de dépendances)
  const createRequire = createRequireFn || Module.createRequire || Module.createRequireFromPath;
  const requireFromPrisma = createRequire(
    path.join(clientRoot, 'package.json')
  );

  // Configuration variables d'environnement Prisma
  if (!process.env.PRISMA_CLIENT_ENGINE_TYPE) {
    process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';
    logger.log('[PRISMA] Engine type: library');
  }

  if (!process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
    try {
      // Filtrer explicitement pour le binaire Windows
      // Format Prisma: libquery_engine-windows.dll.node
      // Doc: https://www.prisma.io/docs/concepts/components/prisma-engines
      const engineFile = fs
        .readdirSync(engineRoot)
        .find((file) => file.includes('windows') && file.endsWith('.node'));
      
      if (engineFile) {
        process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(engineRoot, engineFile);
        logger.log('[PRISMA] Engine Windows trouvé:', engineFile);
      } else {
        logger.error('[PRISMA] ❌ Aucun binaire Windows trouvé dans:', engineRoot);
        logger.error('[PRISMA] Fichiers présents:', fs.readdirSync(engineRoot).join(', '));
      }
    } catch (error) {
      logger.warn('[PRISMA] Erreur lecture engineRoot:', error.message);
    }
  }

  // ✅ Require via contexte créé (résout correctement .prisma/client/default)
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
