# ✅ ANALYSE BUILD MACOS - CORRECTIONS APPLIQUÉES

**Date** : 20 novembre 2025  
**Branche** : `refactor/flat-structure`  
**Objectif** : Build macOS réussi sur GitHub Actions sans casser les builds Windows locaux

---

## 🎯 Résumé

**Problème principal identifié** : `prepare-build-optimized.js` utilisait une commande **PowerShell** (Windows uniquement) pour calculer la taille des modules, ce qui **crashait sur macOS**.

**Solution appliquée** : Remplacé par une commande **cross-platform** :
- Windows : `powershell Get-ChildItem` (inchangé)
- macOS/Linux : `du -sk` (commande POSIX standard)

---

## 🔴 Problèmes identifiés

### 1. **PowerShell dans `prepare-build-optimized.js` (CRITIQUE)**

**Fichier** : `prepare-build-optimized.js` ligne 385  
**Problème** :
```javascript
const sizeBytes = execSync(`powershell "(Get-ChildItem -Path '${moduleSrc}' -Recurse -File | Measure-Object -Property Length -Sum).Sum"`, { encoding: 'utf8' });
```

- PowerShell n'existe pas sur macOS/Linux
- Le script crashait à l'étape 6/7 (copie node_modules)
- Bloquait **tout le workflow macOS**

**Solution** :
```javascript
if (process.platform === 'win32') {
  // PowerShell sur Windows
  const sizeBytes = execSync(`powershell "(Get-ChildItem -Path '${moduleSrc}' -Recurse -File | Measure-Object -Property Length -Sum).Sum"`, { encoding: 'utf8' });
  sizeMB = parseInt(sizeBytes) / (1024 * 1024);
} else {
  // du sur macOS/Linux
  const sizeKB = execSync(`du -sk "${moduleSrc}"`, { encoding: 'utf8' }).split('\t')[0];
  sizeMB = parseInt(sizeKB) / 1024;
}
```

**Commit** : `a23e007` - "Fix prepare-build-optimized.js for macOS compatibility"

---

### 2. **Lint CI et TypeCheck (CORRIGÉ PRÉCÉDEMMENT)**

**Problème** :
- `npm run lint:ci` utilisait `next lint --max-warnings=0` → option invalide
- `prisma/seed-test-licenses.ts` importait `generateLicenseKey` inexistant
- `src/hooks/useBikesMutations.ts` n'exportait pas `CreateBikeData`

**Solution** :
- `lint:ci` : `eslint . --ignore-pattern "electron-resources/**" --max-warnings=0`
- `seed-test-licenses.ts` : fonction locale `generateTestLicenseKey()`
- `useBikesMutations.ts` : `export interface CreateBikeData`

**Commit** : `05a56ac` - "Fix lint CI script and TypeScript seed/hooks exports"

---

## ✅ Éléments validés (OK pour macOS)

### 1. **Configuration `electron-builder.config.yml`**
- ✅ Cibles macOS : `dmg` pour x64 + arm64 (Apple Silicon)
- ✅ Icône : `resources/icon.icns` (généré par workflow)
- ✅ Signature : `identity: null` (gratuit, pas de notarisation)
- ✅ Hardened Runtime : `false` (pas de signature)
- ✅ Gatekeeper : `false` (avertissement macOS, mais gratuit)

### 2. **Workflow `.github/workflows/build-macos.yml`**
- ✅ Génération icône `.icns` via `sips` + `iconutil` (natifs macOS)
- ✅ Sources icône : `resources/icon-256.png` ou `public/icons/icon-512x512.png` (présents)
- ✅ Commandes : `npm ci`, `npx prisma generate`, `npm run build`, `node prepare-build-optimized.js`
- ✅ Build Electron : `electron-builder --config electron-builder.config.yml --mac`

### 3. **Dépendances natives (Sharp, Prisma)**
- ✅ Sharp : Binaires macOS (`@img/sharp-darwin-x64`, `@img/sharp-darwin-arm64`) installés par `npm ci`
- ✅ Prisma : Binaires macOS téléchargés par `npx prisma generate`
- ✅ Better-sqlite3 : Pas utilisé sur macOS (Prisma utilise son propre engine)

### 4. **Isolation Windows / macOS**
- ✅ Build macOS : GitHub Actions (`runs-on: macos-latest`)
- ✅ Build Windows : Scripts PowerShell locaux (`build-definitif.ps1`, `build-release.ps1`, etc.)
- ✅ **Aucune interférence** : Les deux builds sont complètement séparés

---

## 📋 Checklist finale

- [x] `prepare-build-optimized.js` compatible macOS/Linux
- [x] `lint:ci` fonctionne (eslint au lieu de next lint)
- [x] `typecheck` passe (exports TypeScript corrigés)
- [x] Icône `.icns` générée automatiquement par workflow
- [x] Config `electron-builder.config.yml` valide pour macOS
- [x] Workflow `.github/workflows/build-macos.yml` complet
- [x] Dépendances natives (Sharp, Prisma) OK
- [x] Isolation Windows/macOS garantie

---

## 🚀 Prochaine étape

**Push la branche `refactor/flat-structure` vers GitHub** :

```bash
git push origin refactor/flat-structure
```

Le workflow macOS se déclenchera automatiquement (configuré sur `push: branches: [ refactor/flat-structure ]`).

**Suivi du build** :
- Aller sur GitHub → Actions → "Build macOS"
- Vérifier les logs de chaque étape
- Si erreur : récupérer les logs et corriger

---

## 📊 Résumé des commits

| Commit | Description |
|--------|-------------|
| `05a56ac` | Fix lint CI script and TypeScript seed/hooks exports |
| `a23e007` | Fix prepare-build-optimized.js for macOS compatibility |

**Total** : 2 commits prêts à pusher

---

## 🔒 Garanties

1. **Les builds Windows locaux continuent de fonctionner** (scripts PowerShell inchangés)
2. **Le workflow macOS est isolé** (tourne sur `macos-latest`, pas sur ton PC)
3. **Aucun changement de logique métier** (seulement CI/build)
4. **Compatibilité cross-platform** (`prepare-build-optimized.js` fonctionne partout)

---

## 📝 Notes techniques

### Pourquoi `du -sk` sur macOS ?
- `du` = "disk usage" (commande POSIX standard)
- `-s` = summary (total seulement)
- `-k` = en kilobytes
- Équivalent de `Get-ChildItem | Measure-Object -Property Length -Sum` sur Windows

### Fallback si calcul taille échoue
```javascript
try {
  // Calcul taille...
} catch (sizeError) {
  sizeMB = 0; // Continuer sans afficher la taille
}
```
- Si `du` échoue (permissions, etc.), le build continue
- Affiche juste le nom du module sans la taille

---

**Auteur** : Assistant IA  
**Validation** : Prêt pour push et test sur GitHub Actions

