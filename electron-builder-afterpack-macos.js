/**
 * electron-builder afterPack hook pour macOS
 * 
 * Fonctions:
 * 1. Nettoyer les modules de build inutiles en production
 * 2. Optimiser la taille du bundle
 * 
 * Date: 7 décembre 2025
 */

const fs = require('fs');
const path = require('path');

/**
 * Supprime récursivement un dossier
 */
function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    return true;
  }
  return false;
}

/**
 * Calcule la taille d'un dossier en bytes
 */
function getDirSize(dirPath) {
  let size = 0;
  try {
    const files = fs.readdirSync(dirPath, { recursive: true, withFileTypes: true });
    for (const file of files) {
      if (file.isFile()) {
        const filePath = path.join(file.path || dirPath, file.name);
        try {
          size += fs.statSync(filePath).size;
        } catch {}
      }
    }
  } catch {}
  return size;
}

/**
 * Nettoie les modules de build inutiles en production
 */
function cleanupBuildModules(appOutDir, platform) {
  // Chemin vers node_modules dans l'app packagée
  const unpackedPath = path.join(appOutDir, 'Atelier Velo+.app', 'Contents', 'Resources', 'app.asar.unpacked', 'node_modules');
  
  if (!fs.existsSync(unpackedPath)) {
    console.log('[AFTERPACK-MACOS] Pas de node_modules unpacked à nettoyer');
    return 0;
  }

  let totalSaved = 0;
  
  // Modules à supprimer (inutiles en production)
  const modulesToRemove = [
    '@next',      // Compilateur SWC (~122 MB) - Non nécessaire en standalone
    'typescript', // TypeScript compiler
    '@types',     // Type definitions
    'eslint',     // Linter
    '@eslint',    // ESLint plugins
  ];

  for (const moduleName of modulesToRemove) {
    const modulePath = path.join(unpackedPath, moduleName);
    if (fs.existsSync(modulePath)) {
      const size = getDirSize(modulePath);
      
      if (removeDir(modulePath)) {
        const sizeMB = (size / 1024 / 1024).toFixed(2);
        console.log(`[AFTERPACK-MACOS] ✅ Supprimé: ${moduleName} (${sizeMB} MB)`);
        totalSaved += size;
      }
    }
  }

  return totalSaved;
}

/**
 * Hook principal appelé par electron-builder après le packaging
 */
module.exports = async function afterPack(context) {
  const platform = context.electronPlatformName;
  
  // Seulement pour macOS
  if (platform !== 'darwin') {
    console.log(`[AFTERPACK-MACOS] Ignoré pour plateforme: ${platform}`);
    return;
  }
  
  console.log('[AFTERPACK-MACOS] Nettoyage des modules de build...');
  
  const savedBytes = cleanupBuildModules(context.appOutDir, platform);
  
  if (savedBytes > 0) {
    const savedMB = (savedBytes / 1024 / 1024).toFixed(2);
    console.log(`[AFTERPACK-MACOS] Total économisé: ${savedMB} MB`);
  }
  
  console.log('[AFTERPACK-MACOS] ✅ Terminé');
};
