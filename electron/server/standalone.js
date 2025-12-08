/**
 * Next.js Standalone Server Manager (MODE ASAR)
 * 
 * RESPONSABILITÉ: Démarrage/arrêt serveur Next.js en production
 * ISOLATION: Gestion processus + logs + env vars
 * 
 * CHANGEMENT 7 déc 2025: web/ est maintenant dans app.asar
 * - server.js dans app.asar/web/server.js
 * - npm_modules dans app.asar/web/npm_modules/
 * - Query engine dans app.asar.unpacked/
 * - .env.production dans extraResources (resources/)
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const dotenv = require('dotenv');
const { app } = require('electron');

let serverProcess = null;

/**
 * Charge variables d'environnement depuis extraResources
 * CHANGEMENT 7 déc 2025: .env.production dans resources/ (pas resources/web/)
 * 
 * @param {string} resourcesPath - Chemin process.resourcesPath
 * @returns {Object} - Variables d'environnement
 */
function loadEnvFiles(resourcesPath) {
  const envVars = {};
  
  // .env.production dans extraResources (pas dans ASAR)
  const envProdPath = path.join(resourcesPath, '.env.production');
  if (fs.existsSync(envProdPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envProdPath));
    Object.assign(envVars, parsed);
  }
  
  return envVars;
}

/**
 * Trouve le chemin du query engine Prisma dans app.asar.unpacked
 * CHANGEMENT 7 déc 2025: Engine dans app.asar.unpacked (binaire natif)
 * 
 * @param {string} resourcesPath - Chemin process.resourcesPath
 * @param {Object} logger - Logger
 * @returns {string|null} - Chemin engine ou null
 */
function findPrismaEngine(resourcesPath, logger) {
  // Query engine dans app.asar.unpacked (binaire natif)
  // CHEMIN: app.asar.unpacked/electron/web/node_modules/.prisma/client/
  const engineRoot = path.join(
    resourcesPath,
    'app.asar.unpacked',
    'electron',
    'web',
    'node_modules',
    '.prisma',
    'client'
  );
  
  try {
    logger.log('[PRISMA] Recherche query engine dans:', engineRoot);
    
    if (!fs.existsSync(engineRoot)) {
      logger.error('[PRISMA] ❌ engineRoot non trouvé:', engineRoot);
      return null;
    }
    
    const engineFile = fs.readdirSync(engineRoot).find((file) => file.endsWith('.node'));
    
    if (engineFile) {
      const enginePath = path.join(engineRoot, engineFile);
      logger.log('[PRISMA] ✅ Query engine trouvé:', engineFile);
      return enginePath;
    } else {
      logger.error('[PRISMA] ❌ Aucun fichier .node trouvé');
      return null;
    }
  } catch (error) {
    logger.error('[PRISMA] ❌ Erreur lecture engineRoot:', error.message);
    return null;
  }
}

/**
 * Démarre le serveur Next.js standalone (MODE ASAR)
 * 
 * CHANGEMENT 7 déc 2025: web/ est dans app.asar
 * Plus besoin de symlink node_modules → npm_modules
 * 
 * @param {Object} config - Configuration
 * @param {string} config.resourcesPath - Chemin process.resourcesPath
 * @param {string} config.dataPath - Chemin userData
 * @param {string} config.dbPath - Chemin base de données
 * @param {Object} logger - Logger
 * @returns {Object} - Processus serveur
 */
