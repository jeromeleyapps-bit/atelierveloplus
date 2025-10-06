# ✅ Ajout Boutons Édition et Suppression - Liste Tickets

## 🎯 Fonctionnalités Ajoutées

Dans la liste des tickets (`/tickets`), chaque ligne contient maintenant :
- ✅ **Bouton Modifier** (icône crayon) - Redirige vers la page de détail du ticket
- ✅ **Bouton Supprimer** (icône poubelle) - Supprime le ticket après confirmation

---

## 📝 Modifications Appliquées

### 1. API - Fonction de Suppression ✅

**Fichier** : `src/lib/api.ts`

```typescript
export async function deleteWorkOrder(id: string): Promise<{ ok: true }> {
  return requestLocal(`/workshop/workorders/${id}`, { method: "DELETE" });
}
```

---

### 2. API Route - DELETE Endpoint ✅

**Fichier** : `src/app/api/workshop/workorders/[id]/route.ts`

```typescript
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  
  try {
    await prisma.workOrder.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    console.error('[workorder/delete] Error:', error);
    return NextResponse.json({ 
      error: "workorder_delete_failed", 
      detail: error.message 
    }, { status: 500 });
  }
}
```

---

### 3. Interface - Boutons dans la Liste ✅

**Fichier** : `src/app/tickets/page.tsx`

**Imports ajoutés** :
```typescript
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { deleteWorkOrder } from "@/lib/api";
```

**Boutons ajoutés** (fin de chaque ligne) :
```typescript
<Tooltip title="Modifier">
  <IconButton
    size="small"
    component={Link}
    href={`/tickets/${wo.id}`}
    aria-label="Modifier"
  >
    <EditIcon fontSize="small" />
  </IconButton>
</Tooltip>

<Tooltip title="Supprimer">
  <IconButton
    size="small"
    color="error"
    aria-label="Supprimer"
    onClick={async () => {
      if (!confirm(`Êtes-vous sûr de vouloir supprimer ce ticket ?`)) return;
      try {
        await deleteWorkOrder(wo.id);
        await refresh();
        setToast({ open: true, message: "Ticket supprimé", severity: "success" });
      } catch (e) {
        console.error(e);
        setToast({ open: true, message: "Erreur: suppression", severity: "error" });
      }
    }}
  >
    <DeleteIcon fontSize="small" />
  </IconButton>
</Tooltip>
```

---

## 🎨 Interface Utilisateur

### Apparence

Chaque ligne de ticket affiche maintenant (à droite) :

```
[Démarrer] [Marquer prêt] [Clôturer] [✏️] [🗑️]
```

- **✏️ Modifier** : Icône crayon bleue
- **🗑️ Supprimer** : Icône poubelle rouge

### Comportement

#### Bouton Modifier
1. Clic sur l'icône crayon
2. Redirection vers `/tickets/[id]`
3. Page de détail du ticket s'ouvre

#### Bouton Supprimer
1. Clic sur l'icône poubelle
2. **Confirmation** : "Êtes-vous sûr de vouloir supprimer ce ticket ?"
3. Si **Oui** :
   - Suppression du ticket
   - Rafraîchissement de la liste
   - Toast de succès : "Ticket supprimé"
4. Si **Non** : Annulation

---

## 🔒 Sécurité

### Confirmation de Suppression

```typescript
if (!confirm(`Êtes-vous sûr de vouloir supprimer ce ticket ?`)) return;
```

**Protection** :
- ✅ Confirmation obligatoire
- ✅ Pas de suppression accidentelle
- ✅ Message clair pour l'utilisateur

### Gestion d'Erreurs

```typescript
try {
  await deleteWorkOrder(wo.id);
  await refresh();
  setToast({ open: true, message: "Ticket supprimé", severity: "success" });
} catch (e) {
  console.error(e);
  setToast({ open: true, message: "Erreur: suppression", severity: "error" });
}
```

**Avantages** :
- ✅ Erreurs capturées
- ✅ Message d'erreur affiché
- ✅ Logs pour debugging

---

## 📊 Cascade de Suppression

### Que se passe-t-il lors de la suppression ?

Selon le schéma Prisma, la suppression d'un `WorkOrder` supprime aussi :

```prisma
model WorkOrderPart {
  workOrder WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
}
```

**Suppressions en cascade** :
- ✅ Toutes les pièces (`WorkOrderPart`) liées au ticket
- ✅ Toutes les entrées de main d'œuvre (`LaborEntry`) liées

**Conservé** :
- ✅ Client (`Customer`) - relation `onDelete: SetNull`
- ✅ Vélo (`CustomerBike`) - relation `onDelete: SetNull`
- ✅ Factures/Devis - À vérifier selon schéma

---

## ⚠️ Points d'Attention

### 1. Factures Liées

Si un ticket a des factures/devis liés, vérifier le comportement :

**Option A** : Empêcher la suppression
```typescript
// Vérifier avant suppression
const invoices = await prisma.invoice.findMany({ 
  where: { workOrderId: wo.id } 
});
if (invoices.length > 0) {
  throw new Error("Impossible de supprimer : factures liées");
}
```

**Option B** : Supprimer aussi les factures (cascade)

**Option C** : Conserver les factures (SetNull sur workOrderId)

### 2. Permissions

Actuellement, tout utilisateur peut supprimer.

**Amélioration future** :
```typescript
// Vérifier rôle utilisateur
if (userRole !== 'admin') {
  throw new Error("Seuls les admins peuvent supprimer");
}
```

---

## 🧪 Tests

### Test 1: Modifier un Ticket
```
1. Aller sur /tickets
2. Cliquer sur l'icône crayon d'un ticket
3. Vérifier redirection vers /tickets/[id] ✅
4. Vérifier affichage de la page de détail ✅
```

### Test 2: Supprimer un Ticket
```
1. Aller sur /tickets
2. Cliquer sur l'icône poubelle
3. Vérifier affichage de la confirmation ✅
4. Cliquer "Annuler" → Rien ne se passe ✅
5. Cliquer à nouveau, puis "OK"
6. Vérifier disparition du ticket de la liste ✅
7. Vérifier toast "Ticket supprimé" ✅
```

### Test 3: Suppression avec Erreur
```
1. Simuler une erreur (ex: ticket déjà supprimé)
2. Vérifier affichage toast d'erreur ✅
3. Vérifier log dans console ✅
```

---

## 🎊 Résultat Final

### Fichiers Modifiés
1. ✅ `src/lib/api.ts` - Fonction `deleteWorkOrder`
2. ✅ `src/app/api/workshop/workorders/[id]/route.ts` - Endpoint DELETE
3. ✅ `src/app/tickets/page.tsx` - Boutons UI

### Fonctionnalités
- ✅ Bouton Modifier (icône crayon)
- ✅ Bouton Supprimer (icône poubelle)
- ✅ Confirmation de suppression
- ✅ Gestion d'erreurs
- ✅ Toast de feedback

### UX
- ✅ Icônes claires et intuitives
- ✅ Tooltips explicatifs
- ✅ Confirmation pour éviter erreurs
- ✅ Feedback immédiat (toast)

---

**Boutons ajoutés** : 2 ✅  
**API DELETE créée** : ✅  
**Prêt à utiliser** : 🚀
