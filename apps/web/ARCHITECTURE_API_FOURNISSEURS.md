# 🔑 Architecture API Fournisseurs Multi-Utilisateurs

## 🎯 Objectif

Permettre à chaque utilisateur de configurer ses propres clés API pour accéder à ses fournisseurs personnels.

---

## 🏗️ Architecture Actuelle (Déjà en Place ✅)

### Base de Données

```prisma
// Fournisseur (partagé ou personnel)
model Supplier {
  id            String   @id @default(cuid())
  name          String
  website       String?
  connectorType String   // "P2R", "ALLTRICKS", "BIKE24", etc.
  active        Boolean  @default(true)
  
  credentials SupplierCredential[]  // Credentials par utilisateur
  offers      SupplierOffer[]
}

// Credentials par utilisateur (DÉJÀ EXISTANT ✅)
model SupplierCredential {
  id         String   @id @default(cuid())
  supplierId String
  userId     String   // ← Chaque utilisateur a ses propres credentials
  username   String?
  password   String?  // Chiffré
  extraJson  String?  // Pour API keys, tokens, etc.
  
  supplier Supplier @relation(...)
  
  @@unique([supplierId, userId])  // Un credential par user/supplier
}
```

**✅ C'est déjà multi-utilisateur !**

---

## 🔧 Comment Ça Fonctionne Actuellement

### 1. Fournisseurs Globaux (Catalogue)

**Vous créez** des fournisseurs "template" :
```sql
INSERT INTO "Supplier" (name, connectorType) VALUES
  ('Alltricks B2B', 'ALLTRICKS'),
  ('Bike24 B2B', 'BIKE24'),
  ('P2R Expert', 'P2R');
```

### 2. Chaque Utilisateur Configure Ses Credentials

**User 1** configure ses clés :
```
Alltricks → API Key: user1-key-123
P2R → Login: user1-p2r / Pass: xxx
```

**User 2** configure ses clés :
```
Alltricks → API Key: user2-key-456
Bike24 → API Key: user2-bike24-789
```

### 3. L'API Utilise les Credentials de l'Utilisateur Connecté

```typescript
// Dans /api/suppliers/search
const userId = getUserId(req); // Récupère l'utilisateur connecté

const suppliers = await prisma.supplier.findMany({
  where: { active: true },
  include: {
    credentials: {
      where: { userId }  // ← Seulement SES credentials
    }
  }
});

// Chaque utilisateur voit seulement ses fournisseurs configurés
```

---

## 🎨 Interface Utilisateur

### Page `/suppliers` (Déjà Existante ✅)

**Fonctionnalités actuelles** :
1. ✅ Liste des fournisseurs disponibles
2. ✅ Bouton 🔑 pour configurer credentials
3. ✅ Formulaire : username, password, extraJson

**À améliorer** :
- Ajouter champ "API Key" visible
- Ajouter instructions par fournisseur
- Ajouter test de connexion

---

## 🔐 Stockage Sécurisé des API Keys

### Option 1 : Dans `extraJson` (Actuel)

```typescript
// Sauvegarder
const credentials = {
  username: null,
  password: null,
  extraJson: JSON.stringify({
    apiKey: 'sk_live_123456789',
    apiSecret: 'secret_abc',
    customerId: '12345'
  })
};

// Récupérer
const extra = JSON.parse(credential.extraJson);
const apiKey = extra.apiKey;
```

### Option 2 : Champs Dédiés (Recommandé)

**Modifier le schéma** :
```prisma
model SupplierCredential {
  id         String   @id @default(cuid())
  supplierId String
  userId     String
  
  // Login/Password (pour scraping)
  username   String?
  password   String?  // Chiffré
  
  // API Keys (pour APIs officielles)
  apiKey     String?  // Chiffré
  apiSecret  String?  // Chiffré
  
  // Autres
  extraJson  String?
  
  @@unique([supplierId, userId])
}
```

---

## 🔌 Adapters avec API Keys

