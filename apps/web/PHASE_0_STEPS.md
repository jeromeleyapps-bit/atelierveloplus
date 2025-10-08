# 🔒 Phase 0 Sécurité - Étapes d'Installation

**Date:** 08/10/2025  
**Status:** 🟡 En cours

---

## ✅ Étapes Complétées

### 1. Fichiers créés
- ✅ `src/lib/jwt.ts` - Utilitaires JWT
- ✅ `src/lib/error-handler.ts` - Gestion d'erreurs sécurisée
- ✅ `generate-jwt-secret.ps1` - Générateur de secret
- ✅ `PHASE_0_SECURITE.md` - Documentation complète

### 2. Secret JWT généré
```
JWT_SECRET=4GJ9wLvsRIi7qyaKDEAme8Mlb1OSpzxH3QrBTZPtnNVWcYghX62CjoUk0Ffdu5
```

---

## 🔴 Étapes Manuelles Requises

### Étape 1: Installer jsonwebtoken (MANUEL)

**Option A: Via package.json**
1. Ouvrir `apps/web/package.json`
2. Ajouter dans `dependencies`:
```json
"jsonwebtoken": "^9.0.2"
```
3. Exécuter: `npm install` depuis `apps/web/`

**Option B: Commande directe (si npm fonctionne)**
```bash
cd apps/web
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

### Étape 2: Ajouter JWT_SECRET dans .env.local

1. Ouvrir `apps/web/.env.local`
2. Ajouter à la fin:
```env
# JWT Authentication
JWT_SECRET=4GJ9wLvsRIi7qyaKDEAme8Mlb1OSpzxH3QrBTZPtnNVWcYghX62CjoUk0Ffdu5
```
3. Sauvegarder

⚠️ **IMPORTANT:** Vérifier que `.env.local` est bien dans `.gitignore` !

### Étape 3: Modifier login route pour retourner JWT

**Fichier:** `apps/web/src/app/api/auth/login/route.ts`

**Ajouter en haut (après les autres imports):**
```typescript
import { generateToken } from "@/lib/jwt";
```

**Modifier le return du try/catch (ligne ~50):**
```typescript
// AVANT
return NextResponse.json({ 
  id: user.id, 
  email: user.email ?? email, 
  firstName: null, 
  lastName: null, 
  shopName: null 
});

// APRÈS
const token = generateToken({
  userId: user.id,
  email: user.email ?? email,
  role: user.role || 'user',
});

return NextResponse.json({
  token,
  user: {
    id: user.id,
    email: user.email ?? email,
    role: user.role,
  },
});
```

### Étape 4: Modifier middleware pour vérifier JWT

**Fichier:** `apps/web/src/middleware.ts`

**Ajouter en haut:**
```typescript
import { getUserFromToken } from '@/lib/jwt';
```

**Remplacer (ligne ~91-98):**
```typescript
// AVANT
const userId = request.headers.get('x-user-id');

if (!userId) {
  return NextResponse.json(
    { error: 'unauthorized', message: 'Authentication required' },
    { status: 401 }
  );
}

// APRÈS
const user = getUserFromToken(request);

if (!user) {
  return NextResponse.json(
    { error: 'unauthorized', message: 'Valid JWT token required' },
    { status: 401 }
  );
}
```

**Modifier vérification admin (ligne ~101-117):**
```typescript
// AVANT
const isAdminApi = pathname.startsWith('/api/admin');
if (isAdminApi) {
  try {
    const prisma = await getPrisma();
    if (prisma) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, active: true }
      });

      if (!user || !user.active || user.role !== 'admin') {
        return NextResponse.json(
          { error: 'forbidden', message: 'Admin role required' },
          { status: 403 }
        );
      }
    }
  } catch (error) {
    console.error('Error checking admin role:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to verify permissions' },
      { status: 500 }
    );
  }
}

// APRÈS
const isAdminApi = pathname.startsWith('/api/admin');
if (isAdminApi && user.role !== 'admin') {
  return NextResponse.json(
    { error: 'forbidden', message: 'Admin role required' },
    { status: 403 }
  );
}

