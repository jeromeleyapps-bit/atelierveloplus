# 🔍 Diagnostic Problème Fournisseurs B2B

## 🐛 Problème Rapporté

**Symptôme** : Aucune proposition de pièces lors de la recherche par nom ou EAN, malgré :
- Site web B2B configuré
- Identifiants corrects (connexion manuelle fonctionne)
- Recherche par nom de pièce ou EAN

---

## 🔎 Analyse du Système Actuel

### Architecture des Connecteurs

Le système utilise des **connecteurs** (scrapers) pour interroger les sites B2B :

```
Catalogue → Recherche pièce → API /suppliers/search
                                ↓
                         Cherche dans SupplierItem (BDD locale)
                                ↓
                         Retourne offres existantes
```

**PROBLÈME IDENTIFIÉ** : La recherche ne va PAS chercher sur le site B2B en temps réel !

---

## 🎯 Fonctionnement Actuel

### 1. Table `SupplierItem` (Base de Données)
```sql
SupplierItem {
  id
  supplierId
  supplierSku     -- Référence fournisseur
  ean             -- Code-barres
  catalogItemId   -- Lien vers article catalogue (optionnel)
  lastPriceHT     -- Dernier prix connu
  lastAvailability -- Dernière dispo connue
  lastCheckedAt   -- Dernière vérification
}
```

### 2. API `/suppliers/search` (Ligne 28-37)
```typescript
const items = await prisma.supplierItem.findMany({
  where: { OR: [
    { supplierSku: { contains: q } },
    { ean: { contains: q } },
    { catalogItem: { name: { contains: q } } }
  ]},
  include: { supplier: true, catalogItem: true }
});
```

**➡️ Cherche UNIQUEMENT dans la base de données locale !**

### 3. Connecteurs B2B (FourMyBike, RCZ, etc.)
```typescript
// Utilisés SEULEMENT pour:
// - Rafraîchir les prix d'articles DÉJÀ liés
// - Via /api/catalog/items/[id]/offers/refresh
```

---

## 🚨 Pourquoi Ça Ne Marche Pas

### Scénario Actuel

