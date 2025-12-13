/**
 * ============================================================================
 * PREPARE BUILD OPTIMISÉ - Performance Maximale
 * ============================================================================
 * Date: 15 novembre 2025
 * Méthodologie: AGILE 7 étapes (Étape 3 - CORRIGER)
 * Optimisations: Liste blanche node_modules + Cleanup agressif
 * 
 * GAINS ESTIMÉS:
 * - Taille: -200 à -300 MB
 * - Temps build: -5 à -10 min
 * - Temps installation: -5 à -8 min
 * 
 * Sources:
 * - Electron Performance Docs: https://www.electronjs.org/docs/latest/tutorial/performance
 * - Medium 2024: "Reducing Build Size of Your Electron App"
 * - Pattern VS Code, Slack, Discord
 * ============================================================================
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

console.log('');
console.log('='.repeat(80));
console.log('PRÉPARATION BUILD ELECTRON - ATELIER VÉLO+ (OPTIMISÉ)');
console.log('='.repeat(80));
console.log('');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PATHS = {
  // Sources (racine projet)
  nextBuild: path.join(__dirname, '.next'),
  nextStatic: path.join(__dirname, '.next', 'static'),
  nextServer: path.join(__dirname, '.next', 'server'),
  public: path.join(__dirname, 'public'),
  prisma: path.join(__dirname, 'prisma'),
  envProduction: path.join(__dirname, '.env.production'),
  nodeModules: path.join(__dirname, 'node_modules'),
  prismaClient: path.join(__dirname, 'node_modules', '@prisma', 'client'),
  dotPrisma: path.join(__dirname, 'node_modules', '.prisma', 'client'),
  licensePublicKey: path.join(__dirname, 'src', 'lib', 'license-rsa-public.pem'),

  // ============================================================================
  // DESTINATION: electron/web/ (DANS ASAR)
  // ============================================================================
  // CHANGEMENT 7 déc 2025: Copier vers electron/web/ au lieu de electron-resources/web/
  // RAISON: Tout le code sera inclus dans app.asar pour éviter ENAMETOOLONG
  // electron-builder inclura electron/**/* dans l'ASAR
  // ============================================================================
  resources: path.join(__dirname, 'electron', 'web'),
  schemaSQL: path.join(__dirname, 'electron', 'schema.sql'),
};

// ============================================================================
// LISTE BLANCHE NODE_MODULES (SERVER-ONLY)
// ============================================================================
// OPTIMISATION CRITIQUE: Copier UNIQUEMENT les modules nécessaires côté serveur
// Les modules UI (@mui, fullcalendar, recharts, etc.) sont déjà dans .next/
// Source: Electron Performance Docs - "Carelessly including modules"
// ============================================================================

const SERVER_ONLY_MODULES = [
  // ===== NEXT.JS CORE (OBLIGATOIRE) =====
  'next',
  '@next/env',
  'styled-jsx',
  '@swc/helpers',
  'caniuse-lite',
  'postcss',
  'watchpack',          // Next.js dependency (file watching)
  'graceful-fs',        // watchpack dependency (CRITIQUE - manquant causait écran noir)

  // ===== REACT CORE (OBLIGATOIRE) =====
  'react',
  'react-dom',

  // ===== DATABASE (OBLIGATOIRE) =====
  '@prisma/client',
  '.prisma',

  // ===== IMAGES (OBLIGATOIRE) =====
  'sharp',
  '@img',  // Binaires natifs libvips
  'detect-libc',        // sharp dependency
  'color',              // sharp dependency
  'color-string',       // sharp → color dependency
  'color-convert',      // sharp → color dependency
  'color-name',         // sharp → color-convert dependency
  'simple-swizzle',     // sharp → color dependency
  'semver',             // sharp dependency

  // ===== AUTH & SECURITY (OBLIGATOIRE) =====
  'jsonwebtoken',
  'jose',
  'bcryptjs',

  // ===== EMAIL (OBLIGATOIRE) =====
  'nodemailer',

  // ===== UTILITIES (OBLIGATOIRE) =====
  'date-fns',
  'zod',
  'dotenv',
  'fs-extra',
  'axios',
  'micromatch',

  // ===== MONITORING (NATIF - pas de dépendances externes) =====
  // Sentry désactivé (fin période essai) - Utiliser monitoring-native.ts

  // ===== CRON JOBS (SI UTILISÉ SERVEUR) =====
  'node-cron',

  // ===== PDF GENERATION (SI UTILISÉ SERVEUR) =====
  'pdf-lib',

  // ===== MACHINE ID (LICENSING) =====
  'node-machine-id',
  'hw-fingerprint',
];

