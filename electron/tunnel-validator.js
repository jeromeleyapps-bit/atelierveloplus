/**
 * Validateur Cloudflare Tunnel
 * Vérifie la configuration avant démarrage
 */

const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');

class TunnelValidator {
  constructor(dataPath, store) {
    this.dataPath = dataPath;
    this.store = store;
    this.errors = [];
  }

  /**
   * Valider la configuration complète
   */
  validate() {
    this.errors = [];

    // 1. Vérifier tunnel ID
    if (!this.validateTunnelId()) {
      this.errors.push('Tunnel ID manquant');
    }

    // 2. Vérifier config.yml
    if (!this.validateConfigFile()) {
      this.errors.push('Fichier config.yml invalide');
    }

    // 3. Vérifier credentials
    if (!this.validateCredentials()) {
      this.errors.push('Fichier credentials manquant');
    }

    // 4. Vérifier cloudflared.exe
    if (!this.validateCloudflaredBinary()) {
      this.errors.push('cloudflared.exe non trouvé');
    }

    return this.errors.length === 0;
  }

  /**
   * Valider tunnel ID
   */
  validateTunnelId() {
    const tunnelId = this.store.get('tunnelId');
    if (!tunnelId) {
      console.error('[VALIDATOR] Tunnel ID manquant');
      return false;
    }

    // Vérifier format UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tunnelId)) {
      console.error('[VALIDATOR] Tunnel ID invalide:', tunnelId);
      return false;
    }

    console.log('[VALIDATOR] ✅ Tunnel ID valide');
    return true;
  }

  /**
   * Valider fichier config.yml
   */
  validateConfigFile() {
    const configPath = path.join(this.dataPath, 'cloudflare', 'config.yml');
    
    if (!fs.existsSync(configPath)) {
      console.error('[VALIDATOR] config.yml non trouvé:', configPath);
      return false;
    }

    try {
      const content = fs.readFileSync(configPath, 'utf8');
      
      // Vérifier contenu minimum
      if (!content.includes('tunnel:')) {
        console.error('[VALIDATOR] config.yml invalide: pas de tunnel ID');
        return false;
      }

      if (!content.includes('credentials-file:')) {
        console.error('[VALIDATOR] config.yml invalide: pas de credentials-file');
        return false;
      }

      if (!content.includes('ingress:')) {
        console.error('[VALIDATOR] config.yml invalide: pas de ingress');
        return false;
      }

      console.log('[VALIDATOR] ✅ config.yml valide');
      return true;
    } catch (error) {
      console.error('[VALIDATOR] Erreur lecture config.yml:', error);
      return false;
    }
  }

  /**
   * Valider fichier credentials
   */
  validateCredentials() {
    const tunnelId = this.store.get('tunnelId');
    if (!tunnelId) {
      return false;
    }

    const credentialsPath = path.join(
      require('os').homedir(),
      '.cloudflared',
      `${tunnelId}.json`
    );

    if (!fs.existsSync(credentialsPath)) {
      console.error('[VALIDATOR] Credentials non trouvés:', credentialsPath);
      return false;
    }

    try {
      const content = fs.readFileSync(credentialsPath, 'utf8');
      const credentials = JSON.parse(content);

      // Vérifier champs requis
      if (!credentials.AccountTag || !credentials.TunnelSecret || !credentials.TunnelID) {
        console.error('[VALIDATOR] Credentials invalides: champs manquants');
        return false;
      }

      console.log('[VALIDATOR] ✅ Credentials valides');
      return true;
    } catch (error) {
      console.error('[VALIDATOR] Erreur lecture credentials:', error);
      return false;
    }
  }

  /**
   * Valider cloudflared binary
   */
  validateCloudflaredBinary() {
    // Chercher dans resources
    const resourcePath = path.join(process.resourcesPath, 'cloudflared.exe');
    if (fs.existsSync(resourcePath)) {
      console.log('[VALIDATOR] ✅ cloudflared.exe trouvé dans resources');
      return true;
    }

    // Chercher dans PATH
    try {
      const { execSync } = require('child_process');
      execSync('cloudflared --version', { stdio: 'ignore' });
      console.log('[VALIDATOR] ✅ cloudflared trouvé dans PATH');
      return true;
    } catch (_e) {
      console.error('[VALIDATOR] cloudflared.exe non trouvé');
      return false;
    }
  }

  /**
   * Afficher erreurs à l'utilisateur
   */
  showErrors(_mainWindow) {
    if (this.errors.length === 0) {
      return;
    }

    const errorList = this.errors.map((err, i) => `${i + 1}. ${err}`).join('\n');

    dialog.showErrorBox(
      'Configuration Tunnel Invalide',
      'Le tunnel Cloudflare ne peut pas démarrer :\n\n' +
      errorList +
      '\n\nVeuillez reconfigurer le tunnel.'
    );
  }

  /**
   * Proposer reconfiguration
   */
  async promptReconfigure(mainWindow) {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Tunnel Non Configuré',
      message: 'Le tunnel Cloudflare n\'est pas correctement configuré.',
      detail: 'Voulez-vous lancer l\'assistant de configuration ?',
      buttons: ['Plus tard', 'Configurer maintenant'],
      defaultId: 1
    });

    return result.response === 1;
  }
}

module.exports = TunnelValidator;
