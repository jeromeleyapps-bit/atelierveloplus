# 📊 ANALYSE COMPLÈTE - BASES DE DONNÉES ATELIER VÉLO+

**Date** : 21 novembre 2025  
**Analyse** : Configuration et emplacements des bases de données

---

## 🗄️ BASES DE DONNÉES DÉTECTÉES

### 1. Base de Données DÉVELOPPEMENT
```
Emplacement : C:\Users\j_ley\Atelier-velo+\prisma\data\atelier-velo.db
Taille      : 610 304 bytes (~596 KB)
Dernière MAJ: 21/11/2025 10:06:48
Utilisation : Mode développement (npm run dev)
```

### 2. Base de Données ELECTRON (Production)
```
Emplacement : C:\Users\j_ley\AppData\Roaming\Atelier Velo+\data\atelier.db
Status      : ✅ Existe
Utilisation : Application Electron packagée
```

---

## ⚙️ CONFIGURATION PAR ENVIRONNEMENT

### 🔵 MODE DÉVELOPPEMENT (npm run dev)

**Fichier de configuration** : `.env.local`
```env
DATABASE_URL="file:./prisma/data/atelier-velo.db"
```

**Chemin résolu** :
```
C:\Users\j_ley\Atelier-velo+\prisma\data\atelier-velo.db
```

**Code source** : `src/lib/prisma.ts` (lignes 33-48)
- Convertit automatiquement les chemins relatifs en absolus
- Utilise `process.cwd()` pour résoudre le chemin
- Log : `[Prisma] ✅ Converted relative → absolute`

**Comportement** :
- ✅ Prisma se connecte à la DB locale du projet
- ✅ Données persistantes entre les redémarrages
- ✅ Modifications visibles immédiatement
- ✅ Indépendant de la DB Electron

---

### 🟢 MODE ELECTRON (Build Production)

**Configuration** : `electron/main.js` et `electron/server/standalone.js`

**Initialisation des chemins** (lignes 980-1000) :
```javascript
const appDataPath = app.getPath('appData');
// → C:\Users\j_ley\AppData\Roaming

const userDataPath = path.join(appDataPath, 'Atelier Velo+');
// → C:\Users\j_ley\AppData\Roaming\Atelier Velo+

app.setPath('userData', userDataPath);
dataPath = app.getPath('userData');

const dataDir = path.join(dataPath, 'data');
// → C:\Users\j_ley\AppData\Roaming\Atelier Velo+\data

dbPath = path.join(dataDir, 'atelier.db');
// → C:\Users\j_ley\AppData\Roaming\Atelier Velo+\data\atelier.db
```

**Variable d'environnement passée au serveur Next.js** (ligne 156) :
```javascript
DATABASE_URL: `file:${dbPath}`
// → file:C:\Users\j_ley\AppData\Roaming\Atelier Velo+\data\atelier.db
```

**Comportement** :
- ✅ DB créée automatiquement au premier lancement
- ✅ Données utilisateur isolées dans AppData
- ✅ Persistance entre les mises à jour de l'app
- ✅ Indépendant de la DB de développement
- ✅ Migrations Prisma appliquées automatiquement

---

## 🔄 FLUX DE CONNEXION

### Développement (npm run dev)
```
1. Next.js démarre
2. Charge .env.local
3. DATABASE_URL = "file:./prisma/data/atelier-velo.db"
4. src/lib/prisma.ts résout le chemin
5. Chemin absolu : C:\Users\j_ley\Atelier-velo+\prisma\data\atelier-velo.db
6. Prisma se connecte
7. ✅ Application utilise la DB locale du projet
```

### Electron Build
```
1. Electron démarre (electron/main.js)
2. Initialise dataPath = AppData\Roaming\Atelier Velo+
3. Crée dbPath = dataPath\data\atelier.db
4. Lance serveur Next.js standalone
5. Passe DATABASE_URL = file:C:\Users\...\atelier.db
6. Serveur Next.js démarre avec cette DB
7. src/lib/prisma.ts reçoit le chemin absolu
8. ✅ Application utilise la DB dans AppData
```

---

## ✅ CONCORDANCE CODE / CONFIGURATION

