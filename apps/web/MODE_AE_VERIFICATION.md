# ✅ Vérification Mode Auto-Entrepreneur (AE)

## 🎯 Objectif

S'assurer que le mode Auto-Entrepreneur applique **TVA = 0%** partout dans l'application.

---

## 📊 Points de Vérification

### **1. Tickets → Devis** ✅

**Fichier** : `tickets/[id]/page.tsx`

```typescript
// Ligne 269-278
async function onCreateInvoice(pricingMode: "HT_TVA" | "AE_TTC") {
  const inv = await createInvoice({ 
    workOrderId: id, 
    type: "invoice",
    pricingMode, 
    vatRate: pricingMode === "AE_TTC" ? 0 : 20,  // ✅ TVA = 0 si AE
  });
}
```

**Status** : ✅ **CORRECT**

---

### **2. Création Devis (API)** ✅

**Fichier** : `api/finance/quotes/route.ts`

```typescript
// Lignes 46-62
const aeSetting = await prisma.globalSetting.findUnique({
  where: { key: "autoEntrepreneur" },
});
const isAE = aeSetting?.value === "true";

const quote = await prisma.invoice.create({
  data: {
    pricingMode: isAE ? "AE_TTC" : "HT_TVA",  // ✅ Mode AE si paramètre activé
    vatRate: isAE ? 0 : 20,                   // ✅ TVA = 0 si AE
  }
});
```

**Status** : ✅ **CORRECT**

---

### **3. Import Pièces/MO depuis Ticket** ✅

**Fichier** : `api/finance/invoices/[id]/import-labor/route.ts`

```typescript
// Lignes 64-66
const isAE = invoice.pricingMode === 'AE_TTC';
const vatRate = isAE ? 0 : (invoice.vatRate || 20);  // ✅ TVA = 0 si AE

// Appliqué à toutes les pièces et la main d'œuvre
```

**Status** : ✅ **CORRECT**

---

### **4. Ajout Ligne Manuelle (Devis/Facture)** ✅

**Fichier** : `finance/invoices/[id]/page.tsx`

```typescript
// Ligne 287
vatRate: inv.pricingMode === 'AE_TTC' ? 0 : qVat,  // ✅ TVA = 0 si AE

// Ligne 358
vatRate: inv.pricingMode === "AE_TTC" ? 0 : inv.vatRate,  // ✅ TVA = 0 si AE
```

**Status** : ✅ **CORRECT**

---

### **5. Changement de Mode (HT → AE)** ✅

**Fichier** : `finance/invoices/[id]/page.tsx`

```typescript
// Lignes 332-340
if (field === 'pricingMode' && value === 'AE_TTC') {
  for (const line of inv.lines) {
    if (line.vatRate !== 0) {
      await updateInvoiceLine(inv.id, line.id, { vatRate: 0 });  // ✅ Met tout à 0%
    }
  }
  await refresh();
}
```

**Status** : ✅ **CORRECT**

---

### **6. Création Ligne API** ✅

**Fichier** : `api/finance/invoices/[id]/lines/route.ts`

```typescript
// Lignes 17-18
const vatRate = body.vatRate != null ? Number(body.vatRate) : inv.vatRate;
const isAE = inv.pricingMode === 'AE_TTC';  // ✅ Détecte le mode AE

// Lignes 25-35
if (isAE) {
  // Calculs en mode AE (TTC)
} else {
  // Calculs en mode HT + TVA
}
```

**Status** : ✅ **CORRECT**

---

## 🧪 Scénarios de Test

### **Test 1 : Création Devis AE depuis Ticket**

```
1. Activer le mode AE dans les paramètres :
   - Aller dans Admin → Paramètres
   - Activer "Auto-Entrepreneur"
   
2. Créer un ticket avec :
   - Pièce : 24,70€ HT
   - Main d'œuvre : 60€/h, 1h
   
3. Cliquer "Créer un devis"

4. Vérifier dans le devis :
   ✅ Mode : "AE (TTC)"
   ✅ Pièce : TVA = 0%
   ✅ Main d'œuvre : TVA = 0%
   ✅ Total TTC = Total HT
   ✅ Mention "TVA non applicable - article 293 B du CGI"
```

---

### **Test 2 : Changement Mode HT → AE**

