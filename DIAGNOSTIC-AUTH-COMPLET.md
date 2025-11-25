# DIAGNOSTIC AUTHENTIFICATION COMPLET - 23 Nov 2025 00:18

## SYMPTÔMES

1. Login réussit (token généré et stocké)
2. Navigation vers `/dashboard` fonctionne
3. **13 appels API réussissent** avec token présent
4. **14ème appel échoue** avec 401 Unauthorized
5. Déconnexion automatique → Boucle infinie

## LOGS OBSERVÉS

### Navigateur (Console)
```
[Login] Token verified in localStorage, navigating to: /dashboard
[API] Token found in localStorage, length: 276 (x13)
GET /api/workshop/workorders?status=created 401 (Unauthorized)
[API] Token invalid or expired - logging out
```

### Serveur (Terminal)
```
[2025-11-22T23:11:49.299Z] [INFO] AUTH LOGIN: Login attempt
[2025-11-22T23:11:49.384Z] [INFO] AUTH LOGIN: Login successful
```

**CRITIQUE:** Aucun log `[Proxy]` ou `[JWT]` ou `[Middleware]` n'apparaît !

## ANALYSE TECHNIQUE

### 1. Middleware ne s'exécute PAS

**Preuve:**
- Logs `[Proxy] Request:` ajoutés ligne 67 de `middleware.ts`
- Ces logs n'apparaissent JAMAIS dans le terminal
- Conclusion: Next.js n'appelle pas le middleware

**Fichier:** `middleware.ts` (racine du projet)
**Fonction:** `export async function middleware(request: NextRequest)`
**Config:** `export const config = { matcher: ['/:path*'] }`

### 2. Token EST présent côté client

**Preuve:**
- 13 appels réussis avec `[API] Token found in localStorage, length: 276`
- Token vérifié avant navigation: `[Login] Token verified in localStorage`

### 3. API rejette le token

**Route problématique:** `/api/workshop/workorders/route.ts`

**Code ligne 33-36:**
```typescript
const userId = getUserId(req);
if (!userId) {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
```

**Fonction `getUserId` ligne 9-12:**
```typescript
function getUserId(req: Request): string | null {
  const uid = req.headers.get("x-user-id");
  return uid && uid.trim() ? uid : null;
}
```

**PROBLÈME IDENTIFIÉ:**
L'API cherche `x-user-id` dans les headers.
Ce header devrait être ajouté par le middleware.
Mais le middleware ne s'exécute PAS.
Donc `x-user-id` est absent → 401.

## HYPOTHÈSES

### Hypothèse 1: Middleware désactivé volontairement
Mémoire système mentionne "désactivé le middleware au profit de next.js pour des problèmes de conflits"

### Hypothèse 2: Configuration Next.js 14 incorrecte
Next.js 14 nécessite peut-être une configuration spécifique pour activer le middleware

### Hypothèse 3: Conflit avec système de licences
Les guards de licences (mémoire SYSTEM-RETRIEVED-MEMORY[9e3c78f1]) pourraient interférer

## TESTS À EFFECTUER

### Test 1: Vérifier si middleware est compilé
```powershell
Get-Content .next\server\middleware-manifest.json
```

### Test 2: Forcer l'exécution du middleware
Ajouter un log au tout début de la fonction middleware (avant tout if)

### Test 3: Vérifier les routes protégées
Comparer `protectedApiRoutes` dans middleware.ts avec les routes appelées

### Test 4: Tester sans middleware
Modifier `/api/workshop/workorders/route.ts` pour accepter les requêtes sans `x-user-id` temporairement

## SOLUTION TEMPORAIRE POSSIBLE

Modifier l'API pour extraire le JWT directement au lieu de compter sur le middleware:

```typescript
// Dans /api/workshop/workorders/route.ts
import { getUserFromToken } from '@/lib/jwt';

export async function GET(req: Request) {
  // Au lieu de getUserId(req), utiliser getUserFromToken
  const user = await getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  
  // Utiliser user.userId au lieu de userId
  // ...
}
```

## PROCHAINES ÉTAPES

1. Vérifier middleware-manifest.json
2. Comprendre pourquoi middleware ne s'exécute pas
3. Soit réparer le middleware, soit contourner en extrayant JWT dans chaque API
4. Appliquer la solution de manière globale (Règle #6)
