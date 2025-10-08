# 📱 Scanner de Code-Barres - Améliorations

## ✨ Nouvelles fonctionnalités

### Recherche sur sites vélo spécialisés

Le scanner interroge maintenant **7 sources de données** au lieu de 3 :

#### Étape 1 : APIs publiques (rapide, ~1 seconde)
1. **Open Food Facts** - Produits alimentaires
2. **Open Product Data** - Base générale
3. **UPC Item DB** - Base internationale

#### Étape 2 : Sites vélo (fallback, ~3-5 secondes)
Si le produit n'est pas trouvé dans les APIs publiques :

4. **Alltricks** - Recherche produit vélo
5. **Probikeshop** - Recherche produit vélo
6. **Bike24** - Recherche produit vélo
7. **Decathlon** - Recherche produit vélo

---

## 🎯 Amélioration du taux de succès

### Avant (APIs publiques uniquement)
- ✅ Produits alimentaires : ~90%
- ⚠️ Produits vélo : ~10-20%
- ❌ Pièces vélo spécialisées : ~5%

### Après (avec sites vélo)
- ✅ Produits alimentaires : ~90%
- ✅ Produits vélo emballés : ~50-60% (estimé)
- ⚠️ Pièces vélo spécialisées : ~20-30% (estimé)

💡 **Gain estimé** : +30-40% de taux de succès sur les produits vélo

---

## ⚙️ Fonctionnement technique

### Recherche en cascade avec validation

```
1. Scanner le code-barres
   ↓
2. Recherche parallèle dans 3 APIs publiques (rapide)
   ↓
3. Résultat trouvé ?
   ├─ OUI → Retourner immédiatement
   └─ NON → Continuer
   ↓
4. Demander confirmation à l'utilisateur
   "Voulez-vous chercher sur les sites spécialisés vélo ?"
   ├─ OUI → Continuer
   └─ NON → Retourner "non trouvé"
   ↓
5. Recherche séquentielle sur sites vélo (plus lent)
   • Alltricks → Trouvé ? Retourner
   • Probikeshop → Trouvé ? Retourner
   • Bike24 → Trouvé ? Retourner
   • Decathlon → Trouvé ? Retourner
   ↓
6. Rien trouvé → Retourner "non trouvé"
```

### Temps de réponse

| Scénario | Temps |
|----------|-------|
| Trouvé dans APIs publiques | ~1-2 sec |
| Non trouvé + utilisateur refuse sites vélo | ~2 sec |
| Non trouvé + utilisateur accepte + trouvé sur Alltricks | ~4-5 sec |
| Non trouvé + utilisateur accepte + trouvé sur Decathlon | ~6-8 sec |
| Non trouvé partout | ~10-12 sec |

---

## ⚠️ Limitations

### Technique

1. **Scraping web** - Fragile, peut casser si les sites changent
2. **Pas d'API officielle** - Dépend de la structure HTML des sites
3. **Rate limiting** - Les sites peuvent bloquer si trop de requêtes
4. **Timeout** - 3 secondes max par site pour éviter les blocages

### Légalité

- ✅ **Usage personnel** - OK
- ⚠️ **Usage commercial** - Zone grise
- ❌ **Revente de données** - Interdit

💡 **Recommandation** : Utiliser avec modération (quelques scans par jour, pas des centaines)

### Protection contre les abus

- ✅ **Confirmation utilisateur** - Demande explicite avant de chercher sur les sites
- ✅ **Timeout de 3 secondes** - Évite les blocages prolongés
- ✅ **Recherche séquentielle** - Un site à la fois (pas de surcharge)
- ✅ **Opt-in** - L'utilisateur choisit d'activer la recherche étendue

---

## 🔧 Configuration

### Désactiver les sites vélo

Si vous voulez utiliser uniquement les APIs publiques (plus rapide, plus fiable) :

Éditer `src/app/api/catalog/barcode/route.ts` :

```typescript
// Commenter cette ligne
// const bikeResult = await lookupBikeRetailers(barcode);
```

### Ajouter d'autres sites

Pour ajouter un site vélo :

```typescript
const retailers = [
  { name: 'Alltricks', domain: 'alltricks.fr', lang: 'fr' },
  { name: 'Probikeshop', domain: 'probikeshop.fr', lang: 'fr' },
  { name: 'Bike24', domain: 'bike24.com', lang: 'en' },
  { name: 'Decathlon', domain: 'decathlon.fr', lang: 'fr' },
  // Ajouter ici
  { name: 'ChainReactionCycles', domain: 'chainreactioncycles.com', lang: 'en' },
];
```

---

## 📊 Monitoring

### Logs utiles

Les logs serveur affichent :
```
Barcode 1234567890123 not found in public APIs, trying bike retailers...
```

Cela indique que la recherche sur sites vélo a été déclenchée.

### Statistiques à suivre

- Nombre de scans total
- Taux de succès APIs publiques
- Taux de succès sites vélo
- Temps de réponse moyen

---

## 🚀 Améliorations futures possibles

### Court terme
- [ ] Cache des résultats (éviter de re-scanner le même code-barres)
- [ ] Meilleure extraction HTML (plus robuste)
- [ ] Timeout configurable

### Moyen terme
- [ ] APIs officielles si disponibles (Alltricks, Decathlon)
- [ ] Machine learning pour améliorer l'extraction
- [ ] Base de données interne de mappings

### Long terme
- [ ] Partenariats avec fournisseurs
- [ ] Import catalogues fournisseurs
- [ ] Synchronisation automatique des prix

---

## 💡 Conseils d'utilisation

### Pour maximiser le taux de succès

1. **Scanner des produits emballés** - Plus de chances d'être référencés
2. **Produits de grandes marques** - Mieux référencés
3. **Produits récents** - Plus de chances d'être en ligne

### Si le produit n'est pas trouvé

1. **Vérifier le code-barres** - Bien scanné ?
2. **Essayer la saisie manuelle** - Peut-être une erreur de scan
3. **Chercher sur Google** - `code-barres 1234567890123`
4. **Ajouter manuellement** - Le code-barres est quand même capturé

---

## 🐛 Problèmes connus

### Sites qui bloquent

Certains sites peuvent bloquer les requêtes automatiques :
- **Solution** : Timeout de 3 secondes, on passe au suivant
- **Impact** : Temps de réponse un peu plus long

### Extraction imparfaite

Le nom extrait peut être incomplet ou contenir du texte parasite :
- **Solution** : Nettoyage automatique du texte
- **Impact** : Toujours vérifier le nom avant d'enregistrer

### Changements de structure HTML

Les sites peuvent changer leur HTML :
- **Solution** : Multiples patterns de détection
- **Impact** : Peut nécessiter une mise à jour du code

---

**Version** : 1.1.0  
**Date** : 2025-10-08  
**Amélioration** : +4 sources de données (sites vélo)

---

**📱 Bon scan ! 🚴‍♂️**
