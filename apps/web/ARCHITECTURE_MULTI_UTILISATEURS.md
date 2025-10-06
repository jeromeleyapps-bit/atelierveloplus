# 🏗️ Architecture Multi-Utilisateurs - Options

## 🎯 Votre Besoin

**Objectif** : Proposer l'app à plusieurs utilisateurs avec bases de données séparées

**Contraintes** :
- ✅ Chaque utilisateur a sa propre base de données
- ✅ Données isolées entre utilisateurs
- ✅ Vous gardez Supabase pour votre développement
- ✅ Support multi-plateforme (PC, Android, iOS)

---

## 🔄 3 Architectures Possibles

### Option 1 : Base de Données Locale (SQLite) 🌟 RECOMMANDÉ
**Principe** : Chaque installation a sa propre base SQLite locale

#### Avantages ✅
- ✅ **Gratuit** - Pas de coût serveur
- ✅ **Offline-first** - Fonctionne sans internet
- ✅ **Rapide** - Pas de latence réseau
- ✅ **Simple** - Pas de configuration serveur
- ✅ **Multi-plateforme** - SQLite fonctionne partout (PC, Android, iOS)
- ✅ **Données privées** - Tout reste sur l'appareil

#### Inconvénients ❌
- ❌ Pas de synchronisation entre appareils
- ❌ Pas de backup automatique cloud
- ❌ Pas d'accès multi-utilisateurs simultané

#### Architecture
```
┌─────────────────────────────────────┐
│  PC Utilisateur 1                   │
│  ┌───────────────────────────────┐  │
│  │  App Next.js (Electron)       │  │
│  │  ├─ Frontend                  │  │
│  │  ├─ Backend (API Routes)      │  │
│  │  └─ SQLite Local              │  │
│  │     └─ atelier_velo_user1.db  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Android Utilisateur 2              │
│  ┌───────────────────────────────┐  │
│  │  App React Native             │  │
│  │  ├─ Frontend                  │  │
│  │  ├─ Backend (API)             │  │
│  │  └─ SQLite Local              │  │
│  │     └─ atelier_velo_user2.db  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

#### Implémentation
```typescript
// Détecter l'environnement
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Configuration base de données
const DATABASE_URL = isDevelopment
  ? process.env.DATABASE_URL // Supabase pour dev
  : `file:${getLocalDbPath()}/atelier_velo.db`; // SQLite pour prod

// Fonction pour obtenir le chemin local
function getLocalDbPath() {
  if (typeof window === 'undefined') {
    // Serveur (Electron, Node)
    const os = require('os');
    const path = require('path');
    return path.join(os.homedir(), '.atelier-velo', 'data');
  }
  // Client (React Native)
  return '/data/local/atelier-velo';
}
```

---

### Option 2 : PostgreSQL Local (Docker) 💻 Pour PC Uniquement
**Principe** : Chaque PC installe PostgreSQL via Docker

#### Avantages ✅
- ✅ Même base que Supabase (PostgreSQL)
- ✅ Pas de migration de schéma
- ✅ Fonctionnalités avancées PostgreSQL
- ✅ Offline

#### Inconvénients ❌
- ❌ **Ne fonctionne PAS sur mobile** (Android/iOS)
- ❌ Nécessite Docker
- ❌ Plus complexe à installer
- ❌ Plus lourd (ressources)

#### Architecture
```
┌─────────────────────────────────────┐
│  PC Utilisateur                     │
│  ┌───────────────────────────────┐  │
│  │  App Next.js                  │  │
│  │  └─ DATABASE_URL=             │  │
│  │     postgresql://localhost    │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  Docker Container             │  │
│  │  └─ PostgreSQL 18             │  │
│  │     └─ Volume local           │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

### Option 3 : Multi-Tenancy Cloud (Supabase) ☁️ Pour Partage
**Principe** : Tous les utilisateurs sur Supabase, données séparées par tenant

