# 🚀 Stratégie de Déploiement - Multi-Environnements

## 🎯 Votre Question

**Comment l'app choisit-elle la bonne base de données selon l'environnement ?**

---

## 📊 3 Environnements Différents

### 1. Développement (Vous) 💻
**Environnement** : `NODE_ENV=development`  
**Base de données** : Supabase (PostgreSQL cloud)  
**Configuration** : `.env.local`

```env
NODE_ENV=development
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://...@supabase.com/postgres
```

---

### 2. Production Web (Vercel) ☁️
**Environnement** : `NODE_ENV=production` + Vercel  
**Base de données** : Supabase (PostgreSQL cloud)  
**Configuration** : Variables d'environnement Vercel

```env
NODE_ENV=production
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://...@supabase.com/postgres
```

---

### 3. Application Desktop/Mobile (Utilisateurs) 📱
**Environnement** : `NODE_ENV=production` + Standalone  
**Base de données** : SQLite local  
**Configuration** : Détection automatique

```env
NODE_ENV=production
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:./data/atelier_velo.db
```

---

## 🔧 Solution : Détection Automatique Intelligente

### Code de Détection

```typescript
// lib/db.ts
export async function getPrisma() {
  // 1. Détection de l'environnement
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isVercel = process.env.VERCEL === '1';
  const isElectron = typeof process.versions?.electron !== 'undefined';
  
  // 2. Choix de la base de données
  let databaseUrl: string;
  let provider: 'postgresql' | 'sqlite';
  
  if (isDevelopment) {
    // DÉVELOPPEMENT : Supabase
    provider = 'postgresql';
    databaseUrl = process.env.DATABASE_URL!;
    console.log('🔧 Dev mode: Using Supabase');
    
  } else if (isVercel) {
    // PRODUCTION WEB (Vercel) : Supabase
    provider = 'postgresql';
    databaseUrl = process.env.DATABASE_URL!;
    console.log('☁️ Vercel mode: Using Supabase');
    
  } else if (isElectron) {
    // APPLICATION DESKTOP : SQLite local
    provider = 'sqlite';
    databaseUrl = `file:${getLocalDbPath()}/atelier_velo.db`;
    console.log('💻 Desktop mode: Using SQLite');
    
  } else {
    // FALLBACK : Vérifier variable d'environnement
    provider = (process.env.DATABASE_PROVIDER as any) || 'sqlite';
    databaseUrl = process.env.DATABASE_URL || `file:./data/atelier_velo.db`;
    console.log(`📦 Standalone mode: Using ${provider}`);
  }
  
  // 3. Créer le client Prisma
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });
}

function getLocalDbPath() {
  const os = require('os');
  const path = require('path');
  
  // Chemin selon l'OS
  if (process.platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Local', 'atelier-velo', 'data');
  } else if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'atelier-velo', 'data');
  } else {
    return path.join(os.homedir(), '.local', 'share', 'atelier-velo', 'data');
  }
}
```

---

## 🎯 Détection Automatique par Environnement

### Tableau de Décision

| Environnement | `NODE_ENV` | `VERCEL` | `electron` | Base | Provider |
|---------------|------------|----------|------------|------|----------|
| **Dev (Vous)** | development | - | - | Supabase | postgresql |
| **Vercel** | production | 1 | - | Supabase | postgresql |
| **Desktop** | production | - | defined | SQLite | sqlite |
| **Mobile** | production | - | - | SQLite | sqlite |

---

## ☁️ Déploiement Vercel

### Pourquoi Vercel ? ✅

**Avantages** :
- ✅ Gratuit pour petits projets
- ✅ Déploiement automatique depuis Git
- ✅ HTTPS automatique
- ✅ CDN global
- ✅ Optimisé pour Next.js
- ✅ Variables d'environnement faciles

**Inconvénients** :
- ⚠️ Serverless = pas de base locale
- ⚠️ Limites sur plan gratuit

---

### Configuration Vercel

#### 1. Variables d'Environnement

**Dans Vercel Dashboard** :
```
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://postgres.zkzhhmraidednkwkwxbm:***@aws-1-eu-west-3.pooler.supabase.com:6543/postgres
```

#### 2. Détection Automatique

**Vercel injecte automatiquement** :
```env
VERCEL=1
VERCEL_ENV=production
NODE_ENV=production
```

**Votre code détecte** :
```typescript
if (process.env.VERCEL === '1') {
  // Utiliser Supabase
}
```

---

## 📱 Application Desktop (Electron)

### Détection Automatique

**Electron injecte** :
```javascript
process.versions.electron // "28.0.0"
```

**Votre code détecte** :
```typescript
if (typeof process.versions?.electron !== 'undefined') {
  // Utiliser SQLite local
}
```

### Configuration Packagée

**Dans `package.json` de l'app Electron** :
```json
{
  "build": {
    "extraResources": [
      {
        "from": "prisma/schema.prisma",
        "to": "prisma/schema.prisma"
      }
    ],
    "files": [
      ".next/**/*",
      "node_modules/**/*"
    ]
  }
}
```

---

## 📱 Application Mobile (React Native)

### Détection Automatique

**React Native n'a pas `process.versions.electron`**

**Votre code détecte** :
```typescript
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

if (isReactNative) {
  // Utiliser SQLite local
}
```

---

## 🔄 Schéma Prisma Adaptatif

### Option 1 : Provider Variable (Recommandé)

```prisma
// prisma/schema.prisma
datasource db {
  provider = env("DATABASE_PROVIDER") // "postgresql" ou "sqlite"
  url      = env("DATABASE_URL")
}
```

**Avantages** :
- ✅ Un seul schéma
- ✅ Changement via variable d'environnement
- ✅ Simple

