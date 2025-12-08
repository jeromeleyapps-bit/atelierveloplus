/**
 * Server Wrapper pour Next.js en mode ASAR
 * 
 * Ce wrapper résout le problème de process.chdir() qui ne peut pas
 * fonctionner avec des chemins ASAR.
 * 
 * Le server.js original de Next.js fait:
 *   process.chdir(__dirname)
 * 
 * Mais __dirname pointe vers app.asar/electron/web/ qui n'est pas
 * un vrai répertoire sur le système de fichiers.
 * 
 * Solution: Ce wrapper configure les chemins avant de charger server.js
 */

const path = require('path');
const Module = require('module');

// Récupérer le chemin du server.js dans l'ASAR
const serverPath = process.argv[2];
if (!serverPath) {
  console.error('[WRAPPER] Erreur: chemin server.js manquant');
  process.exit(1);
}

console.log('[WRAPPER] Démarrage serveur Next.js');
console.log('[WRAPPER] serverPath:', serverPath);
console.log('[WRAPPER] CWD actuel:', process.cwd());

// Le répertoire web dans l'ASAR
const webDir = path.dirname(serverPath);
console.log('[WRAPPER] webDir:', webDir);

// Patcher process.chdir pour ignorer les chemins ASAR
const originalChdir = process.chdir.bind(process);
process.chdir = function(directory) {
  // Si le chemin contient .asar, ne pas faire le chdir
  if (directory && directory.includes('.asar')) {
    console.log('[WRAPPER] Ignoré chdir vers ASAR:', directory);
    return;
  }
  return originalChdir(directory);
};

// Configurer __dirname pour le module server.js
// Cela permet à Next.js de trouver ses fichiers
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  // Pour les requires relatifs depuis server.js, utiliser webDir
  if (parent && parent.filename === serverPath && request.startsWith('./')) {
    const resolved = path.join(webDir, request);
    return originalResolveFilename.call(this, resolved, parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// Charger et exécuter server.js
console.log('[WRAPPER] Chargement server.js...');
try {
  require(serverPath);
} catch (error) {
  console.error('[WRAPPER] Erreur chargement server.js:', error);
  process.exit(1);
}