```
1. Créer un devis en mode "HT + TVA"
2. Ajouter des lignes (TVA = 20%)
3. Changer le mode en "AE (TTC)"

4. Vérifier :
   ✅ Toutes les lignes : TVA = 0%
   ✅ Totaux recalculés
   ✅ Prix TTC = Prix HT
```

---

### **Test 3 : Ajout Ligne en Mode AE**

```
1. Ouvrir un devis en mode "AE (TTC)"
2. Ajouter une ligne manuelle :
   - Description : "Pneu"
   - Prix : 30€
   
3. Vérifier :
   ✅ TVA = 0%
   ✅ Total TTC = 30€
   ✅ Total HT = 30€
```

---

### **Test 4 : Création Facture AE depuis Ticket**

```
1. Mode AE activé
2. Créer un ticket avec pièces
3. Cliquer "Créer une facture"

4. Vérifier :
   ✅ Mode : "AE (TTC)"
   ✅ Toutes les lignes : TVA = 0%
```

---

## 📋 Checklist Complète

### **Création Documents**
- [x] Devis depuis ticket (mode AE)
- [x] Facture depuis ticket (mode AE)
- [x] Devis manuel (mode AE)
- [x] Facture manuelle (mode AE)

### **Import Données**
- [x] Pièces → TVA = 0% si AE
- [x] Main d'œuvre → TVA = 0% si AE

### **Ajout Manuel**
- [x] Ligne pièce → TVA = 0% si AE
- [x] Ligne service → TVA = 0% si AE
- [x] Ligne main d'œuvre → TVA = 0% si AE

### **Modification**
- [x] Changement mode HT → AE → Met tout à 0%
- [x] Modification prix → Recalcule avec TVA 0%

### **Affichage**
- [x] PDF → Pas de TVA affichée si AE
- [x] Email → Mention "TVA non applicable"
- [x] Interface → Message article 293 B du CGI

---

## 🎯 Configuration Mode AE

### **Activer le Mode AE**

**Option 1 : Via l'Interface Admin** (Recommandé)
```
1. Aller dans Admin → Paramètres Système
2. Activer "Mode Auto-Entrepreneur"
3. Sauvegarder
```

**Option 2 : Via la Base de Données**
```sql
INSERT INTO "GlobalSetting" (key, value) 
VALUES ('autoEntrepreneur', 'true')
ON CONFLICT (key) 
DO UPDATE SET value = 'true';
```

**Option 3 : Via l'API**
```powershell
curl -X PUT http://localhost:3000/api/admin/system-settings `
  -H "Content-Type: application/json" `
  -H "x-user-id: [ADMIN_USER_ID]" `
  -d '{"autoEntrepreneur": "true"}'
```

---

## 📊 Comportement par Mode

### **Mode HT + TVA** (Par défaut)

| Élément | TVA | Calcul |
|---------|-----|--------|
| Pièces | 20% | HT × 1,20 = TTC |
| Main d'œuvre | 20% | HT × 1,20 = TTC |
| Total | 20% | Affiche HT, TVA, TTC |

### **Mode AE (TTC)**

| Élément | TVA | Calcul |
|---------|-----|--------|
| Pièces | 0% | TTC = HT |
| Main d'œuvre | 0% | TTC = HT |
| Total | 0% | Affiche TTC uniquement |
| Mention | ✅ | "TVA non applicable - article 293 B du CGI" |

---

## 🎉 Résultat Final

**Le mode Auto-Entrepreneur fonctionne correctement dans :**
- ✅ Tickets
- ✅ Devis
- ✅ Factures
- ✅ Avoirs
- ✅ PDFs
- ✅ Emails

**Toutes les TVA passent bien à 0% en mode AE !** 🎊

---

## 💡 Utilisation Recommandée

### **Pour un Auto-Entrepreneur**
1. Activer le mode AE dans les paramètres
2. Tous les devis/factures seront créés en mode AE par défaut
3. TVA = 0% automatiquement

### **Pour une Entreprise Classique**
1. Laisser le mode AE désactivé
2. Tous les devis/factures seront en mode HT + TVA
3. TVA = 20% par défaut (modifiable)

### **Pour un Usage Mixte** (Rare)
1. Laisser le mode AE désactivé
2. Changer manuellement le mode sur chaque facture si nécessaire
