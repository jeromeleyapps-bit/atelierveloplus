# Atelier Vélo+ Desktop

Application desktop Electron pour la gestion d'atelier vélo.

## 🚀 Fonctionnalités

- ✅ **100% Offline** : Fonctionne sans connexion internet (sauf RDV clients)
- ✅ **Base SQLite locale** : Données stockées dans `%APPDATA%/atelier-velo-desktop/data/`
- ✅ **Tunnel Cloudflare optionnel** : Accès public pour les RDV clients
- ✅ **Auto-update** : Mise à jour automatique (Phase 4)

## 📦 Développement

### Prérequis

- Node.js 18+
- pnpm
- (Optionnel) Cloudflared installé dans `C:\cloudflared\`

### Démarrer en mode dev

```powershell
cd apps/desktop
pnpm start
```

**Ce qui se passe:**
1. Démarre le serveur Next.js en dev (`http://localhost:3000`)
2. Démarre le tunnel Cloudflare (si installé) pour `https://rdv.upgradedbikes.com`
3. Ouvre une fenêtre Electron

### Tunnel Cloudflare (optionnel)

Le tunnel permet aux clients de prendre RDV via une URL publique.

**Installation:**
1. Télécharger cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
2. Installer dans `C:\cloudflared\cloudflared.exe`
3. Configurer `C:\cloudflared\config.yml`

**Si non installé:**
- L'app fonctionne normalement
- Les RDV clients ne seront pas accessibles publiquement
- Message dans les logs: `[Tunnel] Cloudflared not found, skipping tunnel`

## 🏗️ Build

### Build portable (.exe)

```powershell
# 1. Build Next.js en standalone
cd ../web
pnpm build

# 2. Build Electron
cd ../desktop
pnpm build
```

**Résultat:** `apps/desktop/dist/AtelierVelo-1.0.0.exe` (~150MB)

### Build installeur (NSIS)

```powershell
pnpm build:installer
```

## 📁 Structure

```
apps/desktop/
├── main.js           # Entry point Electron
├── preload.js        # Script de sécurité
├── package.json      # Config Electron + electron-builder
├── icon.ico          # Icône de l'app (optionnel)
└── dist/             # Build artifacts
```

## 🔧 Configuration

### Variables d'environnement

L'app configure automatiquement:
- `DATABASE_PROVIDER=sqlite`
- `DATABASE_URL=file:%APPDATA%/atelier-velo-desktop/data/atelier.db`
- `PORT=3000`

### Chemins importants

- **Base de données:** `%APPDATA%/atelier-velo-desktop/data/atelier.db`
- **Logs:** Console Electron (visible avec DevTools en dev)
- **Cloudflared:** `C:\cloudflared\cloudflared.exe` (optionnel)

## 🧪 Tests

### Test en mode dev

```powershell
pnpm start
```

Vérifier:
- ✅ Fenêtre Electron s'ouvre
- ✅ Next.js démarre sur port 3000
- ✅ Tunnel Cloudflare démarre (si installé)
- ✅ Page de login s'affiche
- ✅ Connexion fonctionne
- ✅ Base SQLite créée dans `%APPDATA%`

### Test offline

1. Démarrer l'app
2. Se connecter
3. Désactiver WiFi
4. Vérifier que tout fonctionne (sauf RDV)

## 📊 Logs

En mode dev, tous les logs sont visibles dans la console:
- `[Electron]` : Logs Electron
- `[Next.js]` : Logs du serveur Next.js
- `[Tunnel]` : Logs Cloudflare Tunnel

## 🐛 Dépannage

### L'app ne démarre pas

1. Vérifier que Next.js est bien build (en prod)
2. Vérifier les logs dans la console
3. Supprimer `%APPDATA%/atelier-velo-desktop` et réessayer

### Le tunnel ne démarre pas

1. Vérifier que cloudflared est installé: `C:\cloudflared\cloudflared.exe`
2. Vérifier que config.yml existe: `C:\cloudflared\config.yml`
3. Tester manuellement: `cloudflared tunnel --config C:\cloudflared\config.yml run atelier-velo`

### Erreur de base de données

1. Fermer l'app
2. Supprimer `%APPDATA%/atelier-velo-desktop/data/atelier.db`
3. Redémarrer l'app (la base sera recréée)

## 📝 Notes

- L'icône `icon.ico` est optionnelle (Electron utilise l'icône par défaut si absente)
- Le tunnel Cloudflare est optionnel (l'app fonctionne sans)
- En production, le serveur Next.js standalone est utilisé
- En dev, le serveur Next.js normal est utilisé avec HMR désactivé
