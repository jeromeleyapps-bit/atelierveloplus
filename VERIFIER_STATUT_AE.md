# Vérifier et Modifier le Statut Auto-Entrepreneur

**Problème**: La TVA est toujours active même si tu es auto-entrepreneur

---

## 🔍 Vérifier le Statut Actuel

### Méthode 1: Console Navigateur

1. Ouvrir un ticket
2. Ouvrir la console (F12)
3. Chercher les logs:
   ```
   [Ticket] User settings loaded: {...}
   [Ticket] isAutoEntrepreneur: false
   ```

Si `isAutoEntrepreneur: false` → C'est normal que la TVA soit active

---

## ⚙️ Modifier le Statut

### Dans l'Application

1. Menu → **"Mon compte"**
2. Chercher la case **"Auto-entrepreneur"**
3. **Cocher** la case
4. Cliquer **"Enregistrer"**
5. Actualiser la page du ticket (F5)

### Vérification

1. Ouvrir un ticket
2. Cliquer **"Ajouter une ligne"** → **"Prestation"**
3. Vérifier le chip TVA:
   - ❌ Si "TVA 10%" → Statut non pris en compte
   - ✅ Si "TVA 0%" → Statut OK !

---

## 🧪 Test Complet

### Avant (Non AE)

```
Prestation: Révision complète
Prix HT: 60,00 €
TVA: 10%
Total TTC: 66,00 €
```

### Après (AE)

```
Prestation: Révision complète
Prix HT: 60,00 €
TVA: 0%
Total TTC: 60,00 €
```

**Récapitulatif**:
```
Sous-total HT: 60,00 €
TVA: 0,00 €
TOTAL TTC: 60,00 €

TVA non applicable, art. 293 B du CGI
```

---

## 🔧 Si le Problème Persiste

### Vérifier la Base de Données

```powershell
cd apps\web
npx prisma studio
```

1. Ouvrir la table **AppSetting**
2. Trouver ton utilisateur
3. Vérifier le champ **isAutoEntrepreneur**
4. Si `false`, le changer en `true`
5. Sauvegarder
6. Actualiser l'application

---

## 📊 Comportement Attendu

### Si isAutoEntrepreneur = false

| Type | TVA |
|------|-----|
| Prestation | 10% |
| Pièce | 20% |
| Manuel (Prestation) | 10% |
| Manuel (Pièce) | 20% |

### Si isAutoEntrepreneur = true

| Type | TVA |
|------|-----|
| Prestation | 0% |
| Pièce | 0% |
| Manuel (Prestation) | 0% |
| Manuel (Pièce) | 0% |

**Mention sur PDF**: "TVA non applicable, art. 293 B du CGI"

---

## 💡 Code Concerné

### LineItemSelector.tsx (ligne 113)

```typescript
vatRate: isAutoEntrepreneur ? 0 : (type === "service" ? 10 : 20)
```

- Si AE → 0%
- Si Prestation → 10%
- Si Pièce → 20%

### LineItemsTable.tsx (ligne 167)

```typescript
{isAutoEntrepreneur && totals.totalTVA === 0 && (
  <Typography variant="caption" color="text.secondary">
    TVA non applicable, art. 293 B du CGI
  </Typography>
)}
```

---

## ✅ Checklist

- [ ] Ouvrir "Mon compte"
- [ ] Cocher "Auto-entrepreneur"
- [ ] Enregistrer
- [ ] Actualiser la page
- [ ] Ouvrir console (F12)
- [ ] Vérifier log: `isAutoEntrepreneur: true`
- [ ] Ajouter une ligne
- [ ] Vérifier TVA: 0%
- [ ] Vérifier mention légale

---

**Si tout est OK, la TVA sera à 0% automatiquement !** ✅

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
