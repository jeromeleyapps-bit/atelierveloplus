# Corrections Finales - Erreurs 401 et TVA

**Date**: 15 octobre 2025  
**Statut**: ✅ Corrigé

---

## 🐛 Problèmes Identifiés

### 1. Erreurs 401 (Unauthorized)
```
GET /api/account/settings 401 (Unauthorized)
GET /api/catalog 401 (Unauthorized)
```

**Cause**: Les requêtes ne contenaient pas le token JWT

### 2. Erreur `data.filter is not a function`
```
TypeError: data.filter is not a function at loadCatalogItems
```

**Cause**: L'API `/api/catalog` retourne un objet `{items: [...]}` et non un tableau direct

### 3. TVA reste à 10% dans devis
**Cause**: Le statut `isAutoEntrepreneur` n'était pas chargé correctement à cause du 401

### 4. Section factures non visible
**Cause**: Condition d'affichage correcte mais erreurs 401 empêchaient le chargement

---

## ✅ Corrections Appliquées

### 1. LineItemSelector.tsx

**Avant**:
```typescript
async function loadCatalogItems() {
  const response = await fetch("/api/catalog");
  const data = await response.json();
  setCatalogItems(data.filter((item: any) => item.active) || []);
}
```

**Après**:
```typescript
async function loadCatalogItems() {
  try {
    const token = localStorage.getItem("jwt_token");
    const response = await fetch("/api/catalog", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    
    if (!response.ok) {
      console.error("Catalog API error:", response.status);
      setCatalogItems([]);
      return;
    }
    
    const data = await response.json();
    // L'API peut retourner un objet avec items ou directement un tableau
    const items = Array.isArray(data) ? data : (data.items || []);
    setCatalogItems(items.filter((item: any) => item.active) || []);
  } catch (error) {
    console.error("Error loading catalog items:", error);
    setCatalogItems([]);
  }
}
```

**Améliorations**:
- ✅ Ajout du token JWT
- ✅ Gestion du format de réponse (tableau ou objet)
- ✅ Gestion des erreurs avec fallback
- ✅ Vérification du statut de la réponse

---

### 2. CreateQuoteDialog.tsx

**Avant**:
```typescript
const loadUserSettings = async () => {
  const response = await fetch("/api/account/settings");
  const data = await response.json();
  setIsAutoEntrepreneur(data.isAutoEntrepreneur === true);
};
```

**Après**:
```typescript
const loadUserSettings = async () => {
  try {
    const token = localStorage.getItem("jwt_token");
    const response = await fetch("/api/account/settings", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    
    if (!response.ok) {
      console.error("Settings API error:", response.status);
      setIsAutoEntrepreneur(false);
      return;
    }
    
    const data = await response.json();
    console.log("[Devis] isAutoEntrepreneur:", data.isAutoEntrepreneur);
    setIsAutoEntrepreneur(data.isAutoEntrepreneur === true);
  } catch (error) {
    console.error("Error loading settings:", error);
    setIsAutoEntrepreneur(false);
  }
};
```

**Améliorations**:
- ✅ Ajout du token JWT
- ✅ Gestion des erreurs
- ✅ Log pour debugging
- ✅ Fallback à `false` en cas d'erreur

---

### 3. CreateInvoiceDialog.tsx

**Même correction que CreateQuoteDialog** avec log `[Facture]`

---

## 🧪 Tests à Refaire

### Test 1: Erreurs 401 ⏳

**Étapes**:
1. Actualiser la page (F5)
2. Ouvrir console (F12)
3. Finance → Devis → Nouveau
4. Vérifier console: **Aucune erreur 401**

**Résultat attendu**:
- ✅ Aucune erreur 401
- ✅ Log: `[Devis] isAutoEntrepreneur: true/false`

---

### Test 2: TVA Auto-Entrepreneur (Devis) ⏳

**Étapes**:
1. Mon compte → Cocher "Auto-entrepreneur" → Enregistrer
2. Finance → Devis → Nouveau
3. Sélectionner "Devis direct"
4. Choisir un client
5. Cliquer "Ajouter une ligne" → "Prestation"
6. Vérifier chip TVA: **0%**

**Résultat attendu**:
- ✅ TVA à 0% si AE coché
- ✅ TVA à 10% si AE non coché

---

### Test 3: Section Factures Visible ⏳

**Étapes**:
1. Finance → Factures → Nouvelle
2. Sélectionner "Service / Réparation"
3. Vérifier que la section "Prestations et Pièces" apparaît

**Résultat attendu**:
- ✅ Section visible
- ✅ Bouton "Ajouter une ligne" présent
- ✅ Aucune erreur console

---

### Test 4: Chargement Catalogue ⏳

**Étapes**:
1. Ouvrir un ticket
2. Cliquer "Ajouter une ligne" → "Pièce"
3. Vérifier que l'autocomplete fonctionne

**Résultat attendu**:
- ✅ Liste des pièces chargée
- ✅ Aucune erreur `data.filter is not a function`
- ✅ Recherche fonctionne

---

## 📊 Récapitulatif des Corrections

| Fichier | Problème | Correction | Statut |
|---------|----------|------------|--------|
| LineItemSelector.tsx | 401 + data.filter | JWT + gestion format | ✅ |
| CreateQuoteDialog.tsx | 401 + TVA 10% | JWT + logs | ✅ |
| CreateInvoiceDialog.tsx | 401 + section invisible | JWT + logs | ✅ |

---

## 🎯 Résultat Attendu

### Avant
- ❌ Erreurs 401 multiples
- ❌ `data.filter is not a function`
- ❌ TVA reste à 10% même si AE
- ❌ Section factures non visible

### Après
- ✅ Aucune erreur 401
- ✅ Catalogue chargé correctement
- ✅ TVA à 0% si AE coché
- ✅ Section factures visible et fonctionnelle

---

## 💡 Logs de Debugging

Après actualisation, tu devrais voir dans la console:

```
[Devis] isAutoEntrepreneur: true
[Facture] isAutoEntrepreneur: true
```

Si tu vois `false`, c'est que la case n'est pas cochée dans "Mon compte".

---

## 🔧 Si Problèmes Persistent

### 1. Vider le cache
```javascript
localStorage.clear()
sessionStorage.clear()
```

### 2. Vérifier le token
```javascript
console.log(localStorage.getItem('jwt_token'))
```

### 3. Vérifier le statut AE
1. Mon compte
2. Vérifier que "Auto-entrepreneur" est coché
3. Enregistrer
4. Actualiser

---

**Actualise la page et teste !** ✅

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
