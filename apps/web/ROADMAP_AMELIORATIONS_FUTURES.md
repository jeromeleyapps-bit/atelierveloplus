# 🗺️ Roadmap - Améliorations Futures

## 📋 Améliorations Importantes à Implémenter Plus Tard

---

## 🏢 1. Multi-Tenancy (Priorité Haute)

### Objectif
Permettre à plusieurs ateliers d'utiliser la même instance de l'application avec isolation complète des données.

### Bénéfices
- ✅ SaaS multi-ateliers
- ✅ Réduction des coûts d'infrastructure
- ✅ Gestion centralisée
- ✅ Facturation par atelier

### Architecture Proposée

#### Modèle de Données
```prisma
model Tenant {
  id          String   @id @default(cuid())
  name        String   // Nom de l'atelier
  slug        String   @unique // URL: app.com/atelier-velo-paris
  domain      String?  @unique // Domaine custom: atelier-velo.fr
  plan        String   @default("free") // free, pro, enterprise
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  
  // Relations
  users       User[]
  customers   Customer[]
  workOrders  WorkOrder[]
  invoices    Invoice[]
  catalogItems CatalogItem[]
  settings    TenantSetting[]
}

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  role        String   @default("user") // admin, user, viewer
}
```

#### Isolation des Données
```typescript
// Middleware automatique
export function withTenant(handler) {
  return async (req, res) => {
    const tenantId = getTenantFromRequest(req); // Depuis subdomain ou header
    req.tenantId = tenantId;
    
    // Toutes les requêtes Prisma incluent automatiquement tenantId
    return handler(req, res);
  };
}
```

#### Stratégies d'Isolation

**Option A: Schéma Partagé avec TenantId**
- ✅ Simple à implémenter
- ✅ Coût réduit
- ⚠️ Risque de fuite de données si bug

**Option B: Schéma par Tenant**
- ✅ Isolation totale
- ✅ Sécurité maximale
- ⚠️ Complexité de gestion

**Option C: Base de Données par Tenant**
- ✅ Isolation absolue
- ✅ Backup indépendant
- ⚠️ Coût élevé

**Recommandation** : Option A pour démarrer, migration vers B si nécessaire

### Fonctionnalités à Ajouter

1. **Onboarding Tenant**
   - Inscription atelier
   - Configuration initiale
   - Import données existantes

2. **Gestion Multi-Tenant**
   - Dashboard admin global
   - Statistiques par tenant
   - Facturation automatique

3. **Personnalisation par Tenant**
   - Logo personnalisé
   - Couleurs de marque
   - Domaine custom

4. **Sécurité**
   - Isolation stricte des données
   - Audit logs par tenant
   - Permissions granulaires

### Temps Estimé
**8-12 jours** de développement

---

## 🔌 2. Recherche B2B en Temps Réel (Priorité Moyenne)

### Objectif
Permettre la recherche de pièces directement sur les sites fournisseurs B2B sans import préalable.

### Méthode Recommandée : Solution 2 (Étendre Connecteurs)

#### Architecture Proposée

##### 1. Extension Interface Connecteur
```typescript
// src/lib/suppliers/base.ts
export interface SupplierConnector {
  // Existant
  checkAvailability(input: LookupInput): Promise<AvailabilityResult>;
  
  // ✅ NOUVEAU
  searchProducts(input: SearchInput): Promise<ProductSearchResult[]>;
}

export type SearchInput = {
  supplier: SupplierInfo;
  credentials?: SupplierCredentials | null;
  query: string; // Nom, SKU, ou EAN
  limit?: number;
};

export type ProductSearchResult = {
  sku: string;
  name: string;
  description?: string;
  ean?: string;
  priceHT?: number;
  availability?: string;
  imageUrl?: string;
  productUrl?: string;
};
```

##### 2. Implémentation par Fournisseur

