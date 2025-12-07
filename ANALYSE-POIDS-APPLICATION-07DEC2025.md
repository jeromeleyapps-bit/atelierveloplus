# ANALYSE DU POIDS DE L'APPLICATION
## Atelier Vélo+ - 7 décembre 2025

---

## 0. RÉSUMÉ OPTIMISATIONS RÉALISÉES

| Optimisation | Gain | Statut |
|--------------|------|--------|
| Suppression @next/swc (afterPack) | -122 MB | ✅ FAIT |
| Remplacement date-fns → dayjs | -21 MB | ✅ FAIT |
| Remplacement sharp → jimp | -17 MB | ✅ FAIT |
| **TOTAL** | **-143 MB (27.5%)** | ✅ |

| État | Taille |
|------|--------|
| Build initial | 518 MB |
| **Build actuel** | **376 MB** |

---

## 1. RÉPARTITION ACTUELLE DU BUILD (376 MB)

### Composants Principaux

| Composant | Taille | % Total | Description |
|-----------|--------|---------|-------------|
| **Electron Core** | 281 MB | 71% | Chromium + Node.js embarqués |
| **app.asar** | 74 MB | 19% | Code application compressé |
| **app.asar.unpacked** | 39 MB | 10% | Binaires natifs non compressibles |

### Détail Electron Core (281 MB)

| Fichier | Taille | Rôle |
|---------|--------|------|
| `Atelier Velo+.exe` | 201 MB | Exécutable Electron (Chromium) |
| `dxcompiler.dll` | 25 MB | Compilateur DirectX (GPU) |
| `LICENSES.chromium.html` | 14 MB | Licences open source |
| `icudtl.dat` | 10 MB | Données Unicode ICU |
| `libGLESv2.dll` | 8 MB | OpenGL ES (rendu) |
| `resources.pak` | 6 MB | Ressources Chromium |
| Autres DLL | 17 MB | Vulkan, FFmpeg, D3D |

### Détail app.asar.unpacked (39 MB)

| Module | Taille | Nécessité |
|--------|--------|-----------|
| `.prisma` (Query Engine) | 20 MB | **OBLIGATOIRE** - SQLite |
| `@img/sharp` | 19 MB | Traitement images |

---

## 2. CAUSES PRINCIPALES DU POIDS

### A. Electron Framework (281 MB) - INCOMPRESSIBLE

**Raison** : Electron embarque un navigateur Chromium complet + Node.js.

- C'est le prix à payer pour une application desktop cross-platform
- Toutes les applications Electron ont ce "plancher" (~250-300 MB)
- Exemples : VS Code (~350 MB), Slack (~300 MB), Discord (~300 MB)

**Verdict** : ⚠️ Réduction impossible sans changer de technologie

### B. Prisma Query Engine (20 MB) - OBLIGATOIRE

**Raison** : Prisma compile un moteur de requêtes natif pour SQLite.

- Binaire `.node` spécifique à Windows x64
- Nécessaire pour toutes les opérations base de données
- Pas d'alternative légère avec les mêmes fonctionnalités

**Verdict** : ⚠️ Réduction impossible sans changer d'ORM

### C. Sharp/libvips (19 MB) - OPTIMISABLE

**Raison** : Traitement d'images haute performance.

**Utilisation actuelle** : 4 imports seulement
- Upload de logos
- Redimensionnement d'images

**Alternatives** :
1. **Browser Canvas API** : Gratuit, mais moins performant
2. **Jimp** : ~2 MB, JavaScript pur, plus lent
3. **Supprimer si non critique** : Économie 19 MB

**Verdict** : ✅ Potentiel -19 MB

### D. Next.js Standalone (18 MB) - OPTIMISABLE

**Raison** : Serveur Next.js pour le rendu.

**Contenu** :
- Serveur HTTP
- Router
- Middleware

**Verdict** : ⚠️ Nécessaire pour l'architecture actuelle

### E. Dépendances Non Utilisées

| Module | Taille | Utilisé ? |
|--------|--------|-----------|
| `effect` | 26 MB | ❌ NON (dépendance transitive) |
| `date-fns` | 22 MB | ⚠️ 3 fichiers seulement |
| `pdf-lib` | 19 MB | ⚠️ Génération PDF |