1. **Vous cherchez** : "Chaîne Shimano" ou EAN "123456789"
2. **API cherche** : Dans `SupplierItem` de la BDD
3. **Résultat** : Rien (car aucune entrée n'existe encore)
4. **Connecteur B2B** : ❌ Jamais appelé !

### Ce Qui Manque

**Il n'y a PAS de fonction pour :**
- Chercher en temps réel sur le site B2B
- Importer automatiquement les résultats
- Créer des `SupplierItem` depuis une recherche

---

## ✅ Solutions Proposées

### Solution 1: Recherche Hybride (Recommandée)

**Principe** : Chercher d'abord en local, puis sur le B2B si rien trouvé

```typescript
// Modifier /api/suppliers/search/route.ts

export async function GET(req: Request) {
  const q = searchParams.get("q");
  
  // 1. Chercher en local (rapide)
  const localItems = await prisma.supplierItem.findMany({
    where: { OR: [...] }
  });
  
  // 2. Si rien trouvé ET recherche par EAN, chercher sur B2B
  if (localItems.length === 0 && isEAN(q)) {
    const b2bResults = await searchOnSuppliers(q);
    // Créer SupplierItem temporaires ou les sauvegarder
    return { offers: b2bResults, source: 'b2b' };
  }
  
  return { offers: localItems, source: 'local' };
}
```

**Avantages** :
- ✅ Rapide (cache local)
- ✅ Recherche B2B en fallback
- ✅ Pas de changement d'interface

**Inconvénients** :
- ⚠️ Recherche B2B lente (10-30s)
- ⚠️ Nécessite timeout élevé côté client

---

### Solution 2: Import Manuel Fournisseur

**Principe** : Bouton "Importer depuis [Fournisseur]" dans le catalogue

```
Catalogue → [Importer depuis 4MyBike]
              ↓
         Dialog: Rechercher pièce
              ↓
         Appel B2B en temps réel
              ↓
         Affichage résultats
              ↓
         Sélection → Création SupplierItem
```

**Avantages** :
- ✅ Contrôle utilisateur
- ✅ Feedback visuel (loading)
- ✅ Pas de timeout surprise

**Inconvénients** :
- ⚠️ Étape supplémentaire
- ⚠️ Nécessite nouvelle UI

---

### Solution 3: Synchronisation Catalogue Fournisseur

**Principe** : Import en masse du catalogue fournisseur

```
Fournisseurs → [Synchroniser catalogue]
                  ↓
            Télécharge catalogue complet (CSV/API)
                  ↓
            Importe tous les SupplierItem
                  ↓
            Recherche locale ultra-rapide
```

**Avantages** :
- ✅ Recherche instantanée
- ✅ Pas de latence B2B
- ✅ Hors-ligne possible

**Inconvénients** :
- ⚠️ Nécessite API catalogue fournisseur
- ⚠️ Stockage important
- ⚠️ Synchronisation régulière

---

## 🔧 Solution Immédiate (Quick Fix)

### Ajouter Endpoint de Recherche B2B

**Nouveau fichier** : `/api/suppliers/[id]/search-b2b/route.ts`

```typescript
import { FourMyBikeConnector } from "@/lib/suppliers/fourmybike";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { query } = await req.json(); // EAN ou SKU
  const supplierId = params.id;
  
  // 1. Récupérer fournisseur et credentials
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  const cred = await prisma.supplierCredential.findFirst({ 
    where: { supplierId, userId } 
  });
  
  // 2. Appeler connecteur
  const connector = new FourMyBikeConnector();
  const result = await connector.searchProducts({
    supplier,
    credentials: cred,
    query
  });
  
  // 3. Retourner résultats bruts (sans sauvegarder)
  return NextResponse.json({ results: result });
}
```

**Problème** : Les connecteurs actuels n'ont PAS de méthode `searchProducts()` !
Ils ont seulement `checkAvailability()` qui nécessite un SKU connu.

---

## 🎯 Vraie Cause du Problème

### Les Connecteurs Sont Incomplets !

```typescript
// Connecteur actuel
interface SupplierConnector {
  checkAvailability(input: LookupInput): Promise<AvailabilityResult>;
  // ❌ Pas de méthode de recherche !
}

// Ce qu'il faudrait
interface SupplierConnector {
  checkAvailability(input: LookupInput): Promise<AvailabilityResult>;
  searchProducts(query: string): Promise<ProductResult[]>; // ✅ MANQUANT
}
```

---

## 💡 Recommandations

### Option A: Extension des Connecteurs (Idéal)

1. **Ajouter méthode `searchProducts()`** aux connecteurs
2. **Implémenter scraping de recherche** pour chaque fournisseur
3. **Créer endpoint `/api/suppliers/search-live`**
4. **Ajouter bouton "Rechercher sur B2B"** dans l'interface

**Temps estimé** : 4-6 heures par fournisseur

### Option B: Workflow Manuel (Pragmatique)

1. **Créer page "Import Fournisseur"**
2. **Upload CSV** du catalogue fournisseur
3. **Mapping colonnes** (SKU, EAN, Prix, Nom)
4. **Import en masse** dans `SupplierItem`
5. **Recherche locale** ultra-rapide ensuite

**Temps estimé** : 2-3 heures

### Option C: API Fournisseur (Si disponible)

1. **Vérifier si 4MyBike/RCZ ont une API**
2. **Utiliser API au lieu de scraping**
3. **Recherche en temps réel** fiable

**Temps estimé** : Variable selon documentation API

---

## 🔍 Diagnostic de Votre Cas Spécifique

### Questions à Vérifier

1. **Avez-vous des `SupplierItem` en base ?**
   ```sql
   SELECT COUNT(*) FROM "SupplierItem";
   ```
   Si 0 → Normal que rien ne s'affiche

2. **Le fournisseur est-il créé ?**
   ```sql
   SELECT * FROM "Supplier";
   ```

3. **Les credentials sont-ils sauvegardés ?**
   ```sql
   SELECT * FROM "SupplierCredential";
   ```

4. **Le connecteur est-il le bon ?**
   - 4mybike.de → `FOURMYBIKE`
   - rczbikeshop.fr → `RCZBIKESHOP`

---

## 🚀 Plan d'Action Recommandé

### Phase 1: Diagnostic (Maintenant)
1. ✅ Vérifier tables BDD (voir ci-dessus)
2. ✅ Tester connecteur manuellement
3. ✅ Vérifier logs erreurs

### Phase 2: Quick Win (1-2h)
1. **Créer manuellement quelques `SupplierItem`**
   - Via SQL ou interface admin
   - Pour tester que la recherche locale fonctionne

### Phase 3: Solution Pérenne (4-6h)
1. **Option B** : Import CSV catalogue
   - Demander export catalogue au fournisseur
   - Créer page d'import
   - Mapper et importer

OU

1. **Option A** : Étendre connecteurs
   - Ajouter `searchProducts()`
   - Implémenter scraping recherche
   - Créer endpoint live

---

## 📝 Code Exemple: Test Manuel Connecteur

```typescript
// Test dans console Node.js ou route API
import { FourMyBikeConnector } from "@/lib/suppliers/fourmybike";

const connector = new FourMyBikeConnector();

const result = await connector.checkAvailability({
  supplier: {
    id: "xxx",
    name: "4MyBike",
    connectorType: "FOURMYBIKE"
  },
  credentials: {
    username: "votre_email",
    password: "votre_mdp",
    extra: {
      loginUrl: "https://4mybike.de/account/login",
      searchUrl: "https://4mybike.de/search",
      // ... autres configs
    }
  },
  sku: "SHIMANO-CN-HG601-11V", // SKU connu
  ean: null
});

console.log(result);
// Si ça retourne prix/dispo → Connecteur fonctionne
// Si null → Problème de scraping ou credentials
```

---

## 🎯 Conclusion

**Le problème n'est PAS vos identifiants !**

**Le vrai problème** : Le système actuel ne peut PAS chercher sur les sites B2B.
Il cherche seulement dans les articles déjà importés en base.

**Solutions** :
1. **Court terme** : Importer manuellement quelques articles
2. **Moyen terme** : Import CSV catalogue fournisseur
3. **Long terme** : Étendre connecteurs avec recherche live

---

**Voulez-vous que j'implémente une de ces solutions ?** 🚀

**Ou préférez-vous d'abord tester manuellement le connecteur ?** 🔧