// Passer userId dans header pour les routes API
const response = NextResponse.next();
response.headers.set('x-user-id', user.userId);
response.headers.set('x-user-role', user.role);
```

### Étape 5: Corriger stack traces

**Fichier:** `apps/web/src/app/api/workshop/workorders/merge/route.ts`

**Ajouter en haut:**
```typescript
import { handleApiError } from "@/lib/error-handler";
```

**Remplacer le catch (ligne ~90-94):**
```typescript
// AVANT
} catch (e: any) {
  console.error("[MERGE] Error merging work orders:", e);
  console.error("[MERGE] Error stack:", e.stack);
  return NextResponse.json({ error: e.message || "merge_error", detail: e.stack }, { status: 500 });
}

// APRÈS
} catch (e: any) {
  return handleApiError(e, 'MERGE');
}
```

**Fichier:** `apps/web/src/app/api/workshop/workorders/[id]/estimate/route.ts`

**Ajouter en haut:**
```typescript
import { handleApiError } from "@/lib/error-handler";
```

**Remplacer le catch (ligne ~23-26):**
```typescript
// AVANT
} catch (e: any) {
  console.error("Error updating estimate:", e);
  return NextResponse.json({ error: e.message || "update_error" }, { status: 500 });
}

// APRÈS
} catch (e: any) {
  return handleApiError(e, 'ESTIMATE_UPDATE');
}
```

### Étape 6: Améliorer headers sécurité

**Fichier:** `apps/web/next.config.mjs`

**Remplacer la fonction headers() (ligne ~43-54):**
```javascript
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
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://api.pwnedpasswords.com",
            "frame-ancestors 'none'",
          ].join('; '),
        },
        // HSTS - Force HTTPS
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains',
        },
        // X-Frame-Options - Prevention clickjacking
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        // X-Content-Type-Options - Prevention MIME sniffing
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        // Referrer-Policy
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        // Permissions-Policy - Restreindre camera
        {
          key: 'Permissions-Policy',
          value: 'camera=(self "https://rdv.upgradedbikes.com"), microphone=(), geolocation=()',
        },
      ],
    },
  ];
},
```

---

## 🧪 Tests à Effectuer

### Test 1: Login avec JWT
```bash
cd apps/web
npm run dev

# Dans un autre terminal:
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"votre@email.com","password":"votremotdepasse"}'

# Résultat attendu:
# {"token":"eyJhbGciOiJIUzI1NiIs...","user":{...}}
```

### Test 2: Appel API avec JWT
```bash
# Récupérer le token du test 1
curl http://localhost:3000/api/workorders \
  -H "Authorization: Bearer VOTRE_TOKEN"

# Résultat attendu: 200 OK
```

### Test 3: Appel API sans JWT
```bash
curl http://localhost:3000/api/workorders

# Résultat attendu: 401 Unauthorized
```

### Test 4: Stack traces masquées
```bash
# Forcer une erreur
curl -X POST http://localhost:3000/api/workshop/workorders/merge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{"workOrderIds":[]}'

# Vérifier qu'il n'y a PAS de "stack" ou "detail" dans la réponse
```

---

## 📝 Checklist

### Installation
- [ ] jsonwebtoken installé
- [ ] JWT_SECRET ajouté dans .env.local
- [ ] .env.local dans .gitignore

### Modifications Code
- [ ] login/route.ts: Import generateToken
- [ ] login/route.ts: Retourner JWT token
- [ ] middleware.ts: Import getUserFromToken
- [ ] middleware.ts: Vérifier JWT au lieu de x-user-id
- [ ] middleware.ts: Simplifier vérification admin
- [ ] merge/route.ts: Import + utiliser handleApiError
- [ ] estimate/route.ts: Import + utiliser handleApiError
- [ ] next.config.mjs: Headers sécurité

### Tests
- [ ] Test login retourne token
- [ ] Test API avec token valide
- [ ] Test API sans token (401)
- [ ] Test stack traces masquées

### Finalisation
- [ ] Redémarrer serveur dev
- [ ] Tester en local
- [ ] Commit Git
- [ ] Push GitHub

---

## ⏭️ Prochaines Étapes

Une fois Phase 0 terminée:
1. Phase 1: Validation SQLite
2. Phase 2: Wrapper Electron
3. Phase 3: Build & Distribution

---

**Besoin d'aide pour une étape ?** Demande-moi !
