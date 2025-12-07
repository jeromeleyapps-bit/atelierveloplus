// ============================================================================
// HOOK VÉRIFICATION PREBUILD
// ============================================================================
// Objectif : Vérifier intégrité après chaque étape du prebuild
// Usage : Appelé depuis prepare-build-optimized.js
// ============================================================================

const fs = require('fs');
const path = require('path');

/**
 * Vérifie l'intégrité après copie .next/
 */
function verifyNextBuild(nextDest) {
  const errors = [];
  const warnings = [];
  
  // Vérifier BUILD_ID
  const buildIdPath = path.join(nextDest, 'BUILD_ID');
  if (!fs.existsSync(buildIdPath)) {
    errors.push('BUILD_ID manquant');
  } else {
    const buildId = fs.readFileSync(buildIdPath, 'utf8').trim();
    if (buildId.length < 10) {
      warnings.push(`BUILD_ID suspect (trop court: ${buildId.length} caractères)`);
    }
  }
  
  // Vérifier .next/server
  const serverPath = path.join(nextDest, 'server');
  if (!fs.existsSync(serverPath)) {
    errors.push('.next/server manquant');
  } else {
    const serverFiles = fs.readdirSync(serverPath);
    if (serverFiles.length < 100) {
      warnings.push(`.next/server suspect (${serverFiles.length} fichiers < 100)`);
    }
  }
  
  // Vérifier fichiers manifests
  const requiredManifests = [
    'build-manifest.json',
    'app-build-manifest.json',
    'routes-manifest.json',
    'package.json'
  ];
  
  requiredManifests.forEach(manifest => {
    const manifestPath = path.join(nextDest, manifest);
    if (!fs.existsSync(manifestPath)) {
      warnings.push(`Manifest manquant : ${manifest}`);
    }
  });
  
  return { errors, warnings };
}

/**
 * Vérifie l'intégrité après copie npm_modules
 */
function verifyNpmModules(npmModulesPath) {
  const errors = [];
  const warnings = [];
  
  if (!fs.existsSync(npmModulesPath)) {
    errors.push('npm_modules manquant');
    return { errors, warnings };
  }
  
  // Vérifier modules critiques
  const criticalModules = [
    'next',
    'react',
    'react-dom',
    '@prisma/client',
    '.prisma'
  ];
  
  criticalModules.forEach(module => {
    const modulePath = path.join(npmModulesPath, module);
    if (!fs.existsSync(modulePath)) {
      errors.push(`Module critique manquant : ${module}`);
    }
  });
  
  // Vérifier Prisma client
  const prismaClientPath = path.join(npmModulesPath, '@prisma', 'client');
  if (fs.existsSync(prismaClientPath)) {
    const prismaFiles = fs.readdirSync(prismaClientPath);
    if (prismaFiles.length === 0) {
      errors.push('@prisma/client vide');
    }
  }
  
  // Vérifier .prisma/client
  const dotPrismaPath = path.join(npmModulesPath, '.prisma', 'client');
  if (fs.existsSync(dotPrismaPath)) {
    const engineFiles = fs.readdirSync(dotPrismaPath).filter(f => f.endsWith('.node'));
    if (engineFiles.length === 0) {
      warnings.push('Aucun query engine Prisma trouvé');
    }
  }
  
  return { errors, warnings };
}

/**
 * Vérifie l'intégrité après copie server.js
 */
function verifyServerJs(serverJsPath) {
  const errors = [];
  const warnings = [];
  
  if (!fs.existsSync(serverJsPath)) {
    errors.push('server.js manquant');
    return { errors, warnings };
  }
  
  const content = fs.readFileSync(serverJsPath, 'utf8');
  
  // Vérifier contenu minimal
  if (!content.includes('require')) {
    errors.push('server.js suspect (pas de require)');
  }
  
  if (!content.includes('next')) {
    warnings.push('server.js suspect (pas de référence Next.js)');
  }
  
  // Vérifier taille
  const stats = fs.statSync(serverJsPath);
  if (stats.size < 100) {
    warnings.push(`server.js suspect (trop petit: ${stats.size} bytes)`);
  }
  
  return { errors, warnings };
}

/**
 * Génère rapport de vérification
 */
function generateVerificationReport(checks) {
  const report = {
    timestamp: new Date().toISOString(),
    errors: [],
    warnings: [],
    success: true
  };
  
  checks.forEach(check => {
    report.errors.push(...check.errors);
    report.warnings.push(...check.warnings);
    if (check.errors.length > 0) {
      report.success = false;
    }
  });
  
  return report;
}

module.exports = {
  verifyNextBuild,
  verifyNpmModules,
  verifyServerJs,
  generateVerificationReport
};




