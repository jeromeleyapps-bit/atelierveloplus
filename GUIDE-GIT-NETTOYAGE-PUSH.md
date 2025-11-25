# 📚 GUIDE - Nettoyage Git et Push GitHub

**Date** : 22 novembre 2025  
**Objectif** : Nettoyer branches et pusher corrections

---

## ✅ COMMIT CRÉÉ

### Détails du Commit
- **Hash** : `851c572`
- **Branche** : `fix/macos-build`
- **Message** : "fix(build): Restaurer build Windows - Corrections critiques 22nov2025"
- **Fichiers** : 20 fichiers modifiés
- **Insertions** : +5159 lignes
- **Suppressions** : -236 lignes

### Fichiers Inclus
1. ✅ `electron-builder.config.yml` - Config macOS supprimée
2. ✅ `src/lib/prisma.ts` - Erreur await corrigée
3. ✅ `.eslintignore` - Fichiers YAML exclus
4. ✅ `package.json` - Version 1.0.17
5. ✅ 7 fichiers documentation MD
6. ✅ Scripts de test PowerShell

---

## 🧹 ÉTAPE 1 : ANALYSE BRANCHES

### Commande
```powershell
.\nettoyage-branches.ps1
```

**Ce script va** :
- Lister branches locales
- Lister branches distantes
- Nettoyer branches supprimées sur GitHub
- Afficher branche actuelle

### Résultat Attendu
```
=== NETTOYAGE BRANCHES GITHUB ===

1. Branches locales:
  * fix/macos-build
    main
    backup-typescript-fixes-20251121-123644
    ...

2. Branches distantes:
  origin/main
  origin/fix/macos-build
  origin/macos-workflow-only
  ...

4. Branche actuelle:
   fix/macos-build
```

---

## 🔍 ÉTAPE 2 : IDENTIFIER BRANCHES À SUPPRIMER

### Branches Potentiellement Obsolètes

#### Branches de Test/Debug
- `macos-workflow-only` - Tests workflow macOS
- `refactor/flat-structure` - Refactoring structure
- Autres branches de test temporaires

#### Branches Mergées
- Branches déjà intégrées dans `main`
- Branches de corrections ponctuelles terminées

### Commandes de Suppression

#### Supprimer Branche Locale
```powershell
git branch -d <nom-branche>
```

#### Supprimer Branche Distante (GitHub)
```powershell
git push origin --delete <nom-branche>
```

#### Exemple
```powershell
# Supprimer branche locale
git branch -d macos-workflow-only

# Supprimer branche distante
git push origin --delete macos-workflow-only
```

---

## 🚀 ÉTAPE 3 : PUSH VERS GITHUB

### Option 1 : Script Automatique (RECOMMANDÉ)

```powershell
.\push-github.ps1
```

**Ce script va** :
- Vérifier branche actuelle
- Afficher commits à pusher
- Pusher vers GitHub

### Option 2 : Commande Manuelle

```powershell
# Push branche actuelle
git push origin fix/macos-build

# Si première fois (branche non trackée)
git push -u origin fix/macos-build
```

---

## 📋 STRATÉGIE DE NETTOYAGE RECOMMANDÉE

### Branches à Garder
1. ✅ `main` - Branche principale
2. ✅ `fix/macos-build` - Branche actuelle (corrections critiques)
3. ✅ Branches actives en développement

### Branches à Supprimer (Exemples)
1. ❌ `macos-workflow-only` - Tests macOS terminés
2. ❌ `refactor/flat-structure` - Refactoring mergé
3. ❌ Branches de backup anciennes (si mergées)
4. ❌ Branches de test temporaires

### Procédure de Suppression

#### 1. Vérifier si branche mergée
```powershell
# Voir si branche mergée dans main
git branch --merged main
```

#### 2. Supprimer branche locale
```powershell
git branch -d <nom-branche>
```

#### 3. Supprimer branche distante
```powershell
git push origin --delete <nom-branche>
```

#### 4. Vérifier suppression
```powershell
git branch -a
```

