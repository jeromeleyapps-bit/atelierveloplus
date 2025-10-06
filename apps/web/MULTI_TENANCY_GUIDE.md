# 🏢 Guide Multi-Tenancy - Atelier Vélo+

**Objectif** : Transformer l'app en SaaS multi-tenant pour gérer 10+ ateliers avec 1 seule base de données

---

## 📐 Architecture

### Concept
- **1 base Supabase** pour tous les ateliers
- **1 app déployée** accessible par tous
- **Isolation logique** via `tenantId` dans chaque table
- **Identification** par sous-domaine ou paramètre

### Identification des Tenants

**Option A - Sous-domaines** (Recommandé)
```
atelier-paris.atelier-velo.fr    → Tenant "paris"
atelier-lyon.atelier-velo.fr     → Tenant "lyon"
mon-velo.atelier-velo.fr         → Tenant "mon-velo"
```

**Option B - Paramètre URL**
```
app.atelier-velo.fr?tenant=paris
app.atelier-velo.fr?tenant=lyon
```

**Option C - Domaines personnalisés**
```
atelier-paris.fr → Tenant "paris"
velo-lyon.com    → Tenant "lyon"
```

---

## 🗄️ Étape 1: Modification du Schéma Prisma

### 1.1 Créer le modèle Tenant

```prisma
// prisma/schema.prisma

model Tenant {
  id        String   @id @default(cuid())
  name      String   // Nom de l'atelier
  slug      String   @unique // Identifiant unique (ex: "atelier-paris")
  domain    String?  @unique // Domaine personnalisé optionnel
  
  // Informations atelier
  shopName    String?
  shopEmail   String?
  shopPhone   String?
  address1    String?
  address2    String?
  zip         String?
  city        String?
  country     String?
  siret       String?
  tva         String?
  
  // Statut
  active      Boolean  @default(true)
  plan        String   @default("free") // free, starter, pro
  trialEndsAt DateTime?
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  users       User[]
  customers   Customer[]
  workOrders  WorkOrder[]
  invoices    Invoice[]
  catalogItems CatalogItem[]
  suppliers   Supplier[]
  calendarEvents CalendarEvent[]
  calendarBlocks CalendarBlock[]
  bookings    Booking[]
  appSettings AppSetting[]
}
```

### 1.2 Ajouter tenantId à TOUTES les tables métier

```prisma
model User {
  id            String    @id @default(cuid())
  tenantId      String    // ← NOUVEAU
  name          String?
  email         String
  emailVerified DateTime?
  image         String?
  password      String?
  role          String    @default("user")
  active        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  accounts Account[]
  sessions Session[]
  settings AppSetting?

  @@unique([tenantId, email]) // Email unique PAR tenant
  @@index([tenantId])
}

model Customer {
  id             String   @id @default(cuid())
  tenantId       String   // ← NOUVEAU
  email          String?
  firstName      String?
  lastName       String?
  phone          String?
  // ... autres champs
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  bikes  CustomerBike[]
  bookings Booking[]

  @@index([tenantId])
  @@index([tenantId, email])
}

model Invoice {
  id              String    @id @default(cuid())
  tenantId        String    // ← NOUVEAU
  workOrderId     String
  number          String?
  // ... autres champs
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  lines  InvoiceLine[]
  payments InvoicePayment[]

  @@unique([tenantId, number]) // Numéro unique PAR tenant
  @@index([tenantId])
}

model CatalogItem {
  id              String   @id @default(cuid())
  tenantId        String   // ← NOUVEAU
  sku             String?
  category        CatalogCategory
  name            String
  // ... autres champs
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, sku]) // SKU unique PAR tenant
  @@index([tenantId])
}

// Répéter pour :
// - WorkOrder
// - Supplier
// - CalendarEvent
// - CalendarBlock
// - Booking
// - AppSetting
// - GlobalSetting (renommer en TenantSetting)
```

### 1.3 Tables partagées (pas de tenantId)

Ces tables restent globales :
- `Account` (OAuth)
- `Session`
- `VerificationToken`
- `InvoiceSequence` → Ajouter tenantId !

---

## 🔧 Étape 2: Middleware Prisma

