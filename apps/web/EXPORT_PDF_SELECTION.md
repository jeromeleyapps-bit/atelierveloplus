# ✅ Export PDF et Sélection Multiple - Implémentation

## 🎯 Problèmes Résolus

### **1. Export PDF des Devis** 📄
**Problème** : Impossible d'exporter les devis en PDF

**Solution** : Ajout de boutons d'export PDF et d'envoi email dans la page de détail

**Implémentation** :
```typescript
<Button 
  size="small" 
  variant="outlined" 
  startIcon={<PictureAsPdfIcon />}
  component="a"
  href={`/api/finance/invoices/${id}/pdf`}
  target="_blank"
  sx={{ textTransform: 'none' }}
>
  PDF
</Button>

<Button 
  size="small" 
  variant="outlined" 
  startIcon={<EmailIcon />}
  onClick={sendInvoiceEmail}
  sx={{ textTransform: 'none' }}
>
  Email
</Button>
```

**Résultat** :
- ✅ Bouton "PDF" pour télécharger le document
- ✅ Bouton "Email" pour envoyer par email
- ✅ Fonctionne pour les 3 types (Factures, Devis, Avoirs)
- ✅ Le nom du fichier s'adapte : `devis_XXX.pdf`, `facture_XXX.pdf`, `avoir_XXX.pdf`

---

### **2. Sélection Multiple** ☑️
**Besoin** : Sélectionner plusieurs devis/factures/avoirs et effectuer des actions groupées

**Status** : ⏳ À implémenter dans la page `/finance`

**Plan d'implémentation** :

#### **Étape 1 : Ajouter l'état de sélection**
```typescript
const [selectedIds, setSelectedIds] = useState<string[]>([]);

const handleSelectAll = () => {
  if (selectedIds.length === processed.length) {
    setSelectedIds([]);
  } else {
    setSelectedIds(processed.map(inv => inv.id));
  }
};

const handleToggleSelect = (id: string) => {
  setSelectedIds(prev => 
    prev.includes(id) 
      ? prev.filter(i => i !== id)
      : [...prev, id]
  );
};
```

#### **Étape 2 : Ajouter des checkboxes**
```typescript
<TableCell padding="checkbox">
  <Checkbox
    checked={selectedIds.includes(inv.id)}
    onChange={() => handleToggleSelect(inv.id)}
  />
</TableCell>
```

#### **Étape 3 : Bandeau d'actions flottant**
```typescript
{selectedIds.length > 0 && (
  <Paper
    elevation={8}
    sx={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      p: 2,
      zIndex: 1000,
      display: 'flex',
      gap: 2,
      alignItems: 'center',
    }}
  >
    <Typography variant="body2" fontWeight={600}>
      {selectedIds.length} document{selectedIds.length > 1 ? 's' : ''} sélectionné{selectedIds.length > 1 ? 's' : ''}
    </Typography>
    
    <Button
      variant="outlined"
      startIcon={<EditIcon />}
      onClick={handleBulkEdit}
    >
      Modifier
    </Button>
    
    <Button
      variant="outlined"
      color="error"
      startIcon={<DeleteIcon />}
      onClick={handleBulkDelete}
    >
      Supprimer
    </Button>
    
    <Button
      variant="outlined"
      startIcon={<EmailIcon />}
      onClick={handleBulkEmail}
    >
      Envoyer
    </Button>
    
    <IconButton
      size="small"
      onClick={() => setSelectedIds([])}
    >
      <CloseIcon />
    </IconButton>
  </Paper>
)}
```

#### **Étape 4 : Actions groupées**
```typescript
async function handleBulkDelete() {
  if (!confirm(`Supprimer ${selectedIds.length} document(s) ?`)) return;
  
  try {
    await Promise.all(
      selectedIds.map(id => 
        fetch(`/api/finance/invoices/${id}`, { method: 'DELETE' })
      )
    );
    setToast({ 
      open: true, 
      message: `${selectedIds.length} document(s) supprimé(s)`, 
      severity: 'success' 
    });
    setSelectedIds([]);
    refresh();
  } catch (e) {
    setToast({ 
      open: true, 
      message: 'Erreur lors de la suppression', 
      severity: 'error' 
    });
  }
}

async function handleBulkEmail() {
  try {
    await Promise.all(
      selectedIds.map(id => 
        fetch(`/api/finance/invoices/${id}/email`, { method: 'POST' })
      )
    );
    setToast({ 
      open: true, 
      message: `${selectedIds.length} document(s) envoyé(s)`, 
      severity: 'success' 
    });
    setSelectedIds([]);
  } catch (e) {
    setToast({ 
      open: true, 
      message: 'Erreur lors de l\'envoi', 
      severity: 'error' 
    });
  }
}
```

---

## 🎨 Design du Bandeau d'Actions

### **Position**
- Fixe en bas de l'écran
- Centré horizontalement
- Z-index élevé (1000) pour être au-dessus du contenu
- Ombre portée (elevation 8) pour le démarquer

### **Contenu**
- Compteur de sélection : "3 documents sélectionnés"
- Bouton "Modifier" : Ouvre un dialog pour modifier en masse
- Bouton "Supprimer" : Supprime tous les documents sélectionnés
- Bouton "Envoyer" : Envoie tous les documents par email
- Bouton "×" : Annule la sélection

### **Comportement**
- Apparaît dès qu'au moins 1 document est sélectionné
- Disparaît quand la sélection est vidée
- Animation d'entrée/sortie fluide

---

## 📋 Fichiers à Modifier

### **Pour l'export PDF (✅ Fait)**
- ✅ `/finance/invoices/[id]/page.tsx` - Ajout boutons PDF et Email
- ✅ Icônes importées : `PictureAsPdfIcon`, `EmailIcon`

### **Pour la sélection multiple (⏳ À faire)**
- ⏳ `/finance/page.tsx` - Ajouter état et UI de sélection
- ⏳ Composants : `QuotesTab`, `InvoicesTab`, `CreditsTab`
- ⏳ API : Créer route `/api/finance/invoices/bulk` pour actions groupées

---

## 🧪 Tests à Effectuer

### **Export PDF**
- [x] Ouvrir un devis → Cliquer "PDF" → Le PDF se télécharge
- [x] Ouvrir une facture → Cliquer "PDF" → Le PDF se télécharge
- [x] Ouvrir un avoir → Cliquer "PDF" → Le PDF se télécharge
- [x] Vérifier le nom du fichier : `devis_XXX.pdf`, etc.

### **Envoi Email**
- [ ] Cliquer "Email" → Le document est envoyé
- [ ] Vérifier le toast de confirmation

### **Sélection Multiple** (Quand implémenté)
- [ ] Cocher plusieurs documents
- [ ] Le bandeau apparaît
- [ ] Supprimer en masse → Confirmation → Suppression
- [ ] Envoyer en masse → Envoi → Toast de confirmation
- [ ] Annuler la sélection → Le bandeau disparaît

---

## 🚀 Prochaines Étapes

1. ✅ **Export PDF** - TERMINÉ
2. ⏳ **Sélection multiple** - À implémenter
3. ⏳ **Actions groupées** - À implémenter
4. ⏳ **Tests utilisateur** - À effectuer

**Voulez-vous que j'implémente maintenant la sélection multiple avec le bandeau d'actions ?**
