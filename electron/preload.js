/**
 * Atelier Vélo+ - Electron Preload Script
 * Expose des APIs sécurisées au renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Exposer des APIs sécurisées
// API avec fonctions spécifiques (pattern recommandé)
contextBridge.exposeInMainWorld('electronAPI', {
  // Chemins
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getDbPath: () => ipcRenderer.invoke('get-db-path'),
  // Reset application (supprime la DB et relance)
  reset: () => ipcRenderer.invoke('app:reset'),
  
  // Tunnel Cloudflare
  cloudflaredStatus: () => ipcRenderer.invoke('cloudflared:status'),
  startCloudflared: () => ipcRenderer.invoke('cloudflared:start'),
  stopCloudflared: () => ipcRenderer.invoke('cloudflared:stop'),

  // Serveur HTTP local (Next prod)
  localHttpStatus: () => ipcRenderer.invoke('localhttp:status'),
  startLocalHttp: () => ipcRenderer.invoke('localhttp:start'),
  stopLocalHttp: () => ipcRenderer.invoke('localhttp:stop'),

  // Ouvrir le fichier config.yml
  openConfigYml: () => ipcRenderer.invoke('open:config-yml'),
  openPath: (p) => ipcRenderer.invoke('open:path', p),
  
  // Informations système
  platform: process.platform,
  isElectron: true
});

// API générique pour rétrocompatibilité (code legacy utilise window.electron.invoke)
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  platform: process.platform,
  isElectron: true
});

console.log('[PRELOAD] APIs exposées au renderer (electronAPI + electron)');
