# Atelier Vélo+ - Résolution des problèmes de build Electron

## Date: 10 octobre 2025

---

## Résumé du problème initial
Construction d'une application Electron desktop à partir d'une application Next.js 14, avec persistance SQLite locale et déploiement portable Windows.

---

## Problèmes rencontrés et solutions appliquées

### 1. **Incompatibilité Node.js 22 avec Next.js 14**

**Erreur:**
```
Error: Cannot find module './impl'
Build error occurred
```

**Cause:** Next.js 14.2.33 n'est pas compatible avec Node.js 22.

**Solution:**
- Désinstallation de Node 22
- Installation de Node 20.18.0 LTS via `winget install OpenJS.NodeJS.LTS --version 20.18.0`
- Ajout de contrainte dans `apps/web/package.json`:
```json
"engines": {
  "node": ">=20 <21"
},
"engineStrict": true
```

---

### 2. **Structure standalone Next.js en monorepo**

**Erreur:** Fichiers introuvables dans le package Electron (page blanche au lancement)

**Cause:** Next.js génère un standalone avec structure monorepo:
```
.next/standalone/
  ├── apps/web/
  │   ├── server.js
  │   ├── .next/
  │   ├── node_modules/
  │   ├── .env
  │   └── package.json
  └── node_modules/ (partagé)
```

**Solution:** Mise à jour de `apps/desktop/package.json` pour mapper correctement:
```json
"extraResources": [
  {
    "from": "../web/.next/standalone/apps/web/.next",
    "to": "web/.next"
  },
  {
    "from": "../web/.next/standalone/node_modules",
    "to": "web/node_modules"
  },
  {
    "from": "../web/.next/standalone/apps/web/node_modules",
    "to": "web/node_modules"
  },
  {
    "from": "../web/.next/standalone/apps/web/server.js",
    "to": "web/server.js"
  },
  {
    "from": "../web/.next/standalone/apps/web/package.json",
    "to": "web/package.json"
  },
  {
    "from": "../web/.next/standalone/apps/web/.env",
    "to": "web/.env"
  },
  {
    "from": "../web/.next/static",
    "to": "web/.next/static"
  },
  {
    "from": "../web/public",
    "to": "web/public"
  },
  {
    "from": "../web/prisma",
    "to": "web/prisma"
  }
]
```

---

### 3. **Erreur EPERM lors du build standalone (symlinks)**

**Erreur:**
```
Error: EPERM: operation not permitted, symlink
```

**Cause:** Windows nécessite des droits administrateur pour créer des symlinks.

**Solution:**
- Lancer PowerShell en mode administrateur
- Exécuter `pnpm build` avec droits admin
- S'assurer d'utiliser Node 20 dans le PowerShell admin:
```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
node -v  # Vérifier v20.18.0
pnpm build
```

---

### 4. **Boucle infinie de processus Electron**

**Erreur:** Des centaines de processus "Atelier Vélo+" créés, application ne démarre pas.

**Cause:** Utilisation de `process.execPath` dans `spawn()` qui pointait vers l'exécutable Electron lui-même au lieu de Node.js.

**Code problématique:**
```javascript
serverProcess = spawn(process.execPath, [serverPath], { ... });
```

**Solution:** Utiliser le chemin complet vers Node.js:
```javascript
const nodePath = process.platform === 'win32' 
  ? 'C:\\Program Files\\nodejs\\node.exe'
  : 'node';

serverProcess = spawn(nodePath, [serverPath], { ... });
```

---

### 5. **Erreurs 401 Unauthorized (NextAuth)**

**Erreur:**
```
GET /api/account/settings 401 (Unauthorized)
```

**Cause:** Variables d'environnement NextAuth non chargées par le serveur Next.js lancé depuis Electron.

**Solution:** Chargement automatique du `.env` dans `main.js`:
```javascript
// Charger le .env du serveur pour récupérer les secrets
const envPath = path.join(webPath, '.env');
let envVars = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      envVars[key] = value;
    }
  });
}

serverProcess = spawn(nodePath, [serverPath], {
  cwd: webPath,
  env: {
    ...process.env,
    ...envVars, // Charger toutes les variables du .env
    // ... autres variables
  }
});
```

---

### 6. **Fichier .env corrompu (caractères �)**

**Erreur:** Variables d'environnement mal parsées.

**Cause:** Encodage incorrect du fichier `.env` avec caractères UTF-8 mal interprétés.

**Solution:** Réécriture du `.env` avec encodage UTF-8 propre:
```powershell
$content | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline
```

Variables critiques ajoutées:
```env
NEXTAUTH_SECRET=5uBnRxqaiAoH9fplKj84dPvDyEJGV6Uz
AUTH_SECRET=gRDyf4aB35n17xH0PJCUG8KzTdtjIL6N
NEXTAUTH_URL=http://127.0.0.1:3000
AUTH_URL=http://127.0.0.1:3000
AUTH_TRUST_HOST=true
```

---

### 7. **ERR_CONNECTION_REFUSED (serveur Node.js ne démarre pas)**

