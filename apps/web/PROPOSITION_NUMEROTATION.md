# 📋 Proposition Système de Numérotation Professionnel

## 🎯 Objectif
Remplacer les identifiants longs (CUID) par des numéros courts, séquentiels et professionnels.

---

## 📊 Système Actuel vs Proposé

### Clients
**Actuel** : `clhj8k9l20000356xabcdefgh` (25 caractères)  
**Proposé** : `C-00001` (7 caractères)

### Tickets / Ordres de Réparation
**Actuel** : `wo_clhj8k9l20000356xabcdefgh` (28+ caractères)  
**Proposé** : `T-2025-0001` (11 caractères)

### Devis
**Actuel** : `DEV-2025-0001` ✅ (déjà bon)  
**Proposé** : Garder tel quel

### Factures
**Actuel** : `FAC-2025-0001` ✅ (déjà bon)  
**Proposé** : Garder tel quel

### Avoirs
**Actuel** : `AVO-2025-0001` ✅ (déjà bon)  
**Proposé** : Garder tel quel

### Vélos
**Actuel** : `bike_clhj8k9l20000356xabcdefgh` (30+ caractères)  
**Proposé** : `V-00001` (7 caractères)

---

## 🎨 Format Proposé

### 1. Clients
```
Format: C-NNNNN
Exemples:
  C-00001 → Jean Dupont
  C-00002 → Marie Martin
  C-00150 → Pierre Durand
```

**Avantages** :
- Court et mémorisable
- Facile à communiquer par téléphone
- Professionnel

### 2. Tickets / Ordres de Réparation
```
Format: T-YYYY-NNNN
Exemples:
  T-2025-0001 → Premier ticket de 2025
  T-2025-0150 → 150ème ticket de 2025
  T-2026-0001 → Premier ticket de 2026
```

**Avantages** :
- Réinitialisation annuelle
- Facile de voir l'année
- Cohérent avec devis/factures

### 3. Vélos
```
Format: V-NNNNN
Exemples:
  V-00001 → VTT Giant
  V-00002 → Vélo électrique Specialized
  V-00150 → Vélo route Trek
```

**Avantages** :
- Court et simple
- Unique par vélo
- Facile à référencer

### 4. Devis / Factures / Avoirs
```
Déjà bien formatés:
  DEV-2025-0001 → Devis
  FAC-2025-0001 → Facture
  AVO-2025-0001 → Avoir
```

**Garder tel quel** ✅

---

## 🔧 Implémentation Technique

### Tables de Séquences

```sql
-- Séquence clients
CREATE TABLE IF NOT EXISTS "CustomerSequence" (
  "id" TEXT PRIMARY KEY DEFAULT 'singleton',
  "lastNumber" INTEGER NOT NULL DEFAULT 0
);

-- Séquence tickets (par année)
CREATE TABLE IF NOT EXISTS "WorkOrderSequence" (
  "year" INTEGER PRIMARY KEY,
  "lastNumber" INTEGER NOT NULL DEFAULT 0
);

-- Séquence vélos
CREATE TABLE IF NOT EXISTS "BikeSequence" (
  "id" TEXT PRIMARY KEY DEFAULT 'singleton',
  "lastNumber" INTEGER NOT NULL DEFAULT 0
);
```

### Nouveaux Champs dans les Modèles

```prisma
model Customer {
  id              String   @id @default(cuid())
  customerNumber  String?  @unique // C-00001
  // ... autres champs
}

model WorkOrder {
  id              String   @id @default(cuid())
  ticketNumber    String?  @unique // T-2025-0001
  // ... autres champs
}

model Bike {
  id              String   @id @default(cuid())
  bikeNumber      String?  @unique // V-00001
  // ... autres champs
}
```

---

## 📱 Affichage dans l'Interface

### Avant
```
Client: clhj8k9l20000356xabcdefgh
Ticket: wo_clhj8k9l20000356xabcdefgh
Vélo: bike_clhj8k9l20000356xabcdefgh
```

### Après
```
Client: C-00001 (Jean Dupont)
Ticket: T-2025-0001 (Réparation VTT)
Vélo: V-00001 (Giant Talon 2)
```

---

## 🎯 Zones d'Affichage

### 1. Liste des Clients
```
┌─────────────────────────────────────┐
│ Numéro  │ Nom           │ Email     │
│ C-00001 │ Jean Dupont   │ j@mail.fr │
│ C-00002 │ Marie Martin  │ m@mail.fr │
└─────────────────────────────────────┘
```