### Structure d'un Adapter API

```typescript
// lib/suppliers/alltricks.ts
export class AlltricksAdapter implements SupplierConnector {
  
  async search(options: SearchOptions, credentials?: SupplierCredentials): Promise<SearchResult[]> {
    if (!credentials?.apiKey) {
      throw new Error("Alltricks API key required");
    }
    
    // Utiliser l'API key
    const response = await fetch('https://api.alltricks.com/v1/products/search', {
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: options.query,
        limit: options.limit
      })
    });
    
    const data = await response.json();
    return this.parseResults(data);
  }
}
```

### Utilisation dans l'API

```typescript
// api/suppliers/search/route.ts
const credentials = supplier.credentials?.[0];

const creds = {
  username: credentials?.username,
  password: credentials?.password,
  apiKey: credentials?.extraJson ? JSON.parse(credentials.extraJson).apiKey : null,
  extra: credentials?.extraJson ? JSON.parse(credentials.extraJson) : {}
};

const results = await connector.search(searchOptions, creds);
```

---

## 📋 Workflow Complet

### 1. Admin Ajoute un Fournisseur (Une Fois)

```sql
-- Vous créez le fournisseur "template"
INSERT INTO "Supplier" (name, website, connectorType) VALUES
  ('Alltricks B2B', 'https://www.alltricks.fr', 'ALLTRICKS');
```

### 2. Utilisateur Configure Ses Credentials

**Interface** : http://localhost:3000/suppliers

1. User voit "Alltricks B2B" dans la liste
2. Clique sur 🔑
3. Entre son API Key Alltricks
4. Sauvegarde

**Base de données** :
```sql
INSERT INTO "SupplierCredential" (supplierId, userId, extraJson) VALUES
  ('supplier-id', 'user-id', '{"apiKey": "user-api-key-123"}');
```

### 3. Utilisateur Fait une Recherche B2B

1. User ouvre `/catalog`
2. Clique "Recherche B2B"
3. Tape "shimano"

**Backend** :
```typescript
// Récupère userId depuis session
const userId = getUserId(req);

// Récupère fournisseurs avec SES credentials
const suppliers = await prisma.supplier.findMany({
  include: {
    credentials: { where: { userId } }
  }
});

// Pour chaque fournisseur avec credentials
suppliers.forEach(supplier => {
  if (supplier.credentials.length > 0) {
    // Utilise SES credentials pour chercher
    const results = await connector.search(query, supplier.credentials[0]);
  }
});
```

---

## 🎯 Améliorations Interface

### Page `/suppliers` Améliorée

```typescript
// Ajouter champ API Key visible
<Dialog open={credOpen}>
  <DialogTitle>
    Configurer {credSupplier?.name}
  </DialogTitle>
  <DialogContent>
    {/* Instructions spécifiques */}
    <Alert severity="info">
      Pour obtenir votre API key Alltricks :
      1. Connectez-vous sur alltricks.fr/pro
      2. Allez dans "Mon compte" → "API"
      3. Générez une nouvelle clé
    </Alert>
    
    {/* Formulaire adapté au type */}
    {credSupplier?.connectorType === 'ALLTRICKS' && (
      <TextField
        label="API Key"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        type="password"
        fullWidth
      />
    )}
    
    {credSupplier?.connectorType === 'P2R' && (
      <>
        <TextField label="Numéro client" value={username} />
        <TextField label="Mot de passe" type="password" value={password} />
      </>
    )}
    
    {/* Test de connexion */}
    <Button onClick={testConnection}>
      Tester la connexion
    </Button>
  </DialogContent>
</Dialog>
```

---

## 🔒 Sécurité

### 1. Chiffrement des Credentials

**Déjà implémenté** : `lib/crypto.ts`

```typescript
import { encrypt, decrypt } from '@/lib/crypto';

// Sauvegarder
const encryptedApiKey = encrypt(apiKey);
await prisma.supplierCredential.create({
  data: {
    apiKey: encryptedApiKey
  }
});

// Utiliser
const apiKey = decrypt(credential.apiKey);
```

