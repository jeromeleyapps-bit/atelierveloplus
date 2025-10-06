# 🔒 Audit de Sécurité Complet - Atelier Vélo+

## 📊 Score Global : 5.5/10 ⚠️

---

## 🔴 CRITIQUE - À Corriger Immédiatement

### 1. PostgreSQL Sans Mot de Passe ❌ CRITIQUE
**Fichier** : `C:\Program Files\PostgreSQL\18\data\pg_hba.conf`  
**Statut** : Configuré en `trust` (aucun mot de passe requis)

**Risque** :
- ❌ N'importe qui sur localhost peut accéder à TOUTES les données
- ❌ Pas d'authentification = accès total à la base

**Impact** : 🔴 CRITIQUE  
**Probabilité** : 🟡 Moyenne (seulement en local)

**Solution** :
```powershell
# 1. Définir un mot de passe fort
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d postgres -c "ALTER USER postgres PASSWORD 'VotreMotDePasseSecurise123!';"

# 2. Modifier pg_hba.conf - Remplacer trust par scram-sha-256
# Ligne 113: local   all             all                                     scram-sha-256
# Ligne 115: host    all             all             127.0.0.1/32            scram-sha-256
# Ligne 117: host    all             all             ::1/128                 scram-sha-256

# 3. Redémarrer PostgreSQL
# services.msc → postgresql-x64-18 → Redémarrer

# 4. Mettre à jour .env.local
DATABASE_URL="postgresql://postgres:VotreMotDePasseSecurise123!@localhost:5432/atelier_velo?schema=public"
```

---

### 2. Mot de Passe Supabase en Clair ❌ CRITIQUE
**Fichier** : `.env` ligne 17

```env
DATABASE_URL="postgresql://postgres.zkzhhmraidednkwkwxbm:D@rkfarmer1973@aws-1-eu-west-3..."
```

**Risque** :
- ❌ Mot de passe visible en clair
- ❌ Si `.env` est commité → Accès total à votre base Supabase
- ❌ Historique Git pourrait contenir le mot de passe

**Impact** : 🔴 CRITIQUE  
**Probabilité** : 🟡 Moyenne

**Solution** :
```bash
# 1. Vérifier que .env est dans .gitignore
cat .gitignore | grep ".env"

# 2. Vérifier l'historique Git
git log --all --full-history -- .env

# 3. Si .env a été commité, changer IMMÉDIATEMENT le mot de passe Supabase
# Aller sur https://supabase.com → Settings → Database → Reset Password

# 4. Utiliser des variables d'environnement en production
# Vercel/Netlify : Ajouter DATABASE_URL dans les variables d'environnement
```

---

### 3. APIs WorkOrder Sans Authentification ❌ CRITIQUE
**Fichiers** :
- `src/app/api/workshop/workorders/route.ts`
- `src/app/api/workshop/workorders/[id]/route.ts`

**Code actuel** :
```typescript
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  // ❌ PAS de vérification getUserId !
  await prisma.workOrder.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
```

**Risque** :
- ❌ N'importe qui peut supprimer n'importe quel ticket
- ❌ N'importe qui peut créer/modifier des tickets
- ❌ Pas de traçabilité des actions

**Impact** : 🔴 CRITIQUE  
**Probabilité** : 🔴 Haute (API publique)

**Solution** :
```typescript
// Ajouter getUserId comme dans les autres APIs
function getUserId(req: Request): string | null {
  const uid = req.headers.get("x-user-id");
  return uid && uid.trim() ? uid : null;
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  
  await prisma.workOrder.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
```

---

## 🟡 IMPORTANT - À Améliorer Rapidement

### 4. Header x-user-id Facilement Falsifiable ⚠️
**Méthode actuelle** :
```typescript
const uid = req.headers.get("x-user-id"); // ❌ Peut être modifié par le client
```

**Risque** :
- ⚠️ Un utilisateur peut se faire passer pour un autre
- ⚠️ Pas de vérification cryptographique

**Impact** : 🟡 Important  
**Probabilité** : 🟡 Moyenne

**Solution** :
```typescript
// Utiliser JWT ou sessions sécurisées
import { verify } from 'jsonwebtoken';

function getUserId(req: Request): string | null {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  
  try {
    const decoded = verify(token, process.env.JWT_SECRET!);
    return decoded.userId;
  } catch {
    return null;
  }
}
```

---

### 5. Pas de Rate Limiting sur WorkOrders ⚠️
**Risque** :
- ⚠️ Spam de création de tickets
- ⚠️ Attaque DoS possible
- ⚠️ Surcharge de la base de données

**Impact** : 🟡 Important  
**Probabilité** : 🟡 Moyenne

**Solution** :
```typescript
// Réutiliser le système existant de rateLimit
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimit("workorder:create", ip, 10, 60); // 10 par minute
  if (!rl.allowed) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  // ... reste du code
}
```

---

### 6. Validation des Entrées Insuffisante ⚠️
**Code actuel** :
```typescript
const data: any = {
  status: String(body.status || 'created'), // ❌ Pas de validation
  customerId: body.customerId ? String(body.customerId) : null,
};
```

**Risque** :
- ⚠️ Données invalides dans la base
- ⚠️ Injection possible de valeurs inattendues