### 2. Liste des Tickets
```
┌─────────────────────────────────────┐
│ Numéro      │ Client  │ Statut     │
│ T-2025-0001 │ C-00001 │ En cours   │
│ T-2025-0002 │ C-00002 │ Terminé    │
└─────────────────────────────────────┘
```

### 3. Page Devis/Facture
```
┌─────────────────────────────────────┐
│ DEVIS DEV-2025-0001                 │
├─────────────────────────────────────┤
│ Client: C-00001 - Jean Dupont       │
│ Ticket: T-2025-0001                 │
│ Vélo: V-00001 - Giant Talon 2       │
└─────────────────────────────────────┘
```

---

## 💡 Avantages du Système

### Professionnalisme
- ✅ Numéros courts et clairs
- ✅ Faciles à communiquer
- ✅ Cohérents entre eux

### Efficacité
- ✅ Recherche rapide
- ✅ Mémorisation facile
- ✅ Moins d'erreurs de saisie

### Traçabilité
- ✅ Séquence chronologique
- ✅ Année visible (tickets, devis, factures)
- ✅ Unique et non-réutilisable

---

## 🔄 Migration des Données Existantes

### Option 1: Génération Rétroactive
```sql
-- Assigner des numéros aux clients existants
UPDATE "Customer" 
SET "customerNumber" = 'C-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::TEXT, 5, '0')
WHERE "customerNumber" IS NULL;

-- Assigner des numéros aux tickets existants
UPDATE "WorkOrder"
SET "ticketNumber" = 'T-' || EXTRACT(YEAR FROM "createdAt") || '-' || 
                     LPAD(ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM "createdAt") ORDER BY "createdAt")::TEXT, 4, '0')
WHERE "ticketNumber" IS NULL;

-- Assigner des numéros aux vélos existants
UPDATE "Bike"
SET "bikeNumber" = 'V-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::TEXT, 5, '0')
WHERE "bikeNumber" IS NULL;
```

### Option 2: Génération Progressive
- Nouveaux enregistrements → Numéro assigné
- Anciens enregistrements → Garder CUID (afficher tronqué)

---

## 📋 Plan d'Implémentation

### Phase 1: Schéma et Séquences (30 min)
1. Ajouter champs `customerNumber`, `ticketNumber`, `bikeNumber`
2. Créer tables de séquences
3. Créer fonctions de génération

### Phase 2: API (1h)
1. Modifier création client → Assigner numéro
2. Modifier création ticket → Assigner numéro
3. Modifier création vélo → Assigner numéro

### Phase 3: Interface (1h)
1. Afficher numéros dans les listes
2. Afficher numéros dans les détails
3. Recherche par numéro

### Phase 4: Migration (30 min)
1. Assigner numéros aux données existantes
2. Vérifier unicité
3. Tester

**Total: ~3 heures**

---

## 🎨 Exemples Concrets

### Workflow Complet
```
1. Client arrive
   → Créé: C-00042 (Sophie Bernard)

2. Enregistrement vélo
   → Créé: V-00123 (VTT Rockrider)

3. Création ticket
   → Créé: T-2025-0087

4. Création devis
   → Créé: DEV-2025-0087 (lié à T-2025-0087)

5. Conversion facture
   → Créé: FAC-2025-0087

6. Communication client:
   "Bonjour Mme Bernard (C-00042),
    Votre devis DEV-2025-0087 pour le ticket T-2025-0087
    concernant votre vélo V-00123 est prêt."
```

---

## 🎯 Recommandation Finale

### À Implémenter
- ✅ **Clients** : C-NNNNN
- ✅ **Tickets** : T-YYYY-NNNN
- ✅ **Vélos** : V-NNNNN

### À Garder
- ✅ **Devis** : DEV-YYYY-NNNN (déjà bon)
- ✅ **Factures** : FAC-YYYY-NNNN (déjà bon)
- ✅ **Avoirs** : AVO-YYYY-NNNN (déjà bon)

### Bénéfices
- **-70% de caractères** pour les identifiants
- **+100% de clarté** dans la communication
- **+100% de professionnalisme** perçu

---

## ❓ Questions pour Validation

1. **Format clients** : C-NNNNN vous convient ? (ex: C-00001)
2. **Format tickets** : T-YYYY-NNNN avec année ? (ex: T-2025-0001)
3. **Format vélos** : V-NNNNN simple ? (ex: V-00001)
4. **Migration** : Assigner des numéros aux données existantes ?
5. **Affichage** : Toujours afficher le numéro + nom ? (ex: "C-00001 - Jean Dupont")

---

**Voulez-vous que j'implémente ce système ?** 🚀

**Ou préférez-vous d'abord ajuster les formats ?** 🎨
