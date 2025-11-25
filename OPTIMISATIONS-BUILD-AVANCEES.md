# Optimisations Build Avancées - 25 novembre 2024

## 🎯 Objectif
Gratter encore plus de taille après les premières optimisations (-150-200 MB)

**Cible supplémentaire** : -100-150 MB additionnels

---

## 📊 Analyse des Gros Packages

### Top 10 des packages les plus lourds (estimé)

1. **@mui/material + @mui/icons-material** (~15 MB)
   - Solution : Tree-shaking agressif
   - Importer uniquement les icônes utilisées

2. **next** (~25 MB)
   - Solution : Déjà optimisé, peu de marge

3. **@prisma/client** (~10 MB)
   - Solution : Binaire natif, incompressible

4. **sharp** (~8 MB)
   - Solution : Binaire natif, nécessaire

5. **react-pdf** (~5 MB)
   - Solution : Lazy loading

6. **recharts** (~5 MB)
   - Solution : Lazy loading des graphiques

7. **date-fns** (~2 MB)
   - Solution : Importer uniquement les fonctions utilisées

8. **lodash** (~1 MB si présent)
   - Solution : Remplacer par lodash-es ou fonctions natives

9. **moment** (~500 KB si présent)
   - Solution : Déjà remplacé par date-fns ✅

10. **axios** (~500 KB si présent)
    - Solution : Utiliser fetch natif

---

## 🔧 Optimisations Avancées Proposées

### 1. Tree-Shaking MUI (Gain estimé : -5-8 MB)

**Problème** : Importer tout MUI même si on utilise que quelques composants

**Solution** : Babel plugin + imports optimisés

```javascript
// next.config.js
module.exports = {
  // ...
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },
};
```

**Impact** : Moyen  
**Effort** : Faible  
**Priorité** : ⭐⭐⭐

---

### 2. Lazy Loading Composants Lourds (Gain estimé : -3-5 MB)

**Problème** : Tous les composants chargés au démarrage

**Solution** : Dynamic imports pour composants lourds

```typescript
// Au lieu de :
import { PDFViewer } from 'react-pdf';

// Utiliser :
const PDFViewer = dynamic(() => import('react-pdf').then(mod => mod.PDFViewer), {
  ssr: false,
  loading: () => <Skeleton />
});
```

**Composants à lazy loader** :
- PDFViewer (react-pdf)
- Graphiques (recharts)
- Éditeur riche (si présent)
- Composants admin lourds

**Impact** : Moyen  
**Effort** : Moyen  
**Priorité** : ⭐⭐⭐

---

### 3. Compression ASAR avec Brotli (Gain estimé : -30-50 MB)

**Problème** : ASAR non compressé

**Solution** : Activer compression dans electron-builder

```yaml
# electron-builder.config.yml
asar: 
  compression: brotli  # ou 'gzip'
```

**Trade-off** :
- ✅ Gain : -30-50 MB
- ❌ Coût : Démarrage +0.3-0.5s

**Impact** : Fort  
**Effort** : Très faible  
**Priorité** : ⭐⭐⭐⭐⭐

---

### 4. Exclure Locales inutilisées (Gain estimé : -2-5 MB)

**Problème** : Locales de tous les packages incluses

**Solution** : Webpack IgnorePlugin

```javascript
// next.config.js
webpack: (config) => {
  config.plugins.push(
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    })
  );
  
  // Exclure locales date-fns sauf fr
  config.plugins.push(
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /date-fns/,
    })
  );
  
  return config;
}
```

**Impact** : Faible  
**Effort** : Faible  
**Priorité** : ⭐⭐

---

### 5. Minification Agressive (Gain estimé : -10-20 MB)

**Problème** : Minification par défaut Next.js pas maximale

**Solution** : Terser avec options agressives

```javascript
// next.config.js
webpack: (config, { isServer }) => {
  if (!isServer && process.env.NODE_ENV === 'production') {
    config.optimization.minimizer = [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,  // Supprimer tous les console.*
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info'],
            passes: 2,  // 2 passes de compression
          },
          mangle: true,
          output: {
            comments: false,  // Supprimer commentaires
          },
        },
      }),
    ];
  }
  return config;
}
```

**Impact** : Moyen  
**Effort** : Faible  
**Priorité** : ⭐⭐⭐⭐

---

### 6. Exclure Source Maps (Gain estimé : -20-30 MB)

**Problème** : Source maps en production

**Solution** : Déjà fait ✅

```javascript
productionBrowserSourceMaps: false,
```

---

### 7. Optimiser Images (Gain estimé : -5-10 MB)

**Problème** : Images non optimisées

**Solution** : Compresser toutes les images

```bash
# Installer imagemin
npm install --save-dev imagemin imagemin-pngquant imagemin-mozjpeg

# Script de compression
node scripts/optimize-images.js
```

**Impact** : Faible à Moyen  
**Effort** : Moyen  
**Priorité** : ⭐⭐

---

### 8. Bundle Analyzer (Gain : 0 MB, mais essentiel)

**Objectif** : Identifier les vrais coupables

**Solution** : Analyser le bundle

```bash
npm install --save-dev @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Lancer l'analyse
ANALYZE=true npm run build
```

**Impact** : Diagnostic  
**Effort** : Faible  
**Priorité** : ⭐⭐⭐⭐⭐

---

## 📋 Plan d'Action Recommandé

### Phase 1 : Quick Wins (10-15 min)

1. ✅ **Compression ASAR Brotli** (5 min)
   - Gain : -30-50 MB
   - Modifier `electron-builder.config.yml`

2. ✅ **Minification Terser agressive** (5 min)
   - Gain : -10-20 MB
   - Modifier `next.config.js`

3. ✅ **Tree-shaking MUI** (5 min)
   - Gain : -5-8 MB
   - Ajouter `optimizePackageImports`

**Gain total Phase 1** : -45-78 MB

---

### Phase 2 : Optimisations Moyennes (20-30 min)

4. **Bundle Analyzer** (10 min)
   - Installer et analyser
   - Identifier packages lourds

5. **Lazy Loading** (15 min)
   - PDFViewer
   - Graphiques
   - Composants admin

6. **Exclure Locales** (5 min)
   - IgnorePlugin Webpack

**Gain total Phase 2** : -10-20 MB

---

### Phase 3 : Optimisations Avancées (1-2h)

7. **Optimiser Images** (30 min)
   - Compresser PNG/JPG
   - Convertir en WebP

8. **Remplacer Lodash** (30 min)
   - Fonctions natives
   - lodash-es

9. **Audit Dépendances** (30 min)
   - Supprimer inutilisées
   - Remplacer lourdes

**Gain total Phase 3** : -15-30 MB

---

## 🎯 Gain Total Estimé

| Phase | Temps | Gain |
|-------|-------|------|
| **Phase 1** | 10-15 min | -45-78 MB |
| **Phase 2** | 20-30 min | -10-20 MB |
| **Phase 3** | 1-2h | -15-30 MB |
| **TOTAL** | 1h30-2h45 | **-70-128 MB** |

---

## 🚀 Commençons par Phase 1 (Quick Wins)

**Temps estimé** : 10-15 minutes  
**Gain estimé** : -45-78 MB  
**Risque** : Très faible

Prêt à lancer ? 🔥