**Impact** : 🟡 Important  
**Probabilité** : 🟡 Moyenne

**Solution** :
```typescript
import { z } from 'zod';

const CreateWorkOrderSchema = z.object({
  customerId: z.string().cuid(),
  bikeId: z.string().cuid().optional(),
  status: z.enum(['created', 'ready']).optional(),
  dueAt: z.string().datetime().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  
  try {
    const validated = CreateWorkOrderSchema.parse(body);
    // ... utiliser validated
  } catch (error) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
}
```

---

## 🟢 BON - Déjà Sécurisé

### 7. Authentification Existante sur Certaines APIs ✅
**Fichiers protégés** :
- ✅ `/api/account/settings` - Vérifie getUserId
- ✅ `/api/suppliers/[id]/credentials` - Vérifie getUserId
- ✅ `/api/auth/login` - Rate limiting actif
- ✅ `/api/auth/register` - Rate limiting actif

### 8. Prisma ORM ✅
- ✅ Protection automatique contre injection SQL
- ✅ Requêtes paramétrées
- ✅ Type-safe

### 9. .gitignore Correct ✅
**Fichiers protégés** :
```
.env
.env.local
.env*.local
node_modules
prisma/data
```

### 10. HTTPS en Production ✅
- ✅ Supabase utilise SSL/TLS
- ✅ `sslmode=require` dans DATABASE_URL

### 11. Rate Limiting sur Auth ✅
```typescript
// auth/login et auth/register ont déjà du rate limiting
const rl = await rateLimit("auth:login", ip, 10, 60);
```

---

## 📋 Plan d'Action Prioritaire

### 🔴 URGENT (Cette Semaine)

#### Jour 1-2 : Sécuriser PostgreSQL
- [ ] Définir mot de passe PostgreSQL
- [ ] Modifier `pg_hba.conf` → `scram-sha-256`
- [ ] Redémarrer PostgreSQL
- [ ] Mettre à jour `.env.local`
- [ ] Tester connexion

#### Jour 3-4 : Protéger APIs WorkOrder
- [ ] Ajouter `getUserId` dans toutes les routes WorkOrder
- [ ] Tester avec/sans authentification
- [ ] Vérifier que les erreurs 401 sont retournées

#### Jour 5 : Vérifier .env
- [ ] Confirmer que `.env` n'est PAS dans Git
- [ ] Vérifier historique Git
- [ ] Si nécessaire, changer mot de passe Supabase

---

### 🟡 IMPORTANT (Semaine 2)

#### Améliorer Authentification
- [ ] Remplacer `x-user-id` par JWT
- [ ] Implémenter refresh tokens
- [ ] Ajouter expiration de session

#### Rate Limiting
- [ ] Ajouter rate limiting sur WorkOrder APIs
- [ ] Ajouter rate limiting sur Dashboard
- [ ] Configurer limites appropriées

#### Validation
- [ ] Installer Zod : `npm install zod`
- [ ] Créer schémas de validation
- [ ] Appliquer validation sur toutes les APIs

---

### 🟢 AMÉLIORATION (Semaine 3-4)

#### Monitoring
- [ ] Ajouter logs de sécurité
- [ ] Alertes sur actions sensibles
- [ ] Dashboard de monitoring

#### Headers de Sécurité
- [ ] CSP (Content Security Policy)
- [ ] CORS configuration
- [ ] X-Frame-Options

---

## 🔍 Tests de Sécurité Recommandés

### 1. Test Manuel - API Sans Auth
```bash
# Tester si on peut supprimer sans authentification
curl -X DELETE http://localhost:3000/api/workshop/workorders/[id]

# Résultat attendu après correction : 401 Unauthorized
```

### 2. npm audit
```powershell
cd c:\Users\j_ley\Atelier-velo+\apps\web
npm audit
npm audit fix
```

### 3. Vérifier .env dans Git
```bash
git log --all --full-history -- .env
# Résultat attendu : Aucun commit
```

---

## 📊 Détail des Scores

| Catégorie | Score | Détails |
|-----------|-------|---------|
| **Authentification** | 4/10 | ⚠️ Certaines APIs protégées, d'autres non |
| **Base de Données** | 3/10 | ❌ PostgreSQL sans mot de passe |
| **Code** | 7/10 | ✅ Prisma ORM, pas d'injection SQL |
| **Configuration** | 5/10 | ⚠️ Secrets en clair, .gitignore OK |
| **Monitoring** | 2/10 | ❌ Pas de logs de sécurité |
| **Rate Limiting** | 6/10 | ✅ Auth protégé, ⚠️ APIs non |
| **Validation** | 4/10 | ⚠️ Validation basique uniquement |

**Score Global** : **5.5/10** ⚠️

---

## 🎯 Objectif

**Score cible** : **8/10** (Bon niveau de sécurité)

**Après corrections prioritaires** : **7/10**  
**Après toutes corrections** : **8.5/10**

---

## 📚 Ressources

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [Next.js Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Prisma Security Best Practices](https://www.prisma.io/docs/guides/security)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Audit réalisé** : 06/10/2025 03:41  
**Prochaine révision** : 06/11/2025  
**Priorité #1** : Sécuriser PostgreSQL + Protéger APIs WorkOrder
