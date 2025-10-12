// Preload script pour Electron
// Utilisé pour exposer des APIs Node.js au renderer de manière sécurisée

window.addEventListener('DOMContentLoaded', () => {
  console.log('[Preload] Atelier Vélo+ Desktop Ready');
  
  // Ajouter des informations sur l'environnement desktop
  window.isElectron = true;
  window.electronVersion = process.versions.electron;
  window.nodeVersion = process.versions.node;
  window.chromeVersion = process.versions.chrome;
});

// Exposer des APIs sécurisées si nécessaire dans le futur
// Exemple: contextBridge.exposeInMainWorld('api', { ... });