// ===== MODULES EXCLUS (CLIENT-ONLY, déjà dans .next/) =====
// @mui/material, @mui/icons-material, @mui/x-data-grid (~80 MB)
// @fullcalendar/* (~15 MB)
// recharts, framer-motion (~10 MB)
// @tanstack/react-query-devtools (dev only)
// html5-qrcode (client only)
// @emotion/* (client only)
// archiver (si non utilisé serveur)

const errors = [];
const warnings = [];

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function logError(message) {
  errors.push(message);
  console.error(`❌ ERREUR: ${message}`);
}

function logWarning(message) {
  warnings.push(message);
  console.warn(`⚠️  WARNING: ${message}`);
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function checkPath(p, name, required = true) {
  if (fs.existsSync(p)) {
    logSuccess(`${name} trouvé`);
    return true;
  } else {
    if (required) {
      logError(`${name} INTROUVABLE: ${p}`);
    } else {
      logWarning(`${name} absent (optionnel): ${p}`);
    }
    return false;
  }
}

// ============================================================================
// ÉTAPE 1: GÉNÉRATION SCHEMA.SQL
// ============================================================================

log('📋', '');
log('🔍', 'ÉTAPE 1/7 - Génération schema.sql Prisma...');
console.log('');

// Créer le dossier electron-resources d'abord
fs.ensureDirSync(path.join(__dirname, 'electron-resources'));

// Générer schema.sql depuis Prisma schema
try {
  log('⚙️', 'Génération SQL depuis prisma/schema.prisma...');

  const sqlRaw = execSync(
    'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script',
    { encoding: 'utf8' }
  );

  // Supprimer pollution: Tout avant premier "-- CreateTable"
  const lines = sqlRaw.split('\n');
  const firstCreateIndex = lines.findIndex(line =>
    line.trim().startsWith('-- CreateTable') || line.trim().startsWith('CREATE TABLE')
  );

  const cleanSql = firstCreateIndex > 0
    ? lines.slice(firstCreateIndex).join('\n')
    : sqlRaw;

  // Écrire fichier nettoyé
  fs.writeFileSync(PATHS.schemaSQL, cleanSql, 'utf8');

  if (fs.existsSync(PATHS.schemaSQL)) {
    const stats = fs.statSync(PATHS.schemaSQL);
    logSuccess(`schema.sql généré PROPRE (${Math.round(stats.size / 1024)}KB)`);
    if (firstCreateIndex > 0) {
      log('🧹', `Pollution supprimée (${firstCreateIndex} lignes)`);
    }
  } else {
    throw new Error('schema.sql non créé');
  }
} catch (error) {
  logError(`Échec génération schema.sql: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// ÉTAPE 2: VÉRIFICATIONS PRÉ-BUILD
// ============================================================================

console.log('');
log('🔍', 'ÉTAPE 2/7 - Vérifications pré-build...');
console.log('');

// Vérifier Next.js build (.next/ pas standalone)
if (!checkPath(PATHS.nextBuild, 'Next.js build (.next/)')) {
  logError('Vous devez exécuter "npm run build" avant ce script!');
  process.exit(1);
}

// Vérifier fichiers critiques
checkPath(PATHS.nextServer, '.next/server/');
checkPath(PATHS.nextStatic, '.next/static/');
checkPath(PATHS.public, 'public/', false);
checkPath(PATHS.prisma, 'prisma/');
checkPath(PATHS.envProduction, '.env.production');
checkPath(PATHS.prismaClient, '@prisma/client');
checkPath(PATHS.dotPrisma, '.prisma/client');
checkPath(PATHS.licensePublicKey, 'src/lib/license-rsa-public.pem');

// ============================================================================
// ÉTAPE 3: NETTOYAGE ET CRÉATION STRUCTURE
// ============================================================================
// CHANGEMENT 7 déc 2025: Ne PAS supprimer electron/web/ car il contient
// des fichiers du repo (server.js, public/, src/). On nettoie seulement
// les dossiers générés (.next/, node_modules/) pour éviter les conflits.
// ============================================================================

console.log('');
log('🧹', 'ÉTAPE 3/7 - Nettoyage electron/web (partiel)...');

// Nettoyer SEULEMENT les dossiers générés, PAS les fichiers du repo
const generatedDirs = ['.next', 'node_modules'];
generatedDirs.forEach(dir => {
  const dirPath = path.join(PATHS.resources, dir);
  if (fs.existsSync(dirPath)) {
    fs.removeSync(dirPath);
    log('ℹ️', `${dir}/ supprimé (généré)`);
  }
});

// Créer structure si elle n'existe pas
fs.ensureDirSync(PATHS.resources);
logSuccess('Dossier electron/web prêt');

// ============================================================================
// ÉTAPE 4: COPIE STANDALONE (MODE OPTIMISÉ)
// ============================================================================
// Next.js standalone trace automatiquement les dépendances nécessaires
// Résultat: ~3000 fichiers au lieu de ~110000 (réduction 97%)
// Source: https://nextjs.org/docs/app/api-reference/next-config-js/output

console.log('');
log('📦', 'ÉTAPE 4/7 - Copie .next/standalone/ (MODE OPTIMISÉ)...');

const standalonePath = path.join(__dirname, '.next', 'standalone');

// Vérifier que standalone existe
if (!fs.existsSync(standalonePath)) {
  logError('.next/standalone/ non trouvé!');
  logError('Assurez-vous que next.config.js contient: output: "standalone"');
  process.exit(1);
}

try {
  // Copier le contenu de standalone vers electron-resources/web
  // Structure standalone:
  // - .next/ (build compilé)
  // - node_modules/ (dépendances tracées ~2000 fichiers)
  // - server.js (serveur minimal généré par Next.js)
  // - package.json
  
  // 1. Copier .next/ depuis standalone
  const standaloneNext = path.join(standalonePath, '.next');
  const nextDest = path.join(PATHS.resources, '.next');
  
  if (fs.existsSync(standaloneNext)) {
    fs.copySync(standaloneNext, nextDest, {
      filter: (src) => {
        // Exclure cache et fichiers temporaires
        return !src.includes('cache')
          && !src.includes('.DS_Store')
          && !src.endsWith('.js.map')
          && !src.endsWith('.mjs.map')
          && !src.endsWith('.css.map');
      }
    });
    
    // Vérifier chunks serveur
    const serverChunks = path.join(nextDest, 'server');
    if (fs.existsSync(serverChunks)) {
      const files = fs.readdirSync(serverChunks);
      logSuccess(`.next/ copié depuis standalone (${files.length} items serveur)`);
    }
    
    // ============================================================================
    // COPIE EXPLICITE .next/static (CRITIQUE - 7 déc 2025)
    // ============================================================================
    // Next.js standalone NE COPIE PAS .next/static automatiquement
    // Les fichiers JS/CSS clients sont dans .next/static/chunks/
    // Sans eux: erreur 404 + React error #423
    // Ref: https://nextjs.org/docs/pages/api-reference/next-config-js/output
    // ============================================================================
    const staticSrc = path.join(__dirname, '.next', 'static');
    const staticDest = path.join(nextDest, 'static');
    
    if (fs.existsSync(staticSrc)) {
      fs.copySync(staticSrc, staticDest);
      const staticFiles = fs.readdirSync(staticDest, { recursive: true });
      logSuccess(`.next/static/ copié (${staticFiles.length} items) - CRITIQUE pour client JS`);
    } else {
      logError('.next/static/ manquant! Les fichiers JS client ne seront pas disponibles.');
      process.exit(1);
    }
  } else {
    logError('.next/ manquant dans standalone!');
    process.exit(1);
  }
  
  // 2. Copier node_modules tracé depuis standalone
  const standaloneNodeModules = path.join(standalonePath, 'node_modules');
  const nodeModulesDest = path.join(PATHS.resources, 'node_modules');
  
  if (fs.existsSync(standaloneNodeModules)) {
    fs.copySync(standaloneNodeModules, nodeModulesDest);
    
    // Compter les fichiers
    const countFiles = (dir) => {
      let count = 0;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          count += countFiles(path.join(dir, item.name));
        } else {
          count++;
        }
      }
      return count;
    };
    
    const fileCount = countFiles(nodeModulesDest);
    logSuccess(`node_modules copié depuis standalone (${fileCount} fichiers - OPTIMISÉ!)`);
  } else {
    logError('node_modules manquant dans standalone!');
    process.exit(1);
  }
  
  // 3. Vérifier BUILD_ID
  const buildIdPath = path.join(nextDest, 'BUILD_ID');
  if (!fs.existsSync(buildIdPath)) {
    // Chercher dans standalone racine
    const standaloneBuildId = path.join(standalonePath, 'BUILD_ID');
    if (fs.existsSync(standaloneBuildId)) {
      fs.copySync(standaloneBuildId, buildIdPath);
      const buildId = fs.readFileSync(buildIdPath, 'utf8').trim();
      console.log(`[PREBUILD] ✅ BUILD_ID copié : ${buildId}`);
    } else {
      console.log('[PREBUILD] ⚠️  BUILD_ID manquant - Création...');
      const crypto = require('crypto');
      const buildId = crypto.randomBytes(10).toString('hex');
      fs.writeFileSync(buildIdPath, buildId);
      console.log(`[PREBUILD] ✅ BUILD_ID créé : ${buildId}`);
    }
  } else {
    const buildId = fs.readFileSync(buildIdPath, 'utf8').trim();
    console.log(`[PREBUILD] ✅ BUILD_ID présent : ${buildId}`);
  }

} catch (error) {
  logError(`Échec copie standalone: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// ÉTAPE 4.5: COPIE CLÉ PUBLIQUE RSA
// ============================================================================

console.log('');
log('🔐', 'ÉTAPE 4.5/7 - Copie clé publique RSA...');

try {
  // Créer structure src/lib dans electron-resources/web
  const srcLibDest = path.join(PATHS.resources, 'src', 'lib');
  fs.ensureDirSync(srcLibDest);

  // Copier clé publique RSA
  if (fs.existsSync(PATHS.licensePublicKey)) {
    const publicKeyDest = path.join(srcLibDest, 'license-rsa-public.pem');
    fs.copyFileSync(PATHS.licensePublicKey, publicKeyDest);
    logSuccess('Clé publique RSA copiée (src/lib/license-rsa-public.pem)');
  } else {
    logWarning('Clé publique RSA non trouvée (src/lib/license-rsa-public.pem)');
  }
} catch (error) {
  logError(`Échec copie clé publique RSA: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// ÉTAPE 5: COPIE PUBLIC/ ET .ENV.PRODUCTION
// ============================================================================

console.log('');
log('📁', 'ÉTAPE 5/7 - Copie fichiers statiques...');

// Copier public/ (merge avec existant)
try {
  const publicDest = path.join(PATHS.resources, 'public');
  if (fs.existsSync(publicDest)) {
    // public/ existe déjà dans le repo, on merge
    if (fs.existsSync(PATHS.public)) {
      fs.copySync(PATHS.public, publicDest, { overwrite: false });
      logSuccess('public/ mergé (fichiers du repo préservés)');
    } else {
      logSuccess('public/ du repo préservé');
    }
  } else if (fs.existsSync(PATHS.public)) {
    fs.copySync(PATHS.public, publicDest);
    logSuccess('public/ copié');
  } else {
    logWarning('Pas de dossier public/');
  }
} catch (error) {
  logWarning(`public/ non copié: ${error.message}`);
}

// Copier .env.production (CRITIQUE!)
try {
  if (fs.existsSync(PATHS.envProduction)) {
    const envDest = path.join(PATHS.resources, '.env.production');
    fs.copySync(PATHS.envProduction, envDest);
    logSuccess('.env.production copié');
  } else {
    logError('.env.production MANQUANT! Build échouera!');
    process.exit(1);
  }
} catch (error) {
  logError(`.env.production échec: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// ÉTAPE 6: VÉRIFICATION PRISMA ET PACKAGE.JSON (MODE STANDALONE)
// ============================================================================
// En mode standalone, node_modules est déjà copié à l'étape 4
// On vérifie juste que Prisma est bien présent et on copie package.json

console.log('');
log('🔍', 'ÉTAPE 6/7 - Vérification Prisma et package.json...');
console.log('');

const nodeModulesPath = path.join(PATHS.resources, 'node_modules');

try {
  // Vérifier que .prisma/client est présent (copié via outputFileTracingIncludes)
  const prismaClientPath = path.join(nodeModulesPath, '.prisma', 'client');
  
  if (fs.existsSync(prismaClientPath)) {
    logSuccess('.prisma/client présent (tracé par Next.js standalone)');
  } else {
    // Fallback: copier depuis node_modules principal
    log('⚠️', '.prisma/client manquant dans standalone - copie depuis source...');
    const prismaClientSrc = path.join(__dirname, 'node_modules', '.prisma');
    const prismaClientDest = path.join(nodeModulesPath, '.prisma');
    
    if (fs.existsSync(prismaClientSrc)) {
      fs.copySync(prismaClientSrc, prismaClientDest);
      logSuccess('.prisma/client copié depuis node_modules principal');
    } else {
      logError('.prisma non trouvé - exécutez npx prisma generate');
      process.exit(1);
    }
  }
  
  // Vérifier @prisma/client
  const prismaClientLibPath = path.join(nodeModulesPath, '@prisma', 'client');
  if (fs.existsSync(prismaClientLibPath)) {
    logSuccess('@prisma/client présent');
  } else {
    log('⚠️', '@prisma/client manquant - copie depuis source...');
    const prismaLibSrc = path.join(__dirname, 'node_modules', '@prisma', 'client');
    const prismaLibDest = path.join(nodeModulesPath, '@prisma', 'client');
    
    if (fs.existsSync(prismaLibSrc)) {
      fs.ensureDirSync(path.join(nodeModulesPath, '@prisma'));
      fs.copySync(prismaLibSrc, prismaLibDest);
      logSuccess('@prisma/client copié depuis node_modules principal');
    }
  }

  // Copier package.json racine (pour version info)
  const pkgSrc = path.join(__dirname, 'package.json');
  const pkgDest = path.join(PATHS.resources, 'package.json');
  fs.copySync(pkgSrc, pkgDest);
  logSuccess('package.json copié');

} catch (error) {
  logError(`Échec vérification Prisma: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// ÉTAPE 7: COPIE SERVER.JS DEPUIS STANDALONE
// ============================================================================
// Next.js génère un server.js minimal optimisé dans standalone

console.log('');
log('⚙️', 'ÉTAPE 7/7 - Vérification server.js...');

try {
  const standaloneServerJs = path.join(standalonePath, 'server.js');
  const serverDest = path.join(PATHS.resources, 'server.js');
  
  // CHANGEMENT 7 déc 2025: Préserver server.js du repo s'il existe
  // Le server.js du repo est personnalisé pour Electron
  if (fs.existsSync(serverDest)) {
    logSuccess('server.js du repo préservé (personnalisé pour Electron)');
  } else if (fs.existsSync(standaloneServerJs)) {
    fs.copySync(standaloneServerJs, serverDest);
    logSuccess('server.js copié depuis standalone (serveur Next.js optimisé)');
  } else {
    // Fallback: créer un server.js minimal
    log('⚠️', 'server.js manquant dans standalone - création manuelle...');
    const serverJs = `/**
 * Next.js Production Server - Atelier Vélo+
 * Mode: Standalone (généré par prepare-build-optimized.js)
 */
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port, dir: __dirname, conf: { distDir: '.next' } });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      await handle(req, res, parse(req.url, true));
    } catch (err) {
      console.error('Error:', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  })
    .once('error', (err) => { console.error(err); process.exit(1); })
    .listen(port, () => { console.log('> Ready on http://' + hostname + ':' + port); });
});
`;
    fs.writeFileSync(serverDest, serverJs.trim());
    logSuccess('server.js créé (fallback)');
  }
} catch (error) {
  logError(`Échec copie/création server.js: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// ÉTAPE 7: COPIER DÉPENDANCES ELECTRON MAIN PROCESS
// ============================================================================
// AJOUT 13 déc 2025: Le code electron/*.js a besoin de modules externes
// Ces modules doivent être dans electron/node_modules (pas node_modules racine)
// car node_modules racine est exclu du build pour réduire la taille
// ============================================================================

console.log('');
log('🔍', 'ÉTAPE 7/7 - Copie dépendances Electron main process...');
console.log('');

const ELECTRON_DEPENDENCIES = [
  'dotenv',
  'electron-log',
  'fs-extra',
  'graceful-fs',
  'jsonfile',
  'universalify',
  'archiver',
  'check-disk-space',
  'hw-fingerprint',
  'node-machine-id',
  // Dépendances transitives
  'readable-stream',
  'buffer-crc32',
  'compress-commons',
  'crc-32',
  'crc32-stream',
  'lazystream',
  'normalize-path',
  'readdir-glob',
  'tar-stream',
  'zip-stream',
  'async',
  'b4a',
  'bare-events',
  'fast-fifo',
  'queue-tick',
  'streamx',
  'text-decoder',
];

const electronNodeModules = path.join(__dirname, 'electron', 'node_modules');
fs.ensureDirSync(electronNodeModules);

let copiedCount = 0;
ELECTRON_DEPENDENCIES.forEach(dep => {
  const src = path.join(__dirname, 'node_modules', dep);
  const dest = path.join(electronNodeModules, dep);
  
  if (fs.existsSync(src)) {
    try {
      fs.copySync(src, dest, { overwrite: true });
      copiedCount++;
    } catch (err) {
      logWarning(`Impossible de copier ${dep}: ${err.message}`);
    }
  } else {
    // Essayer dans un scope @
    const scopedSrc = path.join(__dirname, 'node_modules', '@' + dep.split('/')[0]);
    if (fs.existsSync(scopedSrc)) {
      try {
        fs.copySync(scopedSrc, path.join(electronNodeModules, '@' + dep.split('/')[0]), { overwrite: true });
        copiedCount++;
      } catch (err) {
        logWarning(`Impossible de copier @${dep}: ${err.message}`);
      }
    }
  }
});

logSuccess(`${copiedCount} dépendances Electron copiées dans electron/node_modules`);

// ============================================================================
// ÉTAPE BONUS: RENOMMER NODE_MODULES → NPM_MODULES (DÉSACTIVÉ)
// ============================================================================
// CHANGEMENT 7 déc 2025: Ne plus renommer node_modules
// RAISON: En mode ASAR, Prisma a besoin de node_modules/ (pas npm_modules/)
// pour résoudre require('.prisma/client/default')
// ============================================================================

console.log('');
log('ℹ️', 'BONUS - node_modules conservé (mode ASAR - Prisma compatible)');

// NOTE: Ne plus renommer - garder node_modules tel quel

// ============================================================================
// RAPPORT FINAL
// ============================================================================

console.log('');
console.log('='.repeat(80));

if (errors.length > 0) {
  log('❌', `BUILD ÉCHOUÉ: ${errors.length} erreur(s)`);
  errors.forEach(err => log('  ❌', err));
  process.exit(1);
}

if (warnings.length > 0) {
  log('⚠️', `${warnings.length} warning(s):`);
  warnings.forEach(warn => log('  ⚠️', warn));
}

log('✅', 'PRÉPARATION BUILD OPTIMISÉE TERMINÉE');
console.log('');
log('📁', `Dossier: ${PATHS.resources}`);
log('📊', 'Statistiques:');

// Stats finales
const stats = {
  '.next/': fs.existsSync(path.join(PATHS.resources, '.next')),
  'server.js': fs.existsSync(path.join(PATHS.resources, 'server.js')),
  '.env.production': fs.existsSync(path.join(PATHS.resources, '.env.production')),
  'node_modules/': fs.existsSync(path.join(PATHS.resources, 'node_modules')),
  '@prisma/client': fs.existsSync(path.join(PATHS.resources, 'node_modules', '@prisma', 'client')),
  '.prisma/client': fs.existsSync(path.join(PATHS.resources, 'node_modules', '.prisma', 'client')),
};

Object.entries(stats).forEach(([name, exists]) => {
  log(exists ? '  ✅' : '  ❌', name);
});

console.log('');
log('📦', 'MODE STANDALONE: node_modules tracé par Next.js (~2000 fichiers)');
log('💾', 'Taille estimée: ~50-80 MB (réduction 97% vs mode classique)');
log('✨', 'ENAMETOOLONG: Devrait être résolu grâce à la réduction de fichiers');
console.log('');
log('🚀', 'Prêt pour electron-builder!');
console.log('='.repeat(80));
console.log('');
