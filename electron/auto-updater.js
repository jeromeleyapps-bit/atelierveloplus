/**
 * Auto-Updater - Gestion des mises à jour
 * Vérifie et installe automatiquement les mises à jour
 */

const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');
const log = require('electron-log');

class AutoUpdater {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.setupLogging();
    this.setupHandlers();
  }

  /**
   * Configurer les logs
   */
  setupLogging() {
    // Configurer electron-log
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    
    console.log('[UPDATER] Logs configurés');
  }

  /**
   * Configurer les handlers
   */
  setupHandlers() {
    // Vérification disponible
    autoUpdater.on('checking-for-update', () => {
      log.info('[UPDATER] Vérification des mises à jour...');
    });

    // Mise à jour disponible
    autoUpdater.on('update-available', (info) => {
      log.info('[UPDATER] Mise à jour disponible:', info.version);
      
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Mise à Jour Disponible',
        message: `Une nouvelle version est disponible (${info.version})`,
        detail: 'Le téléchargement va commencer automatiquement.',
        buttons: ['OK']
      });
    });

    // Pas de mise à jour
    autoUpdater.on('update-not-available', (_info) => {
      log.info('[UPDATER] Pas de mise à jour disponible');
    });

    // Erreur
    autoUpdater.on('error', (error) => {
      log.error('[UPDATER] Erreur:', error);
      
      // Ne pas afficher dialog si erreur 404 (repo privé)
      if (!error.message.includes('404')) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'error',
          title: 'Erreur de Mise à Jour',
          message: 'Impossible de vérifier les mises à jour.',
          detail: error.message,
          buttons: ['OK']
        });
      } else {
        log.info('[UPDATER] Repo privé, auto-update désactivé');
      }
    });

    // Progression téléchargement
    autoUpdater.on('download-progress', (progressObj) => {
      const percent = Math.round(progressObj.percent);
      log.info(`[UPDATER] Téléchargement: ${percent}%`);
      
      // Mettre à jour le titre de la fenêtre
      if (this.mainWindow) {
        this.mainWindow.setTitle(`Atelier Vélo+ - Téléchargement ${percent}%`);
      }
    });

    // Téléchargement terminé
    autoUpdater.on('update-downloaded', (info) => {
      log.info('[UPDATER] Mise à jour téléchargée:', info.version);
      
      // Restaurer le titre
      if (this.mainWindow) {
        this.mainWindow.setTitle('Atelier Vélo+');
      }
      
      // Demander à l'utilisateur s'il veut installer maintenant
      dialog.showMessageBox(this.mainWindow, {
        type: 'question',
        title: 'Mise à Jour Prête',
        message: `La version ${info.version} est prête à être installée.`,
        detail: 'L\'application va redémarrer pour installer la mise à jour.\n\n' +
                'Voulez-vous installer maintenant ?',
        buttons: ['Plus tard', 'Installer et Redémarrer'],
        defaultId: 1
      }).then(result => {
        if (result.response === 1) {
          // Installer et redémarrer
          setImmediate(() => autoUpdater.quitAndInstall());
        }
      });
    });
  }

  /**
   * Vérifie les mises à jour au démarrage
   */
  checkForUpdates() {
    // Ne pas vérifier en dev
    if (process.env.NODE_ENV === 'development') {
      log.info('[UPDATER] Mode dev, auto-update désactivé');
      return;
    }

    // FIX 15/11/2025: Désactiver auto-update si repo privé (évite erreur 404)
    // TODO: Réactiver quand repo public ou releases configurées
    log.info('[UPDATER] Auto-update désactivé (repo privé)');
    return;

    // log.info('[UPDATER] Vérification des mises à jour...');
    // autoUpdater.checkForUpdatesAndNotify();
  }

  /**
   * Vérifier les mises à jour manuellement
   */
  async checkForUpdatesManual() {
    try {
      const result = await autoUpdater.checkForUpdates();
      
      if (!result || !result.updateInfo) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'info',
          title: 'Pas de Mise à Jour',
          message: 'Vous utilisez déjà la dernière version.',
          buttons: ['OK']
        });
      }
    } catch (error) {
      log.error('[UPDATER] Erreur vérification manuelle:', error);
      dialog.showErrorBox(
        'Erreur',
        'Impossible de vérifier les mises à jour.\n\n' + error.message
      );
    }
  }
}

module.exports = AutoUpdater;