**Erreur:**
```
POST http://127.0.0.1:3000/api/auth/register net::ERR_CONNECTION_REFUSED
```

**Cause:** `spawn('node', ...)` ne trouve pas Node.js dans le PATH quand Electron est lancé.

**Solution:** Utiliser le chemin absolu vers Node.js (voir solution #4).

---

### 8. **Chemins Windows trop longs (pnpm)**

**Erreur:**
```
Remove-Item : Impossible de trouver le chemin d'accès
```

**Cause:** Limite Windows de 260 caractères dépassée avec les chemins pnpm imbriqués.

**Solution:** 
- Ignorer les erreurs de suppression (non bloquant)
- Le build Next.js écrase les fichiers existants de toute façon
- Alternative: activer les chemins longs dans Windows (GPO ou registre)

---

### 9. **Module Prisma introuvable après réinstallation**

**Erreur:**
```
Error: Could not resolve @prisma/client despite the installation
```

**Solution:**
```powershell
pnpm add @prisma/client
pnpm dlx prisma generate
```

---

## Configuration finale des fichiers clés

### `apps/web/next.config.js`
```javascript
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
    typedRoutes: true,
  },
  // ... autres configs
};
```

### `apps/web/package.json`
```json
{
  "engines": {
    "node": ">=20 <21"
  },
  "engineStrict": true
}
```

### `apps/web/.env`
```env
DATABASE_PROVIDER=sqlite
SQLITE_DB_PATH=./data/atelier.db
DATABASE_URL=file:./data/atelier.db

NEXTAUTH_SECRET=5uBnRxqaiAoH9fplKj84dPvDyEJGV6Uz
AUTH_SECRET=gRDyf4aB35n17xH0PJCUG8KzTdtjIL6N
NEXTAUTH_URL=http://127.0.0.1:3000
AUTH_URL=http://127.0.0.1:3000
AUTH_TRUST_HOST=true

RESET_DB_ON_REGISTER=false
DISABLE_AUTH=false
NEXT_PUBLIC_DISABLE_AUTH=false
```

### `apps/desktop/main.js` (extraits clés)
```javascript
const nodePath = process.platform === 'win32' 
  ? 'C:\\Program Files\\nodejs\\node.exe'
  : 'node';

// Charger le .env
const envPath = path.join(webPath, '.env');
let envVars = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      envVars[key] = value;
    }
  });
}

serverProcess = spawn(nodePath, [serverPath], {
  cwd: webPath,
  env: {
    ...process.env,
    ...envVars,
    HOSTNAME: '127.0.0.1',
    PORT: '3000',
    DATABASE_PROVIDER: 'sqlite',
    SQLITE_DB_PATH: path.join(dataPath, 'atelier.db'),
    DATABASE_URL: `file:${path.join(dataPath, 'atelier.db')}`,
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1'
  }
});
```

---

## Procédure de build complète

### 1. Build Next.js standalone (en mode admin)
```powershell
# Ouvrir PowerShell en administrateur
cd C:\Users\j_ley\Atelier-velo+\apps\web

# S'assurer d'utiliser Node 20
$env:Path = "C:\Program Files\nodejs;" + $env:Path
node -v  # Doit afficher v20.18.0

# Build
pnpm build

# Vérifier
Test-Path ".next\standalone\apps\web\server.js"
Get-Content ".next\standalone\apps\web\.env" | Select-String "AUTH_TRUST_HOST"
```

### 2. Build Electron
```powershell
cd C:\Users\j_ley\Atelier-velo+\apps\desktop
npm run build
```

### 3. Test
```powershell
.\dist\win-unpacked\Atelier Vélo+.exe
```

---

## Points de vigilance

1. **Toujours utiliser Node 20 LTS** pour les builds Next.js
2. **Lancer le build Next.js en mode administrateur** pour les symlinks
3. **Vérifier que le `.env` est bien copié** dans le standalone
4. **S'assurer que Node.js est installé** à `C:\Program Files\nodejs\node.exe`
5. **Tunnel Cloudflare désactivé par défaut** (activer avec `START_TUNNEL=1`)

---

## Logs et diagnostics

### Vérifier que le serveur Node démarre
```powershell
Get-Process | Where-Object {$_.ProcessName -eq "node"}
netstat -ano | Select-String ":3000"
```

### Consulter les logs Next.js
```powershell
Get-Content "C:\Users\j_ley\AppData\Roaming\Atelier Vélo+\logs\next-server.log" -Tail 50
```

### Tester le serveur dans un navigateur
Ouvrir http://127.0.0.1:3000 pendant que l'app Electron tourne

---

## Ressources et références

- Next.js Standalone Output: https://nextjs.org/docs/app/api-reference/next-config-js/output
- Electron Packaging: https://www.electron.build/
- Node.js Version Management: https://nodejs.org/en/download
- NextAuth.js Configuration: https://next-auth.js.org/configuration/options
- Windows Symlinks: https://learn.microsoft.com/en-us/windows/security/threat-protection/security-policy-settings/create-symbolic-links

---

## Auteur
Debugging session avec Cascade AI - 10 octobre 2025
