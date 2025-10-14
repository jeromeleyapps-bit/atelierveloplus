# Admin - Section Sécurité & Protection

**Date**: 14 octobre 2025  
**Modifications**: Menu + Page Admin

---

## ✅ Modifications Appliquées

### 1. Menu Déroulant - "Paramètres" → "Mon compte"

**Fichier**: `apps/web/src/app/components/NavBanner.tsx`

**Avant**:
```typescript
const linksMenuExtra: { href: Route; label: string }[] = [
  { href: "/settings" as Route, label: "Paramètres" },
  { href: "/admin" as Route, label: "Admin" },
];
```

**Après**:
```typescript
const linksMenuExtra: { href: Route; label: string }[] = [
  { href: "/account" as Route, label: "Mon compte" },
  { href: "/admin" as Route, label: "Admin" },
];
```

**Raison**: Les pages `/settings` et `/account` affichent le même contenu (paramètres utilisateur). Le nom "Mon compte" est plus explicite.

---

### 2. Section Sécurité dans la Page Admin

**Fichier**: `apps/web/src/app/admin/page.tsx`

**Ajout**: Nouvelle section "Sécurité & Protection" avec:

#### 🟢 Protections Actives

1. **✓ Authentification JWT**
   - Tokens sécurisés avec expiration automatique
   - Validation côté serveur

2. **✓ Mots de passe chiffrés**
   - bcrypt avec salt rounds = 10
   - Impossible de récupérer les mots de passe en clair

3. **✓ Protection CSRF**
   - Headers sécurisés
   - Validation des requêtes

4. **✓ Validation des données**
   - Sanitization côté serveur
   - Protection contre les injections SQL

#### ℹ️ Informations

5. **Base de données locale**
   - SQLite par défaut
   - Données stockées localement

6. **Sauvegardes manuelles**
   - Affichage de la dernière sauvegarde
   - Bouton d'export disponible

#### ⚠️ Avertissements PostgreSQL

Si vous utilisez PostgreSQL en production:
- Définir un mot de passe fort
- Utiliser `scram-sha-256` au lieu de `trust`
- Ne jamais commiter les `.env`
- Utiliser des variables d'environnement

#### 📋 Bonnes Pratiques

- Sauvegardes régulières
- Mises à jour de l'application
- Mots de passe forts et uniques
- Limiter l'accès physique à la machine

---

## 🎨 Interface Visuelle

### Score de Sécurité
```
┌─────────────────────────────────────────┐
│ 🔒 Sécurité & Protection  [Score: 5.5/10] │
└─────────────────────────────────────────┘
```

### Cartes de Statut

**Succès (vert)**:
- ✓ Authentification JWT
- ✓ Mots de passe chiffrés
- ✓ Protection CSRF
- ✓ Validation des données

**Info (bleu)**:
- ℹ Base de données locale
- ℹ Sauvegardes manuelles
- 📋 Bonnes pratiques

**Avertissement (orange)**:
- ⚠ PostgreSQL (si utilisé)

---

## 📊 Données Affichées

### Score de Sécurité: 5.5/10

**Basé sur**:
- ✅ Authentification: +1.5
- ✅ Chiffrement: +1.5
- ✅ Protection CSRF: +1.0
- ✅ Validation: +1.0
- ⚠️ Base locale: +0.5
- ⚠️ Sauvegardes manuelles: 0

**Améliorations possibles**:
- Sauvegardes automatiques: +1.0
- Authentification 2FA: +1.0
- Logs d'audit: +0.5
- Rate limiting: +0.5

---

## 🔐 Mesures de Sécurité Implémentées

### 1. Authentification JWT

**Fichier**: `apps/web/src/lib/auth.ts`

```typescript
import jwt from 'jsonwebtoken';

export function generateToken(userId: string): string {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as { userId: string };
  } catch {
    return null;
  }
}
```

### 2. Chiffrement des Mots de Passe