#### Avantages ✅
- ✅ Synchronisation multi-appareils
- ✅ Backup automatique
- ✅ Accès depuis n'importe où
- ✅ Pas d'installation locale

#### Inconvénients ❌
- ❌ **Coût** - Payer pour chaque utilisateur
- ❌ Nécessite internet
- ❌ Données sur serveur tiers

#### Architecture
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ PC User 1   │  │ Mobile U2   │  │ PC User 3   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                   ┌────▼────┐
                   │ Supabase│
                   └────┬────┘
                        │
       ┌────────────────┼────────────────┐
       │                │                │
  ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
  │ Tenant 1│     │ Tenant 2│     │ Tenant 3│
  │ (User1) │     │ (User2) │     │ (User3) │
  └─────────┘     └─────────┘     └─────────┘
```

---

## 🌟 Recommandation : Option 1 (SQLite Local)

### Pourquoi ?

1. **Multi-plateforme** ✅
   - PC (Electron)
   - Android (React Native)
   - iOS (React Native)

2. **Gratuit** ✅
   - Pas de coût serveur
   - Pas de limite utilisateurs

3. **Simple** ✅
   - Pas de configuration réseau
   - Pas de Docker
   - Installation facile

4. **Privé** ✅
   - Données restent sur l'appareil
   - Pas de cloud = pas de risque fuite

---

## 🛠️ Implémentation Recommandée

### Architecture Hybride : Dev Cloud + Prod Local

```typescript
// .env.development (Vous)
DATABASE_URL="postgresql://...@supabase.com/postgres"

// .env.production (Utilisateurs finaux)
DATABASE_URL="file:./data/atelier_velo.db"
```

### Schéma Prisma Adaptatif

```prisma
// prisma/schema.prisma
datasource db {
  provider = env("DATABASE_PROVIDER") // "postgresql" ou "sqlite"
  url      = env("DATABASE_URL")
}
```

### Configuration Environnement

```typescript
// lib/db.ts
export async function getPrisma() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Production : SQLite local
    const dbPath = getLocalDbPath();
    ensureDbExists(dbPath);
    
    return new PrismaClient({
      datasources: {
        db: {
          url: `file:${dbPath}/atelier_velo.db`
        }
      }
    });
  } else {
    // Development : Supabase
    return new PrismaClient();
  }
}
```

---

## 📦 Distribution par Plateforme

### PC (Windows/Mac/Linux)
**Solution** : Electron + SQLite

```bash
# Package l'app avec Electron
npm install electron electron-builder

# Build
npm run build:electron

# Résultat : 
# - Windows: atelier-velo-setup.exe
# - Mac: atelier-velo.dmg
# - Linux: atelier-velo.AppImage
```

**Base de données** :
- Windows : `C:\Users\[User]\AppData\Local\atelier-velo\data\atelier_velo.db`
- Mac : `~/Library/Application Support/atelier-velo/data/atelier_velo.db`
- Linux : `~/.local/share/atelier-velo/data/atelier_velo.db`

---

### Android
**Solution** : React Native + SQLite

```bash
# Utiliser expo-sqlite
npm install expo-sqlite