**FourMyBike Connector**
```typescript
// src/lib/suppliers/fourmybike.ts
export class FourMyBikeConnector implements SupplierConnector {
  
  async searchProducts(input: SearchInput): Promise<ProductSearchResult[]> {
    // 1. Login (réutiliser code existant)
    await this.login(input.credentials);
    
    // 2. Recherche
    const searchUrl = `https://4mybike.de/search?q=${encodeURIComponent(input.query)}`;
    const html = await this.fetchWithAuth(searchUrl);
    
    // 3. Parser résultats
    const products = this.parseSearchResults(html);
    
    return products.slice(0, input.limit || 20);
  }
  
  private parseSearchResults(html: string): ProductSearchResult[] {
    // Scraping HTML pour extraire:
    // - SKU
    // - Nom produit
    // - Prix
    // - Disponibilité
    // - Image
    // - URL produit
    
    const results: ProductSearchResult[] = [];
    
    // Regex ou cheerio pour parser
    const productBlocks = html.match(/<div class="product-item">.*?<\/div>/gs);
    
    for (const block of productBlocks || []) {
      const sku = this.extractSku(block);
      const name = this.extractName(block);
      const priceHT = this.extractPrice(block);
      const availability = this.extractAvailability(block);
      const imageUrl = this.extractImage(block);
      const productUrl = this.extractUrl(block);
      
      results.push({
        sku,
        name,
        priceHT,
        availability,
        imageUrl,
        productUrl,
      });
    }
    
    return results;
  }
}
```

**RCZ Connector**
```typescript
// src/lib/suppliers/rcz.ts
export class RCZBikeShopConnector implements SupplierConnector {
  async searchProducts(input: SearchInput): Promise<ProductSearchResult[]> {
    // Implémentation similaire adaptée à RCZ
    // ...
  }
}
```

##### 3. Nouveau Endpoint API

**Fichier** : `src/app/api/suppliers/[id]/search-live/route.ts`
```typescript
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { FourMyBikeConnector } from "@/lib/suppliers/fourmybike";
import { RCZBikeShopConnector } from "@/lib/suppliers/rcz";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Timeout 60s pour scraping

function getUserId(req: Request): string | null {
  const uid = req.headers.get("x-user-id");
  return uid && uid.trim() ? uid : null;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  
  const { query, limit } = await req.json();
  if (!query || !query.trim()) {
    return NextResponse.json({ error: "query_required" }, { status: 400 });
  }
  
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  
  // 1. Récupérer fournisseur
  const supplier = await prisma.supplier.findUnique({ 
    where: { id: params.id } 
  });
  if (!supplier) {
    return NextResponse.json({ error: "supplier_not_found" }, { status: 404 });
  }
  
  // 2. Récupérer credentials
  const cred = await prisma.supplierCredential.findFirst({
    where: { supplierId: params.id, userId }
  });
  
  // 3. Sélectionner connecteur
  const registry: Record<string, SupplierConnector> = {
    'FOURMYBIKE': new FourMyBikeConnector(),
    'RCZBIKESHOP': new RCZBikeShopConnector(),
  };
  
  const connector = registry[supplier.connectorType];
  if (!connector) {
    return NextResponse.json({ 
      error: "connector_not_supported",
      message: `Connecteur ${supplier.connectorType} ne supporte pas la recherche`
    }, { status: 400 });
  }
  
  // 4. Rechercher sur B2B
  try {
    const extra = cred?.extraJson ? JSON.parse(cred.extraJson) : undefined;
    const results = await connector.searchProducts({
      supplier: {
        id: supplier.id,
        name: supplier.name,
        connectorType: supplier.connectorType
      },
      credentials: {
        username: cred?.username || undefined,
        password: cred?.password || undefined,
        extra
      },
      query: query.trim(),
      limit: limit || 20
    });
    
    return NextResponse.json({ 
      results,
      source: 'b2b_live',
      supplier: supplier.name
    }, { status: 200 });
    
  } catch (error: any) {
    console.error(`[search-live] Error for supplier ${supplier.name}:`, error);
    return NextResponse.json({ 
      error: "search_failed",
      message: error.message || "Erreur lors de la recherche B2B"
    }, { status: 500 });
  }
}
```

##### 4. Interface Utilisateur

**Ajout dans Catalogue** : `src/app/catalog/page.tsx`

```typescript
// Nouveau bouton "Rechercher sur B2B"
<Button
  variant="outlined"
  startIcon={<SearchIcon />}
  onClick={() => setB2BSearchOpen(true)}
>
  Rechercher sur B2B
</Button>

