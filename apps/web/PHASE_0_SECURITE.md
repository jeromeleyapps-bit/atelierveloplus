# 🔒 Phase 0: Sécurité First

**Date:** 08/10/2025  
**Priorité:** CRITIQUE avant toute autre développement

---

## 🎯 Objectifs

Corriger les 4 failles critiques identifiées dans l'audit:

1. ✅ Remplacer `x-user-id` par JWT sécurisé
2. ✅ Supprimer stack traces en production
3. ✅ Ajouter validation Zod sur endpoints critiques
4. ✅ Améliorer headers de sécurité

**Temps estimé:** 1-2 jours

---

## 📋 Checklist Sécurité

### Niveau 1: CRITIQUE (aujourd'hui)
- [ ] Implémenter JWT pour authentification
- [ ] Supprimer toutes les stack traces
- [ ] Ajouter rate limiting sur endpoints manquants
- [ ] Headers sécurité (CSP, HSTS, etc.)

### Niveau 2: IMPORTANT (cette semaine)
- [ ] Validation Zod sur tous les endpoints
- [ ] Politique PII pour métriques
- [ ] CSRF protection sur formulaires publics

### Niveau 3: AMÉLIORATION (semaine prochaine)
- [ ] Logs structurés JSON
- [ ] Monitoring sécurité
- [ ] Tests de sécurité automatisés

---

## 🔧 Implémentation

### 1. JWT Authentication (2-3h)

#### 1.1 Installer dépendances

```bash
cd apps/web
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

#### 1.2 Créer utilitaire JWT

**Fichier:** `src/lib/jwt.ts`

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d'; // 7 jours

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Générer un token JWT
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'atelier-velo',
  });
}

/**
 * Vérifier et décoder un token JWT
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'atelier-velo',
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('[JWT] Token verification failed:', error);
    return null;
  }
}

/**
 * Extraire le token depuis les headers
 */
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove "Bearer "
}

/**
 * Récupérer l'utilisateur depuis le token
 */
export function getUserFromToken(req: Request): JWTPayload | null {
  const token = extractToken(req);
  if (!token) return null;
  return verifyToken(token);
}
```

#### 1.3 Générer JWT_SECRET sécurisé

**Script:** `generate-jwt-secret.ps1`

```powershell
# Générer un secret sécurisé
$secret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host "Ajouter dans .env.local :" -ForegroundColor Green
Write-Host "JWT_SECRET=$secret" -ForegroundColor Yellow
```

**Exécution:**
```bash
pwsh ./generate-jwt-secret.ps1
# Copier la valeur générée dans .env.local
```

#### 1.4 Modifier login pour retourner JWT

**Fichier:** `src/app/api/auth/login/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { compare } from "bcryptjs";
import { rateLimit } from "@/lib/security";
import { generateToken } from "@/lib/jwt"; // ← NOUVEAU

// ... code existant ...

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimit("auth:login", ip, 10, 60);
  if (!rl.allowed) {
    await jitter(250);
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });

  const body = await req.json().catch(() => ({} as any));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password || !validEmail(email)) {
    await jitter(250);
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password || user.active === false) {
      await jitter(250);
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }
    
    const ok = await compare(password, user.password);
    if (!ok) {
      await jitter(250);
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    // ← NOUVEAU: Générer JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'user',
    });

    return NextResponse.json({
      token, // ← NOUVEAU
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e: any) {
    await jitter(250);
    return NextResponse.json({ error: "login_failed" }, { status: 500 });
  }
}
```

#### 1.5 Modifier middleware pour vérifier JWT

