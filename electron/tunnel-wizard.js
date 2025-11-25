/**
 * Wizard Configuration Cloudflare Tunnel
 * Guide l'utilisateur pas à pas
 */

const { dialog, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TunnelWizard {
  constructor(mainWindow, dataPath, store) {
    this.mainWindow = mainWindow;
    this.dataPath = dataPath;
    this.store = store;
    this.cloudflaredPath = null;
  }

  /**
   * Démarrer le wizard
   */
  async start() {
    console.log('[WIZARD] Démarrage wizard configuration tunnel...');

    // Étape 1 : Vérifier cloudflared
    const hasCloudflared = await this.checkCloudflared();
    if (!hasCloudflared) {
      const download = await this.promptDownloadCloudflared();
      if (!download) {
        return false; // Utilisateur a annulé
      }
    }

    // Étape 2 : Guide création compte
    const hasAccount = await this.promptCloudflareAccount();
    if (!hasAccount) {
      return false;
    }

    // Étape 3 : Login
    const loggedIn = await this.performLogin();
    if (!loggedIn) {
      return false;
    }

    // Étape 4 : Créer tunnel
    const tunnelCreated = await this.createTunnel();
    if (!tunnelCreated) {
      return false;
    }

    // Étape 5 : Configurer
    const configured = await this.configureTunnel();
    if (!configured) {
      return false;
    }

    // Succès !
    this.store.set('tunnelConfigured', true);
    
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Configuration Réussie !',
      message: 'Votre tunnel Cloudflare est configuré.',
      detail: 'Les rendez-vous publics sont maintenant accessibles en ligne.',
      buttons: ['OK']
    });

    return true;
  }

  /**
   * Vérifier si cloudflared est disponible
   */
  async checkCloudflared() {
    // Chercher dans resources
    const resourcePath = path.join(process.resourcesPath, 'cloudflared.exe');
    if (fs.existsSync(resourcePath)) {
      this.cloudflaredPath = resourcePath;
      console.log('[WIZARD] cloudflared trouvé dans resources');
      return true;
    }

    // Chercher dans PATH système
    try {
      const { execSync } = require('child_process');
      execSync('cloudflared --version', { stdio: 'ignore' });
      this.cloudflaredPath = 'cloudflared';
      console.log('[WIZARD] cloudflared trouvé dans PATH');
      return true;
    } catch (_e) {
      console.log('[WIZARD] cloudflared non trouvé');
      return false;
    }
  }

  /**
   * Proposer téléchargement cloudflared
   */
  async promptDownloadCloudflared() {
    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'question',
      title: 'Cloudflared Requis',
      message: 'Le programme cloudflared est nécessaire pour le tunnel.',
      detail: 'Voulez-vous télécharger cloudflared maintenant ?\n\n' +
              'Vous serez redirigé vers la page de téléchargement officielle.',
      buttons: ['Annuler', 'Télécharger'],
      defaultId: 1
    });

    if (result.response === 1) {
      // Ouvrir page téléchargement
      shell.openExternal('https://github.com/cloudflare/cloudflared/releases/latest');
      
      // Attendre que l'utilisateur télécharge
      await dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Installation cloudflared',
        message: 'Téléchargez et installez cloudflared',
        detail: '1. Téléchargez cloudflared-windows-amd64.exe\n' +
                '2. Renommez-le en cloudflared.exe\n' +
                '3. Placez-le dans le dossier de l\'application\n\n' +
                'Cliquez sur OK quand c\'est fait.',
        buttons: ['OK']
      });

      // Revérifier
      return await this.checkCloudflared();
    }

    return false;
  }

  /**
   * Guide création compte Cloudflare
   */
  async promptCloudflareAccount() {
    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'question',
      title: 'Compte Cloudflare',
      message: 'Avez-vous un compte Cloudflare ?',
      detail: 'Un compte gratuit est nécessaire pour créer un tunnel.\n\n' +
              'Si vous n\'avez pas de compte, vous serez redirigé vers la page d\'inscription.',
      buttons: ['Annuler', 'J\'ai un compte', 'Créer un compte'],
      defaultId: 1
    });

    if (result.response === 0) {
      return false; // Annulé
    }

    if (result.response === 2) {
      // Ouvrir page inscription
      shell.openExternal('https://dash.cloudflare.com/sign-up');
      
      await dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Création de Compte',
        message: 'Créez votre compte Cloudflare',
        detail: 'Suivez les étapes sur le site Cloudflare.\n\n' +
                'Cliquez sur OK quand votre compte est créé.',
        buttons: ['OK']
      });
    }

    return true;
  }

  /**
   * Effectuer login cloudflared
   */
  async performLogin() {
    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Connexion Cloudflare',
      message: 'Connexion à votre compte',
      detail: 'Une fenêtre de navigateur va s\'ouvrir.\n\n' +
              '1. Connectez-vous à votre compte Cloudflare\n' +
              '2. Autorisez l\'accès\n' +
              '3. Fermez la fenêtre du navigateur\n\n' +
              'Cliquez sur OK pour continuer.',
      buttons: ['Annuler', 'OK'],
      defaultId: 1
    });

    if (result.response === 0) {
      return false;
    }

    return new Promise((resolve) => {
      console.log('[WIZARD] Lancement cloudflared login...');
      
      const loginProcess = spawn(this.cloudflaredPath, ['tunnel', 'login'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      loginProcess.stdout.on('data', (data) => {
        console.log('[CLOUDFLARED]', data.toString());
      });

      loginProcess.stderr.on('data', (data) => {
        console.log('[CLOUDFLARED]', data.toString());
      });

      loginProcess.on('exit', (code) => {
        if (code === 0) {
          console.log('[WIZARD] Login réussi');
          dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Connexion Réussie',
            message: 'Vous êtes maintenant connecté à Cloudflare.',
            buttons: ['OK']
          });
          resolve(true);
        } else {
          console.error('[WIZARD] Login échoué, code:', code);
          dialog.showErrorBox(
            'Erreur de Connexion',
            'La connexion à Cloudflare a échoué.\n\nVeuillez réessayer.'
          );
          resolve(false);
        }
      });
    });
  }

  /**
   * Créer le tunnel
   */
  async createTunnel() {
    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Création du Tunnel',
      message: 'Création de votre tunnel Cloudflare',
      detail: 'Un tunnel nommé "atelier-velo" va être créé.\n\n' +
              'Cela peut prendre quelques secondes.',
      buttons: ['Annuler', 'Créer'],
      defaultId: 1
    });

    if (result.response === 0) {
      return false;
    }

    return new Promise((resolve) => {
      console.log('[WIZARD] Création tunnel...');
      
      const createProcess = spawn(this.cloudflaredPath, [
        'tunnel',
        'create',
        'atelier-velo'
      ], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let tunnelId = null;

      createProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[CLOUDFLARED]', output);
        
        // Extraire tunnel ID
        const match = output.match(/Created tunnel .* with id ([a-f0-9-]+)/);
        if (match) {
          tunnelId = match[1];
          this.store.set('tunnelId', tunnelId);
        }
      });

      createProcess.stderr.on('data', (data) => {
        console.log('[CLOUDFLARED]', data.toString());
      });

      createProcess.on('exit', (code) => {
        if (code === 0 && tunnelId) {
          console.log('[WIZARD] Tunnel créé:', tunnelId);
          dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Tunnel Créé',
            message: 'Votre tunnel a été créé avec succès !',
            detail: `ID du tunnel: ${tunnelId}`,
            buttons: ['OK']
          });
          resolve(true);
        } else {
          console.error('[WIZARD] Création tunnel échouée');
          dialog.showErrorBox(
            'Erreur de Création',
            'La création du tunnel a échoué.\n\nVeuillez réessayer.'
          );
          resolve(false);
        }
      });
    });
  }

  /**
   * Configurer le tunnel
   */
  async configureTunnel() {
    const tunnelId = this.store.get('tunnelId');
    if (!tunnelId) {
      console.error('[WIZARD] Tunnel ID manquant');
      return false;
    }

    // Créer config.yml
    const configPath = path.join(this.dataPath, 'cloudflare', 'config.yml');
    const credentialsPath = path.join(
      require('os').homedir(),
      '.cloudflared',
      `${tunnelId}.json`
    );

    const config = `tunnel: ${tunnelId}
credentials-file: ${credentialsPath.replace(/\\/g, '/')}

ingress:
  - hostname: "*.trycloudflare.com"
    service: http://localhost:3000
  - service: http_status:404
`;

    try {
      fs.writeFileSync(configPath, config, 'utf8');
      this.store.set('tunnelConfigPath', configPath);
      console.log('[WIZARD] Configuration sauvegardée');
      return true;
    } catch (error) {
      console.error('[WIZARD] Erreur sauvegarde config:', error);
      dialog.showErrorBox(
        'Erreur de Configuration',
        'Impossible de sauvegarder la configuration.\n\n' + error.message
      );
      return false;
    }
  }
}

module.exports = TunnelWizard;
