# 🔍 B2B Live Search - Plan d'Implémentation

## 🎯 Objectif

Permettre la recherche en temps réel de pièces détachées directement chez les fournisseurs B2B depuis l'interface catalogue.

---

## 🏗️ Architecture

### Fournisseurs Supportés (Phase 1)

1. **Alltricks B2B** - API REST
2. **Bike24 B2B** - API REST
3. **Probikeshop B2B** - API REST
4. **Extensible** - Architecture pour ajouter d'autres fournisseurs

---

## 📊 Schéma de Données

### Nouvelles Tables

```prisma
// Fournisseurs B2B
model Supplier {
  id          String   @id @default(cuid())
  name        String   @unique
  apiUrl      String?
  apiKey      String?  // Chiffré
  isActive    Boolean  @default(true)
  priority    Int      @default(0)
  createdAt   DateTime @default(now())
  
  credentials SupplierCredential[]
  offers      SupplierOffer[]
  
  @@index([isActive])
}

// Credentials par utilisateur (multi-tenant ready)
model SupplierCredential {
  id         String   @id @default(cuid())
  supplierId String
  userId     String
  username   String?
  password   String?  // Chiffré
  apiKey     String?  // Chiffré
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  supplier Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  
  @@unique([supplierId, userId])
  @@index([userId])
}

// Offres fournisseurs (cache)
model SupplierOffer {
  id            String   @id @default(cuid())
  supplierId    String
  catalogItemId String?
  externalId    String?  // ID chez le fournisseur
  name          String
  description   String?
  reference     String?
  brand         String?
  price         Float
  priceHT       Float?
  currency      String   @default("EUR")
  availability  String?  // "in_stock", "out_of_stock", "on_order"
  stock         Int?
  deliveryDays  Int?
  url           String?
  imageUrl      String?
  metadata      String?  // JSON pour données spécifiques
  fetchedAt     DateTime @default(now())
  expiresAt     DateTime // Cache expiration
  
  supplier    Supplier     @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  catalogItem CatalogItem? @relation(fields: [catalogItemId], references: [id], onDelete: SetNull)
  
  @@index([supplierId])
  @@index([catalogItemId])
  @@index([externalId])
  @@index([fetchedAt])
  @@index([expiresAt])
}

// Ajouter relation dans CatalogItem
model CatalogItem {
  // ... champs existants
  
  supplierOffers SupplierOffer[]
}
```

---

## 🔌 Architecture API

### Structure

```
src/app/api/
├── suppliers/
│   ├── route.ts                    # GET /api/suppliers (liste)
│   ├── [id]/
│   │   ├── route.ts                # GET/PUT/DELETE /api/suppliers/:id
│   │   ├── credentials/
│   │   │   └── route.ts            # GET/POST /api/suppliers/:id/credentials
│   │   └── search/
│   │       └── route.ts            # POST /api/suppliers/:id/search
│   └── search/
│       └── route.ts                # POST /api/suppliers/search (tous)
└── catalog/
    └── items/
        └── [id]/
            └── offers/
                ├── route.ts        # GET /api/catalog/items/:id/offers
                └── refresh/
                    └── route.ts    # POST /api/catalog/items/:id/offers/refresh
```

---

## 🔐 Sécurité

### Chiffrement des Credentials

```typescript
// lib/crypto.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(SECRET_KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

---

## 🔍 Système de Recherche

### Workflow

```
1. Utilisateur tape "shimano deore"
2. Frontend envoie requête à /api/suppliers/search
3. Backend:
   a. Vérifie cache (< 1h)
   b. Si cache valide → Retourne résultats
   c. Si cache expiré → Appelle APIs fournisseurs en parallèle
   d. Stocke résultats en cache
   e. Retourne résultats agrégés
4. Frontend affiche résultats triés par prix
```

### API Unifiée

```typescript
// lib/suppliers/base.ts
export interface SupplierAdapter {
  name: string;
  search(query: string, credentials?: SupplierCredential): Promise<SupplierOffer[]>;
  getProduct(externalId: string, credentials?: SupplierCredential): Promise<SupplierOffer>;
  checkAvailability(externalId: string, credentials?: SupplierCredential): Promise<{
    available: boolean;
    stock?: number;
    deliveryDays?: number;
  }>;
}

// lib/suppliers/alltricks.ts
export class AlltricksAdapter implements SupplierAdapter {
  name = 'Alltricks';
  
  async search(query: string, credentials?: SupplierCredential): Promise<SupplierOffer[]> {
    // Implémentation spécifique Alltricks
  }
  
  // ...
}

// lib/suppliers/index.ts
export const SUPPLIERS: Record<string, SupplierAdapter> = {
  alltricks: new AlltricksAdapter(),
  bike24: new Bike24Adapter(),
  probikeshop: new ProbikeshopAdapter(),
};
```

---

## 🎨 Interface Utilisateur

### Page Catalogue Améliorée

```typescript
// src/app/catalog/page.tsx

// Nouveau bouton "Rechercher chez fournisseurs"
<Button 
  variant="outlined" 
  startIcon={<SearchIcon />}
  onClick={() => setShowB2BSearch(true)}