### 2.1 Créer le contexte tenant

```typescript
// src/lib/tenant-context.ts
import { AsyncLocalStorage } from 'async_hooks';

interface TenantContext {
  tenantId: string;
  tenantSlug: string;
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return tenantStorage.getStore();
}

export function setTenantContext(context: TenantContext) {
  tenantStorage.enterWith(context);
}

export function getTenantId(): string {
  const context = getTenantContext();
  if (!context) {
    throw new Error('No tenant context. Call setTenantContext first.');
  }
  return context.tenantId;
}
```

### 2.2 Middleware Prisma avec filtrage automatique

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';
import { getTenantId } from './tenant-context';

let prismaInstance: PrismaClient | null = null;

export async function getPrisma() {
  if (prismaInstance) return prismaInstance;
  
  try {
    const { PrismaClient: PC } = await import('@prisma/client');
    const prisma = new PC();
    
    // Middleware pour filtrage automatique par tenant
    prisma.$use(async (params, next) => {
      // Tables qui nécessitent tenantId
      const tenantModels = [
        'User', 'Customer', 'CustomerBike', 'WorkOrder', 'WorkOrderPart',
        'Invoice', 'InvoiceLine', 'InvoicePayment', 'InvoiceSequence',
        'CatalogItem', 'StockMovement', 'Supplier', 'SupplierCredential',
        'SupplierItem', 'CalendarEvent', 'CalendarBlock', 'Booking',
        'AppSetting', 'TenantSetting'
      ];
      
      if (!tenantModels.includes(params.model || '')) {
        return next(params);
      }
      
      try {
        const tenantId = getTenantId();
        
        // Ajouter tenantId aux requêtes de lecture
        if (['findUnique', 'findFirst', 'findMany', 'count', 'aggregate'].includes(params.action)) {
          params.args.where = {
            ...params.args.where,
            tenantId,
          };
        }
        
        // Ajouter tenantId aux créations
        if (params.action === 'create') {
          params.args.data = {
            ...params.args.data,
            tenantId,
          };
        }
        
        // Ajouter tenantId aux créations multiples
        if (params.action === 'createMany') {
          if (Array.isArray(params.args.data)) {
            params.args.data = params.args.data.map((item: any) => ({
              ...item,
              tenantId,
            }));
          }
        }
        
        // Ajouter tenantId aux mises à jour
        if (['update', 'updateMany', 'upsert'].includes(params.action)) {
          params.args.where = {
            ...params.args.where,
            tenantId,
          };
        }
        
        // Ajouter tenantId aux suppressions
        if (['delete', 'deleteMany'].includes(params.action)) {
          params.args.where = {
            ...params.args.where,
            tenantId,
          };
        }
        
      } catch (error) {
        // Si pas de contexte tenant, laisser passer (pour migrations, etc.)
        console.warn('No tenant context for Prisma query:', params.model, params.action);
      }
      
      return next(params);
    });
    
    prismaInstance = prisma;
    return prisma;
  } catch {
    return null;
  }
}
```

---

## 🌐 Étape 3: Détection du Tenant

### 3.1 Middleware Next.js

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Détecter le tenant depuis le sous-domaine
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];
  
  // Domaine principal (pas de tenant)
  if (subdomain === 'app' || subdomain === 'www' || subdomain === 'localhost') {
    // Page de sélection tenant ou landing
    if (!pathname.startsWith('/select-tenant') && !pathname.startsWith('/api/auth')) {
      return NextResponse.redirect(new URL('/select-tenant', request.url));
    }
    return NextResponse.next();
  }
  
  // Vérifier que le tenant existe
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: subdomain },
      select: { id: true, active: true, name: true },
    });
    
    if (!tenant) {
      return NextResponse.redirect(new URL('/tenant-not-found', request.url));
    }
    
    if (!tenant.active) {
      return NextResponse.redirect(new URL('/tenant-inactive', request.url));
    }
    
    // Ajouter le tenant aux headers pour les API routes
    const response = NextResponse.next();
    response.headers.set('x-tenant-id', tenant.id);
    response.headers.set('x-tenant-slug', subdomain);
    response.headers.set('x-tenant-name', tenant.name);
    
    return response;
  } catch (error) {
    console.error('Tenant detection error:', error);
    return NextResponse.redirect(new URL('/error', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 3.2 Helper pour récupérer le tenant

```typescript
// src/lib/get-tenant.ts
import { headers } from 'next/headers';
import { setTenantContext } from './tenant-context';

