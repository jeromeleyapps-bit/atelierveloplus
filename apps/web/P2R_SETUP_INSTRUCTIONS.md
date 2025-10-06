# 🔧 Configuration P2R - Instructions

## ✅ Adapter P2R Créé !

L'adapter P2R a été créé et intégré dans l'application.

---

## 📋 Étapes de Configuration

### Étape 1 : Ajouter P2R comme Fournisseur

1. **Ouvrir** : http://localhost:3000/suppliers

2. **Cliquer** : "Ajouter un fournisseur"

3. **Remplir** :
   - **Nom** : `P2R Expert`
   - **Site web** : `https://www.p2r-expert.com`
   - **Type de connecteur** : Changer de `MOCK` à `P2R`

4. **Cliquer** : "Créer"

---

### Étape 2 : Configurer les Credentials

1. **Trouver** le fournisseur "P2R Expert" dans la liste

2. **Cliquer** sur l'icône 🔑 (clé) à côté

3. **Remplir** :
   - **Nom d'utilisateur** : Votre email P2R
   - **Mot de passe** : Votre mot de passe P2R
   - **Extra JSON** : Laisser vide

4. **Cliquer** : "Enregistrer"

---

### Étape 3 : Tester la Recherche B2B

1. **Ouvrir** : http://localhost:3000/catalog

2. **Cliquer** : "Recherche B2B"

3. **Taper** : Un terme de recherche (ex: "shimano", "pneu", "chaîne")

4. **Cliquer** : "Rechercher"

**Résultat attendu** :
- Produits P2R affichés avec les vrais prix
- Disponibilité réelle
- Images des produits
- Lien vers P2R

---

## 🔍 Comment Fonctionne l'Adapter P2R

### 1. Connexion
```
1. L'adapter se connecte à P2R avec vos credentials
2. Récupère un cookie de session
3. Utilise ce cookie pour les recherches
```

### 2. Recherche
```
1. Envoie la requête de recherche à P2R
2. Parse le HTML de la page de résultats
3. Extrait : nom, prix, référence, disponibilité, image
4. Retourne les produits formatés
```

### 3. Affichage
```
1. Les produits P2R s'affichent avec les autres fournisseurs
2. Triés par prix
3. Avec badge "P2R Expert"
```

---

## ⚠️ Important : Type de Connecteur

**ATTENTION** : Vous devez changer le type de connecteur de `MOCK` à `P2R` !

### Comment Modifier un Fournisseur Existant

Si vous avez déjà créé P2R avec type MOCK :

1. **Option A : Via Base de Données**
   ```sql
   UPDATE "Supplier" 
   SET "connectorType" = 'P2R' 
   WHERE name = 'P2R Expert';
   ```

2. **Option B : Supprimer et Recréer**
   - Supprimer le fournisseur P2R
   - Le recréer avec type `P2R`

---

## 🧪 Test de Vérification

### Test 1 : Vérifier le Type
```sql
-- Exécuter dans psql
SELECT id, name, "connectorType", active 
FROM "Supplier" 
WHERE name LIKE '%P2R%';
```

**Résultat attendu** :
```
connectorType = 'P2R'
active = true
```

---

### Test 2 : Vérifier les Credentials
```sql
-- Exécuter dans psql
SELECT sc.id, s.name, sc.username 
FROM "SupplierCredential" sc
JOIN "Supplier" s ON s.id = sc."supplierId"
WHERE s.name LIKE '%P2R%';
```

**Résultat attendu** :
```
username = votre_email@example.com
```

---

### Test 3 : Test API Direct

Créer un fichier `test-p2r.js` :

```javascript
const fetch = require('node-fetch');

async function testP2R() {
  const response = await fetch('http://localhost:3000/api/suppliers/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'shimano', limit: 10 })
  });

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
  
  // Vérifier qu'il y a des résultats P2R
  const p2rResults = data.results?.filter(r => r.supplierName.includes('P2R'));
  console.log(`\nRésultats P2R: ${p2rResults?.length || 0}`);
}

testP2R();
```

Exécuter :
```bash
node test-p2r.js
```

---

## 🐛 Dépannage

### Problème : Aucun résultat P2R

**Causes possibles** :
1. Type de connecteur = MOCK au lieu de P2R
2. Credentials incorrects
3. P2R a changé leur HTML

**Solution** :
```sql
-- Vérifier le type
SELECT "connectorType" FROM "Supplier" WHERE name LIKE '%P2R%';

-- Si MOCK, changer en P2R
UPDATE "Supplier" SET "connectorType" = 'P2R' WHERE name LIKE '%P2R%';
```

---

### Problème : Erreur de connexion

**Causes possibles** :
1. Email/mot de passe incorrect
2. Compte P2R bloqué
3. P2R a changé leur système de login

**Solution** :
1. Vérifier credentials sur https://www.p2r-expert.com
2. Tester connexion manuelle
3. Vérifier les logs de l'API

---

### Problème : Produits mal formatés

**Cause** : P2R a changé leur HTML

**Solution** :
- Me donner un exemple de page de résultats P2R
- Je mettrai à jour le parser HTML

---

## 📊 Résumé

### ✅ Ce Qui Est Fait
- Adapter P2R créé
- Intégré dans l'API
- Gestion credentials
- Parse HTML P2R
- Extraction produits

### 🎯 Ce Que Vous Devez Faire
1. Ajouter P2R avec type `P2R` (pas MOCK)
2. Configurer vos credentials
3. Tester la recherche

---

## 🚀 Prochaines Étapes

Une fois P2R fonctionnel :
1. Tester avec différents termes de recherche
2. Vérifier la précision des prix
3. Valider la disponibilité
4. Ajuster le parser si nécessaire

---

**Adapter P2R prêt** ✅  
**Configuration requise** : Type = P2R + Credentials  
**Test** : Recherche B2B dans catalogue