### 2. Isolation par Utilisateur

**Déjà implémenté** : `@@unique([supplierId, userId])`

Chaque utilisateur a ses propres credentials, jamais partagés.

### 3. Permissions

```typescript
// Vérifier que l'utilisateur modifie SES credentials
const credential = await prisma.supplierCredential.findUnique({
  where: {
    supplierId_userId: {
      supplierId,
      userId: currentUserId
    }
  }
});

if (!credential) {
  return NextResponse.json({ error: "unauthorized" }, { status: 403 });
}
```

---

## 📊 Scénarios d'Usage

### Scénario 1 : Atelier Solo

**Vous** :
- Configurez vos fournisseurs
- Vos API keys
- Recherche B2B avec vos prix

### Scénario 2 : Plusieurs Ateliers (Multi-Tenant)

**Atelier A** :
- Fournisseurs : Alltricks (API key A), P2R (login A)
- Voit ses prix négociés

**Atelier B** :
- Fournisseurs : Bike24 (API key B), P2R (login B)
- Voit ses prix négociés

**Isolation totale** ✅

### Scénario 3 : Fournisseurs Partagés

**Admin** crée des fournisseurs "publics" :
- Alltricks (sans credentials)
- P2R (sans credentials)

**Chaque utilisateur** configure ses propres credentials :
- User 1 → Ses clés Alltricks
- User 2 → Ses clés Alltricks (différentes)

---

## 🚀 Plan d'Implémentation

### Phase 1 : Améliorer Interface (1h)

1. **Page `/suppliers`** :
   - Ajouter champ "API Key" visible
   - Instructions par fournisseur
   - Bouton "Tester connexion"

2. **Formulaire adaptatif** :
   - Si `connectorType === 'ALLTRICKS'` → Champ API Key
   - Si `connectorType === 'P2R'` → Login/Password
   - Si `connectorType === 'BIKE24'` → API Key

### Phase 2 : Créer Adapters API (Par fournisseur)

**Quand vous recevez une API** :

1. **Créer adapter** :
   ```typescript
   // lib/suppliers/alltricks-api.ts
   export class AlltricksAPIAdapter implements SupplierConnector {
     async search(options, credentials) {
       // Utiliser credentials.apiKey
     }
   }
   ```

2. **Enregistrer dans API** :
   ```typescript
   switch (supplier.connectorType) {
     case 'ALLTRICKS':
       connector = new AlltricksAPIAdapter();
       break;
   }
   ```

3. **Tester** :
   ```bash
   node test-supplier-api.js alltricks
   ```

### Phase 3 : Documentation Utilisateur

**Guide** : "Comment configurer vos fournisseurs"

1. Obtenir API key chez fournisseur
2. Aller sur `/suppliers`
3. Cliquer 🔑
4. Entrer API key
5. Tester
6. Sauvegarder

---

## ✅ Résumé

### Ce Qui Est Déjà Prêt ✅

1. ✅ Base de données multi-utilisateur
2. ✅ Credentials par utilisateur
3. ✅ Chiffrement
4. ✅ Interface de configuration
5. ✅ API qui utilise les credentials

### Ce Qu'Il Faut Faire

1. ⏳ Améliorer formulaire (champ API Key visible)
2. ⏳ Créer adapters API (quand vous avez les clés)
3. ⏳ Ajouter test de connexion
4. ⏳ Documentation utilisateur

---

## 🎯 Prochaines Étapes

1. **Contactez vos fournisseurs** pour obtenir les API
2. **Donnez-moi les docs API** quand vous les avez
3. **Je crée les adapters** en 30 min par fournisseur
4. **Vous testez** avec vos vraies clés

---

**Architecture prête** ✅  
**Multi-utilisateur natif** ✅  
**Sécurisé** ✅  
**Extensible** ✅
