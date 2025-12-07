# 🔍 SYSTÈME DE VÉRIFICATION COMPLÈTE - BUILD & LANCEMENT

**Date** : 29 novembre 2025  
**Objectif** : Capturer TOUTES les erreurs pour réparation professionnelle

---

## 📋 VUE D'ENSEMBLE

Système complet de monitoring et vérification pour :
1. ✅ **Pre-Build** : Vérifier tous les prérequis
2. ✅ **Post-Build** : Vérifier intégrité du build
3. ✅ **Pre-Lancement** : Vérifier environnement
4. ✅ **Post-Lancement** : Monitorer démarrage et erreurs
5. ✅ **Analyse** : Analyser logs et générer rapports

---

## 🔧 SCRIPTS CRÉÉS

### 1. `scripts/verification-build-complete.ps1`

**Fonction** : Vérifications complètes à chaque étape

**Usage** :
```powershell
# Pre-build
.\scripts\verification-build-complete.ps1 -PreBuild

# Post-build
.\scripts\verification-build-complete.ps1 -PostBuild

# Pre-lancement
.\scripts\verification-build-complete.ps1 -PreLaunch

# Post-lancement
.\scripts\verification-build-complete.ps1 -PostLaunch
```

**Vérifications Pre-Build** :
- ✅ Fichiers sources critiques (package.json, configs, main.js, icon.ico)
- ✅ Dossiers sources (src, electron, public, prisma)
- ✅ Dépendances Node.js (node_modules, modules critiques)
- ✅ Variables d'environnement
- ✅ Espace disque disponible

**Vérifications Post-Build** :
- ✅ Build Next.js (.next/, BUILD_ID, .next/server, .next/static)
- ✅ Electron resources (electron-resources/web, npm_modules, server.js)
- ✅ Build Electron (exécutable, structure, fichiers critiques)
- ✅ Icône (source et intégration)

**Vérifications Pre-Lancement** :
- ✅ Exécutable présent
- ✅ Processus existants
- ✅ Port 3000 disponible
- ✅ Fichiers critiques présents

**Vérifications Post-Lancement** :
- ✅ Processus en cours d'exécution
- ✅ Serveur Next.js actif (port 3000)
- ✅ Analyse logs Electron (erreurs, démarrage serveur)
- ✅ Test HTTP (connexion serveur)

---

### 2. `scripts/monitoring-lancement.ps1`

**Fonction** : Monitoring en temps réel du lancement

**Usage** :
```powershell
.\scripts\monitoring-lancement.ps1 -ExePath "dist-electron\win-unpacked\Atelier Velo+.exe" -TimeoutSeconds 60
```

**Fonctionnalités** :
- ✅ Nettoyage processus existants
- ✅ Vérification port 3000
- ✅ Lancement application
- ✅ Monitoring temps réel (processus, port, logs, erreurs)
- ✅ Test HTTP final
- ✅ Rapport complet avec logs

**Sorties** :
- `logs-monitoring/monitoring-YYYYMMDD-HHMMSS.log` : Log complet
- `logs-monitoring/errors-YYYYMMDD-HHMMSS.log` : Erreurs uniquement

---

### 3. `scripts/analyse-erreurs-build.ps1`

**Fonction** : Analyser logs de build et identifier erreurs

**Usage** :
```powershell
.\scripts\analyse-erreurs-build.ps1 -LogFile "build.log" -OutputFile "analyse-erreurs.txt"
```

**Analyse** :
- ✅ Détection patterns d'erreurs (10+ types)
- ✅ Erreurs critiques spécifiques
- ✅ Contexte des erreurs
- ✅ Recommandations automatiques

**Types d'erreurs détectés** :
- Général (error, fail)
- Fichier manquant (ENOENT)
- Chemin trop long (ENAMETOOLONG)
- Module manquant
- Processus (spawn failed)
- BUILD_ID manquant
- Prisma
- Electron Builder
- NPM

---

### 4. `build-avec-verification-complete.ps1`

**Fonction** : Build complet avec vérifications intégrées

**Usage** :
```powershell
.\build-avec-verification-complete.ps1
```

**Étapes** :
1. ✅ Vérifications Pre-Build
2. ✅ Build Next.js (avec logs)
3. ✅ Prebuild (prepare-build-optimized.js)
4. ✅ Vérifications Post-Build
5. ✅ Build Electron (avec logs)
6. ✅ Rapport final

**Logs générés** :
- `build-complet-YYYYMMDD-HHMMSS.log` : Log principal
- `build-nextjs-YYYYMMDD-HHMMSS.log` : Log Next.js
- `build-prebuild-YYYYMMDD-HHMMSS.log` : Log prebuild
- `build-electron-YYYYMMDD-HHMMSS.log` : Log Electron
- `logs-verification/` : Logs vérifications

---

## 🚀 UTILISATION RECOMMANDÉE

### Scénario 1 : Build Complet

