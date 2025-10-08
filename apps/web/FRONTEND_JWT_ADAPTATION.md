# ✅ Adaptation Frontend pour JWT - COMPLÉTÉE

**Date:** 08/10/2025 19:24  
**Status:** ✅ **TERMINÉE**

---

## 🔄 Changements Appliqués

### 1. ✅ Modification de `src/lib/api.ts`

#### getAuthHeader() - Remplacement de getUserIdHeader()

**Avant:**
```typescript
function getUserIdHeader() {
  const uid = window.localStorage.getItem("auth:userId");
  if (uid) return { "x-user-id": uid };
  return {};
}
```

**Après:**
```typescript
function getAuthHeader() {
  const token = window.localStorage.getItem("jwt_token");
  if (token) return { "Authorization": `Bearer ${token}` };
  return {};
}
```

#### Gestion des erreurs 401

**Ajouté dans toutes les fonctions de requête:**
```typescript
if (res.status === 401) {
  window.localStorage.removeItem("jwt_token");
  window.localStorage.removeItem("user");
  window.location.href = "/auth/login";
}
```

#### Type de retour authLogin()

**Avant:**
```typescript
{
  id: string;
  email: string;
  ...
}
```

**Après:**
```typescript
{
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}
```

---

### 2. ✅ Modification de `src/app/auth/AuthContext.tsx`

#### useEffect - Chargement initial

**Avant:**
```typescript
const uid = window.localStorage.getItem("auth:userId");
const email = window.localStorage.getItem("auth:email");
if (uid) setUser({ id: uid, email });
```

**Après:**
```typescript
const token = window.localStorage.getItem("jwt_token");
const userStr = window.localStorage.getItem("user");
if (token && userStr) {
  const user = JSON.parse(userStr);
  setUser({ id: user.id, email: user.email });
}
```

#### login()

**Avant:**
```typescript
const u = await authLogin({ email, password });
window.localStorage.setItem("auth:userId", u.id);
window.localStorage.setItem("auth:email", u.email);
setUser({ id: u.id, email: u.email });
```

**Après:**
```typescript
const response = await authLogin({ email, password });
window.localStorage.setItem("jwt_token", response.token);
window.localStorage.setItem("user", JSON.stringify(response.user));
setUser({ id: response.user.id, email: response.user.email });
```

#### logout()

**Avant:**
```typescript
window.localStorage.removeItem("auth:userId");
window.localStorage.removeItem("auth:email");
window.localStorage.removeItem("auth:shopName");
```

**Après:**
```typescript
window.localStorage.removeItem("jwt_token");
window.localStorage.removeItem("user");
```

---

## 📊 Migration localStorage

### Ancien système (supprimé)
```
auth:userId → ID utilisateur
auth:email → Email utilisateur
auth:shopName → Nom atelier
```

### Nouveau système (actuel)
```
jwt_token → Token JWT (expire après 7 jours)
user → JSON stringifié {id, email, role, shopName}
```

---

## 🔐 Flux d'Authentification Complet

### 1. Login
```typescript
// Frontend
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { token, user } = await response.json();
// Backend retourne: { token: "eyJhbG...", user: {...} }

localStorage.setItem('jwt_token', token);
localStorage.setItem('user', JSON.stringify(user));
```

### 2. Requêtes API
```typescript
// Frontend envoie automatiquement
const response = await fetch('/api/workorders', {
  headers: {
    'Authorization': 'Bearer eyJhbG...',
    'Content-Type': 'application/json'
  }
});

// Backend middleware vérifie JWT
const user = getUserFromToken(request); // Decode JWT
if (!user) return 401;
```

### 3. Token Expiré
```typescript
// Si réponse 401 → Déconnexion automatique
if (response.status === 401) {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user');
  window.location.href = '/auth/login';
}
```

---

## ⚠️ Breaking Change pour Utilisateurs Existants

### Migration automatique

Les utilisateurs actuellement connectés (avec `auth:userId`) seront **déconnectés** au prochain rechargement de page car:

1. Le code cherche `jwt_token` (pas présent)
2. Ancien `auth:userId` ignoré
3. Redirection vers `/auth/login`

**Pas de perte de données**, juste reconnexion requise.

### Script de nettoyage (optionnel)

Pour nettoyer l'ancien localStorage:

```typescript
// À ajouter temporairement dans AuthContext useEffect
if (window.localStorage.getItem("auth:userId")) {
  // Nettoyer ancien système
  window.localStorage.removeItem("auth:userId");
  window.localStorage.removeItem("auth:email");
  window.localStorage.removeItem("auth:shopName");
  console.log("Ancien système nettoyé - veuillez vous reconnecter");
}
```

---

## 🧪 Tests à Effectuer

### Test 1: Login Fonctionnel
```bash
1. Aller sur /auth/login
2. Se connecter avec email/password
3. Vérifier dans DevTools > Application > Local Storage:
   - jwt_token présent (long string)
   - user présent (JSON)
4. Vérifier redirection vers /dashboard
```

### Test 2: Requêtes API avec Token
```bash
1. Ouvrir DevTools > Network
2. Naviguer dans l'app (Tickets, Clients, etc.)
3. Vérifier toutes les requêtes ont:
   Authorization: Bearer eyJ...
4. Vérifier réponses 200 OK
```

### Test 3: Expiration Token
```bash
1. Dans DevTools > Application > Local Storage
2. Supprimer jwt_token
3. Rafraîchir la page OU faire une action
4. Vérifier redirection vers /auth/login
```

### Test 4: Logout
```bash
1. Cliquer sur Déconnexion
2. Vérifier localStorage vide (jwt_token et user supprimés)
3. Vérifier redirection vers /auth/login
```

---

## 📋 Checklist Finale

### Code
- [x] api.ts: getAuthHeader() implémenté
- [x] api.ts: Authorization Bearer envoyé
- [x] api.ts: Gestion 401 avec redirect
- [x] api.ts: Type authLogin() mis à jour
- [x] AuthContext: Chargement jwt_token
- [x] AuthContext: login() stocke token
- [x] AuthContext: logout() supprime token

### Tests (à faire)
- [ ] Test login retourne token
- [ ] Test token stocké dans localStorage
- [ ] Test requêtes incluent Authorization header
- [ ] Test 401 redirige vers login
- [ ] Test logout supprime token

### Compatibilité
- [x] Ancien système (auth:userId) ignoré
- [x] Migration automatique (déconnexion)
- [ ] Informer utilisateurs de reconnexion requise

---

## 🚀 Prochaines Étapes

1. **Tester en local** (`npm run dev`)
2. **Vérifier tous les scénarios** ci-dessus
3. **Si OK:** Déployer en production
4. **Amélioration future:** Register devrait aussi retourner token

---

**Frontend JWT Adaptation COMPLÉTÉE !** 🎉  
**Temps total:** 10 minutes  
**Breaking change:** Oui (reconnexion requise)  
**Sécurité:** Améliorée (JWT au lieu de header falsifiable)