function startStandaloneServer(config, logger) {
  const { resourcesPath, dataPath, dbPath } = config;
  
  // MODE ASAR: web/ est dans app.asar/electron/web/
  const webPath = path.join(app.getAppPath(), 'electron', 'web');
  const serverPath = path.join(webPath, 'server.js');
  const nodeModulesPath = path.join(webPath, 'node_modules');
  
  // Wrapper pour contourner le problème de chdir dans ASAR
  // Le wrapper est dans electron/ (hors de web/) donc accessible
  const wrapperPath = path.join(app.getAppPath(), 'electron', 'server-wrapper.js');
  
  // NOTE 7 déc 2025: Plus besoin de symlink, Electron résout les chemins ASAR
  
  logger.info('[NEXT] ===== DÉMARRAGE SERVEUR NEXT.JS =====');
  logger.info('[NEXT] webPath:', webPath);
  logger.info('[NEXT] serverPath:', serverPath);

  // Vérifier que server.js existe
  if (!fs.existsSync(serverPath)) {
    logger.error('[NEXT] ❌ Fichier server.js INTROUVABLE:', serverPath);
    if (fs.existsSync(webPath)) {
      logger.error('[NEXT] Contenu webPath:', fs.readdirSync(webPath).slice(0, 20));
    }
    return null;
  }
  
  logger.info('[NEXT] ✅ server.js trouvé');

  // Préparer logs
  const logsDir = path.join(dataPath, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const serverLogPath = path.join(logsDir, 'next-server.log');

  // Node.js runtime: Utiliser Electron (inclut Node.js)
  // FIX PC3: process.execPath = Electron qui inclut Node.js
  // Évite erreur "spawn node ENOENT" sur PC sans Node.js installé
  // Pattern standard Electron (VS Code, Slack, Discord utilisent ce pattern)
  const nodePath = process.execPath;

  // Charger variables d'environnement (depuis extraResources, pas ASAR)
  const envVars = loadEnvFiles(resourcesPath);
  
  // Trouver Prisma engine (dans app.asar.unpacked)
  const enginePath = findPrismaEngine(resourcesPath, logger);
  
  // Configuration complète environnement
  const env = {
    ...process.env,
    ...envVars,
    // CRITIQUE: Forcer Electron à s'exécuter comme Node.js (pas comme app Electron)
    // Évite la détection d'instance unique qui ferme le processus serveur
    ELECTRON_RUN_AS_NODE: '1',
    HOSTNAME: '127.0.0.1',
    PORT: envVars.PORT || '3000',
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    AUTH_TRUST_HOST: envVars.AUTH_TRUST_HOST || '1',
    NEXTAUTH_URL: envVars.NEXTAUTH_URL || 'http://127.0.0.1:3000',
    // TOUJOURS utiliser le chemin absolu de la DB
    DATABASE_URL: `file:${dbPath}`,
    RESOURCES_PATH: resourcesPath,
    USER_DATA_PATH: dataPath, // AppData\Roaming\Atelier Velo+ (uploads)
    // Variables Prisma critiques
    PRISMA_CLIENT_ENGINE_TYPE: 'library',
    PRISMA_QUERY_ENGINE_LIBRARY: enginePath,
    NODE_PATH: nodeModulesPath,
    // Cache Next.js hors de l'ASAR (évite erreurs ENOTDIR)
    NEXT_CACHE_DIR: path.join(dataPath, 'cache', 'next')
  };

  logger.info('[PRISMA] Variables environnement configurées');
  logger.info('[NEXT] Lancement du serveur...');
  logger.info('[NEXT] Node:', nodePath);
  logger.info('[NEXT] Port:', env.PORT);
  logger.info('[NEXT] Database:', env.DATABASE_URL);
  
  // Lancer le serveur via le wrapper
  // Le wrapper contourne le problème de process.chdir() dans ASAR
  const actualCwd = resourcesPath;
  logger.info('[NEXT] CWD (réel):', actualCwd);
  logger.info('[NEXT] wrapperPath:', wrapperPath);
  logger.info('[NEXT] serverPath (ASAR):', serverPath);
  
  // Le wrapper reçoit le chemin du server.js en argument
  serverProcess = spawn(nodePath, [wrapperPath, serverPath], { 
    cwd: actualCwd, 
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  logger.info('[NEXT] ✅ Process spawned, PID:', serverProcess.pid);

  // Capturer logs
  const logStream = fs.createWriteStream(serverLogPath, { flags: 'a' });
  
  serverProcess.stdout.on('data', (d) => {
    const line = d.toString();
    logStream.write(`[STDOUT] ${line}`);
    if (line.trim()) logger.info('[Next]', line.trim());
  });
  
  serverProcess.stderr.on('data', (d) => {
    const line = d.toString();
    logStream.write(`[STDERR] ${line}`);
    if (line.trim()) logger.error('[NextE]', line.trim());
  });
  
  serverProcess.on('error', (err) => {
    logger.error('[Next] ❌ spawn error', err);
    logStream.write(`[ERROR] ${err}\n`);
  });
  
  serverProcess.on('close', (code) => {
    logger.info('[Next] exited with code', code);
    logStream.write(`[CLOSE] Exit code: ${code}\n`);
  });
  
  return serverProcess;
}

/**
 * Arrête le serveur Next.js
 * 
 * @param {Object} logger - Logger
 */
function killServer(logger) {
  if (serverProcess && serverProcess.pid) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${serverProcess.pid} /f /t`, { stdio: 'ignore' });
      } else {
        serverProcess.kill('SIGTERM');
      }
      logger.info('[NEXT] ✅ Serveur arrêté');
    } catch (err) {
      logger.warn('[NEXT] Erreur arrêt serveur:', err.message);
    }
    serverProcess = null;
  }
}

module.exports = {
  startStandaloneServer,
  killServer,
  loadEnvFiles,
  findPrismaEngine
};
