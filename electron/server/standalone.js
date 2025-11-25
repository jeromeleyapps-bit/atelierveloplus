/**
 * Next.js Standalone Server Manager
 * 
 * RESPONSABILITÉ: Démarrage/arrêt serveur Next.js en production
 * ISOLATION: Gestion processus + logs + env vars
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const dotenv = require('dotenv');

let serverProcess = null;

/**
 * Charge variables d'environnement depuis .env et .env.production
 * 
 * @param {string} webPath - Chemin resources/web
 * @returns {Object} - Variables d'environnement
 */
function loadEnvFiles(webPath) {
  const envVars = {};
  
  // .env.production (prioritaire)
  const envProdPath = path.join(webPath, '.env.production');
  if (fs.existsSync(envProdPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envProdPath));
    Object.assign(envVars, parsed);
  }
  
  // .env (fallback)
  const envPath = path.join(webPath, '.env');
  if (fs.existsSync(envPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envPath));
    Object.assign(envVars, parsed);
  }
  
  return envVars;
}

/**
 * Trouve le chemin du query engine Prisma
 * 
 * @param {string} webPath - Chemin resources/web
 * @param {Object} logger - Logger
 * @returns {string|null} - Chemin engine ou null
 */
function findPrismaEngine(webPath, logger) {
  const engineRoot = path.join(webPath, 'npm_modules', '.prisma', 'client');
  
  try {
    logger.log('[PRISMA] Recherche query engine dans:', engineRoot);
    const engineFile = fs.readdirSync(engineRoot).find((file) => file.endsWith('.node'));
    
    if (engineFile) {
      const enginePath = path.join(engineRoot, engineFile);
      logger.log('[PRISMA] ✅ Query engine trouvé:', engineFile);
      logger.log('[PRISMA] Fichier existe:', fs.existsSync(enginePath));
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
 * Démarre le serveur Next.js standalone
 * 
 * @param {Object} config - Configuration
 * @param {string} config.resourcesPath - Chemin process.resourcesPath
 * @param {string} config.dataPath - Chemin userData
 * @param {string} config.dbPath - Chemin base de données
 * @param {Function} config.ensureSymlink - Fonction création symlink
 * @param {Object} logger - Logger
 * @returns {Object} - Processus serveur
 */
function startStandaloneServer(config, logger) {
  const { resourcesPath, dataPath, dbPath, ensureSymlink } = config;
  
  const webPath = path.join(resourcesPath, 'web');
  const serverPath = path.join(webPath, 'server.js');
  
  // WORKAROUND: Créer symlink node_modules → npm_modules
  // CRITIQUE: Doit être fait AVANT démarrage serveur
  if (!fs.existsSync(path.join(webPath, 'node_modules'))) {
    const success = ensureSymlink(webPath, logger);
    if (!success) {
      logger.error('[NEXT] ❌ CRITIQUE: node_modules manquant');
      logger.error('[NEXT] Serveur Next.js ne pourra pas démarrer');
      
      const { dialog, app } = require('electron');
      dialog.showErrorBox(
        'Erreur Serveur',
        'Impossible de configurer le serveur Next.js.\n\n' +
        'Le dossier node_modules ne peut pas être créé.\n' +
        'L\'application doit se fermer.'
      );
      
      app.quit();
      return null;
    }
  }
  
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

  // Charger variables d'environnement
  const envVars = loadEnvFiles(webPath);
  
  // Trouver Prisma engine
  const enginePath = findPrismaEngine(webPath, logger);
  
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
    NODE_PATH: path.join(webPath, 'npm_modules')
  };

  logger.info('[PRISMA] Variables environnement configurées');
  logger.info('[NEXT] Lancement du serveur...');
  logger.info('[NEXT] Node:', nodePath);
  logger.info('[NEXT] Port:', env.PORT);
  logger.info('[NEXT] Database:', env.DATABASE_URL);
  
  // Lancer le serveur
  serverProcess = spawn(nodePath, [serverPath], { cwd: webPath, env });
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
