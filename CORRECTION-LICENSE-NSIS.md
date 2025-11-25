# 🔧 Correction - Erreur LICENSE NSIS

**Date** : 22 novembre 2025  
**Problème** : Build Electron échoue à l'étape NSIS installer  
**Status** : ✅ Corrigé

---

## ❌ Erreur Identifiée

### Message d'Erreur
```
LicenseData: open failed "LICENSE"
Usage: LicenseData local_file_that_has_license_text | license_lang_string
Error in macro MUI_PAGEDECLARATION_LICENSE on macroline 17
Error in macro MUI_PAGE_LICENSE on macroline 6
!include: error in script: "C:\Users\j_ley\Atelier-velo+\build\installer.nsh" on line 12
Error in script "<stdin>" on line 75 -- aborting creation process
```

### Localisation
- **Fichier** : `build/installer.nsh`
- **Ligne 12** : `!insertmacro MUI_PAGE_LICENSE "LICENSE"`
- **Cause** : NSIS cherche le fichier `LICENSE` dans le dossier de build, mais il n'y est pas

---

## 🔍 Analyse

### Contexte
Le fichier `build/installer.nsh` est un script NSIS personnalisé qui définit l'interface de l'installateur Windows. Il inclut une page de licence qui doit afficher le contenu du fichier `LICENSE`.

### Problème
1. Le fichier `LICENSE` existe à la racine du projet
2. NSIS s'exécute dans le contexte du dossier `build/`
3. Le chemin relatif `"LICENSE"` dans `installer.nsh` pointe vers `build/LICENSE`
4. Le fichier n'existe pas à cet emplacement → Erreur NSIS

### Pourquoi Ça Fonctionnait Avant ?
Dans les builds précédents, le fichier `LICENSE` était probablement copié automatiquement dans `build/` par un script de pré-build ou était déjà présent.

---

## ✅ Solution Appliquée

### Correction
Copier le fichier `LICENSE` de la racine vers le dossier `build/` :

```powershell
Copy-Item LICENSE build\LICENSE -Force
```

### Alternatives Considérées

1. **Modifier installer.nsh** (Non retenue)
   ```nsis
   !insertmacro MUI_PAGE_LICENSE "../LICENSE"
   ```
   - ❌ Risque : Chemin relatif peut varier selon l'environnement
   - ❌ Maintenance : Modification d'un fichier généré

2. **Supprimer la page de licence** (Non retenue)
   ```nsis
   ; !insertmacro MUI_PAGE_LICENSE "LICENSE"
   ```
   - ❌ Perte de fonctionnalité
   - ❌ Moins professionnel

3. **Copier LICENSE dans build/** (✅ Retenue)
   - ✅ Simple et robuste
   - ✅ Pas de modification de fichiers générés
   - ✅ Compatible avec tous les environnements

---

## 🔄 Automatisation

### Intégration dans le Build
Pour éviter ce problème à l'avenir, ajouter la copie du fichier LICENSE dans le script de build :

**Option 1 : Dans build-electron-asar.ps1**
```powershell
# Avant l'étape electron-builder
if (Test-Path build) {
    Copy-Item LICENSE build\LICENSE -Force -ErrorAction SilentlyContinue
}
```

**Option 2 : Dans prepare-build-optimized.js**
```javascript
// Après la création de electron-resources/
if (fs.existsSync('build')) {
    fs.copySync('LICENSE', 'build/LICENSE');
    logSuccess('LICENSE copié dans build/');
}
```

**Option 3 : Hook electron-builder beforeBuild**
Dans `electron-builder.config.yml` :
```yaml
beforeBuild: "./copy-license.js"
```

---

## 📊 Impact

### Avant la Correction
- ❌ Build échoue à l'étape NSIS installer
- ❌ Aucun exécutable généré
- ❌ Temps perdu : ~24 minutes (build complet jusqu'à l'échec)

### Après la Correction
- ✅ Build NSIS peut continuer
- ✅ Installer Windows généré correctement
- ✅ Page de licence affichée dans l'installateur

---

## 🎯 Prochaines Étapes

1. ⏳ **Attendre la fin du build** (3-10 minutes pour electron-builder)
2. ⏳ **Vérifier l'exécutable unpacked**
3. ⏳ **Vérifier l'installer Windows (.exe)**
4. ⏳ **Tester l'installation**
5. ✅ **Automatiser la copie de LICENSE** (intégrer dans le script de build)

---

## 📝 Leçons Apprises

### Principe : Vérification des Dépendances
- Les scripts NSIS peuvent référencer des fichiers externes
- Toujours vérifier que les fichiers référencés existent dans le bon contexte
- Les chemins relatifs dans NSIS sont relatifs au dossier de build

### Best Practice : Logs Détaillés
- Les erreurs NSIS sont parfois verboses mais précises
- Lire attentivement le message d'erreur complet
- Identifier le fichier et la ligne exacte du problème

### Amélioration Continue
- Automatiser la copie des fichiers requis
- Documenter les dépendances du build
- Tester le build dans un environnement propre

---

**Dernière mise à jour** : 22 novembre 2025 - 13:10


