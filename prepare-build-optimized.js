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
  
  // Destination
  resources: path.join(__dirname, 'electron-resources', 'web'),
  schemaSQL: path.join(__dirname, 'electron-resources', 'schema.sql'),
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
    logSuccess(`schema.sql généré PROPRE (${Math.round(stats.size/1024)}KB)`);
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

console.log('');
log('🧹', 'ÉTAPE 3/7 - Nettoyage electron-resources/web...');

// Nettoyer electron-resources/web
if (fs.existsSync(PATHS.resources)) {
  fs.removeSync(PATHS.resources);
  log('ℹ️', 'Ancien dossier supprimé');
}

// Créer structure
fs.ensureDirSync(PATHS.resources);
logSuccess('Dossier electron-resources/web créé');

// ============================================================================
// ÉTAPE 4: COPIE .NEXT/ ORIGINAL
// ============================================================================

console.log('');
log('📦', 'ÉTAPE 4/7 - Copie .next/ ORIGINAL (pas standalone)...');

try {
  const nextDest = path.join(PATHS.resources, '.next');
  
  // Copier TOUT .next/ (server/, static/, etc.) MAIS EXCLURE standalone
  // ✅ FIX CRITIQUE: Exclure .next/standalone/ explicitement (gain: -495 MB)
  // Raison: Si output: 'standalone' activé dans next.config.js, Next.js crée .next/standalone/ même si on copie .next/ ORIGINAL
  fs.copySync(PATHS.nextBuild, nextDest, {
    filter: (src) => {
      // ✅ EXCLURE standalone explicitement (CRITIQUE - 495 MB)
      if (src.includes('.next/standalone') || src.includes('.next\\standalone')) {
        return false;
      }
      
      // OPTIMISATION: Exclure cache, fichiers temporaires, source maps
      return !src.includes('cache') 
        && !src.includes('.DS_Store')
        && !src.match(/\.tmp\d*$/)  // Exclure .tmp, .tmp4832, etc.
        && !src.match(/\.tmp$/)
        && !src.endsWith('.js.map')  // Source maps serveur
        && !src.endsWith('.mjs.map') // Source maps ESM
        && !src.endsWith('.css.map'); // Source maps CSS
    }
  });
  
  // Vérifier chunks serveur
  const serverChunks = path.join(nextDest, 'server');
  if (fs.existsSync(serverChunks)) {
    const files = fs.readdirSync(serverChunks);
    logSuccess(`.next/ copié (${files.length} items serveur)`);
  } else {
    logError('.next/server/ manquant après copie!');
    process.exit(1);
  }
  
} catch (error) {
  logError(`Échec copie .next/: ${error.message}`);
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

// Copier public/
try {
  if (fs.existsSync(PATHS.public)) {
    const publicDest = path.join(PATHS.resources, 'public');
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
// ÉTAPE 6: COPIE NODE_MODULES OPTIMISÉE (LISTE BLANCHE)
// ============================================================================

console.log('');
log('📚', 'ÉTAPE 6/7 - Copie node_modules OPTIMISÉE (liste blanche)...');
log('ℹ️', `Modules serveur uniquement: ${SERVER_ONLY_MODULES.length} packages`);
console.log('');

const nodeModulesDest = path.join(PATHS.resources, 'node_modules');
fs.ensureDirSync(nodeModulesDest);

// Copier modules critiques (LISTE BLANCHE)
let copiedCount = 0;
let skippedCount = 0;
const _savedMB = 0;

for (const moduleName of SERVER_ONLY_MODULES) {
  const moduleSrc = path.join(PATHS.nodeModules, moduleName);
  const moduleDest = path.join(nodeModulesDest, moduleName);
  
  if (fs.existsSync(moduleSrc)) {
    try {
      // Calculer taille avant copie (cross-platform)
      let sizeMB = 0;
      try {
        if (process.platform === 'win32') {
          const sizeBytes = execSync(`powershell "(Get-ChildItem -Path '${moduleSrc}' -Recurse -File | Measure-Object -Property Length -Sum).Sum"`, { encoding: 'utf8' });
          sizeMB = parseInt(sizeBytes) / (1024 * 1024);
        } else {
          // macOS/Linux: utiliser du
          const sizeKB = execSync(`du -sk "${moduleSrc}"`, { encoding: 'utf8' }).split('\t')[0];
          sizeMB = parseInt(sizeKB) / 1024;
        }
      } catch (_sizeError) {
        // Si calcul taille échoue, continuer sans afficher la taille
        sizeMB = 0;
      }
      
      fs.copySync(moduleSrc, moduleDest, {
        filter: (src) => {
          // OPTIMISATION: Exclure fichiers inutiles SAUF fichiers critiques Next.js
          const basename = path.basename(src);
          
          // Toujours inclure fichiers critiques Next.js
          if (moduleName === 'next' && (
            basename === 'next-test.js' ||
            basename === 'next-test.d.ts' ||
            src.includes('cli/next-test')
          )) {
            return true;
          }
          
          // ✅ OPTIMISATION PHASE 1: Filtrage Prisma amélioré (-20 à -30 MB)
          // Exclure fichiers temporaires, tests, documentation Prisma
          if (moduleName === '@prisma/client' || moduleName === '.prisma') {
            // Exclure fichiers temporaires Prisma (gain: -5 à -10 MB)
            if (src.match(/\.tmp\d*$/) || src.match(/\.tmp$/) || 
                src.includes('.tmp') || src.includes('/tmp/')) {
              return false;
            }
            // Exclure tests et examples Prisma (gain: -5 à -10 MB)
            if (src.includes('__tests__') || src.includes('/tests/') ||
                src.includes('.test.') || src.includes('.spec.') ||
                src.includes('/examples/') || src.includes('/example/')) {
              return false;
            }
            // Exclure documentation Prisma (gain: -2 à -5 MB)
            if (basename.endsWith('.md') || basename === 'LICENSE' ||
                basename === 'CHANGELOG.md' || basename === 'README.md' ||
                src.includes('/docs/') || src.includes('/doc/')) {
              return false;
            }
            // Inclure tous les autres fichiers Prisma (runtime critique)
            return true;
          }
          
          // Exclure fichiers inutiles pour autres modules
          return !src.match(/\.tmp\d*$/) 
            && !src.match(/\.tmp$/)
            && !src.includes('__tests__')  // Dossiers tests uniquement
            && !src.includes('.test.js')   // Fichiers tests unitaires
            && !src.includes('.spec.js')   // Fichiers specs
            && !src.includes('/examples/')  // Dossier examples (pas fichier)
            && !src.includes('/benchmarks/') // Dossier benchmarks
            && !basename.endsWith('.md')    // Markdown (pas dans chemin)
            && basename !== 'LICENSE'
            && basename !== 'CHANGELOG.md';
        }
      });
      
      copiedCount++;
      if (sizeMB > 0) {
        log('  ✓', `${moduleName} (${sizeMB.toFixed(1)} MB)`);
      } else {
        log('  ✓', moduleName);
      }
    } catch (error) {
      logWarning(`Échec copie ${moduleName}: ${error.message}`);
      skippedCount++;
    }
  } else {
    logWarning(`${moduleName} absent`);
    skippedCount++;
  }
}

console.log('');
logSuccess(`${copiedCount} modules copiés, ${skippedCount} ignorés`);

// Calculer modules exclus
const pkgJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(pkgJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const allDeps = Object.keys(pkg.dependencies || {});
  const excluded = allDeps.filter(dep => !SERVER_ONLY_MODULES.includes(dep));
  
  if (excluded.length > 0) {
    log('🎯', `Modules exclus (client-only): ${excluded.length}`);
    log('ℹ️', 'Exemples: @mui/*, @fullcalendar/*, recharts, framer-motion');
    log('💾', `Gain estimé: -200 à -300 MB`);
  }
}

// Copier package.json racine (pour version info)
try {
  const pkgSrc = path.join(__dirname, 'package.json');
  const pkgDest = path.join(PATHS.resources, 'package.json');
  fs.copySync(pkgSrc, pkgDest);
  logSuccess('package.json copié');
} catch (_error) {
  logWarning('package.json non copié');
}

// ============================================================================
// ÉTAPE 7: CRÉATION SERVER.JS MINIMAL
// ============================================================================

console.log('');
log('⚙️', 'ÉTAPE 7/7 - Création server.js minimal...');

const serverJs = `/**
 * Next.js Production Server - Atelier Vélo+
 * Mode: Manual (standalone désactivé - fix Windows EINVAL)
 * Pattern: VS Code, Slack, Nextron
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialiser Next.js
const app = next({
  dev,
  hostname,
  port,
  dir: __dirname,
  conf: {
    distDir: '.next',
  },
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(\`> Ready on http://\${hostname}:\${port}\`);
    });
});
`;

try {
  const serverDest = path.join(PATHS.resources, 'server.js');
  fs.writeFileSync(serverDest, serverJs.trim());
  logSuccess('server.js créé');
} catch (error) {
  logError(`Échec création server.js: ${error.message}`);
  process.exit(1);
}

// ============================================================================
// ÉTAPE BONUS: RENOMMER NODE_MODULES → NPM_MODULES
// ============================================================================

console.log('');
log('🔄', 'BONUS - Renommage node_modules → npm_modules...');

try {
  const nmSrc = path.join(PATHS.resources, 'node_modules');
  const nmDest = path.join(PATHS.resources, 'npm_modules');
  
  if (fs.existsSync(nmSrc)) {
    fs.renameSync(nmSrc, nmDest);
    logSuccess('node_modules → npm_modules (contourne ignore electron-builder)');
  }
} catch (error) {
  logWarning(`Renommage échoué: ${error.message}`);
}

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
  'npm_modules/': fs.existsSync(path.join(PATHS.resources, 'npm_modules')),
  '@prisma/client': fs.existsSync(path.join(PATHS.resources, 'npm_modules', '@prisma', 'client')),
  '.prisma/client': fs.existsSync(path.join(PATHS.resources, 'npm_modules', '.prisma', 'client')),
};

Object.entries(stats).forEach(([name, exists]) => {
  log(exists ? '  ✅' : '  ❌', name);
});

console.log('');
log('🎯', `Modules serveur: ${copiedCount}/${SERVER_ONLY_MODULES.length}`);
log('💾', 'Gain estimé: -200 à -300 MB vs build standard');
log('⏱️', 'Gain estimé: -5 à -10 min build time');
console.log('');
log('🚀', 'Prêt pour electron-builder!');
console.log('='.repeat(80));
console.log('');
