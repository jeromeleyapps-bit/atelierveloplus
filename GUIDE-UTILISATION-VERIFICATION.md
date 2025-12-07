# 📖 GUIDE UTILISATION SYSTÈME DE VÉRIFICATION

**Date** : 29 novembre 2025  
**Objectif** : Guide pratique pour utiliser le système de vérification

---

## 🚀 DÉMARRAGE RAPIDE

### Build Complet avec Vérifications

```powershell
.\build-avec-verification-complete.ps1
```

**Ce script fait** :
1. ✅ Vérifie tous les prérequis
2. ✅ Build Next.js avec logs
3. ✅ Prebuild avec vérifications
4. ✅ Vérifie intégrité build
5. ✅ Build Electron avec logs
6. ✅ Génère rapport final

---

## 📋 CAS D'USAGE

### Cas 1 : Build Normal

```powershell
# Build standard avec toutes les vérifications
.\build-avec-verification-complete.ps1
```

**Résultat** :
- Logs complets dans `build-complet-*.log`
- Vérifications à chaque étape
- Rapport final avec durée et erreurs

---

### Cas 2 : Vérifier Build Existant

```powershell
# Vérifier si un build existant est valide
.\scripts\verification-build-complete.ps1 -PostBuild
```

**Résultat** :
- Liste fichiers manquants
- Vérification intégrité
- Détection problèmes

---

### Cas 3 : Tester Lancement

```powershell
# 1. Vérifier avant lancement
.\scripts\verification-build-complete.ps1 -PreLaunch

# 2. Lancer avec monitoring
.\scripts\monitoring-lancement.ps1 -ExePath "dist-electron\win-unpacked\Atelier Velo+.exe"

# 3. Vérifier après lancement
.\scripts\verification-build-complete.ps1 -PostLaunch
```

**Résultat** :
- Vérification environnement
- Monitoring temps réel
- Détection erreurs
- Rapport final

---

### Cas 4 : Analyser Erreurs Build

```powershell
# Analyser un log de build spécifique
.\scripts\analyse-erreurs-build.ps1 -LogFile "build-electron-20251129.log"
```

**Résultat** :
- Erreurs classées par type
- Erreurs critiques identifiées
- Recommandations automatiques
- Rapport dans `analyse-erreurs-build.txt`

---

## 🔍 VÉRIFICATIONS DÉTAILLÉES

### Pre-Build

**Vérifie** :
- ✅ Fichiers sources (package.json, configs, main.js, icon.ico)
- ✅ Dossiers sources (src, electron, public, prisma)
- ✅ Dépendances (node_modules, modules critiques)
- ✅ Variables environnement
- ✅ Espace disque

**Action si erreur** : Arrêt build

---

### Post-Build

**Vérifie** :
- ✅ Build Next.js (.next/, BUILD_ID, server, static)
- ✅ Electron resources (electron-resources/web, npm_modules, server.js)
- ✅ Build Electron (exécutable, structure, fichiers)
- ✅ Icône (source et intégration)

**Action si erreur** : Avertissement (build peut continuer)

---

### Pre-Lancement

**Vérifie** :
- ✅ Exécutable présent
- ✅ Processus existants
- ✅ Port 3000 disponible
- ✅ Fichiers critiques

**Action si erreur** : Avertissement ou arrêt

---

### Post-Lancement

**Vérifie** :
- ✅ Processus actif
- ✅ Serveur Next.js (port 3000)
- ✅ Logs Electron (erreurs, démarrage)
- ✅ Test HTTP

**Action si erreur** : Rapport détaillé

---

## 📊 INTERPRÉTATION RÉSULTATS

### Codes de Sortie

- `0` : ✅ Succès
- `1` : ❌ Erreur critique
- `2` : ⚠️  Avertissements

### Niveaux de Log

- `INFO` : Information normale
- `SUCCESS` : Opération réussie
- `WARN` : Avertissement (non bloquant)
- `ERROR` : Erreur (bloquant)

---

## 🎯 WORKFLOW RECOMMANDÉ

### 1. Avant Premier Build

```powershell
# Vérifier environnement
.\scripts\verification-build-complete.ps1 -PreBuild
```

### 2. Build Initial

```powershell
# Build complet
.\build-avec-verification-complete.ps1
```

### 3. Si Erreurs

```powershell
# Analyser erreurs
.\scripts\analyse-erreurs-build.ps1 -LogFile "build-electron-*.log"
```

### 4. Test Lancement

```powershell
# Monitoring complet
.\scripts\monitoring-lancement.ps1
```

### 5. Vérification Finale

```powershell
# Vérifier tout fonctionne
.\scripts\verification-build-complete.ps1 -PostLaunch
```

---

## 🔧 DÉPANNAGE

### Problème : Scripts non trouvés

```powershell
# Vérifier structure
Get-ChildItem scripts\*.ps1
```

### Problème : Permissions PowerShell

```powershell
# Autoriser exécution scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Problème : Logs trop volumineux

```powershell
# Nettoyer anciens logs
Remove-Item logs-verification\*.log -ErrorAction SilentlyContinue
Remove-Item logs-monitoring\*.log -ErrorAction SilentlyContinue
```

---

## 📁 FICHIERS GÉNÉRÉS

### Logs Build

- `build-complet-YYYYMMDD-HHMMSS.log` : Log principal
- `build-nextjs-YYYYMMDD-HHMMSS.log` : Log Next.js
- `build-prebuild-YYYYMMDD-HHMMSS.log` : Log prebuild
- `build-electron-YYYYMMDD-HHMMSS.log` : Log Electron

### Logs Vérification

- `logs-verification/verification-YYYYMMDD-HHMMSS.log` : Vérifications

### Logs Monitoring

- `logs-monitoring/monitoring-YYYYMMDD-HHMMSS.log` : Monitoring
- `logs-monitoring/errors-YYYYMMDD-HHMMSS.log` : Erreurs uniquement

### Rapports

- `analyse-erreurs-build.txt` : Analyse erreurs

---

## ✅ CHECKLIST UTILISATION

### Avant Build

- [ ] Exécuter `verification-build-complete.ps1 -PreBuild`
- [ ] Vérifier qu'aucune erreur critique
- [ ] Vérifier espace disque > 5 GB

### Pendant Build

- [ ] Utiliser `build-avec-verification-complete.ps1`
- [ ] Surveiller logs en temps réel
- [ ] Noter toute erreur détectée

### Après Build

- [ ] Exécuter `verification-build-complete.ps1 -PostBuild`
- [ ] Vérifier exécutable créé (> 50 MB)
- [ ] Vérifier BUILD_ID présent

### Avant Lancement

- [ ] Exécuter `verification-build-complete.ps1 -PreLaunch`
- [ ] Vérifier fichiers critiques
- [ ] Vérifier port 3000 libre

### Pendant Lancement

- [ ] Utiliser `monitoring-lancement.ps1`
- [ ] Surveiller erreurs temps réel
- [ ] Vérifier démarrage serveur (< 30s)

### Après Lancement

- [ ] Exécuter `verification-build-complete.ps1 -PostLaunch`
- [ ] Vérifier processus actif
- [ ] Vérifier serveur répond HTTP
- [ ] Analyser logs si erreurs

---

**Créé** : 29 novembre 2025  
**Statut** : ✅ Guide complet