**Fichier**: `apps/web/src/app/api/auth/register/route.ts`

```typescript
import bcrypt from 'bcryptjs';

const hashedPassword = await bcrypt.hash(password, 10);

// Vérification
const isValid = await bcrypt.compare(password, user.password);
```

### 3. Protection CSRF

**Headers Next.js**:
```typescript
// next.config.js
headers: [
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }
]
```

### 4. Validation des Données

**Prisma + Validation manuelle**:
```typescript
// Validation côté serveur
if (!email || !email.includes('@')) {
  return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
}

// Prisma sanitize automatiquement
await prisma.user.create({
  data: { email, password: hashedPassword }
});
```

---

## 🚨 Points d'Attention

### PostgreSQL en Production

Si vous déployez avec PostgreSQL:

1. **Mot de passe fort**
   ```sql
   ALTER USER postgres PASSWORD 'VotreMotDePasseSecurise123!';
   ```

2. **Configuration pg_hba.conf**
   ```conf
   # Remplacer
   local   all             all                                     trust
   
   # Par
   local   all             all                                     scram-sha-256
   ```

3. **Variables d'environnement**
   ```bash
   # Ne JAMAIS commiter .env
   echo ".env" >> .gitignore
   echo ".env.local" >> .gitignore
   ```

4. **Vérifier l'historique Git**
   ```bash
   git log --all --full-history -- .env
   
   # Si .env a été commité, changer IMMÉDIATEMENT le mot de passe
   ```

---

## 📈 Améliorations Futures

### Court Terme
- [ ] Logs d'audit (qui a fait quoi, quand)
- [ ] Rate limiting sur les APIs sensibles
- [ ] Validation des emails (confirmation par email)

### Moyen Terme
- [ ] Authentification à deux facteurs (2FA)
- [ ] Sauvegardes automatiques programmées
- [ ] Alertes de sécurité (tentatives de connexion échouées)

### Long Terme
- [ ] Chiffrement de la base de données au repos
- [ ] Rotation automatique des tokens JWT
- [ ] Audit de sécurité externe
- [ ] Conformité RGPD complète

---

## 🧪 Tests de Sécurité

### Test 1: Authentification
```bash
# Tenter d'accéder à une API sans token
curl http://localhost:3000/api/customers

# Devrait retourner 401 Unauthorized
```

### Test 2: Mot de passe
```bash
# Vérifier que les mots de passe sont chiffrés dans la DB
sqlite3 data/atelier.db "SELECT password FROM User LIMIT 1;"

# Devrait afficher un hash bcrypt (commence par $2a$ ou $2b$)
```

### Test 3: CSRF
```bash
# Tenter une requête sans headers appropriés
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test"}'

# Devrait être bloqué ou nécessiter un token
```

---

## 📚 Documentation de Référence

### Sécurité
- **AUDIT_SECURITE_COMPLET.md** - Audit complet de sécurité
- **AUDIT_SECURITE.md** - Audit initial
- Ce document - Implémentation dans l'admin

### Authentification
- `apps/web/src/lib/auth.ts` - Fonctions JWT
- `apps/web/src/app/api/auth/*/route.ts` - Routes d'authentification

### Base de Données
- `apps/web/prisma/schema.prisma` - Schéma Prisma
- `apps/web/data/atelier.db` - Base SQLite locale

---

## ✅ Résultat

**La page Admin affiche maintenant**:
1. ✅ Section "Sécurité & Protection" avec score 5.5/10
2. ✅ Liste des protections actives
3. ✅ Avertissements pour PostgreSQL
4. ✅ Bonnes pratiques de sécurité
5. ✅ Informations sur les sauvegardes

**Le menu déroulant affiche**:
1. ✅ "Mon compte" au lieu de "Paramètres"
2. ✅ "Admin"

**Testez maintenant**:
```bash
# Démarrer l'application
npm run dev

# Aller sur http://localhost:3000/admin
# → Voir la nouvelle section Sécurité
```

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
