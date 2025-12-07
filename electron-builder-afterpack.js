/**
 * Hook afterPack pour electron-builder
 * 
 * Intègre l'icône dans l'exécutable Windows après le packaging
 * Contourne le problème ENAMETOOLONG de signAndEditExecutable
 * 
 * Date: 7 décembre 2025
 */

const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

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
 * Nettoie les modules de build inutiles en production
 */
function cleanupBuildModules(appOutDir) {
  const unpackedPath = path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules');
  
  if (!fs.existsSync(unpackedPath)) {
    console.log('[AFTERPACK] Pas de node_modules unpacked à nettoyer');
    return 0;
  }

  let totalSaved = 0;
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
      // Calculer la taille avant suppression
      let size = 0;
      try {
        const files = fs.readdirSync(modulePath, { recursive: true, withFileTypes: true });
        for (const file of files) {
          if (file.isFile()) {
            const filePath = path.join(file.path || modulePath, file.name);
            try {
              size += fs.statSync(filePath).size;
            } catch {}
          }
        }
      } catch {}
      
      if (removeDir(modulePath)) {
        const sizeMB = (size / 1024 / 1024).toFixed(2);
        console.log(`[AFTERPACK] ✅ Supprimé: ${moduleName} (${sizeMB} MB)`);
        totalSaved += size;
      }
    }
  }

  return totalSaved;
}

module.exports = async function afterPack(context) {
  // Seulement pour Windows
  if (context.electronPlatformName !== 'win32') {
    return;
  }
  
  // 1. Nettoyer les modules de build inutiles
  console.log('[AFTERPACK] Nettoyage des modules de build...');
  const savedBytes = cleanupBuildModules(context.appOutDir);
  if (savedBytes > 0) {
    const savedMB = (savedBytes / 1024 / 1024).toFixed(2);
    console.log(`[AFTERPACK] Total économisé: ${savedMB} MB`);
  }

  const appOutDir = context.appOutDir;
  const exePath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const iconPath = path.resolve(__dirname, 'resources', 'icon.ico');

  console.log('[AFTERPACK] Intégration icône dans exe...');
  console.log('[AFTERPACK] Exe:', exePath);
  console.log('[AFTERPACK] Icon:', iconPath);

  // Vérifier que les fichiers existent
  if (!fs.existsSync(exePath)) {
    console.error('[AFTERPACK] ❌ Exe non trouvé:', exePath);
    return;
  }

  if (!fs.existsSync(iconPath)) {
    console.error('[AFTERPACK] ❌ Icône non trouvée:', iconPath);
    return;
  }

  // Utiliser rcedit pour intégrer l'icône
  // rcedit est inclus dans node_modules via electron-builder
  const rceditPath = path.join(
    __dirname,
    'node_modules',
    'rcedit',
    'bin',
    'rcedit-x64.exe'
  );

  if (!fs.existsSync(rceditPath)) {
    console.warn('[AFTERPACK] ⚠️ rcedit non trouvé, tentative via npx...');
    try {
      execSync(`npx rcedit "${exePath}" --set-icon "${iconPath}"`, {
        stdio: 'inherit',
        cwd: __dirname
      });
      console.log('[AFTERPACK] ✅ Icône intégrée via npx rcedit');
    } catch (error) {
      console.error('[AFTERPACK] ❌ Erreur npx rcedit:', error.message);
    }
    return;
  }

  try {
    execSync(`"${rceditPath}" "${exePath}" --set-icon "${iconPath}"`, {
      stdio: 'inherit',
      cwd: __dirname
    });
    console.log('[AFTERPACK] ✅ Icône intégrée avec succès');
  } catch (error) {
    console.error('[AFTERPACK] ❌ Erreur rcedit:', error.message);
  }
};