```powershell
# Build avec toutes les vérifications
.\build-avec-verification-complete.ps1
```

### Scénario 2 : Vérification Build Existant

```powershell
# Vérifier build existant
.\scripts\verification-build-complete.ps1 -PostBuild
```

### Scénario 3 : Tester Lancement

```powershell
# Vérifier avant lancement
.\scripts\verification-build-complete.ps1 -PreLaunch

# Lancer avec monitoring
.\scripts\monitoring-lancement.ps1 -ExePath "dist-electron\win-unpacked\Atelier Velo+.exe"

# Vérifier après lancement
.\scripts\verification-build-complete.ps1 -PostLaunch
```

### Scénario 4 : Analyser Erreurs

```powershell
# Analyser log de build
.\scripts\analyse-erreurs-build.ps1 -LogFile "build-electron-20251129.log"
```

---

## 📊 INFORMATIONS CAPTURÉES

### Pendant le Build

1. **Fichiers manquants** : Liste complète
2. **Erreurs de build** : Toutes les erreurs avec contexte
3. **Taille fichiers** : Détection fichiers suspects
4. **Hash fichiers** : Détection changements
5. **Durée étapes** : Performance
6. **Espace disque** : Vérification capacité

### Au Lancement

1. **Processus** : PID, CPU, mémoire
2. **Port 3000** : État serveur Next.js
3. **Logs Electron** : Erreurs en temps réel
4. **Test HTTP** : Réponse serveur
5. **Timing** : Durée démarrage

---

## 🎯 AVANTAGES

### Pour le Développement

- ✅ **Détection précoce** : Erreurs identifiées immédiatement
- ✅ **Contexte complet** : Toutes les informations nécessaires
- ✅ **Reproductibilité** : Logs complets pour debug
- ✅ **Performance** : Timing de chaque étape

### Pour la Réparation

- ✅ **Erreurs classées** : Par type et criticité
- ✅ **Recommandations** : Solutions automatiques
- ✅ **Historique** : Logs datés et archivés
- ✅ **Traçabilité** : Hash fichiers pour détecter changements

---

## 📁 STRUCTURE LOGS

```
atelier/
├── logs-verification/
│   └── verification-YYYYMMDD-HHMMSS.log
├── logs-monitoring/
│   ├── monitoring-YYYYMMDD-HHMMSS.log
│   └── errors-YYYYMMDD-HHMMSS.log
├── build-complet-YYYYMMDD-HHMMSS.log
├── build-nextjs-YYYYMMDD-HHMMSS.log
├── build-prebuild-YYYYMMDD-HHMMSS.log
├── build-electron-YYYYMMDD-HHMMSS.log
└── analyse-erreurs-build.txt
```

---

## 🔄 WORKFLOW COMPLET

### 1. Build

```powershell
.\build-avec-verification-complete.ps1
```

**Résultat** :
- ✅ Build complet avec logs
- ✅ Vérifications à chaque étape
- ✅ Rapport final

### 2. Analyse (si erreurs)

```powershell
.\scripts\analyse-erreurs-build.ps1 -LogFile "build-electron-*.log"
```

**Résultat** :
- ✅ Erreurs classées
- ✅ Recommandations

### 3. Test Lancement

```powershell
.\scripts\monitoring-lancement.ps1
```

**Résultat** :
- ✅ Monitoring temps réel
- ✅ Détection erreurs
- ✅ Rapport final

### 4. Vérification Post-Lancement

```powershell
.\scripts\verification-build-complete.ps1 -PostLaunch
```

**Résultat** :
- ✅ État application
- ✅ État serveur
- ✅ Analyse logs

---

## ✅ CHECKLIST UTILISATION

### Avant Build

- [ ] Exécuter `verification-build-complete.ps1 -PreBuild`
- [ ] Vérifier qu'aucune erreur critique
- [ ] Vérifier espace disque suffisant

### Pendant Build

- [ ] Utiliser `build-avec-verification-complete.ps1`
- [ ] Surveiller logs en temps réel
- [ ] Noter toute erreur détectée

### Après Build

- [ ] Exécuter `verification-build-complete.ps1 -PostBuild`
- [ ] Vérifier exécutable créé
- [ ] Vérifier taille exécutable (suspect si < 50 MB)

### Avant Lancement

- [ ] Exécuter `verification-build-complete.ps1 -PreLaunch`
- [ ] Vérifier fichiers critiques présents
- [ ] Vérifier port 3000 disponible

### Pendant Lancement

- [ ] Utiliser `monitoring-lancement.ps1`
- [ ] Surveiller erreurs en temps réel
- [ ] Vérifier démarrage serveur

### Après Lancement

- [ ] Exécuter `verification-build-complete.ps1 -PostLaunch`
- [ ] Vérifier processus actif
- [ ] Vérifier serveur répond
- [ ] Analyser logs si erreurs

---

**Créé** : 29 novembre 2025  
**Statut** : ✅ Système complet opérationnel




