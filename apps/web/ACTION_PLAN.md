# 📋 Plan d'Action - Atelier Vélo+

**Objectif**: Rendre l'application production-ready avec vos intégrations préférées

---

## 🎯 Phase 1: Sécurité & Stabilisation (Semaine 1)

### 1.1 Désactiver Reset DB en Production ⚠️ CRITIQUE

**Problème**: La DB est effacée à chaque inscription en dev
```typescript
// src/app/api/auth/register/route.ts ligne 70
const shouldReset = process.env.RESET_DB_ON_REGISTER === "true" || process.env.NODE_ENV === "development";
```

**Action**:
```env
# Ajouter dans .env
RESET_DB_ON_REGISTER=false
```

**Impact**: Évite perte de données en production

---

### 1.2 Implémenter Protection Middleware 🔒

**Problème**: Middleware vide, routes non protégées

**Fichier**: `src/middleware.ts`

**Code à implémenter**:
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Protéger les routes admin
  if (pathname.startsWith('/admin')) {
    // Vérifier session/JWT
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // Protéger les API (sauf auth)
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth')) {
    // Vérifier authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
```

**Temps estimé**: 2-3 heures

---

### 1.3 Générer Nouveaux Secrets 🔑

**Problème**: Secrets identiques et potentiellement faibles

**Action**:
```bash
# Générer 2 secrets différents
openssl rand -base64 32
openssl rand -base64 32
```

**Mettre à jour .env**:
```env
NEXTAUTH_SECRET=<premier secret généré>
AUTH_SECRET=<second secret généré>
```

**Temps estimé**: 5 minutes

---

### 1.4 Configurer Upstash Redis 📊

**Problème**: Rate limiting en mémoire (perdu au redémarrage)

**Étapes**:
1. Créer compte gratuit sur https://upstash.com
2. Créer une base Redis
3. Copier REST URL et TOKEN

**Ajouter dans .env**:
```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

**Temps estimé**: 15 minutes

---

## 💳 Phase 2: Intégrations Paiements (Semaine 2)

### 2.1 Intégration Stripe

**Fichiers à créer**:
```
src/lib/payments/stripe.ts
src/app/api/payments/stripe/webhook/route.ts
src/app/api/payments/stripe/create-intent/route.ts
```

**Installation**:
```bash
npm install stripe @stripe/stripe-js
```

**Configuration .env**:
```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Fonctionnalités**:
- [ ] Créer Payment Intent
- [ ] Webhook pour confirmations
- [ ] Enregistrer paiements dans Invoice
- [ ] UI checkout Stripe Elements

**Temps estimé**: 1-2 jours

---

### 2.2 Intégration SumUp

**Fichiers à créer**:
```
src/lib/payments/sumup.ts
src/app/api/payments/sumup/checkout/route.ts
```

**Installation**:
```bash
npm install @sumup/sdk
```

**Configuration .env**:
```env
SUMUP_API_KEY=your-api-key
SUMUP_MERCHANT_CODE=your-merchant-code
```

**Fonctionnalités**:
- [ ] Créer checkout SumUp
- [ ] Callback après paiement
- [ ] Enregistrer dans Invoice
- [ ] UI intégration

**Temps estimé**: 1 jour

---

## 📧 Phase 3: Intégration HubSpot (Semaine 3)

### 3.1 Sync Contacts Bidirectionnel

**Fichiers à créer**:
```
src/lib/integrations/hubspot.ts
src/app/api/integrations/hubspot/sync/route.ts
src/app/api/integrations/hubspot/webhook/route.ts
```

**Installation**:
```bash
npm install @hubspot/api-client
```

**Configuration .env**:
```env
HUBSPOT_API_KEY=your-api-key
HUBSPOT_PORTAL_ID=your-portal-id
```

**Fonctionnalités**:
- [ ] Sync Customer → HubSpot Contact
- [ ] Webhook HubSpot → Update Customer
- [ ] Sync WorkOrder → HubSpot Deal
- [ ] Historique sync

**Temps estimé**: 2-3 jours

---

### 3.2 Envoi Emails via HubSpot

**Fichier à modifier**:
```
src/lib/email.ts (créer ou modifier)
```

**Fonctionnalités**:
- [ ] Templates emails HubSpot
- [ ] Envoi factures via HubSpot
- [ ] Tracking ouvertures
- [ ] Envoi SMS (si activé HubSpot)

**Temps estimé**: 1 jour

---

## 📜 Phase 4: Conformité Fiscale (Semaine 4)

### 4.1 Clarification Réglementaire

**Questions à résoudre**:
- [ ] Attestation éditeur vs NF525 ?
- [ ] Obligation selon CA ?
- [ ] Certification requise ?

**Ressources**:
- DGFiP (Direction Générale des Finances Publiques)
- Expert-comptable
- Éditeurs certifiés (ex: LNE)

---

### 4.2 Implémentation NF525 (si requis)

**Exigences NF525**:
- [ ] Inaltérabilité des données
- [ ] Sécurisation des données
- [ ] Conservation des données
- [ ] Archivage

**Fichiers à créer**:
```
src/lib/compliance/nf525.ts
src/app/api/compliance/archive/route.ts
```

**Fonctionnalités**:
- [ ] Hash chaîné des factures
- [ ] Signature électronique
- [ ] Export archives
- [ ] Logs d'audit

**Temps estimé**: 3-5 jours (selon complexité)

---

### 4.3 Attestation Éditeur (alternative)

**Si attestation éditeur suffit**:
- [ ] Documenter processus facturation
- [ ] Prouver inaltérabilité
- [ ] Fournir attestation signée

**Temps estimé**: 1 jour

---

## 🚀 Phase 5: Optimisations (Semaine 5)

### 5.1 Pagination API

**Endpoints à modifier**:
```typescript
// Exemple: src/app/api/customers/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor');
  const limit = Math.min(50, Number(searchParams.get('limit') || 20));
  
  const customers = await prisma.customer.findMany({
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
  });
  
  const hasMore = customers.length > limit;
  const items = hasMore ? customers.slice(0, -1) : customers;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  
  return NextResponse.json({ items, nextCursor, hasMore });
}
```

**Endpoints prioritaires**:
- [ ] GET /api/customers
- [ ] GET /api/finance/invoices
- [ ] GET /api/catalog/items
- [ ] GET /api/workorders

**Temps estimé**: 1 jour

---

### 5.2 Monitoring Production

**Sentry Setup**:
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Configuration .env**:
```env
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=atelier-velo
```

**Temps estimé**: 2 heures

---

## 📊 Phase 6: Tests & Documentation (Semaine 6)

### 6.1 Tests E2E avec Playwright

**Installation**:
```bash
npm install -D @playwright/test
npx playwright install
```

**Tests critiques**:
- [ ] Inscription / Connexion
- [ ] Création client
- [ ] Création facture
- [ ] Paiement Stripe
- [ ] Envoi email

**Temps estimé**: 2-3 jours

---

### 6.2 Documentation API

**Swagger/OpenAPI**:
```bash
npm install swagger-jsdoc swagger-ui-react
```

**Créer**:
```
src/app/api/docs/route.ts
public/swagger.json
```

**Temps estimé**: 1 jour

---

## 🎬 Phase 7: Déploiement Production (Semaine 7)

### 7.1 Checklist Pré-Déploiement

- [ ] Tous les tests passent
- [ ] Variables env production configurées
- [ ] Secrets régénérés
- [ ] Rate limiting actif
- [ ] Monitoring actif
- [ ] Backup DB configuré
- [ ] DNS configuré
- [ ] SSL/HTTPS actif

### 7.2 Déploiement Vercel

**Étapes**:
1. Push code sur GitHub
2. Importer projet sur Vercel
3. Configurer variables env
4. Déployer
5. Vérifier domaine custom
6. Tester en production

**Temps estimé**: 1 jour

---

### 7.3 Post-Déploiement

- [ ] Smoke tests
- [ ] Vérifier logs
- [ ] Tester paiements (mode test)
- [ ] Vérifier emails
- [ ] Monitoring actif
- [ ] Alertes configurées

---

## 📅 Timeline Globale

| Semaine | Phase | Tâches | Statut |
|---------|-------|--------|--------|
| 1 | Sécurité | Middleware, secrets, Redis | ⏳ |
| 2 | Paiements | Stripe + SumUp | ⏳ |
| 3 | HubSpot | Sync + Emails | ⏳ |
| 4 | Conformité | NF525 / Attestation | ⏳ |
| 5 | Optimisation | Pagination + Monitoring | ⏳ |
| 6 | Tests | E2E + Documentation | ⏳ |
| 7 | Production | Déploiement + Vérification | ⏳ |

**Durée totale estimée**: 7 semaines (temps plein)

---

## 💰 Coûts Estimés (Mensuel)

### Services Gratuits
- ✅ Vercel (Hobby plan)
- ✅ Supabase (Free tier: 500MB DB)
- ✅ Upstash (Free tier: 10K requests/day)
- ✅ Sentry (Free tier: 5K errors/month)

### Services Payants
- 💳 Stripe: 1.4% + 0.25€ par transaction
- 💳 SumUp: 1.39% par transaction
- 📧 HubSpot: À partir de 45€/mois (Starter)
- 📧 Resend: 0.80€/1000 emails

**Budget mensuel estimé**: 50-100€ (hors transactions)

---

## 🎯 Priorités selon Urgence

### Critique (Avant Production)
1. ⚠️ Désactiver RESET_DB_ON_REGISTER
2. 🔒 Middleware protection
3. 🔑 Nouveaux secrets
4. 📊 Upstash Redis

### Important (Semaine 1-2)
5. 💳 Stripe integration
6. 📧 HubSpot emails
7. 🔍 Sentry monitoring

### Souhaitable (Semaine 3-4)
8. 💳 SumUp integration
9. 📜 Conformité fiscale
10. 📊 Pagination API

### Optionnel (Après Production)
11. 📚 Documentation API
12. 🧪 Tests E2E
13. 🎨 UI/UX improvements

---

## 📞 Support & Ressources

### Documentation Intégrations
- [Stripe Docs](https://stripe.com/docs)
- [SumUp API](https://developer.sumup.com)
- [HubSpot API](https://developers.hubspot.com)
- [Upstash Docs](https://docs.upstash.com)

### Conformité Fiscale
- [DGFiP - Logiciels de caisse](https://www.economie.gouv.fr/dgfip)
- [LNE Certification](https://www.lne.fr)

---

## ✅ Prochaine Action

**Commencez par Phase 1.1** : Désactiver RESET_DB_ON_REGISTER

Puis suivez l'ordre des phases pour un déploiement progressif et sécurisé.

---

**Dernière mise à jour**: 2025-10-05  
**Statut global**: 🟡 En cours (Migration PostgreSQL ✅)