export async function getTenantFromRequest(): Promise<{
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
}> {
  const headersList = headers();
  const tenantId = headersList.get('x-tenant-id');
  const tenantSlug = headersList.get('x-tenant-slug');
  const tenantName = headersList.get('x-tenant-name');
  
  if (!tenantId || !tenantSlug) {
    throw new Error('No tenant context in request');
  }
  
  // Définir le contexte pour Prisma
  setTenantContext({ tenantId, tenantSlug });
  
  return { tenantId, tenantSlug, tenantName: tenantName || '' };
}
```

---

## 🔐 Étape 4: Modifier l'Authentification

### 4.1 Register avec création tenant

```typescript
// src/app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { rateLimit, validatePasswordComplexity, isPasswordBreached } from "@/lib/security";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimit("auth:register", ip, 5, 60);
  if (!rl.allowed) {
    await jitter(250);
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });

  const body = await req.json().catch(() => ({} as any));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const shopName = typeof body.shopName === 'string' ? body.shopName : 'Mon Atelier';
  const slug = body.slug || generateSlug(shopName);

  // Validations...
  if (!email || !password) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 400 });
  }
  
  if (!validatePasswordComplexity(password)) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  try {
    // Vérifier que le slug est disponible
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });
    
    if (existingTenant) {
      return NextResponse.json({ 
        error: "slug_taken",
        message: "Ce nom d'atelier est déjà pris" 
      }, { status: 400 });
    }

    // Créer le tenant (l'atelier)
    const tenant = await prisma.tenant.create({
      data: {
        name: shopName,
        slug,
        shopName,
        active: true,
        plan: 'free',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
      },
    });

    const passwordHash = await hash(password, 10);

    // Créer le premier utilisateur (admin de l'atelier)
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        password: passwordHash,
        role: "admin", // Premier utilisateur = admin
        active: true,
      },
    });

    // Créer les paramètres par défaut
    await prisma.appSetting.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        shopName,
      },
    });

    return NextResponse.json({
      id: user.id,
      tenantId: tenant.id,
      tenantSlug: slug,
      email,
      shopName,
      subdomain: `${slug}.atelier-velo.fr`, // URL de l'atelier
    }, { status: 201 });
  } catch (e: any) {
    console.error('Registration error:', e);
    return NextResponse.json({ error: "register_failed" }, { status: 500 });
  }
}
```

### 4.2 Login avec vérification tenant

```typescript
// src/app/api/auth/login/route.ts
import { getTenantFromRequest } from "@/lib/get-tenant";

export async function POST(req: Request) {
  const { tenantId } = await getTenantFromRequest();
  
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });

  const body = await req.json();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  // Validations...

  try {
    // Chercher l'utilisateur DANS CE TENANT
    const user = await prisma.user.findFirst({
      where: {
        email,
        tenantId, // ← Filtrage automatique par le middleware
        active: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    const ok = await compare(password, user.password);
    if (!ok) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    // Créer session...
    return NextResponse.json({ 
      id: user.id, 
      email: user.email,
      tenantId: user.tenantId,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "login_failed" }, { status: 500 });
  }
}
```

---

## 🎨 Étape 5: UI Multi-Tenant

### 5.1 Page de sélection tenant

```typescript
// src/app/select-tenant/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SelectTenantPage() {
  const [slug, setSlug] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Rediriger vers le sous-domaine
    window.location.href = `https://${slug}.atelier-velo.fr`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <h1 className="text-3xl font-bold text-center">
          Atelier Vélo+
        </h1>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="slug" className="block text-sm font-medium">
              Nom de votre atelier
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border"
                placeholder="mon-atelier"
              />
              <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 bg-gray-50 text-gray-500 text-sm">
                .atelier-velo.fr
              </span>
            </div>
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Accéder à mon atelier
          </button>
        </form>
        <div className="text-center">
          <a href="/register" className="text-sm text-blue-600 hover:text-blue-500">
            Créer un nouvel atelier
          </a>
        </div>
      </div>
    </div>
  );
}
```

---

## 📊 Étape 6: Migration des Données Existantes

### 6.1 Script de migration

```typescript
// scripts/migrate-to-multi-tenant.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  console.log('Starting multi-tenant migration...');
  
  // Créer un tenant par défaut pour les données existantes
  const defaultTenant = await prisma.tenant.create({
    data: {
      name: 'Atelier Principal',
      slug: 'principal',
      shopName: 'Atelier Principal',
      active: true,
      plan: 'pro',
    },
  });
  
  console.log(`Created default tenant: ${defaultTenant.id}`);
  
  // Migrer tous les utilisateurs existants
  const users = await prisma.user.findMany();
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { tenantId: defaultTenant.id },
    });
  }
  console.log(`Migrated ${users.length} users`);
  
  // Répéter pour toutes les tables...
  // customers, invoices, catalogItems, etc.
  
  console.log('Migration completed!');
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 🚀 Étape 7: Déploiement

### 7.1 Configuration DNS

**Wildcard DNS** :
```
*.atelier-velo.fr → Votre serveur Vercel
```

### 7.2 Vercel Configuration

```json
// vercel.json
{
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/:path*",
      "has": [
        {
          "type": "host",
          "value": "(?<tenant>.*)\\.atelier-velo\\.fr"
        }
      ]
    }
  ]
}
```

---

## ✅ Checklist d'Implémentation

### Phase 1: Schéma (1-2 jours)
- [ ] Créer modèle Tenant
- [ ] Ajouter tenantId à toutes les tables
- [ ] Créer migration Prisma
- [ ] Générer client Prisma

### Phase 2: Middleware (1 jour)
- [ ] Créer tenant-context.ts
- [ ] Implémenter middleware Prisma
- [ ] Tester filtrage automatique

### Phase 3: Détection (1 jour)
- [ ] Middleware Next.js
- [ ] Helper getTenantFromRequest
- [ ] Gestion erreurs tenant

### Phase 4: Auth (1 jour)
- [ ] Modifier register
- [ ] Modifier login
- [ ] Tester isolation

### Phase 5: UI (1 jour)
- [ ] Page sélection tenant
- [ ] Page inscription tenant
- [ ] Affichage nom tenant

### Phase 6: Migration (1 jour)
- [ ] Script migration données
- [ ] Tester migration
- [ ] Backup avant migration

### Phase 7: Tests (2 jours)
- [ ] Tests isolation données
- [ ] Tests multi-utilisateurs
- [ ] Tests performance

### Phase 8: Déploiement (1 jour)
- [ ] Configuration DNS
- [ ] Déploiement Vercel
- [ ] Tests production

**Total estimé: 8-10 jours**

---

## 🎯 Avantages de Cette Architecture

✅ **1 seule base** = Pas de coûts supplémentaires
✅ **Isolation logique** = Sécurité des données
✅ **Scalable** = Supporte 100+ ateliers
✅ **Maintenance** = 1 seul codebase
✅ **Backup** = 1 seul backup pour tous
✅ **Monitoring** = Centralisé

---

## ⚠️ Points d'Attention

### Sécurité
- ⚠️ Tester rigoureusement l'isolation
- ⚠️ Audit de sécurité avant production
- ⚠️ Tests de pénétration

### Performance
- ⚠️ Index sur tenantId partout
- ⚠️ Monitoring requêtes lentes
- ⚠️ Cache par tenant

### Conformité
- ⚠️ RGPD: Chaque tenant = sous-traitant
- ⚠️ Export données par tenant
- ⚠️ Suppression tenant = suppression données

---

## 📞 Prochaines Étapes

1. **Désactiver RESET_DB** immédiatement
2. **Commencer Phase 1** (Schéma)
3. **Tester sur données de dev**
4. **Migrer données existantes**
5. **Déployer progressivement**

**Je peux vous aider à implémenter chaque phase !** 🚀
