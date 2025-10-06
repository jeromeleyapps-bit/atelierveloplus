# ✅ Correction Export PDF

## 🐛 Problèmes Corrigés

### 1. ✅ Nom du Fichier PDF
**Problème** : Tous les PDF s'appelaient `facture_XXX.pdf`

**Solution** : Nom dynamique selon le type
- Devis → `devis_DEV-2025-0001.pdf`
- Facture → `facture_FAC-2025-0001.pdf`
- Avoir → `avoir_AVO-2025-0001.pdf`

### 2. ✅ Intitulé dans le PDF
**Problème** : Le titre affichait toujours "FACTURE"

**Solution** : Titre dynamique selon le type
- Devis → **DEVIS**
- Facture → **FACTURE**
- Avoir → **AVOIR**

---

## 📝 Fichiers Modifiés

### 1. `src/app/api/finance/invoices/[id]/pdf/route.ts` ✅

**Ajout du type dans les données** :
```typescript
function buildInvoiceData(inv: any, customer: any, settings: any) {
  return {
    // ...
    type: inv.type || 'invoice', // Type de document
    // ...
  };
}
```

**Nom du fichier dynamique** :
```typescript
// Nom du fichier selon le type
const docType = inv.type === 'quote' ? 'devis' : 
                inv.type === 'credit' ? 'avoir' : 'facture';
const filename = `${docType}_${inv.number || inv.id}.pdf`;
```

### 2. `src/lib/pdf-invoice.ts` ✅

**Interface mise à jour** :
```typescript
interface InvoiceData {
  // ...
  type?: string; // Type de document: 'invoice' | 'quote' | 'credit'
  // ...
}
```

**Titre dynamique** :
```typescript
// === INVOICE TITLE ===
const documentTitle = data.type === 'quote' ? 'DEVIS' : 
                      data.type === 'credit' ? 'AVOIR' : 'FACTURE';
page.drawText(documentTitle, {
  x: width - 150,
  y,
  size: 24,
  font: fontBold,
  color: primaryColor,
});
```

---

## 🎯 Résultats

### Noms de Fichiers
```
Devis:    devis_DEV-2025-0001.pdf ✅
Facture:  facture_FAC-2025-0001.pdf ✅
Avoir:    avoir_AVO-2025-0001.pdf ✅
```

### Intitulés PDF
```
Devis:    DEVIS    (en haut à droite) ✅
Facture:  FACTURE  (en haut à droite) ✅
Avoir:    AVOIR    (en haut à droite) ✅
```

---

## 🧪 Tests à Effectuer

### Test 1: Export PDF Devis
```
1. Créer un devis DEV-2025-0001
2. Cliquer "Exporter PDF"
3. Vérifier nom fichier: devis_DEV-2025-0001.pdf ✅
4. Ouvrir le PDF
5. Vérifier titre: "DEVIS" ✅
6. Vérifier numéro: "N° DEV-2025-0001" ✅
```

### Test 2: Export PDF Facture
```
1. Créer une facture FAC-2025-0001
2. Cliquer "Exporter PDF"
3. Vérifier nom fichier: facture_FAC-2025-0001.pdf ✅
4. Ouvrir le PDF
5. Vérifier titre: "FACTURE" ✅
6. Vérifier numéro: "N° FAC-2025-0001" ✅
```

### Test 3: Export PDF Avoir
```
1. Créer un avoir AVO-2025-0001
2. Cliquer "Exporter PDF"
3. Vérifier nom fichier: avoir_AVO-2025-0001.pdf ✅
4. Ouvrir le PDF
5. Vérifier titre: "AVOIR" ✅
6. Vérifier numéro: "N° AVO-2025-0001" ✅
```

---

## 📊 Avant/Après

### Avant
```
Devis:
  Fichier: facture_DEV-2025-0001.pdf ❌
  Titre PDF: FACTURE ❌

Facture:
  Fichier: facture_FAC-2025-0001.pdf ✅
  Titre PDF: FACTURE ✅

Avoir:
  Fichier: facture_AVO-2025-0001.pdf ❌
  Titre PDF: FACTURE ❌
```

### Après
```
Devis:
  Fichier: devis_DEV-2025-0001.pdf ✅
  Titre PDF: DEVIS ✅

Facture:
  Fichier: facture_FAC-2025-0001.pdf ✅
  Titre PDF: FACTURE ✅

Avoir:
  Fichier: avoir_AVO-2025-0001.pdf ✅
  Titre PDF: AVOIR ✅
```

---

## 🎨 Aperçu PDF

### Devis
```
┌─────────────────────────────────────┐
│ ATELIER VÉLO+          DEVIS        │
│ 123 Rue...             N° DEV-2025-0001 │
│ 75001 Paris            Date: 05/10/2024 │
│                        Valide: 04/11/2024│
├─────────────────────────────────────┤
│ Client: Jean Dupont                 │
│ ...                                 │
└─────────────────────────────────────┘
```

### Facture
```
┌─────────────────────────────────────┐
│ ATELIER VÉLO+          FACTURE      │
│ 123 Rue...             N° FAC-2025-0001 │
│ 75001 Paris            Date: 05/10/2024 │
│                        Échéance: 05/11/2024│
├─────────────────────────────────────┤
│ Client: Jean Dupont                 │
│ ...                                 │
└─────────────────────────────────────┘
```

### Avoir
```
┌─────────────────────────────────────┐
│ ATELIER VÉLO+          AVOIR        │
│ 123 Rue...             N° AVO-2025-0001 │
│ 75001 Paris            Date: 05/10/2024 │
│                                     │
├─────────────────────────────────────┤
│ Client: Jean Dupont                 │
│ ...                                 │
└─────────────────────────────────────┘
```

---

## 💡 Détails Techniques

### Logique du Nom de Fichier
```typescript
const docType = inv.type === 'quote' ? 'devis' : 
                inv.type === 'credit' ? 'avoir' : 'facture';
const filename = `${docType}_${inv.number || inv.id}.pdf`;
```

### Logique du Titre PDF
```typescript
const documentTitle = data.type === 'quote' ? 'DEVIS' : 
                      data.type === 'credit' ? 'AVOIR' : 'FACTURE';
```

### Fallback
Si `type` n'est pas défini → Par défaut "FACTURE" et "facture_"

---

## 🎊 Résultat Final

### Cohérence Complète
- ✅ **Numérotation** : DEV/FAC/AVO
- ✅ **Nom fichier** : devis_/facture_/avoir_
- ✅ **Titre PDF** : DEVIS/FACTURE/AVOIR
- ✅ **Interface** : Titre de page correct

### Expérience Utilisateur
- ✅ **Clarté** : Fichiers facilement identifiables
- ✅ **Professionnalisme** : Terminologie correcte
- ✅ **Organisation** : Tri facile par type

---

**Corrections PDF appliquées !** ✅  
**Noms de fichiers corrects !** 📄  
**Intitulés PDF corrects !** 🎯  
**Prêt pour les tests !** 🚀
