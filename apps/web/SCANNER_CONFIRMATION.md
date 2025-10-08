# 📱 Scanner - Confirmation Recherche Étendue

## 🎯 Fonctionnalité

Lorsqu'un code-barres n'est pas trouvé dans les bases publiques, le système demande à l'utilisateur s'il souhaite lancer une recherche sur les sites vélo spécialisés.

---

## 💬 Message de confirmation

```
Produit non trouvé dans les bases publiques.

Voulez-vous chercher sur les sites spécialisés vélo ?
(Alltricks, Probikeshop, Bike24, Decathlon)

Cela prendra quelques secondes supplémentaires.

[Oui] [Non]
```

---

## 🔄 Workflow utilisateur

### Scénario 1 : Utilisateur accepte

```
1. Scanner le code-barres
   ↓
2. Recherche dans APIs publiques (~2 sec)
   → Non trouvé
   ↓
3. Affichage de la confirmation
   "Voulez-vous chercher sur les sites spécialisés ?"
   ↓
4. Utilisateur clique "Oui"
   ↓
5. Recherche sur sites vélo (~4-8 sec)
   ↓
6. Résultat :
   ├─ Trouvé → Formulaire pré-rempli
   └─ Non trouvé → Saisie manuelle
```

**Temps total** : ~6-10 secondes

### Scénario 2 : Utilisateur refuse

```
1. Scanner le code-barres
   ↓
2. Recherche dans APIs publiques (~2 sec)
   → Non trouvé
   ↓
3. Affichage de la confirmation
   "Voulez-vous chercher sur les sites spécialisés ?"
   ↓
4. Utilisateur clique "Non"
   ↓
5. Formulaire avec code-barres uniquement
   → Saisie manuelle du nom
```

**Temps total** : ~2 secondes

---

## ✅ Avantages

### Protection contre les abus

1. **Opt-in explicite** - L'utilisateur choisit à chaque fois
2. **Pas de recherche automatique** - Évite les requêtes inutiles
3. **Transparence** - L'utilisateur sait ce qui se passe
4. **Contrôle** - Possibilité de refuser si pressé

### Expérience utilisateur

1. **Choix informé** - L'utilisateur sait que ça prendra plus de temps
2. **Flexibilité** - Peut refuser si le produit est simple à saisir
3. **Pas de surprise** - Pas d'attente inexpliquée
4. **Feedback clair** - Message explicite sur ce qui va se passer

---

## 🔧 Implémentation technique

### API Route

**Paramètre** : `searchRetailers=true`

```typescript
// Sans recherche étendue
GET /api/catalog/barcode?barcode=1234567890123

// Avec recherche étendue (après confirmation)
GET /api/catalog/barcode?barcode=1234567890123&searchRetailers=true
```

### Réponse API

**Si non trouvé dans APIs publiques** :

```json
{
  "found": false,
  "barcode": "1234567890123",
  "message": "Product not found in databases...",
  "canSearchRetailers": true  // Indique que la recherche étendue est disponible
}
```

### Composant React

```typescript
if (data.canSearchRetailers && !searchRetailers) {
  const searchOnRetailers = window.confirm(
    'Produit non trouvé dans les bases publiques.\n\n' +
    'Voulez-vous chercher sur les sites spécialisés vélo ?\n' +
    '(Alltricks, Probikeshop, Bike24, Decathlon)\n\n' +
    'Cela prendra quelques secondes supplémentaires.'
  );
  
  if (searchOnRetailers) {
    await handleBarcodeDetected(barcode, true);
  }
}
```

---

## 📊 Statistiques attendues

### Taux d'acceptation estimé

| Situation | Taux d'acceptation |
|-----------|-------------------|
| Produit vélo évident | ~80% |
| Produit générique | ~30% |
| Utilisateur pressé | ~10% |
| **Moyenne estimée** | **~40-50%** |

### Impact sur le trafic

**Avant (sans confirmation)** :
- 100 scans → 100 requêtes APIs publiques + 30 requêtes sites vélo
- Total : 130 requêtes

**Après (avec confirmation)** :
- 100 scans → 100 requêtes APIs publiques + 15 requêtes sites vélo (50% acceptent)
- Total : 115 requêtes

**Réduction** : ~12% de requêtes vers les sites vélo

---

## 🎓 Conseils utilisateur

### Quand accepter la recherche étendue ?

✅ **Accepter si** :
- Produit vélo de marque (Shimano, SRAM, etc.)
- Équipement vélo emballé
- Vous avez le temps (quelques secondes)
- Vous voulez éviter la saisie manuelle

❌ **Refuser si** :
- Produit générique (vis, câble au mètre)
- Vous êtes pressé
- Le nom est simple à saisir
- Vous savez que le produit n'est pas référencé

### Astuce

Si vous scannez plusieurs produits de la même marque/type :
- **Premier produit** : Accepter la recherche
- **Si trouvé** : Accepter pour les suivants
- **Si non trouvé** : Refuser pour les suivants (gain de temps)

---

## 🔮 Améliorations futures possibles

### Court terme
- [ ] Mémoriser le choix de l'utilisateur pour la session
- [ ] Option "Toujours accepter" / "Toujours refuser"
- [ ] Statistiques de taux d'acceptation

### Moyen terme
- [ ] Apprentissage : suggérer l'acceptation selon le type de produit
- [ ] Recherche en arrière-plan (non bloquante)
- [ ] Cache des résultats négatifs

### Long terme
- [ ] Préférences utilisateur sauvegardées
- [ ] Recherche prédictive (avant même le scan)
- [ ] Intégration APIs officielles (si disponibles)

---

## 📝 Notes de développement

### Pourquoi une confirmation ?

1. **Respect des sites** - Évite les requêtes abusives
2. **Performance** - Évite les attentes inutiles
3. **Transparence** - L'utilisateur comprend ce qui se passe
4. **Légalité** - Montre une utilisation raisonnée du scraping

### Alternative considérée

**Option rejetée** : Recherche automatique avec timeout
- ❌ Pas de contrôle utilisateur
- ❌ Attente forcée même si inutile
- ❌ Risque d'abus involontaire

**Option choisie** : Confirmation explicite
- ✅ Contrôle utilisateur
- ✅ Pas d'attente inutile
- ✅ Protection contre les abus
- ✅ Meilleure UX

---

**Version** : 1.1.0  
**Date** : 2025-10-08  
**Amélioration** : Confirmation avant recherche étendue

---

**📱 Bon scan ! 🚴‍♂️**
