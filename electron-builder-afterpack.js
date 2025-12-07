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

module.exports = async function afterPack(context) {
  // Seulement pour Windows
  if (context.electronPlatformName !== 'win32') {
    return;
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
