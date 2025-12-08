/**
 * IPC Handlers - Diagnostics & Support
 * Gestion de l'export et envoi des logs au support
 */

const { ipcMain, app, dialog: _dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

/**
 * Enregistre les handlers IPC pour les diagnostics
 */
function registerDiagnosticsHandlers(log) {
  /**
   * Export et envoi des diagnostics (logs) au support
   */
  ipcMain.handle('diagnostics:export', async () => {
    try {
      const userDataPath = app.getPath('userData');
      const logsDir = path.join(userDataPath, 'logs');
      
      // Créer dossier logs si inexistant
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `AtelierVelo-diagnostics-${timestamp}.zip`;
      const zipPath = path.join(logsDir, filename);
      
      log.info('[DIAG] Création archive diagnostics:', zipPath);
      
      // Créer l'archive ZIP
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      archive.pipe(output);
      
      // Ajouter les logs
      const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
      for (const logFile of logFiles) {
        const logPath = path.join(logsDir, logFile);
        archive.file(logPath, { name: logFile });
      }
      
      // Ajouter info système
      const systemInfo = {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        appVersion: app.getVersion(),
        timestamp: new Date().toISOString(),
      };
      archive.append(JSON.stringify(systemInfo, null, 2), { name: 'system-info.json' });
      
      await archive.finalize();
      
      // Attendre que le fichier soit écrit
      await new Promise((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
      });
      
      log.info('[DIAG] Archive créée:', archive.pointer(), 'bytes');
      
      // Lire le fichier et encoder en base64
      const buffer = fs.readFileSync(zipPath);
      const contentBase64 = buffer.toString('base64');
      
      // Envoyer au support via API
      const supportUrl = process.env.SUPPORT_API_URL || 'http://127.0.0.1:3000/api/support/diagnostics';
      
      log.info('[DIAG] Envoi au support:', supportUrl);
      
      const res = await fetch(supportUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ✅ FIX: Envoyer contentBase64 au lieu de content (API attend contentBase64)
        body: JSON.stringify({ filename, contentBase64 }),
      });
      
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        log.error('[DIAG] API support/diagnostics error:', res.status, text);
        return { 
          ok: false, 
          message: `Erreur envoi diagnostics (${res.status}). ${text}` 
        };
      }
      
      log.info('[DIAG] Diagnostics envoyés au support avec succès');
      return { 
        ok: true, 
        filePath: zipPath,
        message: 'Diagnostics envoyés avec succès'
      };
      
    } catch (e) {
      log.error('[DIAG] Erreur envoi diagnostics:', e);
      return { 
        ok: false, 
        message: e.message || 'Erreur lors de l\'export des diagnostics'
      };
    }
  });
  
  log.info('[IPC] Diagnostics handlers registered');
}

module.exports = { registerDiagnosticsHandlers };
