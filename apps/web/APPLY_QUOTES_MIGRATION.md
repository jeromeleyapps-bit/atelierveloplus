# 🚀 Application Migration Devis - Guide Rapide

## ⚠️ Problème: `npx prisma db push` Bloque

Solution : **Migration SQL directe** dans Supabase

---

## ✅ Méthode Rapide (5 minutes)

### Étape 1: Générer le Client Prisma

```powershell
npx prisma generate
```

**Attendez** que ça se termine (~30 secondes).

---

### Étape 2: Exécuter le SQL dans Supabase

1. **Ouvrez** https://supabase.com/dashboard
2. **Sélectionnez** votre projet
3. **Allez dans** Database → SQL Editor
4. **Cliquez** "New query"
5. **Copiez-collez** le contenu de `add-quotes-fields.sql` :

```sql
-- Migration SQL pour ajouter le support des devis

ALTER TABLE "Invoice" 
ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "convertedToId" TEXT;

COMMENT ON COLUMN "Invoice"."type" IS 'invoice | quote | credit';

CREATE INDEX IF NOT EXISTS "Invoice_convertedToId_idx" ON "Invoice"("convertedToId");
CREATE INDEX IF NOT EXISTS "Invoice_type_idx" ON "Invoice"("type");
CREATE INDEX IF NOT EXISTS "Invoice_validUntil_idx" ON "Invoice"("validUntil");

SELECT 'Migration completed successfully!' as message;
```

6. **Cliquez** "Run" (ou Ctrl+Enter)

**Résultat attendu** : `Migration completed successfully!`

---

### Étape 3: Vérifier

```powershell
node scripts/check-tables.js
```

Vous devriez voir la table `Invoice` avec les nouveaux champs.

---

## 🎯 Ou Utilisez le Script Automatique

```powershell
.\apply-quotes-migration.ps1
```

Ce script :
1. Génère le client Prisma
2. Affiche le SQL à exécuter
3. Attend que vous l'exécutiez dans Supabase
4. Vérifie que tout fonctionne

---

## ✅ Vérification Rapide

### Dans Supabase

Allez dans **Database → Tables → Invoice**

Vous devriez voir les nouveaux champs :
- ✅ `validUntil` (timestamptz)
- ✅ `convertedAt` (timestamptz)
- ✅ `convertedToId` (text)

---

## 🎉 C'est Tout !

Une fois la migration appliquée, vous pouvez :

### Tester l'API

```bash
# Créer un devis
curl -X POST http://localhost:3000/api/finance/quotes \
  -H "Content-Type: application/json" \
  -d '{"workOrderId":"xxx","validDays":30}'

# Lister les devis
curl http://localhost:3000/api/finance/quotes

# Convertir en facture
curl -X POST http://localhost:3000/api/finance/invoices/QUOTE_ID/convert-to-invoice
```

### Utiliser dans le Code

```typescript
import { createQuote, convertQuoteToInvoice } from '@/lib/api';

// Créer un devis
const quote = await createQuote({ 
  workOrderId: ticket.id,
  validDays: 30 
});

// Convertir en facture
const result = await convertQuoteToInvoice(quote.id);
console.log('Facture créée:', result.invoice.id);
```

---

## 🐛 Dépannage

### "Column already exists"
C'est normal si vous avez déjà essayé. Le SQL utilise `IF NOT EXISTS`.

### "Table Invoice does not exist"
Vérifiez que vous êtes sur le bon projet Supabase.

### "Permission denied"
Vérifiez que vous êtes connecté avec le bon compte Supabase.

---

## 📝 Prochaines Étapes

Une fois la migration appliquée :

1. **Tester l'app** : `npm run dev`
2. **Implémenter l'UI** : Boutons, onglets, etc.
3. **Tester le workflow** : Créer devis → Convertir → Facture

---

**Prêt ? Exécutez le SQL dans Supabase !** 🚀