>
  Rechercher B2B
</Button>

// Dialog de recherche B2B
<Dialog open={showB2BSearch} maxWidth="lg" fullWidth>
  <DialogTitle>Recherche Fournisseurs B2B</DialogTitle>
  <DialogContent>
    <TextField
      fullWidth
      placeholder="Ex: shimano deore, pneu 26 pouces..."
      value={b2bQuery}
      onChange={(e) => setB2BQuery(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && searchB2B()}
    />
    
    {loading && <LinearProgress />}
    
    {results.length > 0 && (
      <Grid container spacing={2} sx={{ mt: 2 }}>
        {results.map(offer => (
          <Grid item xs={12} sm={6} md={4} key={offer.id}>
            <Card>
              <CardMedia
                component="img"
                height="140"
                image={offer.imageUrl || '/placeholder.png'}
              />
              <CardContent>
                <Typography variant="h6">{offer.name}</Typography>
                <Typography color="text.secondary">
                  {offer.brand} - {offer.reference}
                </Typography>
                <Typography variant="h5" color="primary">
                  {offer.price.toFixed(2)} €
                </Typography>
                <Chip 
                  label={offer.availability} 
                  color={offer.availability === 'in_stock' ? 'success' : 'warning'}
                  size="small"
                />
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  onClick={() => addToCatalog(offer)}
                >
                  Ajouter au catalogue
                </Button>
                <Button 
                  size="small" 
                  href={offer.url} 
                  target="_blank"
                >
                  Voir chez fournisseur
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    )}
  </DialogContent>
</Dialog>
```

---

## 📋 Plan d'Implémentation (3 jours)

### Jour 1 : Schéma et Infrastructure

**Matin** :
- [ ] Ajouter tables au schéma Prisma
- [ ] Créer migration
- [ ] Tester schéma

**Après-midi** :
- [ ] Créer `lib/crypto.ts` (chiffrement)
- [ ] Créer `lib/suppliers/base.ts` (interface)
- [ ] Créer structure API routes

---

### Jour 2 : Adapters Fournisseurs

**Matin** :
- [ ] Implémenter `AlltricksAdapter`
- [ ] Tester recherche Alltricks
- [ ] Gérer erreurs et timeouts

**Après-midi** :
- [ ] Implémenter `Bike24Adapter`
- [ ] Implémenter `ProbikeshopAdapter`
- [ ] Tests unitaires adapters

---

### Jour 3 : Interface et Intégration

**Matin** :
- [ ] Créer dialog recherche B2B
- [ ] Intégrer dans page catalogue
- [ ] Affichage résultats

**Après-midi** :
- [ ] Fonction "Ajouter au catalogue"
- [ ] Cache et optimisations
- [ ] Tests end-to-end
- [ ] Documentation

---

## 🧪 Tests

### Tests Unitaires

```typescript
// __tests__/suppliers/alltricks.test.ts
describe('AlltricksAdapter', () => {
  it('should search products', async () => {
    const adapter = new AlltricksAdapter();
    const results = await adapter.search('shimano deore');
    
    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('name');
    expect(results[0]).toHaveProperty('price');
  });
  
  it('should handle errors gracefully', async () => {
    const adapter = new AlltricksAdapter();
    const results = await adapter.search('');
    
    expect(results).toEqual([]);
  });
});
```

---

## 🚀 Fonctionnalités Avancées (Phase 2)

### 1. Comparateur de Prix
- Afficher tous les fournisseurs côte à côte
- Tri par prix, disponibilité, délai

### 2. Historique des Prix
- Tracker l'évolution des prix
- Alertes baisse de prix

### 3. Commande Automatique
- Passer commande directement depuis l'app
- Suivi de commande

### 4. Synchronisation Stock
- Mise à jour automatique du stock
- Alertes rupture

---

## 📊 Métriques

### KPIs à Tracker

- Nombre de recherches B2B
- Taux de conversion (recherche → ajout catalogue)
- Temps de réponse moyen
- Fournisseur le plus utilisé
- Économies réalisées

---

## 🔒 Variables d'Environnement

```env
# .env
ENCRYPTION_KEY=your-32-byte-hex-key-here

# Credentials fournisseurs (optionnel, peut être en DB)
ALLTRICKS_API_KEY=xxx
BIKE24_API_KEY=xxx
PROBIKESHOP_API_KEY=xxx
```

---

## 📝 Documentation Utilisateur

### Guide Rapide

1. **Configurer les fournisseurs** :
   - Aller dans Paramètres → Fournisseurs
   - Ajouter vos identifiants B2B

2. **Rechercher une pièce** :
   - Catalogue → "Rechercher B2B"
   - Taper le nom de la pièce
   - Comparer les offres

3. **Ajouter au catalogue** :
   - Cliquer sur "Ajouter au catalogue"
   - Ajuster les informations si besoin
   - Sauvegarder

---

**Temps estimé** : 3 jours  
**Complexité** : Moyenne-Haute  
**Impact** : Très élevé (gain de temps énorme)  
**Prêt à commencer** : ✅
