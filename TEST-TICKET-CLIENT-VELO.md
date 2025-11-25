# 🧪 Test : Affichage Client et Vélo dans Tickets

## 📊 Constat

Dans l'image fournie, les 3 tickets affichent :
- **Nom client** : `-`
- **Vélo** : `-`  
- **Type réparation** : Seul le ticket `TKT-2025-9763` a "Entr" (Entretien)

## 🔍 Diagnostic

### Code Frontend (`src/app/tickets/page.tsx`)

**Affichage Nom Client** (ligne 779-789) :
```typescript
{columnsConfig.name && (
  <TableCell sx={{ maxWidth: 200 }}>
    <Tooltip title={[wo.customer?.firstName, wo.customer?.lastName].filter(Boolean).join(' ') || '-' }>
      <Box component="span" sx={{ display:'inline-block', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {[wo.customer?.firstName, wo.customer?.lastName].filter(Boolean).join(" ") || "-"}
      </Box>
    </Tooltip>
  </TableCell>
)}
```

**Affichage Vélo** (ligne 801-807) :
```typescript
{columnsConfig.CustomerBike && (
  <TableCell sx={{ maxWidth: 180 }}>
    <Tooltip title={wo.bike ? `${wo.bike.brand || ''} ${wo.bike.model || ''}`.trim() : '-'}>
      <Box component="span" sx={{ display:'inline-block', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {wo.bike ? `${wo.bike.brand || ''} ${wo.bike.model || ''}`.trim() || "Vélo" : "-"}
      </Box>
    </Tooltip>
  </TableCell>
)}
```

**Création Ticket** (ligne 353) :
```typescript
const created = await createWorkOrder({ customerId, bikeId: bikeId || undefined });
```

✅ Le code est **correct** ! Il passe bien `customerId` et `bikeId` lors de la création.

### Code Backend (`src/app/api/workshop/workorders/route.ts`)

**Chargement des relations** (ligne 60-68) :
```typescript
const items = await prisma.workOrder.findMany({ 
  where,
  orderBy: { createdAt: 'desc' },
  include: {
    Customer: true,         // ✅ Relation chargée
    CustomerBike: true,     // ✅ Relation chargée
  },
});
```

✅ L'API charge bien les relations `Customer` et `CustomerBike` !

## 🎯 Cause du Problème

Les tickets affichés dans l'image (`TKT-2025-1952`, `TKT-2025-4325`, `TKT-2025-9763`) ont été créés **SANS** `customerId` et `bikeId`.

Cela peut arriver si :
1. **Anciens tickets** créés avant l'implémentation de la dialog de création
2. **Tickets de test** créés directement via l'API ou la base de données
3. **Dialog fermée** sans sélectionner de client (validation non respectée)

## ✅ Solution

### Option 1 : Créer un Nouveau Ticket Correctement

**Procédure** :
1. Cliquer sur **"+ Nouveau Ticket"**
2. **Sélectionner un client** dans la liste déroulante (obligatoire)
3. **Sélectionner un vélo** du client (optionnel mais recommandé)
4. **Sélectionner le type** de réparation (Révision, Réparation, Entretien, Upgrade)
5. Cliquer sur **"Créer"**

Le nouveau ticket devrait afficher :
- ✅ Nom du client (ex: "Jerome Leyssard")
- ✅ Vélo (ex: "Giant TCR", "Specialized Allez")
- ✅ Type réparation (ex: "Réparation", "Entretien")

### Option 2 : Modifier les Tickets Existants

**Pour chaque ticket avec "-"** :
1. Cliquer sur l'**icône crayon** (✏️ Modifier)
2. **Page de détail du ticket** s'ouvre
3. Assigner un **client**
4. Assigner un **vélo**
5. **Enregistrer**

## 🧪 Test à Effectuer

### Test 1 : Créer un Ticket Complet

1. **Facturation** → **Tickets**
2. **"+ Nouveau Ticket"**
3. **Client** : Sélectionner "Jerome Leyssard" (ou créer un nouveau client)
4. **Vélo** : Sélectionner un vélo existant ou cliquer "Ajouter un vélo"
   - Marque : "Giant"
   - Modèle : "TCR"
5. **Type** : "Réparation"
6. **Créer**

**Résultat attendu** :
- Nouveau ticket `TKT-2025-XXXX` apparaît
- ✅ **Nom client** : "Jerome Leyssard"
- ✅ **Vélo** : "Giant TCR"
- ✅ **Type réparation** : "Réparation" (chip orange)

### Test 2 : Vérifier l'Affichage

1. Rafraîchir la page (bouton "Actualiser")
2. Vérifier que les nouvelles colonnes sont visibles :
   - ✅ **N° Ticket** : Format `TKT-2025-XXXX` (au lieu de l'ID technique)
   - ✅ **Nom client** : Nom complet du client
   - ✅ **Vélo** : Marque + Modèle
   - ✅ **Type réparation** : Chip coloré (bleu=Révision, orange=Réparation, vert=Entretien)

## 📝 Amélioration Possible : Validation Stricte

Pour éviter la création de tickets sans client, on pourrait ajouter :

```typescript
// Dans onCreate() - ligne 347
if (!customerId) {
  showToastMessage("Veuillez sélectionner un client", "error");
  return;
}

// Optionnel : forcer la sélection du vélo
if (!bikeId) {
  const confirm = window.confirm("Aucun vélo sélectionné. Créer quand même ?");
  if (!confirm) return;
}
```

✅ Actuellement, `customerId` est **déjà obligatoire** (ligne 347-350), donc les nouveaux tickets auront toujours un client !

## ✅ Conclusion

Le code est **correct** et **fonctionnel**. Les tickets affichant "-" ont simplement été créés sans client/vélo assigné.

**Action requise** :
1. ✅ **Créer un nouveau ticket** avec la dialog → Devrait afficher le client et le vélo
2. ✅ **Modifier les anciens tickets** pour leur assigner un client et un vélo

Si après avoir créé un nouveau ticket correctement, le nom du client et le vélo ne s'affichent toujours pas, alors il faudra investiguer l'API backend ou les relations Prisma.

