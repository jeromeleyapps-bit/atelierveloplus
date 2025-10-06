# 🔍 Analyse Dashboard - Données des Widgets

## 🐛 Problèmes Identifiés

Les données affichées dans le dashboard semblent aléatoires ou incorrectes.

---

## 📊 Analyse des Widgets

### Widget 1: "Réparations en attente" ⚠️

**Code actuel** (lignes 84-88) :
```typescript
const [created, inProgress] = await Promise.all([
  searchWorkOrders({ status: "created" }),
  searchWorkOrders({ status: "in_progress" }),
]);
const pendingRepairs = (created?.length || 0) + (inProgress?.length || 0);
```

**Problème** :
- ✅ Logique correcte : compte `created` + `in_progress`
- ⚠️ **MAIS** : `searchWorkOrders({ status: "created" })` cherche probablement un statut exact "created"
- ⚠️ Les statuts réels dans la BDD sont peut-être différents

**Vérification nécessaire** :
```sql
SELECT DISTINCT status FROM "WorkOrder";
```

**Statuts attendus** : `created`, `in_progress`, `ready`, `delivered`

---

### Widget 2: "Terminés ce mois" ⚠️

**Code actuel** (lignes 91-101) :
```typescript
const [ready, delivered] = await Promise.all([
  searchWorkOrders({ status: "ready" }),
  searchWorkOrders({ status: "delivered" }),
]);
const now = new Date();
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
const inMonth = (w: WorkOrder) => {
  try { const d = new Date(w.createdAt as any); return d >= monthStart && d <= monthEnd; } catch { return false; }
};
const completedThisMonth = (ready || []).filter(inMonth).length + (delivered || []).filter(inMonth).length;
```

**Problèmes** :
- ❌ **Filtre sur `createdAt`** au lieu de la date de complétion !
- ❌ Un ticket créé ce mois mais terminé le mois dernier sera compté
- ❌ Un ticket créé le mois dernier mais terminé ce mois ne sera PAS compté

**Correction nécessaire** :
- Filtrer sur `readyAt` ou `deliveredAt` (dates de complétion)
- OU filtrer sur `updatedAt` si c'est la date de changement de statut

---

### Widget 3: "Chiffre d'affaires du mois" ✅

**Code actuel** (lignes 188-202) :
```typescript
const now = new Date();
const start = new Date(now.getFullYear(), now.getMonth(), 1);
const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
const invoices = await listInvoices({ status: "paid", from: start.toISOString(), to: end.toISOString() });
const sum = invoices.reduce((acc, i) => acc + (i.totalTTC || 0), 0);
setPaidRevenueMonth(sum);
```

**Analyse** :
- ✅ Logique correcte : factures payées ce mois
- ⚠️ **MAIS** : Dépend de l'implémentation de `listInvoices`
- ⚠️ Le filtre `from`/`to` filtre sur quelle date ? `paidAt` ou `createdAt` ?

**Vérification nécessaire** :
```typescript
// Dans /api/finance/invoices
// Vérifier si le filtre from/to utilise paidAt ou issueDate
```

---

### Widget 4: "Factures émises (à payer)" ✅

**Code actuel** (lignes 205-215) :
```typescript
const issued = await listInvoices({ status: 'issued' });
setInvoiceIssuedCount(issued.length);
```

**Analyse** :
- ✅ Logique correcte : compte les factures avec statut `issued`
- ✅ Simple et fiable

---

### Widget 5: "Clients actifs" ⚠️

**Code actuel** (lignes 104-105) :
```typescript
const customers = await listCustomers();
const activeCustomers = customers.length;
```

**Problème** :
- ❌ **Compte TOUS les clients**, pas seulement les actifs !
- ❌ Un client créé il y a 5 ans sans ticket récent est compté comme "actif"

**Correction nécessaire** :
- Définir "actif" : client avec au moins 1 ticket dans les X derniers mois ?
- Filtrer les clients ayant des tickets récents

---

## 🔧 Corrections Proposées

### 1. Widget "Terminés ce mois" - Filtrer sur Date de Complétion

**Problème** : Filtre sur `createdAt` au lieu de la date de complétion