// Dialog de recherche B2B
<Dialog open={b2bSearchOpen} onClose={() => setB2BSearchOpen(false)} maxWidth="md" fullWidth>
  <DialogTitle>Rechercher sur les Fournisseurs B2B</DialogTitle>
  <DialogContent>
    <Stack spacing={2}>
      <Select
        value={selectedSupplier}
        onChange={(e) => setSelectedSupplier(e.target.value)}
        label="Fournisseur"
      >
        {suppliers.map(s => (
          <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
        ))}
      </Select>
      
      <TextField
        label="Recherche (nom, SKU, EAN)"
        value={b2bQuery}
        onChange={(e) => setB2BQuery(e.target.value)}
        fullWidth
      />
      
      <Button
        variant="contained"
        onClick={handleB2BSearch}
        disabled={searching}
      >
        {searching ? <CircularProgress size={24} /> : "Rechercher"}
      </Button>
      
      {/* Résultats */}
      {b2bResults.length > 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Image</TableCell>
              <TableCell>Nom</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Prix HT</TableCell>
              <TableCell>Dispo</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {b2bResults.map(product => (
              <TableRow key={product.sku}>
                <TableCell>
                  {product.imageUrl && (
                    <img src={product.imageUrl} alt={product.name} width={50} />
                  )}
                </TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell>{product.priceHT?.toFixed(2)} €</TableCell>
                <TableCell>
                  <Chip 
                    label={product.availability || "?"} 
                    size="small"
                    color={product.availability?.includes("STOCK") ? "success" : "default"}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => importProduct(product)}
                  >
                    Importer
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  </DialogContent>
</Dialog>
```

##### 5. Fonction d'Import

```typescript
async function importProduct(product: ProductSearchResult) {
  // 1. Créer CatalogItem
  const item = await createCatalogItem({
    name: product.name,
    description: product.description,
    ean: product.ean,
    priceHT: product.priceHT,
    // ...
  });
  
  // 2. Créer SupplierItem lié
  await upsertItemSupplierItem(item.id, {
    supplierId: selectedSupplier,
    supplierSku: product.sku,
    ean: product.ean,
  });
  
  // 3. Rafraîchir liste
  refresh();
  
  setToast({ 
    message: `${product.name} importé avec succès !`, 
    severity: "success" 
  });
}
```

### Fonctionnalités Avancées

1. **Cache Intelligent**
   - Mettre en cache les résultats de recherche (15 min)
   - Éviter de surcharger les sites B2B

2. **Recherche Multi-Fournisseurs**
   - Chercher sur tous les fournisseurs en parallèle
   - Comparer les prix automatiquement

3. **Import en Masse**
   - Sélection multiple de produits
   - Import groupé

4. **Synchronisation Auto**
   - Mise à jour automatique des prix (nuit)
   - Notification si rupture de stock

### Temps Estimé
**4-6 jours** par fournisseur (scraping + tests)

---

## 📊 Priorités et Planning

### Phase 1: Stabilisation (Actuel)
- ✅ Corrections bugs
- ✅ Uniformisation affichages
- ✅ Interface paramètres atelier

### Phase 2: Optimisations (Court terme - 1-2 semaines)
- Système de numérotation (C-00001, T-2025-0001, V-00001)
- Performance et optimisations
- Tests utilisateurs

### Phase 3: Multi-Tenancy (Moyen terme - 2-3 mois)
- Architecture multi-tenant
- Onboarding automatisé
- Facturation

### Phase 4: B2B Live Search (Long terme - 3-6 mois)
- Extension connecteurs
- Interface recherche B2B
- Import automatisé

---

## 📝 Notes Techniques

### Multi-Tenancy
- **Prérequis** : Authentification robuste
- **Risques** : Fuite de données entre tenants
- **Tests** : Isolation stricte à valider

### B2B Live Search
- **Prérequis** : Connecteurs stables
- **Risques** : Timeout, blocage IP par fournisseurs
- **Tests** : Rate limiting, retry logic

---

## 🎯 Objectifs Business

### Multi-Tenancy
- **Cible** : 10-50 ateliers
- **Revenus** : 50-200€/mois par atelier
- **ROI** : 6-12 mois

### B2B Live Search
- **Gain de temps** : 70% sur recherche pièces
- **Satisfaction** : Augmentation catalogue
- **Compétitivité** : Meilleurs prix automatiquement

---

**Document de référence pour les améliorations futures** ✅  
**À consulter lors de la planification des prochaines phases** 📅
