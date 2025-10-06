# ✅ Devis Direct Ajouté !

## 🎯 Fonctionnalité Implémentée

### Création de Devis Direct (sans ticket)

**Fichier modifié** : `src/app/finance/components/CreateQuoteDialog.tsx`

**Nouvelles options** :
- ✅ **Depuis un ticket** : Créer un devis lié à un ticket existant
- ✅ **Devis direct** : Créer un devis directement pour un client (sans ticket)

---

## 🎨 Interface Améliorée

### Dialog "Créer un devis"

```
┌─────────────────────────────────────┐
│ Créer un devis                      │
├─────────────────────────────────────┤
│ Type de devis                       │
│ [Depuis un ticket] [Devis direct]  │
├─────────────────────────────────────┤
│ Client: [Sélectionner...]          │
│ Validité (jours): [30]             │
├─────────────────────────────────────┤
│ [Annuler]        [Créer le devis]  │
└─────────────────────────────────────┘
```

---

## 💡 Fonctionnement

### Option 1: Depuis un Ticket
1. Sélectionner "Depuis un ticket"
2. Choisir le ticket dans la liste
3. Définir la validité (30 jours par défaut)
4. Créer le devis

**Avantage** : Le devis est lié au ticket de réparation

### Option 2: Devis Direct
1. Sélectionner "Devis direct"
2. Choisir le client dans la liste
3. Définir la validité (30 jours par défaut)
4. Créer le devis

**Avantage** : Pas besoin de créer un ticket au préalable

**Fonctionnement** :
- Un ticket vide est créé automatiquement en arrière-plan
- Le devis est lié à ce ticket
- Le client peut être facturé directement

---

## 🔧 Modifications Techniques

### Ajout de l'État
```typescript
const [quoteType, setQuoteType] = useState<"ticket" | "direct">("ticket");
const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
const [customers, setCustomers] = useState<Customer[]>([]);
```

### Chargement Conditionnel
```typescript
useEffect(() => {
  if (open) {
    if (quoteType === "ticket") {
      loadWorkOrders(); // Charger les tickets
    } else {
      loadCustomers(); // Charger les clients
    }
  }
}, [open, quoteType]);
```

### Création Intelligente
```typescript
// Si devis direct, créer d'abord un ticket vide
if (quoteType === "direct") {
  const wo = await createWorkOrder({
    customerId: selectedCustomer.id,
    bikeId: undefined,
    dueAt: undefined,
  });
  finalWorkOrderId = wo.id;
}

// Créer le devis
const quote = await createQuote({ workOrderId: finalWorkOrderId, validDays });
```

---

## 🎯 Cas d'Usage

### Cas 1: Devis pour Réparation (Depuis Ticket)
```
Scénario: Un client apporte son vélo pour réparation
1. Créer un ticket de réparation
2. Créer un devis depuis ce ticket
3. Ajouter les pièces et main d'œuvre
4. Envoyer le devis au client
5. Si accepté, convertir en facture
```

### Cas 2: Devis pour Vente (Direct)
```
Scénario: Un client demande un devis pour un vélo neuf
1. Créer un devis direct
2. Sélectionner le client
3. Ajouter le vélo et accessoires
4. Envoyer le devis
5. Si accepté, convertir en facture
```

### Cas 3: Devis pour Service (Direct)
```
Scénario: Devis pour un service d'entretien annuel
1. Créer un devis direct
2. Sélectionner le client
3. Ajouter les services
4. Envoyer le devis
5. Si accepté, convertir en facture
```

---

## 📊 Avantages

### Flexibilité
- ✅ **2 workflows** : Avec ou sans ticket
- ✅ **Choix simple** : Toggle buttons clairs
- ✅ **Adapté au besoin** : Réparation vs Vente

### Simplicité
- ✅ **Pas de ticket obligatoire** : Pour les ventes directes
- ✅ **Ticket auto-créé** : En arrière-plan si besoin
- ✅ **Interface unifiée** : Un seul dialog

### Efficacité
- ✅ **Moins de clics** : Pas besoin de créer un ticket d'abord
- ✅ **Plus rapide** : Devis direct en 3 clics
- ✅ **Traçabilité** : Tout est lié à un ticket (même invisible)

---

## 🧪 Tests à Effectuer

### Test 1: Devis depuis Ticket
```
1. Onglet "Devis"
2. Cliquer "Créer un devis"
3. Sélectionner "Depuis un ticket"
4. Choisir un ticket
5. Créer
6. Vérifier redirection vers le devis ✅
```

### Test 2: Devis Direct
```
1. Onglet "Devis"
2. Cliquer "Créer un devis"
3. Sélectionner "Devis direct"
4. Choisir un client
5. Créer
6. Vérifier redirection vers le devis ✅
7. Vérifier qu'un ticket a été créé en arrière-plan ✅
```

### Test 3: Basculer entre les Types
```
1. Ouvrir dialog
2. Sélectionner "Depuis un ticket"
3. Choisir un ticket
4. Basculer sur "Devis direct"
5. Vérifier que le champ change pour "Client" ✅
6. Choisir un client
7. Créer ✅
```

---

## 🎨 Détails Visuels

### Toggle Buttons
```
┌─────────────────────────────────────┐
│ Type de devis                       │
│ ┌─────────────┬─────────────┐      │
│ │ Depuis un   │ Devis       │      │
│ │ ticket ✓    │ direct      │      │
│ └─────────────┴─────────────┘      │
└─────────────────────────────────────┘
```

### Champ Ticket
```
┌─────────────────────────────────────┐
│ Ticket / Ordre de réparation *      │
│ [abc12345... - Jean Dupont ▼]      │
│ Sélectionnez le ticket pour lequel │
│ créer le devis                      │
└─────────────────────────────────────┘
```

### Champ Client
```
┌─────────────────────────────────────┐
│ Client *                            │
│ [Jean Dupont ▼]                    │
│ Sélectionnez le client pour le     │
│ devis direct                        │
└─────────────────────────────────────┘
```

---

## 💡 Workflow Complet

### Devis Direct → Facture
```
1. Créer devis direct (client: Jean Dupont)
   → Ticket auto-créé en arrière-plan
   → Devis DEV-2025-0001 créé

2. Ajouter lignes au devis
   → Vélo électrique: 1500€
   → Accessoires: 200€

3. Convertir en facture
   → Facture FAC-2025-0001 créée
   → Toutes les lignes copiées

4. Émettre la facture
   → Numéro assigné
   → PDF généré

5. Marquer comme payée
   → Statut: Payée
   → Stock décrémenté
```

---

## 🎊 Résultat Final

### Avant
- ❌ Obligation de créer un ticket d'abord
- ❌ Workflow lourd pour ventes directes
- ❌ Pas adapté aux devis simples

### Après
- ✅ **2 options** : Ticket ou Direct
- ✅ **Workflow flexible** : Adapté au besoin
- ✅ **Devis rapide** : 3 clics pour un devis direct
- ✅ **Ticket auto-créé** : Traçabilité garantie

---

**Devis direct implémenté !** ✅  
**2 workflows disponibles !** 🎯  
**Interface flexible et intuitive !** 🚀  
**Prêt pour les tests !** 🧪
