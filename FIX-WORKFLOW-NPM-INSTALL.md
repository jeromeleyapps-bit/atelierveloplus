# 🔧 Fix Workflow - Changer npm ci → npm install

## Problème
Le workflow échoue car `npm ci` nécessite un `package-lock.json` valide.

## Solution
Modifier le workflow pour utiliser `npm install` à la place.

---

## 📋 Étapes Manuelles

### 1. Fermer GitHub Desktop
- Fermez complètement GitHub Desktop
- Cela libérera le verrou Git

### 2. Modifier le workflow via PowerShell

```powershell
cd C:\Users\j_ley\Atelier-velo+
git checkout macos-workflow-only
Remove-Item -Path ".git/index.lock" -Force -ErrorAction SilentlyContinue
```

Ouvrez le fichier `.github/workflows/build-macos.yml` dans votre éditeur et changez :

**Ligne 29** - Remplacez :
```yaml
npm ci
```

Par :
```yaml
npm install
```

Sauvegardez le fichier, puis :

```powershell
git add .github/workflows/build-macos.yml
git commit -m "fix: Use npm install instead of npm ci"
git push origin macos-workflow-only
```

### 3. Rouvrir GitHub Desktop
- Rouvrez GitHub Desktop
- Continuez votre push de `refactor/flat-structure`

---

## ✅ Alternative : Modifier via GitHub Web

Si vous préférez éviter la ligne de commande :

1. **Aller sur GitHub** : 
   - https://github.com/jeromeleyssard-pixel/atelier-velo-plus/tree/macos-workflow-only

2. **Naviguer vers le fichier** :
   - Cliquez sur `.github/`
   - Cliquez sur `workflows/`
   - Cliquez sur `build-macos.yml`

3. **Modifier** :
   - Cliquez sur l'icône crayon (Edit)
   - Ligne 29 : Changez `npm ci` → `npm install`
   - Commit message : "fix: Use npm install instead of npm ci"
   - Cliquez sur **"Commit changes"**

4. **Le workflow se relancera automatiquement** dans ~30 secondes

---

## 🎯 Pourquoi ce changement ?

**npm ci** :
- ❌ Nécessite un `package-lock.json` valide
- ❌ Stricte sur les versions
- ✅ Plus rapide en CI/CD

**npm install** :
- ✅ Fonctionne avec ou sans `package-lock.json`
- ✅ Génère le lock file si absent
- ✅ Plus tolérant
- ⚠️ Légèrement plus lent (~1 minute de plus)

Pour un build macOS occasionnel, `npm install` est parfait !

---

## ✅ Après le changement

Le workflow devrait :
1. ✅ `npm install` → Installer les dépendances (OK)
2. ✅ `npx prisma generate` → Générer Prisma
3. ✅ `npm run build` → Builder Next.js
4. ✅ `electron-builder --mac` → Créer les .dmg

**Vérifiez sur GitHub Actions dans 1 minute !**

