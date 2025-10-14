# Nettoyer le Cache et les Données Stockées

**Problème**: Erreur 401 malgré le reset du mot de passe  
**Cause**: Ancien token JWT et données utilisateur en cache

---

## 🧹 Solution Rapide

### Dans le Navigateur (Console)

1. **Ouvrir la console** (F12)
2. **Exécuter ces commandes**:

```javascript
// Nettoyer tout le localStorage
localStorage.clear();

// Vérifier que c'est vide
console.log('localStorage nettoyé:', localStorage.length === 0);

// Recharger la page
location.reload();
```

---

## 🔍 Données Stockées

L'application stocke dans `localStorage`:

### Authentification
- `jwt_token` - Token JWT d'authentification
- `user` - Données utilisateur (id, email, shopName)

### Préférences UI
- `themeMode` - Mode clair/sombre
- `tickets-ui` - État de la page tickets (filtres, colonnes, etc.)
- `shop_ae` - Flag auto-entrepreneur

---

## 🛠️ Méthodes de Nettoyage

### Méthode 1: Console Navigateur (Recommandé)

```javascript
localStorage.clear();
location.reload();
```

### Méthode 2: DevTools Application

1. F12 → Onglet **Application**
2. Menu gauche → **Local Storage**
3. Cliquer sur `http://localhost:3000`
4. Clic droit → **Clear**
5. Recharger la page (F5)

### Méthode 3: Navigation Privée

1. Ouvrir une fenêtre de navigation privée
2. Aller sur `http://localhost:3000`
3. Se connecter avec les nouveaux identifiants

---

## ✅ Procédure Complète de Reset

### 1. Nettoyer la Base de Données

```powershell
cd apps\web
npx prisma migrate reset
npx prisma db seed
```

### 2. Nettoyer le Cache Navigateur

**Console (F12)**:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 3. Se Connecter

- Email: `admin@test.fr`
- Mot de passe: `Admin123!@#`

---

## 🔐 Vérifier les Données Stockées

### Console Navigateur

```javascript
// Voir tout le localStorage
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(key, '=', localStorage.getItem(key));
}

// Voir spécifiquement l'auth
console.log('Token:', localStorage.getItem('jwt_token'));
console.log('User:', localStorage.getItem('user'));
```

---

## ⚠️ Pourquoi l'Erreur 401 Persiste

### Scénario

1. Vous vous connectez avec `password123` → Token JWT généré
2. Token stocké dans `localStorage`
3. Vous changez le mot de passe en base → `Admin123!@#`
4. **MAIS** le navigateur utilise toujours l'ancien token
5. Le serveur rejette l'ancien token → **401 Unauthorized**

### Solution

**Nettoyer le localStorage** pour forcer une nouvelle connexion avec le nouveau mot de passe.

---

## 🧪 Test Complet

### 1. Vérifier l'État Actuel

```javascript
console.log('Token actuel:', localStorage.getItem('jwt_token'));
console.log('User actuel:', localStorage.getItem('user'));
```

### 2. Nettoyer

```javascript
localStorage.clear();
console.log('Nettoyé ✓');
```

### 3. Recharger

```javascript
location.reload();
```

### 4. Se Connecter

- Email: `admin@test.fr`
- Mot de passe: `Admin123!@#`

### 5. Vérifier le Nouveau Token

```javascript
console.log('Nouveau token:', localStorage.getItem('jwt_token'));
console.log('Nouveau user:', localStorage.getItem('user'));
```

---

## 🚀 Script Automatique

Créons une page de nettoyage dans l'app:

**URL**: `/clear-cache`

**Code**:
```typescript
'use client';

export default function ClearCachePage() {
  const handleClear = () => {
    localStorage.clear();
    sessionStorage.clear();
    alert('Cache nettoyé ! Redirection vers login...');
    window.location.href = '/login';
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Nettoyer le Cache</h1>
      <p>Cliquez pour nettoyer toutes les données stockées</p>
      <button onClick={handleClear} style={{ padding: '1rem 2rem', fontSize: '1.2rem' }}>
        Nettoyer et Se Déconnecter
      </button>
    </div>
  );
}
```

---

## 📋 Checklist de Dépannage

- [ ] Base de données réinitialisée (`npx prisma migrate reset`)
- [ ] Seed exécuté (`npx prisma db seed`)
- [ ] localStorage nettoyé (`localStorage.clear()`)
- [ ] Page rechargée (F5)
- [ ] Connexion avec `Admin123!@#`
- [ ] Pas d'erreur 401 ✓

---

## 💡 Prévention Future

### Déconnexion Propre

Toujours utiliser le bouton "Déconnexion" qui nettoie automatiquement:

```typescript
const logout = async () => {
  window.localStorage.removeItem("jwt_token");
  window.localStorage.removeItem("user");
  setUser(null);
};
```

### Reset Mot de Passe

Après un reset de mot de passe, **toujours** nettoyer le cache:

```javascript
localStorage.removeItem('jwt_token');
localStorage.removeItem('user');
```

---

**Le nettoyage du cache résout 99% des problèmes d'authentification !** 🎉

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