---

## 3. SOLUTIONS ENVISAGEABLES

### ~~Solution 1 : Remplacer Sharp par Jimp~~ ✅ FAIT

**Gain réalisé** : 17 MB
**Fichier modifié** : `src/app/api/account/upload-logo/route.ts`

### ~~Solution 2 : Remplacer date-fns par dayjs~~ ✅ FAIT

**Gain réalisé** : 21 MB
**Fichiers modifiés** : `src/lib/format.ts`, `src/hooks/useTicketsData.ts`

### Solution 3 : Lazy Loading PDF-lib (Gain: ~15 MB au démarrage) - À FAIRE

**Effort** : Faible (1h)
**Risque** : Aucun

```javascript
// Avant
import { PDFDocument } from 'pdf-lib';

// Après (chargement dynamique)
const generatePDF = async () => {
  const { PDFDocument } = await import('pdf-lib');
  // ...
};
```

### Solution 4 : Alternative à Electron (Gain: ~200 MB)

**Options** :
1. **Tauri** : ~10-20 MB (Rust + WebView natif)
2. **Neutralino.js** : ~5-10 MB (WebView système)
3. **PWA** : 0 MB (navigateur existant)

**Effort** : Très élevé (réécriture partielle)
**Risque** : Élevé

| Framework | Taille | Avantages | Inconvénients |
|-----------|--------|-----------|---------------|
| Electron | 300 MB | Mature, écosystème | Lourd |
| Tauri | 15 MB | Léger, sécurisé | Rust requis, moins mature |
| Neutralino | 5 MB | Très léger | Moins de fonctionnalités |
| PWA | 0 MB | Aucune installation | Pas d'accès filesystem |

### Solution 5 : Compression UPX de l'exécutable (Gain: ~50-100 MB)

**Effort** : Faible (configuration)
**Risque** : Moyen (antivirus peuvent bloquer)

```powershell
# Compresser l'exe avec UPX
upx --best "Atelier Velo+.exe"
```

---

## 4. PLAN D'ACTION RECOMMANDÉ

### Phase 1 : Quick Wins ✅ COMPLÈTE

| Action | Gain | Statut |
|--------|------|--------|
| ~~Remplacer date-fns par dayjs~~ | 21 MB | ✅ FAIT |
| ~~Remplacer Sharp par Jimp~~ | 17 MB | ✅ FAIT |
| ~~Supprimer @next/swc~~ | 122 MB | ✅ FAIT |
| Lazy load pdf-lib | Perf | ⏳ À faire |

### Phase 2 : Optimisations Avancées (Gain estimé: ~20 MB)

| Action | Gain | Effort | Priorité |
|--------|------|--------|----------|
| Nettoyer dépendances transitives | 10 MB | 4h | MOYENNE |
| Optimiser bundle Next.js | 5 MB | 2h | BASSE |
| Compression assets | 5 MB | 1h | BASSE |

### Phase 3 : Migration Technologique (Optionnel)

| Action | Gain | Effort | Priorité |
|--------|------|--------|----------|
| Migration Tauri | 200 MB | 40h+ | BASSE |

---

## 5. RÉSUMÉ

### ~~Taille Initiale : 518 MB~~

### Taille Actuelle : 376 MB (-27.5%)

### Taille Atteignable (Phase 2) : ~350 MB

### Taille Minimale Théorique (Electron) : ~300 MB

### Taille avec Tauri : ~50-80 MB

---

## 6. CONCLUSION

Le poids de l'application est principalement dû à :

1. **Electron (71%)** : Incompressible sans changement de technologie
2. **Prisma (5%)** : Obligatoire pour SQLite
3. **Dépendances lourdes (10%)** : Optimisables

**Recommandation** : 
- Court terme : Remplacer date-fns et Sharp (-37 MB)
- Moyen terme : Évaluer migration Tauri si le poids reste critique
- Long terme : Considérer une version PWA pour les utilisateurs web

---

*Document généré le 7 décembre 2025*