### 1. Schema Prisma (prisma/schema.prisma)
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```
✅ **Concordant** : Utilise la variable d'environnement

### 2. Prisma Client (src/lib/prisma.ts)
```typescript
function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  
  // Convertit chemins relatifs → absolus
  if (url.startsWith('file:./') || url.startsWith('file:../')) {
    const absolutePath = pathModule.resolve(process.cwd(), relativePath);
    return `file:${absolutePath}`;
  }
  
  return url;
}
```
✅ **Concordant** : Gère les chemins relatifs ET absolus

### 3. Electron Main (electron/main.js)
```javascript
dbPath = path.join(dataDir, 'atelier.db');
// ...
DATABASE_URL: `file:${dbPath}` // Chemin absolu
```
✅ **Concordant** : Passe toujours un chemin absolu

### 4. Standalone Server (electron/server/standalone.js)
```javascript
DATABASE_URL: `file:${dbPath}`, // Ligne 156
```
✅ **Concordant** : Même logique que main.js

---

## 🎯 RÉSUMÉ SIMPLIFIÉ

| Environnement | Base de Données Utilisée | Chemin |
|---------------|-------------------------|---------|
| **Dev (npm run dev)** | `atelier-velo.db` | `C:\Users\j_ley\Atelier-velo+\prisma\data\` |
| **Electron Build** | `atelier.db` | `C:\Users\j_ley\AppData\Roaming\Atelier Velo+\data\` |

### Points Clés :
1. ✅ **Deux bases de données distinctes** - Développement et Production
2. ✅ **Isolation complète** - Les modifications en dev n'affectent pas Electron
3. ✅ **Configuration automatique** - Electron gère tout automatiquement
4. ✅ **Chemins absolus** - Pas de problème de résolution de chemin
5. ✅ **Code concordant** - Toute la chaîne est cohérente

---

## 🔍 VÉRIFICATION RAPIDE

### Commandes PowerShell pour vérifier :

```powershell
# DB Développement
Get-Item "C:\Users\j_ley\Atelier-velo+\prisma\data\atelier-velo.db"

# DB Electron
Get-Item "$env:APPDATA\Atelier Velo+\data\atelier.db"

# Variable d'environnement dev
cat .env.local | Select-String "DATABASE_URL"
```

---

## ⚠️ POINTS D'ATTENTION

### 1. Données Séparées
- Les données créées en dev ne sont PAS dans l'app Electron
- Les données de l'app Electron ne sont PAS visibles en dev
- Pour synchroniser : copier manuellement la DB ou utiliser export/import

### 2. Migrations Prisma
```bash
# Appliquer migrations en dev
npx prisma migrate dev

# Pour Electron : migrations appliquées automatiquement au démarrage
# Voir : electron/init-database.js
```

### 3. Reset Base de Données

**Dev** :
```bash
rm prisma/data/atelier-velo.db
npx prisma migrate dev
```

**Electron** :
```powershell
Remove-Item "$env:APPDATA\Atelier Velo+\data\atelier.db"
# Relancer l'app → DB recréée automatiquement
```

---

## 📝 LOGS DE DIAGNOSTIC

### Développement
Chercher dans la console :
```
[Prisma] ✅ Converted relative → absolute
[Prisma] Using DATABASE_URL: file:C:\Users\j_ley\...
```

### Electron
Chercher dans les logs :
```
C:\Users\j_ley\AppData\Roaming\Atelier Velo+\logs\main.log
```
Rechercher :
```
[INIT] DB Path: C:\Users\j_ley\AppData\Roaming\Atelier Velo+\data\atelier.db
[PRISMA] Variables environnement configurées
[DB] Database initialized successfully
```

---

## ✅ CONCLUSION

**La configuration est CORRECTE et COHÉRENTE** :

1. ✅ Développement utilise `prisma/data/atelier-velo.db`
2. ✅ Electron utilise `AppData\Roaming\Atelier Velo+\data\atelier.db`
3. ✅ Le code gère correctement les deux cas
4. ✅ Pas de conflit entre les deux environnements
5. ✅ Chemins résolus en absolus dans tous les cas

**Aucune modification nécessaire !** 🎉

---

**Créé le** : 21 novembre 2025  
**Auteur** : Assistant AI  
**Version** : 1.0.0

