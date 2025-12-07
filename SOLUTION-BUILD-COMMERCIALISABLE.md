# Solution Build Commercialisable - Atelier Vélo+

## Problème Résolu

L'erreur `ENAMETOOLONG` empêchait la création d'installateurs NSIS car:
- **14 281 fichiers** dans l'ASAR
- Windows limite les lignes de commande à ~32 767 caractères
- NSIS/electron-builder passent la liste des fichiers en argument

## Solution Implémentée

### Architecture de Distribution

```
dist-electron/
├── win-unpacked/                    # Application décompressée (test/dev)
│   ├── Atelier Velo+.exe           # Exécutable principal
│   ├── resources/
│   │   ├── app.asar                # Code application (14K fichiers)
│   │   ├── app.asar.unpacked/      # Binaires natifs (Prisma)
│   │   ├── .env.production         # Configuration
│   │   └── icon.ico                # Icône
│   └── ...
├── Atelier Velo+-X.X.X-win-x64.zip  # Distribution portable (179 MB)
└── Atelier Velo+-X.X.X-Setup.exe    # Installateur SFX (110 MB)
```

### Scripts de Build

| Script | Usage |
|--------|-------|
| `scripts/build-release.ps1` | Build complet (Next.js + Electron + Installateurs) |
| `scripts/create-installer.ps1` | Création installateurs uniquement |
| `scripts/installer.iss` | Script Inno Setup (optionnel) |

### Commandes

```powershell
# Build complet
.\scripts\build-release.ps1

# Build rapide (skip Next.js si déjà buildé)
.\scripts\build-release.ps1 -SkipNextBuild

# Créer installateurs seulement (après build Electron)
.\scripts\create-installer.ps1 -SkipBuild
```

## Formats de Distribution

### 1. ZIP Portable (Recommandé pour tests)
- **Taille**: ~180 MB
- **Usage**: Extraire et lancer `Atelier Velo+.exe`
- **Avantages**: Pas d'installation, portable sur clé USB

### 2. Installateur SFX 7-Zip
- **Taille**: ~110 MB (compression LZMA)
- **Usage**: Double-clic, choisir dossier, installer
- **Avantages**: Auto-extractible, compression maximale

### 3. Installateur Inno Setup (Optionnel)
- **Prérequis**: Installer [Inno Setup 6](https://jrsoftware.org/isdl.php)
- **Avantages**: Raccourcis, registre, désinstallation propre

## Pourquoi NSIS ne Fonctionne Pas

### Cause Technique
```
electron-builder v26 → NSIS → makensis.exe
                              ↓
                    Ligne de commande avec liste fichiers
                              ↓
                    > 32 767 caractères = ENAMETOOLONG
```

### Issue GitHub
- [#8705](https://github.com/electron-userland/electron-builder/issues/8705) - Pattern glob trop long
- [#7192](https://github.com/electron-userland/electron-builder/issues/7192) - spawn ENAMETOOLONG

### Solutions Rejetées
| Solution | Raison du rejet |
|----------|-----------------|
| Downgrade electron-builder | Risque de régressions |
| NSISBI custom | Complexité, maintenance |
| Squirrel.Windows | Déprécié, moins flexible |
| Réduire node_modules | Impossible avec Next.js standalone |

## Vérifications Automatiques

Le script `build-release.ps1` vérifie:

### Pré-build
- [x] Fichiers critiques présents
- [x] node_modules installé
- [x] TypeScript (warning si erreurs)

### Post-build
- [x] Exécutable généré
- [x] ASAR créé
- [x] .env.production copié
- [x] Icône intégrée (via afterPack hook)

## Configuration electron-builder

```yaml
# electron-builder.config.yml (extrait)
win:
  target:
    # DIR + ZIP uniquement (NSIS désactivé)
    - target: dir
      arch: [x64]
    - target: zip
      arch: [x64]
  
  # Désactivé pour éviter ENAMETOOLONG
  signAndEditExecutable: false
  
# Icône intégrée via hook afterPack
afterPack: "./electron-builder-afterpack.js"
```

## Workflow de Release

```
1. Mettre à jour version dans package.json
2. Commit et tag: git tag v1.0.X
3. Exécuter: .\scripts\build-release.ps1
4. Tester: .\dist-electron\win-unpacked\Atelier Velo+.exe
5. Distribuer:
   - ZIP pour utilisateurs avancés
   - SFX pour installation simple
```

## Tailles Observées

| Composant | Taille |
|-----------|--------|
| win-unpacked/ | 518 MB |
| ZIP portable | 180 MB |
| SFX installer | 110 MB |
| ASAR seul | ~200 MB |

## Améliorations Futures

1. **Signature de code** - Certificat EV pour éviter alertes Windows
2. **Auto-update** - Hébergement sur serveur OVH existant
3. **Inno Setup** - Installateur plus professionnel si besoin
4. **Delta updates** - Mises à jour différentielles

## Conclusion

Cette solution contourne les limitations de NSIS tout en fournissant:
- ✅ Application fonctionnelle
- ✅ Distribution portable (ZIP)
- ✅ Installateur auto-extractible (SFX)
- ✅ Icône correctement intégrée
- ✅ Build automatisé et vérifié