---

### Option 2 : Deux Schémas Séparés

```
prisma/
  ├── schema.prisma (PostgreSQL)
  └── schema-sqlite.prisma (SQLite)
```

**Build selon environnement** :
```json
{
  "scripts": {
    "build:web": "prisma generate && next build",
    "build:desktop": "prisma generate --schema=prisma/schema-sqlite.prisma && electron-builder"
  }
}
```

**Avantages** :
- ✅ Séparation claire
- ✅ Optimisations spécifiques

**Inconvénients** :
- ⚠️ Duplication du schéma
- ⚠️ Maintenance double

---

## 🎯 Recommandation : Architecture Hybride

### Configuration Recommandée

```typescript
// lib/db.ts - Version finale recommandée
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

export async function getPrisma() {
  if (prisma) return prisma;
  
  // Détection environnement
  const isDev = process.env.NODE_ENV === 'development';
  const isVercel = !!process.env.VERCEL;
  const isElectron = typeof process.versions?.electron !== 'undefined';
  
  // Configuration base de données
  let config: { url: string };
  
  if (isDev || isVercel) {
    // Cloud (Supabase)
    config = {
      url: process.env.DATABASE_URL!
    };
  } else {
    // Local (SQLite)
    const dbPath = getLocalDbPath();
    ensureDbDirectory(dbPath);
    config = {
      url: `file:${dbPath}/atelier_velo.db`
    };
  }
  
  prisma = new PrismaClient({
    datasources: { db: config }
  });
  
  return prisma;
}

function getLocalDbPath(): string {
  const os = require('os');
  const path = require('path');
  
  switch (process.platform) {
    case 'win32':
      return path.join(os.homedir(), 'AppData', 'Local', 'atelier-velo', 'data');
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', 'atelier-velo', 'data');
    default:
      return path.join(os.homedir(), '.local', 'share', 'atelier-velo', 'data');
  }
}

function ensureDbDirectory(dbPath: string) {
  const fs = require('fs');
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }
}
```

---

## 📊 Comparaison Solutions de Déploiement

### Vercel ✅ RECOMMANDÉ pour Web

| Critère | Vercel | Netlify | AWS | VPS |
|---------|--------|---------|-----|-----|
| **Coût** | Gratuit → 20€/mois | Gratuit → 19€/mois | ~5€/mois | ~5€/mois |
| **Setup** | ⭐⭐⭐⭐⭐ Facile | ⭐⭐⭐⭐⭐ Facile | ⭐⭐ Complexe | ⭐ Très complexe |
| **Next.js** | ✅ Optimisé | ✅ Bon | ⚠️ Manuel | ⚠️ Manuel |
| **Auto-deploy** | ✅ Git push | ✅ Git push | ⚠️ CI/CD | ⚠️ CI/CD |
| **HTTPS** | ✅ Auto | ✅ Auto | ⚠️ Manuel | ⚠️ Manuel |
| **Scalabilité** | ✅ Auto | ✅ Auto | ⚠️ Manuel | ❌ Limitée |

**Verdict** : Vercel pour simplicité et optimisation Next.js

---

## 🎯 Architecture Finale Recommandée

### 3 Déploiements Différents

```
┌─────────────────────────────────────────────────────┐
│                  DÉVELOPPEMENT                      │
│  Vous → Next.js Dev → Supabase (PostgreSQL)        │
│  Variables: .env.local                              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              PRODUCTION WEB (Vercel)                │
│  Internet → Vercel → Supabase (PostgreSQL)         │
│  Variables: Vercel Dashboard                        │
│  URL: https://atelier-velo.vercel.app              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│           APPLICATIONS STANDALONE                    │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ Desktop (Win)   │  │ Mobile (Android)│          │
│  │ Electron        │  │ React Native    │          │
│  │ → SQLite local  │  │ → SQLite local  │          │
│  └─────────────────┘  └─────────────────┘          │
│  Distribution: .exe, .apk, .ipa                     │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de Déploiement

### Vercel (Web)

- [ ] Créer compte Vercel
- [ ] Connecter repo Git
- [ ] Configurer variables d'environnement :
  - `DATABASE_PROVIDER=postgresql`
  - `DATABASE_URL=postgresql://...@supabase.com/...`
- [ ] Déployer : `git push` → Auto-deploy ✅

### Desktop (Electron)

- [ ] Installer Electron Builder
- [ ] Configurer `electron-builder.json`
- [ ] Build : `npm run build:desktop`
- [ ] Distribuer : `.exe`, `.dmg`, `.AppImage`

### Mobile (React Native)

- [ ] Créer app Expo
- [ ] Configurer SQLite
- [ ] Build : `eas build`
- [ ] Publier : Google Play / App Store

---

## 🎯 Résumé

### Comment l'App Choisit ?

**Automatiquement via détection** :
1. ✅ `VERCEL=1` → Supabase
2. ✅ `process.versions.electron` → SQLite
3. ✅ `NODE_ENV=development` → Supabase
4. ✅ Sinon → SQLite (défaut standalone)

### Aucune Configuration Manuelle ✅

**L'utilisateur n'a rien à faire** :
- Desktop → Installe `.exe` → SQLite automatique
- Mobile → Installe `.apk` → SQLite automatique
- Web → Visite URL → Supabase automatique

### Vous Gardez le Contrôle ✅

**Développement** : Supabase (inchangé)  
**Production Web** : Supabase (via Vercel)  
**Standalone** : SQLite (automatique)

---

**Solution recommandée** : Vercel + Détection automatique ✅  
**Configuration requise** : Aucune pour l'utilisateur ✅  
**Complexité** : Faible ✅
