# Guide de Build macOS - Atelier Vélo+

## Prérequis

### Sur le Mac de build

1. **macOS 10.15+** (Catalina ou supérieur)
2. **Node.js 18+** : `brew install node`
3. **Xcode Command Line Tools** : `xcode-select --install`
4. **Git** : `brew install git`

### Vérification

```bash
node -v    # Doit afficher v18.x ou supérieur
npm -v     # Doit afficher 9.x ou supérieur
git --version
```

---

## Étapes de Build

### 1. Cloner le repository

```bash
git clone https://github.com/jeromeleyssard-pixel/atelier-velo-plus.git
cd atelier-velo-plus
git checkout macOS
```

### 2. Créer l'icône macOS

L'icône doit être au format `.icns` (pas `.ico`).

**Option A - Conversion en ligne :**
- Aller sur https://cloudconvert.com/ico-to-icns
- Uploader `resources/icon.ico`
- Télécharger le `.icns`
- Sauvegarder dans `resources/icon.icns`

**Option B - Sur Mac avec iconutil :**
```bash
# Créer un dossier iconset avec les différentes tailles
mkdir icon.iconset
# Copier/redimensionner l'icône dans les tailles requises:
# icon_16x16.png, icon_32x32.png, icon_128x128.png, icon_256x256.png, icon_512x512.png
# Plus les versions @2x pour Retina
iconutil -c icns icon.iconset -o resources/icon.icns
```

### 3. Créer le fichier .env.production

```bash
cp .env.example .env.production
```

Éditer `.env.production` et définir :
```
ENCRYPTION_KEY=<générer avec: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_SECRET=<générer avec: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
```

### 4. Lancer le build

```bash
# Rendre le script exécutable
chmod +x scripts/build-macos.sh

# Build pour les deux architectures (Intel + Apple Silicon)
./scripts/build-macos.sh both

# OU build pour une architecture spécifique
./scripts/build-macos.sh x64      # Intel uniquement
./scripts/build-macos.sh arm64    # Apple Silicon uniquement
```

### 5. Récupérer les fichiers

Les fichiers générés sont dans `dist-electron/` :
- `Atelier Velo+-1.2.0-mac-x64.dmg` - Pour Mac Intel
- `Atelier Velo+-1.2.0-mac-arm64.dmg` - Pour Mac Apple Silicon (M1/M2/M3)

---

## Installation sur Mac Client

### Sans signature de code (mode développement)

1. **Double-cliquer** sur le fichier `.dmg`
2. **Glisser** l'application vers le dossier Applications
3. **Premier lancement** : macOS affiche "Application non vérifiée"
4. **Contourner Gatekeeper** :
   - Aller dans **Préférences Système > Sécurité et confidentialité**
   - Dans l'onglet "Général", cliquer **"Ouvrir quand même"**
   - OU : Ctrl+Click sur l'app > Ouvrir > Ouvrir

### Avec signature de code (distribution)

Nécessite un compte Apple Developer (99$/an).

1. Créer un certificat "Developer ID Application"
2. Définir les variables d'environnement :
   ```bash
   export CSC_LINK="path/to/certificate.p12"
   export CSC_KEY_PASSWORD="password"
   export APPLE_ID="your@email.com"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   ```
3. Modifier `electron-builder.macos.yml` :
   ```yaml
   mac:
     identity: "Developer ID Application: Votre Nom (TEAMID)"
   ```
4. Relancer le build

---

## Dépannage

### Erreur "Cannot find module 'prisma'"

```bash
npm rebuild
npx prisma generate
```

### Erreur de binaires natifs

```bash
# Nettoyer et reconstruire
rm -rf node_modules
rm -rf electron/web/node_modules
npm ci
npm rebuild
```

### L'app ne démarre pas

Vérifier les logs :
```bash
# Lancer depuis le terminal pour voir les erreurs
/Applications/Atelier\ Velo+.app/Contents/MacOS/Atelier\ Velo+
```

### Erreur "App is damaged"

L'app a été modifiée après téléchargement (quarantine macOS).
```bash
xattr -cr /Applications/Atelier\ Velo+.app
```

---

## Architecture des Fichiers

```
atelier-velo-plus/
├── electron-builder.macos.yml    # Config build macOS
├── electron-builder-afterpack-macos.js  # Hook post-build
├── build/
│   └── entitlements.mac.plist    # Permissions macOS
├── resources/
│   ├── icon.ico                  # Icône Windows
│   └── icon.icns                 # Icône macOS (À CRÉER)
├── scripts/
│   └── build-macos.sh            # Script de build
└── GUIDE-BUILD-MACOS.md          # Ce guide
```

---

## Notes Importantes

1. **Cross-compilation impossible** : Les binaires Prisma doivent être compilés sur macOS
2. **Deux architectures** : Intel (x64) et Apple Silicon (arm64) nécessitent des builds séparés
3. **Sans signature** : L'utilisateur doit autoriser manuellement l'app
4. **Avec signature** : Nécessite Apple Developer Account (99$/an) + notarization

---

*Document créé le 7 décembre 2025*