**Fichier:** `src/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPrisma } from '@/lib/db';
import { getUserFromToken } from '@/lib/jwt'; // ← NOUVEAU

// ... routes publiques existantes ...

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Ignorer tout ce qui n'est pas /api/
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // 1. Vérifier si c'est une API publique
  const isPublicApi = publicApiRoutes.some(route => pathname.startsWith(route));
  if (isPublicApi) {
    return NextResponse.next();
  }
  
  // 2. Vérifier les patterns publics
  const matchesPublicPattern = publicPatterns.some(pattern => pattern.test(pathname));
  if (matchesPublicPattern) {
    return NextResponse.next();
  }
  
  // 3. Vérifier si c'est une API protégée
  const isProtectedApi = protectedApiRoutes.some(route => pathname.startsWith(route));
  
  if (!isProtectedApi) {
    return NextResponse.next();
  }

  // ← NOUVEAU: Vérifier JWT au lieu de x-user-id
  const user = getUserFromToken(request);

  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Valid JWT token required' },
      { status: 401 }
    );
  }

  // Pour les routes admin API, vérifier le rôle
  const isAdminApi = pathname.startsWith('/api/admin');
  if (isAdminApi && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'forbidden', message: 'Admin role required' },
      { status: 403 }
    );
  }

  // ← NOUVEAU: Passer userId dans header pour les routes API
  const response = NextResponse.next();
  response.headers.set('x-user-id', user.userId);
  response.headers.set('x-user-role', user.role);
  
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
```

---

### 2. Supprimer Stack Traces (1h)

#### 2.1 Créer utilitaire d'erreur

**Fichier:** `src/lib/error-handler.ts`

```typescript
import { NextResponse } from 'next/server';

/**
 * Gérer les erreurs API de manière sécurisée
 */
export function handleApiError(error: any, context?: string): NextResponse {
  // Logger l'erreur complète côté serveur
  console.error(`[API Error${context ? ` - ${context}` : ''}]:`, {
    message: error.message,
    stack: error.stack,
    code: error.code,
  });

  // En production: ne jamais exposer la stack ou les détails
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: 500 }
    );
  }

  // En développement: retourner le message (mais pas la stack)
  return NextResponse.json(
    { 
      error: 'internal_server_error',
      message: error.message,
      code: error.code,
    },
    { status: 500 }
  );
}
```

#### 2.2 Corriger route merge

**Fichier:** `src/app/api/workshop/workorders/merge/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler"; // ← NOUVEAU

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });

  try {
    console.log('[MERGE] Starting merge operation...');
    const body = await req.json();
    const { workOrderIds } = body;
    
    // ... code existant ...

    return NextResponse.json(merged, { status: 200 });
  } catch (e: any) {
    // ← MODIFIÉ: Utiliser handleApiError
    return handleApiError(e, 'MERGE');
  }
}
```

#### 2.3 Liste des fichiers à corriger

**Fichiers avec stack traces à corriger:**

```
✓ src/app/api/workshop/workorders/merge/route.ts
✓ src/app/api/workshop/workorders/[id]/estimate/route.ts
□ src/app/api/workshop/workorders/route.ts
□ src/app/api/workshop/workorders/[id]/route.ts
□ src/app/api/finance/invoices/[id]/route.ts
□ src/app/api/catalog/items/route.ts
□ (voir liste complète dans grep_search results)
```

**Pattern de correction:**

```typescript
// AVANT
catch (e: any) {
  console.error("Error:", e);
  return NextResponse.json({ error: e.message, detail: e.stack }, { status: 500 });
}

// APRÈS
catch (e: any) {
  return handleApiError(e, 'CONTEXT_NAME');
}
```

---

### 3. Headers de Sécurité (30 min)

**Fichier:** `next.config.mjs`

```javascript
const nextConfig = {
  // ... config existante ...
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // CSP - Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js nécessite unsafe-eval
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.pwnedpasswords.com", // HIBP
              "frame-ancestors 'none'",
            ].join('; '),
          },
          // HSTS - Force HTTPS
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // X-Frame-Options - Prévention clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // X-Content-Type-Options - Prévention MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Referrer-Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions-Policy - Restreindre camera aux pages scanner
          {
            key: 'Permissions-Policy',
            value: 'camera=(self "https://rdv.upgradedbikes.com"), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

### 4. Rate Limiting Endpoints Manquants (30 min)

**Fichiers à modifier:**

#### 4.1 Metrics endpoint

**Fichier:** `src/app/api/metrics/route.ts`

```typescript
import { rateLimit } from "@/lib/security"; // ← AJOUTER

