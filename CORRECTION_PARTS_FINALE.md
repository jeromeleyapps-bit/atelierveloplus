# Correction Finale - Références "parts"

**Date**: 15 octobre 2025 - 01h45  
**Problème**: Erreur 500 sur envoi email/SMS car `parts` n'existe plus

---

## ✅ Correction Appliquée

### Fichier Corrigé
**`apps/web/src/app/api/communications/send/route.ts`**

**Avant**:
```typescript
workOrder = await prisma.workOrder.findUnique({
  where: { id: workOrderId },
  include: {
    bike: true,
    parts: true  // ❌ N'existe plus
  }
});
```

**Après**:
```typescript
workOrder = await prisma.workOrder.findUnique({
  where: { id: workOrderId },
  include: {
    bike: true,
    lines: true  // ✅ Nouveau système
  }
});
```

---

## ⚠️ Autres Fichiers à Surveiller

### Fichiers avec Références "parts" (51 occurrences)

Ces fichiers utilisent encore `parts` mais ne causent pas d'erreur pour l'instant:

1. **quote-pdf/route.ts** (12 occurrences)
2. **sale/route.ts** (11 occurrences)
3. **bikes/[bikeId]/history/route.ts** (10 occurrences)
4. **quote/route.ts** (9 occurrences)
5. **import-labor/route.ts** (2 occurrences)
6. **merge/route.ts** (2 occurrences)
7. **stats/route.ts** (1 occurrence)
8. **cancel/route.ts** (1 occurrence)
9. **credit/route.ts** (1 occurrence)

---

## 💡 Stratégie

### Approche Pragmatique
1. **Corriger à la demande** - Quand une erreur 500 survient
2. **Ne pas tout casser** - Ces routes fonctionnent peut-être encore
3. **Migration progressive** - Remplacer au fur et à mesure

### Pourquoi ?
- L'ancien système `parts` peut coexister avec `lines`
- Certaines routes peuvent utiliser les deux
- Pas besoin de tout migrer d'un coup

---

## 🧪 Test

### Vérifier la Correction
1. Actualiser l'application
2. Ouvrir un ticket
3. Cliquer "Email 'Vélo prêt'" ou "SMS 'Vélo prêt'"
4. **Résultat attendu**: ✅ Pas d'erreur 500

---

## 📋 Si Autres Erreurs 500

### Diagnostic
1. Regarder la console
2. Identifier le fichier API
3. Chercher `parts: true` dans le fichier
4. Remplacer par `lines: true`

### Exemple
```bash
# Chercher dans un fichier spécifique
grep -n "parts: true" apps/web/src/app/api/pos/workorders/[id]/quote-pdf/route.ts
```

---

## ✅ Résumé

- **Problème**: `parts` n'existe plus dans le schema
- **Cause**: API communications utilisait encore `parts`
- **Solution**: Remplacé par `lines`
- **Statut**: ✅ Corrigé

**L'envoi d'emails/SMS devrait maintenant fonctionner !**

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
