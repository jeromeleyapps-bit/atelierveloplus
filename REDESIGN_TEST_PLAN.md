# 🧪 Plan de Test - Redesign Page Ticket

**Date**: 15 octobre 2025 - 10h35  
**Fichier**: `apps/web/src/app/tickets/[id]/page-new.tsx`

---

## ✅ Étape 1: Structure de Base - TERMINÉE

### Créé
- ✅ `page-new.tsx` - Nouvelle page moderne
- ✅ Route test `/tickets/[id]/new`

### Composants Vérifiés
- ✅ CustomerCard existe
- ✅ BikeCard existe
- ✅ FinancialSummaryCard existe
- ✅ LineItemSelector existe
- ✅ LineItemsTable existe
- ✅ AppointmentPicker existe

### Architecture
```
Grid 12 colonnes
├─ Colonne Gauche (8/12)
│  ├─ CustomerCard
│  ├─ BikeCard
│  └─ Prestations et Pièces (LineItemsTable)
│
└─ Colonne Droite (4/12)
   ├─ FinancialSummaryCard (sticky)
   ├─ AppointmentPicker
   └─ Actions rapides
```

---

## 🧪 Tests à Effectuer

### Test 1: Accès Page
```bash
URL: http://localhost:3000/tickets/[ID_TICKET]/new

Vérifier:
- [ ] Page charge sans erreur
- [ ] Header affiche correctement
- [ ] Grid layout 8/4 visible
- [ ] Pas d'erreurs console
```

### Test 2: Chargement Données
```bash
Vérifier:
- [ ] Ticket chargé (titre, date, client)
- [ ] CustomerCard affiche infos client
- [ ] BikeCard affiche infos vélo
- [ ] Lignes chargées dans tableau
- [ ] Totaux calculés correctement
```

### Test 3: Ajout Ligne
```bash
Actions:
1. Cliquer "Ajouter une ligne"
2. Choisir type (Prestation/Pièce/Manuel)
3. Remplir formulaire
4. Enregistrer

Vérifier:
- [ ] Ligne ajoutée dans tableau
- [ ] Totaux mis à jour
- [ ] Toast "Ligne ajoutée" affiché
```

### Test 4: Modification Ligne
```bash
Actions:
1. Cliquer sur quantité d'une ligne
2. Modifier la valeur
3. Valider

Vérifier:
- [ ] Ligne modifiée
- [ ] Totaux recalculés
- [ ] Pas d'erreur
```

### Test 5: Suppression Ligne
```bash
Actions:
1. Cliquer icône poubelle
2. Confirmer

Vérifier:
- [ ] Ligne supprimée
- [ ] Totaux recalculés
- [ ] Toast "Ligne supprimée"
```

### Test 6: RDV Retour
```bash
Actions:
1. Section "Rendez-vous Retour"
2. Cliquer "Définir un RDV"
3. Choisir date/heure
4. Enregistrer

Vérifier:
- [ ] RDV créé
- [ ] Affiché dans la card
- [ ] Événement calendrier créé
```

### Test 7: Actions
```bash
Actions:
1. Cliquer "Générer Devis PDF"
2. Vérifier PDF s'ouvre

Vérifier:
- [ ] PDF généré
- [ ] Contient les lignes
- [ ] Totaux corrects
```

### Test 8: Responsive
```bash
Tester sur différentes tailles:
- [ ] Desktop (>1200px): Grid 8/4
- [ ] Tablet (768-1200px): Grid 8/4
- [ ] Mobile (<768px): Grid 12/12 (stack)
```

---

## 🐛 Erreurs Potentielles

### Erreur 1: Composant non trouvé
**Symptôme**: `Cannot find module '@/app/components/...'`

**Solution**: Vérifier imports et chemins

### Erreur 2: Données non chargées
**Symptôme**: Cards vides

**Solution**: Vérifier API calls et JWT token

### Erreur 3: Totaux incorrects
**Symptôme**: Calculs faux

**Solution**: Vérifier fonction `calculateTotals()`

---

## 📊 Résultats Tests

### Test 1: Accès Page
- [ ] ✅ Succès
- [ ] ❌ Échec (détails: ___)

### Test 2: Chargement Données
- [ ] ✅ Succès
- [ ] ❌ Échec (détails: ___)

### Test 3: Ajout Ligne
- [ ] ✅ Succès
- [ ] ❌ Échec (détails: ___)

### Test 4: Modification Ligne
- [ ] ✅ Succès
- [ ] ❌ Échec (détails: ___)

### Test 5: Suppression Ligne
- [ ] ✅ Succès
- [ ] ❌ Échec (détails: ___)

### Test 6: RDV Retour
- [ ] ✅ Succès
- [ ] ❌ Échec (détails: ___)

### Test 7: Actions
- [ ] ✅ Succès
- [ ] ❌ Échec (détails: ___)

### Test 8: Responsive
- [ ] ✅ Succès
- [ ] ❌ Échec (détails: ___)

---

## 🚀 Prochaines Étapes

### Si Tests OK
1. Commit page-new.tsx
2. Basculer route principale
3. Renommer page.tsx → page-old.tsx
4. Renommer page-new.tsx → page.tsx
5. Supprimer route test /new

### Si Tests KO
1. Identifier erreurs
2. Corriger
3. Re-tester
4. Documenter corrections

---

## 📝 Notes

- Page accessible via `/tickets/[ID]/new`
- Ancienne page toujours sur `/tickets/[ID]`
- Rollback facile si problème
- Tests manuels requis (pas de tests auto)

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes
