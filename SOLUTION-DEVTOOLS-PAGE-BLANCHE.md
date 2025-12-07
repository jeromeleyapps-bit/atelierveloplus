# 🔧 SOLUTION DEVTOOLS - PAGE BLANCHE

**Date** : 29 novembre 2025  
**Problème** : DevTools non visibles pour diagnostiquer page blanche

---

## 🎯 SOLUTIONS

### Solution 1 : Raccourci Clavier (IMMÉDIAT)

**Sans rebuild nécessaire** :

1. **Ouvrez l'application Electron**
2. **Appuyez sur** :
   - `Ctrl + Shift + I` (Windows/Linux)
   - `F12` (Windows/Linux)
   - `Cmd + Option + I` (macOS)

Les DevTools devraient s'ouvrir immédiatement.

---

### Solution 2 : Activation Automatique (Nécessite Rebuild)

**Code modifié** : `electron/windows/mainWindow.js`

Ajout d'un raccourci clavier global :
```javascript
// Raccourci clavier pour DevTools (diagnostic page blanche - 29/11/2025)
mainWindow.webContents.on('before-input-event', (event, input) => {
  // Ctrl+Shift+I ou F12 pour ouvrir DevTools
  if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools();
    }
    event.preventDefault();
  }
});
```

**Pour activer** :
```powershell
# Rebuild l'application avec les modifications
.\build-avec-verification-complete.ps1
```

---

## 🔍 CE QU'IL FAUT VÉRIFIER DANS LES DEVTOOLS

### 1. Onglet "Console"

**Rechercher** :
- ❌ Erreurs JavaScript (rouges)
- ❌ Warnings (jaunes)
- ❌ Messages d'erreur Next.js
- ❌ Erreurs de chargement de modules

**Exemples d'erreurs possibles** :
```
Error: Cannot find module '...'
Error: Failed to fetch
TypeError: Cannot read property '...' of undefined
Error: BUILD_ID not found
```

### 2. Onglet "Network"

**Rechercher** :
- ❌ Requêtes en rouge (échouées)
- ❌ Status 404 (fichiers non trouvés)
- ❌ Status 500 (erreurs serveur)
- ❌ Requêtes bloquées par CORS

**Fichiers à vérifier** :
- `/_next/static/css/*.css`
- `/_next/static/chunks/*.js`
- `/_next/static/chunks/webpack-*.js`

### 3. Onglet "Elements"

**Vérifier** :
- ✅ Structure HTML présente
- ✅ Contenu dans `<body>`
- ✅ Scripts chargés dans `<head>`

**Si vide** :
- Problème de rendu React/Next.js
- Erreur JavaScript bloquante

---

## 📋 CHECKLIST DIAGNOSTIC

- [ ] Ouvrir DevTools avec `Ctrl+Shift+I` ou `F12`
- [ ] Vérifier onglet "Console" pour erreurs
- [ ] Vérifier onglet "Network" pour requêtes échouées
- [ ] Vérifier onglet "Elements" pour structure HTML
- [ ] Noter toutes les erreurs trouvées
- [ ] Prendre des captures d'écran si nécessaire

---

## 🎯 PROCHAINES ÉTAPES

1. **Immédiat** : Utiliser `Ctrl+Shift+I` ou `F12` pour ouvrir DevTools
2. **Analyser** : Erreurs dans la console
3. **Documenter** : Noter toutes les erreurs trouvées
4. **Corriger** : Selon les erreurs identifiées

---

**Créé** : 29 novembre 2025  
**Statut** : ✅ Solution immédiate disponible