# Build APK
eas build --platform android
```

**Base de données** :
- `/data/data/com.ateliervelo/databases/atelier_velo.db`

---

### iOS
**Solution** : React Native + SQLite

```bash
# Build IPA
eas build --platform ios
```

**Base de données** :
- `~/Library/Application Support/atelier_velo/atelier_velo.db`

---

## 🔄 Migration de PostgreSQL vers SQLite

### Différences à Gérer

| Fonctionnalité | PostgreSQL | SQLite | Solution |
|----------------|------------|--------|----------|
| **Types** | JSONB, UUID | TEXT | Convertir en TEXT |
| **Dates** | TIMESTAMP | TEXT/INTEGER | Utiliser TEXT ISO |
| **Auto-increment** | SERIAL | AUTOINCREMENT | Adapter schéma |
| **Relations** | Foreign Keys | Foreign Keys | ✅ Compatible |

### Schéma Adaptatif

```prisma
// prisma/schema.prisma
model WorkOrder {
  id         String    @id @default(cuid())
  status     String    @default("created")
  customerId String?
  bikeId     String?
  type       String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  dueAt      DateTime?

  customer Customer?     @relation(fields: [customerId], references: [id])
  bike     CustomerBike? @relation(fields: [bikeId], references: [id])
  parts    WorkOrderPart[]
  
  @@index([customerId])
  @@index([bikeId])
}
```

**Compatible PostgreSQL ET SQLite** ✅

---

## 💰 Comparaison Coûts

### Option 1 : SQLite Local
- **Coût** : 0€
- **Utilisateurs** : Illimité
- **Stockage** : Illimité (limité par disque utilisateur)

### Option 2 : PostgreSQL Local
- **Coût** : 0€
- **Utilisateurs** : Illimité
- **Stockage** : Illimité

### Option 3 : Supabase Multi-Tenant
- **Coût** : ~25€/mois pour 10 utilisateurs
- **Utilisateurs** : Limité par plan
- **Stockage** : 8GB gratuit, puis payant

---

## 🎯 Plan d'Action Recommandé

### Phase 1 : Préparer SQLite (1-2 jours)

1. **Tester schéma Prisma avec SQLite**
   ```bash
   DATABASE_URL="file:./test.db" npx prisma db push
   ```

2. **Adapter code si nécessaire**
   - Vérifier types de données
   - Tester toutes les requêtes

3. **Créer script d'initialisation**
   ```typescript
   // scripts/init-db.ts
   async function initDatabase() {
     const dbPath = getLocalDbPath();
     await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS ...`;
     await prisma.$executeRaw`INSERT INTO AppSetting ...`;
   }
   ```

---

### Phase 2 : Package Desktop (2-3 jours)

1. **Installer Electron**
   ```bash
   npm install electron electron-builder
   ```

2. **Configurer build**
   ```json
   // package.json
   {
     "build": {
       "appId": "com.ateliervelo.app",
       "files": [".next/**/*", "prisma/**/*"],
       "extraResources": ["prisma/schema.prisma"]
     }
   }
   ```

3. **Tester sur Windows/Mac/Linux**

---

### Phase 3 : Package Mobile (3-5 jours)

1. **Créer app React Native**
   ```bash
   npx create-expo-app atelier-velo-mobile
   ```

2. **Installer SQLite**
   ```bash
   npm install expo-sqlite
   ```

3. **Adapter UI pour mobile**

---

### Phase 4 : Distribution (1 jour)

1. **PC** : Publier sur site web
2. **Android** : Google Play Store
3. **iOS** : Apple App Store

---

## 📊 Résumé

### ✅ Solution Recommandée : SQLite Local

**Avantages** :
- ✅ Gratuit
- ✅ Multi-plateforme (PC + Mobile)
- ✅ Offline
- ✅ Privé
- ✅ Simple

**Vous gardez** :
- ✅ Supabase pour votre développement
- ✅ Schéma Prisma actuel (compatible)
- ✅ Code actuel (adaptations mineures)

**Utilisateurs obtiennent** :
- ✅ App installable (PC/Android/iOS)
- ✅ Base de données locale
- ✅ Données privées
- ✅ Gratuit

---

## 🚀 Prochaines Étapes

1. **Valider** : Tester schéma Prisma avec SQLite
2. **Adapter** : Modifier code pour support SQLite
3. **Package** : Créer builds Electron
4. **Tester** : Installer sur différents OS
5. **Distribuer** : Publier

---

**Architecture recommandée** : SQLite Local ✅  
**Temps estimation** : 1-2 semaines  
**Coût** : 0€  
**Compatibilité** : PC + Android + iOS ✅
