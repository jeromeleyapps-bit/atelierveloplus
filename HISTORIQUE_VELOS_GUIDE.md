# Guide: Historique des Vélos

**Date**: 14 octobre 2025  
**Fonctionnalité**: Recherche rapide et historique complet des interventions sur les vélos

---

## 🎯 Objectif

Permettre de retrouver rapidement:
- **L'historique complet** des réparations d'un vélo
- **Les pièces utilisées** lors des interventions précédentes
- **Les spécifications techniques** (taille de pneus, freins, transmission, etc.)
- **Le coût total** des interventions

**Cas d'usage**: Un client appelle pour commander un pneu mais vous ne vous rappelez plus de la taille.

---

## 🚀 Fonctionnalités

### 1. Recherche Rapide de Client
- Recherche par **nom**, **prénom**, **email** ou **téléphone**
- Affichage de tous les vélos du client
- Nombre d'interventions par vélo
- Date de la dernière intervention

### 2. Spécifications Techniques
Chaque vélo peut avoir:
- **Taille de pneus** (ex: 700x25c, 26x2.1)
- **Taille de roues** (ex: 700c, 26", 27.5", 29")
- **Type de freins** (ex: Disque hydraulique, V-Brake)
- **Transmission** (ex: Shimano 105, SRAM GX)
- **Matériau du cadre** (ex: Aluminium, Carbone, Acier)
- **Taille du cadre** (ex: M, 54cm)

### 3. Historique Complet
Pour chaque intervention:
- **Date** et **type** (réparation, révision, entretien, upgrade)
- **Main d'œuvre**: temps et coût
- **Pièces utilisées**: description, quantité, prix
- **Coût total** de l'intervention

### 4. Statistiques
- Total dépensé sur le vélo
- Nombre total d'interventions
- Date de la dernière intervention
- Pièces les plus utilisées

---

## 📋 Migration Base de Données

### Nouveaux Champs dans `CustomerBike`

```prisma
model CustomerBike {
  // ... champs existants
  
  // Spécifications techniques
  wheelSize      String?     // Ex: "700c", "26\"", "27.5\"", "29\""
  tireSize       String?     // Ex: "700x25c", "26x2.1"
  frameMaterial  String?     // Ex: "Aluminium", "Carbone", "Acier"
  frameSize      String?     // Ex: "M", "54cm"
  brakeType      String?     // Ex: "Disque hydraulique", "V-Brake"
  gearSystem     String?     // Ex: "Shimano 105", "SRAM GX"
}
```

### Commandes de Migration

```bash
# 1. Générer la migration
cd apps/web
npx prisma migrate dev --name add_bike_specs

# 2. Appliquer la migration
npx prisma migrate deploy

# 3. Regénérer le client Prisma
npx prisma generate
```

---

## 🖥️ Utilisation

### Accès
**Menu principal** → **Historique Vélos**

### Étape 1: Rechercher un Client
1. Taper le nom, prénom, email ou téléphone du client
2. Appuyer sur **Entrée** ou cliquer sur 🔍
3. Les résultats s'affichent avec tous les vélos du client

### Étape 2: Sélectionner un Vélo
1. Cliquer sur la carte du vélo souhaité
2. L'historique complet se charge automatiquement

### Étape 3: Consulter l'Historique
- **Spécifications techniques** affichées en haut
- **Statistiques** (total dépensé, nombre d'interventions)
- **Liste des interventions** par ordre chronologique décroissant

### Étape 4: Détails d'une Intervention
1. Cliquer sur **▼** pour déplier une intervention
2. Voir la main d'œuvre et les pièces utilisées
3. Consulter les totaux

---

## 💡 Exemples d'Utilisation

### Exemple 1: Client Appelle pour un Pneu

**Situation**: "Bonjour, je voudrais commander un pneu pour mon vélo"

**Action**:
1. Aller sur **Historique Vélos**
2. Rechercher le client par nom
3. Sélectionner son vélo
4. Consulter **Spécifications Techniques** → **Pneus: 700x25c**
5. Répondre: "Vous avez besoin d'un 700x25c, je vous en commande un"

### Exemple 2: Vérifier les Pièces Utilisées

**Situation**: "Vous m'aviez changé quoi la dernière fois ?"

**Action**:
1. Rechercher le client
2. Sélectionner son vélo
3. Cliquer sur la dernière intervention
4. Voir la liste des pièces: "Chambre à air, câble de frein, patins"

### Exemple 3: Estimer un Coût

**Situation**: Client demande un devis pour une révision

**Action**:
1. Consulter l'historique
2. Voir les interventions précédentes similaires
3. Utiliser les coûts passés comme référence

---

## 🔧 APIs Créées

### 1. Recherche de Clients et Vélos
```
GET /api/bikes/search?q=nom+client
```

**Réponse**:
```json
{
  "customers": [
    {
      "id": "cm123",
      "firstName": "Jean",
      "lastName": "Dupont",
      "email": "jean@example.com",
      "phone": "0612345678",
      "bikes": [
        {
          "id": "bike123",
          "brand": "Trek",
          "model": "FX 3",
          "tireSize": "700x32c",
          "wheelSize": "700c",
          "interventionsCount": 5,
          "lastIntervention": {
            "date": "2025-01-15",
            "type": "repair"
          }
        }
      ]
    }
  ]
}
```

### 2. Historique d'un Vélo
```
GET /api/bikes/[bikeId]/history
```

**Réponse**:
```json
{
  "bike": {
    "id": "bike123",
    "brand": "Trek",
    "model": "FX 3",
    "tireSize": "700x32c",
    "wheelSize": "700c",
    "brakeType": "Disque hydraulique",
    "gearSystem": "Shimano Deore"
  },
  "customer": {
    "id": "cm123",
    "firstName": "Jean",
    "lastName": "Dupont"
  },
  "history": [
    {
      "id": "wo456",
      "date": "2025-01-15",
      "type": "repair",
      "laborCost": 30.00,
      "partsCost": 45.00,
      "totalCost": 75.00,
      "parts": [
        {
          "description": "Chambre à air 700x32c",
          "qty": 1,
          "priceHT": 12.00
        },
        {
          "description": "Câble de frein",
          "qty": 2,
          "priceHT": 8.50
        }
      ]
    }
  ],
  "stats": {
    "totalInterventions": 5,
    "totalSpent": 350.00,
    "lastIntervention": "2025-01-15"
  }
}
```

---

## 📝 Fichiers Créés/Modifiés

### Créés
1. **`apps/web/src/app/bikes/history/page.tsx`**
   - Page principale d'historique des vélos
   - Recherche de clients
   - Affichage de l'historique

2. **`apps/web/src/app/api/bikes/search/route.ts`**
   - API de recherche de clients et vélos

3. **`apps/web/src/app/api/bikes/[bikeId]/history/route.ts`**
   - API d'historique complet d'un vélo

### Modifiés
4. **`apps/web/prisma/schema.prisma`**
   - Ajout de 6 champs techniques à `CustomerBike`

5. **`apps/web/src/app/components/NavBanner.tsx`**
   - Ajout du lien "Historique Vélos" dans le menu

---

## 🎨 Interface Utilisateur

### Écran de Recherche
```
┌─────────────────────────────────────────────┐
│ 🔍 Rechercher un client                      │
│ ┌─────────────────────────────────────────┐ │
│ │ Nom, prénom, email ou téléphone...      │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Résultats
```
┌─────────────────────────────────────────────┐
│ 👤 Jean Dupont                               │
│ 📧 jean@example.com  📞 0612345678          │
│                                              │
│ ┌─────────────────┐ ┌─────────────────┐   │
│ │ 🚲 Trek FX 3     │ │ 🚲 Giant Escape  │   │
│ │ 🛞 700x32c       │ │ 🛞 700x28c       │   │
│ │ 5 interventions  │ │ 2 interventions  │   │
│ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────┘
```

### Historique
```
┌─────────────────────────────────────────────┐
│ 🚲 Trek FX 3 - Jean Dupont                  │
│ 5 interventions                              │
│                                              │
│ ℹ️ Spécifications Techniques                │
│ Pneus: 700x32c  |  Roues: 700c              │
│ Freins: Disque hydraulique                   │
│ Transmission: Shimano Deore                  │
│                                              │
│ 📊 Statistiques                              │
│ Total dépensé: 350.00 €                     │
│ Interventions: 5                             │
│ Dernière: 15 janvier 2025                    │
│                                              │
│ 📜 Historique des Interventions             │
│ ┌───────────────────────────────────────┐  │
│ │ 🔧 15 janvier 2025 - Réparation       │  │
│ │ 75.00 €                          ▼    │  │
│ │ • Chambre à air 700x32c (12.00 €)    │  │
│ │ • Câble de frein x2 (17.00 €)        │  │
│ │ • Main d'œuvre 30min (30.00 €)       │  │
│ └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## ⚠️ Points Importants

### 1. Remplir les Spécifications
Pour que la fonctionnalité soit utile, **remplissez les spécifications techniques** lors de la création/modification d'un vélo:
- Taille de pneus
- Taille de roues
- Type de freins
- Transmission

### 2. Ajouter des Pièces aux Tickets
Lors d'une intervention, **ajoutez toujours les pièces utilisées** dans le ticket pour qu'elles apparaissent dans l'historique.

### 3. Migration Requise
**Avant d'utiliser**, exécutez la migration Prisma:
```bash
cd apps/web
npx prisma migrate dev --name add_bike_specs
npx prisma generate
```

---

## 🚀 Prochaines Étapes

### Court Terme
- [ ] Exécuter la migration Prisma
- [ ] Tester la recherche de clients
- [ ] Remplir les spécifications des vélos existants

### Moyen Terme
- [ ] Ajouter un export PDF de l'historique
- [ ] Permettre d'envoyer l'historique par email au client
- [ ] Ajouter des photos des vélos

### Long Terme
- [ ] Alertes automatiques (ex: "Révision recommandée tous les 6 mois")
- [ ] Statistiques avancées (pièces les plus remplacées, coût moyen par type de vélo)
- [ ] Intégration avec le catalogue pour suggérer des pièces

---

## ✅ Résultat

**Vous pouvez maintenant**:
1. ✅ Rechercher rapidement un client par nom
2. ✅ Voir tous ses vélos et leur historique
3. ✅ Consulter les spécifications techniques (taille de pneus, etc.)
4. ✅ Voir toutes les interventions passées avec détails
5. ✅ Connaître le coût total dépensé sur un vélo

**Testez**:
1. Exécuter la migration Prisma
2. Aller sur **Historique Vélos**
3. Rechercher un client
4. Consulter l'historique de ses vélos

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
