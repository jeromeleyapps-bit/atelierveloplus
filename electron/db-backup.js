/**
 * Database Backup Manager
 * Sauvegarde automatique avant migrations
 */

const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');

class DatabaseBackup {
  constructor(dbPath, dataPath) {
    this.dbPath = dbPath;
    this.backupDir = path.join(dataPath, 'backups');
    this.ensureBackupDir();
  }

  /**
   * Créer le dossier de backup
   */
  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('[BACKUP] Dossier backup créé:', this.backupDir);
    }
  }

  /**
   * Créer un backup
   */
  async create(reason = 'manual') {
    if (!fs.existsSync(this.dbPath)) {
      console.log('[BACKUP] DB n\'existe pas encore, pas de backup');
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `atelier-${reason}-${timestamp}.db`;
    const backupPath = path.join(this.backupDir, backupName);

    try {
      // Copier la DB
      fs.copyFileSync(this.dbPath, backupPath);
      
      console.log('[BACKUP] ✅ Backup créé:', backupName);
      
      // Nettoyer les vieux backups (garder 10 derniers)
      await this.cleanOldBackups();
      
      return backupPath;
    } catch (error) {
      console.error('[BACKUP] ❌ Erreur création backup:', error);
      throw error;
    }
  }

  /**
   * Créer backup avant migration
   */
  async createBeforeMigration() {
    console.log('[BACKUP] Création backup avant migration...');
    return await this.create('migration');
  }

  /**
   * Restaurer un backup
   */
  async restore(backupPath) {
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup non trouvé: ' + backupPath);
    }

    try {
      // Créer un backup de la DB actuelle avant restauration
      if (fs.existsSync(this.dbPath)) {
        const emergencyBackup = this.dbPath + '.emergency';
        fs.copyFileSync(this.dbPath, emergencyBackup);
        console.log('[BACKUP] Backup d\'urgence créé');
      }

      // Restaurer
      fs.copyFileSync(backupPath, this.dbPath);
      
      console.log('[BACKUP] ✅ DB restaurée depuis:', backupPath);
      return true;
    } catch (error) {
      console.error('[BACKUP] ❌ Erreur restauration:', error);
      throw error;
    }
  }

  /**
   * Lister les backups disponibles
   */
  listBackups() {
    if (!fs.existsSync(this.backupDir)) {
      return [];
    }

    const files = fs.readdirSync(this.backupDir);
    
    return files
      .filter(file => file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          name: file,
          path: filePath,
          size: stats.size,
          date: stats.mtime
        };
      })
      .sort((a, b) => b.date - a.date); // Plus récent en premier
  }

  /**
   * Nettoyer les vieux backups
   */
  async cleanOldBackups(keepCount = 10) {
    const backups = this.listBackups();
    
    if (backups.length <= keepCount) {
      return;
    }

    // Supprimer les plus vieux
    const toDelete = backups.slice(keepCount);
    
    for (const backup of toDelete) {
      try {
        fs.unlinkSync(backup.path);
        console.log('[BACKUP] Ancien backup supprimé:', backup.name);
      } catch (error) {
        console.error('[BACKUP] Erreur suppression backup:', error);
      }
    }
  }

  /**
   * Afficher dialog de restauration
   */
  async showRestoreDialog(mainWindow) {
    const backups = this.listBackups();
    
    if (backups.length === 0) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Aucun Backup',
        message: 'Aucun backup disponible.',
        buttons: ['OK']
      });
      return;
    }

    // Créer liste des backups
    const backupList = backups.map((b, i) => {
      const date = b.date.toLocaleString('fr-FR');
      const size = (b.size / 1024).toFixed(2);
      return `${i + 1}. ${b.name}\n   Date: ${date} | Taille: ${size} KB`;
    }).join('\n\n');

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Restaurer un Backup',
      message: 'Sélectionnez un backup à restaurer',
      detail: backupList + '\n\n⚠️ La base de données actuelle sera remplacée !',
      buttons: ['Annuler', ...backups.map((_, i) => `Backup ${i + 1}`)],
      defaultId: 0
    });

    if (result.response === 0) {
      return; // Annulé
    }

    // Restaurer le backup sélectionné
    const selectedBackup = backups[result.response - 1];
    
    try {
      await this.restore(selectedBackup.path);
      
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Restauration Réussie',
        message: 'La base de données a été restaurée.',
        detail: 'L\'application va redémarrer.',
        buttons: ['OK']
      }).then(() => {
        // Redémarrer l'app
        const { app } = require('electron');
        app.relaunch();
        app.exit(0);
      });
    } catch (error) {
      dialog.showErrorBox(
        'Erreur de Restauration',
        'Impossible de restaurer le backup.\n\n' + error.message
      );
    }
  }

  /**
   * Exporter la DB vers un emplacement choisi
   */
  async exportDatabase(mainWindow) {
    if (!fs.existsSync(this.dbPath)) {
      dialog.showErrorBox(
        'Erreur',
        'La base de données n\'existe pas encore.'
      );
      return;
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Exporter la Base de Données',
      defaultPath: `atelier-velo-export-${new Date().toISOString().split('T')[0]}.db`,
      filters: [
        { name: 'Base de Données SQLite', extensions: ['db'] },
        { name: 'Tous les fichiers', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return;
    }

    try {
      fs.copyFileSync(this.dbPath, result.filePath);
      
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Export Réussi',
        message: 'La base de données a été exportée.',
        detail: `Emplacement: ${result.filePath}`,
        buttons: ['OK']
      });
    } catch (error) {
      dialog.showErrorBox(
        'Erreur d\'Export',
        'Impossible d\'exporter la base de données.\n\n' + error.message
      );
    }
  }
}

module.exports = DatabaseBackup;
