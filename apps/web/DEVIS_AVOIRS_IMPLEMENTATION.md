# 🎯 Implémentation Pages Devis et Avoirs

## 📋 Situation Actuelle

### **Ce qui existe déjà**
- ✅ Fonction `generateInvoicePDF()` qui gère les 3 types (factures, devis, avoirs)
- ✅ Onglets dans `/finance/page.tsx` pour filtrer par type
- ✅ API routes pour créer/modifier tous les types de documents
- ✅ Composants simplifiés `QuotesTab` et `CreditsTab`

### **Ce qui manque**
- ❌ Pages dédiées `/finance/quotes/[id]` et `/finance/credits/[id]`
- ❌ Fonctionnalités complètes (édition, suppression, envoi email)
- ❌ Interface utilisateur riche comme pour les factures

---

## 🎯 Solution Recommandée

### **Option 1 : Page Unifiée (Recommandé)**
Modifier `/finance/invoices/[id]/page.tsx` pour gérer les 3 types :
- ✅ Réutilise tout le code existant
- ✅ Maintenance simplifiée (un seul fichier)
- ✅ Comportement cohérent entre les types
- ✅ Adaptations selon le type (titre, boutons, etc.)

**Changements nécessaires** :
1. Adapter le titre selon `inv.type` (FACTURE / DEVIS / AVOIR)
2. Masquer certains boutons selon le type :
   - **Devis** : Bouton "Convertir en facture"
   - **Avoir** : Pas de conversion
   - **Facture** : Bouton "Créer un avoir"
3. Adapter les labels et messages

### **Option 2 : Pages Séparées**
Créer `/finance/quotes/[id]/page.tsx` et `/finance/credits/[id]/page.tsx` :
- ❌ Code dupliqué (833 lignes × 2)
- ❌ Maintenance difficile
- ❌ Risque d'incohérences
- ✅ Séparation claire des responsabilités

---

## 🚀 Implémentation Option 1 (Recommandée)

### **Étape 1 : Modifier la page facture**

```typescript
// Dans /finance/invoices/[id]/page.tsx

// Adapter le titre
const documentTitle = inv.type === 'quote' ? 'Devis' : inv.type === 'credit' ? 'Avoir' : 'Facture';
const documentNumber = inv.number || 'Brouillon';

// Adapter les boutons
{inv.type === 'quote' && !inv.convertedAt && (
  <Button
    variant="contained"
    color="success"
    onClick={handleConvertToInvoice}
    startIcon={<TransformIcon />}
  >
    Convertir en facture
  </Button>
)}

{inv.type === 'invoice' && inv.status === 'issued' && (
  <Button
    variant="outlined"
    onClick={handleCreateCredit}
    startIcon={<CreditCardIcon />}
  >
    Créer un avoir
  </Button>
)}

// Adapter les messages
const successMessage = inv.type === 'quote' 
  ? 'Devis mis à jour' 
  : inv.type === 'credit' 
  ? 'Avoir mis à jour' 
  : 'Facture mise à jour';
```

### **Étape 2 : Créer des routes alias**

```typescript
// /finance/quotes/[id]/page.tsx
export { default } from '../../invoices/[id]/page';

// /finance/credits/[id]/page.tsx
export { default } from '../../invoices/[id]/page';
```

### **Étape 3 : Mettre à jour les liens**

Dans `/finance/page.tsx` et `/tickets/[id]/page.tsx` :
```typescript
// Au lieu de
href={`/finance/invoices/${quote.id}`}

// Utiliser
href={`/finance/${inv.type === 'quote' ? 'quotes' : inv.type === 'credit' ? 'credits' : 'invoices'}/${inv.id}`}
```

---

## 📝 Fonctionnalités Spécifiques

### **DEVIS**
- ✅ Édition complète des lignes
- ✅ Export PDF
- ✅ Envoi par email
- ✅ **Bouton "Convertir en facture"**
- ✅ Date de validité
- ✅ Statut : brouillon / envoyé / accepté / refusé / converti

### **AVOIR**
- ✅ Édition complète des lignes
- ✅ Export PDF
- ✅ Envoi par email
- ✅ **Référence à la facture d'origine**
- ✅ Montant négatif ou positif
- ✅ Statut : brouillon / émis / remboursé

### **FACTURE**
- ✅ Toutes les fonctionnalités actuelles
- ✅ **Bouton "Créer un avoir"**
- ✅ Paiements partiels
- ✅ Statut : brouillon / émise / payée / annulée

---

## 🎨 Adaptations UI

### **Couleurs selon le type**
```typescript
const typeColor = {
  quote: 'info',      // Bleu
  invoice: 'primary', // Bleu foncé
  credit: 'error'     // Rouge
};

<Chip 
  label={documentTitle} 
  color={typeColor[inv.type || 'invoice']} 
/>
```

### **Icônes selon le type**
```typescript
import DescriptionIcon from '@mui/icons-material/Description'; // Devis
import ReceiptIcon from '@mui/icons-material/Receipt'; // Facture
import CreditCardIcon from '@mui/icons-material/CreditCard'; // Avoir
```

---

## ✅ Avantages de l'Approche Unifiée

1. **Maintenance** : Un seul fichier à maintenir
2. **Cohérence** : Comportement identique pour tous les types
3. **Réutilisation** : Tout le code existant est réutilisé
4. **Évolutivité** : Facile d'ajouter de nouvelles fonctionnalités
5. **Tests** : Un seul composant à tester

---

## 🔄 Migration Progressive

### **Phase 1 : Adapter la page existante**
- Ajouter les conditions selon `inv.type`
- Adapter les titres et labels
- Masquer/afficher les boutons appropriés

### **Phase 2 : Créer les routes alias**
- `/finance/quotes/[id]` → réexporte la page facture
- `/finance/credits/[id]` → réexporte la page facture

### **Phase 3 : Mettre à jour les liens**
- Modifier tous les liens pour utiliser les bonnes routes
- Tester la navigation

### **Phase 4 : Améliorer l'UX**
- Ajouter des couleurs distinctes
- Ajouter des icônes
- Améliorer les messages

---

## 🧪 Tests à Effectuer

### **Pour chaque type**
- [ ] Créer un nouveau document
- [ ] Éditer les lignes
- [ ] Sauvegarder
- [ ] Exporter en PDF
- [ ] Envoyer par email
- [ ] Supprimer

### **Spécifique Devis**
- [ ] Convertir en facture
- [ ] Vérifier que le devis est marqué comme converti

### **Spécifique Avoir**
- [ ] Créer depuis une facture
- [ ] Vérifier la référence à la facture d'origine

---

## 📦 Prochaines Étapes

1. ✅ Valider l'approche avec l'utilisateur
2. ⏳ Implémenter les adaptations dans la page facture
3. ⏳ Créer les routes alias
4. ⏳ Mettre à jour les liens
5. ⏳ Tester toutes les fonctionnalités
6. ⏳ Documenter les différences entre les types

**Voulez-vous que je procède à l'implémentation de l'Option 1 (Page Unifiée) ?**
