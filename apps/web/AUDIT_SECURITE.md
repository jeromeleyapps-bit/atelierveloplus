# 🔒 Audit de Sécurité - Atelier Vélo+

## 📋 Checklist de Sécurité

### 🔴 CRITIQUE - À Corriger Immédiatement

#### 1. PostgreSQL sans Mot de Passe ❌
**Statut** : `pg_hba.conf` configuré en `trust` (pas de mot de passe)

**Risque** :
- N'importe qui sur localhost peut accéder à la base
- Toutes les données sont accessibles sans authentification

**Recommandation** :
```
Définir un mot de passe et remettre scram-sha-256
```

---

#### 2. Mot de Passe Supabase dans .env ❌
**Fichier** : `.env` ligne 17
```
DATABASE_URL="postgresql://postgres.zkzhhmraidednkwkwxbm:D@rkfarmer1973@..."
```

**Risque** :
- Mot de passe en clair dans le fichier
- Si `.env` est commité par erreur → Accès total à Supabase

**Recommandation** :
```
✅ Vérifier que .env est dans .gitignore
✅ Ne JAMAIS commiter .env
✅ Utiliser des variables d'environnement en production
```

---

#### 3. Pas d'Authentification sur les APIs ⚠️
**Fichiers** : Toutes les routes `/api/*`

**Risque** :
- N'importe qui peut créer/modifier/supprimer des données
- Pas de vérification de session utilisateur

**Exemple** :
```typescript
// src/app/api/workshop/workorders/[id]/route.ts
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  // ❌ Pas de vérification d'authentification !
  await prisma.workOrder.delete({ where: { id: params.id } });
}
```

**Recommandation** :
```typescript
import { getServerSession } from "next-auth";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... reste du code
}
```

---

### 🟡 IMPORTANT - À Améliorer

#### 4. Injection SQL Potentielle ⚠️
**Fichier** : `src/app/api/workshop/workorders/route.ts`

**Code actuel** :
```typescript
if (q && q.trim()) {
  where.OR = [
    { customer: { email: { contains: q, mode: 'insensitive' } } },
    // ...
  ];
}
```

**Risque** : Faible (Prisma échappe automatiquement)

**Recommandation** :
```typescript
// Valider et limiter la longueur de q
if (q && q.trim() && q.length <= 100) {
  const sanitized = q.trim();
  where.OR = [
    { customer: { email: { contains: sanitized, mode: 'insensitive' } } },
  ];
}
```

---

#### 5. Pas de Limite de Taux (Rate Limiting) ⚠️
**Risque** :
- Attaques par force brute possibles
- Spam de création de tickets
- Surcharge du serveur

**Recommandation** :
```typescript
// Utiliser next-rate-limit ou similar
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite de 100 requêtes
});
```

---

#### 6. CORS Non Configuré ⚠️
**Risque** :
- Requêtes cross-origin non contrôlées

**Recommandation** :
```typescript
// next.config.js
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'https://votre-domaine.com' },
      ],
    },
  ];
}
```

---

### 🟢 BON - Déjà Sécurisé

#### 7. .gitignore Correct ✅
**Fichiers protégés** :
- `.env`
- `.env.local`
- `node_modules`
- `prisma/data`

#### 8. Prisma ORM ✅
- Protection contre injection SQL automatique
- Requêtes paramétrées

#### 9. HTTPS en Production ✅
- Supabase utilise SSL/TLS
- `sslmode=require` dans DATABASE_URL

---

## 🔒 Recommandations par Priorité

### Priorité 1 - URGENT

#### A. Sécuriser PostgreSQL Local
```powershell
# 1. Définir un mot de passe
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d postgres -c "ALTER USER postgres PASSWORD 'VotreMotDePasseSecurise123!';"

# 2. Modifier pg_hba.conf
# Remplacer trust par scram-sha-256

# 3. Redémarrer PostgreSQL
# services.msc → postgresql-x64-18 → Redémarrer

# 4. Mettre à jour .env.local
DATABASE_URL="postgresql://postgres:VotreMotDePasseSecurise123!@localhost:5432/atelier_velo?schema=public"
```

#### B. Ajouter Authentification aux APIs
```typescript
// Créer un middleware
// src/middleware/auth.ts
import { getServerSession } from "next-auth";

export async function requireAuth(req: Request) {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

// Utiliser dans chaque route API
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth(req);
    // ... code sécurisé
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

---

### Priorité 2 - IMPORTANT

#### C. Validation des Entrées
```typescript
// Utiliser Zod pour validation
import { z } from 'zod';

const WorkOrderSchema = z.object({
  customerId: z.string().cuid(),
  bikeId: z.string().cuid().optional(),
  status: z.enum(['created', 'ready']),
});

export async function POST(req: Request) {
  const body = await req.json();
  const validated = WorkOrderSchema.parse(body); // Throw si invalide
  // ... utiliser validated
}
```

#### D. Rate Limiting
```typescript
// Installer: npm install express-rate-limit
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Trop de requêtes, réessayez plus tard'
});
```

---

### Priorité 3 - AMÉLIORATION

#### E. Logs de Sécurité
```typescript
// Logger les actions sensibles
import { logger } from '@/lib/logger';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAuth(req);
  logger.warn(`User ${session.user.email} deleted WorkOrder ${params.id}`);
  // ...
}
```

#### F. CSP (Content Security Policy)
```typescript
// next.config.js
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline';"
        },
      ],
    },
  ];
}
```

---

## 🎯 Score de Sécurité Actuel

### Global : 4/10 ⚠️

**Détails** :
- 🔴 Authentification : 2/10 (Pas de protection API)
- 🟡 Base de données : 5/10 (PostgreSQL sans mot de passe)
- 🟢 Code : 7/10 (Prisma ORM, pas d'injection SQL)
- 🟡 Configuration : 6/10 (Secrets en clair)
- 🔴 Monitoring : 1/10 (Pas de logs)

---

## 📝 Plan d'Action Recommandé

### Semaine 1 - Sécurité Critique
- [ ] Définir mot de passe PostgreSQL
- [ ] Ajouter authentification sur toutes les APIs
- [ ] Vérifier .gitignore

### Semaine 2 - Sécurité Importante
- [ ] Validation des entrées (Zod)
- [ ] Rate limiting
- [ ] Logs de sécurité

### Semaine 3 - Améliorations
- [ ] CSP headers
- [ ] CORS configuration
- [ ] Tests de sécurité

---

## 🔍 Outils de Test Recommandés

### 1. OWASP ZAP
```
Scan automatique de vulnérabilités
```

### 2. npm audit
```powershell
npm audit
npm audit fix
```

### 3. Snyk
```
Scan des dépendances pour vulnérabilités
```

---

## 📚 Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Prisma Security](https://www.prisma.io/docs/guides/security)

---

**Audit complété** : 06/10/2025 03:41  
**Prochaine révision** : Dans 1 mois  
**Priorité** : Sécuriser PostgreSQL + Ajouter authentification APIs
