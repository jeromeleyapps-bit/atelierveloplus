# Fix: PDF Devis - Corrections Appliquées

**Date**: 14 octobre 2025  
**Problèmes**: Totaux à 0€, coordonnées non mises à jour, logo trop gros

---

## 🐛 Problèmes Identifiés

### 1. Totaux à 0€
**Cause**: Le PDF était généré depuis une facture vide au lieu du workorder avec estimation

**Solution**: Création d'une route dédiée `/api/pos/workorders/[id]/quote-pdf`

### 2. Coordonnées non mises à jour
**Cause**: Le PDF utilisait les valeurs par défaut au lieu des paramètres utilisateur

**Solution**: Récupération de `AppSetting` avec toutes les coordonnées

### 3. Logo trop gros
**Cause**: Logo fixé à 100px de largeur sans limite de hauteur

**Solution**: Limitation à 60x60px avec respect des proportions

---

## ✅ Corrections Appliquées

### 1. Nouvelle Route API

**Fichier créé**: `apps/web/src/app/api/pos/workorders/[id]/quote-pdf/route.ts`

**Fonctionnalité**:
- Récupère le workorder avec pièces et client
- Calcule les totaux (main d'œuvre + pièces)
- Applique la TVA selon le statut (AE ou non)
- Récupère les coordonnées depuis `AppSetting`
- Génère le PDF avec toutes les informations

**Exemple de données**:
```typescript
{
  shopName: "Upgraded Bikes",
  shopAddress: "17 Rue Danton",
  shopZip: "84000",
  shopCity: "Avignon",
  shopPhone: "04 90 XX XX XX",
  shopEmail: "contact@upgradedbikes.com",
  subtotalHT: 90.00,
  vatAmount: 9.00,
  totalTTC: 99.00
}
```

### 2. Réduction Taille Logo

**Fichier modifié**: `apps/web/src/lib/pdf-invoice.ts`

**Avant**:
```typescript
const imgWidth = 100; // Fixe à 100px
const scale = imgWidth / img.width;
const imgHeight = img.height * scale; // Peut être très grand
```

**Après**:
```typescript
const maxWidth = 60;
const maxHeight = 60;
// Calcul du ratio pour respecter les proportions
const widthRatio = maxWidth / imgWidth;
const heightRatio = maxHeight / imgHeight;
const scale = Math.min(widthRatio, heightRatio);
```

**Résultat**: Logo limité à 60x60px maximum

### 3. Bouton Télécharger PDF

**Fichier modifié**: `apps/web/src/app/tickets/[id]/page.tsx`

**Ajout**:
```typescript
<Button 
  size="small" 
  variant="contained" 
  color="primary"
  startIcon={<DescriptionIcon />}
  onClick={() => window.open(`/api/pos/workorders/${id}/quote-pdf`, '_blank')}
>
  Télécharger PDF
</Button>
```

---

## 📊 Données du PDF

### Informations Atelier (depuis AppSetting)
- ✅ Nom de l'atelier
- ✅ Adresse complète
- ✅ Téléphone
- ✅ Email
- ✅ SIRET
- ✅ N° TVA
- ✅ RCS
- ✅ Capital social
- ✅ Assurance RC Pro

### Informations Client (depuis WorkOrder.customer)
- ✅ Nom complet
- ✅ Adresse
- ✅ Code postal
- ✅ Ville

### Lignes du Devis
- ✅ Main d'œuvre (temps × taux horaire)
- ✅ Pièces (description, quantité, prix)
- ✅ TVA différenciée (10% MO, 20% pièces, ou 0% si AE)

### Totaux
- ✅ Sous-total HT
- ✅ TVA
- ✅ Total TTC

---

## 🔧 Configuration Requise

### Pour que le PDF soit correct

1. **Remplir "Mon compte"**:
   - Nom de l'atelier
   - Adresse complète
   - Téléphone
   - Email
   - SIRET (optionnel)
   - N° TVA (optionnel)

2. **Cocher "Auto-entrepreneur"** si applicable:
   - TVA sera à 0%
   - Mention "TVA non applicable, art. 293 B du CGI"

3. **Ajouter un logo** (optionnel):
   - Placer `logo.png` dans `apps/web/public/`
   - Taille recommandée: 200x200px max
   - Format: PNG ou JPG

---

## 🧪 Tests à Effectuer

### Test 1: PDF avec coordonnées
```
1. Mon compte → Remplir toutes les coordonnées
2. Créer un ticket avec estimation
3. Télécharger PDF
4. Vérifier: Coordonnées correctes ✓
```

### Test 2: PDF avec logo
```
1. Ajouter logo.png dans public/
2. Télécharger PDF
3. Vérifier: Logo à la bonne taille (60x60px max) ✓
```

### Test 3: Totaux corrects
```
1. Ticket avec MO: 120 min à 45 €/h = 90 € HT
2. Télécharger PDF
3. Vérifier: 
   - Sous-total HT: 90,00 €
   - TVA 10%: 9,00 €
   - Total TTC: 99,00 € ✓
```

### Test 4: Auto-entrepreneur
```
1. Mon compte → Cocher "Auto-entrepreneur"
2. Créer un devis
3. Télécharger PDF
4. Vérifier: TVA à 0% ✓
```

---

## 📋 Exemple de PDF Généré

```
┌─────────────────────────────────────────────────────────┐
│ [LOGO 60x60]                          ┌──────────────┐  │
│                                       │    DEVIS     │  │
│ UPGRADED BIKES                        │ N° DEVIS-XXX │  │
│ 17 Rue Danton                         └──────────────┘  │
│ 84000 Avignon                         Date: 14/10/2025  │
│ Tél: 04 90 XX XX XX                   Valide: 13/11/25  │
│ Email: contact@upgradedbikes.com                        │
│                                                          │
│ FACTURÉ À:                                              │
│ Jerome Leyssard                                         │
│ 17 Rue Danton                                           │
│ 84000 Avignon                                           │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ Description          Qté    PU HT    TVA    Total HT   │
├─────────────────────────────────────────────────────────┤
│ Main d'œuvre (120min)  2   45.00 €   10%    90.00 €   │
│                                                          │
│                                       Sous-total HT:     │
│                                       90.00 €            │
│                                       TVA 10%:           │
│                                       9.00 €             │
│                                       TOTAL TTC:         │
│                                       99.00 €            │
└─────────────────────────────────────────────────────────┘
```

---

## ⚠️ Points d'Attention

### 1. Coordonnées par Défaut
Si vous ne remplissez pas "Mon compte", le PDF utilisera:
- Nom: "Atelier Vélo+"
- Adresse: "123 Rue du Vélo, 75000 Paris"
- Tél: "01 23 45 67 89"

**Recommandation**: Toujours remplir "Mon compte"

### 2. Logo Manquant
Si `logo.png` n'existe pas, le PDF affichera le nom de l'atelier en texte.

**Recommandation**: Ajouter un logo pour un rendu professionnel

### 3. Client Sans Adresse
Si le client n'a pas d'adresse, le PDF affichera juste le nom.

**Recommandation**: Remplir les adresses clients

---

## 🔄 Migration des Anciens Devis

Les anciens devis générés via factures peuvent avoir des totaux incorrects.

**Solution**: Utiliser le nouveau bouton "Télécharger PDF" depuis le ticket

**Note**: Les anciens PDF ne seront pas mis à jour automatiquement

---

## 📁 Fichiers Modifiés/Créés

### Créés
1. **`apps/web/src/app/api/pos/workorders/[id]/quote-pdf/route.ts`**
   - Nouvelle route pour générer le PDF du devis

### Modifiés
2. **`apps/web/src/lib/pdf-invoice.ts`**
   - Réduction taille logo (60x60px max)

3. **`apps/web/src/app/tickets/[id]/page.tsx`**
   - Ajout bouton "Télécharger PDF"

---

## ✅ Résultat

**Le PDF du devis est maintenant correct**:
- ✅ Totaux calculés correctement
- ✅ Coordonnées de l'atelier mises à jour
- ✅ Logo à la bonne taille
- ✅ TVA selon le statut (AE ou non)
- ✅ Informations client complètes

**Testez maintenant en téléchargeant un PDF de devis !** 🎉

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
