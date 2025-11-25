# 🔧 Corrections Systématiques - admin/backup/route.ts

**Fichier**: `src/app/api/admin/backup/route.ts`  
**Erreurs**: 85 erreurs TypeScript  
**Type**: Accès aux propriétés sur type `unknown`

---

## Stratégie

Le fichier contient 32 appels à `restoreTable` avec le même pattern d'erreur.  
Solution: Ajouter des casts `as Record<string, unknown>` et `as never` pour chaque callback.

---

## Pattern de correction

```typescript
// ❌ AVANT
await restoreTable('tableName', data.tableName, async (item) => {
  await prisma.tableName.upsert({
    where: { id: item.id },
    update: item,
    create: item,
  });
});

// ✅ APRÈS
await restoreTable('tableName', data.tableName, async (item) => {
  const itemData = item as Record<string, unknown>;
  await prisma.tableName.upsert({
    where: { id: itemData.id as string },
    update: itemData as never,
    create: itemData as never,
  });
});
```

---

## Liste des tables à corriger

1. ✅ users (corrigé)
2. ✅ globalSettings (corrigé)
3. calendarConfigs
4. serviceRates
5. pricingMargins
6. suppliers
7. catalogItems
8. appSettings
9. systemSettings
10. bikes
11. supplierProducts (cas spécial: composite key)
12. customers
13. customerBikes (cas spécial: composite key)
14. bookings
15. supplierItems
16. supplierOffers
17. supplierCredentials
18. stockMovements
19. workOrders (cas spécial: multiple FK)
20. workOrderLines
21. communications
22. invoices (cas spécial: multiple FK)
23. invoiceLines
24. invoicePayments
25. cashRegisters
26. invoiceSequences (cas spécial: composite key)
27. calendarEvents
28. calendarBlocks
29. emailTemplates (cas spécial: name as unique)
30. smsTemplates (cas spécial: name as unique)
31. licenses (cas spécial: key as unique)
32. licenseVerifications

---

## Approche Alternative (Plus Efficace)

Au lieu de corriger 32 fois le même pattern, je vais:

1. Modifier le typage de la fonction `restoreTable`
2. Ajouter un helper pour caster automatiquement les items

```typescript
// Type helper
type AnyRecord = Record<string, unknown>;

// Fonction helper modifiée
const restoreTable = async (
  tableName: string,
  items: unknown[],
  restoreFn: (item: AnyRecord) => Promise<void>
) => {
  restored[tableName] = 0;
  errors[tableName] = [];
  
  for (const item of items || []) {
    try {
      await restoreFn(item as AnyRecord); // Cast ici
      restored[tableName]++;
    } catch (error: unknown) {
      const itemId = (item as {id?: string}).id || 'unknown';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorMsg = `Failed to restore ${tableName} ${itemId}: ${errorMessage}`;
      console.error(errorMsg);
      errors[tableName].push(errorMsg);
    }
  }
};
```

Cette approche réduit les modifications nécessaires de 32 à 1.

---

## Décision

Je vais utiliser l'approche alternative (modifier la signature de `restoreTable`) +  
ajouter les casts `as never` dans chaque callback Prisma (requis par TypeScript pour les types complexes).

Cela réduit les modifications de 32 × 5 lignes = 160 lignes à environ 30 lignes.

---

**Prochaine action**: Appliquer l'approche alternative