---

## 🎯 PLAN D'ACTION COMPLET

### Étape 1 : Analyser
```powershell
.\nettoyage-branches.ps1
```

### Étape 2 : Supprimer Branches Obsolètes (Exemple)
```powershell
# Branches locales
git branch -d macos-workflow-only
git branch -d refactor/flat-structure

# Branches distantes
git push origin --delete macos-workflow-only
git push origin --delete refactor/flat-structure
```

### Étape 3 : Push Corrections
```powershell
.\push-github.ps1
```

### Étape 4 : Créer Tag (Après Build Réussi)
```powershell
# Créer tag
git tag -a v1.0.17-build-fix-windows -m "Fix build Windows - Corrections critiques 22nov2025"

# Push tag
git push origin v1.0.17-build-fix-windows
```

---

## 📊 ÉTAT ACTUEL

### Commit Local
- ✅ Créé : `851c572`
- ✅ Message : Détaillé et complet
- ✅ Fichiers : 20 fichiers (corrections + documentation)
- ⏳ Push : À faire

### Build
- 🔄 En cours (étape 7/15)
- ⏳ Temps restant : 15-20 minutes
- ✅ Tests préalables : Validés

### Branches
- ✅ Actuelle : `fix/macos-build`
- ⏳ Nettoyage : À faire
- ⏳ Push : À faire

---

## 🎓 BONNES PRATIQUES

### Nommage Branches
```
feat/nouvelle-fonctionnalite    - Nouvelle fonctionnalité
fix/correction-bug              - Correction bug
refactor/amelioration-code      - Refactoring
docs/mise-a-jour-doc           - Documentation
test/ajout-tests               - Tests
```

### Cycle de Vie Branche
1. Créer branche depuis `main`
2. Développer et commiter
3. Tester et valider
4. Merger dans `main`
5. **Supprimer branche** (local + distant)

### Tags
```
v1.0.17                        - Version release
v1.0.17-beta                   - Version beta
v1.0.17-build-fix-windows      - Version avec fix spécifique
```

---

## 🚀 COMMANDES RAPIDES

### Analyse
```powershell
# Branches locales
git branch

# Branches distantes
git branch -r

# Branches mergées
git branch --merged main

# Status
git status
```

### Nettoyage
```powershell
# Supprimer branche locale
git branch -d <branche>

# Supprimer branche distante
git push origin --delete <branche>

# Nettoyer références distantes
git fetch --prune
```

### Push
```powershell
# Push branche actuelle
git push

# Push avec tracking
git push -u origin <branche>

# Push tags
git push --tags
```

---

## ✅ CHECKLIST

### Avant Push
- [x] Commit créé
- [x] Message commit détaillé
- [x] Fichiers importants inclus
- [ ] Branches analysées
- [ ] Branches obsolètes supprimées

### Après Push
- [ ] Commit visible sur GitHub
- [ ] Branche à jour sur GitHub
- [ ] Pull Request créée (si nécessaire)
- [ ] Tag créé (après build réussi)

---

## 📞 EN CAS DE PROBLÈME

### Erreur Push
```powershell
# Si branche non trackée
git push -u origin fix/macos-build

# Si conflit
git pull --rebase origin fix/macos-build
git push origin fix/macos-build
```

### Erreur Suppression Branche
```powershell
# Force suppression locale
git branch -D <branche>

# Vérifier si branche distante existe
git ls-remote --heads origin <branche>
```

---

**© 2024-2025 Jérôme Leyssard - Upgraded Bikes**  
**Guide créé le 22 novembre 2025**

---

## 🎯 ACTIONS IMMÉDIATES

### 1. Analyser Branches
```powershell
.\nettoyage-branches.ps1
```

### 2. Supprimer Branches Obsolètes
```powershell
# Identifier branches à supprimer
# Puis exécuter commandes de suppression
```

### 3. Push Corrections
```powershell
.\push-github.ps1
```

**Tout est prêt ! Lancez les scripts.** 🚀