**Solution A** : Utiliser `updatedAt` (si c'est la date de changement de statut)
```typescript
const inMonth = (w: WorkOrder) => {
  try { 
    const d = new Date(w.updatedAt as any); 
    return d >= monthStart && d <= monthEnd; 
  } catch { 
    return false; 
  }
};
```

**Solution B** : Ajouter champs `readyAt` et `deliveredAt` dans le schéma
```prisma
model WorkOrder {
  // ...
  readyAt     DateTime?
  deliveredAt DateTime?
}
```

Puis filtrer :
```typescript
const inMonth = (w: WorkOrder) => {
  try { 
    const completionDate = w.deliveredAt || w.readyAt;
    if (!completionDate) return false;
    const d = new Date(completionDate); 
    return d >= monthStart && d <= monthEnd; 
  } catch { 
    return false; 
  }
};
```

---

### 2. Widget "Clients actifs" - Filtrer Vraiment les Actifs

**Option 1** : Clients avec tickets dans les 6 derniers mois
```typescript
async function fetchStatsReal(): Promise<Stats> {
  // ...
  
  // Clients actifs: avec au moins 1 ticket dans les 6 derniers mois
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const allWorkOrders = await searchWorkOrders({});
  const recentWorkOrders = allWorkOrders.filter(wo => {
    try {
      const d = new Date(wo.createdAt as any);
      return d >= sixMonthsAgo;
    } catch {
      return false;
    }
  });
  
  const uniqueCustomerIds = new Set(
    recentWorkOrders
      .map(wo => wo.customerId)
      .filter(Boolean)
  );
  
  const activeCustomers = uniqueCustomerIds.size;
  
  // ...
}
```

**Option 2** : Total clients (renommer le widget)
```typescript
// Garder le code actuel mais renommer
<Typography color="textSecondary" gutterBottom>
  Total clients
</Typography>
```

---

### 3. Vérifier API `searchWorkOrders`

**Fichier** : `src/lib/api.ts`

Vérifier que `searchWorkOrders` accepte bien un paramètre `status` :
```typescript
export async function searchWorkOrders(params: { 
  status?: string;
  // ...
}): Promise<WorkOrder[]> {
  // ...
}
```

---

### 4. Vérifier API `listInvoices`

**Fichier** : `src/lib/api.ts`

Vérifier que le filtre `from`/`to` filtre sur `paidAt` et pas `createdAt` :
```typescript
export async function listInvoices(params?: { 
  status?: string;
  from?: string;  // Doit filtrer sur paidAt
  to?: string;    // Doit filtrer sur paidAt
}): Promise<Invoice[]> {
  // ...
}
```

---

## 🧪 Tests de Vérification

### Test 1: Réparations en Attente

```sql
-- Vérifier les statuts réels
SELECT status, COUNT(*) 
FROM "WorkOrder" 
GROUP BY status;

-- Résultat attendu:
-- created      | 5
-- in_progress  | 3
-- ready        | 2
-- delivered    | 10
```

Si les statuts sont différents (ex: `Created`, `In Progress`), corriger le code.

---

### Test 2: Terminés ce Mois

```sql
-- Tickets terminés ce mois (par updatedAt)
SELECT COUNT(*) 
FROM "WorkOrder" 
WHERE status IN ('ready', 'delivered')
AND "updatedAt" >= DATE_TRUNC('month', CURRENT_DATE)
AND "updatedAt" < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
```

Comparer avec le widget.

---

### Test 3: CA du Mois

```sql
-- Factures payées ce mois
SELECT SUM("totalTTC") 
FROM "Invoice" 
WHERE status = 'paid'
AND "paidAt" >= DATE_TRUNC('month', CURRENT_DATE)
AND "paidAt" < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
```

Comparer avec le widget.

---

### Test 4: Factures Émises

```sql
-- Factures émises (non payées)
SELECT COUNT(*) 
FROM "Invoice" 
WHERE status = 'issued';
```

Comparer avec le widget.

---

### Test 5: Clients Actifs

```sql
-- Clients avec au moins 1 ticket dans les 6 derniers mois
SELECT COUNT(DISTINCT "customerId") 
FROM "WorkOrder" 
WHERE "createdAt" >= CURRENT_DATE - INTERVAL '6 months'
AND "customerId" IS NOT NULL;
```

Comparer avec le widget.

---

## 📋 Checklist de Corrections

### Priorité Haute
- [ ] **Vérifier les statuts** dans la BDD (`created` vs `Created`)
- [ ] **Corriger "Terminés ce mois"** - Filtrer sur date de complétion
- [ ] **Corriger "Clients actifs"** - Filtrer vraiment les actifs

### Priorité Moyenne
- [ ] **Vérifier API `listInvoices`** - Filtre sur `paidAt` ?
- [ ] **Vérifier API `searchWorkOrders`** - Paramètre `status` fonctionne ?

### Priorité Basse
- [ ] **Ajouter champs `readyAt`/`deliveredAt`** dans le schéma (optionnel)
- [ ] **Améliorer cache** - Invalider après actions

---

## 🎯 Recommandations

### 1. Ajouter Logs de Debug

```typescript
async function fetchStatsReal(): Promise<Stats> {
  const [created, inProgress] = await Promise.all([
    searchWorkOrders({ status: "created" }),
    searchWorkOrders({ status: "in_progress" }),
  ]);
  
  console.log('[Dashboard] Created:', created?.length);
  console.log('[Dashboard] InProgress:', inProgress?.length);
  
  const pendingRepairs = (created?.length || 0) + (inProgress?.length || 0);
  console.log('[Dashboard] PendingRepairs:', pendingRepairs);
  
  // ...
}
```

### 2. Afficher Date de Dernière Mise à Jour

```typescript
<Typography variant="caption" color="text.secondary">
  Mis à jour il y a {cacheAge} minutes
</Typography>
```

### 3. Bouton "Rafraîchir"

```typescript
<Button onClick={() => {
  // Invalider cache
  localStorage.removeItem('dashboard-stats');
  window.location.reload();
}}>
  Rafraîchir
</Button>
```

---

**Analyse complète** : ✅  
**Corrections à appliquer** : 3 priorité haute  
**Tests SQL fournis** : 5  
**Prêt pour debugging** : 🔍