export async function POST(request: Request) {
  // ← NOUVEAU: Rate limit
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const rl = await rateLimit("metrics", ip, 100, 60); // 100 requêtes/minute
  if (!rl.allowed) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  try {
    const data = await request.json();
    // ... reste du code
  }
}
```

#### 4.2 WorkOrders endpoints

**Fichier:** `src/app/api/workshop/workorders/route.ts`

```typescript
import { rateLimit } from "@/lib/security"; // ← AJOUTER

export async function POST(req: Request) {
  // ← NOUVEAU: Rate limit
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const rl = await rateLimit("workorder:create", ip, 20, 60); // 20 créations/minute
  if (!rl.allowed) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  // ... reste du code
}
```

---

## ✅ Tests de Sécurité

### Test 1: JWT Authentication

```bash
# 1. Login et récupérer token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq '.token'

# 2. Tester avec token valide
curl http://localhost:3000/api/workorders \
  -H "Authorization: Bearer <TOKEN>"
# Résultat attendu: 200 OK

# 3. Tester sans token
curl http://localhost:3000/api/workorders
# Résultat attendu: 401 Unauthorized

# 4. Tester avec token invalide
curl http://localhost:3000/api/workorders \
  -H "Authorization: Bearer invalid"
# Résultat attendu: 401 Unauthorized
```

### Test 2: Stack Traces

```bash
# Forcer une erreur
curl -X POST http://localhost:3000/api/workshop/workorders/merge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"workOrderIds": []}'

# Résultat attendu (PRODUCTION):
# {"error":"internal_server_error"}
# PAS de "stack", PAS de "detail"
```

### Test 3: Headers Sécurité

```bash
curl -I http://localhost:3000

# Vérifier présence de:
# - Content-Security-Policy
# - Strict-Transport-Security
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff
```

### Test 4: Rate Limiting

```bash
# Bombarder l'API
for i in {1..30}; do
  curl -X POST http://localhost:3000/api/workorders \
    -H "Authorization: Bearer <TOKEN>" &
done

# Résultat attendu après 20 requêtes:
# {"error":"too_many_requests"}
```

---

## 📊 Checklist Finale Phase 0

### Avant de commencer
- [ ] Backup Git (`git commit -am "Pre-security-phase"`)
- [ ] Lire ce document en entier
- [ ] Préparer environnement de test

### Implémentation
- [ ] JWT: Installer dépendances
- [ ] JWT: Créer src/lib/jwt.ts
- [ ] JWT: Générer JWT_SECRET
- [ ] JWT: Modifier login route
- [ ] JWT: Modifier middleware
- [ ] Errors: Créer src/lib/error-handler.ts
- [ ] Errors: Corriger merge route
- [ ] Errors: Corriger estimate route
- [ ] Errors: Corriger tous les autres endpoints (voir liste)
- [ ] Headers: Modifier next.config.mjs
- [ ] Rate Limit: Ajouter sur metrics
- [ ] Rate Limit: Ajouter sur workorders

### Tests
- [ ] Test JWT valide
- [ ] Test JWT invalide
- [ ] Test sans JWT
- [ ] Test stack traces masquées
- [ ] Test headers sécurité
- [ ] Test rate limiting

### Finalisation
- [ ] Commit Git (`git commit -am "security: Phase 0 complete"`)
- [ ] Push GitHub
- [ ] Documenter changements

---

## 🚨 Points d'Attention

1. **JWT_SECRET**: JAMAIS commiter dans Git, toujours dans .env.local
2. **Tests**: Tester en dev ET prod mode
3. **Breaking change**: Frontend doit être adapté pour utiliser JWT (stocker token, envoyer dans Authorization header)
4. **Migration utilisateurs**: Existants doivent se reconnecter

---

**Temps total estimé:** 4-6 heures  
**Prêt à démarrer ?** On commence par JWT (étape la plus importante).
