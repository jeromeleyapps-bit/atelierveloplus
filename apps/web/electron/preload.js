// Preload script pour la securite
// Expose uniquement les APIs necessaires au renderer process

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  version: process.versions.electron
});

console.log('[Preload] Script charge');
